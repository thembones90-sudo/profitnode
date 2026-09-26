"use strict";
const env=require("./pn_test_env.js");
const DIR=__dirname;
function boot(raw){const sb=env.createSandbox();if(raw!=null)sb.localStorage.setItem("profitnode_ledger_v1",raw);env.loadAll(sb,DIR);return sb}
function run(sb,code){return env.run(sb,code)}
let pass=0,fail=0;
function check(name,ok,detail){console.log((ok?"PASS":"FAIL")+" - "+name+(detail?" :: "+detail:""));ok?pass++:fail++}

{
  const raw="{this is not valid json",sb=boot(raw);
  const state=JSON.parse(run(sb,`JSON.stringify({corrupt:PN_STORE_HEALTH.corrupt,key:PN_STORE_HEALTH.backupKey,orig:localStorage.getItem(STORAGE_KEY),backup:localStorage.getItem(PN_STORE_HEALTH.backupKey),persist:Store.persist()})`));
  check("corrupt ledger is backed up and cannot be overwritten",state.corrupt&&state.orig===raw&&state.backup===raw&&state.persist===false,JSON.stringify(state));
}

{
  const sb=boot(null);
  const result=JSON.parse(run(sb,`(()=>{const item=Actions.addInventory({category:"GPU",manufacturer:"Test",model:"Transit",purchaseDate:"2026-09-20",purchasePrice:10000,currency:"RSD",estimatedMarketValue:12000,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",notes:""});const sold=Actions.markInventorySold(item.id,{salePrice:15000,saleCurrency:"RSD",saleDate:"2026-09-21"});const before=Store.get("inventory",item.id);Actions.removeSale(sold.saleId);const after=Store.get("inventory",item.id);return JSON.stringify({id:item.id,before:before.status,after:after.status,link:after.saleTransactionId,price:after.salePrice,sales:Store.all("sales").filter(s=>s.inventoryItemId===item.id).length,raw:localStorage.getItem(STORAGE_KEY)})})()`));
  const reboot=boot(result.raw);
  const id=result.id;
  const afterBoot=JSON.parse(run(reboot,`(()=>{const x=Store.get("inventory","${id}");return JSON.stringify({status:x.status,link:x.saleTransactionId,sales:Store.all("sales").filter(s=>s.inventoryItemId==="${id}").length})})()`));
  check("deleting SOLD_IN_TRANSIT restores item and sale does not resurrect",result.before==="SOLD_IN_TRANSIT"&&result.after==="IN_STORAGE"&&result.link==null&&result.price==null&&result.sales===0&&afterBoot.status==="IN_STORAGE"&&afterBoot.link==null&&afterBoot.sales===0,JSON.stringify({result,afterBoot}));
}

{
  const sb=boot(null);
  const out=JSON.parse(run(sb,`(()=>{const item=Actions.addInventory({category:"GPU",manufacturer:"Test",model:"Owned Once",purchaseDate:"2026-09-20",purchasePrice:5000,currency:"RSD",estimatedMarketValue:7000,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",notes:""});const p=Actions.addProject({name:"Owner A",startDate:todayISO(),status:"PLANNING",purpose:"FLIP",currency:"RSD"});const slot=Actions.setProjectSlot(p.id,"GPU","INVENTORY",{inventoryItemId:item.id});const r=newRigDraft("Owner B");r.slots.GPU={kind:"INVENTORY",inventoryItemId:item.id};state.rigDraft=r;const id=saveRigDraft();const assembled=Actions.assembleRig(id);return JSON.stringify({slot:slot.ok,assembled:assembled.ok,error:assembled.error})})()`));
  check("project-owned part is rejected by rig assembly",out.slot===true&&out.assembled===false&&/build|reserved/i.test(out.error||""),JSON.stringify(out));
}

{
  const first=boot(null);
  const raw=run(first,`(()=>{const p=Actions.addProject({name:"Unfinished Gift",startDate:"2026-09-01",completionDate:"2026-09-20",status:"BUILDING",purpose:"FAMILY_GIFT",currency:"RSD",additionalCosts:0});delete Store.load().meta.giftLifecycleV3RepairedAt;Store.persist();return localStorage.getItem(STORAGE_KEY)})()`);
  const second=boot(raw);
  const gift=JSON.parse(run(second,`(()=>{const p=Store.all("projects").find(x=>x.name==="Unfinished Gift");return JSON.stringify({status:p.status,locked:!!p.buildLocked,gifts:Store.all("sales").filter(s=>s.projectId===p.id&&s.disposition==="GIFT").length})})()`));
  check("unfinished gift remains unfinished after reboot",gift.status==="BUILDING"&&!gift.locked&&gift.gifts===0,JSON.stringify(gift));
}

