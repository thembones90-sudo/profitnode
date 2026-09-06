const fs = require('fs');
const vm = require('vm');

// Minimal browser shims so the module-level code (which touches document/localStorage/crypto)
// can load without throwing, so we can then call the pure logic functions directly.
const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const listeners = {};
const fakeEl = () => ({
  addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
  innerHTML: '',
  querySelector: () => null,
  getElementById: () => fakeEl(),
});
const document = {
  addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') fn(); },
  getElementById: (id) => (id === 'root' ? fakeEl() : null),
  createElement: () => ({ textContent: '', appendChild(){} , setAttribute(){}, style:{} }),
  head: { appendChild(){} },
  querySelector: () => null,
};
let uuidN = 0;
const crypto = { randomUUID: () => 'test-uuid-' + (uuidN++) };
const window = { claude: undefined };

const code = fs.readFileSync(__dirname + '/app.js', 'utf8');
const sandbox = { document, localStorage, crypto, window, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'app.js' });

// --- Sanity checks on the new RIG BUILD logic, run inside the sandbox ---
const probe = `
(function(){
  const out = [];
  // 1. Empty ledger includes rigs
  out.push(['emptyLedger has rigs array', Array.isArray(emptyLedger().rigs)]);

  // 2. Build a rig with a CPU (Intel i5-10400F, no iGPU) + AM4 mobo mismatch + underpowered PSU + no storage/cooler/GPU
  Store.load(); // init
  const cpuItem = Actions.addInventory({category:'CPU',manufacturer:'Intel',model:'Core i5-10400F',purchaseDate:'2026-01-01',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const moboItem = Actions.addInventory({category:'MOTHERBOARD',manufacturer:'Gigabyte',model:'B450M DS3H',purchaseDate:'2026-01-01',purchasePrice:6000,currency:'RSD',estimatedMarketValue:9000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const psuItem = Actions.addInventory({category:'PSU',manufacturer:'Cooler Master',model:'MWE 300W',purchaseDate:'2026-01-01',purchasePrice:3000,currency:'RSD',estimatedMarketValue:4000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});

  const draft = newRigDraft('TESTRIG');
  draft.variantName = 'Variant A';
  draft.slots.CPU = {kind:'INVENTORY', inventoryItemId: cpuItem.id};
  draft.slots.MOBO = {kind:'INVENTORY', inventoryItemId: moboItem.id}; // AM4 mismatch vs LGA1200 CPU
  draft.slots.PSU = {kind:'INVENTORY', inventoryItemId: psuItem.id}; // 300W, no GPU so min 300 -- should NOT warn (no GPU)
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

  // 3. Assemble: should mark inventory IN_RIG and block double-assembly
  const res1 = Actions.assembleRig(savedId);
  out.push(['assemble ok', res1.ok === true]);
  const cpuAfter = Store.get('inventory', cpuItem.id);
  out.push(['cpu now IN_RIG', cpuAfter.status === 'IN_RIG']);
  out.push(['cpu assignedRigId set', cpuAfter.assignedRigId === savedId]);

  // second rig trying to use the same CPU while first is ASSEMBLED -> should be blocked
  const draft2 = newRigDraft('TESTRIG');
  draft2.variantName = 'Variant B';
  draft2.slots.CPU = {kind:'INVENTORY', inventoryItemId: cpuItem.id};
  state.rigDraft = draft2;
  const id2 = saveRigDraft();
  const res2 = Actions.assembleRig(id2);
  out.push(['double-assembly blocked', res2.ok === false && /already physically assembled/.test(res2.error||'')]);

  // 4. Disassemble releases parts
  const res3 = Actions.disassembleRig(savedId);
  out.push(['disassemble ok', res3.ok === true]);
  const cpuAfter2 = Store.get('inventory', cpuItem.id);
  out.push(['cpu released to IN_STORAGE', cpuAfter2.status === 'IN_STORAGE']);
  out.push(['cpu assignedRigId cleared', cpuAfter2.assignedRigId === null]);
  out.push(['rig record preserved after disassemble', !!Store.get('rigs', savedId)]);
  out.push(['rig status is DISASSEMBLED', Store.get('rigs', savedId).status === 'DISASSEMBLED']);

  // 5. Re-assemble then mark sold -> creates a Sales record
  Actions.assembleRig(savedId);
  const salesBefore = Store.all('sales').length;
  const res4 = Actions.markRigSold(savedId);
  out.push(['mark sold ok', res4.ok === true]);
  out.push(['sales record created', Store.all('sales').length === salesBefore + 1]);
  out.push(['rig status SOLD', Store.get('rigs', savedId).status === 'SOLD']);
  const cpuAfter3 = Store.get('inventory', cpuItem.id);
  out.push(['cpu marked SOLD too', cpuAfter3.status === 'SOLD']);

  // 6. Duplicate variant
  const dup = Actions.duplicateRig(id2, 'Variant B copy');
  out.push(['duplicate created', !!dup && dup.family === 'TESTRIG']);
  out.push(['rigFamilies groups correctly', rigFamilies().find(f=>f.family==='TESTRIG').variants.length === 3]);

  // 7. removeRig releases parts if any were assigned
  Actions.removeRig(id2);
  out.push(['removeRig removed record', !Store.get('rigs', id2)]);

  // 8. Backup collections include rigs
  out.push(['inspectBackupFile recognizes rigs', !!inspectBackupFile({rigs:[{a:1}]})]);

  // 9. Timeline logging on assemble/disassemble (item 8)
  const timeline = Store.all('timeline');
  out.push(['assemble logs a RIG_STATUS timeline entry', timeline.some(t => t.type === 'RIG_STATUS' && /ASSEMBLED/.test(t.title) && t.relatedType === 'rig')]);
  out.push(['disassemble logs a RIG_STATUS timeline entry', timeline.some(t => t.type === 'RIG_STATUS' && /DISASSEMBLED/.test(t.title) && t.relatedType === 'rig')]);

  // 10. Soft-reserve conflict warning (item 7): two PLANNED rigs sharing one RAM stick should warn each other
  const ramShared = Actions.addInventory({category:'RAM',manufacturer:'Corsair',model:'Vengeance 16GB',purchaseDate:'2026-01-01',purchasePrice:4000,currency:'RSD',estimatedMarketValue:6000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigX = newRigDraft('RESERVEFAM-X'); rigX.variantName = 'X'; rigX.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramShared.id};
  state.rigDraft = rigX; const rigXId = saveRigDraft();
  const rigY = newRigDraft('RESERVEFAM-Y'); rigY.variantName = 'Y'; rigY.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramShared.id};
  state.rigDraft = rigY; const rigYId = saveRigDraft();
  const reserveWarnsY = rigReserveWarnings(Store.get('rigs', rigYId));
  out.push(['soft-reserve warning fires for a part planned on two PLANNED rigs', reserveWarnsY.some(w => /RESERVEFAM-X/.test(w) && /only physically build one/.test(w))]);
  const reserveWarnsX = rigReserveWarnings(Store.get('rigs', rigXId));
  out.push(['soft-reserve warning is reciprocal (fires on the other rig too)', reserveWarnsX.some(w => /RESERVEFAM-Y/.test(w))]);

  // 10b. Soft-reserve warning does NOT fire against a DISASSEMBLED or SOLD rig
  const ramSolo = Actions.addInventory({category:'RAM',manufacturer:'Kingston',model:'Fury 8GB',purchaseDate:'2026-01-01',purchasePrice:2000,currency:'RSD',estimatedMarketValue:3000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigW = newRigDraft('DEADFAM-W'); rigW.variantName = 'W'; rigW.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramSolo.id};
  state.rigDraft = rigW; const rigWId = saveRigDraft();
  Store.update('rigs', rigWId, {status:'DISASSEMBLED'});
  const rigV = newRigDraft('DEADFAM-V'); rigV.variantName = 'V'; rigV.slots.RAM = {kind:'INVENTORY', inventoryItemId: ramSolo.id};
  state.rigDraft = rigV; const rigVId = saveRigDraft();
  const reserveWarnsV = rigReserveWarnings(Store.get('rigs', rigVId));
  out.push(['soft-reserve warning ignores DISASSEMBLED rigs', !reserveWarnsV.some(w => /DEADFAM-W/.test(w))]);

  // 10c. Soft-reserve warning does not apply once the rig itself is ASSEMBLED (only PLANNED/TEST_BUILD)
  out.push(['soft-reserve warnings empty for an ASSEMBLED rig record', rigReserveWarnings(Object.assign({}, Store.get('rigs', rigXId), {status:'ASSEMBLED'})).length === 0]);

  // 11. Parts-out value (item 9): sums INVENTORY slot estimatedMarketValue, PLANNED slots contribute 0
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

  // 12. Target margin suggested price math (item 11)
  out.push(['suggestedSalePrice(30000, 25) == 40000', Math.abs(suggestedSalePrice(30000, 25) - 40000) < 0.001]);
  out.push(['suggestedSalePrice(10000, 50) == 20000', Math.abs(suggestedSalePrice(10000, 50) - 20000) < 0.001]);

  // 13. Bulk copy-slot-to-family (item 12): Actions.copySlotToFamily
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

  // 14. Empty-slot placeholder helper (item 1)
  out.push(['rigEmptySlotLabel names the slot', rigEmptySlotLabel('CPU') === '— CPU EMPTY —']);
  out.push(['rigEmptySlotLabel works for multi-word slot labels', rigEmptySlotLabel('MOBO') === '— MOTHERBOARD EMPTY —']);

  // 15. soleUnassignedMatch (item 10): exactly one unassigned match found, none once assigned
  const soleStorage = Actions.addInventory({category:'STORAGE',manufacturer:'Kingston',model:'NV2 500GB',purchaseDate:'2026-01-01',purchasePrice:3000,currency:'RSD',estimatedMarketValue:4000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  out.push(['soleUnassignedMatch finds the one unassigned STORAGE item', soleUnassignedMatch('STORAGE') && soleUnassignedMatch('STORAGE').id === soleStorage.id]);
  Store.update('inventory', soleStorage.id, {assignedProjectId: 'some-project'});
  out.push(['soleUnassignedMatch returns null once the item is assigned to a project', soleUnassignedMatch('STORAGE') === null]);

  return out;
})()
`;
const results = vm.runInContext(probe, sandbox, { filename: 'probe.js' });
let fail = 0;
for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) fail++;
}
console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
