"use strict";

/* PROFITNODE MAIL — Shipment Dossier Visual V3
   Implements the approved cyberpunk shipment-command visual concept on the live MAIL cards.
   Presentation only: no Store, Actions, parser, accounting, shipment state, or tracking behavior changes. */
(function(){
  if(window.__PN_MAIL_SHIPMENT_DOSSIER_V3__) return;
  window.__PN_MAIL_SHIPMENT_DOSSIER_V3__=true;

  const oldV2=document.getElementById("pn-mail-dossier-visual-v2-style");
  if(oldV2) oldV2.remove();
  const oldV3=document.getElementById("pn-mail-shipment-dossier-v3-style");
  if(oldV3) oldV3.remove();

  const ASSET="assets/mail/dossier_v3/";
  const statusMeta={
    preparing:["PREPARING","AWAITING DISPATCH"],
    sent:["SENT","SHIPMENT DISPATCHED"],
    in_transit:["IN TRANSIT","PACKAGE ON THE WAY"],
    ready_for_pickup:["READY FOR PICKUP","COLLECTION AVAILABLE"],
    delivered:["DELIVERED","SHIPMENT COMPLETE"],
    delayed:["DELAYED","COURIER EXCEPTION"],
    returned:["RETURNED","SENT BACK TO SENDER"],
    lost:["LOST","INVESTIGATION REQUIRED"]
  };
  function carrierClass(value){
    const s=String(value||"").toLowerCase();
    if(s.includes("bex")) return "is-carrier-bex";
    if(s.includes("pošta")||s.includes("posta")||s.includes("post express")) return "is-carrier-posta";
    if(s.includes("d express")||s.includes("dexpress")) return "is-carrier-dexpress";
    if(s.includes("aks")) return "is-carrier-aks";
    if(s.includes("city express")) return "is-carrier-city";
    if(s.includes("dhl")) return "is-carrier-dhl";
    return "is-carrier-generic";
  }
  function safeClass(value){return String(value||"").toLowerCase().replace(/[^a-z0-9_-]+/g,"-");}
  function statusPair(status){return statusMeta[status]||[String(status||"SHIPMENT").replace(/_/g," ").toUpperCase(),"COURIER RECORD"];}

  /* Decorate the existing renderer instead of reimplementing MAIL logic. */
  if(typeof mailCard==="function"&&!window.__PN_MAIL_SHIPMENT_DOSSIER_V3_WRAPPED__){
    window.__PN_MAIL_SHIPMENT_DOSSIER_V3_WRAPPED__=true;
    const originalMailCard=mailCard;
    mailCard=function(m){
      let html=originalMailCard(m);
      if(!html||typeof html!=="string") return html;
      const status=String(m&&m.status||"in_transit");
      const pair=statusPair(status);
      const carrier=String(m&&m.carrier||"Courier");
      const direction=String(m&&m.direction||"incoming");
      const cod=Number(m&&m.codAmount)||0;
      const currency=String(m&&m.currency||"RSD");
      const cls=["pn-mail-dossier-v3",carrierClass(carrier),"is-status-"+safeClass(status),"is-direction-"+safeClass(direction),cod>0?"has-cod":"no-cod"].join(" ");

      html=html.replace('<div class="panel pn-mail-card">','<div class="panel pn-mail-card '+cls+'">');
      html=html.replace('<div class="pn-mail-card-head">','<div class="pn-mail-card-topline"><div class="pn-mail-dossier-state"><span>'+pair[0]+'</span><small>'+pair[1]+'</small></div><div class="pn-mail-card-head">');
      html=html.replace('</div><div class="pn-mail-card-desc">','</div></div><div class="pn-mail-card-desc">');
      html=html.replace('</div><div class="pn-mail-meta">','</div><div class="pn-mail-dossier-subtitle">'+carrier.replace(/[<>&]/g,"")+' // '+direction.toUpperCase()+'</div><div class="pn-mail-meta">');
      if(cod<=0){
        html=html.replace('<div class="pn-mail-sub">','<div class="pn-mail-zero-cod"><div><b>NO COD // 0 '+currency.replace(/[<>&]/g,"")+'</b><small>No payment on delivery</small></div><span>ALL CLEAR</span></div><div class="pn-mail-sub">');
      }
      return html;
    };
  }

  const style=document.createElement("style");
  style.id="pn-mail-shipment-dossier-v3-style";
  style.textContent=`
/* ===== MAIL SHIPMENT DOSSIER V3 / APPROVED VISUAL CONCEPT ===== */
.pn-mail-grid{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:18px!important;
  align-items:stretch!important;
}

.pn-mail-card.pn-mail-dossier-v3{
  --mail-accent:#36d7ff;
  --mail-accent-rgb:54,215,255;
  --mail-secondary:#a946ff;
  position:relative!important;
  isolation:isolate!important;
  display:flex!important;
  flex-direction:column!important;
  min-width:0!important;
  min-height:520px!important;
  padding:20px 20px 15px 28px!important;
  border:1px solid rgba(93,76,126,.78)!important;
  border-radius:0!important;
  clip-path:polygon(0 14px,14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px))!important;
  background:
    radial-gradient(circle at 87% 10%,rgba(125,54,199,.12),transparent 31%),
    linear-gradient(180deg,rgba(21,16,31,.985),rgba(14,12,22,.99))!important;
  box-shadow:0 16px 34px rgba(0,0,0,.25),inset 0 0 0 1px rgba(180,139,255,.035)!important;
  overflow:hidden!important;
}
.pn-mail-card.pn-mail-dossier-v3::before{
  content:"";
  position:absolute;z-index:5;left:0;top:18px;bottom:18px;width:7px;
  background:
    radial-gradient(circle at 50% 18px,#d9fbff 0 2px,var(--mail-accent) 3px 6px,rgba(var(--mail-accent-rgb),.17) 7px 11px,transparent 12px),
    linear-gradient(180deg,var(--mail-accent) 0 44%,rgba(var(--mail-accent-rgb),.16) 44% 60%,var(--mail-accent) 60% 100%);
  box-shadow:0 0 16px rgba(var(--mail-accent-rgb),.52);
  pointer-events:none;
}
.pn-mail-card.pn-mail-dossier-v3::after{
  content:"";position:absolute;z-index:-1;right:18px;top:58px;width:150px;height:98px;
  opacity:.32;background-repeat:no-repeat;background-position:right center;background-size:contain;
  filter:saturate(1.12) brightness(.92);pointer-events:none;
}
.pn-mail-card.pn-mail-dossier-v3.is-carrier-bex::after{background-image:url("${ASSET}bex_crate.png?v=3");}
.pn-mail-card.pn-mail-dossier-v3.is-carrier-posta::after{background-image:url("${ASSET}posta_crate.png?v=3");width:180px;}
.pn-mail-card.pn-mail-dossier-v3.is-status-delivered{--mail-accent:#43e38f;--mail-accent-rgb:67,227,143;--mail-secondary:#34c77b;}
.pn-mail-card.pn-mail-dossier-v3.is-status-delayed,
.pn-mail-card.pn-mail-dossier-v3.is-status-returned,
.pn-mail-card.pn-mail-dossier-v3.is-status-lost{--mail-accent:#ff5268;--mail-accent-rgb:255,82,104;--mail-secondary:#ff405c;}
.pn-mail-card.pn-mail-dossier-v3.is-direction-outgoing:not(.is-status-delayed):not(.is-status-returned):not(.is-status-lost){--mail-accent:#bf69ff;--mail-accent-rgb:191,105,255;--mail-secondary:#a946ff;}

.pn-mail-card-topline{
  order:1!important;display:flex!important;align-items:flex-start!important;justify-content:space-between!important;
  gap:16px!important;min-height:54px!important;margin:0 0 7px!important;padding:0 0 0 8px!important;
}
.pn-mail-dossier-state{display:flex;flex-direction:column;gap:3px;min-width:0;padding-left:17px;position:relative;}
.pn-mail-dossier-state::before{
  content:"";position:absolute;left:0;top:3px;width:9px;height:9px;border:2px solid var(--mail-accent);border-radius:50%;
  background:rgba(var(--mail-accent-rgb),.20);box-shadow:0 0 10px rgba(var(--mail-accent-rgb),.55);
}
.pn-mail-dossier-state span{font:900 12px var(--mono);letter-spacing:.12em;color:var(--mail-accent);}
.pn-mail-dossier-state small{font:800 8px var(--mono);letter-spacing:.12em;color:#9e88b7;}
.pn-mail-card-head{
  display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;flex-wrap:wrap!important;
  margin:0!important;padding:0!important;max-width:62%!important;
}
.pn-mail-card-head .chip{
  display:inline-flex!important;align-items:center!important;min-height:24px!important;padding:4px 8px!important;border-radius:3px!important;
  font-size:8.5px!important;letter-spacing:.075em!important;background:rgba(21,18,31,.72)!important;
}
.pn-mail-card-head .chip-muted{display:none!important;}

.pn-mail-card-desc{
  order:2!important;position:relative!important;z-index:2!important;margin:0 0 4px!important;padding:0 145px 0 8px!important;
  color:#f8f6fb!important;font-size:19px!important;line-height:1.16!important;font-weight:900!important;letter-spacing:.002em!important;
}
.pn-mail-dossier-subtitle{
  order:3!important;margin:0 0 16px!important;padding:0 145px 0 8px!important;color:#9b86b2!important;
  font:700 9px var(--mono)!important;letter-spacing:.075em!important;text-transform:uppercase!important;
}

/* Identity / tracking slab */
.pn-mail-meta{
  order:4!important;display:grid!important;grid-template-columns:.82fr 1.18fr!important;gap:0!important;
  margin:0 0 10px!important;padding:0!important;border:1px solid rgba(89,72,126,.55)!important;border-radius:6px!important;
  background:linear-gradient(180deg,rgba(32,26,46,.86),rgba(22,18,33,.91))!important;overflow:hidden!important;
  box-shadow:inset 0 0 18px rgba(160,78,255,.025)!important;
}
.pn-mail-meta .pn-mail-card-row{
  min-height:76px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;
  gap:5px!important;padding:12px 14px!important;border-top:0!important;border-right:1px solid rgba(103,82,139,.38)!important;
}
.pn-mail-meta .pn-mail-card-row:last-child{border-right:0!important;}
.pn-mail-meta .pn-mail-card-row span{
  width:auto!important;flex:0!important;color:#9b86b6!important;font:800 8.5px var(--mono)!important;letter-spacing:.09em!important;
}
.pn-mail-meta .pn-mail-card-row>b{color:#f2edf7!important;font-size:13px!important;font-weight:850!important;}
.pn-mail-track{
  display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;grid-template-rows:auto auto!important;
  align-items:center!important;gap:6px 7px!important;
}
.pn-mail-track>span{grid-column:1/-1!important;}
.pn-mail-track b.mono{
  grid-column:1!important;min-width:0!important;color:#fff!important;font:900 13.5px var(--mono)!important;letter-spacing:.035em!important;
  overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
}
.pn-mail-track .btn{
  min-height:28px!important;padding:4px 8px!important;border:1px solid rgba(175,72,255,.56)!important;border-radius:3px!important;
  color:#c986ff!important;background:rgba(151,51,220,.055)!important;font-size:8px!important;white-space:nowrap!important;
}
.pn-mail-track .btn:hover{color:#fff!important;background:rgba(168,65,239,.14)!important;border-color:#b95aff!important;}

/* Money signal */
.pn-mail-zero-cod,
.pn-mail-cod-row{
  order:5!important;min-height:58px!important;margin:0 0 10px!important;padding:10px 14px!important;border-radius:6px!important;
  display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;
}
.pn-mail-zero-cod{
  border:1px solid rgba(56,210,143,.40)!important;background:linear-gradient(90deg,rgba(25,111,76,.13),rgba(15,43,34,.18))!important;
}
.pn-mail-zero-cod div{display:flex;flex-direction:column;gap:3px;}
.pn-mail-zero-cod b{color:#54e6a0!important;font:900 12px var(--mono)!important;letter-spacing:.08em!important;}
.pn-mail-zero-cod small{color:#75a993!important;font:700 8.5px var(--mono)!important;}
.pn-mail-zero-cod>span{color:#4edb96!important;font:900 8px var(--mono)!important;letter-spacing:.09em!important;}
.pn-mail-cod-row{
  border:1px solid rgba(190,74,255,.78)!important;background:linear-gradient(90deg,rgba(122,35,171,.18),rgba(92,25,131,.33))!important;
  box-shadow:inset 0 0 24px rgba(181,66,255,.06)!important;
}
.pn-mail-cod-row span{width:auto!important;flex:none!important;color:#d076ff!important;font:900 10px var(--mono)!important;letter-spacing:.12em!important;}
.pn-mail-cod-row b{margin-left:auto!important;color:#f2dcff!important;font:900 18px var(--mono)!important;letter-spacing:.02em!important;}

/* Logistics readout */
.pn-mail-sub{order:6!important;margin:0 0 9px!important;padding:0 5px!important;display:block!important;}
.pn-mail-sub .pn-mail-card-row{
  min-height:39px!important;display:grid!important;grid-template-columns:145px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;
  padding:7px 5px!important;border-top:1px solid rgba(103,82,139,.30)!important;font-size:11px!important;
}
.pn-mail-sub .pn-mail-card-row span{width:auto!important;flex:none!important;color:#aa95bd!important;font:800 9px var(--mono)!important;letter-spacing:.08em!important;}
.pn-mail-sub .pn-mail-card-row b{color:#e5dde9!important;opacity:1!important;font:700 11px var(--mono)!important;}
.pn-mail-sub .pn-mail-deadline-row{border-left:0!important;background:transparent!important;}
.pn-mail-sub .pn-mail-action-deadline.is-overdue b,.pn-mail-sub .pn-mail-pickup-deadline.is-urgent b{color:#ff6074!important;}
.pn-mail-sub .pn-mail-action-deadline.is-today b,.pn-mail-sub .pn-mail-action-deadline.is-under24 b,.pn-mail-sub .pn-mail-pickup-deadline.is-soon b{color:#f4b958!important;}

/* Carrier quick-link rail */
.pn-mail-action-row{
  order:7!important;display:grid!important;grid-template-columns:145px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;
  margin:0 0 10px!important;padding:9px 5px!important;border-top:1px dashed rgba(119,88,151,.34)!important;border-bottom:1px dashed rgba(119,88,151,.18)!important;
}
.pn-mail-action-row>span{width:auto!important;flex:none!important;}
.pn-mail-action-links a.btn{
  border:1px solid rgba(182,72,255,.60)!important;color:#c978ff!important;background:rgba(164,59,230,.055)!important;
  border-radius:3px!important;padding:6px 11px!important;font-size:9px!important;
}
.pn-mail-action-links a.btn:hover{color:#fff!important;background:rgba(164,59,230,.14)!important;border-color:#bd58ff!important;}
.pn-mail-card>.pn-mail-card-row:not(.pn-mail-action-row){order:8!important;}

/* Command deck */
.pn-mail-card-foot{
  order:9!important;display:grid!important;grid-template-columns:1.25fr .82fr .82fr!important;gap:10px!important;
  margin-top:auto!important;padding-top:13px!important;border-top:1px solid rgba(105,82,137,.38)!important;
}
.pn-mail-card-foot .btn{
  min-height:43px!important;margin:0!important;padding:8px 12px!important;border-radius:4px!important;
  font-size:10px!important;letter-spacing:.055em!important;font-weight:900!important;
}
.pn-mail-card-foot .btn-primary{
  min-width:0!important;border-color:#a84aff!important;background:linear-gradient(90deg,#8f39e8,#b64bfa)!important;color:#fff!important;
  box-shadow:0 0 18px rgba(166,66,245,.13)!important;
}
.pn-mail-card-foot .btn-ghost{color:#ece5f2!important;border-color:rgba(129,105,157,.46)!important;background:rgba(46,36,59,.22)!important;}
.pn-mail-card-foot .btn-danger{margin-left:0!important;color:#ff5468!important;border-color:rgba(255,65,90,.60)!important;background:rgba(96,14,27,.20)!important;}

.pn-mail-card.pn-mail-dossier-v3:hover{
  border-color:rgba(var(--mail-accent-rgb),.62)!important;
  box-shadow:0 18px 38px rgba(0,0,0,.28),0 0 20px rgba(var(--mail-accent-rgb),.06)!important;
}

/* Filters and parser log echo the concept without changing app navigation. */
.pn-mail-filters{border:1px solid rgba(91,72,118,.58)!important;border-radius:0!important;background:rgba(20,16,29,.78)!important;overflow:hidden!important;}
.pn-mail-filter{min-height:42px!important;padding:10px 16px!important;border-right:1px solid rgba(91,72,118,.46)!important;color:#b5a5c2!important;}
.pn-mail-filter.active{color:#d37dff!important;background:rgba(164,64,225,.12)!important;box-shadow:inset 0 -3px 0 #b649f5!important;}
.pn-mail-miss-log,details:has(> summary:first-child){border-color:rgba(92,72,120,.44)!important;background:rgba(20,16,29,.55)!important;}

@media(max-width:1280px){
  .pn-mail-card-desc,.pn-mail-dossier-subtitle{padding-right:115px!important;}
  .pn-mail-card.pn-mail-dossier-v3::after{width:120px!important;opacity:.24!important;}
  .pn-mail-track{grid-template-columns:minmax(0,1fr) auto!important;}
  .pn-mail-track .btn:last-child{grid-column:1/-1!important;}
}
@media(max-width:1100px){
  .pn-mail-grid{grid-template-columns:1fr!important;}
}
@media(max-width:700px){
  .pn-mail-card.pn-mail-dossier-v3{min-height:0!important;padding:16px 14px 13px 22px!important;clip-path:none!important;border-radius:6px!important;}
  .pn-mail-card.pn-mail-dossier-v3::after{display:none!important;}
  .pn-mail-card-topline{display:block!important;min-height:0!important;}
  .pn-mail-card-head{justify-content:flex-start!important;max-width:none!important;margin-top:9px!important;}
  .pn-mail-card-desc,.pn-mail-dossier-subtitle{padding-right:0!important;}
  .pn-mail-meta{grid-template-columns:1fr!important;}
  .pn-mail-meta .pn-mail-card-row{border-right:0!important;border-bottom:1px solid rgba(103,82,139,.30)!important;}
  .pn-mail-track{grid-template-columns:1fr 1fr!important;}
  .pn-mail-track>span,.pn-mail-track b.mono{grid-column:1/-1!important;}
  .pn-mail-sub .pn-mail-card-row,.pn-mail-action-row{grid-template-columns:112px minmax(0,1fr)!important;}
  .pn-mail-card-foot{grid-template-columns:1fr!important;}
}
`;
  document.head.appendChild(style);
  console.info("[PROFITNODE] MAIL SHIPMENT DOSSIER VISUAL V3 ACTIVE");
})();
