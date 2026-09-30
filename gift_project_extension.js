"use strict";

(function installGiftProjectLifecycleV5(){
  const GIFT_STATUS="GIFTED", GIFT_DISPOSITION="GIFT";
  if(typeof PROJECT_STATUSES!=="undefined"&&!PROJECT_STATUSES.includes(GIFT_STATUS))PROJECT_STATUSES.push(GIFT_STATUS);
  if(typeof PROJECT_STATUS_META!=="undefined")PROJECT_STATUS_META[GIFT_STATUS]={chip:"chip-green-outline"};
  if(typeof INVENTORY_STATUSES!=="undefined"&&!INVENTORY_STATUSES.includes(GIFT_STATUS))INVENTORY_STATUSES.push(GIFT_STATUS);
  if(typeof INVENTORY_STATUS_META!=="undefined")INVENTORY_STATUS_META[GIFT_STATUS]={chip:"chip-green-outline"};

  const isGiftProject=p=>!!p&&p.purpose==="FAMILY_GIFT";
  const giftSaleForProject=id=>Store.all("sales").find(s=>s&&s.projectId===id&&String(s.disposition||"").toUpperCase()===GIFT_DISPOSITION)||null;

  function collectSlots(ids,slots){Object.values(slots||{}).forEach(slot=>{if(!slot||typeof slot!=="object")return;slot.inventoryItemId&&ids.add(slot.inventoryItemId);(slot.ramVaultItemIds||[]).forEach(id=>id&&ids.add(id));});}
  function collectExtras(ids,extras){(extras||[]).forEach(x=>x&&x.inventoryItemId&&ids.add(x.inventoryItemId));}
  function giftInventoryIds(project){
    const ids=new Set(); if(!project)return ids;
    Store.all("inventory").forEach(i=>i&&i.assignedProjectId===project.id&&ids.add(i.id));
    (project.componentIds||[]).forEach(id=>id&&ids.add(id)); collectSlots(ids,project.slots); collectExtras(ids,project.extras);
    const snap=project.buildSnapshot||{}; (snap.componentIds||[]).forEach(id=>id&&ids.add(id)); collectSlots(ids,snap.slots); collectExtras(ids,snap.extras);
    return ids;
  }
  function retireGiftInventory(project){
    let changed=0;
    giftInventoryIds(project).forEach(id=>{const item=Store.get("inventory",id);if(!item)return;const patch={};if(item.status!==GIFT_STATUS)patch.status=GIFT_STATUS;if(item.assignedProjectId!==project.id)patch.assignedProjectId=project.id;if(Object.keys(patch).length){Store.update("inventory",id,patch);changed++;}});
    return changed;
  }
  function ensureGiftLedgerEntry(project){
    if(!project||!isGiftProject(project))return null;const existing=giftSaleForProject(project.id),total=Number(Actions.projectTotalInvestment(project))||0,additional=Number(project.additionalCosts)||0;
    const row={projectId:project.id,inventoryItemId:null,itemName:project.name,saleDate:project.completionDate||todayISO(),buyerPrice:0,originalInvestment:Math.max(0,total-additional),additionalCosts:additional,currency:project.currency||"RSD",referenceStartDate:project.startDate||null,saleType:"RIG",saleState:"COMPLETED",saleSource:"GIFT",disposition:GIFT_DISPOSITION,reason:"FAMILY_GIFT",notes:"Finished rig gifted. Zero revenue; full build cost realized as shop expense."};
    if(existing)return Store.update("sales",existing.id,row);const created=Store.insert("sales",row);Timeline.log("PROJECT_GIFTED",project.name+" GIFTED","Ledgered at zero revenue · realized expense "+money(total,project.currency||"RSD"),row.saleDate,"sale",created.id);return created;
  }

  if(typeof projectDerived==="function"&&!projectDerived.__pnGiftAwareV5){const base=projectDerived;projectDerived=function(project){const out=base(project);if(isGiftProject(project)&&project.status===GIFT_STATUS){const cost=Number(Actions.projectTotalInvestment(project))||0;out.totalInvestment=cost;out.profit=-cost;out.roi=cost>0?-100:0;out.daysHeld=Calc.daysHeld(project.startDate,project.completionDate||todayISO());}return out;};projectDerived.__pnGiftAwareV5=true;}

  if(Actions&&typeof Actions.markProjectBuildComplete==="function"&&!Actions.markProjectBuildComplete.__pnGiftAwareV5){const base=Actions.markProjectBuildComplete.bind(Actions);const fn=function(projectId){const before=Store.get("projects",projectId),result=base(projectId);if(!result||!result.ok||!isGiftProject(before))return result;const completed=Store.get("projects",projectId),giftedAt=completed.completedAt||nowISO(),gifted=Store.update("projects",projectId,{status:GIFT_STATUS,giftedAt,completionDate:completed.completionDate||giftedAt.slice(0,10),buildLocked:true});retireGiftInventory(gifted);ensureGiftLedgerEntry(gifted);return{ok:true,project:gifted};};fn.__pnGiftAwareV5=true;Actions.markProjectBuildComplete=fn;}

  let repaired=0;const ledger=Store.load();ledger.meta=ledger.meta||{};
  if(!ledger.meta.giftLifecycleV5RepairedAt){Store.all("projects").forEach(project=>{if(!isGiftProject(project)||!project.completionDate||!project.buildLocked||!["COMPLETED","GIFTED"].includes(project.status))return;let current=project;if(project.status!==GIFT_STATUS){current=Store.update("projects",project.id,{status:GIFT_STATUS,giftedAt:project.giftedAt||String(project.completionDate)+"T00:00:00.000Z",buildLocked:true});repaired++;}repaired+=retireGiftInventory(current);if(!giftSaleForProject(current.id)){ensureGiftLedgerEntry(current);repaired++;}});ledger.meta.giftLifecycleV5RepairedAt=nowISO();Store.persist();}
  console.info("[PROFITNODE] GIFT PROJECT LIFECYCLE V5 active · repaired",repaired,"item(s).");
})();
