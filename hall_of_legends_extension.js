"use strict";
(function(){
const PN_HALL_TIERS={BRONZE:20,SILVER:40,GOLD:80,EPIC:160,LEGENDARY:320};
const PN_HALL_PRESTIGE={BRONZE:0,SILVER:0,GOLD:1,EPIC:3,LEGENDARY:6};
const PN_HALL_CHAINS=[
{key:"rig",category:"RIG FLIPPING",name:"Empire of Machines",metric:"rigProfit",units:"EUR",steps:[50,250,750,2500,5000]},
{key:"part",category:"PART FLIPPING",name:"Silicon Merchant",metric:"partProfit",units:"EUR",steps:[25,100,300,1000,2500]},
{key:"combined",category:"THE EMPIRE",name:"Golden Empire",metric:"allProfit",units:"EUR",steps:[100,500,1000,5000,10000],description:"lifetime realized profit"},
{key:"rigsales",category:"THE MARKET",name:"Merchant of Machines",metric:"rigSales",units:"sales",steps:[1,5,15,50,100]},
{key:"partsales",category:"THE MARKET",name:"Parts Dealer",metric:"partSales",units:"sales",steps:[1,5,20,50,100]},
{key:"volume",category:"THE MARKET",name:"Trade Volume",metric:"revenue",units:"EUR",steps:[1000,5000,10000,25000,50000]},
{key:"built",category:"THE FORGE",name:"Silicon Architect",metric:"builds",units:"count",steps:[1,5,10,25,50]},
{key:"gifted",category:"THE SHADOW VAULT",name:"Generous Tyrant",metric:"gifts",units:"count",steps:[1,2,5,10,20]},
{key:"restored",category:"THE NECROPOLIS",name:"Reanimator",metric:"repairs",units:"count",steps:[1,3,5,10,25]},
{key:"stock",category:"THE ARMORY",name:"Vault Keeper",metric:"inventoryActive",units:"count",steps:[10,25,50,100,250],description:"active components in the armory"},
{key:"profitable",category:"THE MARKET",name:"Golden Touch",metric:"profitableSales",units:"count",steps:[1,5,15,35,75]},
{key:"profitableRigs",category:"RIG FLIPPING",name:"Machine Merchant",metric:"profitableRigSales",units:"count",steps:[1,5,10,25,50]},
{key:"profitableParts",category:"PART FLIPPING",name:"Silicon Broker",metric:"profitablePartSales",units:"count",steps:[1,5,15,35,75]},
{key:"rigrecord",category:"RIG FLIPPING",name:"The Big Score",metric:"bestRigProfit",units:"EUR",steps:[25,50,100,200,500]},
{key:"partrecord",category:"PART FLIPPING",name:"Highway Robbery",metric:"bestPartProfit",units:"EUR",steps:[10,25,50,100,250]},
{key:"roirecord",category:"THE TREASURY",name:"Double or Nothing",metric:"bestROIValue",units:"percent",steps:[10,25,50,100,200]},
{key:"fleamarket",category:"THE HUNT",name:"Flea Market Goblin",metric:"fleaMarketCount",units:"count",steps:[1,5,10,25,50]}
];
const PN_HALL_RARITIES=["BRONZE","SILVER","GOLD","EPIC","LEGENDARY"];
function pnHallNum(x){return typeof x==="number"&&Number.isFinite(x)?x:(typeof x==="string"&&x.trim()!==""&&Number.isFinite(Number(x))?Number(x):null)}
function pnHallMoney(n){return "€"+(Math.round(n*100)/100).toLocaleString("en-IE",{minimumFractionDigits:2,maximumFractionDigits:2})}
function pnHallDate(row){return String(row&&(
 row.unlockDate||row.saleDate||row.completionDate||row.completedDate||row.date||row.purchaseDate||row.updatedAt||row.createdAt
)||"").slice(0,10)}
function pnHallInventoryRecord(item){return !!(item&&typeof item==="object"&&(item.id||item.manufacturer||item.model))}
function pnHallInventoryActive(item){return pnHallInventoryRecord(item)&&!["SOLD","SOLD_IN_TRANSIT","GIFTED","RETIRED"].includes(String(item.status||"IN_STORAGE").toUpperCase())}
function pnHallEventLabel(row,fallback){return String(row&&(row.itemName||row.name||((row.manufacturer||"")+" "+(row.model||"")).trim())||fallback||"Verified record")}
function pnHallFacts(data,rate){
  const sales=Array.isArray(data.sales)?data.sales:[],inventory=Array.isArray(data.inventory)?data.inventory:[],
  projects=Array.isArray(data.projects)?data.projects:[],repairs=Array.isArray(data.repairs)?data.repairs:[];
  const metrics={rigProfit:0,partProfit:0,allProfit:0,revenue:0,rigSales:0,partSales:0,builds:0,gifts:0,repairs:0,inventoryActive:0,inventoryLifetime:0,profitableSales:0,profitableRigSales:0,profitablePartSales:0,bestRigProfit:0,bestPartProfit:0,bestROIValue:0,fleaMarketCount:0,bestRig:null,bestPart:null,bestROI:null};
  const evidence=[],unverified=[],seen=new Set(),events={sales:[],builds:[],gifts:[],repairs:[],inventoryActive:[],inventoryLifetime:[],fleaMarket:[]};
  for(const sale of sales){
    if(!sale||String(sale.saleState||"COMPLETED").toUpperCase()!=="COMPLETED"||String(sale.disposition||"SALE").toUpperCase()==="GIFT")continue;
    if(sale.id!=null){if(seen.has(String(sale.id)))continue;seen.add(String(sale.id))}
    const kind=String(sale.saleType|| (sale.inventoryItemId?"COMPONENT":"RIG")).toUpperCase();
    const bucket=kind==="COMPONENT"?"part":kind==="RIG"?"rig":null;
    if(!bucket)continue;
    const currency=String(sale.currency||"RSD").toUpperCase();
    if(!["EUR","RSD"].includes(currency)){unverified.push({id:sale.id,reason:"Unsupported currency: "+currency});continue}
    const toEUR=(v)=>rate(v,currency,"EUR");
    const price=pnHallNum(sale.buyerPrice);
    if(price===null||price<0){unverified.push({id:sale.id,reason:"Missing sales revenue"});continue}
    const revenue=toEUR(price);
    if(!Number.isFinite(revenue)){unverified.push({id:sale.id,reason:"Unknown currency conversion"});continue}
    metrics.revenue+=revenue;
    metrics[bucket==="rig"?"rigSales":"partSales"]++;
    const acquisition=pnHallNum(sale.originalInvestment),extra=sale.additionalCosts==null?0:pnHallNum(sale.additionalCosts);
    if(acquisition===null||acquisition<0||extra===null||extra<0){
      unverified.push({id:sale.id,reason:"Missing or invalid cost provenance"});
      const entry={id:sale.id,type:bucket,revenue,verified:false,date:pnHallDate(sale),name:pnHallEventLabel(sale,"Sale")};
      evidence.push(entry);events.sales.push(entry);
      continue;
    }
    const derived=typeof saleDerived==="function"?saleDerived(sale):{totalCost:acquisition+extra,profit:price-acquisition-extra};
    const verifiedCost=pnHallNum(derived.totalCost),verifiedProfit=pnHallNum(derived.profit);
    if(verifiedCost===null||verifiedProfit===null||verifiedCost<0){unverified.push({id:sale.id,reason:"Invalid authoritative sale calculation"});continue}
    const profit=toEUR(verifiedProfit);
    if(!Number.isFinite(profit)){unverified.push({id:sale.id,reason:"Unknown cost currency"});continue}
    metrics[bucket==="rig"?"rigProfit":"partProfit"]+=profit;metrics.allProfit+=profit;
    if(profit>0){metrics.profitableSales++;if(bucket==="rig")metrics.profitableRigSales++;else metrics.profitablePartSales++}
    metrics[bucket==="rig"?"bestRigProfit":"bestPartProfit"]=Math.max(metrics[bucket==="rig"?"bestRigProfit":"bestPartProfit"],profit);
    const roi=verifiedCost>0?100*verifiedProfit/verifiedCost:null;
    const entry={id:sale.id,type:bucket,revenue,profit,roi,verified:true,date:pnHallDate(sale),name:pnHallEventLabel(sale,"Sale")};
    evidence.push(entry);events.sales.push(entry);
    const bestKey=bucket==="rig"?"bestRig":"bestPart";
    if(metrics[bestKey]===null||profit>metrics[bestKey].profit)metrics[bestKey]=entry;
    if(roi!==null&&(metrics.bestROI===null||roi>metrics.bestROI.roi))metrics.bestROI=entry;
    if(roi!==null)metrics.bestROIValue=Math.max(metrics.bestROIValue,roi);
  }
  events.builds=projects.filter(p=>p&&["COMPLETED","SOLD"].includes(p.status)&&p.purpose!=="TEST_BENCH").map(p=>({date:pnHallDate(p),name:pnHallEventLabel(p,"Completed build"),record:p}));
  events.gifts=projects.filter(p=>p&&p.purpose==="FAMILY_GIFT"&&["GIFTED","COMPLETED","SOLD","PERSONAL"].includes(p.status)).map(p=>({date:pnHallDate(p),name:pnHallEventLabel(p,"Completed gift"),record:p}));
  events.repairs=repairs.filter(r=>r&&["REPAIRED","COMPLETED","SUCCESS"].includes(String(r.status||"").toUpperCase())).map(r=>({date:pnHallDate(r),name:pnHallEventLabel(r,"Completed repair"),record:r}));
  events.inventoryLifetime=inventory.filter(pnHallInventoryRecord).map(item=>({date:pnHallDate(item),name:pnHallEventLabel(item,"Inventory acquisition"),record:item}));
  events.inventoryActive=inventory.filter(pnHallInventoryActive).map(item=>({date:pnHallDate(item),name:pnHallEventLabel(item,"Active inventory"),record:item}));
  events.fleaMarket=inventory.filter(item=>pnHallInventoryRecord(item)&&String(item.source||"").toUpperCase()==="FLEA_MARKET").map(item=>({date:pnHallDate(item),name:pnHallEventLabel(item,"Flea-market acquisition"),record:item}));
  metrics.builds=events.builds.length;metrics.gifts=events.gifts.length;metrics.repairs=events.repairs.length;
  metrics.inventoryActive=events.inventoryActive.length;metrics.inventoryLifetime=events.inventoryLifetime.length;metrics.fleaMarketCount=events.fleaMarket.length;
  return {metrics,evidence,events,unverified,sourceCount:sales.length,inventoryCount:metrics.inventoryLifetime,activeInventoryCount:metrics.inventoryActive};
}
function pnHallSorted(events){return events.slice().sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")))}
function pnHallUnlockEvidence(row,facts){
 const m=row.metric,goal=row.goal,sales=pnHallSorted(facts.events.sales),matching=type=>sales.filter(e=>!type||e.type===type),hit=(items,index)=>{const e=items[index];return e?{date:e.date,name:e.name}:null};
 if(["rigProfit","partProfit","allProfit","revenue"].includes(m)){
  const list=m==="rigProfit"?matching("rig"):m==="partProfit"?matching("part"):sales;let total=0;
  for(const e of list){const value=m==="revenue"?e.revenue:(e.verified?e.profit:0);if(!Number.isFinite(value))continue;total+=value;if(total>=goal)return{date:e.date,name:e.name}}
 }
 if(m==="rigSales")return hit(matching("rig"),goal-1);
 if(m==="partSales")return hit(matching("part"),goal-1);
 if(m==="profitableSales")return hit(sales.filter(e=>e.verified&&e.profit>0),goal-1);
 if(m==="profitableRigSales")return hit(matching("rig").filter(e=>e.verified&&e.profit>0),goal-1);
 if(m==="profitablePartSales")return hit(matching("part").filter(e=>e.verified&&e.profit>0),goal-1);
 if(m==="bestRigProfit")return hit(matching("rig").filter(e=>e.verified&&e.profit>=goal),0);
 if(m==="bestPartProfit")return hit(matching("part").filter(e=>e.verified&&e.profit>=goal),0);
 if(m==="bestROIValue")return hit(sales.filter(e=>e.verified&&Number.isFinite(e.roi)&&e.roi>=goal),0);
 const source={builds:facts.events.builds,gifts:facts.events.gifts,repairs:facts.events.repairs,inventoryActive:facts.events.inventoryActive,inventoryLifetime:facts.events.inventoryLifetime,fleaMarketCount:facts.events.fleaMarket}[m];
 return source?hit(pnHallSorted(source),goal-1):null;
}
function pnHallEvaluate(data,rate){
 const facts=pnHallFacts(data,rate),m=facts.metrics,rows=[];
 for(const chain of PN_HALL_CHAINS)chain.steps.forEach((goal,i)=>{
   const current=m[chain.metric],rarity=PN_HALL_RARITIES[i];
   const description="Reach "+(chain.units==="EUR"?pnHallMoney(goal):chain.units==="percent"?goal+"% ROI":goal+" "+(chain.units==="sales"?"verified sales":"verified records"))+" in "+(chain.description||chain.category.toLowerCase());
   const row={id:chain.key+"-"+(i+1),chainKey:chain.key,metric:chain.metric,category:chain.category,name:chain.name+" "+["I","II","III","IV","V"][i],chainName:chain.name,description,goal,current,unit:chain.units,rarity,xp:PN_HALL_TIERS[rarity],prestige:PN_HALL_PRESTIGE[rarity],unlocked:false,secret:false};
   const proof=pnHallUnlockEvidence(row,facts);row.unlocked=current>=goal||!!proof;row.unlockedAt=proof&&proof.date||"";row.unlockEvidence=proof&&proof.name||"Historical ledger evidence";rows.push(row);
 });
 for(const [id,category,name,metric,goal,rarity] of [
  ["forge-first","THE FORGE","First Spark","builds",1,"BRONZE"],
  ["forge-master","THE FORGE","Master of the Forge","builds",10,"GOLD"],
  ["generous","THE SHADOW VAULT","The Generous Tyrant","gifts",1,"SILVER"],
  ["repair-five","THE NECROPOLIS","Lazarus Protocol","repairs",5,"GOLD"],
  ["vault-ten","THE ARMORY","The Hoarder","inventoryLifetime",10,"BRONZE"]
 ]){
   const current=m[metric],row={id,chainKey:null,metric,category,name,description:"Record "+goal+" qualifying "+(metric==="inventoryLifetime"?"lifetime acquisitions":metric),goal,current,unit:"count",rarity,xp:PN_HALL_TIERS[rarity],prestige:PN_HALL_PRESTIGE[rarity],unlocked:false,secret:id==="generous"};
   const proof=pnHallUnlockEvidence(row,facts);row.unlocked=current>=goal||!!proof;row.unlockedAt=proof&&proof.date||"";row.unlockEvidence=proof&&proof.name||"Historical ledger evidence";rows.push(row);
 }
 const xp=rows.reduce((sum,a)=>sum+(a.unlocked?a.xp:0),0),prestige=rows.reduce((sum,a)=>sum+(a.unlocked?a.prestige:0),0);
 return {...facts,achievements:rows,xp,prestige};
}
function pnHallLevel(xp){
 const safe=Math.max(0,Number(xp)||0);
 const level=Math.floor(Math.sqrt(safe/100))+1;
 const start=100*(level-1)*(level-1),next=100*level*level;
 const ranks=["SCRAP MERCHANT","HARDWARE HUNTER","SILICON BROKER","FORGE KEEPER","MASTER FLIPPER","TECH WARLORD","SILICON TYCOON","HARDWARE OVERLORD"];
 return {level,title:ranks[Math.min(ranks.length-1,Math.floor((level-1)/3))],earned:safe,into:safe-start,needed:next-start,progress:(safe-start)/(next-start)*100};
}
const hallState={filter:"ALL"};
function pnHallRender(){
 const data=Store.load(),result=pnHallEvaluate(data,convert),m=result.metrics,level=pnHallLevel(result.xp),categories=["ALL",...new Set(result.achievements.map(a=>a.category))];
 const fmt=v=>pnHallMoney(v),tile=(label,value)=>'<div class="pn-hall-stat"><small>'+label+'</small><strong>'+value+'</strong></div>';
 const panels=[["RIG NET PROFIT",fmt(m.rigProfit)],["PART NET PROFIT",fmt(m.partProfit)],["COMBINED NET PROFIT",fmt(m.allProfit)],["SALES REVENUE",fmt(m.revenue)]].map(t=>tile(...t)).join("");
 const tabs=categories.map(cat=>'<button class="pn-hall-tab'+(hallState.filter===cat?' selected':'')+'" data-hall-filter="'+escHtml(cat)+'">'+escHtml(cat)+'</button>').join("");
 const achievements=result.achievements.filter(a=>hallState.filter==="ALL"||a.category===hallState.filter);
 const cards=achievements.map(a=>{
   const progress=Math.max(0,Math.min(100,100*a.current/a.goal));
   return '<article class="pn-hall-card '+a.rarity.toLowerCase()+(a.unlocked?' earned':'')+'"><div class="pn-hall-top"><span class="pn-hall-medal">'+(a.unlocked?'◆':'◇')+'</span><span class="pn-hall-rarity">'+a.rarity+' · '+a.xp+' XP</span></div><h3>'+escHtml(a.secret&&!a.unlocked?'SECRET ACHIEVEMENT':a.name)+'</h3><p>'+(a.secret&&!a.unlocked?'Locked: requirement undisclosed':escHtml(a.description))+'</p><div class="pn-hall-meter"><i style="width:'+progress+'%"></i></div><small>'+(a.secret&&!a.unlocked?'???':((a.unit==="EUR"?fmt(a.current):a.unit==="percent"?a.current.toFixed(1)+"%":a.current)+' / '+(a.unit==="EUR"?fmt(a.goal):a.unit==="percent"?a.goal+"%":a.goal)))+'</small><div class="pn-hall-status">'+(a.unlocked?'UNLOCKED':'LOCKED')+'</div></article>';
 }).join("");
 const chronicle=result.evidence.filter(e=>e.verified).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).map(e=>'<div class="pn-hall-event"><b>'+escHtml(e.name)+'</b><span>'+escHtml(e.date||"Date unknown")+' · '+fmt(e.profit)+' verified profit</span></div>').join("")||'<p class="hint">No verified historical profit records yet.</p>';
 const record=(label,e)=>tile(label,e?fmt(e.profit):"UNVERIFIED");
 return '<style>.pn-hall{--hall:#dca74f;color:var(--text,#e8e7e1)}.pn-hall-hero{padding:25px;border:1px solid #765327;border-radius:16px;background:linear-gradient(120deg,#231b14,#12151b);margin-bottom:18px}.pn-hall-hero h2{font-size:28px;letter-spacing:2px;margin:3px 0 7px;color:#f5d291}.pn-hall-hero p{opacity:.7}.pn-hall-stats,.pn-hall-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:14px 0}.pn-hall-stat{background:#171c22;padding:17px;border:1px solid #383b40;border-radius:10px;display:flex;flex-direction:column;gap:8px}.pn-hall-stat small{font-size:10px;letter-spacing:1.1px;color:#a0a6ad}.pn-hall-stat strong{font-size:22px;color:#f0d39b}.pn-hall-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}.pn-hall-tab{border:1px solid #4b4b4b;background:#17191c;color:#aaa;padding:9px 12px;border-radius:7px;cursor:pointer}.pn-hall-tab.selected{border-color:#dca74f;color:#f5d291}.pn-hall-card{background:#171b22;border:1px solid #353a43;border-radius:12px;padding:17px;min-height:174px;display:flex;flex-direction:column;gap:9px;opacity:.68}.pn-hall-card.earned{opacity:1;border-color:#9a703c}.pn-hall-card h3{font-size:14px;letter-spacing:.7px;margin:0}.pn-hall-card p{font-size:11px;color:#abb2bf;min-height:30px;margin:0}.pn-hall-top{display:flex;justify-content:space-between;align-items:center}.pn-hall-medal{font-size:23px;color:#d5a451}.pn-hall-rarity{font:10px monospace;color:#b9a784}.pn-hall-card.epic .pn-hall-rarity{color:#bd8ef9}.pn-hall-card.legendary .pn-hall-rarity{color:#f39b51}.pn-hall-meter{height:6px;background:#34373c;border-radius:4px;overflow:hidden}.pn-hall-meter i{display:block;height:100%;background:#e0b058}.pn-hall-card small{font:11px monospace;color:#bababa}.pn-hall-status{font-size:10px;font-weight:bold;color:#c79a60;margin-top:auto}.pn-hall-event{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #393d45;font-size:12px}.pn-hall-event span{color:#aaa}@media(max-width:680px){.pn-hall-hero h2{font-size:22px}.pn-hall-event{flex-direction:column}}</style>'+
 pageHeader("Hall of Legends","Achievement progression from verified PC-flipping history.","")+
 '<div class="content pn-hall"><div class="pn-hall-hero"><small>PROFITNODE // LEGACY SYSTEM</small><h2>HALL OF LEGENDS</h2><p>Earned in silicon. Forged in commerce.</p><strong>'+result.achievements.filter(a=>a.unlocked).length+' / '+result.achievements.length+' TROPHIES · '+result.xp+' XP</strong></div><div class="pn-hall-level"><strong>LEVEL '+level.level+' · '+escHtml(level.title)+'</strong><span>'+level.into+' / '+level.needed+' XP TO NEXT LEVEL</span><div class="pn-hall-meter"><i style="width:'+level.progress+'%"></i></div><small>FOUNDERS RECKONING · Existing records automatically count toward your starting level</small></div><div class="pn-hall-stats">'+panels+'</div>'+
 (result.unverified.length?'<div class="info-note">'+result.unverified.length+' sale record(s) lack valid cost/revenue provenance; profit from these sales is excluded until verified. Revenue may still be counted.</div>':'')+
 '<h2>ACHIEVEMENTS</h2><div class="pn-hall-tabs">'+tabs+'</div><div class="pn-hall-grid">'+cards+'</div><h2>PROFIT RECORD BOARD</h2><div class="pn-hall-stats">'+record("BEST RIG FLIP",m.bestRig)+record("BEST PART FLIP",m.bestPart)+tile("BEST VERIFIED ROI",m.bestROI?m.bestROI.roi.toFixed(1)+"%":"UNVERIFIED")+'</div><h2>THE CHRONICLE</h2><div class="panel"><div class="panel-body">'+chronicle+'</div></div></div>';
}
if(typeof ROUTES!=="undefined"&&!ROUTES.some(r=>r.key==="hall"))ROUTES.splice(Math.max(0,ROUTES.findIndex(r=>r.key==="dashboard")+1),0,{key:"hall",label:"HALL OF LEGENDS",nix:"02",render:pnHallRender});
if(typeof NAV_ICON!=="undefined")NAV_ICON.hall="assets/nav/hall-of-legends.svg";
if(typeof window!=="undefined"&&typeof document!=="undefined"&&window.location&&typeof URLSearchParams==="function"&&new URLSearchParams(window.location.search).get("view")==="hall"){
  window.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{state.route="hall";render();},30),{once:true});
}
if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("click",e=>{const el=e.target.closest("[data-hall-filter]");if(el){hallState.filter=el.dataset.hallFilter;render()}});
globalThis.PN_HALL={evaluate:pnHallEvaluate,facts:pnHallFacts,level:pnHallLevel,chains:PN_HALL_CHAINS,tiers:PN_HALL_TIERS,prestige:PN_HALL_PRESTIGE};
})();
