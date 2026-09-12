"use strict";
const PB_CATALOG_SLOTS=["CPU","GPU","MOBO","RAM","STORAGE","PSU","COOLER"];
const PB_QUALITY_TIERS=["POOR","COMMON","UNCOMMON","RARE","EPIC","LEGENDARY"];
function pbCaseSizeById(id){return PB_CASE_SIZES.find(c=>c.id===id)||null}
const PBUI={slotKey:null,slot:null,catalogHits:[],ramHits:[],quickPrice:null,extraDraft:null,notice:null};

// ---- RAM module search index (SECTION 10-19 of the assembly rework) ----
// HardwareCatalog.ramFamilies only carries brand+series (+ real commercial
// kits for ~12/110 families). To make capacity the primary search axis
// (spec: typing "8GB" means ONE MODULE = 8GB, not system total) we expand
// every family into concrete per-DIMM rows: real rows from that family's
// own kits[] (capacity/sticks -> true per-module capacity, never guessed),
// plus synthesized rows at each policy-supported per-module capacity for
// families with no kit data, using that technology's representative
// speed/CAS default — the same defaults the rest of the app already falls
// back to for RAM without richer info (app_core.js/ram_revaluation
// defaults{DDR4,DDR5}), so this stays consistent with existing scoring.
let PB_RAM_INDEX_CACHE=null;
function pbRamModuleIndex(){
  const families=(typeof HardwareCatalog!=="undefined"&&HardwareCatalog.ramFamilies)||[]
  if(PB_RAM_INDEX_CACHE&&PB_RAM_INDEX_CACHE.families===families)return PB_RAM_INDEX_CACHE.rows
  const defaults={DDR4:{speed:3200,casLatency:16},DDR5:{speed:6000,casLatency:30}}
  const capOptions=(HardwareCatalog.ramSupported&&HardwareCatalog.ramSupported.per_module_gb)||[4,8,16,24,32,48,64]
  const rows=[]
  families.forEach(f=>{
    const brand=f.brand||"",series=f.series||f.model||""
    const tech=("DDR4"===f.technology||"DDR5"===f.technology)?f.technology:(/DDR5/i.test(series)?"DDR5":"DDR4")
    const kits=Array.isArray(f.kits)?f.kits:[]
    if(kits.length){
      kits.forEach(kit=>{
        const sticks=Number(kit.sticks)||0,cap=Number(kit.capacity)||0
        if(!cap||!sticks)return
        rows.push({brand,series,technology:tech,speed:Number(kit.speed)||defaults[tech].speed,casLatency:Number(kit.cas)||defaults[tech].casLatency,perModuleCapacity:Math.round(cap/sticks),suggestedCount:sticks,isKit:!0,kitTotalCapacity:cap})
      })
    }else{
      capOptions.forEach(cap=>{
        rows.push({brand,series,technology:tech,speed:defaults[tech].speed,casLatency:defaults[tech].casLatency,perModuleCapacity:cap,suggestedCount:2,isKit:!1})
      })
    }
  })
  PB_RAM_INDEX_CACHE={families,rows}
  return rows
}
function pbRamRowLabel(row){
  return(row.brand+" "+row.series).trim()+" "+row.technology+" "+row.speed+" CL"+row.casLatency+" "+row.perModuleCapacity+"GB"
}
// The persisted slot.label stays a clean brand/series name only — the
// DDR/speed/CL/capacity detail is appended once, downstream, by
// rigSlotResolved's own RAM branch. Storing the rich pbRamRowLabel() text
// here as well would double-print that detail on the slot card.
function pbRamBaseLabel(row){
  return(row.brand+" "+row.series).trim()
}
function pbRamSearch(query,limit){
  const rows=pbRamModuleIndex(),norm=pnNorm(query)
  if(norm.length<1)return[]
  const tokens=norm.split(" ").filter(Boolean)
  const scored=[]
  rows.forEach(row=>{
    const capTok=row.perModuleCapacity+"GB"
    // Capacity/count tokens (e.g. "8GB") must match a hay token EXACTLY —
    // substring matching would let "8GB" spuriously match "48GB" (section
    // 12 makes capacity precision the whole point of this search). Brand
    // and series words still match by substring so partial names work.
    const hayTokens=pnNorm(row.brand+" "+row.series+" "+row.technology+" "+row.speed+" "+capTok+" CL"+row.casLatency).split(" ").filter(Boolean)
    const tokenMatches=t=>/^\d+GB$/.test(t)?hayTokens.includes(t):hayTokens.some(h=>h.includes(t))
    if(!tokens.every(tokenMatches))return
    const capExact=tokens.some(t=>t===capTok)
    scored.push({row,capExact,label:pnNorm(row.brand+" "+row.series)})
  })
  scored.sort((a,b)=>(a.capExact?0:1)-(b.capExact?0:1)||(a.row.isKit?0:1)-(b.row.isKit?0:1)||a.label.localeCompare(b.label))
  const seen=new Set(),out=[]
  for(const s of scored){
    const key=s.row.brand+"|"+s.row.series+"|"+s.row.technology+"|"+s.row.speed+"|"+s.row.perModuleCapacity+"|"+s.row.casLatency
    if(seen.has(key))continue
    seen.add(key);out.push(s.row)
    if(out.length>=(limit||10))break
  }
  return out
}

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
  if(k==="RAM"&&"PLANNED"===PBUI.slot.mode&&!PBUI.slot.ramPicked){const el=document.querySelector("[data-pb-ram-search]");if(el&&el.focus)el.focus();return}
  const sel="VAULT"===PBUI.slot.mode?"select[data-pb-vault-item]":PB_CATALOG_SLOTS.includes(k)||"CASE"===k?'[data-pb-catalog-search="'+k+'"]':'[data-pb-field="label"]'
  const el=document.querySelector(sel)
  if(el&&el.focus){el.focus();if("function"==typeof el.select)el.select()}
}
function pbAvailableVaultItems(project,category){
  return Store.all("inventory").filter(i=>i.category===category&&(!i.assignedProjectId||i.assignedProjectId===project.id)&&"SOLD"!==i.status)
    .slice().sort((a,b)=>(a.manufacturer+a.model).localeCompare(b.manufacturer+b.model))
}
function pbComponentQuality(slot,slotKey,resolved){
  const r=resolved||null,label=String(r&&r.label||slot&&slot.label||"").trim();
  let sourceTier=r&&r.pn&&r.pn.tier?String(r.pn.tier).toUpperCase():"",source=sourceTier?"HARDWARE CATALOG":"";
  if(!sourceTier&&label&&!(r&&r.missing)&&typeof pnPartNameTier==="function"){
    const item=r&&r.item?r.item:{category:RIG_SLOT_CATEGORY[slotKey]||"OTHER",manufacturer:"",model:label};
    const visual=pnPartNameTier(item);
    sourceTier=visual&&visual.key?String(visual.key).toUpperCase():"";
    source=visual&&visual.source==="catalog"?"PARTS VAULT CATALOG":"PARTS VAULT QUALITY";
  }
  const key="ARTIFACT"===sourceTier?"LEGENDARY":PB_QUALITY_TIERS.includes(sourceTier)?sourceTier:"UNRATED";
  return{key:key,sourceTier:sourceTier||"UNRATED",source:source||"NO CANONICAL RATING",className:pnTierClass(key)};
}
function pbQualityChipHtml(quality){
  return'<span class="pn-pb-quality '+quality.className+'" data-pb-quality-badge="'+quality.key+'" data-pb-quality-source-tier="'+quality.sourceTier+'" title="PROFITNODE quality: '+quality.key+' · '+escAttr(quality.source)+'">'+quality.key+"</span>";
}
function pbExtraQuality(extra){
  const item=extra&&extra.inventoryItemId?Store.get("inventory",extra.inventoryItemId):null;
  if(!item)return pbComponentQuality(null,null,null);
  const slotKey="MOTHERBOARD"===item.category?"MOBO":"COOLING"===item.category?"COOLER":item.category;
  return pbComponentQuality({kind:"INVENTORY",inventoryItemId:item.id},slotKey,rigSlotResolved({kind:"INVENTORY",inventoryItemId:item.id},extra.currency||item.currency,slotKey));
}

