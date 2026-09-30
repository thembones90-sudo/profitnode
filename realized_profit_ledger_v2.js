"use strict";

/*
  PROFITNODE Realized Profit Ledger V2

  Doctrine:
  - Preserve the shop's existing realized-profit balance as the opening cash-pool baseline.
  - From activation onward, purchases are cash OUT immediately.
  - Completed sales are cash IN when recorded.
  - Never rebuild the pool from all historical revenue/costs.
*/
(function installRealizedProfitLedgerV2(){
  if (typeof dashboardStats !== "function" || dashboardStats.__pnCashLedgerV2) return;

  const baseDashboardStats = dashboardStats;
  const ledger = Store.load();
  ledger.meta = ledger.meta || {};

  function toRsd(amount,currency){
    return convert(Number(amount)||0,currency||"RSD","RSD");
  }

  function state(){
    let s = ledger.meta.realizedProfitLedgerV2;
    if (!s){
      const opening = Number(baseDashboardStats("RSD").realizedProfit)||0;
      const candidates = Store.all("inventory")
        .filter(item=>Number(item.purchasePrice)>0 && !["SOLD","SOLD_IN_TRANSIT","GIFTED"].includes(item.status))
        .slice()
        .sort((a,b)=>String(b.createdAt||b.updatedAt||"").localeCompare(String(a.createdAt||a.updatedAt||"")));
      const latest = candidates[0] || null;
      const seedOut = latest ? toRsd(latest.purchasePrice,latest.currency) : 0;
      s = {
        version:2,
        openedAt:nowISO(),
        openingBalanceRsd:opening,
        balanceRsd:opening-seedOut,
        events:{},
        seededPurchaseId:latest&&latest.id||null
      };
      if (latest){
        s.events["PURCHASE:"+latest.id] = {kind:"PURCHASE",refId:latest.id,amountRsd:-seedOut,at:latest.createdAt||nowISO(),migration:true};
      }
      ledger.meta.realizedProfitLedgerV2 = s;
      Store.persist();
    }
    s.events = s.events || {};
    return s;
  }

  function applyEvent(key,amountRsd,meta){
    const s=state(),prev=s.events[key];
    const old=prev?Number(prev.amountRsd)||0:0;
    const next=Number(amountRsd)||0;
    s.balanceRsd=(Number(s.balanceRsd)||0)-old+next;
    s.events[key]=Object.assign({amountRsd:next,at:nowISO()},meta||{});
    Store.persist();
  }

  function removeEvent(key){
    const s=state(),prev=s.events[key];
    if(!prev)return;
    s.balanceRsd=(Number(s.balanceRsd)||0)-(Number(prev.amountRsd)||0);
    delete s.events[key];
    Store.persist();
  }

  state();

  const wrappedDashboardStats=function(currency){
    const out=baseDashboardStats(currency);
    out.realizedProfit=convert(state().balanceRsd,"RSD",currency||"RSD");
    out.realizedProfitModel="INCREMENTAL_CASH_LEDGER_V2";
    return out;
  };
  wrappedDashboardStats.__pnCashLedgerV2=true;
  dashboardStats=wrappedDashboardStats;

  if(Actions&&typeof Actions.addInventory==="function"&&!Actions.addInventory.__pnCashLedgerV2){
    const base=Actions.addInventory.bind(Actions);
    const fn=function(data){
      const item=base(data);
      if(item&&Number(item.purchasePrice)>0) applyEvent("PURCHASE:"+item.id,-toRsd(item.purchasePrice,item.currency),{kind:"PURCHASE",refId:item.id});
      return item;
    };
    fn.__pnCashLedgerV2=true; Actions.addInventory=fn;
  }

  if(Actions&&typeof Actions.updateInventory==="function"&&!Actions.updateInventory.__pnCashLedgerV2){
    const base=Actions.updateInventory.bind(Actions);
    const fn=function(id,data){
      const result=base(id,data);
      const item=Store.get("inventory",id);
      if(item&&state().events["PURCHASE:"+id]) applyEvent("PURCHASE:"+id,-toRsd(item.purchasePrice,item.currency),{kind:"PURCHASE",refId:id});
      return result;
    };
    fn.__pnCashLedgerV2=true; Actions.updateInventory=fn;
  }

  if(Actions&&typeof Actions.removeInventory==="function"&&!Actions.removeInventory.__pnCashLedgerV2){
    const base=Actions.removeInventory.bind(Actions);
    const fn=function(id){ removeEvent("PURCHASE:"+id); return base(id); };
    fn.__pnCashLedgerV2=true; Actions.removeInventory=fn;
  }

  if(Actions&&typeof Actions.addSale==="function"&&!Actions.addSale.__pnCashLedgerV2){
    const base=Actions.addSale.bind(Actions);
    const fn=function(data){
      const sale=base(data);
      if(sale&&Number(sale.buyerPrice)>0) applyEvent("SALE:"+sale.id,toRsd(sale.buyerPrice,sale.currency),{kind:"SALE",refId:sale.id});
      return sale;
    };
    fn.__pnCashLedgerV2=true; Actions.addSale=fn;
  }

  if(Actions&&typeof Actions.updateSale==="function"&&!Actions.updateSale.__pnCashLedgerV2){
    const base=Actions.updateSale.bind(Actions);
    const fn=function(id,data){
      const sale=base(id,data);
      if(sale&&state().events["SALE:"+id]) applyEvent("SALE:"+id,toRsd(sale.buyerPrice,sale.currency),{kind:"SALE",refId:id});
      return sale;
    };
    fn.__pnCashLedgerV2=true; Actions.updateSale=fn;
  }

  if(Actions&&typeof Actions.removeSale==="function"&&!Actions.removeSale.__pnCashLedgerV2){
    const base=Actions.removeSale.bind(Actions);
    const fn=function(id){ removeEvent("SALE:"+id); return base(id); };
    fn.__pnCashLedgerV2=true; Actions.removeSale=fn;
  }

  globalThis.__PN_REALIZED_PROFIT_LEDGER_V2={model:"INCREMENTAL_CASH_LEDGER_V2",baselinePreserved:true,purchases:"cash out",sales:"cash in"};
  console.info("[PROFITNODE] REALIZED PROFIT LEDGER V2 active.",state());
})();
