"use strict";

(function installAuditIntegrity(){
  const terminalStatuses=["SOLD","SOLD_IN_TRANSIT","GIFTED","RETIRED"];

  function myRigOwns(id){
    const rig=Store.load().myRig;
    return rig&&rig.slots&&Object.keys(rig.slots).find(k=>rig.slots[k]&&rig.slots[k].vaultId===id)||null;
  }
  function activeSale(id){
    return Store.all("sales").some(s=>s&&s.inventoryItemId===id&&("PENDING"===saleStateResolved(s)||"COMPLETED"===saleStateResolved(s)));
  }
  function inventoryAvailability(item,target){
    target=target||{};
    if(!item)return{ok:false,error:"Inventory item not found."};
    const name=((item.manufacturer||"")+" "+(item.model||"")).trim()||"This part";
    if(terminalStatuses.includes(item.status))return{ok:false,error:name+" is terminal ("+item.status.replace(/_/g," ")+")."};
    if(activeSale(item.id))return{ok:false,error:name+" is linked to an active or completed sale."};
    const myRigSlot=myRigOwns(item.id);if(myRigSlot&&myRigSlot!==target.myRigSlot)return{ok:false,error:name+" is installed in MY RIG."};
    if(item.assignedProjectId&&item.assignedProjectId!==target.projectId)return{ok:false,error:name+" is already reserved on another build."};
    if(item.assignedRigId&&item.assignedRigId!==target.rigId)return{ok:false,error:name+" is already physically assembled in another rig."};
    return{ok:true};
  }
  window.inventoryAvailability=inventoryAvailability;
  Actions.partAvailability=function(item,targetType,targetId){return inventoryAvailability(item,{projectId:targetType==="project"?targetId:null,rigId:targetType==="rig"?targetId:null,myRigSlot:targetType==="myrig"?targetId:null})};

  const removeSale=Actions.removeSale.bind(Actions);
  Actions.removeSale=function(id){
    const sale=Store.get("sales",id),part=sale&&sale.inventoryItemId?Store.get("inventory",sale.inventoryItemId):null;
    const result=removeSale(id);
    const expected=sale&&saleStateResolved(sale)==="COMPLETED"?["SOLD","SOLD_IN_TRANSIT"]:["LISTED"];
    if(part&&expected.includes(part.status))Store.update("inventory",part.id,{status:sale.inventorySnapshot&&sale.inventorySnapshot.priorStatus||"IN_STORAGE",assignedRigId:sale.inventorySnapshot&&sale.inventorySnapshot.priorAssignedRigId||null,saleTransactionId:null,salePrice:null,saleCurrency:null,saleDate:null,saleChannel:null,saleDetail:null,saleNotes:null});
    return result;
  };

  const updateProject=Actions.updateProject.bind(Actions);
  Actions.updateProject=function(id,data){
    const before=Store.get("projects",id);
    if(before&&before.status==="GIFTED"&&data&&data.status==="SOLD")return before;
    return updateProject(id,data);
  };
  const removeProject=Actions.removeProject.bind(Actions);
  Actions.removeProject=function(id){
    const project=Store.get("projects",id);
    if(!project||project.status!=="GIFTED"){if(typeof removeTreasuryFlow==="function")removeTreasuryFlow(Store.load().treasury,"project",id,"PROJECT_ADDITIONAL");return removeProject(id)}
    Store.all("inventory").filter(i=>i.assignedProjectId===id).forEach(i=>Store.update("inventory",i.id,{assignedProjectId:null,assignedRigId:null,status:"GIFTED",giftedProjectId:id}));
    Store.remove("projects",id);
  };

  const complete=Actions.markProjectBuildComplete.bind(Actions);
  Actions.markProjectBuildComplete=function(id){
    const result=complete(id),project=Store.get("projects",id);
    if(result&&result.ok&&project&&project.status==="GIFTED")Store.all("inventory").filter(i=>i.assignedProjectId===id).forEach(i=>Store.update("inventory",i.id,{status:"GIFTED",giftedProjectId:id}));
    return result;
  };

  if(typeof applyTreasuryChange==="function"){
    const addRepair=Actions.addRepair.bind(Actions);
    Actions.addRepair=function(data){const r=addRepair(data);applyTreasuryChange(Store.load().treasury,"repair",r.id,"REPAIR",r.cost,r.currency||"RSD","Repair cost");Store.persist();return r};
    const updateRepair=Actions.updateRepair.bind(Actions);
    Actions.updateRepair=function(id,data){const existing=findTreasuryFlow(Store.load().treasury,"repair",id,"REPAIR"),r=updateRepair(id,data);if(r&&existing)applyTreasuryChange(Store.load().treasury,"repair",id,"REPAIR",r.cost,r.currency||"RSD","Repair cost");Store.persist();return r};
    const removeRepair=Actions.removeRepair.bind(Actions);
    Actions.removeRepair=function(id){removeTreasuryFlow(Store.load().treasury,"repair",id,"REPAIR");Store.persist();return removeRepair(id)};

    const addProject=Actions.addProject.bind(Actions);
    Actions.addProject=function(data){const p=addProject(data),amount=Number(p.additionalCosts)||0;if(amount>0){applyTreasuryChange(Store.load().treasury,"project",p.id,"PROJECT_ADDITIONAL",amount,p.currency||"RSD","Project additional costs");Store.persist()}return p};
    const updateProjectWithCosts=Actions.updateProject.bind(Actions);
    Actions.updateProject=function(id,data){
      const before=Store.get("projects",id),oldAmount=Number(before&&before.additionalCosts)||0,result=updateProjectWithCosts(id,data);
      if(result&&data&&Object.prototype.hasOwnProperty.call(data,"additionalCosts")){const next=Number(result.additionalCosts)||0,flow=findTreasuryFlow(Store.load().treasury,"project",id,"PROJECT_ADDITIONAL"),amount=flow?next:Math.max(0,next-oldAmount);applyTreasuryChange(Store.load().treasury,"project",id,"PROJECT_ADDITIONAL",amount,result.currency||"RSD","Project additional costs");Store.persist()}
      return result;
    };
  }

  if(typeof MyRig!=="undefined"&&MyRig&&typeof MyRig.installFromGoal==="function"){
    const install=MyRig.installFromGoal.bind(MyRig);
    MyRig.installFromGoal=function(goal,options){window.__pnPersonalVaultTransfer=true;try{return install(goal,options)}finally{window.__pnPersonalVaultTransfer=false}};
  }
})();
