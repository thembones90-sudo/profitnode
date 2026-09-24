"use strict";

/* PERSONAL TREASURY ("WAR CHEST") is deliberately isolated from the shop/business ledgers. */
const PN_TREASURY_CORE_BALANCES=[
  {sourceKey:"PAYONEER",label:"Payoneer",currency:"USD"},
  {sourceKey:"PREPLY",label:"Preply",currency:"USD"},
  {sourceKey:"FIVERR",label:"Fiverr",currency:"USD"},
  {sourceKey:"CASH_RSD",label:"Cash (RSD)",currency:"RSD"},
  {sourceKey:"CASH_EUR",label:"Cash (EUR)",currency:"EUR"}
];
const PN_WC_GLYPH={
  coin:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  chain:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><rect x="2" y="5" width="6.4" height="6.4" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="7.6" y="5" width="6.4" height="6.4" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  crate:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2 8h12M8 3.5v9" stroke="currentColor" stroke-width=".9"/></svg>',
  fortress:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><path d="M2.5 14V6.5h2.2V4.3h2v2.2h2.6V4.3h2v2.2h2.2V14Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
  rune:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><path d="M8 1.3 14.7 8 8 14.7 1.3 8Z" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M8 1.3V14.7M1.3 8H14.7" stroke="currentColor" stroke-width=".7"/></svg>',
  crown:'<svg viewBox="0 0 16 16" class="pn-wc-glyph" aria-hidden="true"><path d="M2.2 12.2 3 5.3l2.6 2.6L8 3.5l2.4 4.4 2.6-2.6.8 6.9Z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>'
};
function pnTreasuryId(){return crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())}
function pnTreasuryData(){const e=Store.load();return e.treasury=normalizeTreasury(e.treasury),e.treasury}
function pnTreasuryEur(e,t,a){const r=Math.max(0,Number(e)||0),n=a||pnTreasuryData().settings;return"USD"===t?r*(Number(n.usdToEur)||0):"RSD"===t?r*(Number(n.rsdToEur)||0):r}
function pnTreasuryCalculate(e){
  const t=normalizeTreasury(e),a=t.settings;
  const sum=(e,r)=>e.reduce((e,t)=>e+(r(t)?pnTreasuryEur(t.amount,t.currency,a):0),0);
  const liquid=sum(t.balances,e=>e.include!==!1),obligations=sum(t.obligations,e=>"PAID"!==e.status),pending=sum(t.pendingAssets,e=>!e.converted),income=sum(t.incomes,()=>!0),fortress=liquid-obligations;
  return{liquid,obligations,fortress,pending,income,afterPending:fortress+pending,afterSalary:fortress+pending+income}
}
function pnTreasuryMoney(e){return money(Number(e)||0,"EUR")}
function pnTreasuryNativeMoney(e,t){const a=Math.max(0,Number(e)||0);return"USD"===t?"$"+a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}):money(a,t)}
function pnTreasuryConfidence(e){return String(e||"MEDIUM").toUpperCase()}
function pnTreasuryZero(e){return Math.abs(Number(e)||0)<.005}
const PN_WC_SAFETY_FLOOR=500,PN_WC_GREEN_TARGET=800;
const PN_WC_BAND_RANK={BLOOD:0,YELLOW:1,GREEN:2},PN_WC_SURPLUS_PROTOCOL={roadTo:.5,hardware:.3,freeCash:.2};
function pnTreasuryFloor(e){const t=Number(e)||0;return t>=PN_WC_GREEN_TARGET?{tone:"good",label:"FORTRESS SECURED",band:"GREEN"}:t>=PN_WC_SAFETY_FLOOR?{tone:"near",label:"FORTRESS BUILDING",band:"YELLOW"}:{tone:"danger",label:"FORTRESS BREACHED",band:"BLOOD"}}
function pnTreasuryNextGate(e){const t=Number(e)||0;return t<PN_WC_SAFETY_FLOOR?pnTreasuryMoney(PN_WC_SAFETY_FLOOR-t)+" TO SAFETY":t<PN_WC_GREEN_TARGET?pnTreasuryMoney(PN_WC_GREEN_TARGET-t)+" TO GREEN":"GREEN SECURED"}
function pnTreasuryRecurringDues(e){return(e.obligations||[]).reduce((t,a)=>t+(a.recurring&&"PAID"!==a.status?pnTreasuryEur(a.amount,a.currency,e.settings):0),0)}
function pnTreasuryRunway(e,t){const a=pnTreasuryRecurringDues(e);return a>0?Math.max(0,t.fortress/a).toFixed(1)+" MONTHS":"NO RECURRING DUES"}
function pnTreasuryLatestCrossing(e){return(e.flows||[]).filter(x=>x.reserveCrossing).slice().sort((a,b)=>String(b.reserveCrossedAt||b.updatedAt||b.createdAt||"").localeCompare(String(a.reserveCrossedAt||a.updatedAt||a.createdAt||"")))[0]||null}
function pnTreasuryDays(e){if(!e)return null;const t=new Date(todayISO()+"T00:00:00"),a=new Date(e+"T00:00:00");return isNaN(a)?null:Math.ceil((a-t)/864e5)}
function pnTreasuryNewestIncome(e){const t=e||[];return t.filter(e=>e.expectedDate).slice().sort((e,t)=>e.expectedDate.localeCompare(t.expectedDate))[0]||t[0]||null}
function pnTreasuryCoreDraft(e){
  const t=normalizeTreasury(e),a=t.balances.slice(),r=[];
  PN_TREASURY_CORE_BALANCES.forEach(e=>{let t=a.find(t=>t.sourceKey===e.sourceKey);t||(t=a.find(t=>String(t.label||"").trim().toLowerCase()===e.label.toLowerCase()));t?t.sourceKey=e.sourceKey:t={id:pnTreasuryId(),sourceKey:e.sourceKey,label:e.label,amount:0,currency:e.currency,include:!0,note:"",updatedAt:todayISO()};r.push(t)});
  const n=new Set(PN_TREASURY_CORE_BALANCES.map(e=>e.sourceKey)),s=new Set(PN_TREASURY_CORE_BALANCES.map(e=>e.label.toLowerCase()));t.balances=r.concat(a.filter(e=>!r.includes(e)&&!n.has(e.sourceKey)&&!s.has(String(e.label||"").trim().toLowerCase())));return t
}
function pnTreasuryClone(){return pnTreasuryCoreDraft(JSON.parse(JSON.stringify(pnTreasuryData())))}
function pnTreasuryDraftBase(d){const m={};(d&&d.balances||[]).forEach(b=>{b&&b.id&&(m[b.id]=Number(b.amount)||0)});return m}
function pnTreasuryRebaseDraft(draft,base,live){const b=base||{},l=live||{balances:[],flows:[]},liveBal=Array.isArray(l.balances)?l.balances:[],used=new Set(),match=x=>liveBal.find(y=>y&&y.id===x.id)||(x.sourceKey?liveBal.find(y=>y&&!(y.id in b)&&y.sourceKey===x.sourceKey):null);draft.balances=(draft.balances||[]).map(x=>{const cur=match(x);cur&&used.add(cur.id);return cur&&x.id in b&&(Number(x.amount)||0)===b[x.id]?Object.assign({},x,{amount:cur.amount}):x}).concat(liveBal.filter(y=>y&&!(y.id in b)&&!used.has(y.id)&&!(draft.balances||[]).some(x=>x.id===y.id)).map(y=>JSON.parse(JSON.stringify(y))));draft.flows=JSON.parse(JSON.stringify(Array.isArray(l.flows)?l.flows:[]));return draft}
function pnTreasuryCard(e,t,a,r,g){return'<div class="pn-treasury-card '+(r||'')+'"><span>'+(g&&PN_WC_GLYPH[g]||"")+e+'</span><strong>'+t+'</strong>'+(a?'<small>'+a+'</small>':'')+'</div>'}
const PN_WC_SOURCE_ASSETS={
  PAYONEER:"assets/treasury/payoneer.svg",
  PREPLY:"assets/treasury/preply.svg",
  FIVERR:"assets/treasury/fiverr.ico",
  CASH_RSD:"assets/treasury/cash.svg",
  CASH_EUR:"assets/treasury/cash.svg"
};
function pnTreasurySourceCards(e){
  const t=pnTreasuryCoreDraft(JSON.parse(JSON.stringify(e))),settings=t.settings;
  return'<section class="pn-wc-sources"><div class="pn-wc-section-head"><b>RESERVES</b></div><div class="pn-wc-source-grid">'+PN_TREASURY_CORE_BALANCES.map(def=>{
    const b=t.balances.find(x=>x.sourceKey===def.sourceKey)||{amount:0,currency:def.currency,include:!0},
      enabled=b.include!==!1,
      cur=b.currency||def.currency,
      amount=Math.max(0,Number(b.amount)||0),
      equivalent="EUR"===cur?"":pnTreasuryMoney(pnTreasuryEur(amount,cur,settings)),
      zero=pnTreasuryZero(amount),
      major=def.sourceKey==="PAYONEER"||def.sourceKey==="PREPLY",
      cls=(enabled?"":" is-muted")+(zero?" is-zero":" is-funded")+(major?" is-major":"");
    return'<article class="pn-wc-source'+cls+'" data-wc-source="'+def.sourceKey+'"><div class="pn-wc-source-mark"><img src="'+PN_WC_SOURCE_ASSETS[def.sourceKey]+'" alt="" aria-hidden="true"></div><div><span>'+escHtml(def.label)+'</span><strong>'+pnTreasuryNativeMoney(amount,cur)+'</strong>'+(equivalent?'<small>'+equivalent+(enabled?'':' · excluded')+'</small>':enabled?'':'<small>EXCLUDED</small>')+'</div></article>'
  }).join("")+'</div></section>'
}
function pnTreasuryLastRecount(e){
  const snap=(e.snapshots||[]).slice(-1)[0],stamp=snap&&(snap.timestamp||snap.date)||e.balances.map(x=>x.updatedAt).filter(Boolean).sort().slice(-1)[0];
  return stamp?fmtDate(String(stamp).slice(0,10),"short"):"NEVER";
}
function pnTreasuryMovements(e,t,r){
  return'<section class="pn-wc-movements panel"><div class="pn-wc-section-head"><b>FORECAST</b></div><div class="pn-wc-movement-grid">'
    +pnTreasuryCard("Obligations",pnTreasuryMoney(t.obligations),pnTreasuryZero(t.obligations)?"":e.obligations.filter(x=>"PAID"!==x.status).length+" pending","is-dues"+(pnTreasuryZero(t.obligations)?" is-zero":""),"chain")
    +pnTreasuryCard("Pending Conversion",pnTreasuryMoney(t.pending),pnTreasuryZero(t.pending)?"":e.pendingAssets.filter(x=>!x.converted).length+" unconverted","is-spoils"+(pnTreasuryZero(t.pending)?" is-zero":""),"crate")
    +pnTreasuryCard("Incoming Tribute",pnTreasuryMoney(t.income),pnTreasuryZero(t.income)?"":r?((r.source||"Tribute source")+" · "+pnTreasuryConfidence(r.confidence)):"","is-tribute"+(pnTreasuryZero(t.income)?" is-zero":""),"crown")
    +pnTreasuryCard("Projected Hoard",pnTreasuryMoney(t.afterSalary),"Fortress + conversion + tribute","is-projected","rune")
    +'</div></section>'
}
function pnTreasuryHero(t,e,a){
  const maxScale=Math.max(1e3,t.fortress*1.15),
    fillPct=Math.max(0,Math.min(100,t.fortress/maxScale*100)),
    floorPct=PN_WC_SAFETY_FLOOR/maxScale*100,
    greenTargetPct=PN_WC_GREEN_TARGET/maxScale*100,
    bloodAbs=Math.max(0,Math.min(fillPct,floorPct)),
    yellowAbs=Math.max(0,Math.min(fillPct,greenTargetPct)-bloodAbs),
    greenAbs=Math.max(0,fillPct-bloodAbs-yellowAbs),
    bloodRel=fillPct>0?bloodAbs/fillPct*100:0,
    yellowRel=fillPct>0?yellowAbs/fillPct*100:0,
    greenRel=fillPct>0?greenAbs/fillPct*100:0;

  return'<div class="pn-treasury-card pn-wc-hero is-fortress '+a.tone+'" data-wc-band="'+a.band+'">'+
    '<div class="pn-wc-hero-top"><span class="pn-wc-hero-eyebrow">'+PN_WC_GLYPH.fortress+'FORTRESS RESERVE</span><span class="pn-wc-hero-status '+a.tone+'">'+a.label+'</span></div>'+
    '<strong>'+pnTreasuryMoney(t.fortress)+'</strong>'+
    '<div class="pn-wc-gauge"><div class="pn-wc-gauge-track">'+
      '<div class="pn-wc-gauge-progress" style="width:'+fillPct.toFixed(2)+'%">'+
        '<i class="pn-wc-gauge-segment blood" style="width:'+bloodRel.toFixed(3)+'%"></i>'+
        '<i class="pn-wc-gauge-segment yellow" style="width:'+yellowRel.toFixed(3)+'%"></i>'+
        '<i class="pn-wc-gauge-segment green" style="width:'+greenRel.toFixed(3)+'%"></i>'+
        '<i class="pn-wc-gauge-gloss" aria-hidden="true"></i>'+
        '<i class="pn-wc-gauge-pulse-v6" aria-hidden="true"></i>'+
      '</div>'+
      '<div class="pn-wc-gauge-floor" style="left:'+floorPct.toFixed(2)+'%"><span>€500</span></div>'+
      '<div class="pn-wc-gauge-target" style="left:'+greenTargetPct.toFixed(2)+'%"><span>€800</span></div>'+
    '</div></div>'+
    '<div class="pn-wc-reserve-summary"><span class="gate"><b>NEXT GATE</b> '+pnTreasuryNextGate(t.fortress)+'</span><span><b>'+pnTreasuryMoney(Math.min(Math.max(0,t.fortress),PN_WC_GREEN_TARGET))+'</b> PROTECTED</span><span><b>'+pnTreasuryMoney(Math.max(0,t.fortress-PN_WC_GREEN_TARGET))+'</b> DEPLOYABLE</span>'+(pnTreasuryRecurringDues(e)>0?'<span><b>'+pnTreasuryRunway(e,t)+'</b> RUNWAY</span>':'')+'</div>'+
    '</div>'
}
function pnTreasuryCrossingAlert(e){const t=pnTreasuryLatestCrossing(e);if(!t)return"";return'<div class="pn-wc-crossing-alert"><b>RESERVE BAND BREACH</b><span>'+escHtml(String(t.reserveBandBefore||"")+" → "+String(t.reserveBandAfter||""))+'</span><span>'+escHtml(pnTreasuryFlowMeta(t))+'</span><small>'+fmtDate(String(t.reserveCrossedAt||t.updatedAt||t.createdAt||"").slice(0,10),"short")+'</small></div>'}
function pnTreasurySurplusProtocol(t){
  const e=Math.max(0,t.fortress-PN_WC_GREEN_TARGET);
  if(!e)return"";
  const road=e*PN_WC_SURPLUS_PROTOCOL.roadTo,
    hardware=e*PN_WC_SURPLUS_PROTOCOL.hardware,
    free=e*PN_WC_SURPLUS_PROTOCOL.freeCash;
  return'<div class="panel pn-wc-surplus-protocol pn-wc-surplus-v21">'+
    '<div class="pn-wc-surplus-total"><span>SURPLUS</span><strong>'+pnTreasuryMoney(e)+'</strong><small>Allocation doctrine · 50 / 30 / 20</small></div>'+
    '<div class="pn-wc-allocation">'+
      '<div class="pn-wc-allocation-bar"><i class="road"></i><i class="hardware"></i><i class="free"></i></div>'+
      '<div class="pn-wc-allocation-cards">'+
        '<div class="pn-wc-allocation-card road"><span>ROAD TO · 50%</span><strong>'+pnTreasuryMoney(road)+'</strong><small>Strategic reserve</small></div>'+
        '<div class="pn-wc-allocation-card hardware"><span>HARDWARE · 30%</span><strong>'+pnTreasuryMoney(hardware)+'</strong><small>Parts / flips / acquisitions</small></div>'+
        '<div class="pn-wc-allocation-card free"><span>FREE · 20%</span><strong>'+pnTreasuryMoney(free)+'</strong><small>Flexible pool</small></div>'+
      '</div>'+
    '</div>'+
  '</div>'
}
function pnTreasuryOptions(e,t){return e.map(e=>'<option value="'+e+'"'+(e===t?' selected':'')+'>'+STATUS_LABEL(e)+'</option>').join("")}
function pnTreasuryInput(e,t,a,r){return'<label><span>'+e+'</span><input type="'+(r||"text")+'" value="'+escAttr(null==a?"":a)+'" data-treasury-path="'+t+'"'+("number"===r?' min="0" step="0.01" data-treasury-number':'')+'></label>'}
function pnTreasurySelect(e,t,a,r){return'<label><span>'+e+'</span><select data-treasury-path="'+t+'">'+pnTreasuryOptions(r,a)+'</select></label>'}
function pnTreasuryRemove(e,t){return'<button type="button" class="pn-treasury-remove" aria-label="Remove row" data-treasury-remove="'+e+'" data-treasury-index="'+t+'">×</button>'}
function pnTreasuryRows(e,t){
  if(!e.length)return'<div class="pn-treasury-empty">No entries yet.</div>';
  return e.map((e,a)=>{
    const r=t+"."+a+".";
    if("balances"===t)return'<div class="pn-treasury-row balance"'+(e.sourceKey?' data-treasury-core="'+escAttr(e.sourceKey)+'"':'')+'>'+(e.sourceKey?'<label><span>Source</span><input type="text" value="'+escAttr(e.label)+'" readonly></label>':pnTreasuryInput("Label",r+"label",e.label))+pnTreasuryInput("Amount",r+"amount",e.amount,"number")+pnTreasurySelect("Currency",r+"currency",e.currency,["EUR","USD","RSD"])+'<label class="pn-check"><span>Liquid</span><input type="checkbox" data-treasury-path="'+r+'include"'+(e.include!==!1?' checked':'')+'></label>'+pnTreasuryInput("Note",r+"note",e.note)+'<div class="pn-treasury-updated"><span>Updated</span><b>'+fmtDate(String(e.updatedAt||todayISO()).slice(0,10),"short")+'</b></div>'+(e.sourceKey?'<span class="pn-treasury-required" title="Core rebalance source">CORE</span>':pnTreasuryRemove(t,a))+"</div>";
    if("obligations"===t)return'<div class="pn-treasury-row obligation">'+pnTreasuryInput("Obligation",r+"name",e.name)+pnTreasuryInput("Amount",r+"amount",e.amount,"number")+pnTreasurySelect("Currency",r+"currency",e.currency,["EUR","USD","RSD"])+pnTreasurySelect("Status",r+"status",e.status,["PENDING","PAID"])+pnTreasuryInput("Category",r+"category",e.category)+pnTreasuryInput("Due",r+"dueDate",e.dueDate,"date")+'<label class="pn-check"><span>Recurring</span><input type="checkbox" data-treasury-path="'+r+'recurring"'+(e.recurring?' checked':'')+'></label>'+pnTreasuryInput("Note",r+"note",e.note)+pnTreasuryRemove(t,a)+"</div>";
    if("pendingAssets"===t)return'<div class="pn-treasury-row pending">'+pnTreasuryInput("Asset / income",r+"name",e.name)+pnTreasuryInput("Expected",r+"amount",e.amount,"number")+pnTreasurySelect("Currency",r+"currency",e.currency,["EUR","USD","RSD"])+pnTreasurySelect("Type",r+"type",e.type,["HARDWARE_SALE","PENDING_INCOME","SIDE_JOB","OTHER"])+pnTreasurySelect("Confidence",r+"confidence",e.confidence,["LOW","MEDIUM","HIGH","GUARANTEED"])+pnTreasuryInput("Expected date",r+"expectedDate",e.expectedDate,"date")+'<label class="pn-check"><span>Converted</span><input type="checkbox" data-treasury-path="'+r+'converted"'+(e.converted?' checked':'')+'></label>'+pnTreasuryInput("Note",r+"note",e.note)+pnTreasuryRemove(t,a)+"</div>";
    return'<div class="pn-treasury-row income">'+pnTreasuryInput("Income source",r+"source",e.source)+pnTreasuryInput("Expected",r+"amount",e.amount,"number")+pnTreasurySelect("Currency",r+"currency",e.currency,["EUR","USD","RSD"])+pnTreasuryInput("Expected date",r+"expectedDate",e.expectedDate,"date")+pnTreasurySelect("Confidence",r+"confidence",e.confidence,["LOW","MEDIUM","HIGH","GUARANTEED"])+pnTreasuryInput("Note",r+"note",e.note)+'<label class="pn-check"><span>Recurring</span><input type="checkbox" data-treasury-path="'+r+'recurring"'+(e.recurring?' checked':'')+'></label>'+pnTreasuryRemove(t,a)+"</div>"
  }).join("")
}
function pnTreasurySection(e,t,a){return'<section class="pn-treasury-edit-section"><div class="pn-treasury-edit-head"><div><h3>'+e+'</h3><p>'+a+'</p></div><button type="button" class="btn btn-sm" data-treasury-add="'+t+'">+ ADD</button></div>'+pnTreasuryRows(state.treasuryDraft[t],t)+"</section>"}
function pnTreasuryEditor(){const e=state.treasuryDraft,t=e.settings;return'<div class="pn-wc-drawer-shell" role="dialog" aria-modal="true" aria-label="Recount the Hoard"><button type="button" class="pn-wc-drawer-scrim" aria-label="Close recount" data-treasury-cancel></button><aside class="panel pn-treasury-editor"><div class="panel-head"><h2>Recount The Hoard</h2><div><button type="button" class="btn" data-treasury-cancel>CANCEL</button> <button type="button" class="btn btn-primary pn-wc-btn" data-treasury-save>SEAL</button></div></div><div class="panel-body"><div class="pn-treasury-settings">'+pnTreasuryInput("USD → EUR",'settings.usdToEur',t.usdToEur,"number")+pnTreasuryInput("RSD → EUR",'settings.rsdToEur',t.rsdToEur,"number")+pnTreasurySelect("Reckoning label","snapshotLabel",state.treasurySnapshotLabel||"MID_MONTH",["POST_SALARY","POST_SEXODIA","PRE_MOVE","POST_MOVE","MID_MONTH","FINAL_STRETCH","CUSTOM"])+pnTreasuryInput("Reckoning note","snapshotNote",state.treasurySnapshotNote||"")+"</div><p class=\"pn-treasury-fx-note\">Planning rates only · fixed reserve doctrine: BLOOD below €500 · YELLOW €500–799 · GREEN from €800.</p>"+pnTreasurySection("Core balances","balances","Payoneer, Preply, Fiverr and both cash currencies are always ready for every rebalance. Add custom sources only when needed.")+pnTreasurySection("Obligations","obligations","Only pending obligations reduce the fortress.")+pnTreasurySection("Pending / saleable assets","pendingAssets","Potential recovery only; converted rows stop counting here.")+pnTreasurySection("Salary / income projection","incomes","Projected income never enters Current Treasury.")+'<div class="pn-treasury-savebar"><button type="button" class="btn btn-primary pn-wc-btn" data-treasury-save>SEAL THE RECKONING</button></div></div></aside></div>'}
function pnTreasuryTrend(e){
  const t=e.slice(-12);if(t.length<2)return'<div class="pn-treasury-empty">Two reckonings are needed to draw the trend.</div>';
  const a=t.flatMap(e=>[Number(e.liquid)||0,Number(e.fortress)||0]),r=Math.min.apply(null,a),n=Math.max.apply(null,a),s=n-r||1,l=e=>t.map((t,n)=>{const a=12+n*(476/(t.length-1)),l=104-((Number(t[e])||0)-r)/s*82;return a.toFixed(1)+","+l.toFixed(1)}).join(" ");
  return'<div class="pn-treasury-trend"><svg viewBox="0 0 500 118" role="img" aria-label="Hoard and fortress trend"><polyline class="liquid" points="'+l("liquid")+'"></polyline><polyline class="fortress" points="'+l("fortress")+'"></polyline></svg><div><span class="liquid">HOARD</span><span class="fortress">FORTRESS</span><small>'+escHtml(t[0].date||"")+" → "+escHtml(t[t.length-1].date||"")+"</small></div></div>"}
