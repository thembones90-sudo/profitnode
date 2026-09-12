"use strict";
const PB_CATALOG_SLOTS=["CPU","GPU","MOBO","RAM","STORAGE"];
const PBUI={slotKey:null,slot:null,catalogHits:[],extraDraft:null,notice:null};
function pbProject(){return state.pbId?Store.get("projects",state.pbId):null}
function pbSetNotice(tone,text){PBUI.notice={tone:tone,text:text}}
function pbVerdictMeta(level){
  if("FAIL"===level)return{word:"RED",chip:"chip-red"};
  if("WARNING"===level||"WARN"===level)return{word:"AMBER",chip:"chip-amber"};
  if("PASS"===level)return{word:"GREEN",chip:"chip-green"};
  return{word:"AMBER",chip:"chip-amber-outline"}
}
function pbNoticeHtml(){const n=PBUI.notice;return n?'<div class="pn-myrig-notice'+("ok"===n.tone?" ok":"")+'">'+escHtml(n.text)+"</div>":""}
function pbFocusSlotField(k){
  if(!PBUI.slot)return
  const sel="VAULT"===PBUI.slot.mode?"select[data-pb-vault-item]":PB_CATALOG_SLOTS.includes(k)?'[data-pb-catalog-search="'+k+'"]':'[data-pb-field="label"]'
  const el=document.querySelector(sel)
  if(el&&el.focus){el.focus();if("function"==typeof el.select)el.select()}
}
function pbAvailableVaultItems(project,category){
  return Store.all("inventory").filter(i=>i.category===category&&(!i.assignedProjectId||i.assignedProjectId===project.id)&&"SOLD"!==i.status)
    .slice().sort((a,b)=>(a.manufacturer+a.model).localeCompare(b.manufacturer+b.model))
}
function pbSlotCardHtml(project,slotKey,locked){
  const slot=project.slots&&project.slots[slotKey]||null,cat=RIG_SLOT_CATEGORY[slotKey],label=RIG_SLOT_LABELS[slotKey]
  const acc=CATEGORY_META[cat]?' style="--pb-acc:'+CATEGORY_META[cat][0]+'"':""
  if(!slot)return'<div class="pn-pb-slot is-empty"'+acc+'><div class="pn-pb-slot-head"><span class="pn-cat-label '+categoryColorClass(cat)+'">'+label+'</span></div><div class="pn-pb-slot-model">EMPTY SLOT</div>'+(locked?"":'<button type="button" class="btn btn-sm" style="margin-top:auto" data-pb-edit-slot="'+slotKey+'">+ ADD '+label.toUpperCase()+'</button>')+"</div>"
  const r=rigSlotResolved(slot,project.currency,slotKey)
  const tierChip=r&&r.pn&&r.pn.tier?'<span class="chip pn-tier-chip '+pnTierClass(r.pn.tierIndex)+'">'+r.pn.tier+"</span>":""
  const ownTag="INVENTORY"===slot.kind?(r&&r.status?'<span class="chip '+(INVENTORY_STATUS_META[r.status]||{chip:"chip-muted"}).chip+'">'+STATUS_LABEL(r.status)+"</span>":""):'<span class="chip chip-blue-outline">PLANNED — NOT YET OWNED</span>'
  const vaultLink="INVENTORY"===slot.kind&&slot.inventoryItemId?'<button type="button" class="pn-pb-vault-link" data-open-entity="inventory" data-id="'+escAttr(slot.inventoryItemId)+'" title="Open in Parts Vault">VAULT ↗</button>':""
  const cost=r?money(r.cost,project.currency):""
  return'<div class="pn-pb-slot"'+acc+' data-pb-slot="'+slotKey+'"><div class="pn-pb-slot-head"><span class="pn-cat-label '+categoryColorClass(cat)+'">'+label+"</span>"+vaultLink+(locked?"":'<button type="button" class="btn btn-sm" style="margin-left:auto" data-pb-edit-slot="'+slotKey+'">'+("PLANNED"===slot.kind?"EDIT":"SWAP")+"</button>")+'</div><div class="pn-pb-slot-model">'+escHtml(r?r.label:"(unnamed part)")+'</div><div class="pn-pb-slot-foot">'+(cost?"<span>"+cost+"</span>":"")+tierChip+ownTag+"</div>"+(locked?"":'<button type="button" class="btn btn-sm btn-ghost" style="margin-top:6px" data-pb-remove-slot="'+slotKey+'">REMOVE</button>')+"</div>"
}
function pbSlotEditorHtml(project){
  const k=PBUI.slotKey,d=PBUI.slot||{},cat=RIG_SLOT_CATEGORY[k],isCat=PB_CATALOG_SLOTS.includes(k)
  const vault=pbAvailableVaultItems(project,cat)
  const modeOpts='<option value="VAULT"'+("VAULT"===d.mode?" selected":"")+">FROM PARTS VAULT</option><option value=\"PLANNED\""+("PLANNED"===d.mode?" selected":"")+">ADD NEW (NOT YET OWNED)</option>"
  let body=""
  if("VAULT"===d.mode){
    body=vault.length?'<label class="field" style="flex:1 1 100%"><span>SELECT COMPATIBLE OWNED PART</span><select data-pb-vault-item><option value="">— select '+cat.toLowerCase()+' —</option>'+vault.map(v=>{
      const already=v.assignedProjectId&&v.assignedProjectId!==project.id
      return'<option value="'+v.id+'"'+(d.inventoryItemId===v.id?" selected":"")+(already?" disabled":"")+">"+escHtml(v.manufacturer+" "+v.model)+" — "+STATUS_LABEL(v.condition)+" · "+money(v.purchasePrice,v.currency)+" · "+STATUS_LABEL(v.status)+"</option>"
    }).join("")+"</select></label>":'<p class="hint" style="flex:1 1 100%">No compatible unreserved '+cat.toLowerCase()+' in the Parts Vault — add one to Inventory first, or add a planned part below.</p>'
  }else{
    const hits=PBUI.catalogHits||[]
    body=(isCat?'<label class="field" style="flex:1 1 100%"><span>PART NAME</span><input type="text" data-pb-catalog-search="'+k+'" value="'+escAttr(d.label||"")+'" placeholder="Start typing to search the catalog…" autocomplete="off"></label>'
        +(hits.length?'<div class="myrig-catalog-results" style="flex:1 1 100%;max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:4px">'+hits.map((h,i)=>'<button type="button" class="btn btn-sm btn-ghost" data-pb-catalog-pick="'+i+'" style="display:flex;justify-content:space-between;width:100%;text-align:left;padding:5px 8px">'+escHtml(h.brand+" "+h.model)+"</button>").join("")+"</div>":"")
      :'<label class="field" style="flex:1 1 100%"><span>PART NAME</span><input type="text" data-pb-field="label" value="'+escAttr(d.label||"")+'" placeholder="e.g. BeQuiet Pure Power 750W" autocomplete="off"></label>')
      +'<label class="field"><span>ESTIMATED COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-field="cost" value="'+escAttr(d.cost||"")+'"></label>'
      +'<label class="field" style="flex:1 1 100%"><span>NOTES</span><input type="text" data-pb-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
  }
  return'<div class="panel pn-myrig-edit" style="margin-top:12px"><div class="panel-head"><h2>'+RIG_SLOT_LABELS[k].toUpperCase()+"</h2></div><div class=\"panel-body\"><div class=\"pn-myrig-fgrid\"><label class=\"field\" style=\"flex:1 1 100%\"><span>SOURCE</span><select data-pb-slot-mode>"+modeOpts+"</select></label>"+body+'</div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-save-slot="'+k+'">SAVE COMPONENT</button><button type="button" class="btn btn-sm" data-pb-cancel-slot>CANCEL</button></div></div></div>'
}
function pbExtraFormHtml(project){
  const d=PBUI.extraDraft||{},vault=Store.all("inventory").filter(i=>(!i.assignedProjectId||i.assignedProjectId===project.id)&&"SOLD"!==i.status).slice().sort((a,b)=>(a.manufacturer+a.model).localeCompare(b.manufacturer+b.model))
  return'<div class="panel pn-myrig-edit" style="margin-top:12px"><div class="panel-head"><h2>ADD EXTRA / OPTIONAL PART</h2></div><div class="panel-body"><div class="pn-myrig-fgrid">'
    +'<label class="field" style="flex:1 1 100%"><span>FROM PARTS VAULT (OPTIONAL)</span><select data-pb-extra-field="inventoryItemId"><option value="">— manual entry —</option>'+vault.map(v=>'<option value="'+v.id+'"'+(d.inventoryItemId===v.id?" selected":"")+">"+escHtml(v.category+" — "+v.manufacturer+" "+v.model)+"</option>").join("")+"</select></label>"
    +'<label class="field" style="flex:1 1 100%"><span>NAME</span><input type="text" data-pb-extra-field="label" value="'+escAttr(d.label||"")+'" placeholder="e.g. RGB fan pack"></label>'
    +'<label class="field"><span>COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-extra-field="cost" value="'+escAttr(d.cost||"")+'" '+(d.inventoryItemId?"readonly":"")+'></label>'
    +'<label class="field" style="flex:1 1 100%"><span>NOTES</span><input type="text" data-pb-extra-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
    +'</div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-extra-save>ADD PART</button><button type="button" class="btn btn-sm" data-pb-extra-cancel>CANCEL</button></div></div></div>'
}
function pbExtrasHtml(project,locked){
  const extras=project.extras||[]
  const rows=extras.length?extras.map(x=>'<div class="pn-pb-extra-row"><span>'+escHtml(x.label)+"</span>"+(x.inventoryItemId?'<button type="button" class="pn-pb-vault-link" data-open-entity="inventory" data-id="'+escAttr(x.inventoryItemId)+'">VAULT ↗</button>':'<span class="chip chip-blue-outline">PLANNED</span>')+"<span>"+money(x.cost,x.currency||project.currency)+"</span>"+(locked?"":'<button type="button" class="btn btn-sm btn-ghost" data-pb-extra-remove="'+x.id+'">REMOVE</button>')+"</div>").join(""):'<p class="hint">No optional or extra parts added.</p>'
  return'<div class="panel" data-pb-extras><div class="panel-head"><h2>OPTIONAL / EXTRA PARTS</h2>'+(locked?"":'<button type="button" class="btn btn-sm" data-pb-extra-new>+ ADD PART</button>')+'</div><div class="panel-body"><div class="pn-pb-extra-list">'+rows+"</div></div></div>"+(PBUI.extraDraft?pbExtraFormHtml(project):"")
}
function pbCompatHtml(project){
  const model=buildCheckModel({id:project.id,currency:project.currency,slots:project.slots||emptyRigSlots()}),v=pbVerdictMeta(model.verdict)
  const rows=model.findings.length?model.findings.map(f=>{const lv=bcStatus(f.status),vm=pbVerdictMeta("FAIL"===lv?"FAIL":"WARN"===lv?"WARNING":"UNVERIFIED"===lv?"UNVERIFIED":"PASS")
    return'<div class="pn-integrity-row is-'+lv.toLowerCase()+'"><b>'+escHtml(String(f.label).toUpperCase())+" — "+vm.word+'</b><span>'+escHtml(f.detail)+"</span></div>"}).join(""):'<div class="pn-integrity-row is-pass"><b>PASS</b><span>Every available compatibility check is verified compatible.</span></div>'
  return'<div class="panel" data-pb-compat><div class="panel-head"><h2>COMPATIBILITY CHECK</h2><span class="chip '+v.chip+'">'+v.word+" — "+model.verdict+'</span></div><div class="panel-body"><div class="pn-integrity-list">'+rows+"</div></div></div>"
}
function renderProjectBuild(){
  const p=pbProject()
  if(!p)return pageHeader("BUILD WORKSPACE","","")+'<div class="content"><div class="panel"><div class="panel-body"><p class="hint">This project could not be found — it may have been deleted.</p><button type="button" class="btn" data-pb-back style="margin-top:10px">BACK TO PROJECTS</button></div></div></div>'
  const purp=PROJECT_PURPOSES.includes(p.purpose)?p.purpose:"FLIP",locked="COMPLETED"===p.status
  const stats=Actions.projectBuildStats(p),invested=Actions.projectTotalInvestment(p),planned=stats.plannedCost
  const grid=PROJECT_BUILD_SLOTS.map(k=>pbSlotCardHtml(p,k,locked)).join("")
  const tierLine=locked&&p.finalTier?'<div class="pn-myrig-meta-item">FINAL TIER: '+escHtml(p.finalTier)+"</div>":""
  const hero='<div class="panel pn-pb-hero"><div class="pn-pb-eyebrow">BUILD WORKSPACE</div><h1 class="pn-pb-name">'+escHtml(p.name)+'</h1><div class="pn-myrig-meta"><span class="chip '+PROJECT_STATUS_META[p.status].chip+'">'+STATUS_LABEL(p.status)+'</span><span class="chip '+PROJECT_PURPOSE_META[purp].chip+'">'+PROJECT_PURPOSE_LABEL[purp]+"</span>"+tierLine+'</div><div class="pn-pb-hero-actions"><button type="button" class="btn btn-sm" data-pb-back>← BACK TO PROJECTS</button><button type="button" class="btn btn-sm" data-pb-edit-details>EDIT DETAILS</button>'+(locked?'<span class="chip chip-green-outline">BUILD LOCKED</span>':'<button type="button" class="btn btn-sm btn-primary" data-pb-mark-complete>MARK BUILD COMPLETE</button>')+"</div></div>"
  const statsRow='<div class="panel"><div class="panel-body"><div class="pn-myrig-vstats" style="grid-template-columns:repeat(4,1fr)"><div class="pn-myrig-vstat"><span>BUILD COST</span><b>'+money(invested,p.currency)+'</b><em>parts on hand + additional costs</em></div><div class="pn-myrig-vstat"><span>PLANNED COST</span><b>'+(planned?money(planned,p.currency):"—")+'</b><em>not-yet-purchased parts</em></div><div class="pn-myrig-vstat"><span>EST. VALUE</span><b>'+(p.estimatedMarketValue?money(p.estimatedMarketValue,p.currency):"—")+'</b><em>manual estimate</em></div><div class="pn-myrig-vstat"><span>COMPLETION</span><b>'+stats.completionPct+"%</b><em>"+stats.slotsFilled+" / "+stats.slotsTotal+" slots filled</em></div></div></div></div>"
  return pageHeader("BUILD WORKSPACE",p.name,"")+'<div class="content">'+pbNoticeHtml()+hero+statsRow+'<div class="panel" data-pb-loadout><div class="panel-head"><h2>COMPONENT LOADOUT</h2></div><div class="panel-body"><div class="pn-pb-grid">'+grid+"</div></div></div>"+(PBUI.slotKey?pbSlotEditorHtml(p):"")+pbExtrasHtml(p,locked)+pbCompatHtml(p)+"</div>"
}
function pbClick(e){
  if(e.target.closest("[data-pb-back]"))return state.route="projects",state.pbId=null,PBUI.slotKey=null,PBUI.slot=null,PBUI.extraDraft=null,PBUI.notice=null,void render()
  if(e.target.closest("[data-pb-edit-details]")){const p=pbProject();return p?void openForm("project",p.id):void 0}
  const es=e.target.closest("[data-pb-edit-slot]");if(es){const p=pbProject();if(!p)return;const k=es.dataset.pbEditSlot,cur=p.slots&&p.slots[k]||null
    PBUI.slotKey=k;PBUI.catalogHits=[]
    PBUI.slot=cur?("INVENTORY"===cur.kind?{mode:"VAULT",inventoryItemId:cur.inventoryItemId}:{mode:"PLANNED",label:cur.label||"",cost:cur.cost||0,notes:cur.notes||""}):{mode:"PLANNED",inventoryItemId:"",label:"",cost:0,notes:""}
    render();return void pbFocusSlotField(k)}
  if(e.target.closest("[data-pb-cancel-slot]"))return PBUI.slotKey=null,PBUI.slot=null,void render()
  const ss=e.target.closest("[data-pb-save-slot]");if(ss){const p=pbProject();if(!p)return;const k=ss.dataset.pbSaveSlot,d=PBUI.slot||{}
    let res
    if("VAULT"===d.mode){if(!d.inventoryItemId)return pbSetNotice("err","Select a part from the vault, or switch to ADD NEW."),void render()
      res=Actions.setProjectSlot(p.id,k,"INVENTORY",{inventoryItemId:d.inventoryItemId})}
    else{if(!String(d.label||"").trim())return pbSetNotice("err","Enter a part name."),void render()
      res=Actions.setProjectSlot(p.id,k,"PLANNED",{label:String(d.label).trim(),cost:Math.round(Number(d.cost)||0),notes:String(d.notes||"").trim(),currency:p.currency,catalogType:PB_CATALOG_SLOTS.includes(k)?k:void 0})}
    PBUI.slotKey=null,PBUI.slot=null
    return pbSetNotice(res.ok?"ok":"err",res.ok?"Component saved.":res.error),void render()}
  const rs=e.target.closest("[data-pb-remove-slot]");if(rs){if("1"!==rs.dataset.armed)return rs.dataset.armed="1",rs.textContent="CONFIRM REMOVE?",void 0
    const p=pbProject();if(!p)return;const res=Actions.clearProjectSlot(p.id,rs.dataset.pbRemoveSlot)
    return pbSetNotice(res.ok?"ok":"err",res.ok?"Component removed.":res.error),void render()}
  if(e.target.closest("[data-pb-catalog-pick]")){const btn=e.target.closest("[data-pb-catalog-pick]"),idx=+btn.dataset.pbCatalogPick,hit=(PBUI.catalogHits||[])[idx]
    if(hit&&PBUI.slot){PBUI.slot.label=hit.brand+" "+hit.model;PBUI.catalogHits=[];return void render()}}
  if(e.target.closest("[data-pb-extra-new]"))return PBUI.extraDraft={label:"",cost:0,notes:"",inventoryItemId:null},void render()
  if(e.target.closest("[data-pb-extra-cancel]"))return PBUI.extraDraft=null,void render()
  if(e.target.closest("[data-pb-extra-save]")){const p=pbProject();if(!p)return;const d=PBUI.extraDraft||{},res=Actions.addProjectExtra(p.id,d)
    return PBUI.extraDraft=res.ok?null:PBUI.extraDraft,pbSetNotice(res.ok?"ok":"err",res.ok?"Part added.":res.error),void render()}
  const er=e.target.closest("[data-pb-extra-remove]");if(er){const p=pbProject();if(!p)return;const res=Actions.removeProjectExtra(p.id,er.dataset.pbExtraRemove)
    return pbSetNotice(res.ok?"ok":"err",res.ok?"Part removed.":res.error),void render()}
  if(e.target.closest("[data-pb-mark-complete]")){const btn=e.target.closest("[data-pb-mark-complete]")
    if("1"!==btn.dataset.armed)return btn.dataset.armed="1",btn.textContent="CONFIRM — LOCK BUILD?",void 0
    const p=pbProject();if(!p)return;const res=Actions.markProjectBuildComplete(p.id)
    return pbSetNotice(res.ok?"ok":"err",res.ok?"Build marked complete.":res.error),void render()}
}
function pbInput(e){
  const t=e.target
  if(t.matches&&t.matches("[data-pb-catalog-search]")){const val=t.value||"",k=t.dataset.pbCatalogSearch
    if(PBUI.slot)PBUI.slot.label=val
    PBUI.catalogHits=val.length>=2&&typeof catalogSearch==="function"?catalogSearch(k,val,8):[]
    render();const next=document.querySelector('[data-pb-catalog-search="'+k+'"]')
    if(next){next.focus();if(next.setSelectionRange)next.setSelectionRange(next.value.length,next.value.length)}
    return}
  if(t.matches&&t.matches("[data-pb-field]")&&PBUI.slot)return void(PBUI.slot[t.dataset.pbField]=t.value)
  if(t.matches&&t.matches("[data-pb-extra-field]")&&PBUI.extraDraft){const f=t.dataset.pbExtraField
    if("inventoryItemId"===f){const item=t.value?Store.get("inventory",t.value):null
      PBUI.extraDraft.inventoryItemId=t.value||null
      if(item){PBUI.extraDraft.label=item.manufacturer+" "+item.model;PBUI.extraDraft.cost=item.purchasePrice||0}
      return void render()}
    return void(PBUI.extraDraft[f]=t.value)}
}
function pbChange(e){
  const m=e.target.closest("select[data-pb-slot-mode]");if(m&&PBUI.slot){PBUI.slot.mode=m.value;PBUI.catalogHits=[];render();return void pbFocusSlotField(PBUI.slotKey)}
  const vi=e.target.closest("select[data-pb-vault-item]");if(vi&&PBUI.slot){PBUI.slot.inventoryItemId=vi.value;return void render()}
  const ef=e.target.closest("select[data-pb-extra-field]");if(ef)return void pbInput(e)
}
document.addEventListener("click",pbClick)
document.addEventListener("input",pbInput)
document.addEventListener("change",pbChange)
if(typeof document!=="undefined"&&document.addEventListener){
  const s=document.createElement("style")
  s.textContent=".pn-pb-hero{border:1px solid var(--border-strong);border-radius:var(--radius);padding:18px;background:linear-gradient(135deg,rgba(160,180,200,.06),rgba(160,180,200,.02) 60%)}.pn-pb-eyebrow{font:9px var(--mono);letter-spacing:.24em;color:#9fb4c8;margin-bottom:6px}.pn-pb-name{font-size:32px;line-height:1.1;font-weight:900;margin:0 0 10px}.pn-pb-hero-actions{margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pn-pb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.pn-pb-slot{border:1px solid var(--border);border-left:3px solid var(--pb-acc,#8b8495);background:var(--surface-2);border-radius:var(--radius);padding:10px 12px;display:flex;flex-direction:column;gap:5px}.pn-pb-slot.is-empty{background:transparent;border-left-color:var(--border-strong);opacity:.75}.pn-pb-slot-head{display:flex;align-items:center;gap:8px}.pn-pb-slot-model{font-weight:800;font-size:13px;line-height:1.25}.pn-pb-slot-foot{display:flex;align-items:center;gap:8px;font:9px var(--mono);color:var(--text-muted);margin-top:auto;flex-wrap:wrap}.pn-pb-vault-link{font:8px var(--mono);letter-spacing:.12em;color:#9fb4c8;border:1px solid var(--border-strong);padding:1px 5px;border-radius:6px;background:transparent;cursor:pointer}.pn-pb-vault-link:hover{color:var(--text);border-color:#9fb4c8}.pn-pb-extra-list{display:flex;flex-direction:column;gap:6px}.pn-pb-extra-row{display:flex;align-items:center;gap:10px;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--radius);padding:8px 10px;flex-wrap:wrap}.pn-pb-extra-row>span:first-child{flex:1;font-weight:700;font-size:12px}@media(max-width:760px){.pn-pb-grid{grid-template-columns:1fr}}"
  document.head.appendChild(s)
  if(typeof ROUTES!=="undefined"&&!window.__PN_PROJECT_BUILD_REGISTERED){
    ROUTES.push({key:"projectbuild",label:"Build Workspace",hidden:!0,render:renderProjectBuild})
    window.__PN_PROJECT_BUILD_REGISTERED=!0
  }
}
