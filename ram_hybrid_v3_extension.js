"use strict";
(function(){
  if(window.__PN_RAM_HYBRID_V3__)return;
  if(typeof Store==="undefined"||typeof Actions==="undefined"||typeof render!=="function"||typeof pbComponentSlotEditorHtml!=="function"||typeof pbSlotCardHtml!=="function"||typeof pbPaidAmount!=="function"){
    console.error("[RAM HYBRID V3] dependencies unavailable; extension not activated");
    return;
  }
  window.__PN_RAM_HYBRID_V3__=true;

  function idsOf(slot){
    if(!slot)return[];
    if(Array.isArray(slot.ramVaultItemIds)&&slot.ramVaultItemIds.length)return Array.from(new Set(slot.ramVaultItemIds.filter(Boolean)));
    if(slot.kind==="INVENTORY"&&slot.inventoryItemId)return[slot.inventoryItemId];
    return[];
  }
  function itemDetails(item){
    if(!item)return null;
    let d=null;try{d=typeof inventoryRamDetails==="function"?inventoryRamDetails(item):null}catch(_){ }
    const text=String((item.manufacturer||"")+" "+(item.model||"")+" "+(item.notes||""));
    const kit=text.match(/(\d+)\s*[x×]\s*(\d+)\s*GB/i),cap=text.match(/(?:^|\s)(\d+)\s*GB\b/i),ddr=text.match(/\bDDR\s*([2345])\b/i),spd=text.match(/\b(\d{3,5})\s*(?:MHZ|MT\/?S|MTPS)\b/i)||text.match(/\bDDR[2345][\s-]+(\d{3,5})\b/i),cas=text.match(/\bCL\s*(\d{1,2})\b/i);
    let moduleCount=Number(d&&d.moduleCount)||Number(kit&&kit[1])||1;
    let perModuleCapacity=Number(d&&(d.moduleCapacity||d.perModuleCapacity))||Number(kit&&kit[2])||0;
    let totalCapacity=Number(d&&d.totalCapacity)||0;
    if(!perModuleCapacity&&totalCapacity&&moduleCount)perModuleCapacity=totalCapacity/moduleCount;
    if(!perModuleCapacity&&cap)perModuleCapacity=Number(cap[1])||0;
    if(!totalCapacity&&perModuleCapacity&&moduleCount)totalCapacity=perModuleCapacity*moduleCount;
    if(!perModuleCapacity||!moduleCount)return null;
    return{inventoryItemId:item.id,moduleCount,perModuleCapacity,totalCapacity:totalCapacity||moduleCount*perModuleCapacity,technology:String((d&&(d.ramType||d.technology))||(ddr?"DDR"+ddr[1]:"DDR4")).toUpperCase(),speed:Number(d&&(d.ramSpeedMTs||d.speed))||Number(spd&&spd[1])||0,casLatency:Number(d&&d.casLatency)||Number(cas&&cas[1])||0,label:pbPartLabel(item)};
  }
  function release(projectId,ids){(ids||[]).forEach(id=>{const it=Store.get("inventory",id);if(it&&it.assignedProjectId===projectId)Store.update("inventory",id,{assignedProjectId:null,status:it.status==="SOLD"?it.status:"IN_STORAGE"})})}
  function selectedIds(){
    if(typeof PBUI==="undefined"||!PBUI.slot)return[];
    const d=PBUI.slot,ids=Array.isArray(d.ramVaultItemIds)?d.ramVaultItemIds.slice():[];
    if(!ids.length&&d.inventoryItemId)ids.push(d.inventoryItemId);
    return Array.from(new Set(ids.filter(Boolean)));
  }
  function saveHybrid(project,ids){
    ids=Array.from(new Set((ids||[]).filter(Boolean)));
    if(ids.length<2)return{ok:false,error:"Select at least two RAM items for a hybrid set."};
    const items=ids.map(id=>Store.get("inventory",id));
    if(items.some(x=>!x))return{ok:false,error:"One selected RAM item no longer exists."};
    const conflict=items.find(x=>x.category!=="RAM"||x.status==="SOLD"||(x.assignedProjectId&&x.assignedProjectId!==project.id));
    if(conflict)return{ok:false,error:pbPartLabel(conflict)+" is unavailable for this build."};
    const groups=items.map(itemDetails);
    if(groups.some(g=>!g))return{ok:false,error:"A selected RAM stick has no readable capacity. Add its RAM size/specs in Parts Vault first."};
    const gens=Array.from(new Set(groups.map(g=>g.technology).filter(Boolean)));
    if(gens.length>1)return{ok:false,error:"Hybrid RAM must use the same DDR generation."};
    const ram=pbRamAggregate(groups);if(!ram)return{ok:false,error:"Could not aggregate selected RAM."};
    ram.groups=groups.map(g=>Object.assign({},g));ram.mixed=true;
    const oldSlot=project.slots&&project.slots.RAM,oldIds=idsOf(oldSlot);
    release(project.id,oldIds.filter(id=>!ids.includes(id)));
    const status=project.status==="COMPLETED"?"INSTALLED":"IN_BUILD";
    ids.forEach(id=>Store.update("inventory",id,{assignedProjectId:project.id,status}));
    const slot={kind:"INVENTORY",inventoryItemId:ids[0],ramVaultItemIds:ids,label:items.map(pbPartLabel).join(" + "),ram,hybridOwned:true};
    const slots=Object.assign({},project.slots||{},{RAM:slot});
    const componentIds=Store.all("inventory").filter(x=>x.assignedProjectId===project.id).map(x=>x.id);
    Store.update("projects",project.id,{slots,componentIds});
    return{ok:true,project:Store.get("projects",project.id)};
  }

  const originalPaid=pbPaidAmount;
  pbPaidAmount=function(project,slot){const ids=idsOf(slot);if(ids.length>1)return ids.reduce((sum,id)=>{const it=Store.get("inventory",id);return sum+(it?inventoryAcquisitionCost(it,project.currency):0)},0);return originalPaid(project,slot)};

  if(typeof rigSlotResolved==="function"){
    const originalResolved=rigSlotResolved;
    rigSlotResolved=function(slot,currency,slotKey){
      const ids=idsOf(slot);
      if(ids.length>1&&(slotKey==="RAM"||(slot&&slot.hybridOwned))){
        const items=ids.map(id=>Store.get("inventory",id)).filter(Boolean),rating=slot.ram&&typeof ramRating==="function"?ramRating(slot.ram):null;
        return{label:(slot.label||items.map(pbPartLabel).join(" + "))+(slot.ram&&slot.ram.totalCapacity?" / "+slot.ram.totalCapacity+"GB TOTAL":""),cost:ids.reduce((sum,id)=>{const it=Store.get("inventory",id);return sum+(it?inventoryAcquisitionCost(it,currency):0)},0),originalPrice:items.reduce((sum,it)=>sum+(Number(it.estimatedMarketValue)||0),0),category:"RAM",condition:"WORKING",status:items[0]?items[0].status:"IN_BUILD",item:items[0]||null,pn:rating?{type:"RAM",data:{technology:(slot.ram&&slot.ram.technology)||"DDR4",brand:"HYBRID",series:"MIXED"},performance:rating.overall,tierIndex:rating.tierIndex,tier:rating.tier,ram:slot.ram}:null};
      }
      return originalResolved(slot,currency,slotKey);
    };
  }

  const originalCard=pbSlotCardHtml;
  pbSlotCardHtml=function(project,slotKey,locked){
    const slot=project&&project.slots&&project.slots[slotKey],ids=slotKey==="RAM"?idsOf(slot):[];
    if(ids.length<2)return originalCard(project,slotKey,locked);
    const items=ids.map(id=>Store.get("inventory",id)).filter(Boolean),rating=slot.ram&&typeof ramRating==="function"?ramRating(slot.ram):null,tier=rating&&rating.tier?rating.tier:"UNRATED",cls=typeof pnTierClass==="function"?pnTierClass(tier):"",q={key:tier,sourceTier:tier,source:"HYBRID RAM",className:cls},chip=typeof pbQualityChipHtml==="function"?pbQualityChipHtml(q):"",paid=pbPaidAmount(project,slot),ramLine=pbRamConfigLine(slot),model=slot.label||items.map(pbPartLabel).join(" + ");
    return'<div class="pn-pb-slot'+(tier!=="UNRATED"?' pn-tier-card '+cls:'')+'" style="--pb-acc:#32C6A6" data-pb-slot="RAM" data-pb-quality="'+escAttr(tier)+'"><div class="pn-pb-slot-head"><span class="pn-cat-label pn-cat-RAM">RAM</span>'+(locked?'':'<button type="button" class="btn btn-sm" style="margin-left:auto" data-pb-edit-slot="RAM">SWAP</button>')+'</div><div class="pn-pb-slot-model-line"><div class="pn-pb-slot-model pn-pb-quality-name '+cls+'">'+escHtml(model)+'</div>'+chip+'</div>'+(ramLine?'<div class="pn-pb-ram-config">'+escHtml(ramLine)+'</div>':'')+'<div class="pn-pb-slot-foot"><span class="pn-pb-price"><b>PAID '+money(paid,project.currency)+'</b></span><span class="chip chip-green-outline">VAULT · '+ids.length+' RAM ITEMS</span></div>'+(locked?'':'<button type="button" class="btn btn-sm btn-ghost" style="margin-top:6px" data-pb-remove-slot="RAM">REMOVE</button>')+'</div>';
  };

  const originalEditor=pbComponentSlotEditorHtml;
  pbComponentSlotEditorHtml=function(project){
    if(typeof PBUI==="undefined"||PBUI.slotKey!=="RAM"||!PBUI.slot||PBUI.slot.mode!=="VAULT")return originalEditor(project);
    const vault=pbAvailableVaultItems(project,"RAM"),sel=new Set(selectedIds());
    const rows=vault.length?vault.map(v=>{const unavailable=v.assignedProjectId&&v.assignedProjectId!==project.id;let hint="";try{hint=typeof pbVaultRamHint==="function"?pbVaultRamHint(v):""}catch(_){ }return'<label class="pn-rhv3-row'+(unavailable?' is-disabled':'')+'"><input type="checkbox" data-pn-rhv3-check value="'+escAttr(v.id)+'"'+(sel.has(v.id)?' checked':'')+(unavailable?' disabled':'')+'><span class="pn-rhv3-name">'+escHtml(pbPartLabel(v))+(hint?' <b>'+escHtml(hint)+'</b>':'')+'</span><span class="pn-rhv3-meta">'+money(v.purchasePrice,v.currency)+' · '+STATUS_LABEL(v.status)+'</span></label>'}).join(""):'<p class="hint">No available RAM in Parts Vault.</p>';
    return'<div class="panel pn-myrig-edit pn-rhv3-editor" style="margin-top:8px"><div class="panel-head"><h2>RAM</h2></div><div class="panel-body"><div class="pn-myrig-fgrid"><label class="field" style="grid-column:1/-1"><span>SOURCE</span><select data-pb-slot-mode><option value="VAULT" selected>FROM PARTS VAULT</option><option value="PLANNED">ADD NEW (NOT YET OWNED)</option></select></label><div class="field" style="grid-column:1/-1"><span>SELECT OWNED RAM · MULTIPLE STICKS ALLOWED</span><div class="pn-rhv3-list">'+rows+'</div><p class="hint" style="margin:7px 0 0">One selection = normal RAM. Two or more = HYBRID RAM. Existing Vault parts are already paid and are never charged again.</p></div></div><div class="pn-myrig-form-actions"><button type="button" class="btn btn-primary" data-pb-save-slot="RAM">SAVE COMPONENT</button><button type="button" class="btn btn-sm" data-pb-cancel-slot>CANCEL</button></div></div></div>';
  };

  document.addEventListener("change",function(e){const cb=e.target.closest("[data-pn-rhv3-check]");if(!cb||typeof PBUI==="undefined"||!PBUI.slot)return;const set=new Set(selectedIds());cb.checked?set.add(cb.value):set.delete(cb.value);PBUI.slot.ramVaultItemIds=Array.from(set);PBUI.slot.inventoryItemId=PBUI.slot.ramVaultItemIds[0]||""},true);

  document.addEventListener("click",function(e){
    const save=e.target.closest('[data-pb-save-slot="RAM"]');
    if(save&&typeof PBUI!=="undefined"&&PBUI.slot){
      const project=pbProject();if(!project)return;
      const oldIds=idsOf(project.slots&&project.slots.RAM);
      if(PBUI.slot.mode==="VAULT"){
        const ids=selectedIds();
        if(!ids.length){e.preventDefault();e.stopImmediatePropagation();pbSetNotice("err","Select at least one RAM item from Parts Vault.");render();return}
        if(ids.length===1){const oldPrimary=project.slots&&project.slots.RAM&&project.slots.RAM.inventoryItemId;release(project.id,oldIds.filter(id=>id!==oldPrimary&&id!==ids[0]));PBUI.slot.inventoryItemId=ids[0];return}
        e.preventDefault();e.stopImmediatePropagation();const res=saveHybrid(project,ids);if(res.ok){PBUI.slotKey=null;PBUI.slot=null;pbSetNotice("ok","Hybrid RAM saved from "+ids.length+" Parts Vault items.")}else pbSetNotice("err",res.error);render();return;
      }
      if(PBUI.slot.mode==="PLANNED"&&oldIds.length>1)release(project.id,oldIds.slice(1));
    }
    const remove=e.target.closest('[data-pb-remove-slot="RAM"]');
    if(remove&&remove.dataset.armed==="1"){const project=pbProject(),slot=project&&project.slots&&project.slots.RAM,ids=idsOf(slot);if(project&&ids.length>1)release(project.id,ids.slice(1))}
  },true);

  document.addEventListener("click",function(e){
    if(!e.target.closest('[data-pb-edit-slot="RAM"]'))return;
    setTimeout(function(){try{const p=pbProject(),ids=idsOf(p&&p.slots&&p.slots.RAM);if(ids.length>1&&typeof PBUI!=="undefined"&&PBUI.slot){PBUI.slot.ramVaultItemIds=ids.slice();PBUI.slot.inventoryItemId=ids[0];render()}}catch(_){ }},0);
  },false);

  const style=document.createElement("style");style.id="pn-ram-hybrid-v3-style";style.textContent=".pn-rhv3-list{display:grid;gap:6px;margin-top:6px}.pn-rhv3-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--surface-2);cursor:pointer}.pn-rhv3-row:has(input:checked){border-color:#32c6a6;background:rgba(50,198,166,.07)}.pn-rhv3-row.is-disabled{opacity:.45;cursor:not-allowed}.pn-rhv3-name{font-weight:800;font-size:12px}.pn-rhv3-name b{color:#32c6a6;font:800 9px var(--mono)}.pn-rhv3-meta{font:9px var(--mono);color:var(--text-muted);white-space:nowrap}@media(max-width:700px){.pn-rhv3-row{grid-template-columns:auto 1fr}.pn-rhv3-meta{grid-column:2;white-space:normal}}";document.head.appendChild(style);
  console.info("[PROFITNODE] RAM HYBRID V3 ACTIVE");
})();