function pnTreasuryHistory(e){
  const t=e.snapshots||[],last=t.slice(-1)[0],prev=t.slice(-2,-1)[0],delta=last&&prev?last.fortress-prev.fortress:null,floorAmt=PN_WC_SAFETY_FLOOR;
  const entries=t.slice().reverse().map(s=>{
    const tone=pnTreasuryFloor(s.fortress,floorAmt),surplus=s.fortress-floorAmt,pos=surplus>=0;
    return'<div class="pn-wc-chronicle-entry '+tone.tone+'"><span class="pn-wc-chronicle-date">'+fmtDate(s.date).toUpperCase()+" · "+escHtml(s.label||"")+'</span><b>'+pnTreasuryMoney(s.fortress)+'</b><span class="pn-wc-chronicle-status '+tone.tone+'">'+tone.label+'</span>'+(floorAmt>0?'<em class="'+(pos?"pos":"neg")+'">'+(pos?"+":"−")+pnTreasuryMoney(Math.abs(surplus))+" "+(pos?"ABOVE FLOOR":"BELOW FLOOR")+'</em>':'<em></em>')+'</div>'
  }).join("");
  return'<details class="panel pn-treasury-history"><summary><b>CHRONICLE OF THE HOARD</b><span>'+t.length+' reckoning'+(1===t.length?'':'s')+(null===delta?'':' · <em class="'+(delta<0?"neg":"pos")+'">'+(delta<0?'LOSS ':'GAIN ')+pnTreasuryMoney(delta)+'</em>')+'</span></summary><div class="panel-body">'+pnTreasuryTrend(t)+'<div class="pn-wc-chronicle-list">'+(entries||'<div class="pn-treasury-empty">No reckonings recorded yet.</div>')+'</div></div></details>'
}
function pnTreasuryFlowMeta(f){const m={SALE:"Component Sold",ACQUISITION:"Armory Acquisition",SHIPPING_IN:"Supply Line — Inbound",SHIPPING_OUT:"Supply Line — Outbound"};return m[f.kind]||f.kind}
function pnTreasuryFlowGroup(f){if("SALE"===f.kind)return"SALES";if(["ACQUISITION","SHIPPING_IN","SHIPPING_OUT"].includes(f.kind))return"SPENDING";if((Number(f.signedDelta)||0)>0)return"INCOME";return"ADJUSTMENTS"}
function pnTreasuryActivityRows(e){
  const filter=state.treasuryFlowFilter||"ALL",limit=state.treasuryLedgerExpanded?50:5;
  const rows=(e.flows||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""))).filter(f=>"ALL"===filter||pnTreasuryFlowGroup(f)===filter).slice(0,limit);
  if(!rows.length)return'<div class="pn-treasury-empty">The ledger is empty — sales, acquisitions and shipping will post here automatically as they happen.</div>';
  return rows.map(f=>{
    const pos=(Number(f.signedDelta)||0)>=0,meta=pnTreasuryFlowMeta(f),reason=f.note&&f.note.toLowerCase()!==meta.toLowerCase()?f.note:"";
    return'<div class="pn-wc-ledger-row '+(pos?"is-in":"is-out")+'"><span class="pn-wc-ledger-date">'+fmtDate(String(f.updatedAt||f.createdAt||"").slice(0,10),"short")+'</span><span class="pn-wc-ledger-event">'+escHtml(meta)+(reason?'<em>'+escHtml(reason)+"</em>":"")+'</span><b class="pn-wc-ledger-amount">'+(pos?"+":"−")+money(Math.abs(Number(f.amount)||0),f.currency||"RSD")+'</b></div>'
  }).join("")
}
function pnTreasuryActivityPanel(e){const flows=e.flows||[],n=flows.length;if(!n)return'<section class="panel pn-treasury-activity"><div class="panel-head"><h2>War Chest Ledger</h2><span>NO MOVEMENTS</span></div></section>';const filter=state.treasuryFlowFilter||"ALL",groups=Array.from(new Set(flows.map(pnTreasuryFlowGroup))),filters=["ALL"].concat(["INCOME","SPENDING","SALES","ADJUSTMENTS"].filter(x=>groups.includes(x)));return'<section class="panel pn-treasury-activity"><div class="panel-head"><h2>War Chest Ledger</h2><span>'+n+" MOVEMENT"+(1===n?"":"S")+'</span></div><div class="pn-wc-ledger-tools">'+filters.map(x=>'<button type="button" class="'+(filter===x?'is-active':'')+'" data-treasury-flow-filter="'+x+'">'+x+'</button>').join("")+'</div><div class="panel-body">'+pnTreasuryActivityRows(e)+'</div>'+(n>5?'<button type="button" class="pn-wc-ledger-more" data-treasury-ledger-toggle>'+(state.treasuryLedgerExpanded?'SHOW LATEST FIVE':'VIEW FULL LEDGER')+'</button>':'')+'</section>'}
function renderTreasury(){
  const e=pnTreasuryData(),t=pnTreasuryCalculate(e),a=pnTreasuryFloor(t.fortress),r=pnTreasuryNewestIncome(e.incomes);
  const meta='<div class="pn-treasury-strip"><span>LAST RECOUNTED <b>'+pnTreasuryLastRecount(e)+'</b></span></div>';
  return pageHeader("War Chest","Private reserves · isolated from Shop funds",'<button type="button" class="btn btn-primary pn-wc-btn" data-treasury-new>RECOUNT THE HOARD</button>')+'<div class="content pn-treasury">'+meta+'<div class="pn-treasury-grid">'+pnTreasuryHero(t,e,a)+'</div>'+pnTreasuryCrossingAlert(e)+pnTreasurySourceCards(e)+pnTreasuryMovements(e,t,r)+pnTreasurySurplusProtocol(t)+pnTreasuryActivityPanel(e)+pnTreasuryHistory(e)+(state.treasuryDraft?pnTreasuryEditor():"")+'</div>'
}

