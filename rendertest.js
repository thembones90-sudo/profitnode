"use strict";
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
env.loadAll(sandbox, DIR);

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
  out.push(['family view surfaces the qualifying strip when nothing clears', html4.includes('NO CLEAR ASSEMBLY CANDIDATE')]);
  out.push(['family view qualifies each incomplete variant with an operational chip', html4.includes('pn-var-read is-verify') && html4.includes('INCOMPLETE')]);

  // duplicate + compare
  const dup = Actions.duplicateRig(id, 'V2');
  state.rigCompareIds = [id, dup.id];
  const html5 = renderRigBuild();
  out.push(['compare table renders with 2 variants', html5.includes('Total Cost') && html5.includes('V2')]);
  out.push(['compare columns carry the recommended-variant hook', html5.includes('pn-variant-col') && !html5.includes('is-recommended')]);

  // open editor on saved rig (assembled state variant)
  state.rigFamilyView = null;
  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  const html6 = renderRigBuild();
  out.push(['saved rig editor renders with ASSEMBLE button', html6.includes('ASSEMBLE') && html6.includes('DELETE')]);

  // assemble then re-render editor -> DISASSEMBLE/MARK SOLD
  const res = Actions.assembleRig(id);
  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  const html7 = renderRigBuild();
  out.push(['assembled rig shows DISASSEMBLE + MARK SOLD, no ASSEMBLE', res.ok && html7.includes('DISASSEMBLE') && html7.includes('MARK SOLD') && !html7.includes('>ASSEMBLE<')]);

  // --- NAV LABELS (terminal naming — replaces old 'RIG BUILD' assertion) ---
  render();
  const shellHtml = renderShell();
  const navLabels = ['COMMAND','INTEL','RIG BENCH','BUILDS','PARTS VAULT','REPAIR BAY','THE HUNT','LEDGER','ARCHIVE','THE ROULETTE','BLACKBOX'];
  out.push(['nav shows terminal labels', navLabels.every(l => shellHtml.includes(l))]);
  out.push(['nav no longer shows legacy labels', !shellHtml.includes('RIG BUILD') && !shellHtml.includes('BUILD PLANNER') && !shellHtml.includes('>DASHBOARD<')]);
  out.push(['nav includes the roulette button', shellHtml.includes('data-route="roulette"')]);

  // --- COMMAND (command center + financial model render on dashboard route) ---
  state.route = 'dashboard';
  const dashHtml = renderShell();
  out.push(['dashboard renders command hero-finance', dashHtml.includes('pn-command-hero-finance') && dashHtml.includes('TOTAL SPENT')]);

  // --- INTEL (analytics route render wraps in capital velocity strip) ---
  state.route = 'analytics';
  const intelHtml = renderShell();
  out.push(['analytics header says INTEL', intelHtml.includes('>INTEL<') || intelHtml.includes('INTEL')]);
  out.push(['analytics includes intelligence capital velocity block', intelHtml.includes('pn-section-kicker') && intelHtml.includes('CAPITAL VELOCITY')]);

  // --- PARTS VAULT (intelligence stock aging injection) ---
  state.route = 'inventory';
  const vaultHtml = renderShell();
  out.push(['inventory header says PARTS VAULT', vaultHtml.includes('PARTS VAULT')]);
  out.push(['inventory includes intelligence aging panel', vaultHtml.includes('INVENTORY AGING') && vaultHtml.includes('pn-aging-strip')]);

  // --- THE ROULETTE route renders ---
  state.route = 'roulette';
  const rouletteHtml = renderShell();
  out.push(['roulette route renders the chamber', rouletteHtml.includes('pn-r3-content') && rouletteHtml.includes('THE ROULETTE')]);

  // --- LEDGER (sales route now sale_type render) ---
  state.route = 'sales';
  const salesHtml = renderShell();
  out.push(['sales route header says LEDGER', salesHtml.includes('>LEDGER<') || salesHtml.includes('LEDGER')]);
  out.push(['sales route renders sale-type filters', salesHtml.includes('pn-sales-filter') && salesHtml.includes('pn-sales-summary')]);

  // --- BLACKBOX route renders with intelligence data-health ---
  state.route = 'backup';
  const backupHtml = renderShell();
  out.push(['backup header says BLACKBOX', backupHtml.includes('>BLACKBOX<') || backupHtml.includes('BLACKBOX')]);
  out.push(['backup renders export/import panels', backupHtml.includes('data-export-backup') && backupHtml.includes('data-import-trigger')]);

  // --- new markup assertions for the 12-item extension ---
  state.rigDraft = newRigDraft(null);
  const htmlEmpty = renderRigBuild();
  out.push(['empty CPU slot shows dashed placeholder text', htmlEmpty.includes('— CPU EMPTY —')]);
  out.push(['empty slot placeholder uses the .rig-empty-slot class', htmlEmpty.includes('class="rig-empty-slot"')]);
  out.push(['rig editor uses one Rig Name field', htmlEmpty.includes('>Rig Name<') && !htmlEmpty.includes('>Rig Family<') && !htmlEmpty.includes('>Variant Name<')]);
  out.push(['rig editor omits the per-rig Currency field', !htmlEmpty.includes('>Currency<')]);
  out.push(['slot table shows paid and original price columns', htmlEmpty.includes('>Paid Price<') && htmlEmpty.includes('>Original Price<')]);

  const soleStorageItem = Actions.addInventory({category:'STORAGE',manufacturer:'Crucial',model:'MX500 1TB',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  state.rigDraft = newRigDraft(null);
  const htmlQuick = renderRigBuild();
  out.push(['quick-fill button appears for the sole unassigned STORAGE item', htmlQuick.includes('data-rig-slot-quickfill="STORAGE:' + soleStorageItem.id + '"') && htmlQuick.includes('+ USE Crucial MX500 1TB')]);

  state.rigDraft = JSON.parse(JSON.stringify(Store.get('rigs', id)));
  state.rigDraft.targetMarginPct = 25;
  const htmlEditor2 = renderRigBuild();
  out.push(['rig editor shows a Target Margin % field', htmlEditor2.includes('data-rig-field="targetMarginPct"')]);
  out.push(['rig editor shows a Parts-Out Value tile', htmlEditor2.includes('Parts-Out Value')]);
  out.push(['rig editor shows parts value and margin tiles', htmlEditor2.includes('Original Parts Value') && htmlEditor2.includes('Parts Margin')]);
  out.push(['rig editor promotes primary decisions and collapses secondary values', htmlEditor2.includes('pn-rig-results-primary') && htmlEditor2.includes('<details class="pn-rig-secondary">') && !htmlEditor2.includes('<details class="pn-rig-secondary" open')]);
  out.push(['rig editor renders an evidence-based SHOP READ', htmlEditor2.includes('data-shop-read=') && htmlEditor2.includes('SHOP READ')]);
  out.push(['rig performance and tier summaries use distinct color hooks', typeof PNCoreRenderRigEditor === 'function' && PNCoreRenderRigEditor.toString().includes('pn-performance-text') && PNCoreRenderRigEditor.toString().includes('pn-tier-text ')]);
  out.push(['rig editor renders the unified Build Check panel', renderRigEditor().includes('pn-build-check') && renderRigEditor().includes('Build Check')]);
  out.push(['rig editor shows an apply-suggested-price affordance once a target margin is set', htmlEditor2.includes('data-rig-apply-suggested-price=')]);
  out.push(['rig editor shows the build-cost meter bar (score-row-bar/score-row-fill)', htmlEditor2.includes('score-row-bar') && htmlEditor2.includes('score-row-fill')]);
  out.push(['rig editor shows the copy-slot-to-family action', htmlEditor2.includes('data-rig-copy-slot-to-family="CPU"') && htmlEditor2.includes('FAMILY')]);
  out.push(['original-price slot inputs are demoted to secondary styling', htmlEditor2.includes('rig-slot-price is-secondary" data-label="ORIGINAL PRICE"') && htmlEditor2.includes('rig-slot-price" data-label="PAID PRICE"')]);
  out.push(['editor surfaces the variant family standing in the header', htmlEditor2.includes('FAMILY STANDING') && htmlEditor2.includes('ACTIVE VARIANT')]);
  out.push(['best-margin variant of the same family is flagged as BEST MARGIN IN FAMILY', (function(){const d=JSON.parse(JSON.stringify(Store.get('rigs', dup.id)));d.expectedSalePrice=(Store.get('rigs', dup.id).expectedSalePrice||0)+250000;Store.update('rigs', d.id, d);state.rigDraft=JSON.parse(JSON.stringify(Store.get('rigs', dup.id)));const h=renderRigBuild();return h.includes('FAMILY STANDING')&&h.includes('BEST MARGIN IN FAMILY')})()]);

  state.rigFamilyView = 'REVENANT III';
  state.rigDraft = null;
  const htmlCompare = renderRigBuild();
  out.push(['compare table renders a profit hbar (hbar-track/hbar-fill)', htmlCompare.includes('hbar-track') && htmlCompare.includes('hbar-fill')]);
  out.push(['compare table falls back to the empty-slot placeholder for a blank slot', htmlCompare.includes('rig-empty-slot')]);
  out.push(['assembled variant row/column gets an amber left border', htmlCompare.includes('border-left:3px solid var(--amber)')]);
  out.push(['family view marks active and comparison-selected variants', htmlCompare.includes('pn-rank-chip is-active') && htmlCompare.includes('pn-variant-row is-active is-selected')]);
  out.push(['family view exposes cheapest and best-margin ranking badges', htmlCompare.includes('CHEAPEST') && htmlCompare.includes('BEST MARGIN')]);

  const soldDraft = JSON.parse(JSON.stringify(Store.get('rigs', id))); soldDraft.status='SOLD'; state.rigDraft=soldDraft; state.rigFamilyView=null;
  const soldHtml=renderRigBuild();
  out.push(['sold rig renders a closed operational conclusion', soldHtml.includes('data-shop-read="SALE CLOSED"') && !soldHtml.includes('>ASSEMBLE<')]);

  out.push(['RIG_STATUS_META.DISASSEMBLED uses chip-blue-outline', RIG_STATUS_META.DISASSEMBLED.chip === 'chip-blue-outline']);

  return out;
})()
`;
const results = env.run(sandbox, probe);
let fail = 0;
for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) fail++;
}
console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + results.length + ' assertions)');
process.exit(fail === 0 ? 0 : 1);