// ---- per-slot PAID / PLANNED COST amount (SECTION 1 & 3) ----
// Owned (VAULT) parts: the true acquisition price is the linked inventory
// item's own purchase price (+ logged repairs/shipping via
// inventoryAcquisitionCost) — never a separate duplicated figure. Planned
// parts: the manually estimated cost on the slot itself.
function pbPaidAmount(project,slot){
  if(!slot)return 0
  if("INVENTORY"===slot.kind){const item=Store.get("inventory",slot.inventoryItemId);return item?inventoryAcquisitionCost(item,project.currency):0}
  return Math.round(Number(slot.cost)||0)
}
function pbRamConfigLine(slot){
  const ram=slot&&slot.ram
  if(ram&&ram.moduleCount&&ram.perModuleCapacity)return ram.moduleCount+" x "+ram.perModuleCapacity+"GB / "+(ram.moduleCount*ram.perModuleCapacity)+"GB TOTAL"
  return""
}
function pbSlotCardHtml(project,slotKey,locked){
  const slot=project.slots&&project.slots[slotKey]||null,cat=RIG_SLOT_CATEGORY[slotKey],label=RIG_SLOT_LABELS[slotKey]
  const acc=CATEGORY_META[cat]?' style="--pb-acc:'+CATEGORY_META[cat][0]+'"':""
  if(!slot)return'<div class="pn-pb-slot is-empty"'+acc+'><div class="pn-pb-slot-head"><span class="pn-cat-label '+categoryColorClass(cat)+'">'+label+'</span></div><div class="pn-pb-slot-model">EMPTY SLOT</div>'+(locked?"":'<button type="button" class="btn btn-sm" style="margin-top:auto" data-pb-edit-slot="'+slotKey+'">+ ADD '+label.toUpperCase()+'</button>')+"</div>"
  const isGenericCase=slotKey==="CASE"&&slot.genericCaseSizeId
  const r=rigSlotResolved(slot,project.currency,slotKey)
  const quality=isGenericCase?{key:"UNRATED",sourceTier:"UNRATED",source:"GENERIC CASE SIZE",className:pnTierClass("UNRATED")}:pbComponentQuality(slot,slotKey,r)
  const tierChip=pbQualityChipHtml(quality)
  const owned="INVENTORY"===slot.kind
  const ownTag=isGenericCase?'<span class="chip chip-blue-outline">PLANNED — MODEL NOT SELECTED</span>':(owned?(r&&r.status?'<span class="chip '+(INVENTORY_STATUS_META[r.status]||{chip:"chip-muted"}).chip+'">VAULT · '+STATUS_LABEL(r.status)+"</span>":""):'<span class="chip chip-blue-outline">PLANNED · NOT YET OWNED</span>')
  const genericNote=isGenericCase&&slot.genericCaseSizeId?PB_CASE_SIZES.find(c=>c.id===slot.genericCaseSizeId)?.unverifiedPhysical?'<span class="chip chip-amber-outline" title="No GPU/cooler/PSU/radiator clearance data for open bench">⚠ PHYSICAL CONSTRAINTS UNVERIFIED</span>':"":""
  const vaultLink=owned&&slot.inventoryItemId?'<button type="button" class="pn-pb-vault-link" data-open-entity="inventory" data-id="'+escAttr(slot.inventoryItemId)+'" title="Open in Parts Vault">VAULT ↗</button>':""
  const modelLabel=isGenericCase?slot.label:(r?r.label:"(unnamed part)")
  const paid=pbPaidAmount(project,slot)
  const priceLabel=owned?"PAID":"PLANNED COST"
  const isQuickEdit=!locked&&PBUI.quickPrice&&PBUI.quickPrice.slotKey===slotKey
  const priceLine=isQuickEdit
    ?'<span class="pn-pb-price-edit"><input type="number" min="0" step="1" data-pb-quick-price-input="'+slotKey+'" value="'+escAttr(PBUI.quickPrice.value)+'" style="width:92px"><button type="button" class="btn btn-sm btn-primary" data-pb-quick-price-save="'+slotKey+'">SAVE</button><button type="button" class="btn btn-sm btn-ghost" data-pb-quick-price-cancel>×</button></span>'
    :('<span class="pn-pb-price"><b>'+priceLabel+" "+money(paid,project.currency)+"</b>"+(locked?"":'<button type="button" class="pn-pb-price-edit-btn" data-pb-quick-price="'+slotKey+'">EDIT</button>')+"</span>")
  const ramLine=slotKey==="RAM"?pbRamConfigLine(slot):""
  return'<div class="pn-pb-slot"'+acc+' data-pb-slot="'+slotKey+'" data-pb-quality="'+quality.key+'"><div class="pn-pb-slot-head"><span class="pn-cat-label '+categoryColorClass(cat)+'">'+label+"</span>"+vaultLink+(locked?"":'<button type="button" class="btn btn-sm" style="margin-left:auto" data-pb-edit-slot="'+slotKey+'">'+("PLANNED"===slot.kind?"EDIT":"SWAP")+"</button>")+'</div><div class="pn-pb-slot-model-line"><div class="pn-pb-slot-model pn-pb-quality-name '+quality.className+'">'+escHtml(modelLabel)+"</div>"+tierChip+"</div>"+(ramLine?'<div class="pn-pb-ram-config">'+escHtml(ramLine)+"</div>":"")+'<div class="pn-pb-slot-foot">'+priceLine+ownTag+genericNote+"</div>"+(locked?"":'<button type="button" class="btn btn-sm btn-ghost" style="margin-top:6px" data-pb-remove-slot="'+slotKey+'">REMOVE</button>')+"</div>"
}
function pbSlotEditorHtml(project){
  const k=PBUI.slotKey,d=PBUI.slot||{},cat=RIG_SLOT_CATEGORY[k],isCat=PB_CATALOG_SLOTS.includes(k)
  const vault=pbAvailableVaultItems(project,cat)
  if(k==="CASE"){
    const genMode="GENERIC"===d.mode
    const modeOpts='<option value="GENERIC"'+(genMode?" selected":"")+">CHOOSE CASE SIZE</option><option value=\"VAULT\""+("VAULT"===d.mode?" selected":"")+">SELECT FROM PARTS VAULT</option><option value=\"EXACT\""+("EXACT"===d.mode?" selected":"")+">ENTER EXACT MODEL</option>"
    let body=""
    if(genMode){
      const sizeId=d.caseSizeId||""
      body='<label class="field" style="grid-column:1/-1"><span>CASE SIZE</span><select data-pb-field="caseSizeId">'+PB_CASE_SIZES.map(c=>'<option value="'+c.id+'"'+(sizeId===c.id?" selected":"")+">"+escHtml(c.label)+"</option>").join("")+"</select></label>"
        +'<label class="field"><span>ESTIMATED COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-field="cost" value="'+escAttr(d.cost||"")+'"></label>'
        +'<label class="field" style="grid-column:1/-1"><span>NOTES</span><input type="text" data-pb-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
    }else if("VAULT"===d.mode){
      body=vault.length?'<label class="field" style="grid-column:1/-1"><span>SELECT COMPATIBLE OWNED PART</span><select data-pb-vault-item><option value="">— select '+cat.toLowerCase()+' —</option>'+vault.map(v=>{
        const already=v.assignedProjectId&&v.assignedProjectId!==project.id
        return'<option value="'+v.id+'"'+(d.inventoryItemId===v.id?" selected":"")+(already?" disabled":"")+">"+escHtml(v.manufacturer+" "+v.model)+" — "+STATUS_LABEL(v.condition)+" · "+money(v.purchasePrice,v.currency)+" · "+STATUS_LABEL(v.status)+"</option>"
      }).join("")+"</select></label>":'<p class="hint" style="grid-column:1/-1">No compatible unreserved '+cat.toLowerCase()+' in the Parts Vault — add one to Inventory first, or add a planned part below.</p>'
    }else{
      // ENTER EXACT MODEL now searches the case catalog live, same as every
      // other component — CASE stays out of PB_CATALOG_SLOTS only because
      // its GENERIC/VAULT modes are special, not because exact-model search
      // shouldn't apply here too (spec section 9/20).
      const hits=PBUI.catalogHits||[]
      body='<label class="field" style="grid-column:1/-1"><span>PART NAME</span><input type="text" data-pb-catalog-search="CASE" value="'+escAttr(d.label||"")+'" placeholder="Start typing to search the case catalog…" autocomplete="off"></label>'
        +(hits.length?'<div class="myrig-catalog-results" style="grid-column:1/-1;max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:4px">'+hits.map((h,i)=>'<button type="button" class="btn btn-sm btn-ghost" data-pb-catalog-pick="'+i+'" style="display:flex;justify-content:space-between;width:100%;text-align:left;padding:5px 8px">'+escHtml(h.brand+" "+h.model)+"</button>").join("")+"</div>":"")
        +'<label class="field"><span>ESTIMATED COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-field="cost" value="'+escAttr(d.cost||"")+'"></label>'
        +'<label class="field" style="grid-column:1/-1"><span>NOTES</span><input type="text" data-pb-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
    }
    return'<div class="panel pn-myrig-edit" style="margin-top:12px"><div class="panel-head"><h2>'+RIG_SLOT_LABELS[k].toUpperCase()+"</h2></div><div class=\"panel-body\"><div class=\"pn-myrig-fgrid\"><label class=\"field\" style=\"grid-column:1/-1\"><span>SOURCE</span><select data-pb-slot-mode>"+modeOpts+"</select></label>"+body+'</div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-save-slot="'+k+'">SAVE COMPONENT</button><button type="button" class="btn btn-sm" data-pb-cancel-slot>CANCEL</button></div></div></div>'
  }
  const modeOpts='<option value="VAULT"'+("VAULT"===d.mode?" selected":"")+">FROM PARTS VAULT</option><option value=\"PLANNED\""+("PLANNED"===d.mode?" selected":"")+">ADD NEW (NOT YET OWNED)</option>"
  let body=""
  if("VAULT"===d.mode){
    body=vault.length?'<label class="field" style="grid-column:1/-1"><span>SELECT COMPATIBLE OWNED PART</span><select data-pb-vault-item><option value="">— select '+cat.toLowerCase()+' —</option>'+vault.map(v=>{
      const already=v.assignedProjectId&&v.assignedProjectId!==project.id
      const ramHint=k==="RAM"?pbVaultRamHint(v):""
      return'<option value="'+v.id+'"'+(d.inventoryItemId===v.id?" selected":"")+(already?" disabled":"")+">"+escHtml(v.manufacturer+" "+v.model)+(ramHint?" — "+escHtml(ramHint):"")+" — "+STATUS_LABEL(v.condition)+" · "+money(v.purchasePrice,v.currency)+" · "+STATUS_LABEL(v.status)+"</option>"
    }).join("")+"</select></label>":'<p class="hint" style="grid-column:1/-1">No compatible unreserved '+cat.toLowerCase()+' in the Parts Vault — add one to Inventory first, or add a planned part below.</p>'
  }else if(k==="RAM"){
    // ---- RAM: module capacity is the primary search axis (spec section
    // 10-14), quantity is a separate explicit step (section 13), and the
    // resulting DIMM+quantity is what gets saved as slot.ram — never a
    // generic family autocomplete. ----
    if(!d.ramPicked){
      const hits=PBUI.ramHits||[]
      body='<label class="field" style="grid-column:1/-1"><span>RAM MODULE SIZE / SEARCH</span><input type="text" data-pb-ram-search value="'+escAttr(d.ramQuery||"")+'" placeholder="e.g. 8GB, Corsair 8GB, 16GB DDR5 6000" autocomplete="off"></label>'
        +(hits.length?'<div class="myrig-catalog-results" style="grid-column:1/-1;max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:4px">'+hits.map((h,i)=>'<button type="button" class="btn btn-sm btn-ghost" data-pb-ram-pick="'+i+'" style="display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;padding:6px 8px;gap:8px"><span>'+escHtml(pbRamRowLabel(h))+'</span>'+(h.isKit?'<span class="chip chip-blue-outline">KNOWN KIT</span>':"")+"</button>").join("")+"</div>"
          :(d.ramQuery?'<p class="hint" style="grid-column:1/-1">No matching RAM modules — try a different capacity (e.g. 8GB, 16GB) or brand.</p>':'<p class="hint" style="grid-column:1/-1">Start with the module size — e.g. "8GB" — then narrow by brand, DDR generation or speed.</p>'))
    }else{
      const ram=d.ram||{moduleCount:d.ramPicked.suggestedCount||2,perModuleCapacity:d.ramPicked.perModuleCapacity}
      body='<div class="field" style="grid-column:1/-1"><span style="display:block;margin-bottom:4px">SELECTED MODULE</span><div style="font-weight:800;font-size:13px">'+escHtml(pbRamRowLabel(d.ramPicked))+'</div><button type="button" class="btn btn-sm" style="margin-top:6px" data-pb-ram-change>CHANGE MODULE</button></div>'
        +'<div class="field" style="grid-column:1/-1"><span style="display:block;margin-bottom:4px">QUANTITY (STICKS INSTALLED)</span><div style="display:flex;gap:6px">'+[1,2,3,4].map(n=>'<button type="button" class="btn btn-sm'+(ram.moduleCount===n?" btn-primary":"")+'" data-pb-ram-qty="'+n+'">'+n+"</button>").join("")+"</div></div>"
        +'<div class="field" style="grid-column:1/-1"><span>TOTAL CAPACITY</span><div style="font-weight:800">'+(ram.moduleCount*ram.perModuleCapacity)+"GB TOTAL</div></div>"
        +'<label class="field"><span>PLANNED COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-field="cost" value="'+escAttr(d.cost||"")+'"></label>'
        +'<label class="field" style="grid-column:1/-1"><span>NOTES</span><input type="text" data-pb-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
    }
  }else{
    const hits=PBUI.catalogHits||[]
    body=(isCat?'<label class="field" style="grid-column:1/-1"><span>PART NAME</span><input type="text" data-pb-catalog-search="'+k+'" value="'+escAttr(d.label||"")+'" placeholder="Start typing to search the catalog…" autocomplete="off"></label>'
        +(hits.length?'<div class="myrig-catalog-results" style="grid-column:1/-1;max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:4px">'+hits.map((h,i)=>'<button type="button" class="btn btn-sm btn-ghost" data-pb-catalog-pick="'+i+'" style="display:flex;justify-content:space-between;width:100%;text-align:left;padding:5px 8px">'+escHtml(h.brand+" "+h.model)+"</button>").join("")+"</div>":"")
      :'<label class="field" style="grid-column:1/-1"><span>PART NAME</span><input type="text" data-pb-field="label" value="'+escAttr(d.label||"")+'" placeholder="e.g. BeQuiet Pure Power 750W" autocomplete="off"></label>')
      +'<label class="field"><span>ESTIMATED COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-field="cost" value="'+escAttr(d.cost||"")+'"></label>'
      +'<label class="field" style="grid-column:1/-1"><span>NOTES</span><input type="text" data-pb-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
  }
  return'<div class="panel pn-myrig-edit" style="margin-top:12px"><div class="panel-head"><h2>'+RIG_SLOT_LABELS[k].toUpperCase()+"</h2></div><div class=\"panel-body\"><div class=\"pn-myrig-fgrid\"><label class=\"field\" style=\"grid-column:1/-1\"><span>SOURCE</span><select data-pb-slot-mode>"+modeOpts+"</select></label>"+body+'</div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-save-slot="'+k+'">SAVE COMPONENT</button><button type="button" class="btn btn-sm" data-pb-cancel-slot>CANCEL</button></div></div></div>'
}
// Best-effort only: existing Parts Vault inventory rows carry no structured
// RAM capacity/kit fields (out of scope to add — that's the Inventory
// form, not Build Workspace), so this just surfaces a capacity hint parsed
// from the item's own model/notes text when one is plainly present, never
// invents data and never affects cost or scoring.
function pbVaultRamHint(item){
  const text=(item.model||"")+" "+(item.notes||"")
  const kitMatch=text.match(/(\d+)\s*[x×]\s*(\d+)\s*GB/i)
  if(kitMatch)return kitMatch[1]+"x"+kitMatch[2]+"GB"
  const capMatch=text.match(/(\d+)\s*GB/i)
  if(capMatch)return capMatch[1]+"GB"
  return""
}
function pbExtraFormHtml(project){
  const d=PBUI.extraDraft||{},vault=Store.all("inventory").filter(i=>(!i.assignedProjectId||i.assignedProjectId===project.id)&&"SOLD"!==i.status).slice().sort((a,b)=>(a.manufacturer+a.model).localeCompare(b.manufacturer+b.model))
  return'<div class="panel pn-myrig-edit" style="margin-top:12px"><div class="panel-head"><h2>ADD EXTRA / OPTIONAL PART</h2></div><div class="panel-body"><div class="pn-myrig-fgrid">'
    +'<label class="field" style="grid-column:1/-1"><span>FROM PARTS VAULT (OPTIONAL)</span><select data-pb-extra-field="inventoryItemId"><option value="">— manual entry —</option>'+vault.map(v=>'<option value="'+v.id+'"'+(d.inventoryItemId===v.id?" selected":"")+">"+escHtml(v.category+" — "+v.manufacturer+" "+v.model)+"</option>").join("")+"</select></label>"
    +'<label class="field" style="grid-column:1/-1"><span>NAME</span><input type="text" data-pb-extra-field="label" value="'+escAttr(d.label||"")+'" placeholder="e.g. RGB fan pack"></label>'
    +'<label class="field"><span>COST ('+project.currency+')</span><input type="number" min="0" step="1" data-pb-extra-field="cost" value="'+escAttr(d.cost||"")+'" '+(d.inventoryItemId?"readonly":"")+'></label>'
    +'<label class="field" style="grid-column:1/-1"><span>NOTES</span><input type="text" data-pb-extra-field="notes" value="'+escAttr(d.notes||"")+'"></label>'
    +'</div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-extra-save>ADD PART</button><button type="button" class="btn btn-sm" data-pb-extra-cancel>CANCEL</button></div></div></div>'
}
function pbExtrasHtml(project,locked){
  const extras=project.extras||[]
  const rows=extras.length?extras.map(x=>{const quality=pbExtraQuality(x);return'<div class="pn-pb-extra-row" data-pb-quality="'+quality.key+'"><span class="pn-pb-extra-name pn-pb-quality-name '+quality.className+'">'+escHtml(x.label)+"</span>"+pbQualityChipHtml(quality)+(x.inventoryItemId?'<button type="button" class="pn-pb-vault-link" data-open-entity="inventory" data-id="'+escAttr(x.inventoryItemId)+'">VAULT ↗</button>':'<span class="chip chip-blue-outline">PLANNED</span>')+"<span>"+money(x.cost,x.currency||project.currency)+"</span>"+(locked?"":'<button type="button" class="btn btn-sm btn-ghost" data-pb-extra-remove="'+x.id+'">REMOVE</button>')+"</div>"}).join(""):'<p class="hint">No optional or extra parts added.</p>'
  return'<div class="panel" data-pb-extras><div class="panel-head"><h2>OPTIONAL / EXTRA PARTS</h2>'+(locked?"":'<button type="button" class="btn btn-sm" data-pb-extra-new>+ ADD PART</button>')+'</div><div class="panel-body"><div class="pn-pb-extra-list">'+rows+"</div></div></div>"+(PBUI.extraDraft?pbExtraFormHtml(project):"")
}
function pbCompatHtml(project){
  const model=buildCheckModel({id:project.id,currency:project.currency,slots:project.slots||emptyRigSlots()}),v=pbVerdictMeta(model.verdict)
  const rows=model.findings.length?model.findings.map(f=>{const lv=bcStatus(f.status),vm=pbVerdictMeta("FAIL"===lv?"FAIL":"WARN"===lv?"WARNING":"UNVERIFIED"===lv?"UNVERIFIED":"PASS")
    return'<div class="pn-integrity-row is-'+lv.toLowerCase()+'"><b>'+escHtml(String(f.label).toUpperCase())+" — "+vm.word+'</b><span>'+escHtml(f.detail)+"</span></div>"}).join(""):'<div class="pn-integrity-row is-pass"><b>PASS</b><span>Every available compatibility check is verified compatible.</span></div>'
  return'<div class="panel" data-pb-compat><div class="panel-head"><h2>COMPATIBILITY CHECK</h2><span class="chip '+v.chip+'">'+v.word+" — "+model.verdict+'</span></div><div class="panel-body"><div class="pn-integrity-list">'+rows+"</div></div></div>"
}

