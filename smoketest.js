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
  'psu_extension.js', 'rig_enclosure_extension.js', 'sale_type_extension.js',
  'command_center_extension.js', 'command_header_glitch_extension.js',
  'rig_bench_navigation_extension.js', 'command_financial_model_extension.js',
  'profitnode_intelligence_extension.js', 'command_separator_tune.js',
  'roulette_extension.js', 'roulette_ui_extension.js', 'treasury_extension.js',
  'road_to_extension.js', 'my_rig_extension.js', 'sidebar_cleanup_extension.js', 'mail_extension.js', 'treasury_flow_extension.js'
];
checks.push(['manifest has 20 scripts', entries.length === 20]);
checks.push(['manifest order matches canonical 20-file load order',
  entries.map(e => e.split('?')[0]).join(',') === CANONICAL_ORDER.join(',')]);
checks.push(['first script is app_core.js', entries[0].split('?')[0] === 'app_core.js']);
checks.push(['last script is treasury_flow_extension.js',
  entries[entries.length - 1].split('?')[0] === 'treasury_flow_extension.js']);
checks.push(['every manifest entry has a cache-busting ?v= suffix',
  entries.every(e => /\.js\?v=.+/.test(e))]);
checks.push(['every manifest entry maps to a real file on disk',
  entries.every(e => fs.existsSync(path.join(DIR, e.split('?')[0])))]);

const appJs = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const appCoreJs = fs.readFileSync(path.join(DIR, 'app_core.js'), 'utf8');
const psuExtensionJs = fs.readFileSync(path.join(DIR, 'psu_extension.js'), 'utf8');
checks.push(['app.js loader streams the manifest via document.write',
  /document\.write\(/.test(appJs) && /window\.__PN_SCRIPTS/.test(appJs)]);
const indexCss = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
checks.push(['index.html loads pn_scripts.js before app.js',
  /<script src="pn_scripts\.js(?:\?[^" ]+)?"><\/script>/.test(indexCss) && indexCss.indexOf('pn_scripts.js') < indexCss.indexOf('app.js')]);
checks.push(['page-mount layer bridges .main into a bounded flex column (content is the scroll layer)',
  indexCss.includes('#page-mount{flex:1;min-height:0;display:flex;flex-direction:column}')]);
checks.push(['app shell keeps height:100vh on .main with overflow:hidden (no doc-level scroll)',
  /\.main\{[^}]*height:100vh[^}]*overflow:hidden/.test(indexCss)]);
checks.push(['.content is the single internal scroll container with min-height:0',
  /\.content\{[^}]*min-height:0/.test(indexCss) && /\.content\{[^}]*overflow-y:auto/.test(indexCss)]);
