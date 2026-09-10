"use strict";

/* PROFITNODE MAIL v1 — local-first shipment/postage tracker, integrated with the existing ledger. */

const MAIL_DIRECTIONS=["incoming","outgoing"];
const MAIL_LINKED_TYPES=["project","inventory","deal","sale","personal","none"];
const MAIL_STATUSES=["preparing","sent","in_transit","ready_for_pickup","delivered","delayed","returned","lost"];
const MAIL_STATUS_META={
  preparing:{chip:"chip-muted"},
  sent:{chip:"chip-blue-outline"},
  in_transit:{chip:"chip-blue"},
  ready_for_pickup:{chip:"chip-amber"},
  delivered:{chip:"chip-green"},
  delayed:{chip:"chip-amber-outline"},
  returned:{chip:"chip-red-outline"},
  lost:{chip:"chip-red"}
};
const MAIL_PROBLEM_STATUSES=["delayed","returned","lost"];
const MailUI={offer:null,smartImport:null};

/* Known carrier tracking-tool base URLs, keyed by a normalized (lowercased, diacritic-stripped) carrier name.
   Only carriers whose site we've actually confirmed live here — an unverified guess is worse than no autofill.
   Posta Srbije's own tool is a same-page AJAX lookup (no per-shipment deep link, reCAPTCHA-gated), so this can
   only open the tool, not jump straight to the result — see mailTrack() below for the copy+open combo that gets
   as close to one-click as the site allows. */
const MAIL_CARRIER_URL_PRESETS={
  "postasrbije":"https://www.posta.rs/lat/alati/pracenje-posiljke.aspx"
};
function mailNormalizeCarrierKey(s){
  return String(s||"").toLowerCase()
    .replace(/[čć]/g,"c").replace(/š/g,"s").replace(/ž/g,"z").replace(/đ/g,"dj")
    .replace(/[^a-z0-9]/g,"");
}
function mailCarrierPresetUrl(carrierText){
  return MAIL_CARRIER_URL_PRESETS[mailNormalizeCarrierKey(carrierText)]||"";
}

function mailStatusLabel(s){return String(s||"").replace(/_/g," ")}
function mailAll(){return Store.all("mail")}
function mailGet(id){return Store.get("mail",id)}
function mailIsActive(m){return["delivered","returned","lost"].indexOf(m.status)===-1}
function mailIsProblem(m){return MAIL_PROBLEM_STATUSES.indexOf(m.status)>-1}
function mailMatchesFilter(m,key){
  if(key==="INCOMING")return m.direction==="incoming";
  if(key==="OUTGOING")return m.direction==="outgoing";
  if(key==="ACTIVE")return mailIsActive(m);
  if(key==="DELIVERED")return m.status==="delivered";
  if(key==="PROBLEM")return mailIsProblem(m);
  return true;
}