// ---- BUILD cost accounting (SECTION 3): ACTUAL SPENT / PLANNED COST /
// ESTIMATED FINAL COST, itemized. Purely a display breakdown — does not
// touch projectTotalInvestment/projectPlannedCost (used elsewhere for
// Treasury/profit accounting, left untouched per spec). ----
function pbBuildCostRows(project){
  const owned=[],planned=[]
  PROJECT_BUILD_SLOTS.forEach(k=>{
    const slot=project.slots&&project.slots[k];if(!slot)return
    const r=rigSlotResolved(slot,project.currency,k)
    const name=(slot.genericCaseSizeId?slot.label:(r?r.label:""))||RIG_SLOT_LABELS[k]
    const amount=pbPaidAmount(project,slot)
    const row={label:RIG_SLOT_LABELS[k]+" — "+name,amount}
    if("INVENTORY"===slot.kind)owned.push(row);else planned.push(row)
  })
  ;(project.extras||[]).forEach(x=>{
    if(x.inventoryItemId){const item=Store.get("inventory",x.inventoryItemId);owned.push({label:x.label,amount:item?inventoryAcquisitionCost(item,project.currency):Math.round(Number(x.cost)||0)})}
    else planned.push({label:x.label,amount:Math.round(Number(x.cost)||0)})
  })
  return{owned,planned}
}
function pbCostBreakdownHtml(project){
  const{owned,planned}=pbBuildCostRows(project)
  const actualSpent=owned.reduce((s,r)=>s+r.amount,0),plannedCost=planned.reduce((s,r)=>s+r.amount,0),estFinal=actualSpent+plannedCost
  const rowsHtml=rows=>rows.length?rows.map(r=>'<div class="pn-pb-cost-row"><span>'+escHtml(r.label)+'</span><span>'+money(r.amount,project.currency)+"</span></div>").join(""):'<p class="hint">None yet.</p>'
  return'<div class="panel" data-pb-cost-breakdown><div class="panel-head"><h2>BUILD COST BREAKDOWN</h2></div><div class="panel-body"><div class="pn-pb-cost-cols"><div class="pn-pb-cost-group"><h3>OWNED</h3>'+rowsHtml(owned)+'<div class="pn-pb-cost-total" data-pb-actual-spent="'+actualSpent+'">ACTUAL SPENT<b>'+money(actualSpent,project.currency)+'</b></div></div><div class="pn-pb-cost-group"><h3>PLANNED</h3>'+rowsHtml(planned)+'<div class="pn-pb-cost-total" data-pb-planned-cost="'+plannedCost+'">PLANNED COST<b>'+money(plannedCost,project.currency)+'</b></div></div></div><div class="pn-pb-cost-final" data-pb-est-final="'+estFinal+'">ESTIMATED FINAL COST<b>'+money(estFinal,project.currency)+"</b></div></div></div>"
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
  return pageHeader("BUILD WORKSPACE",p.name,"")+'<div class="content">'+pbNoticeHtml()+hero+statsRow+'<div class="panel" data-pb-loadout><div class="panel-head"><h2>COMPONENT LOADOUT</h2></div><div class="panel-body"><div class="pn-pb-grid">'+grid+"</div></div></div>"+(PBUI.slotKey?pbSlotEditorHtml(p):"")+pbCostBreakdownHtml(p)+pbExtrasHtml(p,locked)+pbCompatHtml(p)+"</div>"
}
function pbClick(e){
  if(e.target.closest("[data-pb-back]"))return state.route="projects",state.pbId=null,PBUI.slotKey=null,PBUI.slot=null,PBUI.extraDraft=null,PBUI.quickPrice=null,PBUI.notice=null,void render()
  if(e.target.closest("[data-pb-edit-details]")){const p=pbProject();return p?void openForm("project",p.id):void 0}

  // ---- quick price edit (SECTION 2) ----
  const qpOpen=e.target.closest("[data-pb-quick-price]");if(qpOpen){const k=qpOpen.dataset.pbQuickPrice,p=pbProject();if(!p)return
    const slot=p.slots&&p.slots[k]
    PBUI.quickPrice={slotKey:k,value:pbPaidAmount(p,slot)}
    render();const el=document.querySelector('[data-pb-quick-price-input="'+k+'"]')
    if(el){el.focus();if(el.select)el.select()}
    return}
  if(e.target.closest("[data-pb-quick-price-cancel]"))return PBUI.quickPrice=null,void render()
  const qpSave=e.target.closest("[data-pb-quick-price-save]");if(qpSave){const k=qpSave.dataset.pbQuickPriceSave,p=pbProject();if(!p)return
    const slot=p.slots&&p.slots[k],val=Math.round(Number(PBUI.quickPrice&&PBUI.quickPrice.value)||0)
    if(slot&&"INVENTORY"===slot.kind&&slot.inventoryItemId){
      // Preserves identity/inventory linkage — edits the existing Parts
      // Vault row in place, never clones it (section 2/28).
      Actions.updateInventory(slot.inventoryItemId,{purchasePrice:val})
    }else if(slot){
      Actions.setProjectSlot(p.id,k,"PLANNED",Object.assign({},slot,{cost:val}))
    }
    PBUI.quickPrice=null
    return pbSetNotice("ok","Price updated."),void render()}

  const es=e.target.closest("[data-pb-edit-slot]");if(es){const p=pbProject();if(!p)return;const k=es.dataset.pbEditSlot,cur=p.slots&&p.slots[k]||null
    PBUI.slotKey=k;PBUI.catalogHits=[];PBUI.ramHits=[];PBUI.quickPrice=null
    if(k==="CASE"&&cur&&cur.genericCaseSizeId){
      PBUI.slot={mode:"GENERIC",caseSizeId:cur.genericCaseSizeId,label:cur.label||"",cost:cur.cost||0,notes:cur.notes||""}}
    else{
      const draft=cur?("INVENTORY"===cur.kind?{mode:"VAULT",inventoryItemId:cur.inventoryItemId}:{mode:"PLANNED",label:cur.label||"",cost:cur.cost||0,notes:cur.notes||"",ram:cur.ram||null}):{mode:"PLANNED",inventoryItemId:"",label:"",cost:0,notes:"",ram:null}
      if(k==="RAM"&&draft.ram){
        // Re-editing an existing RAM slot jumps straight to the
        // quantity/summary step instead of forcing a fresh search.
        draft.ramPicked={brand:"",series:draft.label||"",technology:draft.ram.technology,speed:draft.ram.speed,casLatency:draft.ram.casLatency,perModuleCapacity:draft.ram.perModuleCapacity,suggestedCount:draft.ram.moduleCount}
      }
      PBUI.slot=draft}
    render();return void pbFocusSlotField(k)}
  if(e.target.closest("[data-pb-cancel-slot]"))return PBUI.slotKey=null,PBUI.slot=null,void render()

  // ---- RAM module/quantity picking (SECTION 11-13) ----
  const ramPick=e.target.closest("[data-pb-ram-pick]");if(ramPick&&PBUI.slot){
    const idx=+ramPick.dataset.pbRamPick,row=(PBUI.ramHits||[])[idx]
    if(row){
      const qty=row.suggestedCount||2
      PBUI.slot.ramPicked=row
      PBUI.slot.ram={technology:row.technology,moduleCount:qty,perModuleCapacity:row.perModuleCapacity,totalCapacity:qty*row.perModuleCapacity,speed:row.speed,casLatency:row.casLatency}
      PBUI.slot.label=pbRamBaseLabel(row)
      PBUI.ramHits=[]
      render()
    }
    return}
  if(e.target.closest("[data-pb-ram-change]")){if(PBUI.slot){PBUI.slot.ramPicked=null;PBUI.slot.ram=null}PBUI.ramHits=[];render();return void pbFocusSlotField(PBUI.slotKey)}
  const ramQty=e.target.closest("[data-pb-ram-qty]");if(ramQty&&PBUI.slot&&PBUI.slot.ramPicked){
    const n=+ramQty.dataset.pbRamQty,row=PBUI.slot.ramPicked
    PBUI.slot.ram={technology:row.technology,moduleCount:n,perModuleCapacity:row.perModuleCapacity,totalCapacity:n*row.perModuleCapacity,speed:row.speed,casLatency:row.casLatency}
    return void render()}

  const ss=e.target.closest("[data-pb-save-slot]");if(ss){const p=pbProject();if(!p)return;const k=ss.dataset.pbSaveSlot,d=PBUI.slot||{}
    let res
    if("VAULT"===d.mode){if(!d.inventoryItemId)return pbSetNotice("err","Select a part from the vault, or switch to ADD NEW."),void render()
      res=Actions.setProjectSlot(p.id,k,"INVENTORY",{inventoryItemId:d.inventoryItemId})}
    else if(k==="CASE"&&"GENERIC"===d.mode){
      const size=pbCaseSizeById(d.caseSizeId)
      if(!size)return pbSetNotice("err","Select a case size."),void render()
      res=Actions.setProjectSlot(p.id,k,"PLANNED",{label:size.label,cost:Math.round(Number(d.cost)||0),notes:String(d.notes||"").trim(),currency:p.currency,genericCaseSizeId:d.caseSizeId})}
    else{
      if(k==="RAM"&&!d.ram)return pbSetNotice("err","Pick a RAM module and quantity first."),void render()
      if(!String(d.label||"").trim())return pbSetNotice("err","Enter a part name."),void render()
      res=Actions.setProjectSlot(p.id,k,"PLANNED",{label:String(d.label).trim(),cost:Math.round(Number(d.cost)||0),notes:String(d.notes||"").trim(),currency:p.currency,catalogType:PB_CATALOG_SLOTS.includes(k)?k:void 0,ram:d.ram||void 0})}
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
  if(t.matches&&t.matches("[data-pb-quick-price-input]")&&PBUI.quickPrice)return void(PBUI.quickPrice.value=t.value)
  if(t.matches&&t.matches("[data-pb-ram-search]")){const val=t.value||""
    if(PBUI.slot)PBUI.slot.ramQuery=val
    PBUI.ramHits=val.length>=1?pbRamSearch(val,10):[]
    render();const next=document.querySelector("[data-pb-ram-search]")
    if(next){next.focus();if(next.setSelectionRange)next.setSelectionRange(next.value.length,next.value.length)}
    return}
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
  const m=e.target.closest("select[data-pb-slot-mode]");if(m&&PBUI.slot){PBUI.slot.mode=m.value;PBUI.catalogHits=[];PBUI.ramHits=[];render();return void pbFocusSlotField(PBUI.slotKey)}
  const vi=e.target.closest("select[data-pb-vault-item]");if(vi&&PBUI.slot){PBUI.slot.inventoryItemId=vi.value;return void render()}
  const ef=e.target.closest("select[data-pb-extra-field]");if(ef)return void pbInput(e)
}
// Escape backs out of the search-results dropdown first (so a stray
// keypress while scanning results doesn't lose the whole in-progress
// slot edit), then a second Escape (or an Escape pressed with no
// results open) cancels the slot editor entirely — same effect as
// clicking CANCEL.
function pbKeydown(e){
  if(e.key!=="Escape"||!PBUI.slotKey)return
  if((PBUI.ramHits&&PBUI.ramHits.length)||(PBUI.catalogHits&&PBUI.catalogHits.length)){
    PBUI.ramHits=[];PBUI.catalogHits=[]
    e.preventDefault()
    return void render()
  }
  PBUI.slotKey=null;PBUI.slot=null;PBUI.quickPrice=null
  e.preventDefault()
  render()
}
document.addEventListener("click",pbClick)
document.addEventListener("input",pbInput)
document.addEventListener("change",pbChange)
document.addEventListener("keydown",pbKeydown)
if(typeof document!=="undefined"&&document.addEventListener){
  const s=document.createElement("style")
  s.textContent=".pn-pb-hero{border:1px solid var(--border-strong);border-radius:var(--radius);padding:18px;background:linear-gradient(135deg,rgba(160,180,200,.06),rgba(160,180,200,.02) 60%)}.pn-pb-eyebrow{font:9px var(--mono);letter-spacing:.24em;color:#9fb4c8;margin-bottom:6px}.pn-pb-name{font-size:32px;line-height:1.1;font-weight:900;margin:0 0 10px}.pn-pb-hero-actions{margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.pn-pb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.pn-pb-slot{border:1px solid var(--border);border-left:3px solid var(--pb-acc,#8b8495);background:var(--surface-2);border-radius:var(--radius);padding:10px 12px;display:flex;flex-direction:column;gap:5px}.pn-pb-slot.is-empty{background:transparent;border-left-color:var(--border-strong);opacity:.75}.pn-pb-slot-head,.pn-pb-slot-model-line{display:flex;align-items:center;gap:8px}.pn-pb-slot-model-line{flex-wrap:wrap}.pn-pb-slot-model{font-weight:800;font-size:13px;line-height:1.25}.pn-pb-quality-name{color:var(--tier-color,#a39cac)}.pn-pb-slot[data-pb-quality=\"LEGENDARY\"] .pn-pb-slot-model{text-shadow:0 0 9px rgba(255,128,0,.3)}.pn-pb-quality{display:inline-flex;align-items:center;padding:2px 6px;border:1px solid var(--tier-border);border-radius:3px;background:var(--tier-wash);color:var(--tier-color);font:800 8px var(--mono);letter-spacing:.08em;line-height:1.2;white-space:nowrap}.pn-tier-unrated{--tier-color:#77717f;--tier-border:rgba(119,113,127,.42);--tier-wash:rgba(119,113,127,.09)}.pn-pb-ram-config{font:800 10px var(--mono);letter-spacing:.04em;color:#32c6a6}.pn-pb-slot-foot{display:flex;align-items:center;gap:8px;font:9px var(--mono);color:var(--text-muted);margin-top:auto;flex-wrap:wrap}.pn-pb-price{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--text)}.pn-pb-price-edit{display:inline-flex;align-items:center;gap:6px}.pn-pb-price-edit-btn{font:8px var(--mono);letter-spacing:.1em;color:#9fb4c8;border:1px solid var(--border-strong);padding:1px 6px;border-radius:6px;background:transparent;cursor:pointer}.pn-pb-price-edit-btn:hover{color:var(--text);border-color:#9fb4c8}.pn-pb-vault-link{font:8px var(--mono);letter-spacing:.12em;color:#9fb4c8;border:1px solid var(--border-strong);padding:1px 5px;border-radius:6px;background:transparent;cursor:pointer}.pn-pb-vault-link:hover{color:var(--text);border-color:#9fb4c8}.pn-pb-extra-list{display:flex;flex-direction:column;gap:6px}.pn-pb-extra-row{display:flex;align-items:center;gap:10px;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--radius);padding:8px 10px;flex-wrap:wrap}.pn-pb-extra-name{flex:1;font-weight:700;font-size:12px}.pn-pb-cost-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pn-pb-cost-group h3{font:800 10px var(--mono);letter-spacing:.1em;color:var(--text-muted);margin:0 0 6px}.pn-pb-cost-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3px 0;border-bottom:1px dashed var(--border)}.pn-pb-cost-total{display:flex;justify-content:space-between;font:800 11px var(--mono);letter-spacing:.06em;margin-top:8px;padding-top:6px;border-top:1px solid var(--border-strong)}.pn-pb-cost-final{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid var(--border-strong);font:800 13px var(--mono);letter-spacing:.06em}@media(max-width:760px){.pn-pb-grid{grid-template-columns:1fr}.pn-pb-cost-cols{grid-template-columns:1fr}}"
  document.head.appendChild(s)
  if(typeof ROUTES!=="undefined"&&!window.__PN_PROJECT_BUILD_REGISTERED){
    ROUTES.push({key:"projectbuild",label:"Build Workspace",hidden:!0,parent:"projects",render:renderProjectBuild})
    window.__PN_PROJECT_BUILD_REGISTERED=!0
  }
}