checks.push(['rig slot grid collapses to stacked rows by 1180px so controls never clip',
  /@media \(max-width:1180px\)\{[\s\S]*?\.rig-slot-row\{grid-template-columns:1fr 1fr/.test(indexCss)]);
checks.push(['no global viewport squeeze via transform:scale in the shell CSS', !indexCss.includes('transform:scale(')]);
checks.push(['motherboard form factor has no model-name guessing path', !/function detectFormFactor/.test(appCoreJs) && !/detectFormFactor/.test(psuExtensionJs) && !/\[A-Z\]\\d\{3\}M/.test(appCoreJs)]);
checks.push(['mobile media query detaches content from the fixed-height shell',
  /@media \(max-width:760px\)\{[\s\S]*?\.main\{height:auto;min-height:100vh\}/.test(indexCss) && /\.content\{overflow-y:visible;flex:none\}/.test(indexCss)]);

// --- Sandbox probe: post-load global state ---
const meta = env.run(sandbox, `(() => ({
  routes: ROUTES.map(r => r.key + '|' + r.label),
  csvKeys: Object.keys(CSV_EXPORTS),
  saleTypes: Array.isArray(PN_SALE_TYPES) ? PN_SALE_TYPES.join(',') : null,
  curren: (typeof CURRENCIES !== 'undefined' ? CURRENCIES.join(',') : null),
  manifestLen: window.__PN_SCRIPTS.length,
}))()`);

const routes = meta.routes.map(r => r.split('|'));
const routeKeys = routes.map(r => r[0]);
checks.push(['ROUTES has 15 entries (treasury + roulette + road-to + my-rig + mail; planner retired)', routes.length === 15]);
checks.push(['no Build Planner route', !routeKeys.includes('planner')]);
checks.push(['roulette route present', routeKeys.includes('roulette')]);
checks.push(['road-to route present', routeKeys.includes('roadto')]);
checks.push(['mail route present', routeKeys.includes('mail')]);
checks.push(['backup route still present', routeKeys.includes('backup')]);
const expectedSeq = [
  ['dashboard','COMMAND'], ['treasury','TREASURY'], ['analytics','INTEL'], ['rigbuild','RIG ASSEMBLY'], ['myrig','MY RIG'],
  ['projects','BUILDS'], ['inventory','PARTS VAULT'], ['repairs','REPAIR BAY'],
  ['deals','THE HUNT'], ['roadto','ROAD TO'], ['sales','LEDGER'], ['mail','MAIL'], ['history','ARCHIVE'],
  ['roulette','THE ROULETTE'], ['backup','BLACKBOX']
];
checks.push(['nav order/labels match terminal rename + roulette insert + mail insert',
  routes.map(r => r.join('|')).join(',') === expectedSeq.map(r => r.join('|')).join(',')]);
checks.push(['plans CSV export retired', !meta.csvKeys.includes('plans')]);
checks.push(['roulette ledger CSV export registered', meta.csvKeys.includes('rouletteLedger')]);
checks.push(['mail CSV export registered', meta.csvKeys.includes('mail')]);
checks.push(['PN_SALE_TYPES = RIG,COMPONENT,OTHER', meta.saleTypes === 'RIG,COMPONENT,OTHER']);
checks.push(['currencies remain RSD,EUR', meta.curren === 'RSD,EUR']);
checks.push(['manifest declares 20 scripts in sandbox', meta.manifestLen === 20]);
const migrationProbe = env.run(sandbox, `(() => {
  const legacy={meta:{seeded:true},inventory:[
    {id:'healthy',category:'STORAGE',driveHealthPercent:120,catalogOverride:'  Samsung 970 EVO Plus 1TB  '},
    {id:'dead',category:'STORAGE',driveHealthPercent:-4}
  ],treasury:{balances:[]}};
  const migrated=migrateLedger(legacy);
  return {
    version:PN_LEDGER_SCHEMA_VERSION,
    from:migrated.fromVersion,to:migrated.toVersion,changed:migrated.changed,
    meta:migrated.ledger.meta.schemaVersion,
    high:migrated.ledger.inventory[0].driveHealthPercent,
    low:migrated.ledger.inventory[1].driveHealthPercent,
    override:migrated.ledger.inventory[0].catalogOverride,
    collections:Array.isArray(migrated.ledger.rigs)&&Array.isArray(migrated.ledger.sales),
    blankVersion:emptyLedger().meta.schemaVersion
  };
})()`);
checks.push(['ledger migrations upgrade legacy data to schema v2', migrationProbe.version===2&&migrationProbe.from===0&&migrationProbe.to===2&&migrationProbe.changed&&migrationProbe.meta===2&&migrationProbe.blankVersion===2]);
checks.push(['storage health migration clamps values and trims catalog overrides', migrationProbe.high===100&&migrationProbe.low===0&&migrationProbe.override==='Samsung 970 EVO Plus 1TB']);
checks.push(['ledger migration restores canonical collection arrays', migrationProbe.collections]);
const futureMigration = env.run(sandbox, `migrateLedger({meta:{schemaVersion:9},inventory:[]})`);
checks.push(['ledger migration never silently downgrades a future schema', futureMigration.toVersion===9&&futureMigration.ledger.meta.schemaVersion===9&&!futureMigration.changed]);
const sidebarCleanup = env.run(sandbox, `(() => {
  const aside=document.createElement('aside');aside.setAttribute('class','sidebar');
  const shop=document.createElement('div');shop.setAttribute('class','brand-shop');shop.textContent='Shadezy Repair Shop';
  aside.appendChild(shop);document.body.appendChild(aside);
  const applied=window.__pnSidebarCleanup();
  return {applied,attr:shop.getAttribute('data-pn-sidebar-cleanup'),display:shop.style.getPropertyValue('display')};
})()`);
checks.push(['sidebar cleanup directly hides the legacy shop label', sidebarCleanup.applied && sidebarCleanup.attr === 'hidden' && sidebarCleanup.display === 'none']);
const sidebarSource = fs.readFileSync(path.join(DIR, 'sidebar_cleanup_extension.js'), 'utf8');
checks.push(['sidebar cleanup has no retry interval or mutation observer', !/setInterval|MutationObserver/.test(sidebarSource)]);

const treasuryProbe = env.run(sandbox, `(() => {
  const blank = normalizeTreasury(null);
  const sample = {
    settings:{baseCurrency:'EUR',usdToEur:.9,rsdToEur:.01,fortressFloor:150},
    balances:[
      {label:'EUR cash',amount:100,currency:'EUR',include:true},
      {label:'Payoneer',amount:100,currency:'USD',include:true},
      {label:'Excluded bank',amount:1000,currency:'RSD',include:false}
    ],
    obligations:[
      {name:'Pending',amount:20,currency:'EUR',status:'PENDING'},
      {name:'Paid history',amount:999,currency:'EUR',status:'PAID'}
    ],
    pendingAssets:[
      {name:'GPU sale',amount:50,currency:'EUR',converted:false},
      {name:'Already cash',amount:80,currency:'EUR',converted:true}
    ],
    incomes:[{source:'Salary',amount:30,currency:'EUR',confidence:'HIGH'}],snapshots:[]
  };
  const calc = pnTreasuryCalculate(sample);
  const core = pnTreasuryCoreDraft({balances:[{label:'Payoneer',amount:123,currency:'EUR',include:true},{label:'Payoneer',amount:999,currency:'USD',include:true}]});
  Store.load().treasury = normalizeTreasury(sample); Store.persist();
  const persisted = JSON.parse(localStorage.getItem('profitnode_ledger_v1')).treasury;
  return {
    blankOk:Array.isArray(blank.balances)&&Array.isArray(blank.snapshots),
    liquid:calc.liquid, obligations:calc.obligations, fortress:calc.fortress,
    pending:calc.pending, afterPending:calc.afterPending, afterSalary:calc.afterSalary,
    persisted:!!persisted&&persisted.settings.baseCurrency==='EUR',
    backup:inspectBackupFile({treasury:sample}).treasury===0,
    routeHtml:/PERSONAL TREASURY|Personal Treasury/.test(renderTreasury()) && /NEW REBALANCE/.test(renderTreasury()),
    coreLabels:core.balances.slice(0,5).map(b=>b.label).join('|'),
    coreCount:core.balances.filter(b=>b.sourceKey).length,
    payoneerCarry:core.balances[0].amount===123 && core.balances[0].currency==='EUR',
    cashCurrencies:core.balances.find(b=>b.sourceKey==='CASH_RSD').currency==='RSD' && core.balances.find(b=>b.sourceKey==='CASH_EUR').currency==='EUR'
  };
})()`);
checks.push(['old ledgers normalize with an empty isolated treasury', treasuryProbe.blankOk]);
checks.push(['treasury FX conversion honors include/exclude', treasuryProbe.liquid === 190]);
checks.push(['paid obligations remain history but do not reduce fortress', treasuryProbe.obligations === 20 && treasuryProbe.fortress === 170]);
checks.push(['converted pending assets stop counting', treasuryProbe.pending === 50 && treasuryProbe.afterPending === 220]);
checks.push(['projected income stays outside liquid and reaches after-salary only', treasuryProbe.afterSalary === 250]);
checks.push(['treasury persists inside the canonical ledger backup', treasuryProbe.persisted && treasuryProbe.backup]);
checks.push(['TREASURY route renders compact rebalance entry point', treasuryProbe.routeHtml]);
checks.push(['rebalance draft always contains five canonical balance sources once', treasuryProbe.coreCount === 5 && treasuryProbe.coreLabels === 'Payoneer|Preply|Fiverr|Cash (RSD)|Cash (EUR)']);
checks.push(['canonical sources preserve prior amounts/currency and cash defaults', treasuryProbe.payoneerCarry && treasuryProbe.cashCurrencies]);

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
  Store.update('inventory', item.id, {status:'REPAIR'});
  const repairCommandHtml = renderDashboard();
  log('COMMAND priority escalates repair work to danger', repairCommandHtml.includes('pn-command-priority is-danger')&&repairCommandHtml.includes('REPAIR INTERVENTION')&&repairCommandHtml.includes('OPEN REPAIR BAY'));
  Store.update('inventory', item.id, {status:'IN_STORAGE'});

  const sale = Actions.addSale({inventoryItemId:item.id,itemName:'Core i5-10400F',saleDate:'2026-01-01',buyerPrice:20000,originalInvestment:10500,additionalCosts:200,currency:'RSD',reason:'',notes:'',saleType:'COMPONENT'});
  log('Actions.addSale creates a Sales row', !!sale && sale.itemName === 'Core i5-10400F');
  log('saleTypeResolved buckets a COMPONENT sale', typeof saleTypeResolved === 'function' && saleTypeResolved(sale) === 'COMPONENT');
  Store.remove('sales', sale.id);
  log('Store.remove deletes the row', !Store.get('sales', sale.id));

  const saleSchema = FORM_SCHEMAS.sale(null);
  log('NEW SALE item field uses the component search type', saleSchema.fields[0].type === 'componentSearch');
  log('NEW SALE defaults to a pending lifecycle state', saleSchema.fields.some(f=>f.key==='saleState' && f.default==='PENDING'));
  log('NEW SALE schema carries a Category select', saleSchema.fields.some(f=>f.key==='category' && f.options === CATEGORIES));
  log('INVENTORY_GROUP_ORDER is a permutation of CATEGORIES', INVENTORY_GROUP_ORDER.length === CATEGORIES.length && INVENTORY_GROUP_ORDER.slice().sort().join(',') === CATEGORIES.slice().sort().join(','));
  log('component pick keyboard helper is exposed', typeof pnSaleComponentPick === 'function');
  const inventorySchema = FORM_SCHEMAS.inventory(null);
  const healthField = inventorySchema.fields.find(f=>f.key==='driveHealthPercent');
  log('inventory schema has bounded storage-only drive health', !!healthField&&healthField.storageOnly===true&&healthField.min===0&&healthField.max===100);

  log('catalogEntriesForSlot(PSU) delegates to HardwareCatalog.psus', catalogEntriesForSlot('PSU') === (HardwareCatalog.psus || []));
  log('gpuPsuRequirement and psuResolvedWattage exist', typeof gpuPsuRequirement === 'function' && typeof psuResolvedWattage === 'function');
  log('HardwareCatalog.psuError starts null', HardwareCatalog.psuError === null);

  log('catalogEntriesForSlot(CASE) delegates to HardwareCatalog.cases', catalogEntriesForSlot('CASE') === (HardwareCatalog.cases || []));
  log('catalogEntriesForSlot(COOLER) delegates to HardwareCatalog.coolers', catalogEntriesForSlot('COOLER') === (HardwareCatalog.coolers || []));

  const dashHtml = renderDashboard();
  log('renderDashboard renders the command financial model', typeof dashHtml === 'string' && dashHtml.includes('TOTAL SPENT'));
  log('dashboard route render is the command dashboard', (ROUTES.find(r=>r.key==='dashboard').render() || '').includes('TOTAL SPENT'));
  log('command dashboard carries hero-finance markers', dashHtml.includes('pn-command-hero-finance'));
  log('command dashboard carries telemetry and priority markers', dashHtml.includes('pn-command-telemetry')&&dashHtml.includes('pn-command-priority')&&dashHtml.includes('COMMAND PRIORITY'));
  Store.persist();
  const commandUpdateStamp = localStorage.getItem('profitnode_last_updated_v1');
  const freshCommandHtml = renderDashboard();
  log('COMMAND freshness follows canonical Store persistence', /^\\d{4}-\\d{2}-\\d{2}T/.test(commandUpdateStamp||'')&&freshCommandHtml.includes('data-pn-command-updated')&&freshCommandHtml.includes('is-fresh'));

  const stats = dashboardStats('RSD');
  log('dashboardStats gains capital-headline keys', typeof stats.totalCapitalInvested === 'number' && typeof stats.currentInventoryValue === 'number' && typeof stats.unrealizedProfit === 'number');

  state.route = 'roulette';
  const rouletteHtml = renderShell();
  log('roulette route renders the chamber', typeof rouletteHtml === 'string' && rouletteHtml.includes('pn-r3-content') && rouletteHtml.includes('THE ROULETTE'));

  const gpu = Actions.addInventory({category:'GPU',manufacturer:'NVIDIA',model:'GTX 1070',purchaseDate:'2026-01-01',purchasePrice:12000,currency:'RSD',estimatedMarketValue:16000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const rigCpu = Actions.addInventory({category:'CPU',manufacturer:'AMD',model:'Ryzen 5 3600',purchaseDate:'2026-01-01',purchasePrice:9000,currency:'RSD',estimatedMarketValue:13000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const compA = Actions.addInventory({category:'GPU',manufacturer:'ASUS',model:'RTX 3060',purchaseDate:'2026-02-01',purchasePrice:30000,currency:'RSD',estimatedMarketValue:38000,source:'KP',condition:'WORKING',status:'LISTED',notes:''});
  const compB = Actions.addInventory({category:'MOTHERBOARD',manufacturer:'MSI',model:'B450 Tomahawk',purchaseDate:'2026-02-10',purchasePrice:12000,currency:'RSD',estimatedMarketValue:16500,source:'FRIEND',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const compMatches = salesComponentMatches('3060');
  log('component search finds an owned GPU for "3060"', compMatches.some(m=>m.kind==='inventory' && m.cat==='GPU' && m.label.indexOf('3060') > -1));
  log('component search excludes SOLD inventory', compMatches.every(m=>m.kind!=='inventory' || m.item.status !== 'SOLD'));
  const compMatches2 = salesComponentMatches('b450');
  log('component search ranks owned inventory before catalog', compMatches2.length > 0 && compMatches2[0].kind === 'inventory');
  const pendingPart = Actions.addInventory({category:'GPU',manufacturer:'EVGA',model:'Pending Test GPU',purchaseDate:'2026-02-12',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const pendingStatsBefore = dashboardStats('RSD');
  const pendingSummaryBefore = saleSummary('RSD');
  const pendingSale = Actions.addSale({saleState:'PENDING',inventoryItemId:pendingPart.id,itemName:'EVGA Pending Test GPU',saleDate:'2026-03-01',buyerPrice:14000,originalInvestment:10000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'GPU',notes:''});
  const pendingStatsAfter = dashboardStats('RSD');
  const pendingSummaryAfter = saleSummary('RSD');
  log('pending sale reserves its linked part as LISTED', pendingSale && Store.get('inventory',pendingPart.id).status === 'LISTED');
  log('pending sale is excluded from realized dashboard totals', pendingStatsAfter.totalRevenue === pendingStatsBefore.totalRevenue && pendingStatsAfter.realizedProfit === pendingStatsBefore.realizedProfit && pendingStatsAfter.componentsSold === pendingStatsBefore.componentsSold);
  log('pending sale is excluded from completed ledger summary', pendingSummaryAfter.revenue === pendingSummaryBefore.revenue && pendingSummaryAfter.profit === pendingSummaryBefore.profit && pendingSummaryAfter.components === pendingSummaryBefore.components);
  const pendingLedgerHtml = renderSales();
  log('LEDGER renders pending and completed sales as separate sections', pendingLedgerHtml.includes('PENDING SALES') && pendingLedgerHtml.includes('COMPLETED SALES') && pendingLedgerHtml.includes('EVGA Pending Test GPU'));
  log('pending sale exposes an explicit completion action', pendingLedgerHtml.includes('data-complete-pending-sale="'+pendingSale.id+'"'));
  Actions.updateSale(pendingSale.id,{saleState:'COMPLETED'});
  const completedStats = dashboardStats('RSD');
  log('completing a pending sale retires its linked part SOLD', Store.get('inventory',pendingPart.id).status === 'SOLD');
  log('completed pending sale enters realized totals exactly once', completedStats.totalRevenue === pendingStatsBefore.totalRevenue + 14000 && completedStats.componentsSold === pendingStatsBefore.componentsSold + 1);
  Actions.updateSale(pendingSale.id,{saleState:'PENDING'});
  log('returning a completed sale to pending restores LISTED state', Store.get('inventory',pendingPart.id).status === 'LISTED');
  Actions.removeSale(pendingSale.id);
  log('deleting a pending sale restores its pre-listing inventory state', Store.get('inventory',pendingPart.id).status === 'IN_STORAGE');
  const linked = Actions.addSale({inventoryItemId:compB.id,itemName:'MSI B450 Tomahawk',saleDate:'2026-03-01',buyerPrice:15000,originalInvestment:12000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'MOTHERBOARD',notes:''});
  log('linked component sale retires the part as SOLD', linked && Store.get('inventory', compB.id).status === 'SOLD');
  log('new linked sale snapshots the pre-sale status', linked && linked.inventorySnapshot && linked.inventorySnapshot.priorStatus === 'IN_STORAGE');
  Actions.removeSale(linked.id);
  log('deleting a linked component sale restores the part status', Store.get('inventory', compB.id).status === 'IN_STORAGE');
  const linked2 = Actions.addSale({inventoryItemId:compB.id,itemName:'MSI B450 Tomahawk',saleDate:'2026-03-01',buyerPrice:15000,originalInvestment:12000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'MOTHERBOARD'});
  log('re-link retires the part again', linked2 && Store.get('inventory', compB.id).status === 'SOLD');
  Actions.updateSale(linked2.id, {itemName:'MSI B450 Tomahawk',saleDate:'2026-03-01',buyerPrice:15000,originalInvestment:12000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'MOTHERBOARD',inventoryItemId:''});
  log('unlinking a sale via updateSale restores the part', Store.get('inventory', compB.id).status === 'IN_STORAGE');
  Actions.removeSale(linked2.id);
  const invHtml = renderInventory();
  log('inventory groups by category sections', typeof invHtml === 'string' && invHtml.includes('pn-inv-group'));
  log('inventory group headers show count and est value', invHtml.includes('pn-inv-group-count') && invHtml.includes('pn-inv-group-val'));
  log('inventory group order is canonical CPU-GPU-MOTHERBOARD', invHtml.indexOf('CPU') > -1 && invHtml.indexOf('CPU') < invHtml.indexOf('GPU') && invHtml.indexOf('GPU') < invHtml.indexOf('MOTHERBOARD'));
  log('PARTS VAULT tints only the part-name span', invHtml.includes('class="pn-part-name pn-part-name-t3"')&&invHtml.includes('data-pn-part-tier="T3"')&&!invHtml.includes('<tr class="clickable pn-part-name-'));

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

// --- Volume / integrity probe on its OWN sandbox so the ~270-part fixture
//     never pollutes the main ledger used by later probes. ---
const volumeProbe = `
(function(){
  const out = [];
  const log = (name, ok) => out.push([name, !!ok]);
  Store.load();

  log('delete-sale restore never clobbers a manually re-purposed part', (function(){
    const re = Actions.addInventory({category:'PSU',manufacturer:'Corsair',model:'CV650',purchaseDate:'2026-03-01',purchasePrice:9000,currency:'RSD',estimatedMarketValue:12000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
    const reSale = Actions.addSale({inventoryItemId:re.id,itemName:'Corsair CV650',saleDate:'2026-04-01',buyerPrice:11000,originalInvestment:9000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'PSU'});
    Store.update('inventory', re.id, {status:'LISTED'});
    Actions.removeSale(reSale.id);
    return Store.get('inventory', re.id).status === 'LISTED' && !Store.get('sales', reSale.id);
  })());

  log('volume render equalizes the memoized repair path and per-group sums', (function(){
    (CATEGORIES||[]).forEach(cat => {
      for (let i = 0; i < 30; i++){
        Actions.addInventory({category:cat,manufacturer:'VOL',model:cat+' Part Bat '+(i+1),purchaseDate:'2026-01-01',purchasePrice:1000+i*10,currency:i%2?'EUR':'RSD',estimatedMarketValue:1500+i*10,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});
      }
    });
    Store.all('inventory').filter(it => it.category === 'GPU').slice(0,20).forEach((it,idx) => {
      Actions.addRepair({inventoryItemId:it.id,cost:500+idx*5,currency:idx%2?'EUR':'RSD',description:'volume repair',date:'2026-01-15'});
    });
    const rep = repairsByItem();
    let repOk = true;
    Object.keys(rep).forEach(id => {
      const part = Store.get('inventory', id);
      if (!part) return;
      const cur = part.currency || 'RSD';
      const sum = rep[id].reduce((t,q) => t + convert(q.cost || 0, q.currency, cur), 0);
      if (rep[id].length !== Store.all('repairs').filter(r => r.inventoryItemId === id).length) repOk = false;
      if (Math.abs(sum - repairCostForItem(id, cur)) > 0.001) repOk = false;
    });
    const volHtml = renderInventory();
    const counts = {};
    Store.all('inventory').forEach(it => { counts[it.category] = (counts[it.category]||0) + 1; });
    const badgeNums = [];
    const badgeRe = /pn-inv-group-count">\\d+ ITEM(S)?/g;
    let bm; while ((bm = badgeRe.exec(volHtml))){ badgeNums.push(Number(bm[0].match(/\\d+/)[0])); }
    const expected = INVENTORY_GROUP_ORDER.map(g => counts[g]).filter(n => n);
    const cur = displayCurrency();
    let valOk = true;
    INVENTORY_GROUP_ORDER.forEach(g => {
      const items = Store.all('inventory').filter(it => it.category === g);
      if (!items.length) return;
      const sum = items.reduce((t,i) => t + convert(i.estimatedMarketValue||0, i.currency, cur), 0);
      if (!volHtml.includes('pn-inv-group-val">EST. VALUE ' + money(sum, cur))) valOk = false;
    });
    return repOk && badgeNums.join(',') === expected.join(',') && valOk;
  })());

  log('volume render stays under the single-pass budget', (function(){
    const t0 = Date.now();
    renderInventory();
    return (Date.now() - t0) < 400;
  })());

  return out;
})()
`;
const volSandbox = env.createSandbox();
env.loadAll(volSandbox, DIR);
const volumeResults = env.run(volSandbox, volumeProbe);

// --- Behavioral interaction probe: dispatches REAL listeners against a
//     hand-built NEW SALE form tree via the harness fake DOM. ---
const interaction = `
(function(){
  const out = [];
  const listeners = window.__pnDocListeners;
  function fire(ev, node, key){
    const evObj = { type: ev, target: node, key: key || null,
      _prevented:false, preventDefault(){ this._prevented = true; }, stopPropagation(){} };
    (listeners[ev] || []).slice().forEach(fn => fn(evObj));
    return evObj;
  }

  (listeners.DOMContentLoaded || []).slice().forEach(fn => fn());

  const compC = Actions.addInventory({category:'MOTHERBOARD',manufacturer:'ASUS',model:'Prime B450M-A',purchaseDate:'2026-02-11',purchasePrice:10500,currency:'RSD',estimatedMarketValue:14000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});

  const form = __pnEl({ tag:'form', attrs:{ 'data-entity-form':'sale' } });
  const label = __pnEl({ tag:'label', className:'field' });
  form.appendChild(label);
  const search = __pnEl({ tag:'input', name:'itemName', type:'text', className:'part-search-input', attrs:{ 'data-sale-component-search':'' }, value:'' });
  label.appendChild(search);
  const resBox = __pnEl({ tag:'div', className:'rig-catalog-results', attrs:{ 'data-sale-component-results':'' } });
  resBox.style.display = 'none';
  label.appendChild(resBox);
  const hidden = __pnEl({ tag:'input', name:'inventoryItemId', type:'hidden', value:'' });
  label.appendChild(hidden);
  const category = __pnEl({ tag:'select', name:'category', value:'' });
  const refStart = __pnEl({ tag:'input', name:'referenceStartDate', value:'' });
  const currency = __pnEl({ tag:'select', name:'currency', value:'RSD' });
  const invest = __pnEl({ tag:'input', name:'originalInvestment', value:'' });
  const extra = __pnEl({ tag:'input', name:'additionalCosts', value:'' });
  const notes = __pnEl({ tag:'textarea', name:'notes', value:'' });
  const price = __pnEl({ tag:'input', name:'buyerPrice', value:'' });
  [category, refStart, currency, invest, extra, notes, price].forEach(el => form.appendChild(el));
  window.__pnTree.push(form);

  openForm('sale');
  delete window.__pnSaleComponentPickedLabel;
  window.__pnSaleComponentMatches = null;

  search.value = 'b450';
  fire('input', search);
  __pnFlushTimers();

  out.push(['typing fires a debounced render with the owned match rendered',
    window.__pnSaleComponentMatches && window.__pnSaleComponentMatches.length >= 2 &&
    resBox.style.display !== 'none' &&
    resBox.innerHTML.indexOf('B450 Tomahawk') > -1 &&
    resBox.innerHTML.indexOf('data-sale-component-pick="0"') > -1]);

  out.push(['dropdown options expose stable ids + combobox aria',
    resBox.innerHTML.indexOf('id="pn-sale-opt-0"') > -1 &&
    search.getAttribute('aria-expanded') === 'true' &&
    search.getAttribute('aria-activedescendant') === 'pn-sale-opt-0']);

  out.push(['ArrowDown cycles the active highlight without re-running the query',
    (function(){
      const before = search.value;
      fire('keydown', search, 'ArrowDown');
      return search.value === before && window.__pnSaleComponentActive === 1 &&
        resBox.innerHTML.indexOf('pn-active') > -1 &&
        resBox.innerHTML.indexOf('id="pn-sale-opt-1"') > -1 &&
        search.getAttribute('aria-activedescendant') === 'pn-sale-opt-1';
    })()]);

  out.push(['Enter picks the highlighted match and pre-fills the form fields',
    (function(){
      fire('keydown', search, 'Enter');
      return hidden.value === compC.id &&
        search.value === 'ASUS Prime B450M-A' &&
        category.value === 'MOTHERBOARD' &&
        refStart.value === '2026-02-11' &&
        currency.value === 'RSD' &&
        invest.value === '10500' &&
        state.modal.live && state.modal.live.inventoryItemId === compC.id &&
        resBox.style.display === 'none' &&
        price.focused === true;
    })()]);

  out.push(['typing a stale query clears the hidden link from a previous pick',
    (function(){
      search.value = 'something else entirely';
      fire('input', search);
      __pnFlushTimers();
      return hidden.value === '' && !(state.modal.live && state.modal.live.inventoryItemId);
    })()]);

  search.value = 'b450';
  fire('input', search);
  __pnFlushTimers();
  const optBtn = __pnEl({ tag:'button', className:'rig-catalog-option', attrs:{ 'data-sale-component-pick':'1' } });
  fire('click', optBtn);
  out.push(['mouse click on an option delegates through the shared picker',
    hidden.value === compC.id && window.__pnSaleComponentPickedLabel === 'ASUS Prime B450M-A']);

  out.push(['Escape dismisses the dropdown and clears the a11y pointers',
    (function(){
      search.value = '3060';
      fire('input', search);
      __pnFlushTimers();
      fire('keydown', search, 'Escape');
      return resBox.style.display === 'none' && window.__pnSaleComponentMatches === null &&
        search.getAttribute('aria-expanded') === 'false' &&
        search.getAttribute('aria-activedescendant') === '';
    })()]);

  out.push(['debounce race guard never writes into a closed modal',
    (function(){
      const before = resBox.innerHTML;
      search.value = 'b450';
      fire('input', search);
      state.modal = null;
      __pnFlushTimers();
      return resBox.innerHTML === before && window.__pnSaleComponentMatches === null;
    })()]);

  const partForm = __pnEl({ tag:'form' });
  const partWrap = __pnEl({ tag:'div', className:'part-search-field' });
  partForm.appendChild(partWrap);
  const psInput = __pnEl({ tag:'input', attrs:{ 'data-part-search':'' }, value:'3060' });
  partWrap.appendChild(psInput);
  const psRes = __pnEl({ tag:'div', attrs:{ 'data-part-search-results':'' } });
  psRes.style.display = 'none';
  partWrap.appendChild(psRes);
  const psCat = __pnEl({ tag:'select', name:'category', value:'' });
  const psMfr = __pnEl({ tag:'input', name:'manufacturer', value:'' });
  const psModel = __pnEl({ tag:'input', name:'model', value:'' });
  const psPrice = __pnEl({ tag:'input', name:'purchasePrice', value:'' });
  [psCat, psMfr, psModel, psPrice].forEach(el => partForm.appendChild(el));
  window.__pnTree.push(partForm);

  out.push(['New Inventory part search fills results synchronously',
    (function(){
      HardwareCatalog.gpus = [{ brand:'MSI', model:'RTX 3060' }];
      const root = document.getElementById('root');
      window.__pnRootErr = null;
      try { root.dispatchEvent({ type:'input', target: psInput, preventDefault(){}, stopPropagation(){} }); }
      catch(err){ window.__pnRootErr = err && err.message; }
      return !window.__pnRootErr && (window.__pnPartMatches || []).length >= 1 &&
        psRes.style.display !== 'none' && psRes.innerHTML.indexOf('data-part-search-pick') > -1;
    })()]);

  out.push(['part search pick hydrates category/manufacturer/model',
    (function(){
      const pickBtn = __pnEl({ tag:'button', attrs:{ 'data-part-search-pick':'0' } });
      partWrap.appendChild(pickBtn);
      const root = document.getElementById('root');
      window.__pnRootErr = null;
      try { root.dispatchEvent({ type:'click', target: pickBtn, preventDefault(){}, stopPropagation(){} }); }
      catch(err){ window.__pnRootErr = err && err.message; }
      return !window.__pnRootErr && psCat.value === 'GPU' && psMfr.value === 'MSI' &&
        psModel.value === 'RTX 3060' && psInput.value === 'MSI RTX 3060' && psPrice.focused === true;
    })()]);

  out.push(['saleType change rehydrates live state and drops the component link',
    (function(){
      const tsel = __pnEl({ tag:'select', name:'saleType', value:'RIG' });
      form.appendChild(tsel);
      openForm('sale');
      state.modal.live = { saleType:'COMPONENT', inventoryItemId:'some-part-id', itemName: search.value };
      window.__pnRootErr = null;
      try { fire('change', tsel); } catch(err){ window.__pnRootErr = err && err.message; }
      return !window.__pnRootErr && state.modal.live &&
        state.modal.live.saleType === 'RIG' &&
        !('inventoryItemId' in state.modal.live) &&
        state.modal.live.itemName === search.value;
    })()]);

  return out;
})()
`;
const interactionResults = env.run(sandbox, interaction);

// --- Roulette doctrine (permanent judgement rules) ---
const doctrineProbe = `
(function(){
  const out = [];
  const D = window.__pnRouletteDoctrine;

  out.push(['doctrine hooks exposed', typeof D === 'object' && typeof D.evaluate === 'function']);

  const sun8pm  = new Date(2026,8,6,20,0,0).getTime();
  const mon7am  = new Date(2026,8,7,7,0,0).getTime();
  const mon8am  = new Date(2026,8,7,8,0,0).getTime();
  const mon1pm  = new Date(2026,8,7,13,0,0).getTime();
  const mon1155 = new Date(2026,8,7,11,55,0).getTime();
  const sun1155pm = new Date(2026,8,6,23,55,0).getTime();
  const mon12am = new Date(2026,8,7,0,5,0).getTime();
  const mon9pm  = new Date(2026,8,7,21,0,0).getTime();

  out.push(['sun 20:00 -> mon 13:00 allowed (date changed + 12h passed)',
    D.evaluate(sun8pm, mon1pm).allowed === true]);

  out.push(['sun 20:00 -> mon 07:00 locked (12h not elapsed)',
    D.evaluate(sun8pm, mon7am).allowed === false && D.evaluate(sun8pm, mon7am).label === '01:00:00']);

  out.push(['sun 20:00 -> mon 08:00 unlocked exactly at 12h mark',
    D.evaluate(sun8pm, mon8am).allowed === true]);

  out.push(['sun 23:55 -> mon 00:05 locked (date changed but 10min elapsed)',
    D.evaluate(sun1155pm, mon12am).allowed === false && D.evaluate(sun1155pm, mon12am).label === '11:50:00']);

  out.push(['sun 23:55 -> mon 11:55 first allowed window (12h from spin)',
    D.evaluate(sun1155pm, mon1155).allowed === true]);

  out.push(['mon 08:00 -> mon 21:00 locked (second spin same day always blocked)',
    D.evaluate(mon8am, mon9pm).allowed === false]);

  out.push(['no doctrine record = always allowed', D.evaluate(null, Date.now()).allowed === true]);

  out.push(['judgement lockdown blocks a fresh spin on chamber render',
    (function(){
      D.record('SAVE MONEY');
      const html = (function(){ state.route='roulette'; return renderShell(); })();
      return html.includes('pn-r3-doctrine-locked') && html.includes('TODAY&#39;S VERDICT IS FINAL') && html.includes('NEXT JUDGEMENT AVAILABLE IN');
    })()]);

  out.push(['no DEFY THE NODE control remains in the chamber',
    (function(){
      state.route='roulette';
      const html = renderShell();
      return !html.includes('data-r3-defy') && !html.includes('DEFY') && !html.includes('pn-r3-defy');
    })()]);

  out.push(['wheel #1 shows VERDICT FINAL and is disabled when locked without a verdict',
    (function(){
      D.record('SAVE MONEY');
      state.rouletteVerdict = null;
      state.route='roulette';
      const html = renderShell();
      return html.includes('VERDICT FINAL') && html.includes('data-r3-spin-verdict') && html.includes('disabled');
    })()]);

  out.push(['PC BUILD FUND tile renders in the stats header',
    (function(){
      state.rouletteVerdict = null;
      state.route='roulette';
      const html = renderShell();
      return html.includes('pn-r3-fund') && html.includes('PC BUILD FUND');
    })()]);

  out.push(['fundAdd routes money into the PC BUILD FUND total',
    (function(){
      D.fundAdd('SAVED', 3000, 'RSD', 'SAVE MONEY');
      D.fundAdd('WIN', 2000, 'EUR', 'BET');
      return D.fundTotal('RSD') === 3000 + convert(2000,'EUR','RSD');
    })()]);

  out.push(['fundAdd ignores zero/negative amounts', (function(){ D.fundAdd('WIN', 0, 'RSD'); return D.fundTotal('RSD') > 0; })()]);

  out.push(['resolved roulette wins add and losses subtract from COMMAND Realized Profit once',
    (function(){
      const shopOnly = dashboardStats('RSD').shopRealizedProfit;
      Store.insert('rouletteLedger',{type:'BET',status:'RESOLVED',outcome:'WIN',net:1500,stake:1000,currency:'RSD',date:'2026-09-09',wager:'1ST + 2ND'});
      Store.insert('rouletteLedger',{type:'BET',status:'RESOLVED',outcome:'LOSS',net:-400,stake:500,currency:'RSD',date:'2026-09-09',wager:'ODD RED'});
      Store.insert('rouletteLedger',{type:'BET',status:'PENDING',outcome:null,net:9999,stake:500,currency:'RSD',date:'2026-09-09',wager:'ODD BLACK'});
      Store.insert('rouletteLedger',{type:'VERDICT',status:'RESOLVED',outcome:'SAVE MONEY',net:7777,currency:'RSD',date:'2026-09-09'});
      const stats = dashboardStats('RSD');
      return stats.rouletteRealizedProfit === 1100 && stats.realizedProfit === shopOnly + 1100;
    })()]);

  out.push(['roulette results render WIN green and LOSS red',
    (function(){
      state.route='roulette'; state.rouletteTab='RESULTS';
      const html=renderShell();
      return html.includes('pn-r3-result pos">WIN') && html.includes('pn-r3-result neg">LOSS');
    })()]);

  out.push(['doctrine round snapshot rehydrates into state',
    (function(){
      D.record('FUCK OFF');
      D.updateRound({});
      state.rouletteVerdict = null;
      state.rouletteWager = null;
      state.rouletteStake = '';
      state.rouletteCommittedId = null;
      D.rehydrate();
      return state.rouletteVerdict === 'FUCK OFF';
    })()]);

  out.push(['completeRound clears the round but keeps the judgement lock',
    (function(){
      D.completeRound();
      state.rouletteVerdict = null;
      const gate = D.gate();
      return gate.locked === true && gate.verdict === 'FUCK OFF';
    })()]);

  return out;
})()
`;
const doctrineResults = env.run(sandbox, doctrineProbe);

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

// --- RIG ENCLOSURE probe (case/cooler capability profiles + build integrity) ---
const enclosureProbe = `
(function(){
  const out = [];
  const E = window.__pnEnclosure;

  out.push(['__pnEnclosure exposes integrity + capability helpers', typeof E === 'object' && typeof E.integrity === 'function' && typeof E.caseCapabilities === 'function' && typeof E.coolerCapabilities === 'function']);

  HardwareCatalog.cases = [{brand:'Fractal Design',model:'Meshify 2',confidence:'HIGH',caps:{formFactors:['ITX','MATX','ATX'],maxGpuLengthMm:355,maxCoolerHeightMm:185,psuSupport:'ATX',radiator:{front:'360',top:'360',rear:'140'},airflow:'EXCELLENT',buildQuality:'PREMIUM',sidePanel:'mesh',notes:''}}];
  HardwareCatalog.coolers = [{brand:'Noctua',model:'NH-D15',confidence:'HIGH',caps:{type:'DUAL TOWER',radiator:null,heightMm:165,sockets:['AM4','AM5','LGA115X','LGA1200','LGA1700'],coolingClass:'EXTREME',fanCount:2,noiseClass:'QUIET',tdpClass:'EXTREME',ramClearance:'UNKNOWN',notes:''}}];
  HardwareCatalog.boards = [{brand:'Gigabyte',model:'B550 AORUS MASTER',chipset:'B550',socket:'AM4',form_factor:'ATX',vrm_power:90,features:90,upgrade_headroom:90,overall:90,confidence:'high'}];

  const caseSlot = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  const cc = E.caseCapabilities(caseSlot, 'Fractal Design Meshify 2');
  out.push(['catalog label hydrates case caps and stamps CATALOG source', cc && cc.maxGpuLengthMm === 355 && caseSlot.source === 'CATALOG' && caseSlot.catalogKey === 'CASE:FRACTAL DESIGN MESHIFY 2']);
  const coolerSlot = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD'};
  const kc = E.coolerCapabilities(coolerSlot, 'Noctua NH-D15');
  out.push(['catalog label hydrates compact cooler caps and stamps COOLER source', kc && kc.type === 'AIR' && kc.coolingClass === 'HIGH' && coolerSlot.source === 'CATALOG']);

  out.push(['catalogSearchAll now covers CASE and COOLER', catalogSearchAll('Meshify').some(m => m.cat === 'CASE') && catalogSearchAll('NH-D15').some(m => m.cat === 'COOLER')]);

  function baseRig(){ return {id:null,family:'INI',variantName:'A',status:'PLANNED',currency:'RSD',slots:emptyRigSlots(),estimatedMarketValue:0,expectedSalePrice:0,targetMarginPct:null,salePrice:null,saleDate:null,notes:''}; }
  function cat(type,label){ return {kind:'CATALOG',catalogType:type,label,cost:0,originalPrice:0,currency:'RSD'}; }

  const single = baseRig();
  single.slots.CASE = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  const caseHtml = renderRigSlotRow('CASE', single);
  out.push(['CASE slot renders generic profile + cap editor + search box', caseHtml.includes('data-rig-generic="CASE"') && caseHtml.includes('data-rig-cap-field="CASE.maxGpuLengthMm"') && caseHtml.includes('data-rig-catalog-item="CASE"')]);
  single.slots.COOLER = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD'};
  const coolerHtml = renderRigSlotRow('COOLER', single);
  out.push(['COOLER slot renders compact cap editor + search box', coolerHtml.includes('COOLER DETAILS / ADVANCED') && coolerHtml.includes('data-rig-cap-field="COOLER.coolingClass"') && coolerHtml.includes('data-rig-catalog-item="COOLER"') && !coolerHtml.includes('data-rig-generic="COOLER"')]);
  state.rigDraft = single;
  out.push(['RIG BENCH editor renders the unified Build Check panel', renderRigEditor().includes('pn-build-check') && renderRigEditor().includes('Build Check') && renderRigEditor().includes('SHOW DETAILS (') && !renderRigEditor().includes('pn-integrity-grid')]);

  const unknown = baseRig();
  unknown.slots.CASE = {kind:'PLANNED', label:'Generic steel case', cost:0, originalPrice:0, currency:'RSD'};
  unknown.slots.COOLER = {kind:'PLANNED', label:'Tower cooler', cost:0, originalPrice:0, currency:'RSD'};
  unknown.slots.PSU = {kind:'PLANNED', label:'Corsair 750W', cost:0, originalPrice:0, currency:'RSD'};
  const u = E.integrity(unknown);
  out.push(['no capability profile = UNKNOWN never auto-fails (no WARN checks)', u.state === 'SOUND' && u.checks.every(c => c.status !== 'WARN')]);
  out.push(['unverified checks still surface for a profile-less build', u.checks.some(c => c.status === 'UNVERIFIED')]);

  HardwareCatalog.psus = [{brand:'BeQuiet',model:'Pure Power 750W',wattage_w:750,quality_score:90,quality_class:'GOLD',safety_status:'ACCEPTABLE',connector_data_confidence:'OFFICIAL',pcie_6_2_connectors:6,pcie_16pin_connectors:0,atx_spec:'ATX'}];
  const good = baseRig();
  good.slots.CPU = cat('CPU','AMD Ryzen 7 5800X3D');
  good.slots.GPU = cat('GPU','NVIDIA RTX 3080 280mm');
  good.slots.MOBO = cat('MOBO','Gigabyte B550 AORUS MASTER');
  good.slots.RAM = {kind:'PLANNED', label:'2x8GB DDR4 dual channel', cost:0, originalPrice:0, currency:'RSD'};
  good.slots.CASE = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  good.slots.COOLER = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD', caps:{type:'DUAL TOWER',radiator:null,heightMm:160,sockets:['AM4','AM5','LGA1200','LGA1700'],coolingClass:'EXTREME',fanCount:2,noiseClass:'NORMAL',tdpClass:'EXTREME',ramClearance:'NO',notes:''}};
  good.slots.PSU = cat('PSU','BeQuiet Pure Power 750W');
  const g = E.integrity(good);
  out.push(['known compatibility = EXCELLENT integrity, every applicable check PASS', g.state === 'EXCELLENT' && g.checks.every(c => c.status === 'PASS' || c.status === 'INFO') && g.checks.some(c => c.id === 'RADIATOR_FIT' && c.status === 'INFO')]);

  const bad = baseRig();
  Object.keys(good.slots).forEach(k => bad.slots[k] = good.slots[k]);
  bad.slots.GPU = cat('GPU','NVIDIA RTX 3080 500mm');
  const b = E.integrity(bad);
  out.push(['GPU over the case limit drops integrity to MARGINAL', b.state === 'MARGINAL' && b.checks.some(c => c.id === 'GPU_CLEARANCE' && c.status === 'WARN')]);
  out.push(['integrity findings stay out of core rigWarnings', !rigWarnings(bad).some(w => w.includes('GPU EXCEEDS CASE CLEARANCE'))]);

  return out;
})()
`;
const enclosureResults = env.run(sandbox, enclosureProbe);

const roadToProbe = `
(() => {
  const out = [];
  const g = RoadTo.create({name:'RTX 5070 Ti',category:'GPU',target:110000,refType:'catalog'});
  out.push(['ROAD TO create stores the goal in its own ledger collection', Store.all('roadTo').length === 1 && RoadTo.get(g.id).name === 'RTX 5070 Ti']);
  RoadTo.addFunds(g.id, 47500);
  const g1 = RoadTo.get(g.id);
  out.push(['ROAD TO add funds persists a signed history entry', g1.saved === 47500 && g1.history.length === 1 && g1.history[0].amount === 47500]);
  out.push(['ROAD TO progress math matches the target quest', RoadTo.pct(g1) === 43.2 && RoadTo.remaining(g1) === 62500]);
  RoadTo.addFunds(g.id, 12000);
  RoadTo.removeFunds(g.id, 3000);
  const g3 = RoadTo.get(g.id);
  out.push(['ROAD TO add/remove nets the balance and keeps every entry', g3.saved === 56500 && g3.history.length === 3]);
  out.push(['ROAD TO remove cannot exceed the saved balance', !RoadTo.removeFunds(g.id, 999999).ok && RoadTo.get(g.id).saved === 56500]);
  RoadTo.setTarget(g.id, 50000);
  const g4 = RoadTo.get(g.id);
  out.push(['ROAD TO reaching the target flips reached + caps percent at 100', RoadTo.reached(g4) && RoadTo.pct(g4) === 100]);
  const feat = roadToFeaturedCard();
  out.push(['ROAD TO featured card surfaces for the active quest', feat.indexOf('pn-roadto-feat') > -1 && feat.indexOf('RTX 5070 Ti') > -1 && feat.indexOf('TARGET REACHED') > -1]);
  out.push(['ROAD TO featured card is pinned above the command dashboard', (function(){const h=renderDashboard();return h.indexOf('pn-roadto-feat') > -1 && h.indexOf('pn-roadto-feat') < h.indexOf('pn-command-content')})()]);
  const list = renderRoadTo();
  out.push(['ROAD TO page renders the new-quest form', list.indexOf('data-roadto-cat') > -1 && list.indexOf('data-roadto-create') > -1 && list.indexOf('START QUEST') > -1]);
  RoadToUI.focusId = g.id;
  const detail = renderRoadTo();
  out.push(['ROAD TO detail exposes every required action', ['data-roadto-add','data-roadto-remove','data-roadto-set-target','data-roadto-pause','data-roadto-archive','data-roadto-purchase'].every(k => detail.indexOf(k) > -1)]);
  out.push(['ROAD TO detail renders the signed quest history', detail.indexOf('QUEST HISTORY') > -1 && detail.indexOf('+47.500 RSD') > -1 && detail.indexOf('-3.000 RSD') > -1]);
  RoadTo.markPurchased(g.id);
  const purchasedDetail = renderRoadTo();
  out.push(['ROAD TO purchase closes the quest but preserves its history', RoadTo.get(g.id).status === 'PURCHASED' && purchasedDetail.indexOf('Quest closed') > -1 && purchasedDetail.indexOf('+47.500 RSD') > -1]);
  RoadToUI.focusId = null;
  const closedHtml = renderRoadTo();
  out.push(['ROAD TO purchased quest lists under CLOSED QUESTS', closedHtml.indexOf('CLOSED QUESTS') > -1 && closedHtml.indexOf('PURCHASED') > -1]);
  out.push(['ROAD TO featured card clears once the quest is purchased', roadToFeaturedCard() === '']);
  RoadToUI.focusId = null;
  out.push(['ROAD TO goals are recognized by the backup inspector', !!inspectBackupFile({roadTo:[{name:'x'}]})]);
  out.push(['ROAD TO restore carries goals through replaceAll', (function(){Store.replaceAll({meta:{},projects:[],inventory:[],deals:[],sales:[],timeline:[],plans:[],repairs:[],rigs:[],roadTo:[{id:'kept',name:'RTX 5070 Ti',saved:100,target:200,status:'ACTIVE',history:[]}]});return !!(Store.all('roadTo')||[]).find(x=>x.id==='kept')})()]);
  out.push(['ROAD TO migrateLedger and emptyLedger default the collection', Array.isArray(emptyLedger().roadTo) && Array.isArray(migrateLedger({meta:{schemaVersion:0}}).ledger.roadTo)]);
  return out;
})()
`;
const roadToResults = env.run(sandbox, roadToProbe);

const myRigProbe = `
(() => {
  const out = [];
  const r0 = MyRig.ensure();
  out.push(['MY RIG defaults to LEVIATHAN, a permanent personal rig', r0.name === 'LEVIATHAN' && r0.status === 'ACTIVE' && Array.isArray(r0.history) && Array.isArray(r0.health)]);
  out.push(['MY RIG loads the canonical CPU-Z hardware into supported slots', r0.slots.CPU.label === 'AMD Ryzen 7 9800X3D' && r0.slots.MOBO.label === 'MSI PRO B650M-P' && r0.slots.RAM.specs.indexOf('DDR5-6000') > -1 && r0.slots.GPU.label === 'EVGA GeForce RTX 3080 10GB' && r0.slots.STORAGE.specs.indexOf('Samsung 850 EVO') > -1]);
  out.push(['MY RIG seeds the full canonical Leviathan loadout into every slot', r0.slots.CPU.label === 'AMD Ryzen 7 9800X3D' && r0.slots.CPU.purchasePrice === null && r0.slots.PSU.label === 'Kolink Regulator Gold 1200W' && r0.slots.CASE.label === 'Fractal Design Torrent' && r0.slots.COOLER.label === 'Noctua NH-D15' && r0.slots.MONITOR.label === 'ASUS ROG Strix XG27UCS' && r0.slots.KEYBOARD.label === 'HyperX Alloy Elite 2' && r0.slots.MOUSE.label === 'SteelSeries Aerox 5']);
  const canonPage = renderMyRig();
  out.push(['MY RIG renders the canonical tier on every loadout card', canonPage.indexOf('pn-tier-leviathan') > -1 && canonPage.indexOf('pn-tier-spectre') > -1 && canonPage.indexOf('pn-tier-reaper') > -1 && canonPage.indexOf('pn-tier-n7') > -1]);
  out.push(['MY RIG overall rig class is REAPER, decoupled from stale rig profile logic', canonPage.indexOf('OVERALL RIG CLASS</span><span class="chip pn-tier-reaper">REAPER') > -1]);
  out.push(['MY RIG storage card expands into the full drive stack with health', canonPage.indexOf('970 EVO Plus 250GB') > -1 && canonPage.indexOf('850 EVO 250GB') > -1 && canonPage.indexOf('1TB HDD') > -1 && canonPage.indexOf('76%') > -1 && canonPage.indexOf('94%') > -1 && canonPage.indexOf('4 DRIVES') > -1 && canonPage.indexOf('~2.5TB') > -1]);
  out.push(['MY RIG hero summary names the Leviathan line-up', canonPage.indexOf('Ryzen 7 9800X3D') > -1 && canonPage.indexOf('RTX 3080 10GB') > -1 && canonPage.indexOf('32GB DDR5-6000') > -1 && canonPage.indexOf('~2.5TB Storage') > -1]);
  const legacyRig = {slots:{CPU:{label:'Legacy CPU',purchasePrice:38000,purchaseDate:'2026-01-10',notes:'keep me'}},canonicalExcluded:{}};
  MyRig.applyCanonical(legacyRig);
  out.push(['MY RIG CPU-Z data overrides legacy conflicts while preserving ownership details', legacyRig.slots.CPU.label === 'AMD Ryzen 7 9800X3D' && legacyRig.slots.CPU.dataSource === 'DETECTED' && legacyRig.slots.CPU.purchasePrice === 38000 && legacyRig.slots.CPU.purchaseDate === '2026-01-10' && legacyRig.slots.CPU.notes === 'keep me']);
  const protectedRig = {slots:{GPU:{label:'Manually confirmed GPU',dataSource:'MANUAL'}},canonicalExcluded:{MOBO:true}};
  MyRig.applyCanonical(protectedRig);
  out.push(['MY RIG canonical refresh protects manual and explicitly cleared slots', protectedRig.slots.GPU.label === 'Manually confirmed GPU' && !protectedRig.slots.MOBO && protectedRig.slots.CPU.dataSource === 'DETECTED']);
  MyRig.setSlot('GPU',{label:'NVIDIA RTX 3080 10GB',specs:'10 GB GDDR6X · 320W',purchasePrice:94000,purchaseDate:'2026-01-15',notes:'',vaultId:null});
  MyRig.setSlot('CPU',{label:'AMD Ryzen 7 5800X3D',specs:'8C/16T',purchasePrice:38000,purchaseDate:'2026-01-10',notes:'',vaultId:null});
  MyRig.setSlot('PSU',{label:'Corsair RM850x 850W',specs:'850W 80+ Gold',purchasePrice:18000,purchaseDate:'2026-01-10',notes:'',vaultId:null});
  const sl = Store.load().myRig.slots;
  out.push(['MY RIG slots persist exact model, specs, price, date and manual provenance', sl.GPU.label === 'NVIDIA RTX 3080 10GB' && sl.GPU.specs.indexOf('GDDR6X') > -1 && sl.GPU.purchasePrice === 94000 && sl.GPU.purchaseDate === '2026-01-15' && sl.GPU.dataSource === 'MANUAL']);
  out.push(['MY RIG current value sums only the installed loadout, never profit', MyRig.invested() === 150000 && MyRig.value().invested === 150000 && !('profit' in MyRig.value())]);
  out.push(['MY RIG value reports how many on-record parts have a price', MyRig.value().partsTotal === 11 && MyRig.value().partsPriced === 3]);

  const myRigVaultItem = Actions.addInventory({category:'STORAGE', manufacturer:'Samsung', model:'980 Pro 1TB', purchaseDate:'2026-01-05', purchasePrice:12000, currency:'RSD', estimatedMarketValue:13000, source:'OTHER', condition:'WORKING', status:'IN_STORAGE'});
  MyRig.setSlot('STORAGE',{label:'Samsung 980 Pro 1TB', specs:'', purchasePrice:null, purchaseDate:'2026-01-05', notes:'', vaultId:myRigVaultItem.id});
  const myRigValueGap = MyRig.value();
  out.push(['MY RIG value flags parts missing a price without changing the invested total', myRigValueGap.partsTotal === 11 && myRigValueGap.partsPriced === 3 && myRigValueGap.invested === 150000]);
  const pageWithGap = renderMyRig();
  out.push(['MY RIG personal view keeps value chatter out of the page entirely', pageWithGap.indexOf('missing a price') === -1 && pageWithGap.indexOf('TOTAL INVESTED') === -1]);
  out.push(['MY RIG vault-sourced part links straight to its Inventory record', pageWithGap.indexOf('data-open-entity="inventory"') > -1 && pageWithGap.indexOf('data-id="' + myRigVaultItem.id + '"') > -1]);
  MyRig.clearSlot('STORAGE');
  out.push(['MY RIG stays finance-free even with unpriced parts in the loadout', renderMyRig().indexOf('2 of 5 parts') === -1 && renderMyRig().indexOf('missing a price') === -1]);

  const page = renderMyRig();
  out.push(['MY RIG page opens with identity hero + equipment screen and no slot price', page.indexOf('pn-myrig-hero') > -1 && page.indexOf('LEVIATHAN') > -1 && page.indexOf('COMPONENT LOADOUT') > -1 && page.indexOf('data-myrig-slot="GPU"') > -1 && page.indexOf('94.000 RSD') === -1]);
  out.push(['MY RIG keeps detection/source jargon out of the page entirely', page.indexOf('pn-myrig-src') === -1 && page.indexOf('CPU-Z DETECTED') === -1 && page.indexOf('DETECTED') === -1 && page.indexOf('MANUAL') === -1 && page.indexOf('CATALOG') === -1]);
  out.push(['MY RIG resale readout stays model-side only, never rendered as finance', page.indexOf('INFORMATIONAL ONLY') === -1 && page.indexOf('EST. RESALE VALUE') === -1]);
  MyRig.setResale(132000);
  const v2 = MyRig.value();
  out.push(['MY RIG optional resale estimate feeds the difference readout', v2.resale === 132000 && v2.diff === -18000]);
  const compat = MyRig.compat();
  out.push(['MY RIG compatibility reuses the rig-assembly Build Check verdict', !!compat && ['EMPTY','PASS','WARN','FAIL'].indexOf(compat.level) > -1]);
  out.push(['MY RIG compatibility suppresses generic unverified warnings', !!compat && compat.rows.every(r => r.status === 'WARN' || r.status === 'FAIL')]);
  MyRig.setSlot('STORAGE',{label:'Samsung 990 Pro 2TB',specs:'2TB NVMe · PCIe 4.0',purchasePrice:null,purchaseDate:null,notes:'',vaultId:null});
  out.push(['MY RIG manual storage swap clears the canonical drive stack', (function(){const st=Store.load().myRig.slots.STORAGE;return st.label === 'Samsung 990 Pro 2TB' && !st.stack && !st.stackTotal})()]);
  MyRig.clearSlot('STORAGE');
  MyRig.logUpgrade({slotKey:'GPU',oldPart:'GTX 1070 8GB',newPart:'NVIDIA RTX 3080 10GB',date:'2026-01-15',cost:94000,notes:'Found on KP, sealed'});
  const hist = Store.load().myRig.history[0];
  out.push(['MY RIG upgrade history preserves old/new/cost/date', hist.oldPart === 'GTX 1070 8GB' && hist.newPart === 'NVIDIA RTX 3080 10GB' && hist.cost === 94000 && hist.date === '2026-01-15']);
  const goal = RoadTo.create({name:'RTX 5080 16GB',category:'GPU',target:100000,refType:'catalog',targetSlot:'GPU'});
  out.push(['ROAD TO goal links to an install slot on MY RIG', RoadTo.get(goal.id).targetSlot === 'GPU']);
  out.push(['MY RIG future-upgrades section surfaces the linked quest', (function(){const h=renderMyRig();return h.indexOf('data-myrig-plan="'+goal.id+'"') > -1 && h.indexOf('RTX 5080 16GB') > -1})()]);
  RoadTo.addFunds(goal.id, 100000);
  const install = MyRig.installFromGoal(RoadTo.get(goal.id),{toVault:true});
  out.push(['MY RIG install replaces the current part and closes the quest as purchased', install.ok && Store.load().myRig.slots.GPU.label === 'RTX 5080 16GB' && Store.load().myRig.slots.GPU.dataSource === 'MANUAL' && RoadTo.get(goal.id).status === 'PURCHASED']);
  const ih = Store.load().myRig.history[0];
  out.push(['MY RIG install logs the retired part into upgrade history', ih.oldPart === 'NVIDIA RTX 3080 10GB' && ih.newPart === 'RTX 5080 16GB' && ih.notes.indexOf('PARTS VAULT') > -1]);
  out.push(['MY RIG install moves a non-vault part into PARTS VAULT only when chosen', (function(){const it=Store.all('inventory').find(i=>i.model==='RTX 3080 10GB');return !!it && it.status === 'IN_STORAGE' && it.notes.indexOf('Retired from LEVIATHAN') > -1})()]);
  const goal2 = RoadTo.create({name:'Corsair AX1600i',category:'PSU',target:60000,refType:'custom',targetSlot:'PSU'});
  RoadTo.addFunds(goal2.id, 60000);
  const psuInstall = MyRig.installFromGoal(RoadTo.get(goal2.id),{toVault:false});
  out.push(['MY RIG install with log-only keeps the old part out of inventory', psuInstall.ok && !psuInstall.moved && RoadTo.get(goal2.id).status === 'PURCHASED']);
  MyRig.addHealth({category:'CPU TEMP',label:'idle',value:'43',notes:'air cooler'});
  out.push(['MY RIG health notes stay lightweight manual entries', Store.load().myRig.health.length === 1 && Store.load().myRig.health[0].value === '43']);
  out.push(['MY RIG future-upgrades section keeps its entry point after quest installs', renderMyRig().indexOf('FUTURE UPGRADES') > -1 && renderMyRig().indexOf('data-myrig-plan-new') > -1]);
  out.push(['MY RIG profile is recognized by the backup inspector', !!inspectBackupFile({myRig:{name:'LEVIATHAN',slots:{}}})]);
  out.push(['MY RIG backup counts profile as a single record', (function(){const c=inspectBackupFile({myRig:{name:'LEVIATHAN',slots:{}},projects:[1]});return !!c && c.myRig === 1})()]);
  out.push(['MY RIG restore carries the personal profile through replaceAll', (function(){Store.replaceAll({meta:{},projects:[],inventory:[],deals:[],sales:[],timeline:[],plans:[],repairs:[],rigs:[],roadTo:[],myRig:{name:'LEVIATHAN BACKUP',slots:{GPU:{label:'Ref X'}}}});return Store.load().myRig && Store.load().myRig.name === 'LEVIATHAN BACKUP' && Store.load().myRig.slots.GPU.label === 'Ref X'})()]);
  out.push(['MY RIG emptyLedger and migrateLedger default the profile slot', (function(){const e1=emptyLedger();const m=migrateLedger({meta:{schemaVersion:0}}).ledger;return e1.myRig === null && m.myRig === null})()]);
  return out;
})()
`;
const myRigResults = env.run(sandbox, myRigProbe);

const mailProbe = `
(() => {
  const out = [];
  out.push(['MAIL: INCOMING added to INVENTORY_STATUSES with matching chip meta', INVENTORY_STATUSES.indexOf('INCOMING') > -1 && !!INVENTORY_STATUS_META.INCOMING]);

  const proj = Store.insert('projects', {name:'Mail Test Rig', status:'BUILDING', currency:'RSD', componentIds:[], startDate:'2026-01-01', additionalCosts:0});
  const deal = Store.insert('deals', {item:'Mail Test Deal', category:'GPU', date:'2026-01-01', purchasePrice:10000, estimatedMarketValue:15000, currency:'RSD', condition:'WORKING', source:'OTHER'});
  const sale = Store.insert('sales', {itemName:'Mail Test Sale', saleDate:'2026-02-01', buyerPrice:50000, currency:'RSD', originalInvestment:30000, additionalCosts:0});
  const item = Store.insert('inventory', {category:'GPU', manufacturer:'Mail', model:'Test Card', purchaseDate:'2026-01-01', purchasePrice:20000, currency:'RSD', estimatedMarketValue:25000, source:'OTHER', condition:'WORKING', status:'INCOMING'});

  const mail1 = Actions.addMail({direction:'incoming', description:'GPU inbound', linkedType:'inventory', linkedId:item.id, shippingCost:1000, currency:'RSD', status:'in_transit'});
  out.push(['MAIL: addMail stores a record on its own ledger collection', Store.all('mail').length === 1 && mailGet(mail1.id).description === 'GPU inbound']);

  const smartSms = 'Ukoliko zelite, posiljku PX887428579RS, od posiljaoca MEDINA CORHAMZIC, mozete danas do 17:00 h preusmeriti na paketomat putem linka https://portal.posta.rs/paketomati/redirect.html?t=UHtRJrJj';
  const smartNow = new Date(2026,8,10,12,0,0);
  const smartParsed = mailParseCourierMessage(smartSms, smartNow);
  out.push(['MAIL SMART IMPORT: supplied Post Express SMS parses canonical shipment fields', smartParsed.ok && smartParsed.trackingNumber === 'PX887428579RS' && smartParsed.sender === 'MEDINA CORHAMZIC' && smartParsed.carrier === 'Pošta Srbije / Post Express' && smartParsed.direction === 'incoming' && smartParsed.status === 'in_transit']);
  out.push(['MAIL SMART IMPORT: danas deadline resolves against the local reference date', smartParsed.deadlineAt === '2026-09-10T17:00']);
  out.push(['MAIL SMART IMPORT: canonical tracker stays separate from the paketomat action URL', smartParsed.trackingUrl === 'https://www.posta.rs/lat/alati/pracenje-posiljke.aspx' && smartParsed.actionLinks.length === 1 && smartParsed.actionLinks[0].url === 'https://portal.posta.rs/paketomati/redirect.html?t=UHtRJrJj']);
  const accentedParsed = mailParseCourierMessage('Pošiljku PX123456789RS, od pošiljaoca ČEDA ŠOP, možete preuzeti. Pouzeće 12.500 RSD.', smartNow);
  out.push(['MAIL SMART IMPORT: Serbian diacritics and COD parse deterministically', accentedParsed.ok && accentedParsed.sender === 'ČEDA ŠOP' && accentedParsed.codAmount === 12500 && accentedParsed.currency === 'RSD' && accentedParsed.status === 'ready_for_pickup']);
  const createPreview = mailSmartImportPreview(smartSms, smartNow);
  MailUI.smartImport = {raw:smartSms,preview:createPreview,error:''};
  const smartImportHtml = renderMail();
  out.push(['MAIL SMART IMPORT: MAIL exposes paste action and preview before create', smartImportHtml.indexOf('data-mail-import') > -1 && smartImportHtml.indexOf('CREATE NEW') > -1 && smartImportHtml.indexOf('CREATE SHIPMENT') > -1 && smartImportHtml.indexOf('PX887428579RS') > -1]);
  MailUI.smartImport = null;
  const mailBeforeImport = Store.all('mail').length;
  const smartCreated = mailApplyParsedMessage(smartParsed, smartSms);
  out.push(['MAIL SMART IMPORT: parsed SMS creates one shipment with its action link', smartCreated.mode === 'create' && Store.all('mail').length === mailBeforeImport + 1 && smartCreated.record.actionLinks[0].label === 'PREUSMERI NA PAKETOMAT']);
  const updateSms = 'Posiljka PX887428579RS, od posiljaoca MEDINA CORHAMZIC, je spremna za preuzimanje.';
  const updateParsed = mailParseCourierMessage(updateSms, smartNow);
  const updatePreview = mailSmartImportPreview(updateSms, smartNow);
  MailUI.smartImport = {raw:updateSms,preview:updatePreview,error:''};
  const updateImportHtml = renderMail();
  out.push(['MAIL SMART IMPORT: preview switches to UPDATE for an existing tracking number', updatePreview.mode === 'update' && updateImportHtml.indexOf('UPDATE EXISTING') > -1 && updateImportHtml.indexOf('UPDATE SHIPMENT') > -1]);
  MailUI.smartImport = null;
  const smartUpdated = mailApplyParsedMessage(updateParsed, updateSms);
  out.push(['MAIL SMART IMPORT: matching tracking number updates instead of duplicating', smartUpdated.mode === 'update' && smartUpdated.record.id === smartCreated.record.id && Store.all('mail').length === mailBeforeImport + 1 && smartUpdated.record.status === 'ready_for_pickup']);
  out.push(['MAIL SMART IMPORT: raw messages and import events remain in shipment history and timeline', smartUpdated.record.messageHistory.length === 2 && smartUpdated.record.messageHistory[0].rawMessage === smartSms && smartUpdated.record.messageHistory[1].rawMessage === updateSms && Store.all('timeline').filter(t => t.type === 'MAIL_IMPORT' && t.relatedId === smartUpdated.record.id).length === 2]);

  out.push(['MAIL: mailNormalizeUrl auto-prepends https:// to a bare domain', mailNormalizeUrl('posta.rs/pracenje?ID=123') === 'https://posta.rs/pracenje?ID=123']);
  out.push(['MAIL: mailNormalizeUrl leaves a proper http(s) URL untouched', mailNormalizeUrl('http://example.com/x') === 'http://example.com/x']);
  out.push(['MAIL: mailNormalizeUrl rejects a non-http(s) scheme', mailNormalizeUrl('javascript:alert(1)') === '' && mailNormalizeUrl('ftp://example.com') === '']);
  out.push(['MAIL: mailNormalizeUrl returns empty for blank input', mailNormalizeUrl('') === '' && mailNormalizeUrl('   ') === '']);
  out.push(['MAIL: mailSafeUrl only allows http(s) through to rendering', mailSafeUrl('https://example.com') === 'https://example.com' && mailSafeUrl('javascript:alert(1)') === '']);

  const mail1b = Actions.updateMail(mail1.id, {trackingUrl:'posta.rs/pracenje?ID=123'});
  out.push(['MAIL: saved trackingUrl is normalized to a full https link', mail1b.trackingUrl === 'https://posta.rs/pracenje?ID=123']);
  const cardWithLink = mailCard(mail1b);
  out.push(['MAIL card renders a TRACK ONLINE button wired to the one-click track action', cardWithLink.indexOf('TRACK ONLINE') > -1 && cardWithLink.indexOf('data-mail-track="' + mail1b.id + '"') > -1]);
  out.push(['MAIL CSV export includes the Tracking Link column', CSV_EXPORTS.mail.columns.some(c => c.label === 'Tracking Link' && c.get(mail1b) === 'https://posta.rs/pracenje?ID=123')]);

  out.push(['MAIL: mailCarrierPresetUrl recognizes Posta Srbije regardless of accents/casing', mailCarrierPresetUrl('Pošta Srbije') === 'https://www.posta.rs/lat/alati/pracenje-posiljke.aspx' && mailCarrierPresetUrl('POSTA SRBIJE') === 'https://www.posta.rs/lat/alati/pracenje-posiljke.aspx' && mailCarrierPresetUrl('posta  srbije') === 'https://www.posta.rs/lat/alati/pracenje-posiljke.aspx']);
  out.push(['MAIL: mailCarrierPresetUrl returns empty for an unknown carrier', mailCarrierPresetUrl('UPS') === '']);

  let calledOpenWith = null;
  window.open = (u) => { calledOpenWith = u; };
  const mail5 = Actions.addMail({direction:'outgoing', description:'Buyer return', trackingNumber:'CC1RS', trackingUrl:'posta.rs/lat/alati/pracenje-posiljke.aspx'});
  mailTrack(mail5.id, null);
  out.push(['MAIL: mailTrack copies the tracking number and opens the stored (normalized) tracking URL', calledOpenWith === 'https://posta.rs/lat/alati/pracenje-posiljke.aspx']);
  delete window.open;

  Actions.addMail({direction:'incoming', description:'Deal parts', linkedType:'deal', linkedId:deal.id, shippingCost:1500, currency:'RSD', status:'preparing'});
  const dealAfter = dealDerived(deal);
  out.push(['MAIL: incoming shipping folds into dealDerived via the existing Calc helpers, never mutating the stored deal', Math.abs(dealAfter.amountSaved - (15000-11500)) < 0.001 && Math.abs(dealAfter.discountPct - ((15000-11500)/15000*100)) < 0.001 && Store.get('deals',deal.id).purchasePrice === 10000]);

  Actions.addMail({direction:'incoming', description:'Build parts', linkedType:'project', linkedId:proj.id, shippingCost:2500, currency:'RSD', status:'preparing'});
  out.push(['MAIL: incoming shipping folds into project acquisition/build cost via Actions.projectTotalInvestment', Actions.projectTotalInvestment(Store.get('projects',proj.id)) === 2500]);

  const mail4 = Actions.addMail({direction:'outgoing', description:'Shipped to buyer', linkedType:'sale', linkedId:sale.id, shippingCost:2000, currency:'RSD', status:'sent'});
  const saleBefore = saleDerived(sale);
  out.push(['MAIL: outgoing shipping counts toward sale expenses and recalculates profit/margin/ROI', saleBefore.totalCost === 32000 && saleBefore.profit === 18000 && Math.abs(saleBefore.margin-36) < 0.001 && Math.abs(saleBefore.roi-56.25) < 0.001]);

  Actions.updateMail(mail4.id, {shippingCost:3000});
  const saleAfterEdit = saleDerived(Store.get('sales',sale.id));
  out.push(['MAIL: editing a linked shipment cost recalculates instead of accumulating (no double-counting)', saleAfterEdit.totalCost === 33000]);

  Actions.removeMail(mail4.id);
  const saleAfterDelete = saleDerived(Store.get('sales',sale.id));
  out.push(['MAIL: deleting a linked shipment reverts the sale totals', saleAfterDelete.totalCost === 30000 && saleAfterDelete.profit === 20000]);

  out.push(['MAIL: mailIsActive excludes only delivered/returned/lost', !mailIsActive({status:'delivered'}) && !mailIsActive({status:'returned'}) && !mailIsActive({status:'lost'}) && mailIsActive({status:'in_transit'}) && mailIsActive({status:'delayed'}) && mailIsActive({status:'preparing'})]);
  out.push(['MAIL: mailIsProblem is exactly delayed/returned/lost', mailIsProblem({status:'delayed'}) && mailIsProblem({status:'returned'}) && mailIsProblem({status:'lost'}) && !mailIsProblem({status:'in_transit'}) && !mailIsProblem({status:'delivered'})]);

  const before1 = mailGet(mail1.id);
  const rec1 = Actions.updateMail(mail1.id, {status:'delivered'});
  out.push(['MAIL: marking delivered auto-sets actualDeliveryDate when empty', rec1.actualDeliveryDate === todayISO()]);
  mailCheckDeliveredOffer(before1, rec1);
  out.push(['MAIL: delivered incoming shipment linked to INCOMING inventory offers the transition without silently forcing it', !!MailUI.offer && MailUI.offer.inventoryId === item.id && Store.get('inventory',item.id).status === 'INCOMING']);
  Actions.updateInventory(MailUI.offer.inventoryId, {status:'IN_STORAGE'});
  MailUI.offer = null;
  out.push(['MAIL: applying the offered transition sets the linked inventory item to IN STORAGE', Store.get('inventory',item.id).status === 'IN_STORAGE']);

  const page = renderMail();
  out.push(['MAIL page renders summary, filters, paste import and Add Shipment actions', page.indexOf('pn-mail-summary') > -1 && page.indexOf('data-mail-filter="PROBLEM"') > -1 && page.indexOf('data-mail-import') > -1 && page.indexOf('data-mail-add') > -1]);

  out.push(['MAIL: recognized by the backup inspector', !!inspectBackupFile({mail:[{id:'x'}]})]);
  out.push(['MAIL: restore carries shipments through replaceAll', (function(){Store.replaceAll({meta:{},projects:[],inventory:[],deals:[],sales:[],timeline:[],plans:[],repairs:[],rigs:[],roadTo:[],myRig:null,mail:[{id:'kept-mail',direction:'incoming',description:'kept',status:'preparing'}]});return !!(Store.all('mail')||[]).find(x=>x.id==='kept-mail')})()]);
  out.push(['MAIL: emptyLedger and migrateLedger default the collection so pre-MAIL saves load cleanly', Array.isArray(emptyLedger().mail) && Array.isArray(migrateLedger({meta:{schemaVersion:0}}).ledger.mail)]);
  return out;
})()
`;
const mailResults = env.run(sandbox, mailProbe);

const treasuryFlowProbe = `
(function(){
  const out = [];
  function setupPool(amount){
    const ledger = Store.load();
    ledger.treasury = normalizeTreasury({balances:[{label:'Cash (RSD)',amount:amount,currency:'RSD',include:true,sourceKey:'CASH_RSD'}],flows:[]});
    Store.persist();
  }
  function getPool(){
    const b = Store.load().treasury.balances.find(x => x.sourceKey === 'CASH_RSD');
    return b ? b.amount : null;
  }
  function flowCount(){ return Store.load().treasury.flows.length; }
  function findFlow(refType,refId,kind){ return Store.load().treasury.flows.find(f => f.refType===refType && f.refId===refId && f.kind===kind) || null; }

  setupPool(100000);
  const a = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'A Card',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  out.push(['TREASURY FLOW A: inventory acquisition deducts once from the CASH_RSD pool', getPool() === 95000 && flowCount() === 1]);

  setupPool(100000);
  const d = Actions.addDeal({item:'Deal B',category:'GPU',date:'2026-01-01',purchasePrice:5000,estimatedMarketValue:8000,currency:'RSD',condition:'WORKING',source:'OTHER'});
  out.push(['TREASURY FLOW B1: deal acquisition deducts the purchase price', getPool() === 95000 && flowCount() === 1]);
  const b = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'B Card',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:8000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  out.push(['TREASURY FLOW B2: deal + separate inventory both deduct before linking', getPool() === 90000 && flowCount() === 2]);
  Actions.updateDeal(d.id,{inventoryItemId:b.id});
  out.push(['TREASURY FLOW B3: linking a deal to inventory retires the deal flow, keeping one acquisition', getPool() === 95000 && flowCount() === 1 && !findFlow('deal',d.id,'ACQUISITION') && !!findFlow('inventory',b.id,'ACQUISITION')]);

  setupPool(100000);
  const c = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'C Card',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'INCOMING'});
  const m = Actions.addMail({direction:'incoming',description:'C Card inbound',linkedType:'inventory',linkedId:c.id,shippingCost:500,currency:'RSD',status:'in_transit'});
  out.push(['TREASURY FLOW C: purchase + incoming shipping deduct once', getPool() === 94500 && flowCount() === 2]);
  Actions.updateInventory(c.id,{purchasePrice:5500});
  out.push(['TREASURY FLOW D: raising the purchase price adjusts the pool by the delta', getPool() === 94000 && findFlow('inventory',c.id,'ACQUISITION').amount === 5500]);
  Actions.updateInventory(c.id,{purchasePrice:5000});
  out.push(['TREASURY FLOW E: lowering the purchase price back restores the pool exactly', getPool() === 94500 && findFlow('inventory',c.id,'ACQUISITION').amount === 5000]);
  Actions.updateMail(m.id,{shippingCost:700});
  out.push(['TREASURY FLOW F: editing shipping cost adjusts the pool by the difference', getPool() === 94300 && findFlow('mail',m.id,'SHIPPING_IN').amount === 700]);
  Actions.removeMail(m.id);
  out.push(['TREASURY FLOW G: deleting a shipment reverses its shipping spend', getPool() === 95000 && flowCount() === 1]);

  setupPool(100000);
  const h = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'H Card',purchaseDate:'2026-01-01',purchasePrice:5500,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  const sale = Actions.addSale({inventoryItemId:h.id,itemName:'H Card',saleDate:'2026-02-01',buyerPrice:7000,originalInvestment:5500,additionalCosts:0,currency:'RSD',reason:'',notes:'',saleType:'COMPONENT',saleState:'COMPLETED'});
  out.push(['TREASURY FLOW H: completed sale credits the full buyer price into the pool', getPool() === 101500 && findFlow('sale',sale.id,'SALE').signedDelta === 7000]);

  setupPool(100000);
  const i = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'I Card',purchaseDate:'2026-01-01',purchasePrice:5500,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  Actions.updateInventory(i.id,{purchasePrice:null});
  out.push(['TREASURY FLOW I: clearing purchasePrice returns the pool and leaves a zero flow, no NaN', getPool() === 100000 && findFlow('inventory',i.id,'ACQUISITION').amount === 0 && findFlow('inventory',i.id,'ACQUISITION').signedDelta === 0]);

  setupPool(100000);
  const j = Actions.addInventory({category:'GPU',manufacturer:'Nvidia',model:'J Card',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  const backup = JSON.parse(JSON.stringify(Store._data));
  Store.replaceAll(backup);
  out.push(['TREASURY FLOW J: backup restore preserves flows and never re-deducts', getPool() === 95000 && flowCount() === 1 && findFlow('inventory',j.id,'ACQUISITION').signedDelta === -5000]);

  setupPool(100000);
  Store.insert('inventory',{id:'legacy-flow-item',category:'GPU',manufacturer:'Nvidia',model:'Legacy',purchaseDate:'2026-01-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:7000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE'});
  Store._data = null;
  Store.load();
  out.push(['TREASURY FLOW K: legacy records without flows load cleanly and never double-spend', getPool() === 100000 && flowCount() === 0]);

  return out;
})()
`;
const treasuryFlowResults = env.run(sandbox, treasuryFlowProbe);

const all = checks.concat(results).concat(interactionResults).concat(volumeResults).concat(rigResults).concat(doctrineResults).concat(enclosureResults).concat(roadToResults).concat(myRigResults).concat(mailResults).concat(treasuryFlowResults);
let fail = 0;
for (const [name, ok] of all){
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) fail++;
}
console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + all.length + ' assertions)');
process.exit(fail === 0 ? 0 : 1);
