"use strict";

/*
  PROFITNODE Treasury Fund Flow v1

  Bridges the shop-side ledgers (inventory, sales, mail) to the
  personal treasury cash pool so every acquisition deducts exactly once
  and every completed sale credits the full revenue.

  Canonical money rules:
  - inventory.purchasePrice is the single acquisition amount.
  - Shipping always spends from the pool (inbound and outbound alike).
  - Only COMPLETED sales credit revenue; PENDING sales create no flow.
  - Edits are delta-based: each flow stores its own signed delta, so
    changing a price adjusts the pool by the exact difference and a
    back-to-back edit round-trips without drift.
  - Legacy/imported records carry no flows, so they never double-spend.
  - Backup/restore walks the full treasury snapshot (normalizeTreasury keeps
    flows), so replacing the ledger never replays deductions.
*/

function findExactTreasuryPool(treasury, currency){
  const t = treasury || {balances:[]};
  const balances = Array.isArray(t.balances) ? t.balances : [];
  const cur = String(currency || "RSD").toUpperCase();
  const key = "CASH_" + cur;
  const label = "cash (" + cur.toLowerCase() + ")";
  return balances.find(b => b && b.sourceKey === key) ||
    balances.find(b => b && b.label && String(b.label).trim().toLowerCase() === label) || null;
}

function treasuryFlowPool(treasury, currency){
  const t = treasury || {balances:[]};
  if (!Array.isArray(t.balances)) t.balances = [];
  const cur = String(currency || "RSD").toUpperCase();
  const key = "CASH_" + cur;
  let pool = findExactTreasuryPool(t, cur);
  if (pool){
    if (!pool.sourceKey) pool.sourceKey = key;
    if (!pool.currency) pool.currency = cur;
    return pool;
  }
  const canonical = typeof PN_TREASURY_CORE_BALANCES !== "undefined"
    ? PN_TREASURY_CORE_BALANCES.find(def => def && def.sourceKey === key)
    : null;
  pool = {
    id: typeof pnTreasuryId === "function" ? pnTreasuryId() : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    sourceKey: key,
    label: canonical ? canonical.label : "Cash (" + cur + ")",
    amount: 0,
    currency: cur,
    include: true,
    note: "",
    updatedAt: typeof todayISO === "function" ? todayISO() : ""
  };
  t.balances.push(pool);
  return pool;
}

function applyPoolDelta(treasury, currency, signedDelta){
  if (!signedDelta) return 0;
  const pool = treasuryFlowPool(treasury, currency);
  if (!pool) return 0;
  pool.amount = (Number(pool.amount) || 0) + signedDelta;
  return signedDelta;
}

function findTreasuryFlow(treasury, refType, refId, kind){
  const t = treasury || {flows:[]};
  return t.flows.find(f => f.refType === refType && f.refId === refId && f.kind === kind) || null;
}

function treasurySignedEur(amount, currency, settings){
  const value = Number(amount) || 0;
  const rate = String(currency || "RSD").toUpperCase() === "USD" ? Number(settings.usdToEur) || 0 : String(currency || "RSD").toUpperCase() === "RSD" ? Number(settings.rsdToEur) || 0 : 1;
  return value * rate;
}

function stampTreasuryReserveCrossing(flow, beforeAmount, afterAmount){
  if (!flow || typeof pnTreasuryFloor !== "function") return;
  const before = pnTreasuryFloor(beforeAmount).band, after = pnTreasuryFloor(afterAmount).band;
  if ((PN_WC_BAND_RANK[after] || 0) < (PN_WC_BAND_RANK[before] || 0)){
    flow.reserveBandBefore = before;
    flow.reserveBandAfter = after;
    flow.reserveCrossing = before + "_TO_" + after;
    flow.reserveCrossedAt = nowISO();
  } else {
    delete flow.reserveBandBefore;
    delete flow.reserveBandAfter;
    delete flow.reserveCrossing;
    delete flow.reserveCrossedAt;
  }
}

