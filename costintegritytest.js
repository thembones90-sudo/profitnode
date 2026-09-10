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

  // --- A. Deal + incoming mail => acquisition cost 5500 ---
  (function(){
    const deal = Actions.addDeal({item:'Test GPU',category:'GPU',date:'2026-01-01',purchasePrice:5000,estimatedMarketValue:7000,currency:'RSD',condition:'WORKING',source:'KP',inventoryItemId:null,notes:''});
    const item = Actions.addInventory({category:'GPU',manufacturer:'NVIDIA',model:'GTX 1060',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'KP',condition:'WORKING',status:'IN_STORAGE',notes:''});
    Actions.updateDeal(deal.id, {inventoryItemId: item.id});
    const mail = Actions.addMail({direction:'incoming',linkedType:'deal',linkedId:deal.id,shippingCost:500,currency:'RSD',status:'delivered',dateSent:'2026-01-02'});
    const acq = inventoryAcquisitionCost(item, 'RSD');
    const dealEff = dealDerived(deal);
    log('A: deal-linked incoming mail raises inventory acquisition cost to 5500', acq === 5500);
    log('A: dealDerived effective cost also reflects 5500', dealEff.amountSaved === 1500);
    Actions.removeMail(mail.id);
    Actions.removeInventory(item.id);
    Actions.removeDeal(deal.id);
  })();

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

console.log('');
console.log('COST INTEGRITY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
