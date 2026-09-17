"use strict";

/* PROFITNODE MAIL COD -> SHOP FUND V1
   Wires incoming COD settlement into canonical SHOP FUND V7.
   Doctrine:
   - PAY COD is a cash event.
   - Debit SHOP FUND only for the portion not already booked through a linked inventory acquisition.
   - Never debit twice.
   - If linked inventory accounting changes later, reconcile the MAIL debit so total cash impact remains exact.
   - MARK DELIVERED stays a physical-status action and does not imply payment.
*/
(function(){
  if(window.__PN_MAIL_COD_SHOP_FUND_V1__) return;
  window.__PN_MAIL_COD_SHOP_FUND_V1__=true;

  const FUND_META_KEY="shopFundV7";
  let reconciling=false;

  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function now(){return typeof nowISO==="function"?nowISO():new Date().toISOString();}
  function uuid(){return globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function fmt(v,c){
    if(typeof money==="function") return money(v,c||"RSD");
    return new Intl.NumberFormat("sr-RS",{maximumFractionDigits:2}).format(num(v))+" "+String(c||"RSD");
  }
  function toRsd(amount,currency){
    const value=num(amount),cur=String(currency||"RSD").toUpperCase();
    if(cur==="RSD") return value;
    if(typeof convert==="function") return num(convert(value,cur,"RSD"));
    return value;
  }

  function ensureFund(){
    if(typeof window.pnShopFundBalanceRsd==="function") window.pnShopFundBalanceRsd();
    const ledger=Store.load();
    ledger.meta=ledger.meta||{};
    const fund=ledger.meta[FUND_META_KEY];
    if(!fund||Number(fund.version)!==7) throw new Error("SHOP FUND V7 is required before MAIL COD settlement.");
    if(!Array.isArray(fund.entries)) fund.entries=[];
    fund.journalDeltaRsd=num(fund.journalDeltaRsd);
    return fund;
  }

  function postFund(deltaRsd,kind,mail,note){
    const delta=num(deltaRsd);
    if(!delta) return null;
    const fund=ensureFund();
    const entry={
      id:uuid(),at:now(),kind:String(kind||"MAIL_COD_PAYMENT"),refType:"mail",
      refId:mail&&mail.id!=null?String(mail.id):null,deltaRsd:delta,
      note:String(note||"")
    };
    fund.journalDeltaRsd+=delta;
    fund.entries.push(entry);
    if(fund.entries.length>500) fund.entries=fund.entries.slice(-500);
    Store.persist();
    return entry;
  }

  function linkedInventory(mail){
    if(!mail||String(mail.linkedType||"").toLowerCase()!=="inventory"||!mail.linkedId) return null;
    return Store.get("inventory",mail.linkedId)||null;
  }
  function bookedInventoryRsd(mail){
    const inv=linkedInventory(mail);
    return inv?Math.max(0,toRsd(inv.purchasePrice,inv.currency||"RSD")):0;
  }
  function paidRsd(mail){
    if(mail&&mail.codPaidRsd!=null) return Math.max(0,num(mail.codPaidRsd));
    const amount=mail&&mail.codPaidAmount!=null?mail.codPaidAmount:mail&&mail.codAmount;
    const currency=mail&&mail.codPaidCurrency||mail&&mail.currency||"RSD";
    return Math.max(0,toRsd(amount,currency));
  }
  function desiredMailDebitRsd(mail){
    return Math.max(0,paidRsd(mail)-bookedInventoryRsd(mail));
  }
  function modeFor(mail,debit){
    const booked=bookedInventoryRsd(mail),paid=paidRsd(mail);
    if(debit<=0&&booked>0) return "INVENTORY_BOOKED";
    if(debit>0&&booked>0&&booked<paid) return "PARTIAL_MAIL_DEBIT";
    return debit>0?"MAIL_DEBIT":"NO_DEBIT";
  }

  function preview(mail){
    const codRsd=Math.max(0,toRsd(mail&&mail.codAmount,mail&&mail.currency||"RSD"));
    const booked=bookedInventoryRsd(mail);
    const debit=Math.max(0,codRsd-booked);
    return{codRsd,bookedRsd:booked,debitRsd:debit,mode:debit<=0&&booked>0?"INVENTORY_BOOKED":debit>0&&booked>0?"PARTIAL_MAIL_DEBIT":"MAIL_DEBIT"};
  }

  function updateMailRaw(id,payload){
    reconciling=true;
    try{return Store.update("mail",id,payload);}finally{reconciling=false;}
  }

  function reconcileMail(mail){
    if(reconciling||!mail||!mail.codPaid) return mail;
    const current=Math.max(0,num(mail.codFundDebitRsd));
    const desired=desiredMailDebitRsd(mail);
    const adjustment=current-desired; // + => refund duplicate debit; - => add missing debit
    if(Math.abs(adjustment)<0.005){
      const booked=bookedInventoryRsd(mail),mode=modeFor(mail,desired);
      if(num(mail.codBookedRsd)!==booked||mail.codAccountingMode!==mode){
        return updateMailRaw(mail.id,{codBookedRsd:booked,codFundDebitRsd:desired,codAccountingMode:mode,codReconciledAt:now()});
      }
      return mail;
    }
    const entry=postFund(adjustment,"MAIL_COD_RECONCILE",mail,
      adjustment>0?"Reconciled COD against inventory acquisition already booked":"Reinstated COD cash debit after linked inventory accounting changed");
    return updateMailRaw(mail.id,{
      codBookedRsd:bookedInventoryRsd(mail),codFundDebitRsd:desired,codAccountingMode:modeFor(mail,desired),
      codReconciledAt:now(),codReconcileEntryId:entry&&entry.id||""
    });
  }

  function reconcileByInventory(inventoryId){
    if(reconciling||!inventoryId) return;
    const mails=Store.all("mail")||[];
    mails.filter(m=>m&&m.codPaid&&String(m.linkedType||"").toLowerCase()==="inventory"&&String(m.linkedId||"")===String(inventoryId)).forEach(reconcileMail);
  }

  function pay(mail){
    if(!mail) throw new Error("Shipment not found.");
    if(String(mail.direction||"incoming")!=="incoming") throw new Error("PAY COD is only valid for incoming shipments.");
    if(num(mail.codAmount)<=0) throw new Error("This shipment has no COD amount to pay.");
    if(mail.codPaid) return mail;

    const p=preview(mail);
    let entry=null;
    if(p.debitRsd>0){
      entry=postFund(-p.debitRsd,"MAIL_COD_PAYMENT",mail,
        "COD paid"+(mail.trackingNumber?" — "+mail.trackingNumber:"")+(p.bookedRsd>0?"; linked inventory already booked "+Math.round(p.bookedRsd)+" RSD":""));
    }
    const payload={
      codPaid:true,codPaidAt:now(),codPaidAmount:num(mail.codAmount),codPaidCurrency:String(mail.currency||"RSD"),
      codPaidRsd:p.codRsd,codBookedRsd:p.bookedRsd,codFundDebitRsd:p.debitRsd,
      codAccountingMode:p.mode,codFundEntryId:entry&&entry.id||""
    };
    const rec=updateMailRaw(mail.id,payload);
    if(typeof Timeline!=="undefined"&&Timeline&&typeof Timeline.log==="function"){
      Timeline.log("MAIL_COD","COD paid — "+(mail.description||mail.trackingNumber||"shipment"),
        "Paid "+fmt(mail.codAmount,mail.currency||"RSD")+"; SHOP FUND impact "+(p.debitRsd>0?"-"+fmt(p.debitRsd,"RSD"):"0 RSD (already booked)"),
        typeof todayISO==="function"?todayISO():new Date().toISOString().slice(0,10),"mail",mail.id);
    }
    return rec;
  }

  /* Keep COD and inventory accounting mutually aware after this layer loads. */
  if(Store&&!Store.__pnMailCodFundV1Wrapped){
    const baseUpdate=Store.update.bind(Store);
    const baseInsert=Store.insert.bind(Store);
    Store.update=function(collection,id,payload){
      const result=baseUpdate(collection,id,payload);
      if(!reconciling){
        if(collection==="inventory"&&result) reconcileByInventory(id);
        else if(collection==="mail"&&result&&result.codPaid) reconcileMail(result);
      }
      return result;
    };
    Store.insert=function(collection,data){
      const result=baseInsert(collection,data);
      if(!reconciling&&collection==="inventory"&&result) reconcileByInventory(result.id);
      return result;
    };
    Store.__pnMailCodFundV1Wrapped=true;
  }

  /* Add PAY COD / PAID state without replacing the approved dossier renderer. */
  if(typeof mailCard==="function"&&!window.__PN_MAIL_COD_FUND_V1_CARD_WRAPPED__){
    window.__PN_MAIL_COD_FUND_V1_CARD_WRAPPED__=true;
    const baseCard=mailCard;
    mailCard=function(m){
      let html=baseCard(m);
      if(!html||String(m&&m.direction||"incoming")!=="incoming"||num(m&&m.codAmount)<=0) return html;
      const amount=fmt(m.codPaid?m.codPaidAmount:m.codAmount,m.codPaidCurrency||m.currency||"RSD");
      if(m.codPaid){
        const impact=num(m.codFundDebitRsd)>0?"SHOP FUND -"+fmt(m.codFundDebitRsd,"RSD"):"ALREADY BOOKED · NO EXTRA DEBIT";
        const paidRow='<div class="pn-mail-cod-row pn-mail-cod-settlement is-paid"><span><strong>COD PAID</strong><small>'+esc(impact)+'</small></span><b>'+esc(amount)+'</b><span class="pn-mail-cod-paid-mark">SETTLED</span></div>';
        html=html.replace(/<div class="pn-mail-cod-row">[\s\S]*?<\/div>/,paidRow);
      }else{
        const p=preview(m);
        const impact=p.debitRsd>0?(p.bookedRsd>0?"SHOP FUND -"+fmt(p.debitRsd,"RSD")+" · "+fmt(p.bookedRsd,"RSD")+" ALREADY BOOKED":"SHOP FUND -"+fmt(p.debitRsd,"RSD")):"ALREADY BOOKED · NO EXTRA DEBIT";
        const payRow='<div class="pn-mail-cod-row pn-mail-cod-settlement is-unpaid"><span><strong>COD / TO PAY</strong><small>'+esc(impact)+'</small></span><b>'+esc(amount)+'</b><button type="button" class="btn pn-mail-pay-cod" data-mail-pay-cod="'+esc(m.id)+'">PAY COD</button></div>';
        html=html.replace(/<div class="pn-mail-cod-row">[\s\S]*?<\/div>/,payRow);
      }
      return html;
    };
  }

  document.addEventListener("click",function(e){
    const btn=e.target&&e.target.closest?e.target.closest("[data-mail-pay-cod]"):null;
    if(!btn) return;
    e.preventDefault();e.stopPropagation();
    const mail=Store.get("mail",btn.dataset.mailPayCod);
    if(!mail) return;
    if(mail.codPaid){if(typeof render==="function")render();return;}
    const p=preview(mail);
    const lines=["PAY COD "+fmt(mail.codAmount,mail.currency||"RSD")+"?",""];
    if(p.bookedRsd>0) lines.push("Already booked through linked inventory: "+fmt(p.bookedRsd,"RSD"));
    lines.push("SHOP FUND impact: "+(p.debitRsd>0?"-"+fmt(p.debitRsd,"RSD"):"0 RSD — already accounted"));
    lines.push("This payment can only be posted once.");
    if(typeof confirm==="function"&&!confirm(lines.join("\n"))) return;
    try{pay(mail);if(typeof render==="function")render();}
    catch(err){console.error("[PROFITNODE] MAIL COD payment failed",err);if(typeof alert==="function")alert("COD PAYMENT FAILED\n"+String(err&&err.message||err));}
  },true);

  const style=document.createElement("style");
  style.id="pn-mail-cod-shop-fund-v1-style";
  style.textContent=`
    .pn-mail-cod-row.pn-mail-cod-settlement{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;gap:12px!important;align-items:center!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement>span:first-child{display:flex!important;flex-direction:column!important;gap:4px!important;width:auto!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement>span:first-child strong{font:900 10px var(--mono)!important;letter-spacing:.12em!important;color:#d076ff!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement>span:first-child small{font:800 7.5px var(--mono)!important;letter-spacing:.055em!important;color:#a993ba!important;text-transform:none!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement>b{font-size:18px!important;white-space:nowrap!important;}
    .pn-mail-pay-cod{min-height:34px!important;padding:7px 12px!important;border:1px solid #d16bff!important;background:linear-gradient(90deg,#7d2dc4,#a83ceb)!important;color:#fff!important;font:900 9px var(--stamp)!important;letter-spacing:.07em!important;box-shadow:0 0 14px rgba(185,71,255,.14)!important;}
    .pn-mail-pay-cod:hover{filter:brightness(1.12)!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement.is-paid{border-color:rgba(66,226,143,.68)!important;background:linear-gradient(90deg,rgba(26,111,76,.20),rgba(43,65,56,.20))!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement.is-paid>span:first-child strong{color:#54e6a0!important;}
    .pn-mail-cod-row.pn-mail-cod-settlement.is-paid>span:first-child small{color:#7fb59d!important;}
    .pn-mail-cod-paid-mark{width:auto!important;flex:none!important;padding:6px 9px!important;border:1px solid rgba(66,226,143,.55)!important;border-radius:3px!important;color:#54e6a0!important;background:rgba(66,226,143,.07)!important;font:900 8px var(--mono)!important;letter-spacing:.09em!important;}
    @media(max-width:700px){.pn-mail-cod-row.pn-mail-cod-settlement{grid-template-columns:1fr auto!important}.pn-mail-pay-cod,.pn-mail-cod-paid-mark{grid-column:1/-1!important;width:100%!important;text-align:center!important}.pn-mail-cod-row.pn-mail-cod-settlement>b{font-size:15px!important}}
  `;
  document.head.appendChild(style);

  window.pnMailCodSettlementPreview=preview;
  window.pnMailCodPayById=function(id){const m=Store.get("mail",id);return pay(m);};
  window.pnMailCodReconcile=function(id){const m=Store.get("mail",id);return reconcileMail(m);};

  console.info("[PROFITNODE] MAIL COD -> SHOP FUND V1 ACTIVE");
})();
