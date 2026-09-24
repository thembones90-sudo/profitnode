"use strict";
const fs = require('fs');
const path = require('path');
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
env.loadAll(sandbox, DIR);

function assert(name, ok){ console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name); return ok; }
let passed = 0, failed = 0;

const results = env.run(sandbox, `
(function(){
  const out = [];
  function log(name, ok){ out.push([name, !!ok]); }
  Store.load();

  // --- B. Project total based on linked inventory must not count shipping again ---
  (function(){
    const item = Actions.addInventory({category:'GPU',manufacturer:'NVIDIA',model:'GTX 1070',purchaseDate:'2026-02-01',purchasePrice:8000,currency:'RSD',estimatedMarketValue:12000,source:'KP',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const mail = Actions.addMail({direction:'incoming',linkedType:'inventory',linkedId:item.id,shippingCost:600,currency:'RSD',status:'delivered',dateSent:'2026-02-02'});
    const proj = Actions.addProject({name:'Integrity B',startDate:'2026-02-01',status:'PLANNING',currency:'RSD',componentIds:[item.id],additionalCosts:0});
    const total = Actions.projectTotalInvestment(proj);
    log('B: inventory-linked incoming mail counted exactly once in project total', total === 8600);
    Actions.removeProject(proj.id);
    Actions.removeMail(mail.id);
    Actions.removeInventory(item.id);
  })();

  // --- C. Sale profit with outgoing mail ---
  (function(){
    const sale = Actions.addSale({itemName:'Finished PC',saleDate:'2026-03-01',buyerPrice:40000,originalInvestment:30000,additionalCosts:0,currency:'RSD',referenceStartDate:'2026-02-01',notes:''});
    const mail = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:sale.id,shippingCost:700,currency:'RSD',status:'delivered',dateSent:'2026-03-02'});
    const d = saleDerived(sale);
    log('C: outgoing mail reduces profit to 9300', d.profit === 9300 && d.totalCost === 30700);
    log('C: margin and ROI derived from correct total cost', Math.abs(d.margin - (9300/40000*100)) < 0.001 && Math.abs(d.roi - (9300/30700*100)) < 0.001);
    Actions.removeMail(mail.id);
    Actions.removeSale(sale.id);
  })();

  // --- D. Edit outgoing postage 700 -> 900 ---
  (function(){
    const sale = Actions.addSale({itemName:'Finished PC',saleDate:'2026-03-01',buyerPrice:40000,originalInvestment:30000,additionalCosts:0,currency:'RSD',referenceStartDate:'2026-02-01',notes:''});
    const mail = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:sale.id,shippingCost:700,currency:'RSD',status:'delivered',dateSent:'2026-03-02'});
    Actions.updateMail(mail.id, {shippingCost:900});
    const d = saleDerived(sale);
    log('D: editing outgoing postage to 900 yields profit 9100', d.profit === 9100 && d.totalCost === 30900);
    Actions.removeMail(mail.id);
    Actions.removeSale(sale.id);
  })();

  // --- E. Delete postage record reverts profit ---
  (function(){
    const sale = Actions.addSale({itemName:'Finished PC',saleDate:'2026-03-01',buyerPrice:40000,originalInvestment:30000,additionalCosts:0,currency:'RSD',referenceStartDate:'2026-02-01',notes:''});
    const mail = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:sale.id,shippingCost:700,currency:'RSD',status:'delivered',dateSent:'2026-03-02'});
    Actions.removeMail(mail.id);
    const d = saleDerived(sale);
    log('E: deleting postage record restores profit to 10000', d.profit === 10000 && d.totalCost === 30000);
    Actions.removeSale(sale.id);
  })();

  // --- F. Two legitimate shipment expenses both count exactly once ---
  (function(){
    const item = Actions.addInventory({category:'CPU',manufacturer:'AMD',model:'Ryzen 5 3600',purchaseDate:'2026-04-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:8000,source:'KP',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const m1 = Actions.addMail({direction:'incoming',linkedType:'inventory',linkedId:item.id,shippingCost:500,currency:'RSD',status:'delivered',dateSent:'2026-04-02'});
    const m2 = Actions.addMail({direction:'incoming',linkedType:'inventory',linkedId:item.id,shippingCost:350,currency:'RSD',status:'delivered',dateSent:'2026-04-03'});
    const proj = Actions.addProject({name:'Integrity F',startDate:'2026-04-01',status:'PLANNING',currency:'RSD',componentIds:[item.id],additionalCosts:0});
    const sale = Actions.addSale({itemName:'Integrity F PC',saleDate:'2026-04-10',buyerPrice:15000,originalInvestment:Actions.projectTotalInvestment(proj),additionalCosts:0,currency:'RSD',referenceStartDate:'2026-04-01',notes:''});
    const m3 = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:sale.id,shippingCost:700,currency:'RSD',status:'delivered',dateSent:'2026-04-11'});
    const d = saleDerived(sale);
    log('F: two incoming + one outgoing shipments sum once each', d.totalCost === 6550 && d.profit === 8450);
    Actions.removeMail(m1.id); Actions.removeMail(m2.id); Actions.removeMail(m3.id);
    Actions.removeSale(sale.id); Actions.removeProject(proj.id); Actions.removeInventory(item.id);
  })();

  // --- G. Export + restore preserves identical financial results ---
  (function(){
    const item = Actions.addInventory({category:'GPU',manufacturer:'AMD',model:'RX 580',purchaseDate:'2026-05-01',purchasePrice:4000,currency:'RSD',estimatedMarketValue:7000,source:'KP',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const mail = Actions.addMail({direction:'incoming',linkedType:'inventory',linkedId:item.id,shippingCost:450,currency:'RSD',status:'delivered',dateSent:'2026-05-02'});
    const proj = Actions.addProject({name:'Integrity G',startDate:'2026-05-01',status:'PLANNING',currency:'RSD',componentIds:[item.id],additionalCosts:250});
    const sale = Actions.addSale({itemName:'Integrity G PC',saleDate:'2026-05-10',buyerPrice:12000,originalInvestment:Actions.projectTotalInvestment(proj)-250,additionalCosts:250,currency:'RSD',referenceStartDate:'2026-05-01',notes:''});
    const outMail = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:sale.id,shippingCost:600,currency:'RSD',status:'delivered',dateSent:'2026-05-11'});
    const before = saleDerived(sale).profit;
    const backup = JSON.parse(JSON.stringify(Store.load()));
    Store.replaceAll(backup);
    const restoredSale = Store.get('sales', sale.id);
    const after = saleDerived(restoredSale).profit;
    log('G: export+restore preserves sale profit', before === after);
    Actions.removeMail(outMail.id); Actions.removeMail(mail.id);
    Actions.removeSale(sale.id); Actions.removeProject(proj.id); Actions.removeInventory(item.id);
  })();

  // --- H. Cross-currency acquisition / repair / sale basis ---
  (function(){
    const item = Actions.addInventory({category:'GPU',manufacturer:'X',model:'FX Mix',purchaseDate:'2026-06-10',purchasePrice:100,currency:'EUR',estimatedMarketValue:0,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
    Actions.addRepair({inventoryItemId:item.id,cost:1000,currency:'RSD',description:'repair',date:'2026-06-10'});
    const project = Actions.addProject({name:'Integrity H',startDate:'2026-06-10',status:'PLANNING',currency:'RSD',componentIds:[item.id],additionalCosts:0});
    log('H: EUR purchase plus RSD repair converts into project RSD cost', Math.abs(Actions.projectTotalInvestment(project)-12750) < 0.001);
    log('H: acquisition basis converts into requested currency before adding repair cost', Math.abs(inventoryAcquisitionCost(item,'EUR')-(100+1000/117.5)) < 0.001);
    Actions.removeProject(project.id);
    Actions.removeInventory(item.id);

    const saleItem = Actions.addInventory({category:'GPU',manufacturer:'X',model:'FX Sale',purchaseDate:'2026-06-11',purchasePrice:10000,currency:'RSD',estimatedMarketValue:0,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const sold = Actions.markInventorySold(saleItem.id,{salePrice:100,saleCurrency:'EUR',saleDate:'2026-06-12'});
    const sale = Store.get('sales', sold.saleId || sold.transactionId);
    log('H: component sale stores acquisition basis in sale currency', !!sale && Math.abs(sale.originalInvestment-(10000/117.5)) < 0.001 && Math.abs(saleDerived(sale).profit-(100-10000/117.5)) < 0.001);
  })();

  // --- Zero / empty / invalid handling ---
  (function(){
    const item = Actions.addInventory({category:'OTHER',manufacturer:'X',model:'Y',purchaseDate:'2026-06-01',purchasePrice:'abc',currency:'RSD',estimatedMarketValue:100,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const acq = inventoryAcquisitionCost(item, 'RSD');
    log('Z: invalid purchase price sanitized to 0', acq === 0);
    Actions.removeInventory(item.id);
    const empty = inventoryAcquisitionCost(null, 'RSD');
    log('Z: null item returns 0', empty === 0);
  })();

  // --- Reassign / unlink mail ---
  (function(){
    const saleA = Actions.addSale({itemName:'Sale A',saleDate:'2026-07-01',buyerPrice:20000,originalInvestment:15000,additionalCosts:0,currency:'RSD',referenceStartDate:'2026-06-01',notes:''});
    const saleB = Actions.addSale({itemName:'Sale B',saleDate:'2026-07-01',buyerPrice:25000,originalInvestment:18000,additionalCosts:0,currency:'RSD',referenceStartDate:'2026-06-01',notes:''});
    const mail = Actions.addMail({direction:'outgoing',linkedType:'sale',linkedId:saleA.id,shippingCost:500,currency:'RSD',status:'delivered',dateSent:'2026-07-02'});
    const beforeA = saleDerived(saleA).profit;
    Actions.updateMail(mail.id, {linkedId:saleB.id});
    const afterA = saleDerived(saleA).profit;
    const afterB = saleDerived(saleB).profit;
    log('R: reassigning mail removes cost from old sale', afterA === beforeA + 500);
    log('R: reassigning mail adds cost to new sale', afterB === 7000 - 500);
    Actions.updateMail(mail.id, {linkedType:'none',linkedId:null});
    log('R: unlinking mail removes cost entirely', saleDerived(saleB).profit === 7000);
    Actions.removeMail(mail.id); Actions.removeSale(saleA.id); Actions.removeSale(saleB.id);
  })();

  return out;
})()
`);