ROUTES.splice(1,0,{key:"treasury",label:"WAR CHEST",nix:"02",render:renderTreasury});

(function(){
  const style=document.createElement("style");style.textContent=`
  body:has(.pn-treasury){--wc-bg:#0d0a10;--wc-panel:#17131b;--wc-panel-2:#1e1720;--wc-border:#3a2c34;--wc-border-strong:#54394a;--wc-metal:#726a78;--wc-text:#efe9ee;--wc-text-mute:#9a8f9b;--wc-violet:#8a68a0;--wc-violet-dim:#4a3758;--wc-burgundy:#6d2230;--wc-burgundy-dim:#3c1620;--wc-red:#c23f47;--wc-bronze:#a3813f;--wc-gold:#c7a13a;--wc-silver:#cdd0d6;--wc-violetblue:#6b78a0;--wc-amber:#b3822f;--wc-rust:#a15a4e;--wc-blood:#4c151b;--wc-iron:#2a2529;--wc-iron-lit:#584f57;--wc-glow-gold:rgba(199,161,58,.16);--wc-glow-amber:rgba(179,130,47,.18);--wc-glow-red:rgba(194,63,71,.22);--wc-glow-violet:rgba(138,104,160,.18);--wc-green:#5c8f52;--wc-green-lit:#8fc17d;--wc-green-dim:#2f4c2a;--wc-savings-blood:#a6202d;--wc-savings-yellow:#d0aa32;--wc-savings-green:#57985c}
  body:has(.pn-treasury) .topbar{background:linear-gradient(180deg,rgba(109,34,48,.12),transparent 70%),var(--wc-panel);border-bottom:1px solid var(--wc-border-strong)}
  body:has(.pn-treasury) .topbar h1{letter-spacing:.03em;text-shadow:0 0 20px var(--wc-glow-violet)}
  body:has(.pn-treasury) .topbar .sub{color:var(--wc-text-mute)}
  .btn.pn-wc-btn{position:relative;background:linear-gradient(180deg,var(--wc-red),var(--wc-blood));border:2px solid var(--wc-iron);color:var(--wc-text);clip-path:polygon(14px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 14px),calc(100% - 14px) 100%,5px 100%,0 calc(100% - 5px),0 14px);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 -10px 16px -9px rgba(0,0,0,.55),0 4px 10px -4px rgba(0,0,0,.6);text-shadow:0 1px 2px rgba(0,0,0,.55);transition:box-shadow .18s,border-color .18s,background .18s}
  .btn.pn-wc-btn:hover{border-color:var(--wc-iron-lit);background:linear-gradient(180deg,#d3555d,var(--wc-red));box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -10px 16px -9px rgba(0,0,0,.55),0 6px 18px -4px rgba(194,63,71,.5);color:var(--wc-text)}
  .pn-treasury{padding-top:14px;background:radial-gradient(ellipse 60% 40% at 12% 0%,var(--wc-glow-violet),transparent 60%),radial-gradient(ellipse 50% 40% at 100% 100%,rgba(109,34,48,.10),transparent 60%),repeating-linear-gradient(135deg,rgba(255,255,255,.012) 0 2px,transparent 2px 26px),var(--wc-bg);margin:-14px -0px 0;padding:14px 0 18px}
  .pn-wc-glyph{width:12px;height:12px;display:inline-block;vertical-align:-2px;margin-right:5px;flex:none;color:var(--wc-metal)}
  .pn-treasury-strip{display:flex;align-items:center;gap:14px;padding:9px 13px;border:1px solid var(--wc-border);background:var(--wc-panel);font-family:var(--mono);font-size:11px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
  .pn-treasury-strip span{color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.08em}.pn-treasury-strip b{font-size:13px;color:var(--wc-text);font-variant-numeric:tabular-nums}.pn-treasury-strip small{margin-left:auto;color:var(--wc-text-mute)}
  .pn-treasury-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
  .pn-treasury-card{min-height:86px;padding:12px 13px;border:1px solid var(--wc-border);border-left:3px solid var(--wc-border-strong);background:var(--wc-panel);display:flex;flex-direction:column;justify-content:center;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
  .pn-treasury-card span{font-family:var(--mono);font-size:11px;color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.06em}.pn-treasury-card small{font-family:var(--mono);font-size:10px;color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.06em}
  .pn-treasury-card>span:first-child{display:inline-flex;align-items:center}
  .pn-treasury-card strong{font:800 21px/1.2 var(--mono);color:var(--wc-text);margin:5px 0;font-variant-numeric:tabular-nums}
  .pn-treasury-card.is-hoard strong{color:var(--wc-silver)}
  .pn-treasury-card.is-hoard{border-left-color:var(--wc-metal)}
  .pn-treasury-card.is-hoard .pn-wc-glyph{color:var(--wc-silver)}
  .pn-treasury-card.is-projected{grid-column:1/-1}
  .pn-treasury-card.is-dues{border-left-color:var(--wc-amber)}.pn-treasury-card.is-dues strong{color:var(--wc-amber)}.pn-treasury-card.is-dues .pn-wc-glyph{color:var(--wc-amber)}
  .pn-treasury-card.is-spoils{border-left-color:var(--wc-violetblue)}.pn-treasury-card.is-spoils strong{color:var(--wc-violetblue)}.pn-treasury-card.is-spoils .pn-wc-glyph{color:var(--wc-violetblue)}
  .pn-treasury-card.is-tribute{border-left-color:var(--wc-bronze)}.pn-treasury-card.is-tribute strong{color:var(--wc-bronze)}.pn-treasury-card.is-tribute .pn-wc-glyph{color:var(--wc-bronze)}
  .pn-treasury-card.is-projected{border-left-color:var(--wc-violet)}.pn-treasury-card.is-projected strong{color:var(--wc-violet)}.pn-treasury-card.is-projected .pn-wc-glyph{color:var(--wc-violet)}
  .pn-treasury-card.is-zero{opacity:.55}.pn-treasury-card.is-zero strong{color:var(--wc-text-mute)}.pn-treasury-card.is-zero{border-left-color:var(--wc-border)}
  .pn-treasury-card.is-fortress{grid-column:1/-1;min-height:126px;padding:20px 24px;background:linear-gradient(160deg,var(--wc-panel-2),var(--wc-panel))}
  .pn-treasury-card.is-fortress strong{font-size:36px;margin:10px 0 12px}
  .pn-wc-hero-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pn-wc-hero-eyebrow{display:inline-flex;align-items:center;font:11px var(--mono);letter-spacing:.1em;color:var(--wc-text-mute);text-transform:uppercase}.pn-wc-hero-eyebrow .pn-wc-glyph{color:var(--wc-violet)}
  .pn-wc-hero-status{font:800 12px var(--mono);letter-spacing:.06em}
  .pn-wc-hero-status.good{color:var(--wc-savings-green)}.pn-wc-hero-status.near{color:var(--wc-savings-yellow)}.pn-wc-hero-status.danger{color:var(--wc-savings-blood)}
  .pn-wc-gauge{margin-top:2px}
  .pn-wc-gauge-track{position:relative;height:18px;margin-bottom:21px;border-radius:3px;background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.32));border:1px solid var(--wc-border-strong);box-shadow:inset 0 2px 5px rgba(0,0,0,.65),inset 0 -1px 0 rgba(255,255,255,.04)}
  .pn-wc-gauge-fill{position:absolute;left:0;top:0;bottom:0;background-repeat:no-repeat;background-position:0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 -7px 11px -6px rgba(0,0,0,.55);transition:width .35s ease}
  .pn-wc-gauge-fill::after{content:"";position:absolute;left:0;right:0;top:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,0))}
  .pn-wc-gauge-floor{position:absolute;top:-5px;bottom:-5px;width:3px;background:var(--wc-text);opacity:.85;box-shadow:0 0 3px rgba(0,0,0,.7)}
  .pn-wc-gauge-floor::before{content:"";position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--wc-text);opacity:.9}
  .pn-wc-gauge-target{position:absolute;top:0;bottom:0;width:2px;background:var(--wc-savings-green);box-shadow:0 0 7px rgba(87,152,92,.55)}
  .pn-wc-gauge-floor span,.pn-wc-gauge-target span{position:absolute;top:25px;left:50%;transform:translateX(-50%);font:800 10px var(--mono);letter-spacing:.03em;white-space:nowrap}.pn-wc-gauge-floor span{color:var(--wc-savings-yellow)}.pn-wc-gauge-target span{color:var(--wc-savings-green)}
  .pn-wc-reserve-summary{display:flex;align-items:center;flex-wrap:wrap;gap:8px 18px;margin-top:8px;padding-top:9px;border-top:1px solid var(--wc-border);font:11px var(--mono);letter-spacing:.04em;color:var(--wc-text-mute)}.pn-wc-reserve-summary span{white-space:nowrap}.pn-wc-reserve-summary b{color:var(--wc-silver);font-size:12px;font-variant-numeric:tabular-nums}.pn-wc-reserve-summary .gate{margin-right:auto;font-weight:800}.pn-wc-hero.good .gate{color:var(--wc-savings-green)}.pn-wc-hero.near .gate{color:var(--wc-savings-yellow)}.pn-wc-hero.danger .gate{color:var(--wc-savings-blood)}
  .pn-treasury-card.is-fortress.good{box-shadow:0 0 24px -8px var(--wc-glow-gold),inset 0 1px 0 rgba(255,255,255,.03)}
  .pn-treasury-card.is-fortress.near{box-shadow:0 0 24px -8px var(--wc-glow-amber),inset 0 1px 0 rgba(255,255,255,.03)}
  .pn-treasury-card.is-fortress.danger{box-shadow:0 0 26px -6px var(--wc-glow-red),inset 0 1px 0 rgba(255,255,255,.03)}
  .pn-treasury-prompt{display:flex;gap:14px;align-items:center;padding:13px;border:1px dashed var(--wc-border);font-family:var(--mono);font-size:11px;color:var(--wc-text-mute)}.pn-treasury-prompt b{color:var(--wc-violet)}
  .pn-treasury-activity{margin-top:10px}
  .pn-wc-ledger-row{display:grid;grid-template-columns:60px 1fr auto;gap:10px;align-items:baseline;padding:8px 14px;border-top:1px solid var(--wc-border);font:11px var(--mono)}
  .pn-wc-ledger-row:first-child{border-top:0}
  .pn-wc-ledger-date{color:var(--wc-text-mute);white-space:nowrap}
  .pn-wc-ledger-event{color:var(--wc-text);text-transform:uppercase;letter-spacing:.03em}
  .pn-wc-ledger-event em{display:block;font-style:normal;text-transform:none;color:var(--wc-text-mute);margin-top:1px;letter-spacing:0}
  .pn-wc-ledger-amount{font-variant-numeric:tabular-nums;min-width:90px;text-align:right}
  .pn-wc-ledger-row.is-in .pn-wc-ledger-amount{color:var(--wc-green-lit)}.pn-wc-ledger-row.is-out .pn-wc-ledger-amount{color:var(--wc-red)}
  .pn-treasury-editor{margin-top:10px}.pn-treasury-settings{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.pn-treasury-editor label{display:flex;flex-direction:column;gap:5px}.pn-treasury-editor label>span{font-family:var(--mono);font-size:10px;color:var(--wc-text-mute);text-transform:uppercase}.pn-treasury-editor input,.pn-treasury-editor select{width:100%;min-width:0;height:33px}.pn-treasury-fx-note{margin:7px 0 0;color:var(--wc-text-mute);font:10px var(--mono)}
  .pn-treasury-edit-section{margin-top:13px;padding-top:11px;border-top:1px solid var(--wc-border)}.pn-treasury-edit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.pn-treasury-edit-head h3{margin:0;color:var(--wc-text);font:800 12px var(--display);text-transform:uppercase}.pn-treasury-edit-head p{margin:3px 0 0;color:var(--wc-text-mute);font:10px var(--mono)}.pn-treasury-row{display:grid;gap:7px;align-items:end;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--wc-border) 55%,transparent)}.pn-treasury-row.balance{grid-template-columns:1fr .55fr .5fr .4fr 1fr .55fr 40px}.pn-treasury-row.obligation{grid-template-columns:1fr .5fr .45fr .55fr .65fr .65fr .4fr .85fr 28px}.pn-treasury-row.pending{grid-template-columns:1fr .5fr .45fr .7fr .65fr .65fr .45fr .85fr 28px}.pn-treasury-row.income{grid-template-columns:1.1fr .6fr .5fr .8fr .7fr 1fr .5fr 28px}.pn-check{align-items:flex-start}.pn-check input{width:18px;height:18px;margin:7px 0}.pn-treasury-updated{height:33px;display:flex;flex-direction:column;justify-content:center}.pn-treasury-updated span{font:10px var(--mono);color:var(--wc-text-mute);text-transform:uppercase}.pn-treasury-updated b{font:10px var(--mono);color:var(--wc-text)}.pn-treasury-required{height:33px;display:flex;align-items:center;justify-content:center;color:var(--wc-violet);font:800 10px var(--mono);border:1px solid var(--wc-violet)}.pn-treasury-remove{height:33px;border:1px solid var(--wc-burgundy-dim);background:transparent;color:var(--wc-red);cursor:pointer;font-size:18px}.pn-treasury-empty{padding:13px;border:1px dashed var(--wc-border);color:var(--wc-text-mute);font:10px var(--mono)}.pn-treasury-savebar{text-align:right;margin-top:13px}
  .pn-treasury-history{margin-top:10px}.pn-treasury-history>summary{display:flex;justify-content:space-between;cursor:pointer;padding:12px 14px;color:var(--wc-text);font:11px var(--mono);list-style:none}.pn-treasury-history>summary span{color:var(--wc-text-mute)}.pn-treasury-history>summary span em{font-style:normal}.pn-treasury-history>summary span em.pos{color:var(--wc-green-lit)}.pn-treasury-history>summary span em.neg{color:var(--wc-red)}.pn-treasury-history>summary::-webkit-details-marker{display:none}
  .pn-treasury-trend svg{display:block;width:100%;height:118px;border:1px solid var(--wc-border);background:var(--wc-panel)}.pn-treasury-trend polyline{fill:none;stroke-width:2}.pn-treasury-trend polyline.liquid{stroke:var(--wc-violet)}.pn-treasury-trend polyline.fortress{stroke:var(--wc-gold)}.pn-treasury-trend>div{display:flex;gap:12px;margin-top:5px;font:10px var(--mono)}.pn-treasury-trend span.liquid{color:var(--wc-violet)}.pn-treasury-trend span.fortress{color:var(--wc-gold)}.pn-treasury-trend small{margin-left:auto;color:var(--wc-text-mute)}
  .pn-wc-chronicle-list{margin-top:10px;position:relative;padding-left:18px;border-left:1px solid var(--wc-burgundy-dim)}
  .pn-wc-chronicle-entry{position:relative;display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:baseline;padding:8px 0 8px 14px;font:11px var(--mono)}
  .pn-wc-chronicle-entry::before{content:"";position:absolute;left:-23px;top:12px;width:6px;height:6px;border-radius:50%;background:var(--wc-violet);box-shadow:0 0 0 2px var(--wc-bg)}
  .pn-wc-chronicle-entry.near::before{background:var(--wc-amber)}.pn-wc-chronicle-entry.danger::before{background:var(--wc-red)}
  .pn-wc-chronicle-date{color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
  .pn-wc-chronicle-entry b{color:var(--wc-text);font-size:13px;font-variant-numeric:tabular-nums}
  .pn-wc-chronicle-status{font-weight:800;letter-spacing:.05em;white-space:nowrap}
  .pn-wc-chronicle-status.good{color:var(--wc-gold)}.pn-wc-chronicle-status.near{color:var(--wc-amber)}.pn-wc-chronicle-status.danger{color:var(--wc-red)}
  .pn-wc-chronicle-entry em{font-style:normal;color:var(--wc-text-mute);white-space:nowrap}.pn-wc-chronicle-entry em.pos{color:var(--wc-green-lit)}.pn-wc-chronicle-entry em.neg{color:var(--wc-red)}
  .pn-treasury-strip{padding:7px 12px;font-size:10px}.pn-treasury-strip span{display:flex;align-items:center;gap:6px}.pn-treasury-strip span b{font-size:11px;color:var(--wc-silver)}
  .pn-treasury-grid{grid-template-columns:1fr;margin:8px 0}.pn-treasury-card.is-fortress{min-height:116px}.pn-treasury-card.is-fortress strong{color:var(--wc-silver)}
  .pn-wc-gauge-floor{background:var(--wc-gold);box-shadow:0 0 8px var(--wc-glow-gold)}.pn-wc-gauge-floor::before{border-top-color:var(--wc-gold)}
  .pn-wc-section-head{min-height:40px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--wc-border);background:linear-gradient(90deg,rgba(255,255,255,.025),transparent)}.pn-wc-section-head>div{display:flex;align-items:baseline;gap:10px}.pn-wc-section-head span,.pn-wc-section-head small{font:10px var(--mono);letter-spacing:.08em;color:var(--wc-text-mute)}.pn-wc-section-head b{font:800 13px var(--display);letter-spacing:.06em;color:var(--wc-silver)}
  .pn-wc-sources{margin:8px 0;border:1px solid var(--wc-border);background:var(--wc-panel)}.pn-wc-source-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}.pn-wc-source{min-width:0;padding:11px 12px;display:grid;grid-template-columns:50px 1fr;gap:10px;align-items:center;border-left:1px solid var(--wc-border)}.pn-wc-source:first-child{border-left:0}.pn-wc-source.is-muted{opacity:.48}.pn-wc-source-mark{width:50px;height:34px;display:flex;align-items:center;justify-content:center;padding:5px;border:1px solid var(--wc-border);background:#0c0a0e}.pn-wc-source-mark img{display:block;max-width:100%;max-height:100%;object-fit:contain}.pn-wc-source[data-wc-source="PREPLY"] .pn-wc-source-mark img{filter:invert(1)}.pn-wc-source>div:last-child{min-width:0;display:flex;flex-direction:column}.pn-wc-source span{font:10px var(--mono);letter-spacing:.07em;text-transform:uppercase;color:var(--wc-text-mute)}.pn-wc-source strong{margin:3px 0;font:800 16px var(--mono);font-variant-numeric:tabular-nums;color:var(--wc-silver);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pn-wc-source small{font:10px var(--mono);color:var(--wc-text-mute);white-space:nowrap}
  .pn-wc-movements{margin:8px 0}.pn-wc-movement-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.pn-wc-movement-grid .pn-treasury-card{min-height:78px;grid-column:auto;border-width:0 0 0 1px;clip-path:none;background:transparent}.pn-wc-movement-grid .pn-treasury-card:first-child{border-left:0}.pn-wc-movement-grid .pn-treasury-card strong{color:var(--wc-silver)}.pn-wc-movement-grid .is-projected strong,.pn-wc-movement-grid .is-tribute strong{color:var(--wc-gold)}.pn-wc-movement-grid .is-dues:not(.is-zero) strong{color:var(--wc-red)}
  .pn-wc-crossing-alert{display:grid;grid-template-columns:auto auto 1fr auto;gap:12px;align-items:center;margin:8px 0;padding:8px 12px;border:1px solid color-mix(in srgb,var(--wc-savings-blood) 65%,var(--wc-border));border-left:3px solid var(--wc-savings-blood);background:rgba(96,14,24,.16);font:10px var(--mono);letter-spacing:.05em}.pn-wc-crossing-alert b{color:var(--wc-savings-blood)}.pn-wc-crossing-alert span{color:var(--wc-silver)}.pn-wc-crossing-alert small{color:var(--wc-text-mute)}
  .pn-wc-surplus-protocol{display:flex;align-items:center;flex-wrap:wrap;gap:8px 18px;margin:8px 0;padding:10px 12px;font:11px var(--mono);letter-spacing:.04em;color:var(--wc-text-mute)}.pn-wc-surplus-protocol b{margin-right:auto;color:var(--wc-savings-green);font-size:12px}.pn-wc-surplus-protocol small{font-size:10px;color:var(--wc-text-mute)}
  .pn-wc-ledger-tools{display:flex;gap:5px;padding:7px 12px;border-bottom:1px solid var(--wc-border)}.pn-wc-ledger-tools button,.pn-wc-ledger-more{border:1px solid var(--wc-border);background:transparent;color:var(--wc-text-mute);font:800 10px var(--mono);letter-spacing:.05em;cursor:pointer}.pn-wc-ledger-tools button{padding:5px 8px}.pn-wc-ledger-tools button:hover,.pn-wc-ledger-tools button.is-active{border-color:var(--wc-metal);color:var(--wc-silver);background:rgba(255,255,255,.035)}.pn-wc-ledger-more{display:block;width:100%;padding:8px;border-width:1px 0 0}.pn-wc-ledger-more:hover{color:var(--wc-gold)}
  .pn-wc-drawer-shell{position:fixed;inset:0;z-index:200;display:flex;justify-content:flex-end}.pn-wc-drawer-scrim{position:absolute;inset:0;border:0;background:rgba(3,2,4,.76);backdrop-filter:blur(2px);cursor:default}.pn-treasury-editor{position:relative;z-index:1;width:min(1180px,88vw);height:100%;margin:0;overflow:auto;border-width:0 0 0 1px;box-shadow:-20px 0 50px rgba(0,0,0,.55)}.pn-treasury-editor>.panel-head{position:sticky;top:0;z-index:2;background:var(--wc-panel)}.pn-treasury-settings{grid-template-columns:repeat(4,minmax(0,1fr))}
  @media(max-width:1180px){.pn-treasury-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-treasury-settings{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-treasury-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pn-treasury-remove{grid-column:2}.pn-treasury-strip small{display:none}}
  @media(max-width:1180px){.pn-treasury-grid{grid-template-columns:1fr}.pn-wc-source-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pn-wc-source:nth-child(4){border-left:0;border-top:1px solid var(--wc-border)}.pn-wc-source:nth-child(5){border-top:1px solid var(--wc-border)}.pn-wc-movement-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-wc-movement-grid .pn-treasury-card:nth-child(3){border-left:0;border-top:1px solid var(--wc-border)}.pn-wc-movement-grid .pn-treasury-card:nth-child(4){border-top:1px solid var(--wc-border)}}
  @media(max-width:760px){.pn-treasury-grid{grid-template-columns:1fr}.pn-treasury-strip{flex-wrap:wrap}.pn-wc-source-grid,.pn-wc-movement-grid{grid-template-columns:1fr}.pn-wc-source,.pn-wc-source:nth-child(n),.pn-wc-movement-grid .pn-treasury-card:nth-child(n){border-left:0;border-top:1px solid var(--wc-border)}.pn-wc-source:first-child,.pn-wc-movement-grid .pn-treasury-card:first-child{border-top:0}.pn-wc-reserve-summary,.pn-wc-surplus-protocol{align-items:flex-start}.pn-wc-reserve-summary .gate,.pn-wc-surplus-protocol b{width:100%;margin-right:0}.pn-wc-crossing-alert{grid-template-columns:1fr;gap:4px}.pn-wc-section-head{align-items:flex-start}.pn-wc-section-head>div{display:block}.pn-wc-section-head b{display:block;margin-top:3px}.pn-wc-ledger-tools{flex-wrap:wrap}.pn-treasury-editor{width:100vw}.pn-treasury-settings{grid-template-columns:1fr}.pn-treasury-row{grid-template-columns:1fr!important}.pn-treasury-remove{grid-column:1}.pn-wc-chronicle-entry{grid-template-columns:1fr}.pn-wc-ledger-row{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  document.addEventListener("DOMContentLoaded",()=>{
    const root=document.getElementById("root");if(!root)return;
    const update=e=>{const el=e.target.closest&&e.target.closest("[data-treasury-path]");if(!el||!state.treasuryDraft)return;const path=el.dataset.treasuryPath,value="checkbox"===el.type?el.checked:el.hasAttribute("data-treasury-number")?Math.max(0,Number(el.value)||0):el.value;if("snapshotLabel"===path)state.treasurySnapshotLabel=value;else if("snapshotNote"===path)state.treasurySnapshotNote=value;else setDeepOn(state.treasuryDraft,path,value)};
    root.addEventListener("input",update);root.addEventListener("change",update);
    root.addEventListener("click",e=>{
      const flowFilter=e.target.closest("[data-treasury-flow-filter]");if(flowFilter){state.treasuryFlowFilter=flowFilter.dataset.treasuryFlowFilter;state.treasuryLedgerExpanded=!1;render();return}
      if(e.target.closest("[data-treasury-ledger-toggle]")){state.treasuryLedgerExpanded=!state.treasuryLedgerExpanded;render();return}
      const fresh=e.target.closest("[data-treasury-new]");if(fresh){state.treasuryDraft=pnTreasuryClone();state.treasuryDraftBase=pnTreasuryDraftBase(state.treasuryDraft);state.treasurySnapshotLabel="MID_MONTH";state.treasurySnapshotNote="";render();return}
      if(e.target.closest("[data-treasury-cancel]")){state.treasuryDraft=null;render();return}
      const add=e.target.closest("[data-treasury-add]");if(add&&state.treasuryDraft){const k=add.dataset.treasuryAdd,d={balances:{id:pnTreasuryId(),label:"",amount:0,currency:"EUR",include:!0,note:"",updatedAt:todayISO()},obligations:{id:pnTreasuryId(),name:"",amount:0,currency:"EUR",status:"PENDING",category:"",dueDate:"",recurring:!1,note:""},pendingAssets:{id:pnTreasuryId(),name:"",amount:0,currency:"EUR",type:"HARDWARE_SALE",confidence:"MEDIUM",expectedDate:"",converted:!1,note:""},incomes:{id:pnTreasuryId(),source:"",amount:0,currency:"EUR",expectedDate:"",confidence:"HIGH",recurring:!1,note:""}};state.treasuryDraft[k].push(d[k]);render();return}
      const rem=e.target.closest("[data-treasury-remove]");if(rem&&state.treasuryDraft){state.treasuryDraft[rem.dataset.treasuryRemove].splice(Number(rem.dataset.treasuryIndex),1);render();return}
      if(e.target.closest("[data-treasury-save]")&&state.treasuryDraft){const ledger=Store.load(),saved=normalizeTreasury(pnTreasuryRebaseDraft(state.treasuryDraft,state.treasuryDraftBase,pnTreasuryData())),calc=pnTreasuryCalculate(saved),stamp=nowISO(),label=(state.treasurySnapshotLabel||"MID_MONTH").replace(/_/g," ");saved.balances.forEach(e=>e.updatedAt=stamp);saved.snapshots.push({id:pnTreasuryId(),timestamp:stamp,date:todayISO(),label,note:state.treasurySnapshotNote||"",liquid:calc.liquid,fortress:calc.fortress,pending:calc.pending,projectedSalary:calc.income,afterPending:calc.afterPending,afterSalary:calc.afterSalary});ledger.treasury=saved;Store.persist();state.treasuryDraft=null;state.treasurySnapshotNote="";render();return}
    });
    document.addEventListener("keydown",e=>{if("Escape"===e.key&&state.treasuryDraft){state.treasuryDraft=null;render()}})
  })
})();
