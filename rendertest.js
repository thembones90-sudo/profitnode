const fs = require('fs');
const vm = require('vm');

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const fakeEl = () => ({ addEventListener(){}, innerHTML: '', querySelector: () => null });
const document = {
  addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') fn(); },
  getElementById: (id) => (id === 'root' ? fakeEl() : null),
  createElement: () => ({ textContent: '', appendChild(){}, setAttribute(){}, style:{} }),
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

const probe = `
(function(){
  const out = [];
  Store.load();
  const cpu = Actions.addInventory({category:'CPU',manufacturer:'AMD',model:'Ryzen 5 3600',purchaseDate:'2026-01-01',purchasePrice:9000,currency:'RSD',estimatedMarketValue:13000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const gpu = Actions.addInventory({category:'GPU',manufacturer:'MSI',model:'GTX 1070',purchaseDate:'2026-01-01',purchasePrice:15000,currency:'RSD',estimatedMarketValue:20000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});

  // Empty family list
  state.route='rigbuild'; state.rigDraft=null; state.rigFamilyView=null;
  const html1 = renderRigBuild();
  out.push(['family list renders (empty)', typeof html1 === 'string' && html1.includes('NEW RIG')]);

  // New rig editor
  state.rigDraft = newRigDraft(null);
  state.rigDraft.variantName='V1';
  const html2 = renderRigBuild();
  out.push(['new rig editor renders', typeof html2 === 'string' && html2.includes('SAVE') && html2.includes('CPU')]);

  // fill slots with inventory + planned part, save
  state.rigDraft.family = 'REVENANT III';
  state.rigDraft.slots.CPU = {kind:'INVENTORY', inventoryItemId: cpu.id};
  state.rigDraft.slots.GPU = {kind:'INVENTORY', inventoryItemId: gpu.id};
  state.rigDraft.slots.CASE = {kind:'PLANNED', label:'NZXT H510', cost:6000, currency:'RSD'};
  state.rigDraft.expectedSalePrice = 40000;
  const id = saveRigDraft();
  state.rigDraft = null;

  // Family list with one family
  state.rigFamilyView = null;
  const html3 = renderRigBuild();
  out.push(['family list shows REVENANT III', html3.includes('REVENANT III')]);

  // Family view
  state.rigFamilyView = 'REVENANT III';
  const html4 = renderRigBuild();
  out.push(['family view renders variant row', html4.includes('V1')]);

  // duplicate + compare
  const dup = Actions.duplicateRig(id, 'V2');
  state.rigCompareIds = [id, dup.id];
  const html5 = renderRigBuild();
  out.push(['compare table renders with 2 variants', html5.includes('Total Cost') && html5.includes('V2')]);

  // open editor on saved rig (assembled state variant)
  state.rigFamilyView = null;
  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  const html6 = renderRigBuild();
  out.push(['saved rig editor renders with ASSEMBLE button', html6.includes('ASSEMBLE') && html6.includes('DELETE')]);

  // assemble then re-render editor -> should show DISASSEMBLE/MARK SOLD, no slot selects editable text mismatch
  const res = Actions.assembleRig(id);
  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  const html7 = renderRigBuild();
  out.push(['assembled rig shows DISASSEMBLE + MARK SOLD, no ASSEMBLE', res.ok && html7.includes('DISASSEMBLE') && html7.includes('MARK SOLD') && !html7.includes('>ASSEMBLE<')]);

  // full page shell render (renderShell / render()) doesn't throw, and nav includes RIG BUILD
  render();
  const shellHtml = renderShell();
  out.push(['nav includes RIG BUILD label', shellHtml.includes('RIG BUILD')]);

  // --- new markup assertions for the 12-item extension ---

  // Empty slot placeholder (item 1): a brand new draft has every slot empty
  state.rigDraft = newRigDraft(null);
  const htmlEmpty = renderRigBuild();
  out.push(['empty CPU slot shows dashed placeholder text', htmlEmpty.includes('— CPU EMPTY —')]);
  out.push(['empty slot placeholder uses the .rig-empty-slot class', htmlEmpty.includes('class="rig-empty-slot"')]);
  out.push(['rig editor uses one Rig Name field', htmlEmpty.includes('>Rig Name<') && !htmlEmpty.includes('>Rig Family<') && !htmlEmpty.includes('>Variant Name<')]);
  out.push(['rig editor omits the per-rig Currency field', !htmlEmpty.includes('>Currency<')]);
  out.push(['slot table shows paid and original price columns', htmlEmpty.includes('>Paid Price<') && htmlEmpty.includes('>Original Price<')]);

  // Quick-fill affordance (item 10): exactly one unassigned STORAGE item -> one-click fill button
  const soleStorageItem = Actions.addInventory({category:'STORAGE',manufacturer:'Crucial',model:'MX500 1TB',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  state.rigDraft = newRigDraft(null);
  const htmlQuick = renderRigBuild();
  out.push(['quick-fill button appears for the sole unassigned STORAGE item', htmlQuick.includes('data-rig-slot-quickfill="STORAGE:' + soleStorageItem.id + '"') && htmlQuick.includes('+ USE Crucial MX500 1TB')]);

  // Target Margin % input + Parts-Out Value tile + build-cost meter (items 6, 9, 11)
  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  state.rigDraft.targetMarginPct = 25;
  const htmlEditor2 = renderRigBuild();
  out.push(['rig editor shows a Target Margin % field', htmlEditor2.includes('data-rig-field="targetMarginPct"')]);
  out.push(['rig editor shows a Parts-Out Value tile', htmlEditor2.includes('Parts-Out Value')]);
  out.push(['rig editor shows parts value and margin tiles', htmlEditor2.includes('Original Parts Value') && htmlEditor2.includes('Parts Margin')]);
  out.push(['rig performance and tier summaries use distinct color hooks', renderRigEditor.toString().includes('pn-performance-text') && renderRigEditor.toString().includes('pn-tier-text ')]);
  out.push(['rig editor shows an apply-suggested-price affordance once a target margin is set', htmlEditor2.includes('data-rig-apply-suggested-price=')]);
  out.push(['rig editor shows the build-cost meter bar (score-row-bar/score-row-fill)', htmlEditor2.includes('score-row-bar') && htmlEditor2.includes('score-row-fill')]);
  out.push(['rig editor shows the copy-slot-to-family action', htmlEditor2.includes('data-rig-copy-slot-to-family="CPU"') && htmlEditor2.includes('FAMILY')]);

  // Comparison table: profit bar + empty-slot placeholder + assembled border (items 1, 3, 4, 5)
  // state.rigFamilyView='REVENANT III' still selected, rigCompareIds=[id,dup.id] from earlier, and rig "id" is now ASSEMBLED (from res above)
  state.rigFamilyView = 'REVENANT III';
  state.rigDraft = null;
  const htmlCompare = renderRigBuild();
  out.push(['compare table renders a profit hbar (hbar-track/hbar-fill)', htmlCompare.includes('hbar-track') && htmlCompare.includes('hbar-fill')]);
  out.push(['compare table falls back to the empty-slot placeholder for a blank slot', htmlCompare.includes('rig-empty-slot')]);
  out.push(['assembled variant row/column gets an amber left border', htmlCompare.includes('border-left:3px solid var(--amber)')]);

  // RIG_STATUS_META retune (item 2): DISASSEMBLED now uses the new chip-blue-outline class
  out.push(['RIG_STATUS_META.DISASSEMBLED uses chip-blue-outline', RIG_STATUS_META.DISASSEMBLED.chip === 'chip-blue-outline']);

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
