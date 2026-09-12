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
function pnTreasuryConfidence(e){return String(e||"MEDIUM").toUpperCase()}
function pnTreasuryZero(e){return Math.abs(Number(e)||0)<.005}
function pnTreasuryFloor(e,t){const a=Number(t)||0;return a<=0?{tone:"good",label:"NO FLOOR SET"}:e>=a?{tone:"good",label:"FORTRESS HOLDS"}:e>=.85*a?{tone:"near",label:"FORTRESS STRAINED"}:{tone:"danger",label:"FORTRESS BREACHED"}}
function pnTreasuryDays(e){if(!e)return null;const t=new Date(todayISO()+"T00:00:00"),a=new Date(e+"T00:00:00");return isNaN(a)?null:Math.ceil((a-t)/864e5)}
function pnTreasuryNewestIncome(e){const t=e||[];return t.filter(e=>e.expectedDate).slice().sort((e,t)=>e.expectedDate.localeCompare(t.expectedDate))[0]||t[0]||null}
function pnTreasuryCoreDraft(e){
  const t=normalizeTreasury(e),a=t.balances.slice(),r=[];
  PN_TREASURY_CORE_BALANCES.forEach(e=>{let t=a.find(t=>t.sourceKey===e.sourceKey);t||(t=a.find(t=>String(t.label||"").trim().toLowerCase()===e.label.toLowerCase()));t?t.sourceKey=e.sourceKey:t={id:pnTreasuryId(),sourceKey:e.sourceKey,label:e.label,amount:0,currency:e.currency,include:!0,note:"",updatedAt:todayISO()};r.push(t)});
  const n=new Set(PN_TREASURY_CORE_BALANCES.map(e=>e.sourceKey)),s=new Set(PN_TREASURY_CORE_BALANCES.map(e=>e.label.toLowerCase()));t.balances=r.concat(a.filter(e=>!r.includes(e)&&!n.has(e.sourceKey)&&!s.has(String(e.label||"").trim().toLowerCase())));return t
}
function pnTreasuryClone(){return pnTreasuryCoreDraft(JSON.parse(JSON.stringify(pnTreasuryData())))}
function pnTreasuryCard(e,t,a,r,g){return'<div class="pn-treasury-card '+(r||'')+'"><span>'+(g&&PN_WC_GLYPH[g]||"")+e+'</span><strong>'+t+'</strong>'+(a?'<small>'+a+'</small>':'')+'</div>'}
function pnTreasuryHero(t,e,a){
  const floorAmt=Number(e.settings.fortressFloor)||0,surplus=t.fortress-floorAmt,pos=surplus>=0;
  const maxScale=Math.max(floorAmt*1.4,t.fortress*1.15,floorAmt+1,1);
  const fillPct=Math.max(0,Math.min(100,t.fortress/maxScale*100)),floorPct=floorAmt>0?Math.max(0,Math.min(100,floorAmt/maxScale*100)):null;
  return'<div class="pn-treasury-card pn-wc-hero is-fortress '+a.tone+'">'
    +'<div class="pn-wc-hero-top"><span class="pn-wc-hero-eyebrow">'+PN_WC_GLYPH.fortress+'FORTRESS RESERVE</span><span class="pn-wc-hero-status '+a.tone+'">'+a.label+'</span></div>'
    +'<strong>'+pnTreasuryMoney(t.fortress)+'</strong>'
    +'<div class="pn-wc-gauge"><div class="pn-wc-gauge-track"><div class="pn-wc-gauge-fill '+a.tone+'" style="width:'+fillPct.toFixed(2)+'%"></div>'+(null===floorPct?'':'<div class="pn-wc-gauge-floor" style="left:'+floorPct.toFixed(2)+'%"></div>')+'</div></div>'
    +'<div class="pn-wc-hero-foot"><span>FORTRESS FLOOR <b>'+pnTreasuryMoney(floorAmt)+'</b></span><span class="pn-wc-hero-surplus '+(pos?"pos":"neg")+'">'+(pos?"SURPLUS ":"DEFICIT ")+(pos?"+":"−")+pnTreasuryMoney(Math.abs(surplus))+'</span></div>'
    +'</div>'
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
function pnTreasuryEditor(){const e=state.treasuryDraft,t=e.settings;return'<div class="panel pn-treasury-editor"><div class="panel-head"><h2>Recount The Hoard</h2><div><button type="button" class="btn" data-treasury-cancel>CANCEL</button> <button type="button" class="btn btn-primary pn-wc-btn" data-treasury-save>SEAL THE RECKONING</button></div></div><div class="panel-body"><div class="pn-treasury-settings">'+pnTreasuryInput("USD → EUR",'settings.usdToEur',t.usdToEur,"number")+pnTreasuryInput("RSD → EUR",'settings.rsdToEur',t.rsdToEur,"number")+pnTreasuryInput("Fortress floor (EUR)",'settings.fortressFloor',t.fortressFloor,"number")+pnTreasurySelect("Reckoning label","snapshotLabel",state.treasurySnapshotLabel||"MID_MONTH",["POST_SALARY","POST_SEXODIA","PRE_MOVE","POST_MOVE","MID_MONTH","FINAL_STRETCH","CUSTOM"])+pnTreasuryInput("Reckoning note","snapshotNote",state.treasurySnapshotNote||"")+"</div><p class=\"pn-treasury-fx-note\">Planning rates only · primary display EUR · rates are never fetched live.</p>"+pnTreasurySection("Core balances","balances","Payoneer, Preply, Fiverr and both cash currencies are always ready for every rebalance. Add custom sources only when needed.")+pnTreasurySection("Obligations","obligations","Only pending obligations reduce the fortress.")+pnTreasurySection("Pending / saleable assets","pendingAssets","Potential recovery only; converted rows stop counting here.")+pnTreasurySection("Salary / income projection","incomes","Projected income never enters Current Treasury.")+'<div class="pn-treasury-savebar"><button type="button" class="btn btn-primary pn-wc-btn" data-treasury-save>SEAL THE RECKONING</button></div></div></div>'}
function pnTreasuryTrend(e){
  const t=e.slice(-12);if(t.length<2)return'<div class="pn-treasury-empty">Two reckonings are needed to draw the trend.</div>';
  const a=t.flatMap(e=>[Number(e.liquid)||0,Number(e.fortress)||0]),r=Math.min.apply(null,a),n=Math.max.apply(null,a),s=n-r||1,l=e=>t.map((t,n)=>{const a=12+n*(476/(t.length-1)),l=104-((Number(t[e])||0)-r)/s*82;return a.toFixed(1)+","+l.toFixed(1)}).join(" ");
  return'<div class="pn-treasury-trend"><svg viewBox="0 0 500 118" role="img" aria-label="Hoard and fortress trend"><polyline class="liquid" points="'+l("liquid")+'"></polyline><polyline class="fortress" points="'+l("fortress")+'"></polyline></svg><div><span class="liquid">HOARD</span><span class="fortress">FORTRESS</span><small>'+escHtml(t[0].date||"")+" → "+escHtml(t[t.length-1].date||"")+"</small></div></div>"}
function pnTreasuryCompare(e){if(e.length<2)return"";const t=state.treasuryCompareA||e[e.length-2].id,a=state.treasuryCompareB||e[e.length-1].id,r=e.find(e=>e.id===t)||e[e.length-2],n=e.find(e=>e.id===a)||e[e.length-1],s=(t,a)=>e.map(e=>'<option value="'+e.id+'"'+(e.id===a?' selected':'')+'>'+escHtml(e.date+" · "+e.label)+'</option>').join("");return'<div class="pn-treasury-compare"><label><span>FROM</span><select data-treasury-compare="a">'+s(e,r.id)+'</select></label><label><span>TO</span><select data-treasury-compare="b">'+s(e,n.id)+'</select></label><div><span>HOARD Δ</span><strong>'+pnTreasuryMoney(n.liquid-r.liquid)+'</strong></div><div><span>FORTRESS Δ</span><strong>'+pnTreasuryMoney(n.fortress-r.fortress)+'</strong></div></div>'}
function pnTreasuryHistory(e){
  const t=e.snapshots||[],last=t.slice(-1)[0],prev=t.slice(-2,-1)[0],delta=last&&prev?last.fortress-prev.fortress:null,floorAmt=Number(e.settings.fortressFloor)||0;
  const entries=t.slice().reverse().map(s=>{
    const tone=pnTreasuryFloor(s.fortress,floorAmt),surplus=s.fortress-floorAmt,pos=surplus>=0;
    return'<div class="pn-wc-chronicle-entry '+tone.tone+'"><span class="pn-wc-chronicle-date">'+fmtDate(s.date).toUpperCase()+" · "+escHtml(s.label||"")+'</span><b>'+pnTreasuryMoney(s.fortress)+'</b><span class="pn-wc-chronicle-status '+tone.tone+'">'+tone.label+'</span>'+(floorAmt>0?'<em class="'+(pos?"pos":"neg")+'">'+(pos?"+":"−")+pnTreasuryMoney(Math.abs(surplus))+" "+(pos?"ABOVE FLOOR":"BELOW FLOOR")+'</em>':'<em></em>')+'</div>'
  }).join("");
  return'<details class="panel pn-treasury-history"><summary><b>CHRONICLE OF THE HOARD</b><span>'+t.length+' reckoning'+(1===t.length?'':'s')+(null===delta?'':' · '+(delta<0?'LOSS ':'GAIN ')+pnTreasuryMoney(delta))+'</span></summary><div class="panel-body">'+pnTreasuryTrend(t)+pnTreasuryCompare(t)+'<div class="pn-wc-chronicle-list">'+(entries||'<div class="pn-treasury-empty">No reckonings recorded yet.</div>')+'</div></div></details>'
}
function pnTreasuryFlowMeta(f){const m={SALE:"Component Sold",ACQUISITION:"Armory Acquisition",SHIPPING_IN:"Supply Line — Inbound",SHIPPING_OUT:"Supply Line — Outbound"};return m[f.kind]||f.kind}
function pnTreasuryActivityRows(e){
  const rows=(e.flows||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""))).slice(0,8);
  if(!rows.length)return'<div class="pn-treasury-empty">The ledger is empty — sales, acquisitions and shipping will post here automatically as they happen.</div>';
  return rows.map(f=>{
    const pos=(Number(f.signedDelta)||0)>=0,meta=pnTreasuryFlowMeta(f),reason=f.note&&f.note.toLowerCase()!==meta.toLowerCase()?f.note:"";
    return'<div class="pn-wc-ledger-row '+(pos?"is-in":"is-out")+'"><span class="pn-wc-ledger-date">'+fmtDate(String(f.updatedAt||f.createdAt||"").slice(0,10),"short")+'</span><span class="pn-wc-ledger-event">'+escHtml(meta)+(reason?'<em>'+escHtml(reason)+"</em>":"")+'</span><b class="pn-wc-ledger-amount">'+(pos?"+":"−")+money(Math.abs(Number(f.amount)||0),f.currency||"RSD")+'</b></div>'
  }).join("")
}
function pnTreasuryActivityPanel(e){const n=(e.flows||[]).length;return'<section class="panel pn-treasury-activity"><div class="panel-head"><h2>War Chest Ledger</h2><span>'+n+" recorded flow"+(1===n?"":"s")+'</span></div><div class="panel-body">'+pnTreasuryActivityRows(e)+"</div></section>"}
function renderTreasury(){
  const e=pnTreasuryData(),t=pnTreasuryCalculate(e),a=pnTreasuryFloor(t.fortress,e.settings.fortressFloor),r=pnTreasuryNewestIncome(e.incomes),n=r?pnTreasuryDays(r.expectedDate):null,s=r?(r.source||"Tribute source")+" · "+pnTreasuryConfidence(r.confidence)+(null===n?" · DATE NOT SET":n<0?" · OVERDUE":0===n?" · TODAY":" · "+n+" DAYS"):"No tribute projected";
  const cards=pnTreasuryHero(t,e,a)
    +pnTreasuryCard("Current Hoard",pnTreasuryMoney(t.liquid),e.balances.filter(e=>e.include!==!1).length+" included balance(s)","is-hoard","coin")
    +pnTreasuryCard("Dues Remaining",pnTreasuryMoney(t.obligations),e.obligations.filter(e=>"PAID"!==e.status).length+" pending","is-dues"+(pnTreasuryZero(t.obligations)?" is-zero":""),"chain")
    +pnTreasuryCard("Spoils In Transit",pnTreasuryMoney(t.pending),e.pendingAssets.filter(e=>!e.converted).length+" unconverted","is-spoils"+(pnTreasuryZero(t.pending)?" is-zero":""),"crate")
    +pnTreasuryCard("Hoard After Spoils",pnTreasuryMoney(t.afterPending),"Fortress + spoils","is-after-spoils","rune")
    +pnTreasuryCard("Incoming Tribute",pnTreasuryMoney(t.income),s,"is-tribute"+(pnTreasuryZero(t.income)?" is-zero":""),"crown")
    +pnTreasuryCard("Projected Hoard",pnTreasuryMoney(t.afterSalary),"After spoils + tribute","is-projected","rune");
  return pageHeader("War Chest","Private reserves · isolated from Shop funds",'<button type="button" class="btn btn-primary pn-wc-btn" data-treasury-new>RECOUNT THE HOARD</button>')+'<div class="content pn-treasury"><div class="pn-treasury-strip"><span>EXCHANGE RATES</span><b>USD '+Number(e.settings.usdToEur).toFixed(4)+' EUR</b><b>RSD '+Number(e.settings.rsdToEur).toFixed(5)+' EUR</b><small>Rates set manually · never fetched live</small></div><div class="pn-treasury-grid">'+cards+'</div>'+(state.treasuryDraft?pnTreasuryEditor():'<div class="pn-treasury-prompt"><b>WAR CHEST ACCOUNTED FOR</b><span>Use RECOUNT THE HOARD to update balances, dues, spoils recovery, tribute and log a new reckoning.</span></div>')+pnTreasuryActivityPanel(e)+pnTreasuryHistory(e)+'</div>'
}

