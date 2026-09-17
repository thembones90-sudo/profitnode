"use strict";

/* PROFITNODE — LEDGER SHOP FUND JOURNAL V1
   Presentation/reporting layer only.
   Exposes canonical SHOP FUND V7 journal entries on the LEDGER page so cash
   movements are visible beside sales. It does NOT post, reverse, or alter money.
*/
(function(){
  if(window.__PN_LEDGER_SHOP_FUND_JOURNAL_V1__) return;
  window.__PN_LEDGER_SHOP_FUND_JOURNAL_V1__=true;

  const META_KEY="shopFundV7";

  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function h(v){return typeof escHtml==="function"?escHtml(String(v==null?"":v)):String(v==null?"":v).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]));}
  function m(v){return typeof money==="function"?money(Math.abs(n(v)),"RSD"):Math.abs(n(v)).toLocaleString("sr-RS")+" RSD";}
  function dateLabel(v){
    const s=String(v||"");
    const d=new Date(s);
    if(!isNaN(d)){
      try{return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});}catch(_){ }
    }
    return s.replace("T"," ").slice(0,16)||"—";
  }

  function itemName(inv){
    if(!inv) return "Inventory item";
    return [inv.manufacturer,inv.model].filter(Boolean).join(" ").trim() || inv.description || inv.name || "Inventory item";
  }
  function saleName(sale){
    if(!sale) return "Completed sale";
    for(const key of ["itemName","description","label","name","title"]){if(sale[key]) return String(sale[key]);}
    const invId=sale.inventoryItemId||sale.inventoryId||(String(sale.itemType||"").toUpperCase()==="COMPONENT"?sale.itemId:null);
    if(invId){const inv=Store.get("inventory",invId);if(inv)return itemName(inv);}
    const projectId=sale.projectId||(String(sale.itemType||"").toUpperCase()==="RIG"?sale.itemId:null);
    if(projectId){const p=Store.get("projects",projectId);if(p&&p.name)return p.name;}
    return String(sale.saleItem||sale.item||"Completed sale");
  }
  function mailName(rec){
    if(!rec) return "Mail / COD";
    return rec.description || [rec.carrier,rec.trackingNumber].filter(Boolean).join(" · ") || "Mail / COD";
  }

  function resolve(entry){
    const type=String(entry.refType||"").toLowerCase(),id=entry.refId;
    if(type==="inventory"){
      const inv=id?Store.get("inventory",id):null;
      return {
        item:itemName(inv),
        detail:inv?[inv.category,inv.source,inv.sourceDetail].filter(Boolean).join(" · "):"Inventory acquisition",
        chip:"COMPONENT"
      };
    }
    if(type==="sale"){
      const sale=id?Store.get("sales",id):null;
      return {item:saleName(sale),detail:"Completed sale receipt",chip:"SALE"};
    }
    if(type==="mail"){
      const rec=id?Store.get("mail",id):null;
      return {item:mailName(rec),detail:rec?[rec.carrier,rec.trackingNumber].filter(Boolean).join(" · "):"MAIL / COD",chip:"MAIL"};
    }
    return {item:entry.note||entry.kind||"SHOP FUND adjustment",detail:type?type.toUpperCase():"SHOP FUND",chip:"CASH"};
  }

  function kindLabel(k){
    const key=String(k||"").toUpperCase();
    const map={
      PURCHASE:"PURCHASE",
      PURCHASE_ADJUSTMENT:"PURCHASE ADJUSTMENT",
      SALE_RECEIPT:"SALE RECEIPT",
      SALE_REVERSAL:"SALE REVERSAL",
      SALE_DELETE_REVERSAL:"SALE DELETE REVERSAL",
      MAIL_COD_PAYMENT:"COD PAYMENT",
      MAIL_COD_RECONCILE:"COD RECONCILE",
      SHIPPING_IN:"INBOUND SHIPPING",
      SHIPPING_OUT:"OUTBOUND SHIPPING"
    };
    return map[key]||key.replace(/_/g," ")||"ADJUSTMENT";
  }

  function journalData(){
    const ledger=Store.load(),fund=ledger&&ledger.meta&&ledger.meta[META_KEY];
    const entries=fund&&Array.isArray(fund.entries)?fund.entries.slice():[];
    entries.sort((a,b)=>String(b.at||b.createdAt||"").localeCompare(String(a.at||a.createdAt||"")));
    return {fund,entries};
  }

  function row(entry){
    const info=resolve(entry),delta=n(entry.deltaRsd),pos=delta>0;
    return '<tr class="pn-ledger-fund-row '+(pos?'is-in':'is-out')+'">'+
      '<td><b>'+h(dateLabel(entry.at||entry.createdAt))+'</b></td>'+
      '<td><span class="chip '+(pos?'chip-green-outline':'chip-amber-outline')+'">'+h(kindLabel(entry.kind))+'</span></td>'+
      '<td><div class="pn-ledger-fund-item"><b>'+h(info.item)+'</b><span>'+h(info.detail||entry.note||"")+'</span></div></td>'+
      '<td><span class="chip chip-muted">'+h(info.chip)+'</span></td>'+
      '<td class="num pn-ledger-fund-delta '+(pos?'pos':'neg')+'">'+(pos?"+":"−")+h(m(delta))+'</td>'+
      '<td class="pn-ledger-fund-note">'+h(entry.note||"—")+'</td>'+
    '</tr>';
  }

  function html(){
    const data=journalData(),fund=data.fund,entries=data.entries;
    const current=typeof window.pnShopFundBalanceRsd==="function"?n(window.pnShopFundBalanceRsd()):fund?n(fund.seedBalanceRsd)+n(fund.journalDeltaRsd):0;
    const totalIn=entries.reduce((s,e)=>s+Math.max(0,n(e.deltaRsd)),0);
    const totalOut=entries.reduce((s,e)=>s+Math.max(0,-n(e.deltaRsd)),0);
    const visible=entries.slice(0,60);
    return '<section class="panel pn-ledger-fund-journal">'+
      '<div class="panel-head pn-ledger-fund-head"><div><h2>SHOP FUND JOURNAL</h2><span>Cash movements recorded by SHOP FUND V7</span></div><div class="pn-ledger-fund-summary">'+
        '<span>CURRENT <b>'+h(m(current))+'</b></span><span>INFLOW <b class="pos">+'+h(m(totalIn))+'</b></span><span>OUTFLOW <b class="neg">−'+h(m(totalOut))+'</b></span><span>ENTRIES <b>'+entries.length+'</b></span>'+ 
      '</div></div>'+
      (visible.length?'<div class="table-scroll"><table class="pn-ledger-fund-table"><thead><tr><th>DATE / TIME</th><th>EVENT</th><th>ITEM / REFERENCE</th><th>TYPE</th><th class="num">SHOP FUND CHANGE</th><th>NOTE</th></tr></thead><tbody>'+visible.map(row).join("")+'</tbody></table></div>':'<div class="panel-body"><div class="hint" style="margin:0">No SHOP FUND journal entries yet.</div></div>')+
    '</section>';
  }

  function decorate(out){
    if(typeof out!=="string"||out.includes("pn-ledger-fund-journal")) return out;
    const block=html();
    if(out.includes('<div class="content">')) return out.replace('<div class="content">','<div class="content">'+block);
    return block+out;
  }

  function wrapRoute(route){
    if(!route||typeof route.render!=="function"||route.__pnLedgerFundJournalV1) return false;
    const base=route.render;
    route.render=function(){return decorate(base.apply(this,arguments));};
    route.__pnLedgerFundJournalV1=true;
    return true;
  }

  let wrapped=false;
  if(typeof ROUTES!=="undefined"&&Array.isArray(ROUTES)){
    ["ledger","sales"].forEach(key=>{const r=ROUTES.find(x=>x&&x.key===key);if(r)wrapped=wrapRoute(r)||wrapped;});
  }
  if(typeof renderSales==="function"&&!window.__pnLedgerFundRenderSalesV1){
    const base=renderSales;
    renderSales=function(){return decorate(base.apply(this,arguments));};
    window.__pnLedgerFundRenderSalesV1=true;
  }
  if(typeof renderLedger==="function"&&!window.__pnLedgerFundRenderLedgerV1){
    const base=renderLedger;
    renderLedger=function(){return decorate(base.apply(this,arguments));};
    window.__pnLedgerFundRenderLedgerV1=true;
  }

  const style=document.createElement("style");
  style.id="pn-ledger-shop-fund-journal-v1-style";
  style.textContent=`
    .pn-ledger-fund-journal{margin-bottom:14px;overflow:hidden}
    .pn-ledger-fund-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .pn-ledger-fund-head>div:first-child{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
    .pn-ledger-fund-head h2{margin:0}
    .pn-ledger-fund-head>div:first-child span{font:800 9px var(--mono);letter-spacing:.07em;color:var(--text-mute);text-transform:uppercase}
    .pn-ledger-fund-summary{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font:800 8px var(--mono);letter-spacing:.07em;color:var(--text-mute)}
    .pn-ledger-fund-summary span{display:flex;gap:5px;align-items:center;white-space:nowrap}
    .pn-ledger-fund-summary b{font-size:10px;color:var(--text)}
    .pn-ledger-fund-table{min-width:980px}
    .pn-ledger-fund-table th{white-space:nowrap}
    .pn-ledger-fund-table td{vertical-align:middle}
    .pn-ledger-fund-row.is-out{box-shadow:inset 3px 0 0 rgba(255,174,66,.65)}
    .pn-ledger-fund-row.is-in{box-shadow:inset 3px 0 0 rgba(57,222,139,.65)}
    .pn-ledger-fund-item{display:flex;flex-direction:column;gap:3px;min-width:220px}
    .pn-ledger-fund-item>b{font-size:11.5px;color:var(--text)}
    .pn-ledger-fund-item>span,.pn-ledger-fund-note{font:700 8.5px var(--mono);color:var(--text-mute)}
    .pn-ledger-fund-delta{font:900 11.5px var(--mono);white-space:nowrap}
    .pn-ledger-fund-delta.pos{color:var(--green)}
    .pn-ledger-fund-delta.neg{color:var(--red)}
  `;
  document.head.appendChild(style);

  window.pnLedgerShopFundJournalV1={html,journalData,decorate,wrapped};
  console.info("[PROFITNODE] LEDGER SHOP FUND JOURNAL V1 ACTIVE",{wrapped:wrapped,entries:journalData().entries.length});
})();