function mailDefaultRecord(){
  return{direction:"incoming",description:"",linkedType:"none",linkedId:null,carrier:"",trackingNumber:"",trackingUrl:"",sender:"",receiver:"",
    shippingCost:0,currency:"RSD",codAmount:0,dateSent:todayISO(),expectedDeliveryDate:"",actualDeliveryDate:"",deadlineAt:"",status:"preparing",notes:"",actionLinks:[],messageHistory:[]};
}
function mailSafeUrl(u){
  const s=String(u||"").trim();
  return/^https?:\/\//i.test(s)?s:"";
}
function mailNormalizeUrl(u){
  const s=String(u||"").trim();
  if(!s)return"";
  if(/^https?:\/\//i.test(s))return s;
  if(/^[a-z][a-z0-9+.-]*:/i.test(s))return"";
  return"https://"+s;
}
function mailFoldSerbian(s){
  const text=String(s||"").toLowerCase();
  return(text.normalize?text.normalize("NFD").replace(/[\u0300-\u036f]/g,""):text).replace(/đ/g,"dj");
}
function mailNormalizeTracking(s){return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
function mailExtractUrls(raw){
  const matches=String(raw||"").match(/https?:\/\/[^\s<>"']+/gi)||[];
  return matches.map(u=>u.replace(/[),.;!?]+$/,"")).filter((u,i,a)=>mailSafeUrl(u)&&a.indexOf(u)===i);
}
function mailExtractTracking(raw){
  const hit=String(raw||"").toUpperCase().match(/\b[A-Z]{2}\s*[0-9]{9}\s*RS\b/);
  return hit?mailNormalizeTracking(hit[0]):"";
}
function mailExtractSender(raw){
  const hit=String(raw||"").match(/\bod\s+po(?:s|š)iljaoca\s+([^,.;\n]+)/i);
  return hit?String(hit[1]||"").trim():"";
}
function mailParseSerbianAmount(s){
  const raw=String(s||"").replace(/\s/g,"");
  if(!raw)return null;
  const normalized=raw.indexOf(",")>-1?raw.replace(/\./g,"").replace(",","."):raw.replace(/\./g,"");
  const amount=Number(normalized);
  return Number.isFinite(amount)?amount:null;
}
function mailExtractCod(raw){
  const text=mailFoldSerbian(raw),hit=text.match(/\b(?:pouzece|otkupnina|cod|iznos\s+za\s+uplatu|iznosom\s+za\s+uplatu)\s*(?:iznosi|je|:)?\s*(?:od\s+)?([0-9][0-9.\s]*(?:,[0-9]{1,2})?)\s*(rsd|din(?:ara)?|eur|€)?/i);
  if(!hit)return{amount:null,currency:null};
  return{amount:mailParseSerbianAmount(hit[1]),currency:hit[2]&&(hit[2].toLowerCase()==="eur"||hit[2]==="€")?"EUR":"RSD"};
}
function mailDetectPostaScore(ctx){
  let score=0;
  const folded=ctx.folded,tracking=ctx.trackingNumber,urls=ctx.urls;
  if(/^[A-Z]{2}[0-9]{9}RS$/.test(tracking))score+=40;
  if(urls.some(u=>mailFoldSerbian(u).indexOf("posta.rs")>-1))score+=30;
  if(urls.some(u=>mailFoldSerbian(u).indexOf("portal.posta.rs")>-1))score+=20;
  if(/\bposta\s+srbije\b/.test(folded))score+=25;
  if(/\bpost\s*express\b/.test(folded))score+=20;
  if(/\bpaketomat\w*\b/.test(folded))score+=15;
  if(/\bposiljku\b/.test(folded)||/\bpošiljaoca\b/.test(folded)||/\bposiljaoca\b/.test(folded))score+=10;
  if(/\bkod\s+je\b/.test(folded))score+=10;
  if(/\bdina\s+platnom\b/.test(folded))score+=10;
  if(/\bips\s+pokazi\b/.test(folded)||/\bips\s+pokaži\b/.test(folded))score+=10;
  return score;
}
function mailPad2(n){return String(n).padStart(2,"0")}
function mailLocalDate(d){return d.getFullYear()+"-"+mailPad2(d.getMonth()+1)+"-"+mailPad2(d.getDate())}
function mailLocalDeadline(d,h,m){return mailLocalDate(d)+"T"+mailPad2(h)+":"+mailPad2(m)}
function mailExtractDeadline(raw,referenceDate){
  const text=mailFoldSerbian(raw),base=referenceDate instanceof Date&&!isNaN(referenceDate)?new Date(referenceDate.getTime()):new Date;
  let hit=text.match(/\b(danas|sutra)\s+do\s+([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\s*h?\b/);
  if(hit){const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+(hit[1]==="sutra"?1:0));return{deadlineAt:mailLocalDeadline(d,Number(hit[2]),Number(hit[3]||0)),sourceText:hit[0]}}
  hit=text.match(/\b(?:do\s+)?([0-3]?\d)[.\/-]([01]?\d)[.\/-](\d{2}|\d{4})\.?\s*(?:do\s+)?([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\s*h?\b/);
  if(hit){let year=Number(hit[3]);year<100&&(year+=2000);const d=new Date(year,Number(hit[2])-1,Number(hit[1]));if(d.getFullYear()===year&&d.getMonth()===Number(hit[2])-1&&d.getDate()===Number(hit[1]))return{deadlineAt:mailLocalDeadline(d,Number(hit[4]),Number(hit[5]||0)),sourceText:hit[0]}}
  return{deadlineAt:"",sourceText:""};
}
function mailPostaStatus(text){
  if(/\b(?:urucena|isporucena)\b/.test(text))return"delivered";
  if(/\b(?:vracena|povrat)\b/.test(text))return"returned";
  if(/\b(?:kasnjenje|odlozena)\b/.test(text))return"delayed";
  if(/\b(?:spremna\s+za\s+preuzimanje|ceka\s+vas|mozete\s+preuzeti)\b/.test(text))return"ready_for_pickup";
  return"in_transit";
}
function mailNormalizeActionLinks(links){
  const out=[];
  (Array.isArray(links)?links:[]).forEach(link=>{const url=mailSafeUrl(link&&link.url);if(!url||out.some(x=>x.url===url))return;out.push({label:String(link.label||"MESSAGE LINK").trim()||"MESSAGE LINK",url:url})});
  return out;
}
/* Add carrier-specific match/parse objects here; shared extractors keep each parser small and deterministic. */
const MAIL_MESSAGE_PARSERS=[{
  id:"posta-srbije-post-express-v1",
  carrier:"Pošta Srbije / Post Express",
  matches(ctx){return ctx.urls.some(u=>mailFoldSerbian(u).indexOf("posta.rs")>-1)||/\b(?:posta\s+srbije|post\s*express)\b/.test(ctx.folded)||/^PX[0-9]{9}RS$/.test(ctx.trackingNumber)},
  parse(ctx){
    if(!ctx.trackingNumber)return{ok:false,error:"Pošta Srbije message found, but no valid tracking number was detected."};
    const cod=mailExtractCod(ctx.raw),deadline=mailExtractDeadline(ctx.raw,ctx.referenceDate);
    return{ok:true,parserId:this.id,carrier:this.carrier,direction:"incoming",status:mailPostaStatus(ctx.folded),trackingNumber:ctx.trackingNumber,trackingUrl:mailCarrierPresetUrl("Pošta Srbije"),sender:mailExtractSender(ctx.raw),codAmount:cod.amount,currency:cod.currency||"RSD",deadlineAt:deadline.deadlineAt,dateReferences:deadline.deadlineAt?[deadline.deadlineAt]:[],urls:ctx.urls,actionLinks:mailNormalizeActionLinks(ctx.urls.map(url=>({label:mailFoldSerbian(url).indexOf("paketomat")>-1?"PREUSMERI NA PAKETOMAT":"MESSAGE LINK",url:url}))),receivedDate:mailLocalDate(ctx.referenceDate)};
  }
}];
function mailParseCourierMessage(raw,referenceDate){
  const text=String(raw||"").trim();
  if(!text)return{ok:false,error:"Paste a courier message first."};
  const date=referenceDate instanceof Date&&!isNaN(referenceDate)?referenceDate:new Date,ctx={raw:text,folded:mailFoldSerbian(text),trackingNumber:mailExtractTracking(text),urls:mailExtractUrls(text),referenceDate:date};
  const parser=MAIL_MESSAGE_PARSERS.find(p=>p.matches(ctx));
  return parser?parser.parse(ctx):{ok:false,error:"No supported courier format was detected. Pošta Srbije / Post Express is supported in v1."};
}
function mailFindByTracking(trackingNumber){
  const key=mailNormalizeTracking(trackingNumber);
  return key?mailAll().find(m=>mailNormalizeTracking(m.trackingNumber)===key)||null:null;
}
function mailSmartImportPreview(raw,referenceDate){
  const parsed=mailParseCourierMessage(raw,referenceDate);
  if(!parsed.ok)return parsed;
  const existing=mailFindByTracking(parsed.trackingNumber);
  return Object.assign({},parsed,{mode:existing?"update":"create",existingId:existing?existing.id:null});
}
function mailMessageHistoryEntry(parsed,raw){
  return{id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),importedAt:nowISO(),parserId:parsed.parserId,rawMessage:String(raw||""),status:parsed.status,deadlineAt:parsed.deadlineAt||"",actionLinks:mailNormalizeActionLinks(parsed.actionLinks)};
}
function mailApplyParsedMessage(parsed,raw){
  if(!parsed||!parsed.ok)return null;
  const existing=mailFindByTracking(parsed.trackingNumber),entry=mailMessageHistoryEntry(parsed,raw),payload={direction:parsed.direction,carrier:parsed.carrier,trackingNumber:parsed.trackingNumber,trackingUrl:parsed.trackingUrl,status:parsed.status,actionLinks:mailNormalizeActionLinks((existing&&existing.actionLinks||[]).concat(parsed.actionLinks||[])),messageHistory:(existing&&Array.isArray(existing.messageHistory)?existing.messageHistory:[]).concat([entry])};
  parsed.sender&&(payload.sender=parsed.sender);
  null!=parsed.codAmount&&(payload.codAmount=parsed.codAmount,payload.currency=parsed.currency||"RSD");
  parsed.deadlineAt&&(payload.deadlineAt=parsed.deadlineAt);
  let rec,mode;
  if(existing){existing.description||(payload.description=parsed.sender?"Package from "+parsed.sender:"Shipment "+parsed.trackingNumber);rec=Actions.updateMail(existing.id,payload);mode="update"}
  else{payload.description=parsed.sender?"Package from "+parsed.sender:"Shipment "+parsed.trackingNumber;payload.dateSent=parsed.receivedDate||todayISO();rec=Actions.addMail(payload);mode="create"}
  Timeline.log("MAIL_IMPORT",(mode==="update"?"Courier message updated":"Courier message imported")+" — "+parsed.trackingNumber,String(raw||""),parsed.receivedDate||todayISO(),"mail",rec.id);
  return{mode:mode,record:rec};
}

function mailLinkedTypeOptions(direction){
  return(direction==="outgoing"?["project","sale"]:["project","inventory","deal"]).concat(["personal","none"]);
}
function mailLinkedTypeLabel(t){
  return{project:"Project",inventory:"Inventory Item",deal:"Deal",sale:"Sale",personal:"Personal",none:"None"}[t]||t;
}
function mailLinkedEntityCollection(t){
  return{project:"projects",inventory:"inventory",deal:"deals",sale:"sales"}[t]||null;
}
function mailLinkedEntityLabel(type,rec){
  if(!rec)return"";
  if(type==="project")return rec.name;
  if(type==="inventory")return((rec.category?rec.category+" — ":"")+(rec.manufacturer||"")+" "+(rec.model||"")).trim();
  if(type==="deal")return rec.item;
  if(type==="sale")return rec.itemName;
  return"";
}
function mailLinkedIdOptions(type,currentId){
  const coll=mailLinkedEntityCollection(type);
  if(!coll)return"";
  let items=Store.all(coll).slice();
  if(coll==="projects")items.sort((a,b)=>(b.startDate||"").localeCompare(a.startDate||""));
  else if(coll==="inventory")items.sort((a,b)=>(b.purchaseDate||"").localeCompare(a.purchaseDate||""));
  else if(coll==="deals")items.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  else if(coll==="sales")items.sort((a,b)=>(b.saleDate||"").localeCompare(a.saleDate||""));
  return'<option value="">— select —</option>'+items.map(it=>'<option value="'+it.id+'"'+(currentId===it.id?" selected":"")+'>'+escHtml(mailLinkedEntityLabel(type,it))+"</option>").join("");
}
function mailLinkedRecordLabel(m){
  if(!m.linkedType||m.linkedType==="none")return"";
  if(m.linkedType==="personal")return"Personal";
  const coll=mailLinkedEntityCollection(m.linkedType);
  if(!coll||!m.linkedId)return"";
  const rec=Store.get(coll,m.linkedId);
  return rec?mailLinkedEntityLabel(m.linkedType,rec):"";
}
function mailLinkedChip(m){
  if(!m.linkedType||m.linkedType==="none")return"";
  if(m.linkedType==="personal")return'<span class="chip chip-muted">PERSONAL</span>';
  const coll=mailLinkedEntityCollection(m.linkedType);
  if(!coll||!m.linkedId)return"";
  const rec=Store.get(coll,m.linkedId);
  if(!rec)return'<span class="chip chip-red-outline">LINK DELETED</span>';
  const label=mailLinkedEntityLabel(m.linkedType,rec);
  return'<span class="chip chip-blue-outline pn-mail-link-chip" data-open-entity="'+m.linkedType+'" data-id="'+m.linkedId+'" title="Open linked '+escAttr(m.linkedType)+'">'+escHtml(mailLinkedTypeLabel(m.linkedType).toUpperCase())+": "+escHtml(label)+"</span>";
}
function mailDeadlineLabel(value){
  const s=String(value||"");
  return s.length>=16?fmtDate(s.slice(0,10))+" · "+s.slice(11,16):s;
}
function mailActionLinksHtml(m){
  return mailNormalizeActionLinks(m&&m.actionLinks).map(link=>'<a class="btn btn-sm btn-ghost" href="'+escAttr(link.url)+'" target="_blank" rel="noopener noreferrer">'+escHtml(link.label)+' ↗</a>').join("");
}

function mailShippingSum(direction,linkedType,linkedId,currency){
  if(!linkedId)return 0;
  return mailAll().filter(m=>m.direction===direction&&m.linkedType===linkedType&&m.linkedId===linkedId)
    .reduce((sum,m)=>sum+convert(m.shippingCost||0,m.currency||"RSD",currency),0);
}
function mailOutgoingShippingCostForSale(saleId,currency){return mailShippingSum("outgoing","sale",saleId,currency)}
function mailIncomingShippingCostForDeal(dealId,currency){return mailShippingSum("incoming","deal",dealId,currency)}
function mailIncomingShippingCostForProject(projectId,currency){return mailShippingSum("incoming","project",projectId,currency)}
function mailIncomingShippingCostForInventory(inventoryId,currency){return mailShippingSum("incoming","inventory",inventoryId,currency)}

/* Timeline + inventory/financial integration lives on the Actions object, following the app's own convention. */
Actions.addMail=function(data){
  const payload=Object.assign(mailDefaultRecord(),data);
  payload.trackingUrl=mailNormalizeUrl(payload.trackingUrl);
  payload.actionLinks=mailNormalizeActionLinks(payload.actionLinks);
  payload.messageHistory=Array.isArray(payload.messageHistory)?payload.messageHistory:[];
  if(payload.status==="delivered"&&!payload.actualDeliveryDate)payload.actualDeliveryDate=todayISO();
  const rec=Store.insert("mail",payload);
  Timeline.log("MAIL",(rec.direction==="incoming"?"Incoming":"Outgoing")+" shipment logged — "+(rec.description||rec.carrier||"Package"),mailStatusLabel(rec.status),rec.dateSent||todayISO(),"mail",rec.id);
  return rec;
};
Actions.updateMail=function(id,data){
  const before=Store.get("mail",id);
  if(!before)return null;
  const payload=Object.assign({},data);
  if("trackingUrl"in payload)payload.trackingUrl=mailNormalizeUrl(payload.trackingUrl);
  if("actionLinks"in payload)payload.actionLinks=mailNormalizeActionLinks(payload.actionLinks);
  if("messageHistory"in payload&&!Array.isArray(payload.messageHistory))payload.messageHistory=[];
  const nextStatus=payload.status||before.status;
  if(nextStatus==="delivered"&&before.status!=="delivered"&&!payload.actualDeliveryDate&&!before.actualDeliveryDate)payload.actualDeliveryDate=todayISO();
  const result=Store.update("mail",id,payload);
  if(before.status!==result.status)Timeline.log("MAIL",(result.direction==="incoming"?"Incoming":"Outgoing")+" shipment → "+mailStatusLabel(result.status),result.description||"",todayISO(),"mail",result.id);
  return result;
};
Actions.removeMail=function(id){Store.remove("mail",id)};

function mailCheckDeliveredOffer(before,rec){
  MailUI.offer=null;
  if(!rec||rec.status!=="delivered"||(before&&before.status==="delivered"))return;
  if(rec.direction!=="incoming"||rec.linkedType!=="inventory"||!rec.linkedId)return;
  const item=Store.get("inventory",rec.linkedId);
  if(item&&item.status==="INCOMING")MailUI.offer={mailId:rec.id,inventoryId:item.id,itemLabel:((item.manufacturer||"")+" "+(item.model||"")).trim()};
}

/* Sale-linked shipping cost folds into the existing profit/margin/ROI pipeline — recomputed fresh every call, never stored, so edits never double-count. */
const PNCoreSaleDerivedMail=saleDerived;
saleDerived=function(sale){
  const base=PNCoreSaleDerivedMail(sale);
  const shipping=mailOutgoingShippingCostForSale(sale.id,sale.currency);
  if(!shipping)return base;
  const totalCost=base.totalCost+shipping;
  const profit=Calc.profit(sale.buyerPrice,totalCost);
  return Object.assign({},base,{totalCost:totalCost,profit:profit,roi:Calc.roi(profit,totalCost),margin:Calc.profitMargin(profit,sale.buyerPrice),mailShippingCost:shipping});
};

/* Deal-linked incoming shipping folds into the effective purchase price via the existing Calc helpers — never mutates the stored deal. */
const PNCoreDealDerivedMail=dealDerived;
dealDerived=function(deal){
  const shipping=mailIncomingShippingCostForDeal(deal.id,deal.currency);
  if(!shipping)return PNCoreDealDerivedMail(deal);
  const effective=(deal.purchasePrice||0)+shipping;
  return{amountSaved:Calc.savings(deal.estimatedMarketValue,effective),discountPct:Calc.discountPct(deal.estimatedMarketValue,effective),mailShippingCost:shipping};
};

/* Inventory acquisition cost includes incoming shipping attached to the item or its originating deal. */
const PNCoreInventoryAcquisitionCostMail=inventoryAcquisitionCost;
inventoryAcquisitionCost=function(item,currency){
  if(!item)return 0;const cur=currency||item.currency||"RSD",base=PNCoreInventoryAcquisitionCostMail(item,cur),
  invMail=mailIncomingShippingCostForInventory(item.id,cur),
  deal=Store.all("deals").find(d=>d.inventoryItemId===item.id),
  dealMail=deal?mailIncomingShippingCostForDeal(deal.id,cur):0;
  return base+invMail+dealMail;
};

/* Project-linked incoming shipping folds into acquisition/build cost via the existing single source of truth. */
const PNCoreProjectTotalInvestmentMail=Actions.projectTotalInvestment.bind(Actions);
Actions.projectTotalInvestment=function(project){
  return PNCoreProjectTotalInvestmentMail(project)+mailIncomingShippingCostForProject(project.id,project.currency);
};

/* Backup restore must carry mail records across too. */
const PNCoreReplaceAllMail=Store.replaceAll.bind(Store);
Store.replaceAll=function(raw){
  PNCoreReplaceAllMail(raw);
  this._data.mail=Array.isArray(raw&&raw.mail)?raw.mail:[];
  this.persist();
};

/* Restore preview should show a mail count when the backup file has one. */
const PNCoreInspectBackupFileMail=inspectBackupFile;
inspectBackupFile=function(raw){
  const counts=PNCoreInspectBackupFileMail(raw)||{};
  const hadOther=Object.keys(counts).length>0;
  const hasMail=!!(raw&&Array.isArray(raw.mail));
  if(hasMail)counts.mail=raw.mail.length;
  return(hadOther||hasMail)?counts:null;
};

/* One CSV export button per CSV_EXPORTS key is already generic in renderBackup(). */
CSV_EXPORTS.mail={label:"Mail",columns:[
  {label:"Direction",get:e=>e.direction==="outgoing"?"OUTGOING":"INCOMING"},
  {label:"Description",get:e=>e.description||""},
  {label:"Status",get:e=>mailStatusLabel(e.status)},
  {label:"Carrier",get:e=>e.carrier||""},
  {label:"Tracking Number",get:e=>e.trackingNumber||""},
  {label:"Tracking Link",get:e=>e.trackingUrl||""},
  {label:"Sender",get:e=>e.sender||""},
  {label:"Receiver",get:e=>e.receiver||""},
  {label:"Shipping Cost",get:e=>e.shippingCost||0},
  {label:"COD Amount",get:e=>e.codAmount||0},
  {label:"Currency",get:e=>e.currency||"RSD"},
  {label:"Date Sent",get:e=>e.dateSent||""},
  {label:"Expected Delivery",get:e=>e.expectedDeliveryDate||""},
  {label:"Actual Delivery",get:e=>e.actualDeliveryDate||""},
  {label:"Linked Type",get:e=>e.linkedType||"none"},
  {label:"Linked Entity",get:e=>mailLinkedRecordLabel(e)},
  {label:"Notes",get:e=>e.notes||""}
]};

function mailSummaryHtml(){
  const all=mailAll();
  const cell=(label,val,cls)=>'<div class="pn-mail-summary-cell'+(cls?" "+cls:"")+'"><span>'+label+"</span><b>"+val+"</b></div>";
  return'<div class="pn-mail-summary">'+
    cell("INCOMING",all.filter(m=>m.direction==="incoming").length)+
    cell("OUTGOING",all.filter(m=>m.direction==="outgoing").length)+
    cell("ACTIVE",all.filter(mailIsActive).length)+
    cell("DELIVERED",all.filter(m=>m.status==="delivered").length)+
    cell("PROBLEM",all.filter(mailIsProblem).length,all.some(mailIsProblem)?"is-problem":"")+
  "</div>";
}

function mailCard(m){
  const dirChip=m.direction==="incoming"?'<span class="chip chip-blue-outline">INCOMING</span>':'<span class="chip chip-amber-outline">OUTGOING</span>';
  const meta=MAIL_STATUS_META[m.status]||MAIL_STATUS_META.preparing;
  const statusChip='<span class="chip '+meta.chip+'">'+escHtml(mailStatusLabel(m.status))+"</span>";
  const linked=mailLinkedChip(m);
  const actionLinks=mailActionLinksHtml(m);
  const canDeliver=mailIsActive(m)&&m.status!=="delivered";
  const row=(label,val)=>'<div class="pn-mail-card-row"><span>'+label+"</span>"+val+"</div>";
  return'<div class="panel pn-mail-card">'+
    '<div class="pn-mail-card-head">'+dirChip+statusChip+"</div>"+
    '<div class="pn-mail-card-desc">'+escHtml(m.description||"(no description)")+"</div>"+
    row("CARRIER","<b>"+escHtml(m.carrier||"—")+"</b>")+
    (m.trackingNumber||mailSafeUrl(m.trackingUrl)?'<div class="pn-mail-card-row pn-mail-track"><span>TRACKING</span>'+
      (m.trackingNumber?'<b class="mono">'+escHtml(m.trackingNumber)+'</b><button type="button" class="btn btn-sm btn-ghost" data-mail-copy="'+escAttr(m.trackingNumber)+'">COPY TRACKING</button>':"<b class=\"mono\">—</b>")+
      (mailSafeUrl(m.trackingUrl)?'<button type="button" class="btn btn-sm btn-ghost" data-mail-track="'+m.id+'" title="'+(m.trackingNumber?"Copies the tracking number, then opens the carrier’s tracker":"Opens the carrier’s tracker")+'">TRACK ONLINE ↗</button>':"")+
      "</div>":"")+
    row("SHIPPING","<b>"+money(m.shippingCost||0,m.currency)+"</b>")+
    row("SENT","<b>"+(m.dateSent?fmtDate(m.dateSent):"—")+"</b>")+
    (m.deadlineAt?row("DEADLINE","<b>"+escHtml(mailDeadlineLabel(m.deadlineAt))+"</b>"):"")+
    (actionLinks?row("ACTIONS",'<div class="pn-mail-action-links">'+actionLinks+"</div>"):"")+
    (linked?row("LINKED",linked):"")+
    '<div class="pn-mail-card-foot">'+
      (canDeliver?'<button type="button" class="btn btn-sm" data-mail-mark-delivered="'+m.id+'">MARK DELIVERED</button>':"")+
      '<button type="button" class="btn btn-sm" data-mail-edit="'+m.id+'">EDIT</button>'+
      '<button type="button" class="btn btn-sm btn-danger" data-mail-delete="'+m.id+'">DELETE</button>'+
    "</div>"+
  "</div>";
}

function mailFieldRow(label,inputHtml,half){
  return'<label class="field'+(half?" half":"")+'"><span>'+label+"</span>"+inputHtml+"</label>";
}
function mailMessageHistoryHtml(d){
  const history=Array.isArray(d.messageHistory)?d.messageHistory.slice().reverse():[];
  if(!history.length)return"";
  return'<details class="pn-mail-message-history"><summary>IMPORTED MESSAGES ('+history.length+")</summary>"+history.map(item=>'<div class="pn-mail-message-entry"><span>'+escHtml(String(item.importedAt||"").replace("T"," ").slice(0,16))+' · '+escHtml(item.parserId||"parser")+'</span><pre>'+escHtml(item.rawMessage||"")+"</pre></div>").join("")+"</details>";
}
function mailModalHtml(){
  const d=state.mailDraft,isEdit=!!d.id;
  const linkTypeOptions=mailLinkedTypeOptions(d.direction);
  const linkTypeSelect='<select data-mail-path="linkedType">'+linkTypeOptions.map(t=>'<option value="'+t+'"'+(d.linkedType===t?" selected":"")+'>'+escHtml(mailLinkedTypeLabel(t))+"</option>").join("")+"</select>";
  const showLinkedId=mailLinkedEntityCollection(d.linkedType);
  const linkedIdField=showLinkedId?mailFieldRow("Linked "+mailLinkedTypeLabel(d.linkedType),'<select data-mail-path="linkedId">'+mailLinkedIdOptions(d.linkedType,d.linkedId)+"</select>"):"";
  const body=
    mailFieldRow("Direction",'<select data-mail-path="direction">'+MAIL_DIRECTIONS.map(v=>'<option value="'+v+'"'+(d.direction===v?" selected":"")+'>'+v.toUpperCase()+"</option>").join("")+"</select>",true)+
    mailFieldRow("Status",'<select data-mail-path="status">'+MAIL_STATUSES.map(v=>'<option value="'+v+'"'+(d.status===v?" selected":"")+'>'+escHtml(mailStatusLabel(v).toUpperCase())+"</option>").join("")+"</select>",true)+
    mailFieldRow("Description",'<input type="text" data-mail-path="description" value="'+escAttr(d.description)+'" placeholder="What’s in the package">')+
    mailFieldRow("Linked To",linkTypeSelect,true)+
    linkedIdField+
    mailFieldRow("Carrier",'<input type="text" data-mail-path="carrier" value="'+escAttr(d.carrier)+'" placeholder="e.g. Post Express, Bex, DHL">',true)+
    mailFieldRow("Tracking Number",'<input type="text" data-mail-path="trackingNumber" value="'+escAttr(d.trackingNumber)+'">',true)+
    mailFieldRow("Tracking Link",'<input type="text" data-mail-path="trackingUrl" value="'+escAttr(d.trackingUrl)+'" placeholder="Paste the carrier’s tracking page URL">')+
    mailFieldRow("Sender",'<input type="text" data-mail-path="sender" value="'+escAttr(d.sender)+'">',true)+
    mailFieldRow("Receiver",'<input type="text" data-mail-path="receiver" value="'+escAttr(d.receiver)+'">',true)+
    mailFieldRow("Shipping Cost",'<input type="number" min="0" step="0.01" data-mail-path="shippingCost" value="'+escAttr(d.shippingCost)+'">',true)+
    mailFieldRow("Currency",'<select data-mail-path="currency">'+CURRENCIES.map(c=>'<option value="'+c+'"'+(d.currency===c?" selected":"")+'>'+c+"</option>").join("")+"</select>",true)+
    mailFieldRow("COD Amount",'<input type="number" min="0" step="0.01" data-mail-path="codAmount" value="'+escAttr(d.codAmount)+'">',true)+
    mailFieldRow("Date Sent",'<input type="date" data-mail-path="dateSent" value="'+escAttr(d.dateSent)+'">',true)+
    mailFieldRow("Expected Delivery",'<input type="date" data-mail-path="expectedDeliveryDate" value="'+escAttr(d.expectedDeliveryDate)+'">',true)+
    mailFieldRow("Action Deadline",'<input type="datetime-local" data-mail-path="deadlineAt" value="'+escAttr(d.deadlineAt||"")+'">',true)+
    mailFieldRow("Actual Delivery",'<input type="date" data-mail-path="actualDeliveryDate" value="'+escAttr(d.actualDeliveryDate)+'">',true)+
    mailFieldRow("Notes",'<textarea data-mail-path="notes">'+escHtml(d.notes)+"</textarea>");
  return'<div class="modal-backdrop" data-mail-close><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>'+(isEdit?"EDIT SHIPMENT":"NEW SHIPMENT")+'</h3><button type="button" class="modal-close" data-mail-close aria-label="Close">✕</button></div><div class="modal-body"><div class="field-row-wrap" style="display:flex;flex-wrap:wrap;gap:0 14px">'+body+"</div>"+mailMessageHistoryHtml(d)+'</div><div class="modal-foot">'+(isEdit?'<button type="button" class="btn btn-danger" data-mail-delete="'+d.id+'">DELETE</button>':"<span></span>")+'<span style="display:flex;gap:8px"><button type="button" class="btn" data-mail-cancel>CANCEL</button><button type="button" class="btn btn-primary" data-mail-save>'+(isEdit?"SAVE CHANGES":"CREATE")+"</button></span></div></div></div>";
}
function mailSmartImportPreviewHtml(p){
  if(!p||!p.ok)return"";
  const row=(label,value)=>'<div class="pn-mail-import-row"><span>'+label+"</span><b>"+escHtml(value||"—")+"</b></div>",links=mailNormalizeActionLinks(p.actionLinks);
  return'<div class="pn-mail-import-preview"><div class="pn-mail-import-verdict"><span class="chip '+(p.mode==="update"?"chip-amber":"chip-green")+'">'+(p.mode==="update"?"UPDATE EXISTING":"CREATE NEW")+'</span><span>'+escHtml(p.parserId)+"</span></div>"+
    row("TRACKING",p.trackingNumber)+row("SENDER",p.sender)+row("CARRIER",p.carrier)+row("DIRECTION",p.direction)+row("STATUS",mailStatusLabel(p.status))+row("COD",null==p.codAmount?"NOT PRESENT":money(p.codAmount,p.currency||"RSD"))+row("DEADLINE",p.deadlineAt?mailDeadlineLabel(p.deadlineAt):"NOT PRESENT")+row("TRACKING LINK",p.trackingUrl)+
    (links.length?'<div class="pn-mail-import-links"><span>ACTION LINKS</span>'+links.map(link=>'<a href="'+escAttr(link.url)+'" target="_blank" rel="noopener noreferrer">'+escHtml(link.label)+' ↗</a>').join("")+"</div>":"")+"</div>";
}
function mailSmartImportModalHtml(){
  const d=MailUI.smartImport||{raw:"",preview:null,error:""},p=d.preview;
  return'<div class="modal-backdrop" data-mail-import-close><div class="modal pn-mail-import-modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>SMART IMPORT / PASTE MESSAGE</h3><button type="button" class="modal-close" data-mail-import-close aria-label="Close">✕</button></div><div class="modal-body"><label class="field"><span>COURIER SMS</span><textarea class="pn-mail-import-raw" data-mail-import-raw placeholder="Paste the complete courier message here">'+escHtml(d.raw||"")+"</textarea></label>"+(d.error?'<div class="pn-mail-import-error">'+escHtml(d.error)+"</div>":"")+mailSmartImportPreviewHtml(p)+'</div><div class="modal-foot"><span class="pn-mail-import-local">LOCAL PARSER · NO EXTERNAL API</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-mail-import-cancel>CANCEL</button><button type="button" class="btn" data-mail-import-preview>PREVIEW</button>'+(p&&p.ok?'<button type="button" class="btn btn-primary" data-mail-import-apply>'+(p.mode==="update"?"UPDATE SHIPMENT":"CREATE SHIPMENT")+"</button>":"")+"</span></div></div></div>";
}

function renderMail(){
  state.filters.mail=state.filters.mail||{q:"",type:"ALL"};
  const filters=state.filters.mail;
  let items=mailAll().slice().sort((a,b)=>(b.dateSent||b.createdAt||"").localeCompare(a.dateSent||a.createdAt||""));
  items=filterRows(items,filters.q,["description","carrier","trackingNumber","sender","receiver","notes"]);
  if(filters.type&&filters.type!=="ALL")items=items.filter(m=>mailMatchesFilter(m,filters.type));

  const tab=(label,val)=>'<button type="button" class="pn-mail-filter'+(filters.type===val?" active":"")+'" data-mail-filter="'+val+'">'+label+"</button>";
  const controls='<div class="pn-mail-controls"><div class="pn-mail-filters">'+
    tab("ALL","ALL")+tab("INCOMING","INCOMING")+tab("OUTGOING","OUTGOING")+tab("ACTIVE","ACTIVE")+tab("DELIVERED","DELIVERED")+tab("PROBLEM","PROBLEM")+
    '</div><input type="text" placeholder="Search shipments…" data-filter="mail.q" value="'+escAttr(filters.q)+'"></div>';

  const offer=MailUI.offer?'<div class="pn-mail-offer"><span>Shipment delivered'+(MailUI.offer.itemLabel?" — "+escHtml(MailUI.offer.itemLabel):"")+'. Set the linked inventory item to IN STORAGE?</span><span class="pn-mail-offer-actions"><button type="button" class="btn btn-sm btn-primary" data-mail-apply-instock="'+MailUI.offer.inventoryId+'">SET IN STOCK</button><button type="button" class="btn btn-sm" data-mail-dismiss-offer>DISMISS</button></span></div>':"";

  const cards=items.length?'<div class="pn-mail-grid">'+items.map(mailCard).join("")+"</div>":'<div class="panel"><div class="panel-body"><div class="hint" style="margin:0">No shipments match this filter.</div></div></div>';

  const headerActions='<span class="pn-mail-head-actions"><button type="button" class="btn" data-mail-import>PASTE MESSAGE</button><button type="button" class="btn btn-primary" data-mail-add>+ ADD SHIPMENT</button></span>';
  return pageHeader("MAIL",items.length+" of "+mailAll().length+" shipments",headerActions)+
    '<div class="content">'+mailSummaryHtml()+offer+controls+cards+"</div>"+
    (state.mailDraft?mailModalHtml():"")+(MailUI.smartImport?mailSmartImportModalHtml():"");
}

function mailDashboardSummaryHtml(){
  const all=mailAll();
  if(!all.length)return"";
  const incoming=all.filter(m=>m.direction==="incoming"&&mailIsActive(m)).length;
  const outgoing=all.filter(m=>m.direction==="outgoing"&&mailIsActive(m)).length;
  const ready=all.filter(m=>m.status==="ready_for_pickup").length;
  const problem=all.filter(mailIsProblem).length;
  if(!incoming&&!outgoing&&!ready&&!problem)return"";
  const parts=[];
  if(incoming)parts.push(incoming+" Incoming");
  if(outgoing)parts.push(outgoing+" Outgoing");
  if(ready)parts.push(ready+" Ready for Pickup");
  if(problem)parts.push(problem+" Flagged");
  const target=problem?"PROBLEM":"ACTIVE";
  return'<div class="pn-mail-dash'+(problem?" is-problem":"")+'" data-mail-dash-open="'+target+'"><span class="pn-mail-dash-label">MAIL</span><span class="pn-mail-dash-line">'+parts.join(" · ")+'</span><span class="pn-mail-dash-cta">OPEN →</span></div>';
}

function mailApplyRecordSave(){
  const d=state.mailDraft;
  const before=d.id?Store.get("mail",d.id):null;
  const payload={
    direction:d.direction||"incoming",
    description:String(d.description||"").trim(),
    linkedType:d.linkedType||"none",
    linkedId:mailLinkedEntityCollection(d.linkedType)?(d.linkedId||null):null,
    carrier:String(d.carrier||"").trim(),
    trackingNumber:String(d.trackingNumber||"").trim(),
    trackingUrl:String(d.trackingUrl||"").trim(),
    sender:String(d.sender||"").trim(),
    receiver:String(d.receiver||"").trim(),
    shippingCost:Number(d.shippingCost)||0,
    currency:d.currency||"RSD",
    codAmount:Number(d.codAmount)||0,
    dateSent:d.dateSent||"",
    expectedDeliveryDate:d.expectedDeliveryDate||"",
    actualDeliveryDate:d.actualDeliveryDate||"",
    deadlineAt:d.deadlineAt||"",
    status:d.status||"preparing",
    notes:String(d.notes||"").trim()
  };
  const result=d.id?Actions.updateMail(d.id,payload):Actions.addMail(payload);
  mailCheckDeliveredOffer(before,result);
  state.mailDraft=null;
  render();
}
function mailCloseModal(){state.mailDraft=null;render()}

function mailClick(e){
  const importOpen=e.target.closest("[data-mail-import]");
  if(importOpen){state.mailDraft=null;MailUI.smartImport={raw:"",preview:null,error:""};render();return}
  const importPreview=e.target.closest("[data-mail-import-preview]");
  if(importPreview&&MailUI.smartImport){const p=mailSmartImportPreview(MailUI.smartImport.raw,new Date);MailUI.smartImport.preview=p.ok?p:null;MailUI.smartImport.error=p.ok?"":p.error;render();return}
  const importApply=e.target.closest("[data-mail-import-apply]");
  if(importApply&&MailUI.smartImport&&MailUI.smartImport.preview){mailApplyParsedMessage(MailUI.smartImport.preview,MailUI.smartImport.raw);MailUI.smartImport=null;render();return}
  const importCancel=e.target.closest("[data-mail-import-cancel]");
  if(importCancel){MailUI.smartImport=null;render();return}
  const importClose=e.target.closest("[data-mail-import-close]");
  if(importClose&&e.target===importClose){MailUI.smartImport=null;render();return}
  const add=e.target.closest("[data-mail-add]");
  if(add){state.mailDraft=mailDefaultRecord();render();return}
  const edit=e.target.closest("[data-mail-edit]");
  if(edit){const rec=Store.get("mail",edit.dataset.mailEdit);if(rec)state.mailDraft=Object.assign({},rec);render();return}
  const save=e.target.closest("[data-mail-save]");
  if(save){mailApplyRecordSave();return}
  const cancel=e.target.closest("[data-mail-cancel]");
  if(cancel){mailCloseModal();return}
  const closeBackdrop=e.target.closest("[data-mail-close]");
  if(closeBackdrop&&e.target===closeBackdrop){mailCloseModal();return}
  const del=e.target.closest("[data-mail-delete]");
  if(del){
    if(del.dataset.armed!=="1"){del.dataset.armed="1";del.textContent="CONFIRM DELETE?";return}
    const id=del.dataset.mailDelete;
    Actions.removeMail(id);
    if(state.mailDraft&&state.mailDraft.id===id)state.mailDraft=null;
    if(MailUI.offer&&MailUI.offer.mailId===id)MailUI.offer=null;
    render();
    return;
  }
  const deliver=e.target.closest("[data-mail-mark-delivered]");
  if(deliver){
    const id=deliver.dataset.mailMarkDelivered;
    const before=Store.get("mail",id);
    const rec=Actions.updateMail(id,{status:"delivered"});
    mailCheckDeliveredOffer(before,rec);
    render();
    return;
  }
  const applyInStock=e.target.closest("[data-mail-apply-instock]");
  if(applyInStock){Actions.updateInventory(applyInStock.dataset.mailApplyInstock,{status:"IN_STORAGE"});MailUI.offer=null;render();return}
  const dismiss=e.target.closest("[data-mail-dismiss-offer]");
  if(dismiss){MailUI.offer=null;render();return}
  const filterBtn=e.target.closest("[data-mail-filter]");
  if(filterBtn){state.filters.mail=state.filters.mail||{q:"",type:"ALL"};state.filters.mail.type=filterBtn.dataset.mailFilter||"ALL";render();return}
  const dashOpen=e.target.closest("[data-mail-dash-open]");
  if(dashOpen){state.route="mail";state.filters.mail=state.filters.mail||{q:"",type:"ALL"};state.filters.mail.type=dashOpen.dataset.mailDashOpen||"ACTIVE";render();return}
  const copy=e.target.closest("[data-mail-copy]");
  if(copy){
    rigCopyText(copy.dataset.mailCopy);
    const original=copy.textContent;
    copy.textContent="COPIED";
    copy.disabled=true;
    setTimeout(()=>{copy.textContent=original;copy.disabled=false},1200);
    return;
  }
  const track=e.target.closest("[data-mail-track]");
  if(track){
    mailTrack(track.dataset.mailTrack,track);
    return;
  }
}
/* One button: copies the tracking number (so it's on the clipboard the instant the carrier's tab opens)
   then opens the carrier's tracking tool. Most carrier sites (Posta Srbije included) don't support a
   per-shipment deep link — this is the closest a static, backend-less app can get to one-click tracking. */
function mailTrack(id,btn){
  const rec=mailGet(id);
  if(!rec)return;
  const url=mailSafeUrl(rec.trackingUrl);
  if(!url)return;
  if(rec.trackingNumber)rigCopyText(rec.trackingNumber);
  window.open(url,"_blank","noopener,noreferrer");
  if(btn){
    const original=btn.textContent;
    btn.textContent=rec.trackingNumber?"OPENED — NUMBER COPIED":"OPENED";
    setTimeout(()=>{btn.textContent=original},1600);
  }
}
function mailFormInput(e){
  const importRaw=e.target.closest("[data-mail-import-raw]");
  if(importRaw&&MailUI.smartImport){MailUI.smartImport.raw=importRaw.value;MailUI.smartImport.preview=null;MailUI.smartImport.error="";return}
  const el=e.target.closest("[data-mail-path]");
  if(!el||!state.mailDraft)return;
  state.mailDraft[el.dataset.mailPath]=el.value;
}
function mailFormChange(e){
  const el=e.target.closest("[data-mail-path]");
  if(!el||!state.mailDraft)return;
  const path=el.dataset.mailPath;
  state.mailDraft[path]=el.value;
  if(path==="direction"){
    const valid=mailLinkedTypeOptions(state.mailDraft.direction);
    if(valid.indexOf(state.mailDraft.linkedType)===-1){state.mailDraft.linkedType="none";state.mailDraft.linkedId=null}
    render();
    return;
  }
  if(path==="linkedType"){state.mailDraft.linkedId=null;render();return}
  if(path==="carrier"&&!state.mailDraft.trackingUrl){
    const preset=mailCarrierPresetUrl(state.mailDraft.carrier);
    if(preset){state.mailDraft.trackingUrl=preset;render();return}
  }
}

if(typeof ROUTES!=="undefined"&&!window.__PN_MAIL_REGISTERED){
  const salesIdx=ROUTES.findIndex(r=>r.key==="sales");
  ROUTES.splice(salesIdx>=0?salesIdx+1:ROUTES.length,0,{key:"mail",label:"MAIL",render:renderMail});
  const dashRoute=ROUTES.find(r=>r.key==="dashboard");
  if(dashRoute&&typeof renderDashboard==="function"){
    const PNCoreRenderDashboardMail=renderDashboard;
    renderDashboard=function(){return mailDashboardSummaryHtml()+PNCoreRenderDashboardMail()};
    dashRoute.render=renderDashboard;
  }
  window.__PN_MAIL_REGISTERED=true;
}
document.addEventListener("click",mailClick);
document.addEventListener("input",mailFormInput);
document.addEventListener("change",mailFormChange);

(function(){
  const style=document.createElement("style");
  style.textContent=".pn-mail-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--border);background:var(--panel);margin-bottom:12px;overflow:hidden}.pn-mail-summary-cell{min-height:60px;padding:10px 12px;display:flex;flex-direction:column;justify-content:center;gap:5px;border-right:1px solid var(--border)}.pn-mail-summary-cell:last-child{border-right:0}.pn-mail-summary-cell span{font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--text-mute);text-transform:uppercase}.pn-mail-summary-cell b{font-family:var(--mono);font-size:17px;line-height:1.1;color:var(--text)}.pn-mail-summary-cell.is-problem b{color:var(--red)}"+
  ".pn-mail-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}.pn-mail-controls input{width:min(320px,100%)}.pn-mail-filters{display:inline-flex;align-items:center;border:1px solid var(--border);background:var(--panel);flex-wrap:wrap}.pn-mail-filter{border:0;border-right:1px solid var(--border);background:transparent;color:var(--text-mute);padding:9px 13px;font:inherit;font-size:11px;font-weight:800;letter-spacing:.05em;cursor:pointer;font-family:var(--stamp);text-transform:uppercase}.pn-mail-filter:last-child{border-right:0}.pn-mail-filter:hover{color:var(--text)}.pn-mail-filter.active{color:var(--amber);background:var(--amber-wash);box-shadow:inset 0 -2px 0 var(--amber)}"+
  ".pn-mail-offer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;margin-bottom:14px;border:1px solid var(--amber-dim);background:var(--amber-wash);border-radius:var(--radius);font-family:var(--mono);font-size:11.5px;color:var(--text-dim)}.pn-mail-offer-actions{display:flex;gap:8px;flex-shrink:0}"+
  ".pn-mail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.pn-mail-card{padding:14px}.pn-mail-card-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}.pn-mail-card-desc{font-size:13.5px;color:var(--text);font-weight:600;margin-bottom:10px}.pn-mail-card-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border);font-size:11.5px}.pn-mail-card-row span{font-family:var(--stamp);font-size:9.5px;letter-spacing:.08em;color:var(--text-mute);text-transform:uppercase;width:70px;flex:0 0 70px}.pn-mail-card-row b{color:var(--text-dim);font-weight:600}.pn-mail-track b.mono{font-family:var(--mono);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pn-mail-card-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}.pn-mail-link-chip{cursor:pointer}.pn-mail-link-chip:hover{background:var(--panel-hover)}"+
  ".pn-mail-dash{display:flex;align-items:center;gap:12px;margin:0 0 14px;padding:11px 15px;border:1px solid var(--blue);background:var(--blue-wash);border-radius:var(--radius);cursor:pointer;flex-wrap:wrap}.pn-mail-dash.is-problem{border-color:var(--red-dim);background:var(--red-wash)}.pn-mail-dash-label{font-family:var(--stamp);font-size:10px;letter-spacing:.16em;color:var(--blue);font-weight:700}.pn-mail-dash.is-problem .pn-mail-dash-label{color:var(--red)}.pn-mail-dash-line{font-family:var(--mono);font-size:12px;color:var(--text-dim);flex:1;min-width:0}.pn-mail-dash-cta{font-family:var(--stamp);font-size:10px;letter-spacing:.06em;color:var(--text-mute)}"+
  ".pn-mail-head-actions,.pn-mail-action-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pn-mail-import-modal{max-width:720px}.pn-mail-import-raw{min-height:160px;resize:vertical;font-family:var(--mono);line-height:1.5}.pn-mail-import-local{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--text-mute)}.pn-mail-import-error{padding:10px 12px;border:1px solid var(--red-dim);background:var(--red-wash);color:var(--red);font-family:var(--mono);font-size:11px}.pn-mail-import-preview{margin-top:14px;border:1px solid var(--border);background:var(--panel);padding:12px}.pn-mail-import-verdict{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-family:var(--mono);font-size:9px;color:var(--text-mute)}.pn-mail-import-row{display:grid;grid-template-columns:120px 1fr;gap:10px;padding:6px 0;border-top:1px solid var(--border)}.pn-mail-import-row span,.pn-mail-import-links>span{font-family:var(--stamp);font-size:9px;letter-spacing:.08em;color:var(--text-mute)}.pn-mail-import-row b{font-family:var(--mono);font-size:11px;color:var(--text-dim);overflow-wrap:anywhere}.pn-mail-import-links{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border)}.pn-mail-import-links a{font-family:var(--mono);font-size:10px;color:var(--blue)}.pn-mail-message-history{margin-top:14px;border-top:1px solid var(--border);padding-top:12px}.pn-mail-message-history summary{cursor:pointer;font-family:var(--stamp);font-size:10px;letter-spacing:.08em;color:var(--text-mute)}.pn-mail-message-entry{margin-top:10px}.pn-mail-message-entry>span{font-family:var(--mono);font-size:9px;color:var(--text-mute)}.pn-mail-message-entry pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0 0;padding:9px;border:1px solid var(--border);background:var(--panel);font-family:var(--mono);font-size:10px;color:var(--text-dim)}"+
  "@media(max-width:1180px){.pn-mail-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-mail-summary-cell:nth-child(2n){border-right:0}}"+
  "@media(max-width:720px){.pn-mail-controls{flex-direction:column;align-items:stretch}.pn-mail-controls input{width:100%}.pn-mail-filters{width:100%}.pn-mail-filter{flex:1}.pn-mail-import-row{grid-template-columns:1fr}.pn-mail-head-actions{width:100%}}";
  document.head.appendChild(style);
})();
