"use strict";

/*
  PROFITNODE Realized Profit — Forward Cash Ledger V3

  Doctrine (per owner request, 2026-10-02):
  - REALIZED PROFIT is a running cash pool for flip operations, kept
    separate from the manually-tracked War Chest (treasury balances) — this
    extension never reads or writes ledger.treasury.
  - From the moment this ledger activates, every inventory item added with
    a purchase price leaves the pool immediately. You don't wait for the
    item to sell to see it hit the number.
  - Every completed sale recorded from here on adds its FULL sale price
    back into the pool (not just margin) — the cost already left the pool
    when the part was purchased, so the sale is simply the cash coming
    back in.
  - Everything added, sold, repaired, or spent on a project BEFORE this
    ledger activated is left alone. The ledger opens with today's existing,
    already-correct Realized Profit as its starting balance and only
    applies the new rule to activity from this point forward.

  This intentionally does NOT reuse realized_profit_ledger_v2.js, which is
  left in the repo, unused. V2's bug was its seed: it guessed an opening
  adjustment from a single "most recently added unsold item" instead of
  just using the real, already-correct number. That guess could land on
  zero (e.g. right after a reset, before any inventory existed), silently
  locking the whole ledger at a zero balance forever after — the
  "zero shadow" financial_recovery_extension.js had to detect and recover
  from. V3 fixes this by seeding with no guess at all: baseDashboardStats's
  own existing realizedProfit figure, taken as-is, once, on first activation.
*/
(function installRealizedProfitLedgerV3(){
  if (typeof dashboardStats !== "function" || dashboardStats.__pnCashLedgerV3) return;

  const baseDashboardStats = dashboardStats;

  function toRsd(amount, currency){
    return convert(Number(amount) || 0, currency || "RSD", "RSD");
  }

  function state(){
    const ledger = Store.load();
    ledger.meta = ledger.meta || {};
    let s = ledger.meta.realizedProfitLedgerV3;
    if (!s){
      const opening = Number(baseDashboardStats("RSD").realizedProfit) || 0;
      s = {
        version: 3,
        openedAt: nowISO(),
        openingBalanceRsd: opening,
        balanceRsd: opening,
        events: {}
      };
      ledger.meta.realizedProfitLedgerV3 = s;
      Store.persist();
    }
    s.events = s.events || {};
    return s;
  }

  function applyEvent(key, amountRsd, meta){
    const s = state();
    const prev = s.events[key];
    const old = prev ? Number(prev.amountRsd) || 0 : 0;
    const next = Number(amountRsd) || 0;
    s.balanceRsd = (Number(s.balanceRsd) || 0) - old + next;
    s.events[key] = Object.assign({ amountRsd: next, at: nowISO() }, meta || {});
    Store.persist();
  }

  function removeEvent(key){
    const s = state();
    const prev = s.events[key];
    if (!prev) return;
    s.balanceRsd = (Number(s.balanceRsd) || 0) - (Number(prev.amountRsd) || 0);
    delete s.events[key];
    Store.persist();
  }

  state();

  const wrappedDashboardStats = function(currency){
    const out = baseDashboardStats(currency);
    out.realizedProfit = convert(state().balanceRsd, "RSD", currency || "RSD");
    out.realizedProfitModel = "FORWARD_CASH_LEDGER_V3";
    return out;
  };
  wrappedDashboardStats.__pnCashLedgerV3 = true;
  dashboardStats = wrappedDashboardStats;

  if (Actions && typeof Actions.addInventory === "function" && !Actions.addInventory.__pnCashLedgerV3){
    const base = Actions.addInventory.bind(Actions);
    const fn = function(data){
      const item = base(data);
      if (item && Number(item.purchasePrice) > 0){
        applyEvent("PURCHASE:" + item.id, -toRsd(item.purchasePrice, item.currency), { kind: "PURCHASE", refId: item.id });
      }
      return item;
    };
    fn.__pnCashLedgerV3 = true;
    Actions.addInventory = fn;
  }

  if (Actions && typeof Actions.updateInventory === "function" && !Actions.updateInventory.__pnCashLedgerV3){
    const base = Actions.updateInventory.bind(Actions);
    const fn = function(id, data){
      const result = base(id, data);
      const item = Store.get("inventory", id);
      if (item && state().events["PURCHASE:" + id]){
        const amt = Number(item.purchasePrice) > 0 ? -toRsd(item.purchasePrice, item.currency) : 0;
        applyEvent("PURCHASE:" + id, amt, { kind: "PURCHASE", refId: id });
      }
      return result;
    };
    fn.__pnCashLedgerV3 = true;
    Actions.updateInventory = fn;
  }

  if (Actions && typeof Actions.removeInventory === "function" && !Actions.removeInventory.__pnCashLedgerV3){
    const base = Actions.removeInventory.bind(Actions);
    const fn = function(id){
      removeEvent("PURCHASE:" + id);
      return base(id);
    };
    fn.__pnCashLedgerV3 = true;
    Actions.removeInventory = fn;
  }

  if (Actions && typeof Actions.addSale === "function" && !Actions.addSale.__pnCashLedgerV3){
    const base = Actions.addSale.bind(Actions);
    const fn = function(data){
      const sale = base(data);
      if (sale && Number(sale.buyerPrice) > 0){
        applyEvent("SALE:" + sale.id, toRsd(sale.buyerPrice, sale.currency), { kind: "SALE", refId: sale.id });
      }
      return sale;
    };
    fn.__pnCashLedgerV3 = true;
    Actions.addSale = fn;
  }

  if (Actions && typeof Actions.updateSale === "function" && !Actions.updateSale.__pnCashLedgerV3){
    const base = Actions.updateSale.bind(Actions);
    const fn = function(id, data){
      const sale = base(id, data);
      if (sale && state().events["SALE:" + id]){
        applyEvent("SALE:" + id, toRsd(sale.buyerPrice, sale.currency), { kind: "SALE", refId: id });
      }
      return sale;
    };
    fn.__pnCashLedgerV3 = true;
    Actions.updateSale = fn;
  }

  if (Actions && typeof Actions.removeSale === "function" && !Actions.removeSale.__pnCashLedgerV3){
    const base = Actions.removeSale.bind(Actions);
    const fn = function(id){
      removeEvent("SALE:" + id);
      return base(id);
    };
    fn.__pnCashLedgerV3 = true;
    Actions.removeSale = fn;
  }

  globalThis.__PN_REALIZED_PROFIT_LEDGER_V3 = {
    model: "FORWARD_CASH_LEDGER_V3",
    doctrine: "today's balance frozen as opening cash pool; new purchases leave it immediately, new sales return the full price; War Chest/treasury untouched",
    appliesTo: "activity recorded from " + state().openedAt + " onward"
  };

  console.info("[PROFITNODE] REALIZED PROFIT LEDGER V3 (forward-only cash pool) active.", state());
})();