function applyTreasuryChange(treasury, refType, refId, kind, amount, currency, note){
  const t = treasury || {flows:[]};
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return 0;
  const cur = currency || "RSD";
  const signed = (kind === "SALE" ? 1 : -1) * amt;
  const existing = findTreasuryFlow(t, refType, refId, kind);
  const currentFortress = typeof pnTreasuryCalculate === "function" ? pnTreasuryCalculate(t).fortress : 0;
  const baselineFortress = currentFortress - (existing ? treasurySignedEur(existing.signedDelta, existing.currency, t.settings || {}) : 0);
  const delta = signed - (existing ? (existing.signedDelta || 0) : 0);
  let flow;
  if (existing){
    flow = existing;
    existing.amount = amt;
    existing.signedDelta = signed;
    existing.currency = cur;
    if (note) existing.note = note;
    existing.updatedAt = nowISO();
  } else {
    flow = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      refType: refType,
      refId: refId,
      kind: kind,
      amount: amt,
      currency: cur,
      signedDelta: signed,
      note: note || "",
      createdAt: nowISO()
    };
    t.flows.push(flow);
  }
  const applied = applyPoolDelta(t, cur, delta);
  if (applied){
    flow.poolSourceKey = "CASH_" + String(cur).toUpperCase();
    flow.poolAppliedAt = nowISO();
  }
  if (typeof pnTreasuryCalculate === "function") stampTreasuryReserveCrossing(flow, baselineFortress, pnTreasuryCalculate(t).fortress);
  return applied;
}

function removeTreasuryFlow(treasury, refType, refId, kind){
  const t = treasury || {flows:[]};
  const i = t.flows.findIndex(f => f.refType === refType && f.refId === refId && f.kind === kind);
  if (i === -1) return 0;
  const f = t.flows[i];
  t.flows.splice(i, 1);
  applyPoolDelta(t, f.currency || "RSD", -(f.signedDelta || 0));
  return 1;
}

function reconcileSaleFlow(oldSale, newSale){
  const treasury = Store.load().treasury;
  const oldState = oldSale ? saleStateResolved(oldSale) : null;
  const newState = saleStateResolved(newSale);
  const amount = Number(newSale.buyerPrice) || 0;
  const cur = String(newSale.currency || "RSD").toUpperCase();
  const existing = findTreasuryFlow(treasury, "sale", newSale.id, "SALE");

  /* Pending sales never own cash. */
  if (newState === "PENDING"){
    if (existing){
      removeTreasuryFlow(treasury, "sale", newSale.id, "SALE");
      Store.persist();
    }
    return;
  }

  /* Completed sales always own exactly one GROSS revenue flow. */
  if (!existing){
    applyTreasuryChange(treasury, "sale", newSale.id, "SALE", amount, cur, "Sale revenue");
    Store.persist();
    return;
  }

  const existingCur = String(existing.currency || "RSD").toUpperCase();
  const priceChanged = Number(existing.amount || 0) !== amount || Number(existing.signedDelta || 0) !== amount;
  const currencyChanged = existingCur !== cur;

  if (currencyChanged){
    removeTreasuryFlow(treasury, "sale", newSale.id, "SALE");
    applyTreasuryChange(treasury, "sale", newSale.id, "SALE", amount, cur, "Sale revenue");
    Store.persist();
    return;
  }

  if (priceChanged || oldState === "PENDING"){
    applyTreasuryChange(treasury, "sale", newSale.id, "SALE", amount, cur, "Sale revenue");
    Store.persist();
  }
}
const PNStoreInsertTreasuryFlow = Store.insert.bind(Store);
Store.insert = function(collection, data){
  const result = PNStoreInsertTreasuryFlow(collection, data);
  if (collection === "sales" && result && saleStateResolved(result) === "COMPLETED"){
    applyTreasuryChange(Store.load().treasury, "sale", result.id, "SALE", result.buyerPrice, result.currency, "Sale revenue");
    Store.persist();
  }
  return result;
};

const PNStoreUpdateTreasuryFlow = Store.update.bind(Store);
Store.update = function(collection, id, payload){
  const oldItem = Store.get(collection, id);
  const result = PNStoreUpdateTreasuryFlow(collection, id, payload);
  if (collection === "sales" && result) reconcileSaleFlow(oldItem, result);
  return result;
};

const PNCoreRemoveSaleTreasuryFlow = Actions.removeSale.bind(Actions);
Actions.removeSale = function(id){
  const ledger = Store.load();
  removeTreasuryFlow(ledger.treasury, "sale", id, "SALE");
  Store.persist();
  return PNCoreRemoveSaleTreasuryFlow(id);
};

const PNCoreAddInventoryTreasuryFlow = Actions.addInventory;
Actions.addInventory = function(data){
  const result = PNCoreAddInventoryTreasuryFlow.call(this, data);
  applyTreasuryChange(Store.load().treasury, "inventory", result.id, "ACQUISITION", result.purchasePrice, result.currency, "Inventory purchase");
  Store.persist();
  return result;
};

