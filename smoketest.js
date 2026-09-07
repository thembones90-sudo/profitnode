"use strict";
const fs = require('fs');
const path = require('path');
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
const entries = env.loadAll(sandbox, DIR);

const checks = [];

// --- Manifest / architecture checks (Node side) ---
const CANONICAL_ORDER = [
  'app_core.js', 'planner_retirement_extension.js', 'terminal_naming_extension.js',
  'psu_extension.js', 'sale_type_extension.js', 'command_center_extension.js',
  'command_header_glitch_extension.js', 'rig_bench_navigation_extension.js',
  'command_financial_model_extension.js', 'profitnode_intelligence_extension.js',
  'command_separator_tune.js', 'roulette_extension.js', 'roulette_ui_extension.js',
  'sidebar_cleanup_extension.js'
];
checks.push(['manifest has 14 scripts', entries.length === 14]);
checks.push(['manifest order matches canonical 14-file load order',
  entries.map(e => e.split('?')[0]).join(',') === CANONICAL_ORDER.join(',')]);
checks.push(['first script is app_core.js', entries[0].split('?')[0] === 'app_core.js']);
checks.push(['last script is sidebar_cleanup_extension.js',
  entries[entries.length - 1].split('?')[0] === 'sidebar_cleanup_extension.js']);
checks.push(['every manifest entry has a cache-busting ?v= suffix',
  entries.every(e => /\.js\?v=.+/.test(e))]);
checks.push(['every manifest entry maps to a real file on disk',
  entries.every(e => fs.existsSync(path.join(DIR, e.split('?')[0])))]);

