"use strict";

/*
  PROFITNODE SHOP FUND DOCTRINE V6

  The SHOP FUND is available working cash for the PC operation.
  It is NOT realized profit.

  Canonical doctrine:
    - Buying hardware: SHOP FUND decreases by the gross cash paid.
    - Completing a sale: SHOP FUND increases by the gross cash received.
    - Profit / loss remains analytical only and NEVER changes SHOP FUND a second time.

  Migration anchor agreed on 2026-09-15:
    Current working fund after the 5,000 RSD receipt = 71,643 RSD.

  V6 deliberately maintains its own cash journal from that anchor onward.
  It does NOT derive SHOP FUND from realized profit and it does NOT trust
  legacy Treasury sale/acquisition reconciliation layers.
*/
(function installProfitnodeShopFundDoctrineV6(){
  const VERSION = 6;
  const SEED_RSD = 71643;
  const META_KEY = "shopFundV6";
  const ROULETTE_FUND_KEY = "roulettePcBuildFund";

  function num(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function nowStamp(){
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

  function saleCompleted(sale){
    if (!sale) return false;
    if (typeof saleIsCompleted === "function") return !!saleIsCompleted(sale);
    return String(sale.saleState || "COMPLETED").toUpperCase() !== "PENDING";
  }

  function rouletteFundRsd(){
    try{
      const raw = localStorage.getItem(ROULETTE_FUND_KEY);
      const fund = raw ? JSON.parse(raw) : null;
      const entries = fund && Array.isArray(fund.entries) ? fund.entries : [];
      return entries.reduce((sum,entry)=>sum + toRsd(entry.amount,entry.currency),0);
    }catch(error){
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
        currency: "RSD",
        seedBalanceRsd: SEED_RSD,
        journalDeltaRsd: 0,
        baselineRouletteFundRsd: rouletteFundRsd(),
        entries: [],
        initializedAt: nowStamp(),
        doctrine: "cash only: purchases subtract once; gross completed sales add once; profit/loss is analytics only"
      };
      ledger.meta[META_KEY] = fund;
      Store.persist();
      console.info("[PROFITNODE] SHOP FUND V6 initialized at 71,643 RSD.");
    }

    if (!Array.isArray(fund.entries)) fund.entries = [];
    fund.journalDeltaRsd = num(fund.journalDeltaRsd);
    fund.seedBalanceRsd = num(fund.seedBalanceRsd) || SEED_RSD;
    fund.baselineRouletteFundRsd = num(fund.baselineRouletteFundRsd);
    return fund;
  }

  function post(deltaRsd,kind,refType,refId,note){
    const delta = num(deltaRsd);
    if (!delta) return 0;

    const fund = ensureFund();
    fund.journalDeltaRsd = num(fund.journalDeltaRsd) + delta;
    fund.entries.push({
      id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()+Math.random()),
      at: nowStamp(),
      kind: String(kind || "ADJUSTMENT"),
      refType: String(refType || ""),
      refId: refId == null ? null : String(refId),
      deltaRsd: delta,
      note: String(note || "")
    });

    /* Keep the journal bounded without destroying the running balance. */
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

  function snapshot(){
    const fund = ensureFund();
    return {
      version: VERSION,
      seedBalanceRsd: num(fund.seedBalanceRsd),
      journalDeltaRsd: num(fund.journalDeltaRsd),
      rouletteDeltaRsd: rouletteFundRsd() - num(fund.baselineRouletteFundRsd),
      balanceRsd: balanceRsd(),
      entries: fund.entries.slice()
    };
  }

  /*
    Store-level accounting is intentional.
    It catches purchases/sales regardless of which UI workflow created them.
    Inventory status-only changes produce zero cash movement.
  */
  if (!Store.__pnShopFundV6Wrapped){
    const baseInsert = Store.insert.bind(Store);
    const baseUpdate = Store.update.bind(Store);
    const baseRemove = Store.remove ? Store.remove.bind(Store) : null;

    Store.insert = function(collection,data){
      const result = baseInsert(collection,data);

      if (result && collection === "inventory"){
        const paid = toRsd(result.purchasePrice,result.currency);
        if (paid){
          post(-paid,"PURCHASE","inventory",result.id,"Inventory acquisition");
        }
      }

      if (result && collection === "sales" && saleCompleted(result)){
        const receipt = toRsd(result.buyerPrice,result.currency);
        if (receipt){
          post(receipt,"SALE_RECEIPT","sale",result.id,"Completed sale gross receipt");
        }
      }

      return result;
    };

    Store.update = function(collection,id,payload){
      const beforeRaw = Store.get(collection,id);
      const before = beforeRaw ? JSON.parse(JSON.stringify(beforeRaw)) : null;
      const result = baseUpdate(collection,id,payload);
      if (!before || !result) return result;

      if (collection === "inventory"){
        const beforePaid = toRsd(before.purchasePrice,before.currency);
        const afterPaid = toRsd(result.purchasePrice,result.currency);
        const cashDelta = -(afterPaid - beforePaid);

        if (cashDelta){
          post(
            cashDelta,
            "PURCHASE_ADJUSTMENT",
            "inventory",
            id,
            "Inventory purchase price/currency adjustment"
          );
        }
      }

      if (collection === "sales"){
        const wasCompleted = saleCompleted(before);
        const isCompleted = saleCompleted(result);
        const beforeReceipt = toRsd(before.buyerPrice,before.currency);
        const afterReceipt = toRsd(result.buyerPrice,result.currency);
        let cashDelta = 0;

        if (!wasCompleted && isCompleted){
          cashDelta = afterReceipt;
        }else if (wasCompleted && !isCompleted){
          cashDelta = -beforeReceipt;
        }else if (wasCompleted && isCompleted){
          cashDelta = afterReceipt - beforeReceipt;
        }

        if (cashDelta){
          post(
            cashDelta,
            isCompleted ? "SALE_RECEIPT" : "SALE_REVERSAL",
            "sale",
            id,
            isCompleted ? "Completed sale gross receipt" : "Completed sale reversed to pending"
          );
        }
      }

      return result;
    };

    if (baseRemove){
      Store.remove = function(collection,id){
        const beforeRaw = Store.get(collection,id);
        const before = beforeRaw ? JSON.parse(JSON.stringify(beforeRaw)) : null;

        /*
          Deleting a completed sale is treated as removing that receipt from
          the books. Deleting inventory does NOT magically refund a purchase.
        */
        if (collection === "sales" && before && saleCompleted(before)){
          const receipt = toRsd(before.buyerPrice,before.currency);
          if (receipt){
            post(-receipt,"SALE_DELETE_REVERSAL","sale",id,"Deleted completed sale");
          }
        }

        return baseRemove(collection,id);
      };
    }

    Store.__pnShopFundV6Wrapped = true;
  }

  /*
    COMMAND UI override.
    No brittle source-code surgery. V6 wraps the final dashboard renderer
    after every existing command extension has loaded.
  */
  function decorateCommandHtml(html){
    if (typeof html !== "string") return html;

    const currency = typeof displayCurrency === "function" ? displayCurrency() : "RSD";
    const fund = balance(currency);
    const stats = typeof dashboardStats === "function" ? dashboardStats(currency) : {realizedProfit:0};

    html = html.replace(
      /<div class="pn-module-label">REALIZED PROFIT<\/div><span>SETTLED PERFORMANCE<\/span>/,
      '<div class="pn-module-label">SHOP FUND</div><span>AVAILABLE WORKING CAPITAL</span>'
    );

    html = html.replace(
      /<div class="pn-profit-value\s+[^"]*">[\s\S]*?<\/div>/,
      '<div class="pn-profit-value '+(fund>=0?'pos':'neg')+'">'+money(fund,currency)+'</div>'
    );

    html = html.replace(
      /<span><b class="[^"]*">[\s\S]*?<\/b>\s*THIS MONTH<\/span>/,
      '<span><b class="'+(num(stats.realizedProfit)>=0?'pos':'neg')+'">'+money(num(stats.realizedProfit),currency)+'</b> REALIZED PROFIT</span>'
    );

    return html;
  }

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(r=>r && r.key === "dashboard");
    if (route && typeof route.render === "function" && !route.__pnShopFundV6Wrapped){
      const baseRender = route.render;
      const wrappedRender = function(){
        return decorateCommandHtml(baseRender.apply(this,arguments));
      };
      route.render = wrappedRender;
      route.__pnShopFundV6Wrapped = true;

      if (typeof renderDashboard === "function" && renderDashboard === baseRender){
        renderDashboard = wrappedRender;
      }
    }
  }

  window.pnShopFundBalanceRsd = balanceRsd;
  window.pnShopFundBalance = balance;
  window.pnShopFundSnapshot = snapshot;

  window.pnShopFundDoctrineV6SelfTest = function(){
    return {
      canonicalStart: 10000,
      canonicalPurchase: 5700,
      canonicalAfterPurchase: 4300,
      canonicalSaleReceipt: 5000,
      canonicalFinalFund: 9300,
      canonicalRealizedProfit: -700,
      currentFundRsd: balanceRsd()
    };
  };

  ensureFund();
  console.info("[PROFITNODE] SHOP FUND DOCTRINE V6 ACTIVE", window.pnShopFundDoctrineV6SelfTest());
})();