ROUTES.splice(1,0,{key:"treasury",label:"TREASURY",nix:"02",render:renderTreasury});

(function(){
  const style=document.createElement("style");style.textContent=`
  body:has(.pn-treasury){--wc-bg:#0d0a10;--wc-panel:#17131b;--wc-panel-2:#1e1720;--wc-border:#3a2c34;--wc-border-strong:#54394a;--wc-metal:#726a78;--wc-text:#efe9ee;--wc-text-mute:#9a8f9b;--wc-violet:#8a68a0;--wc-violet-dim:#4a3758;--wc-burgundy:#6d2230;--wc-burgundy-dim:#3c1620;--wc-red:#c23f47;--wc-bronze:#a3813f;--wc-gold:#c7a13a;--wc-silver:#cdd0d6;--wc-violetblue:#6b78a0;--wc-amber:#b3822f;--wc-rust:#a15a4e;--wc-blood:#4c151b;--wc-glow-gold:rgba(199,161,58,.16);--wc-glow-amber:rgba(179,130,47,.18);--wc-glow-red:rgba(194,63,71,.22);--wc-glow-violet:rgba(138,104,160,.18)}
  body:has(.pn-treasury) .topbar{background:linear-gradient(180deg,rgba(109,34,48,.12),transparent 70%),var(--wc-panel);border-bottom:1px solid var(--wc-border-strong)}
  body:has(.pn-treasury) .topbar h1{letter-spacing:.03em;text-shadow:0 0 20px var(--wc-glow-violet)}
  body:has(.pn-treasury) .topbar .sub{color:var(--wc-text-mute)}
  .btn.pn-wc-btn{position:relative;background:radial-gradient(ellipse 90% 70% at 50% 130%,rgba(194,63,71,.32),transparent 62%),linear-gradient(180deg,#1c1417,#0a080a);border:2px solid var(--wc-blood);color:var(--wc-text);clip-path:polygon(14px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 14px),calc(100% - 14px) 100%,5px 100%,0 calc(100% - 5px),0 14px);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 6px 14px -8px rgba(194,63,71,.35);transition:box-shadow .18s,border-color .18s,background .18s}
  .btn.pn-wc-btn:hover{border-color:var(--wc-red);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 24px -6px rgba(194,63,71,.55);background:radial-gradient(ellipse 90% 70% at 50% 130%,rgba(194,63,71,.5),transparent 62%),linear-gradient(180deg,#211619,#0a080a);color:var(--wc-text)}
  .pn-treasury{padding-top:14px;background:radial-gradient(ellipse 60% 40% at 12% 0%,var(--wc-glow-violet),transparent 60%),radial-gradient(ellipse 50% 40% at 100% 100%,rgba(109,34,48,.10),transparent 60%),repeating-linear-gradient(135deg,rgba(255,255,255,.012) 0 2px,transparent 2px 26px),var(--wc-bg);margin:-14px -0px 0;padding:14px 0 18px}
  .pn-wc-glyph{width:12px;height:12px;display:inline-block;vertical-align:-2px;margin-right:5px;flex:none;color:var(--wc-metal)}
  .pn-treasury-strip{display:flex;align-items:center;gap:14px;padding:9px 13px;border:1px solid var(--wc-border);background:var(--wc-panel);font-family:var(--mono);font-size:11px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
  .pn-treasury-strip span{color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.08em}.pn-treasury-strip b{font-size:13px;color:var(--wc-text);font-variant-numeric:tabular-nums}.pn-treasury-strip small{margin-left:auto;color:var(--wc-text-mute)}
  .pn-treasury-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}
  .pn-treasury-card{min-height:86px;padding:12px 13px;border:1px solid var(--wc-border);border-left:3px solid var(--wc-border-strong);background:var(--wc-panel);display:flex;flex-direction:column;justify-content:center;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
  .pn-treasury-card span,.pn-treasury-card small{font-family:var(--mono);font-size:10px;color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.06em}
  .pn-treasury-card>span:first-child{display:inline-flex;align-items:center}
  .pn-treasury-card strong{font:800 21px/1.2 var(--mono);color:var(--wc-text);margin:5px 0;font-variant-numeric:tabular-nums}
  .pn-treasury-card.is-hoard strong,.pn-treasury-card.is-after-spoils strong{color:var(--wc-silver)}
  .pn-treasury-card.is-hoard{border-left-color:var(--wc-metal)}.pn-treasury-card.is-after-spoils{border-left-color:var(--wc-metal)}
  .pn-treasury-card.is-hoard .pn-wc-glyph,.pn-treasury-card.is-after-spoils .pn-wc-glyph{color:var(--wc-silver)}
  .pn-treasury-card.is-dues{border-left-color:var(--wc-amber)}.pn-treasury-card.is-dues strong{color:var(--wc-amber)}.pn-treasury-card.is-dues .pn-wc-glyph{color:var(--wc-amber)}
  .pn-treasury-card.is-spoils{border-left-color:var(--wc-violetblue)}.pn-treasury-card.is-spoils strong{color:var(--wc-violetblue)}.pn-treasury-card.is-spoils .pn-wc-glyph{color:var(--wc-violetblue)}
  .pn-treasury-card.is-tribute{border-left-color:var(--wc-bronze)}.pn-treasury-card.is-tribute strong{color:var(--wc-bronze)}.pn-treasury-card.is-tribute .pn-wc-glyph{color:var(--wc-bronze)}
  .pn-treasury-card.is-projected{border-left-color:var(--wc-violet)}.pn-treasury-card.is-projected strong{color:var(--wc-violet)}.pn-treasury-card.is-projected .pn-wc-glyph{color:var(--wc-violet)}
  .pn-treasury-card.is-zero{opacity:.55}.pn-treasury-card.is-zero strong{color:var(--wc-text-mute)}.pn-treasury-card.is-zero{border-left-color:var(--wc-border)}
  .pn-treasury-card.is-fortress{grid-column:1/-1;min-height:126px;padding:20px 24px;background:linear-gradient(160deg,var(--wc-panel-2),var(--wc-panel))}
  .pn-treasury-card.is-fortress strong{font-size:36px;margin:10px 0 12px}
  .pn-wc-hero-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pn-wc-hero-eyebrow{display:inline-flex;align-items:center;font:10px var(--mono);letter-spacing:.1em;color:var(--wc-text-mute);text-transform:uppercase}.pn-wc-hero-eyebrow .pn-wc-glyph{color:var(--wc-violet)}
  .pn-wc-hero-status{font:800 11px var(--mono);letter-spacing:.06em}
  .pn-wc-hero-status.good{color:var(--wc-gold)}.pn-wc-hero-status.near{color:var(--wc-amber)}.pn-wc-hero-status.danger{color:var(--wc-red)}
  .pn-wc-gauge-track{position:relative;height:5px;background:var(--wc-bg);border:1px solid var(--wc-border)}
  .pn-wc-gauge-fill{position:absolute;left:0;top:0;bottom:0;background:var(--wc-gold)}.pn-wc-gauge-fill.near{background:var(--wc-amber)}.pn-wc-gauge-fill.danger{background:var(--wc-red)}
  .pn-wc-gauge-floor{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--wc-text);opacity:.65}
  .pn-wc-hero-foot{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;font:10px var(--mono);letter-spacing:.05em;color:var(--wc-text-mute);text-transform:uppercase}
  .pn-wc-hero-foot b{color:var(--wc-text);font-variant-numeric:tabular-nums;font-weight:800}
  .pn-wc-hero-surplus{font-weight:800}.pn-wc-hero-surplus.pos{color:var(--wc-gold)}.pn-wc-hero-surplus.neg{color:var(--wc-red)}
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
  .pn-wc-ledger-row.is-in .pn-wc-ledger-amount{color:var(--wc-gold)}.pn-wc-ledger-row.is-out .pn-wc-ledger-amount{color:var(--wc-rust)}
  .pn-treasury-editor{margin-top:10px}.pn-treasury-settings{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.pn-treasury-editor label,.pn-treasury-compare label{display:flex;flex-direction:column;gap:5px}.pn-treasury-editor label>span,.pn-treasury-compare label>span{font-family:var(--mono);font-size:9px;color:var(--wc-text-mute);text-transform:uppercase}.pn-treasury-editor input,.pn-treasury-editor select,.pn-treasury-compare select{width:100%;min-width:0;height:33px}.pn-treasury-fx-note{margin:7px 0 0;color:var(--wc-text-mute);font:10px var(--mono)}
  .pn-treasury-edit-section{margin-top:13px;padding-top:11px;border-top:1px solid var(--wc-border)}.pn-treasury-edit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.pn-treasury-edit-head h3{margin:0;color:var(--wc-text);font:800 12px var(--display);text-transform:uppercase}.pn-treasury-edit-head p{margin:3px 0 0;color:var(--wc-text-mute);font:10px var(--mono)}.pn-treasury-row{display:grid;gap:7px;align-items:end;padding:7px 0;border-top:1px solid color-mix(in srgb,var(--wc-border) 55%,transparent)}.pn-treasury-row.balance{grid-template-columns:1fr .55fr .5fr .4fr 1fr .55fr 40px}.pn-treasury-row.obligation{grid-template-columns:1fr .5fr .45fr .55fr .65fr .65fr .4fr .85fr 28px}.pn-treasury-row.pending{grid-template-columns:1fr .5fr .45fr .7fr .65fr .65fr .45fr .85fr 28px}.pn-treasury-row.income{grid-template-columns:1.1fr .6fr .5fr .8fr .7fr 1fr .5fr 28px}.pn-check{align-items:flex-start}.pn-check input{width:18px;height:18px;margin:7px 0}.pn-treasury-updated{height:33px;display:flex;flex-direction:column;justify-content:center}.pn-treasury-updated span{font:9px var(--mono);color:var(--wc-text-mute);text-transform:uppercase}.pn-treasury-updated b{font:10px var(--mono);color:var(--wc-text)}.pn-treasury-required{height:33px;display:flex;align-items:center;justify-content:center;color:var(--wc-violet);font:800 9px var(--mono);border:1px solid var(--wc-violet)}.pn-treasury-remove{height:33px;border:1px solid var(--wc-burgundy-dim);background:transparent;color:var(--wc-red);cursor:pointer;font-size:18px}.pn-treasury-empty{padding:13px;border:1px dashed var(--wc-border);color:var(--wc-text-mute);font:10px var(--mono)}.pn-treasury-savebar{text-align:right;margin-top:13px}
  .pn-treasury-history{margin-top:10px}.pn-treasury-history>summary{display:flex;justify-content:space-between;cursor:pointer;padding:12px 14px;color:var(--wc-text);font:11px var(--mono);list-style:none}.pn-treasury-history>summary span{color:var(--wc-text-mute)}.pn-treasury-history>summary::-webkit-details-marker{display:none}
  .pn-treasury-trend svg{display:block;width:100%;height:118px;border:1px solid var(--wc-border);background:var(--wc-panel)}.pn-treasury-trend polyline{fill:none;stroke-width:2}.pn-treasury-trend polyline.liquid{stroke:var(--wc-violet)}.pn-treasury-trend polyline.fortress{stroke:var(--wc-gold)}.pn-treasury-trend>div{display:flex;gap:12px;margin-top:5px;font:9px var(--mono)}.pn-treasury-trend span.liquid{color:var(--wc-violet)}.pn-treasury-trend span.fortress{color:var(--wc-gold)}.pn-treasury-trend small{margin-left:auto;color:var(--wc-text-mute)}
  .pn-treasury-compare{display:grid;grid-template-columns:1fr 1fr .7fr .7fr;gap:8px;margin:12px 0}.pn-treasury-compare>div{display:flex;flex-direction:column;justify-content:center;padding:6px 10px;border:1px solid var(--wc-border)}.pn-treasury-compare>div span{font:9px var(--mono);color:var(--wc-text-mute)}.pn-treasury-compare>div strong{font:13px var(--mono);color:var(--wc-text)}
  .pn-wc-chronicle-list{margin-top:10px;position:relative;padding-left:18px;border-left:1px solid var(--wc-burgundy-dim)}
  .pn-wc-chronicle-entry{position:relative;display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:baseline;padding:8px 0 8px 14px;font:11px var(--mono)}
  .pn-wc-chronicle-entry::before{content:"";position:absolute;left:-23px;top:12px;width:6px;height:6px;border-radius:50%;background:var(--wc-violet);box-shadow:0 0 0 2px var(--wc-bg)}
  .pn-wc-chronicle-entry.near::before{background:var(--wc-amber)}.pn-wc-chronicle-entry.danger::before{background:var(--wc-red)}
  .pn-wc-chronicle-date{color:var(--wc-text-mute);text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
  .pn-wc-chronicle-entry b{color:var(--wc-text);font-size:13px;font-variant-numeric:tabular-nums}
  .pn-wc-chronicle-status{font-weight:800;letter-spacing:.05em;white-space:nowrap}
  .pn-wc-chronicle-status.good{color:var(--wc-gold)}.pn-wc-chronicle-status.near{color:var(--wc-amber)}.pn-wc-chronicle-status.danger{color:var(--wc-red)}
  .pn-wc-chronicle-entry em{font-style:normal;color:var(--wc-text-mute);white-space:nowrap}.pn-wc-chronicle-entry em.pos{color:var(--wc-gold)}.pn-wc-chronicle-entry em.neg{color:var(--wc-red)}
  @media(max-width:1180px){.pn-treasury-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-treasury-settings{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-treasury-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pn-treasury-remove{grid-column:2}.pn-treasury-strip small{display:none}}
  @media(max-width:760px){.pn-treasury-grid{grid-template-columns:1fr}.pn-treasury-strip{flex-wrap:wrap}.pn-treasury-settings,.pn-treasury-compare{grid-template-columns:1fr}.pn-treasury-row{grid-template-columns:1fr!important}.pn-treasury-remove{grid-column:1}.pn-wc-chronicle-entry{grid-template-columns:1fr}.pn-wc-ledger-row{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  document.addEventListener("DOMContentLoaded",()=>{
    const root=document.getElementById("root");if(!root)return;
    const update=e=>{const el=e.target.closest&&e.target.closest("[data-treasury-path]");if(!el||!state.treasuryDraft)return;const path=el.dataset.treasuryPath,value="checkbox"===el.type?el.checked:el.hasAttribute("data-treasury-number")?Math.max(0,Number(el.value)||0):el.value;if("snapshotLabel"===path)state.treasurySnapshotLabel=value;else if("snapshotNote"===path)state.treasurySnapshotNote=value;else setDeepOn(state.treasuryDraft,path,value)};
    root.addEventListener("input",update);root.addEventListener("change",e=>{update(e);const c=e.target.closest&&e.target.closest("[data-treasury-compare]");if(c){"a"===c.dataset.treasuryCompare?state.treasuryCompareA=c.value:state.treasuryCompareB=c.value;render()}});
    root.addEventListener("click",e=>{
      const fresh=e.target.closest("[data-treasury-new]");if(fresh){state.treasuryDraft=pnTreasuryClone();state.treasurySnapshotLabel="MID_MONTH";state.treasurySnapshotNote="";render();return}
      if(e.target.closest("[data-treasury-cancel]")){state.treasuryDraft=null;render();return}
      const add=e.target.closest("[data-treasury-add]");if(add&&state.treasuryDraft){const k=add.dataset.treasuryAdd,d={balances:{id:pnTreasuryId(),label:"",amount:0,currency:"EUR",include:!0,note:"",updatedAt:todayISO()},obligations:{id:pnTreasuryId(),name:"",amount:0,currency:"EUR",status:"PENDING",category:"",dueDate:"",recurring:!1,note:""},pendingAssets:{id:pnTreasuryId(),name:"",amount:0,currency:"EUR",type:"HARDWARE_SALE",confidence:"MEDIUM",expectedDate:"",converted:!1,note:""},incomes:{id:pnTreasuryId(),source:"",amount:0,currency:"EUR",expectedDate:"",confidence:"HIGH",recurring:!1,note:""}};state.treasuryDraft[k].push(d[k]);render();return}
      const rem=e.target.closest("[data-treasury-remove]");if(rem&&state.treasuryDraft){state.treasuryDraft[rem.dataset.treasuryRemove].splice(Number(rem.dataset.treasuryIndex),1);render();return}
      if(e.target.closest("[data-treasury-save]")&&state.treasuryDraft){const ledger=Store.load(),saved=normalizeTreasury(state.treasuryDraft),calc=pnTreasuryCalculate(saved),stamp=nowISO(),label=(state.treasurySnapshotLabel||"MID_MONTH").replace(/_/g," ");saved.balances.forEach(e=>e.updatedAt=stamp);saved.snapshots.push({id:pnTreasuryId(),timestamp:stamp,date:todayISO(),label,note:state.treasurySnapshotNote||"",liquid:calc.liquid,fortress:calc.fortress,pending:calc.pending,projectedSalary:calc.income,afterPending:calc.afterPending,afterSalary:calc.afterSalary});ledger.treasury=saved;Store.persist();state.treasuryDraft=null;state.treasurySnapshotNote="";render();return}
    })
  })
})();
