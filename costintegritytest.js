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
  byId(late.id).createdAt = old;
  L.timeline.filter(ev => ev.relatedId === late.id).forEach(ev => { ev.createdAt = old; });
  lateFlow.createdAt = '2026-09-16T10:00:00.000Z';
  delete L.meta.treasuryAcquisitionRepairV5At;
  delete L.meta.treasuryAcquisitionRepairV6At;
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

// --- ACQ. Genuine purchases deduct exactly once and survive reloads, edits and a recount opened before the purchase ---
const acqSb = bootWith(null);
env.run(acqSb, `(()=>{const t=pnTreasuryCoreDraft(Store.load().treasury);t.balances.find(b=>b.sourceKey==='CASH_RSD').amount=100000;t.balances.find(b=>b.sourceKey==='CASH_EUR').amount=500;Store.load().treasury=t;Store.persist()})()`);
const acqState = (sb, id) => env.run(sb, `(()=>{const T=Store.load().treasury,bal=k=>(T.balances.find(b=>b.sourceKey===k)||{}).amount,fl=T.flows.filter(f=>f.refType==='inventory'&&f.refId==='${id}'&&f.kind==='ACQUISITION');return {rsd:bal('CASH_RSD'),eur:bal('CASH_EUR'),flows:fl.length,signed:fl[0]&&fl[0].signedDelta,rsdPools:T.balances.filter(b=>b.sourceKey==='CASH_RSD').length}})()`);
const acqAdd = (sb, model, price, cur) => env.run(sb, `Actions.addInventory({category:'GPU',manufacturer:'Test',model:'${model}',purchaseDate:todayISO(),purchasePrice:${price},currency:'${cur}',estimatedMarketValue:${price},source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''}).id`);
const acqSave = sb => env.run(sb, `(()=>{const ledger=Store.load();ledger.treasury=normalizeTreasury(pnTreasuryRebaseDraft(state.treasuryDraft,state.treasuryDraftBase,pnTreasuryData()));Store.persist();state.treasuryDraft=null})()`);
const acqOpen = sb => env.run(sb, `(()=>{state.treasuryDraft=pnTreasuryClone();state.treasuryDraftBase=pnTreasuryDraftBase(state.treasuryDraft)})()`);
const rsdId = acqAdd(acqSb, 'Acq 2700', 2700, 'RSD');
const a1 = acqState(acqSb, rsdId);
const eurId = acqAdd(acqSb, 'Acq 50', 50, 'EUR');
const a2 = acqState(acqSb, eurId);
const proj = env.run(acqSb, `Actions.addProject({name:'ACQ',startDate:todayISO(),status:'PLANNING',purpose:'FLIP',currency:'RSD'}).id`);
env.run(acqSb, `(()=>{Actions.updateInventory('${rsdId}',{notes:'edited'});Actions.updateInventory('${rsdId}',{status:'LISTED'});Actions.setProjectSlot('${proj}','GPU','INVENTORY',{inventoryItemId:'${rsdId}'})})()`);
const a3 = acqState(acqSb, rsdId);
const acqReload = bootWith(acqSb.localStorage.getItem('profitnode_ledger_v1'));
const a4 = acqState(acqReload, rsdId);
acqOpen(acqReload);
const lateId = acqAdd(acqReload, 'Acq During Recount', 2700, 'RSD');
acqSave(acqReload);
const a5 = acqState(acqReload, lateId);
acqOpen(acqReload);
env.run(acqReload, `state.treasuryDraft.balances.find(b=>b.sourceKey==='CASH_RSD').amount=90000`);
const typedId = acqAdd(acqReload, 'Acq Before Typed Recount', 1000, 'RSD');
acqSave(acqReload);
const a6 = acqState(acqReload, typedId);
const freshSb = bootWith(null);
acqOpen(freshSb);
const freshId = acqAdd(freshSb, 'Acq New Pool', 2700, 'RSD');
acqSave(freshSb);
const a7 = acqState(freshSb, freshId);
env.run(acqReload, `Actions.removeInventory('${lateId}')`);
const a8 = acqState(acqReload, lateId);
const acq = [
  ['ACQ: a 2700 RSD purchase deducts CASH_RSD once with a single -2700 ACQUISITION flow', a1.rsd === 97300 && a1.flows === 1 && a1.signed === -2700],
  ['ACQ: a 50 EUR purchase deducts CASH_EUR only', a2.eur === 450 && a2.rsd === 97300 && a2.flows === 1 && a2.signed === -50],
  ['ACQ: note, status and build-assignment edits never deduct again', a3.rsd === 97300 && a3.flows === 1],
  ['ACQ: the deduction survives a reload', a4.rsd === 97300 && a4.flows === 1],
  ['ACQ: saving a recount opened before a purchase keeps that purchase deduction and flow', a5.rsd === 94600 && a5.flows === 1 && a5.signed === -2700],
  ['ACQ: a retyped recount amount still wins while the purchase flow is kept', a6.rsd === 90000 && a6.flows === 1],
  ['ACQ: a cash pool first created during an open recount is merged, not duplicated or reset', a7.rsd === -2700 && a7.rsdPools === 1 && a7.flows === 1],
  ['ACQ: deleting the item refunds its purchase and removes the flow', a8.rsd === 90000 + 2700 && a8.flows === 0]
];
for (const [name, ok] of acq) {
  if (assert(name, ok)) passed++; else failed++;
}

