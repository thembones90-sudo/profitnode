"use strict";

/*
  PROFITNODE SHOP FUND RESET V7

  Correct migration anchor BEFORE the pending B450M sale:
      SHOP FUND = 66,643 RSD

  Then, when the 5,000 RSD sale is actually completed:
      SHOP FUND = 71,643 RSD

  Profit/loss remains analytical only:
      5,000 - 5,700 = -700 RSD realized profit
*/
(function installProfitnodeShopFundResetV7(){
  const VERSION = 7;
  const SEED_RSD = 66643;
  const META_KEY = "shopFundV7";
  const ROULETTE_FUND_KEY = "roulettePcBuildFund";

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function stamp(){
    return typeof nowISO === "function" ? nowISO() : new Date().toISOString();
  }

  function toRsd(amount,currency){
    const value = num(amount);
    const cur = String(currency || "RSD").toUpperCase();
    if (cur === "RSD") return value;
    if (typeof convert === "function") return num(convert(value,cur,"RSD"));
    return value;
  }

  function fromRsd(amount,currency){
    const value = num(amount);
    const cur = String(currency || "RSD").toUpperCase();
    if (cur === "RSD") return value;
    if (typeof convert === "function") return num(convert(value,"RSD",cur));
    return value;
  }

  function completed(sale){
    if (!sale) return false;
    if (typeof saleIsCompleted === "function") return !!saleIsCompleted(sale);
    return String(sale.saleState || "COMPLETED").toUpperCase() !== "PENDING";
  }

  function rouletteFundRsd(){
    try{
      const raw = localStorage.getItem(ROULETTE_FUND_KEY);
      const fund = raw ? JSON.parse(raw) : null;
      const entries = fund && Array.isArray(fund.entries) ? fund.entries : [];
      return entries.reduce((sum,e)=>sum + toRsd(e.amount,e.currency),0);
    }catch(e){
      return 0;
    }
  }

  function ensureFund(){
    const ledger = Store.load();
    ledger.meta = ledger.meta || {};
    let fund = ledger.meta[META_KEY];

    if (!fund || Number(fund.version) !== VERSION){
      fund = {
        version: VERSION,
        seedBalanceRsd: SEED_RSD,
        journalDeltaRsd: 0,
        baselineRouletteFundRsd: rouletteFundRsd(),
        entries: [],
        initializedAt: stamp(),
        doctrine: "cash fund only; purchases subtract once; gross completed sales add once; profit/loss analytics only"
      };
      ledger.meta[META_KEY] = fund;
      Store.persist();
      console.info("[PROFITNODE] SHOP FUND V7 reset to 66,643 RSD before pending sale.");
    }

    if (!Array.isArray(fund.entries)) fund.entries = [];
    fund.seedBalanceRsd = num(fund.seedBalanceRsd) || SEED_RSD;
    fund.journalDeltaRsd = num(fund.journalDeltaRsd);
    fund.baselineRouletteFundRsd = num(fund.baselineRouletteFundRsd);
    return fund;
  }

  function post(deltaRsd,kind,refType,refId,note){
    const delta = num(deltaRsd);
    if (!delta) return 0;
    const fund = ensureFund();
    fund.journalDeltaRsd += delta;
    fund.entries.push({
      id:(globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()+Math.random()),
      at:stamp(),
      kind:String(kind||"ADJUSTMENT"),
      refType:String(refType||""),
      refId:refId==null?null:String(refId),
      deltaRsd:delta,
      note:String(note||"")
    });
    if (fund.entries.length > 500) fund.entries = fund.entries.slice(-500);
    Store.persist();
    return delta;
  }

  function balanceRsd(){
    const fund = ensureFund();
    const rouletteDelta = rouletteFundRsd() - num(fund.baselineRouletteFundRsd);
    return num(fund.seedBalanceRsd) + num(fund.journalDeltaRsd) + rouletteDelta;
  }

  function balance(currency){
    return fromRsd(balanceRsd(),currency || "RSD");
  }

  if (!Store.__pnShopFundV7Wrapped){
    const baseInsert = Store.insert.bind(Store);
    const baseUpdate = Store.update.bind(Store);
    const baseRemove = Store.remove ? Store.remove.bind(Store) : null;

    Store.insert = function(collection,data){
      const result = baseInsert(collection,data);

      if (result && collection === "inventory"){
        const paid = toRsd(result.purchasePrice,result.currency);
        if (paid) post(-paid,"PURCHASE","inventory",result.id,"Inventory acquisition");
      }

      if (result && collection === "sales" && completed(result)){
        const receipt = toRsd(result.buyerPrice,result.currency);
        if (receipt) post(receipt,"SALE_RECEIPT","sale",result.id,"Completed sale gross receipt");
      }

      return result;
    };

    Store.update = function(collection,id,payload){
      const raw = Store.get(collection,id);
      const before = raw ? JSON.parse(JSON.stringify(raw)) : null;
      const result = baseUpdate(collection,id,payload);
      if (!before || !result) return result;

      if (collection === "inventory"){
        const beforePaid = toRsd(before.purchasePrice,before.currency);
        const afterPaid = toRsd(result.purchasePrice,result.currency);
        const delta = -(afterPaid-beforePaid);
        if (delta) post(delta,"PURCHASE_ADJUSTMENT","inventory",id,"Inventory purchase price/currency adjustment");
      }

      if (collection === "sales"){
        const wasCompleted = completed(before);
        const isCompleted = completed(result);
        const beforeReceipt = toRsd(before.buyerPrice,before.currency);
        const afterReceipt = toRsd(result.buyerPrice,result.currency);
        let delta = 0;

        if (!wasCompleted && isCompleted) delta = afterReceipt;
        else if (wasCompleted && !isCompleted) delta = -beforeReceipt;
        else if (wasCompleted && isCompleted) delta = afterReceipt-beforeReceipt;

        if (delta){
          post(
            delta,
            isCompleted ? "SALE_RECEIPT" : "SALE_REVERSAL",
            "sale",
            id,
            isCompleted ? "Completed sale gross receipt" : "Completed sale reverted"
          );
        }
      }

      return result;
    };

    if (baseRemove){
      Store.remove = function(collection,id){
        const raw = Store.get(collection,id);
        const before = raw ? JSON.parse(JSON.stringify(raw)) : null;

        if (collection === "sales" && before && completed(before)){
          const receipt = toRsd(before.buyerPrice,before.currency);
          if (receipt) post(-receipt,"SALE_DELETE_REVERSAL","sale",id,"Deleted completed sale");
        }

        return baseRemove(collection,id);
      };
    }

    Store.__pnShopFundV7Wrapped = true;
  }

  function decorate(html){
    if (typeof html !== "string") return html;

    const currency = typeof displayCurrency === "function" ? displayCurrency() : "RSD";
    const fund = balance(currency);
    const stats = typeof dashboardStats === "function" ? dashboardStats(currency) : {realizedProfit:0};

    html = html.replace(
      /<div class="pn-module-label">(?:REALIZED PROFIT|SHOP FUND)<\/div><span>(?:SETTLED PERFORMANCE|AVAILABLE WORKING CAPITAL)<\/span>/,
      '<div class="pn-module-label">SHOP FUND</div><span>AVAILABLE WORKING CAPITAL</span>'
    );

    html = html.replace(
      /<div class="pn-profit-value\s+[^"]*">[\s\S]*?<\/div>/,
      '<div class="pn-profit-value '+(fund>=0?'pos':'neg')+'">'+money(fund,currency)+'</div>'
    );

    html = html.replace(
      /<span><b class="[^"]*">[\s\S]*?<\/b>\s*(?:THIS MONTH|REALIZED PROFIT)<\/span>/,
      '<span><b class="'+(num(stats.realizedProfit)>=0?'pos':'neg')+'">'+money(num(stats.realizedProfit),currency)+'</b> REALIZED PROFIT</span>'
    );

    return html;
  }

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(r=>r && r.key==="dashboard");
    if (route && typeof route.render==="function" && !route.__pnShopFundV7Wrapped){
      const base = route.render;
      const wrapped = function(){ return decorate(base.apply(this,arguments)); };
      route.render = wrapped;
      route.__pnShopFundV7Wrapped = true;
      if (typeof renderDashboard==="function" && renderDashboard===base) renderDashboard = wrapped;
    }
  }

  window.pnShopFundBalanceRsd = balanceRsd;
  window.pnShopFundBalance = balance;
  window.pnShopFundV7SelfTest = function(){
    return {
      currentBeforePendingSale: balanceRsd(),
      expectedBeforePendingSale: 66643,
      expectedAfterB450Sale: 71643,
      b450SaleGrossReceipt: 5000,
      b450RealizedProfit: -700
    };
  };

  ensureFund();
  console.info("[PROFITNODE] SHOP FUND RESET V7 ACTIVE",window.pnShopFundV7SelfTest());
})();