const PNCoreUpdateInventoryTreasuryFlow = Actions.updateInventory;
Actions.updateInventory = function(id, data){
  const oldItem = Store.get("inventory", id);
  const treasury = Store.load().treasury;
  const existingBefore = findTreasuryFlow(treasury, "inventory", id, "ACQUISITION");
  const result = PNCoreUpdateInventoryTreasuryFlow.call(this, id, data);

  if (!oldItem || !result) return result;

  const oldPrice = Number(oldItem.purchasePrice) || 0;
  const newPrice = Number(result.purchasePrice) || 0;
  const oldCur = String(oldItem.currency || "RSD").toUpperCase();
  const newCur = String(result.currency || "RSD").toUpperCase();
  const priceChanged = oldPrice !== newPrice;
  const currencyChanged = oldCur !== newCur;

  /*
    Critical doctrine:
    - Newly-added inventory is charged by Actions.addInventory().
    - Legacy/imported inventory with NO acquisition flow stays flowless.
    - A status/note/assignment edit must NEVER suddenly charge the purchase price.
  */
  if (!existingBefore) return result;

  if (currencyChanged){
    removeTreasuryFlow(treasury, "inventory", id, "ACQUISITION");
    applyTreasuryChange(treasury, "inventory", id, "ACQUISITION", newPrice, newCur, "Inventory purchase");
    Store.persist();
  } else if (priceChanged){
    applyTreasuryChange(treasury, "inventory", id, "ACQUISITION", newPrice, newCur, "Inventory purchase");
    Store.persist();
  }

  return result;
};
const PNCoreRemoveInventoryTreasuryFlow = Actions.removeInventory;
Actions.removeInventory = function(id){
  const item = Store.get("inventory", id);
  const ledger = Store.load();
  if (item) removeTreasuryFlow(ledger.treasury, "inventory", item.id, "ACQUISITION");
  Store.persist();
  return PNCoreRemoveInventoryTreasuryFlow.call(this, id);
};

const PNCoreAddMailTreasuryFlow = Actions.addMail;
Actions.addMail = function(data){
  const result = PNCoreAddMailTreasuryFlow.call(this, data);
  if (result && (Number(result.shippingCost) || 0)){
    const kind = result.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT";
    applyTreasuryChange(Store.load().treasury, "mail", result.id, kind, result.shippingCost, result.currency, result.direction === "incoming" ? "Incoming shipping" : "Outgoing shipping");
    Store.persist();
  }
  return result;
};

const PNCoreUpdateMailTreasuryFlow = Actions.updateMail;
Actions.updateMail = function(id, data){
  const before = Store.get("mail", id);
  const result = PNCoreUpdateMailTreasuryFlow.call(this, id, data);
  if (result && before){
    const treasury = Store.load().treasury;
    const kind = result.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT";
    const amt = Number(result.shippingCost) || 0;
    if (amt > 0 || findTreasuryFlow(treasury, "mail", id, kind)){
      const existing = findTreasuryFlow(treasury, "mail", id, kind);
      const currencyChanged = !!existing && String(existing.currency || "RSD").toUpperCase() !== String(result.currency || "RSD").toUpperCase();
      if (currencyChanged) removeTreasuryFlow(treasury, "mail", id, kind);
      applyTreasuryChange(treasury, "mail", id, kind, amt, result.currency, result.direction === "incoming" ? "Incoming shipping" : "Outgoing shipping");
      Store.persist();
    }
  }
  return result;
};