for (const [name, ok] of results) {
  if (assert(name, ok)) passed++; else failed++;
}

// --- V5. Missing acquisition repair is scoped: post-cutoff only, never re-charges V4 refunds, runs once ---
function bootWith(raw){
  const sb = env.createSandbox();
  if (raw) sb.localStorage.setItem('profitnode_ledger_v1', raw);
  env.loadAll(sb, DIR);
  return sb;
}
function cashRsd(sb){ return env.run(sb, `(Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD')||{}).amount||0`); }
function hasAcq(sb, id){ return env.run(sb, `!!findTreasuryFlow(Store.load().treasury,'inventory','${id}','ACQUISITION')`); }
const seedSb = bootWith(null);
const seed = env.run(seedSb, `(function(){
  const add = model => Actions.addInventory({category:'CPU',manufacturer:'Intel',model:model,purchaseDate:'2026-09-01',purchasePrice:1000,currency:'RSD',estimatedMarketValue:1500,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const legacy = add('Legacy Missing'), recent = add('Recent Missing'), late = add('Late Flow');
  const L = Store.load(), old = '2026-09-01T10:00:00.000Z';
  const byId = id => L.inventory.find(x => x.id === id);
  byId(legacy.id).createdAt = old;
  L.timeline.filter(ev => ev.relatedId === legacy.id).forEach(ev => { ev.createdAt = old; });
  [legacy.id, recent.id].forEach(id => removeTreasuryFlow(L.treasury, 'inventory', id, 'ACQUISITION'));
  const lateFlow = findTreasuryFlow(L.treasury, 'inventory', late.id, 'ACQUISITION');
  lateFlow.createdAt = new Date(Date.parse(byId(late.id).createdAt) + 3600e3).toISOString();
  delete L.meta.treasuryAcquisitionRepairV5At;
  Store.persist();
  return {legacy: legacy.id, recent: recent.id, late: late.id};
})()`);
const seedRaw = seedSb.localStorage.getItem('profitnode_ledger_v1');
const cashBefore = cashRsd(seedSb);
const boot1 = bootWith(seedRaw);
const raw1 = boot1.localStorage.getItem('profitnode_ledger_v1');
const cash1 = cashRsd(boot1);
const v5 = [
  ['V5: pre-cutoff inventory without a flow stays uncharged', !hasAcq(boot1, seed.legacy)],
  ['V5: post-cutoff inventory missing its flow is charged', hasAcq(boot1, seed.recent)],
  ['V5: an item V4 refunded is not re-charged', !hasAcq(boot1, seed.late)],
  ['V5: net cash moves by exactly one recharge minus one V4 refund', cash1 === cashBefore],
  ['V5: records its one-shot marker in ledger meta', !!JSON.parse(raw1).meta.treasuryAcquisitionRepairV5At]
];
const reseed = JSON.parse(raw1);
reseed.treasury.flows = reseed.treasury.flows.filter(f => f.refId !== seed.recent);
const boot2 = bootWith(JSON.stringify(reseed));
v5.push(['V5: does not run again once its marker is set', !hasAcq(boot2, seed.recent)]);
for (const [name, ok] of v5) {
  if (assert(name, ok)) passed++; else failed++;
}

console.log('');
console.log('COST INTEGRITY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