// --- MONEY. Audit fixes: V4 spares legitimate late flows, V6 restores wrong refunds, mail direction, sold project price ---
const moneySb = bootWith(null);
env.run(moneySb, `(()=>{const t=pnTreasuryCoreDraft(Store.load().treasury);t.balances.find(b=>b.sourceKey==='CASH_RSD').amount=100000;t.balances.find(b=>b.sourceKey==='CASH_EUR').amount=1000;Store.load().treasury=t;Store.persist()})()`);
const moneyCash = (sb, cur) => env.run(sb, `(Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_${cur}')||{}).amount`);
const moneySeed = env.run(moneySb, `(function(){
  const add = (model, price, cur) => Actions.addInventory({category:'GPU',manufacturer:'Money',model:model,purchaseDate:'2026-09-20',purchasePrice:price,currency:cur,estimatedMarketValue:price,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const repaired = add('V5 Repaired', 2700, 'RSD'), currency = add('Currency Edit', 50, 'RSD'), wrong = add('Wrong Refund', 1500, 'RSD');
  const L = Store.load(), older = '2026-09-20T10:00:00.000Z';
  [repaired, currency, wrong].forEach(x => { L.inventory.find(i => i.id === x.id).createdAt = older; L.timeline.filter(ev => ev.relatedId === x.id).forEach(ev => { ev.createdAt = older; }); });
  removeTreasuryFlow(L.treasury, 'inventory', repaired.id, 'ACQUISITION');
  removeTreasuryFlow(L.treasury, 'inventory', wrong.id, 'ACQUISITION');
  L.meta.treasuryV4RefundedAcquisitions = [wrong.id];
  delete L.meta.treasuryAcquisitionRepairV5At; delete L.meta.treasuryAcquisitionRepairV6At;
  Store.persist();
  Actions.updateInventory(currency.id, {currency:'EUR'});
  return {repaired: repaired.id, currency: currency.id, wrong: wrong.id};
})()`);
const moneyRsd0 = moneyCash(moneySb, 'RSD'), moneyEur0 = moneyCash(moneySb, 'EUR');
let moneyBoot = bootWith(moneySb.localStorage.getItem('profitnode_ledger_v1'));
const moneyRsd1 = moneyCash(moneyBoot, 'RSD');
moneyBoot = bootWith(moneyBoot.localStorage.getItem('profitnode_ledger_v1'));
moneyBoot = bootWith(moneyBoot.localStorage.getItem('profitnode_ledger_v1'));
const moneyRsd3 = moneyCash(moneyBoot, 'RSD');
const moneyFlow = id => env.run(moneyBoot, `Store.load().treasury.flows.filter(f=>f.refType==='inventory'&&f.refId==='${id}'&&f.kind==='ACQUISITION').length`);
const moneyMeta = env.run(moneyBoot, `JSON.stringify(Store.load().meta.treasuryV4RefundedAcquisitions||[])`);
const mailRun = JSON.parse(env.run(moneyBoot, `(()=>{const cash=()=>Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD').amount,c0=cash(),m=Actions.addMail({direction:'incoming',linkedType:'none',linkedId:null,shippingCost:500,currency:'RSD',status:'IN_TRANSIT',dateSent:todayISO()});Actions.updateMail(m.id,{direction:'outgoing'});const switched=c0-cash(),kinds=Store.load().treasury.flows.filter(f=>f.refId===m.id).map(f=>f.kind);Actions.removeMail(m.id);return JSON.stringify({switched,kinds,afterDelete:c0-cash()})})()`));
const projRun = JSON.parse(env.run(moneyBoot, `(()=>{const cash=()=>Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD').amount,c0=cash(),p=Actions.addProject({name:'Money Sold',startDate:todayISO(),status:'LISTED',purpose:'FLIP',currency:'RSD'});Actions.updateProject(p.id,{status:'SOLD',salePrice:20000});const sold=cash()-c0;Actions.updateProject(p.id,{salePrice:25000});return JSON.stringify({sold,edited:cash()-c0,sales:Store.all('sales').filter(s=>s.projectId===p.id).map(s=>s.buyerPrice)})})()`));
const money = [
  ['MONEY: a V5 repair charge on an older item survives later loads', moneyRsd1 === moneyRsd0 - 2700 - 1500 && moneyRsd3 === moneyRsd1 && moneyFlow(moneySeed.repaired) === 1],
  ['MONEY: changing an older item currency moves its charge and survives reloads', moneyEur0 === 950 && moneyCash(moneyBoot, 'EUR') === 950 && moneyFlow(moneySeed.currency) === 1],
  ['MONEY: V6 re-charges a post-cutoff item V4 wrongly refunded, once, and clears it from the refund list', moneyFlow(moneySeed.wrong) === 1 && moneyMeta === '[]'],
  ['MONEY: switching a shipment direction keeps exactly one shipping charge', mailRun.switched === 500 && mailRun.kinds.join() === 'SHIPPING_OUT'],
  ['MONEY: deleting a direction-switched shipment refunds it fully', mailRun.afterDelete === 0],
  ['MONEY: editing a sold project sale price updates its single sale and cash credit', projRun.sold === 20000 && projRun.edited === 25000 && projRun.sales.join() === '25000']
];
for (const [name, ok] of money) {
  if (assert(name, ok)) passed++; else failed++;
}