const appJs = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
checks.push(['app.js loader streams the manifest via document.write',
  /document\.write\(/.test(appJs) && /window\.__PN_SCRIPTS/.test(appJs)]);
checks.push(['index.html loads pn_scripts.js before app.js',
  (fs.readFileSync(path.join(DIR, 'index.html'), 'utf8').match(/<script src="pn_scripts\.js"><\/script>/g) || []).length === 1]);

// --- Sandbox probe: post-load global state ---
const meta = env.run(sandbox, `(() => ({
  routes: ROUTES.map(r => r.key + '|' + r.nix + '|' + r.label),
  csvKeys: Object.keys(CSV_EXPORTS),
  saleTypes: Array.isArray(PN_SALE_TYPES) ? PN_SALE_TYPES.join(',') : null,
  curren: (typeof CURRENCIES !== 'undefined' ? CURRENCIES.join(',') : null),
  manifestLen: window.__PN_SCRIPTS.length,
}))()`);

const routes = meta.routes.map(r => r.split('|'));
const routeKeys = routes.map(r => r[0]);
checks.push(['ROUTES has 11 entries (planner retired + roulette added)', routes.length === 11]);
checks.push(['no Build Planner route', !routeKeys.includes('planner')]);
checks.push(['roulette route present', routeKeys.includes('roulette')]);
checks.push(['backup route still present', routeKeys.includes('backup')]);
const expectedSeq = [
  ['dashboard','01','COMMAND'], ['analytics','02','INTEL'], ['rigbuild','03','RIG BENCH'],
  ['projects','04','BUILDS'], ['inventory','05','PARTS VAULT'], ['repairs','06','REPAIR BAY'],
  ['deals','07','THE HUNT'], ['sales','08','LEDGER'], ['history','09','ARCHIVE'],
  ['roulette','10','THE ROULETTE'], ['backup','11','BLACKBOX']
];
checks.push(['nav order/nix/labels match terminal rename + roulette insert',
  routes.map(r => r.join('|')).join(',') === expectedSeq.map(r => r.join('|')).join(',')]);
checks.push(['plans CSV export retired', !meta.csvKeys.includes('plans')]);
checks.push(['roulette ledger CSV export registered', meta.csvKeys.includes('rouletteLedger')]);
checks.push(['PN_SALE_TYPES = RIG,COMPONENT,OTHER', meta.saleTypes === 'RIG,COMPONENT,OTHER']);
checks.push(['currencies remain RSD,EUR', meta.curren === 'RSD,EUR']);
checks.push(['manifest still declares 14 scripts in sandbox', meta.manifestLen === 14]);

// --- Functional probe (Store/Actions + extensions wiring) ---
const probe = `
(function(){
  const diary = [];
  function log(name, ok){ diary.push([name, !!ok]); }
  Store.load();

  const item = Actions.addInventory({category:'CPU',manufacturer:'Intel',model:'Core i5-10400F',purchaseDate:'2026-01-01',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  log('Actions.addInventory returns an id', !!item.id);
  log('Store.get round-trips the inserted row', Store.get('inventory', item.id) && Store.get('inventory', item.id).model === 'Core i5-10400F');
  const updated = Store.update('inventory', item.id, {estimatedMarketValue: 16000});
  log('Store.update mutates and persists', updated.estimatedMarketValue === 16000);
  log('ledger persisted under profitnode_ledger_v1', typeof localStorage.getItem('profitnode_ledger_v1') === 'string' && localStorage.getItem('profitnode_ledger_v1').includes('Core i5-10400F'));

  const sale = Actions.addSale({inventoryItemId:item.id,itemName:'Core i5-10400F',saleDate:'2026-01-01',buyerPrice:20000,originalInvestment:10500,additionalCosts:200,currency:'RSD',reason:'',notes:'',saleType:'COMPONENT'});
  log('Actions.addSale creates a Sales row', !!sale && sale.itemName === 'Core i5-10400F');
  log('saleTypeResolved buckets a COMPONENT sale', typeof saleTypeResolved === 'function' && saleTypeResolved(sale) === 'COMPONENT');
  Store.remove('sales', sale.id);
  log('Store.remove deletes the row', !Store.get('sales', sale.id));

  log('catalogEntriesForSlot(PSU) delegates to HardwareCatalog.psus', catalogEntriesForSlot('PSU') === (HardwareCatalog.psus || []));
  log('gpuPsuRequirement and psuResolvedWattage exist', typeof gpuPsuRequirement === 'function' && typeof psuResolvedWattage === 'function');
  log('HardwareCatalog.psuError starts null', HardwareCatalog.psuError === null);

  const dashHtml = renderDashboard();
  log('renderDashboard renders the command financial model', typeof dashHtml === 'string' && dashHtml.includes('TOTAL SPENT'));
  log('dashboard route render is the command dashboard', (ROUTES.find(r=>r.key==='dashboard').render() || '').includes('TOTAL SPENT'));
  log('command dashboard carries hero-finance markers', dashHtml.includes('pn-command-hero-finance'));

  const stats = dashboardStats('RSD');
  log('dashboardStats gains capital-headline keys', typeof stats.totalCapitalInvested === 'number' && typeof stats.currentInventoryValue === 'number' && typeof stats.unrealizedProfit === 'number');

  state.route = 'roulette';
  const rouletteHtml = renderShell();
  log('roulette route renders the chamber', typeof rouletteHtml === 'string' && rouletteHtml.includes('pn-r3-content') && rouletteHtml.includes('THE ROULETTE'));

  const gpu = Actions.addInventory({category:'GPU',manufacturer:'NVIDIA',model:'GTX 1070',purchaseDate:'2026-01-01',purchasePrice:12000,currency:'RSD',estimatedMarketValue:16000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigCpu = Actions.addInventory({category:'CPU',manufacturer:'AMD',model:'Ryzen 5 3600',purchaseDate:'2026-01-01',purchasePrice:9000,currency:'RSD',estimatedMarketValue:13000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const draft = newRigDraft('REV');
  draft.slots.CPU = {kind:'INVENTORY', inventoryItemId: rigCpu.id};
  draft.slots.GPU = {kind:'INVENTORY', inventoryItemId: gpu.id};
  state.rigDraft = draft;
  const rigId = saveRigDraft();
  const asm = Actions.assembleRig(rigId);
  log('assembleRig succeeds', asm.ok === true);
  log('assembleRig marks assembled parts IN_RIG', Store.get('inventory', rigCpu.id).status === 'IN_RIG');

  log('RIG_SLOT_LABELS has 15 slots', Object.keys(RIG_SLOT_LABELS).length === 15 && !!RIG_SLOT_LABELS.STORAGE8);
  log('STORAGE_SLOT_KEYS has 8 entries', STORAGE_SLOT_KEYS.length === 8);

  log('inspectBackupFile recognizes rigs collection', !!inspectBackupFile({rigs:[{}]}));

  return diary;
})()
`;
const results = env.run(sandbox, probe);

// --- Legacy RIG BUILD logic probe (kept from previous suite) ---
const rigProbe = `
(function(){
  const out = [];

  out.push(['emptyLedger has rigs array', Array.isArray(emptyLedger().rigs)]);

  Store.load();
  const cpuItem = Actions.addInventory({category:'CPU',manufacturer:'Intel',model:'Core i5-10400F',purchaseDate:'2026-01-01',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const moboItem = Actions.addInventory({category:'MOTHERBOARD',manufacturer:'Gigabyte',model:'B450M DS3H',purchaseDate:'2026-01-01',purchasePrice:6000,currency:'RSD',estimatedMarketValue:9000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const psuItem = Actions.addInventory({category:'PSU',manufacturer:'Cooler Master',model:'MWE 300W',purchaseDate:'2026-01-01',purchasePrice:3000,currency:'RSD',estimatedMarketValue:4000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});

  const draft = newRigDraft('TESTRIG');
  draft.variantName = 'Variant A';
  draft.slots.CPU = {kind:'INVENTORY', inventoryItemId: cpuItem.id};
  draft.slots.MOBO = {kind:'INVENTORY', inventoryItemId: moboItem.id};
  draft.slots.PSU = {kind:'INVENTORY', inventoryItemId: psuItem.id};
  draft.expectedSalePrice = 30000;
  state.rigDraft = draft;
  const savedId = saveRigDraft();
  out.push(['rig saved with id', !!savedId]);

  const rig = Store.get('rigs', savedId);
  const d = rigDerived(rig);
  out.push(['totalCost > 0', d.totalCost > 0]);
  out.push(['totalCost matches sum', Math.abs(d.totalCost - (10000+6000+3000)) < 1]);
  out.push(['profit computed', d.profit === (30000 - d.totalCost)]);

  const warnings = rigWarnings(rig);
  out.push(['warnings is array', Array.isArray(warnings)]);
  out.push(['detects CPU/MOBO socket mismatch', warnings.some(w=>/platform/.test(w))]);
  out.push(['flags missing storage', warnings.some(w=>/storage/i.test(w))]);
  out.push(['flags missing GPU / no iGPU (F-suffix CPU)', warnings.some(w=>/video output/i.test(w))]);
  out.push(['does NOT falsely flag PSU wattage (no GPU, 300W is enough)', !warnings.some(w=>/PSU wattage/.test(w))]);

  const res1 = Actions.assembleRig(savedId);
  out.push(['assemble ok', res1.ok === true]);
  const cpuAfter = Store.get('inventory', cpuItem.id);
  out.push(['cpu now IN_RIG', cpuAfter.status === 'IN_RIG']);
  out.push(['cpu assignedRigId set', cpuAfter.assignedRigId === savedId]);

  const draft2 = newRigDraft('TESTRIG');
  draft2.variantName = 'Variant B';
  draft2.slots.CPU = {kind:'INVENTORY', inventoryItemId: cpuItem.id};
  state.rigDraft = draft2;
  const id2 = saveRigDraft();
  const res2 = Actions.assembleRig(id2);
  out.push(['double-assembly blocked', res2.ok === false && /already physically assembled/.test(res2.error||'')]);

  const res3 = Actions.disassembleRig(savedId);
  out.push(['disassemble ok', res3.ok === true]);
  const cpuAfter2 = Store.get('inventory', cpuItem.id);
  out.push(['cpu released to IN_STORAGE', cpuAfter2.status === 'IN_STORAGE']);
  out.push(['cpu assignedRigId cleared', cpuAfter2.assignedRigId === null]);
  out.push(['rig record preserved after disassemble', !!Store.get('rigs', savedId)]);
  out.push(['rig status is DISASSEMBLED', Store.get('rigs', savedId).status === 'DISASSEMBLED']);

  Actions.assembleRig(savedId);
  const salesBefore = Store.all('sales').length;
  const res4 = Actions.markRigSold(savedId);
  out.push(['mark sold ok', res4.ok === true]);
  out.push(['sales record created', Store.all('sales').length === salesBefore + 1]);
  out.push(['rig status SOLD', Store.get('rigs', savedId).status === 'SOLD']);
  const cpuAfter3 = Store.get('inventory', cpuItem.id);
  out.push(['cpu marked SOLD too', cpuAfter3.status === 'SOLD']);

  const dup = Actions.duplicateRig(id2, 'Variant B copy');
  out.push(['duplicate created', !!dup && dup.family === 'TESTRIG']);
  out.push(['rigFamilies groups correctly', rigFamilies().find(f=>f.family==='TESTRIG').variants.length === 3]);

  Actions.removeRig(id2);
  out.push(['removeRig removed record', !Store.get('rigs', id2)]);

  out.push(['inspectBackupFile recognizes rigs', !!inspectBackupFile({rigs:[{a:1}]})]);

  const timeline = Store.all('timeline');
  out.push(['assemble logs a RIG_STATUS timeline entry', timeline.some(t => t.type === 'RIG_STATUS' && /ASSEMBLED/.test(t.title) && t.relatedType === 'rig')]);
  out.push(['disassemble logs a RIG_STATUS timeline entry', timeline.some(t => t.type === 'RIG_STATUS' && /DISASSEMBLED/.test(t.title) && t.relatedType === 'rig')]);

  const ramShared = Actions.addInventory({category:'RAM',manufacturer:'Corsair',model:'Vengeance 16GB',purchaseDate:'2026-01-01',purchasePrice:4000,currency:'RSD',estimatedMarketValue:6000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigX = newRigDraft('RESERVEFAM-X'); rigX.variantName = 'X'; rigX.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramShared.id};
  state.rigDraft = rigX; const rigXId = saveRigDraft();
  const rigY = newRigDraft('RESERVEFAM-Y'); rigY.variantName = 'Y'; rigY.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramShared.id};
  state.rigDraft = rigY; const rigYId = saveRigDraft();
  const reserveWarnsY = rigReserveWarnings(Store.get('rigs', rigYId));
  out.push(['soft-reserve warning fires for a part planned on two PLANNED rigs', reserveWarnsY.some(w => /RESERVEFAM-X/.test(w) && /only physically build one/.test(w))]);
  const reserveWarnsX = rigReserveWarnings(Store.get('rigs', rigXId));
  out.push(['soft-reserve warning is reciprocal (fires on the other rig too)', reserveWarnsX.some(w => /RESERVEFAM-Y/.test(w))]);

  const ramSolo = Actions.addInventory({category:'RAM',manufacturer:'Kingston',model:'Fury 8GB',purchaseDate:'2026-01-01',purchasePrice:2000,currency:'RSD',estimatedMarketValue:3000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigW = newRigDraft('DEADFAM-W'); rigW.variantName = 'W'; rigW.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramSolo.id};
  state.rigDraft = rigW; const rigWId = saveRigDraft();
  Store.update('rigs', rigWId, {status:'DISASSEMBLED'});
  const rigV = newRigDraft('DEADFAM-V'); rigV.variantName = 'V'; rigV.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramSolo.id};
  state.rigDraft = rigV; const rigVId = saveRigDraft();
  const reserveWarnsV = rigReserveWarnings(Store.get('rigs', rigVId));
  out.push(['soft-reserve warning ignores DISASSEMBLED rigs', !reserveWarnsV.some(w => /DEADFAM-W/.test(w))]);

  out.push(['soft-reserve warnings empty for an ASSEMBLED rig record', rigReserveWarnings(Object.assign({}, Store.get('rigs', rigXId), {status:'ASSEMBLED'})).length === 0]);

  const partsCpu = Actions.addInventory({category:'CPU',manufacturer:'AMD',model:'Ryzen 5 5600',purchaseDate:'2026-01-01',purchasePrice:8000,currency:'RSD',estimatedMarketValue:12000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const partsGpu = Actions.addInventory({category:'GPU',manufacturer:'MSI',model:'RTX 3060',purchaseDate:'2026-01-01',purchasePrice:20000,currency:'RSD',estimatedMarketValue:28000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const partsRig = newRigDraft('PARTSFAM'); partsRig.variantName = 'P1';
  partsRig.slots.CPU = {kind:'INVENTORY', inventoryItemId: partsCpu.id};
  partsRig.slots.GPU = {kind:'INVENTORY', inventoryItemId: partsGpu.id};
  partsRig.slots.CASE = {kind:'PLANNED', label:'NZXT H510', cost:6000, currency:'RSD'};
  out.push(['rigPartsOutValue sums INVENTORY slot market values and ignores PLANNED slots', rigPartsOutValue(partsRig) === 12000 + 28000]);
  const partsDerived = rigDerived(partsRig);
  out.push(['rigDerived sums inventory and planned original prices', partsDerived.originalPartsValue === 12000 + 28000]);
  partsRig.slots.CASE.originalPrice = 10000;
  const plannedValueDerived = rigDerived(partsRig);
  out.push(['planned original price contributes to parts value', plannedValueDerived.originalPartsValue === 50000]);
  out.push(['parts margin uses paid versus original prices', Math.abs(plannedValueDerived.partsMargin - 32) < 0.001]);
  out.push(['rig price fields are identified for caret-safe input handling', rigPriceField('cost') && rigPriceField('originalPrice') && !rigPriceField('label')]);

  out.push(['suggestedSalePrice(30000, 25) == 40000', Math.abs(suggestedSalePrice(30000, 25) - 40000) < 0.001]);
  out.push(['suggestedSalePrice(10000, 50) == 20000', Math.abs(suggestedSalePrice(10000, 50) - 20000) < 0.001]);

  const bulkA = newRigDraft('BULKFAM'); bulkA.variantName = 'A'; bulkA.slots.PSU = {kind:'INVENTORY', inventoryItemId: psuItem.id};
  state.rigDraft = bulkA; const bulkAId = saveRigDraft();
  const bulkB = newRigDraft('BULKFAM'); bulkB.variantName = 'B';
  state.rigDraft = bulkB; const bulkBId = saveRigDraft();
  const bulkC = newRigDraft('BULKFAM'); bulkC.variantName = 'C'; bulkC.slots.PSU = {kind:'PLANNED', label:'Old PSU', cost:1000, currency:'RSD'};
  state.rigDraft = bulkC; const bulkCId = saveRigDraft();
  const copyRes = Actions.copySlotToFamily(bulkAId, 'PSU');
  out.push(['copySlotToFamily reports ok and count of 2 other variants', copyRes.ok === true && copyRes.count === 2]);
  const bulkBAfter = Store.get('rigs', bulkBId);
  out.push(['copySlotToFamily copied INVENTORY slot value onto sibling B', bulkBAfter.slots.PSU && bulkBAfter.slots.PSU.kind === 'INVENTORY' && bulkBAfter.slots.PSU.inventoryItemId === psuItem.id]);
  const bulkCAfter = Store.get('rigs', bulkCId);
  out.push(['copySlotToFamily overwrote sibling C prior PLANNED slot value', bulkCAfter.slots.PSU && bulkCAfter.slots.PSU.kind === 'INVENTORY' && bulkCAfter.slots.PSU.inventoryItemId === psuItem.id]);
  out.push(['copySlotToFamily does not touch unrelated families', !!Store.get('rigs', rigXId) && Store.get('rigs', rigXId).slots.PSU == null]);
  const copyResNoFamily = Actions.copySlotToFamily(rigWId, 'RAM');
  out.push(['copySlotToFamily returns count 0 when no siblings exist', copyResNoFamily.ok === true && copyResNoFamily.count === 0]);

  out.push(['rigEmptySlotLabel names the slot', rigEmptySlotLabel('CPU') === '— CPU EMPTY —']);
  out.push(['rigEmptySlotLabel works for multi-word slot labels', rigEmptySlotLabel('MOBO') === '— MOTHERBOARD EMPTY —']);

  const soleStorage = Actions.addInventory({category:'STORAGE',manufacturer:'Kingston',model:'NV2 500GB',purchaseDate:'2026-01-01',purchasePrice:3000,currency:'RSD',estimatedMarketValue:4000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  out.push(['soleUnassignedMatch finds the one unassigned STORAGE item', soleUnassignedMatch('STORAGE') && soleUnassignedMatch('STORAGE').id === soleStorage.id]);
  Store.update('inventory', soleStorage.id, {assignedProjectId: 'some-project'});
  out.push(['soleUnassignedMatch returns null once the item is assigned to a project', soleUnassignedMatch('STORAGE') === null]);

  return out;
})()
`;
const rigResults = env.run(sandbox, rigProbe);

const all = checks.concat(results).concat(rigResults);
let fail = 0;
for (const [name, ok] of all){
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) fail++;
}
console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + all.length + ' assertions)');
process.exit(fail === 0 ? 0 : 1);