{
  const sb=boot(null);
  const out=JSON.parse(run(sb,`(()=>{const cash=()=>((Store.load().treasury.balances.find(b=>b.sourceKey==="CASH_RSD")||{}).amount||0),c0=cash(),x=Actions.addInventory({category:"CPU",manufacturer:"Gift",model:"Retired",purchaseDate:todayISO(),purchasePrice:1000,currency:"RSD",estimatedMarketValue:1000,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",notes:""}),c1=cash();Store.update("inventory",x.id,{status:"GIFTED"});Actions.removeInventory(x.id);return JSON.stringify({spent:c0-c1,after:cash(),expected:c1,flow:Store.load().treasury.flows.some(f=>f.refType==="inventory"&&f.refId===x.id&&f.kind==="ACQUISITION")})})()`));
  check("deleting gifted inventory does not refund its purchase",out.spent===1000&&out.after===out.expected&&out.flow===true,JSON.stringify(out));
}

{
  const sb=boot(null);
  const out=JSON.parse(run(sb,`(()=>{const cash=()=>((Store.load().treasury.balances.find(b=>b.sourceKey==="CASH_RSD")||{}).amount||0),r=MyRig.ensure();r.slots.GPU={label:"Old Personal GPU",purchasePrice:7000,purchaseDate:"2024-01-01",vaultId:null,dataSource:"MANUAL"};MyRig.save(r);const c0=cash(),res=MyRig.installFromGoal({id:"no-goal",targetSlot:"GPU",name:"New Personal GPU",target:15000},{toVault:true}),c1=cash(),moved=res.moved&&Store.get("inventory",res.moved.id);return JSON.stringify({ok:res.ok,before:c0,after:c1,moved:!!moved,flow:moved?Store.load().treasury.flows.some(f=>f.refType==="inventory"&&f.refId===moved.id&&f.kind==="ACQUISITION"):true})})()`));
  check("MY RIG to Vault transfer creates no acquisition debit",out.ok&&out.moved&&out.before===out.after&&out.flow===false,JSON.stringify(out));
}

{
  const sb=boot(null);
  const out=JSON.parse(run(sb,`(()=>{const cash=()=>((Store.load().treasury.balances.find(b=>b.sourceKey==="CASH_RSD")||{}).amount||0),item=Actions.addInventory({category:"CPU",manufacturer:"Cash",model:"Repair",purchaseDate:todayISO(),purchasePrice:0,currency:"RSD",estimatedMarketValue:0,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",notes:""}),c0=cash(),repair=Actions.addRepair({inventoryItemId:item.id,cost:3000,currency:"RSD",description:"Fix",date:todayISO()}),c1=cash(),p=Actions.addProject({name:"Cash Extras",startDate:todayISO(),status:"PLANNING",purpose:"FLIP",currency:"RSD",additionalCosts:2500}),c2=cash();Actions.updateProject(p.id,{additionalCosts:3000});const c3=cash();return JSON.stringify({repair:c0-c1,project:c1-c2,projectDelta:c2-c3,repairFlows:Store.load().treasury.flows.filter(f=>f.refType==="repair"&&f.refId===repair.id&&f.kind==="REPAIR").length,projectFlows:Store.load().treasury.flows.filter(f=>f.refType==="project"&&f.refId===p.id&&f.kind==="PROJECT_ADDITIONAL").length})})()`));
  check("repair and project cost flows reconcile cash",out.repair===3000&&out.project===2500&&out.projectDelta===500&&out.repairFlows===1&&out.projectFlows===1,JSON.stringify(out));
}

{
  const sb=boot(null);
  const out=JSON.parse(run(sb,`(()=>{const item=Actions.addInventory({category:"GPU",manufacturer:"Freeze",model:"Basis",purchaseDate:"2026-09-01",purchasePrice:10000,currency:"RSD",estimatedMarketValue:12000,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",notes:""}),p=Actions.addProject({name:"Freeze Project",startDate:"2026-09-01",completionDate:"2026-09-10",status:"LISTED",purpose:"FLIP",currency:"RSD",componentIds:[item.id],additionalCosts:0});Actions.updateProject(p.id,{salePrice:20000,saleDate:"2026-09-20",status:"SOLD"});const sale=Store.all("sales").find(s=>s.projectId===p.id),before=projectDerived(Store.get("projects",p.id));Actions.updateInventory(item.id,{purchasePrice:14000});const after=projectDerived(Store.get("projects",p.id));return JSON.stringify({saleDate:sale.saleDate,before:before.totalInvestment,after:after.totalInvestment,profitBefore:before.profit,profitAfter:after.profit})})()`));
  check("sold project uses actual sale date and frozen cost basis",out.saleDate==="2026-09-20"&&out.before===10000&&out.after===10000&&out.profitBefore===10000&&out.profitAfter===10000,JSON.stringify(out));
}

console.log("\n"+pass+" PASSED, "+fail+" FAILED");
if(fail)process.exit(1);
