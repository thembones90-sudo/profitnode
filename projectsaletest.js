"use strict";
const env=require("./pn_test_env.js");
function ok(name,value,detail){if(!value)throw Error("FAIL - "+name+(detail?"\n"+detail:""));console.log("PASS - "+name)}

const s=env.createSandbox();
env.loadAll(s,__dirname);
const result=env.run(s,`(()=>{
  const item=Actions.addInventory({category:'GPU',manufacturer:'Recovery',model:'REVENANT III BASIS',purchaseDate:'2026-09-09',purchasePrice:26490,currency:'RSD',estimatedMarketValue:44600,source:'OTHER',condition:'WORKING',status:'INSTALLED'});
  const project=Actions.addProject({name:'REVENANT III',startDate:'2026-09-09',status:'COMPLETED',purpose:'FLIP',currency:'RSD',additionalCosts:0,estimatedMarketValue:44600});
  Store.update('inventory',item.id,{assignedProjectId:project.id,status:'INSTALLED'});
  Store.update('projects',project.id,{buildLocked:true,completionDate:'2026-10-03'});
  const treasury=Store.load().treasury;
  treasury.balances=[{id:'eur',sourceKey:'CASH_EUR',label:'Cash (EUR)',amount:1000,currency:'EUR',include:true}];
  treasury.flows=[];Store.persist();
  state.pbId=project.id;PBUI.saleOpen=false;
  const beforeHtml=renderProjectBuild();
  PBUI.saleOpen=true;const modalHtml=renderProjectBuild();PBUI.saleOpen=false;
  const sold=Actions.markProjectSold(project.id,{salePrice:340,saleCurrency:'EUR',saleDate:'2026-10-04',saleChannel:'CASH',saleDetail:'Luka'});
  const sale=Store.get('sales',sold.saleId),derived=saleDerived(sale),after=Store.get('projects',project.id),flow=findTreasuryFlow(Store.load().treasury,'sale',sale.id,'SALE'),cash=Store.load().treasury.balances.find(x=>x.sourceKey==='CASH_EUR'),command=dashboardStats('EUR'),afterHtml=renderProjectBuild(),again=Actions.markProjectSold(project.id,{salePrice:340,saleCurrency:'EUR'});
  return {beforeHtml,modalHtml,sold,sale,derived,after,flow,cash,command,afterHtml,again,itemStatus:Store.get('inventory',item.id).status,sales:Store.all('sales').length,flows:Store.load().treasury.flows.filter(x=>x.kind==='SALE').length};
})()`);

ok("completed BUILD WORKSPACE exposes the main SOLD action",result.beforeHtml.includes("data-pb-sell-build")&&result.beforeHtml.includes(">SOLD</button>"));
ok("SOLD opens a compact final price, currency and date form",result.modalHtml.includes("data-pb-sale-form")&&result.modalHtml.includes('name="salePrice"')&&result.modalHtml.includes('name="saleCurrency"')&&result.modalHtml.includes('name="saleDate"'));
ok("project sale stores the exact final amount and closes the build",result.sold.ok&&result.after.status==="SOLD"&&result.after.salePrice===340&&result.after.saleCurrency==="EUR"&&result.after.saleDate==="2026-10-04");
ok("cross-currency cost basis is converted before calculating realized profit",Math.abs(result.sale.originalInvestment-(26490/117.5))<0.001&&Math.abs(result.derived.profit-(340-26490/117.5))<0.001,JSON.stringify(result.sale));
ok("completed project sale creates one canonical RIG sale",result.sale.saleType==="RIG"&&result.sale.saleState==="COMPLETED"&&result.sales===1);
ok("gross sale revenue enters the matching War Chest cash pool exactly once",result.cash.amount===1340&&result.flow&&result.flow.amount===340&&result.flow.currency==="EUR"&&result.flows===1);
ok("sale profit enters Command realized profit",Math.abs(result.command.realizedProfit-result.derived.profit)<0.001);
ok("installed project inventory closes as SOLD",result.itemStatus==="SOLD");
ok("selling an already sold build is rejected without duplicate money",!result.again.ok&&result.sales===1&&result.flows===1&&result.cash.amount===1340);
ok("sold workspace replaces action with the final sold amount",!result.afterHtml.includes("data-pb-sell-build")&&result.afterHtml.includes("SOLD · €340"));
console.log("ALL PROJECT SALE TESTS PASSED");