// --- SOLD. Marked SOLD means sold for the entered amount; leaving SOLD reverses it ---
const soldRun = JSON.parse(env.run(moneyBoot, `(()=>{const cash=()=>Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD').amount,out={};
const it=Actions.addInventory({category:'GPU',manufacturer:'Sold',model:'Rule GPU',purchaseDate:todayISO(),purchasePrice:5000,currency:'RSD',estimatedMarketValue:9000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
let c0=cash();Actions.markInventorySold(it.id,{salePrice:9000,saleCurrency:'RSD',saleDate:todayISO()});Actions.markInventoryDelivered(it.id);out.invSold=cash()-c0;
out.formOptions=FORM_SCHEMAS.inventory(Store.get('inventory',it.id)).fields.find(f=>f.key==='status').options;
Actions.updateInventory(it.id,{status:'INCOMING',notes:'edited'});const after=Store.get('inventory',it.id);out.invEdit={status:after.status,notes:after.notes,credit:cash()-c0};
const p=Actions.addProject({name:'Sold Rule',startDate:todayISO(),status:'LISTED',purpose:'FLIP',currency:'RSD'}),part=Actions.addInventory({category:'CPU',manufacturer:'Sold',model:'Rule CPU',purchaseDate:todayISO(),purchasePrice:1000,currency:'RSD',estimatedMarketValue:1500,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
Actions.setProjectSlot(p.id,'CPU','INVENTORY',{inventoryItemId:part.id});c0=cash();Actions.updateProject(p.id,{status:'SOLD',salePrice:20000});out.projSold={credit:cash()-c0,part:Store.get('inventory',part.id).status};
Actions.updateProject(p.id,{status:'LISTED'});out.projUnsold={credit:cash()-c0,sales:Store.all('sales').filter(s=>s.projectId===p.id).length,part:Store.get('inventory',part.id).status};
Actions.updateProject(p.id,{status:'SOLD',salePrice:22000});out.projResold={credit:cash()-c0,sales:Store.all('sales').filter(s=>s.projectId===p.id).length};
return JSON.stringify(out)})()`));
const sold = [
  ['SOLD: marking an inventory item sold credits exactly the entered 9000', soldRun.invSold === 9000],
  ['SOLD: a sold item edit form offers only its sold status', soldRun.formOptions.join() === 'SOLD'],
  ['SOLD: a generic edit keeps a sold item SOLD, applies other fields, and keeps its credit', soldRun.invEdit.status === 'SOLD' && soldRun.invEdit.notes === 'edited' && soldRun.invEdit.credit === 9000],
  ['SOLD: marking a project SOLD credits its sale price and marks its parts SOLD', soldRun.projSold.credit === 20000 && soldRun.projSold.part === 'SOLD'],
  ['SOLD: moving a project off SOLD removes its sale and credit and returns its parts', soldRun.projUnsold.credit === 0 && soldRun.projUnsold.sales === 0 && soldRun.projUnsold.part === 'IN_BUILD'],
  ['SOLD: re-selling a project records one new sale at the new price', soldRun.projResold.credit === 22000 && soldRun.projResold.sales === 1]
];
const soldDelete = env.run(moneyBoot, `(()=>{const cash=()=>Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD').amount,c0=cash(),it=Actions.addInventory({category:'GPU',manufacturer:'Sold',model:'Deleted After Sale',purchaseDate:todayISO(),purchasePrice:3000,currency:'RSD',estimatedMarketValue:5000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});Actions.markInventorySold(it.id,{salePrice:5000,saleCurrency:'RSD',saleDate:todayISO()});Actions.removeInventory(it.id);return cash()-c0})()`);
sold.push(['SOLD: deleting a sold item keeps both its purchase and its sale (net +2000)', soldDelete === 2000]);
for (const [name, ok] of sold) {
  if (assert(name, ok)) passed++; else failed++;
}

console.log('');
console.log('COST INTEGRITY: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
