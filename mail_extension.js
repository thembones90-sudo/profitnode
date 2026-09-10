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
const MailUI={offer:null};

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
    shippingCost:0,currency:"RSD",codAmount:0,dateSent:todayISO(),expectedDeliveryDate:"",actualDeliveryDate:"",status:"preparing",notes:""};
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

function mailShippingSum(direction,linkedType,linkedId,currency){
  if(!linkedId)return 0;
  return mailAll().filter(m=>m.direction===direction&&m.linkedType===linkedType&&m.linkedId===linkedId)
    .reduce((sum,m)=>sum+convert(m.shippingCost||0,m.currency||"RSD",currency),0);
}
function mailOutgoingShippingCostForSale(saleId,currency){return mailShippingSum("outgoing","sale",saleId,currency)}
function mailIncomingShippingCostForDeal(dealId,currency){return mailShippingSum("incoming","deal",dealId,currency)}
function mailIncomingShippingCostForProject(projectId,currency){return mailShippingSum("incoming","project",projectId,currency)}

/* Timeline + inventory/financial integration lives on the Actions object, following the app's own convention. */
Actions.addMail=function(data){
  const payload=Object.assign(mailDefaultRecord(),data);
  payload.trackingUrl=mailNormalizeUrl(payload.trackingUrl);
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
  const canDeliver=mailIsActive(m)&&m.status!=="delivered";
  const row=(label,val)=>'<div class="pn-mail-card-row"><span>'+label+"</span>"+val+"</div>";
  return'<div class="panel pn-mail-card">'+
    '<div class="pn-mail-card-head">'+dirChip+statusChip+"</div>"+
    '<div class="pn-mail-card-desc">'+escHtml(m.description||"(no description)")+"</div>"+
    row("CARRIER","<b>"+escHtml(m.carrier||"—")+"</b>")+
    (m.trackingNumber||mailSafeUrl(m.trackingUrl)?'<div class="pn-mail-card-row pn-mail-track"><span>TRACKING</span>'+
      (m.trackingNumber?'<b class="mono">'+escHtml(m.trackingNumber)+'</b><button type="button" class="btn btn-sm btn-ghost" data-mail-copy="'+escAttr(m.trackingNumber)+'">COPY TRACKING</button>':"<b class=\"mono\">—</b>")+
      (mailSafeUrl(m.trackingUrl)?'<a class="btn btn-sm btn-ghost" href="'+escAttr(mailSafeUrl(m.trackingUrl))+'" target="_blank" rel="noopener noreferrer">TRACK ONLINE ↗</a>':"")+
      "</div>":"")+
    row("SHIPPING","<b>"+money(m.shippingCost||0,m.currency)+"</b>")+
    row("SENT","<b>"+(m.dateSent?fmtDate(m.dateSent):"—")+"</b>")+
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
    mailFieldRow("Actual Delivery",'<input type="date" data-mail-path="actualDeliveryDate" value="'+escAttr(d.actualDeliveryDate)+'">',true)+
    mailFieldRow("Notes",'<textarea data-mail-path="notes">'+escHtml(d.notes)+"</textarea>");
  return'<div class="modal-backdrop" data-mail-close><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>'+(isEdit?"EDIT SHIPMENT":"NEW SHIPMENT")+'</h3><button type="button" class="modal-close" data-mail-close aria-label="Close">✕</button></div><div class="modal-body"><div class="field-row-wrap" style="display:flex;flex-wrap:wrap;gap:0 14px">'+body+'</div></div><div class="modal-foot">'+(isEdit?'<button type="button" class="btn btn-danger" data-mail-delete="'+d.id+'">DELETE</button>':"<span></span>")+'<span style="display:flex;gap:8px"><button type="button" class="btn" data-mail-cancel>CANCEL</button><button type="button" class="btn btn-primary" data-mail-save>'+(isEdit?"SAVE CHANGES":"CREATE")+"</button></span></div></div></div>";
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

  return pageHeader("MAIL",items.length+" of "+mailAll().length+" shipments",'<button type="button" class="btn btn-primary" data-mail-add>+ ADD SHIPMENT</button>')+
    '<div class="content">'+mailSummaryHtml()+offer+controls+cards+"</div>"+
    (state.mailDraft?mailModalHtml():"");
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
}
function mailFormInput(e){
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
  "@media(max-width:1180px){.pn-mail-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pn-mail-summary-cell:nth-child(2n){border-right:0}}"+
  "@media(max-width:720px){.pn-mail-controls{flex-direction:column;align-items:stretch}.pn-mail-controls input{width:100%}.pn-mail-filters{width:100%}.pn-mail-filter{flex:1}}";
  document.head.appendChild(style);
})();