const PNCoreRemoveMailTreasuryFlow = Actions.removeMail;
Actions.removeMail = function(id){
  const mail = Store.get("mail", id);
  const ledger = Store.load();
  if (mail) removeTreasuryFlow(ledger.treasury, "mail", mail.id, mail.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT");
  Store.persist();
  return PNCoreRemoveMailTreasuryFlow.call(this, id);
};


/* PN TREASURY SINGLE AUTHORITY V4 REPAIR */
(function pnRepairRetroactiveLegacyAcquisitionFlowsV4(){
  const ledger = Store.load();
  const treasury = ledger && ledger.treasury;
  if (!treasury || !Array.isArray(treasury.flows)) return;

  const inventory = Array.isArray(ledger.inventory) ? ledger.inventory : [];
  let repaired = 0;

  /*
    A legitimate acquisition flow is created immediately when the inventory
    row itself is created. The old bug created ACQUISITION flows days/weeks
    later during unrelated edits (LISTED -> SOLD, notes, assignment, etc.).
    Those late-created flows are invalid for legacy inventory and must be
    refunded exactly once.
  */
  const suspicious = treasury.flows.slice().filter(flow => {
    if (!flow || flow.refType !== "inventory" || flow.kind !== "ACQUISITION") return false;
    const item = inventory.find(x => x && x.id === flow.refId);
    if (!item || !item.createdAt || !flow.createdAt) return false;
    const itemTs = Date.parse(item.createdAt);
    const flowTs = Date.parse(flow.createdAt);
    if (!Number.isFinite(itemTs) || !Number.isFinite(flowTs)) return false;
    return flowTs - itemTs > 10 * 60 * 1000;
  });

  suspicious.forEach(flow => {
    const item = inventory.find(x => x && x.id === flow.refId);
    removeTreasuryFlow(treasury, "inventory", flow.refId, "ACQUISITION");
    ledger.meta = ledger.meta || {};
    const refunded = Array.isArray(ledger.meta.treasuryV4RefundedAcquisitions) ? ledger.meta.treasuryV4RefundedAcquisitions : [];
    if (!refunded.includes(flow.refId)) refunded.push(flow.refId);
    ledger.meta.treasuryV4RefundedAcquisitions = refunded;
    repaired++;
    console.warn("[PROFITNODE] Removed retroactive legacy acquisition deduction:",
      item ? ((item.manufacturer || "") + " " + (item.model || "")).trim() : flow.refId,
      flow.amount, flow.currency);
  });

  if (repaired) Store.persist();
  console.info("[PROFITNODE] TREASURY SINGLE AUTHORITY V4 active · repaired", repaired, "retroactive acquisition flow(s).");
})();

/* PN TREASURY SINGLE AUTHORITY V5 MISSING-FLOW REPAIR */
const PN_TREASURY_ACQUISITION_CHARGING_SINCE = "2026-09-11T12:11:01Z";
function pnTreasuryV5Candidates(ledger){
  const treasury = ledger && ledger.treasury;
  if (!treasury || !Array.isArray(treasury.flows)) return [];
  const inventory = Array.isArray(ledger.inventory) ? ledger.inventory : [];
  const timeline = Array.isArray(ledger.timeline) ? ledger.timeline : [];
  const refunded = ledger.meta && Array.isArray(ledger.meta.treasuryV4RefundedAcquisitions) ? ledger.meta.treasuryV4RefundedAcquisitions : [];
  const since = Date.parse(PN_TREASURY_ACQUISITION_CHARGING_SINCE);
  return inventory.filter(item => {
    if (!item || !item.id || refunded.includes(item.id) || findTreasuryFlow(treasury, "inventory", item.id, "ACQUISITION")) return false;
    if (!((Number(item.purchasePrice) || 0) > 0)) return false;
    const itemTs = Date.parse(item.createdAt || "");
    if (!Number.isFinite(itemTs) || itemTs < since) return false;
    return timeline.some(ev => {
      if (!ev || ev.type !== "PURCHASE" || ev.relatedType !== "inventory" || ev.relatedId !== item.id) return false;
      const evTs = Date.parse(ev.createdAt || "");
      return Number.isFinite(evTs) && Math.abs(evTs - itemTs) <= 60 * 1000;
    });
  });
}
(function pnRepairMissingCanonicalAcquisitionFlowsV5(){
  const ledger = Store.load();
  if (!ledger || !ledger.treasury || !Array.isArray(ledger.treasury.flows)) return;
  if (ledger.meta && ledger.meta.treasuryAcquisitionRepairV5At) return;
  const candidates = pnTreasuryV5Candidates(ledger);

  candidates.forEach(item => {
    const price = Number(item.purchasePrice) || 0;
    applyTreasuryChange(ledger.treasury, "inventory", item.id, "ACQUISITION", price, item.currency || "RSD", "Inventory purchase");
    console.warn("[PROFITNODE] Repaired missing canonical acquisition deduction:", ((item.manufacturer || "") + " " + (item.model || "")).trim(), price, item.currency || "RSD");
  });

  ledger.meta = ledger.meta || {};
  ledger.meta.treasuryAcquisitionRepairV5At = nowISO();
  Store.persist();
  console.info("[PROFITNODE] TREASURY SINGLE AUTHORITY V5 active · repaired", candidates.length, "missing canonical acquisition flow(s).");
})();
