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
  'roulette_extension.js', 'roulette_ui_extension.js', 'sidebar_cleanup_extension.js'
];
checks.push(['manifest has 15 scripts', entries.length === 15]);
checks.push(['manifest order matches canonical 15-file load order',
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

const indexCss = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
checks.push(['page-mount layer bridges .main into a bounded flex column (content is the scroll layer)',
  indexCss.includes('#page-mount{flex:1;min-height:0;display:flex;flex-direction:column}')]);
checks.push(['app shell keeps height:100vh on .main with overflow:hidden (no doc-level scroll)',
  /\.main\{[^}]*height:100vh[^}]*overflow:hidden/.test(indexCss)]);
checks.push(['.content is the single internal scroll container with min-height:0',
  /\.content\{[^}]*min-height:0/.test(indexCss) && /\.content\{[^}]*overflow-y:auto/.test(indexCss)]);
checks.push(['rig slot grid collapses to stacked rows by 1180px so controls never clip',
  /@media \(max-width:1180px\)\{[\s\S]*?\.rig-slot-row\{grid-template-columns:1fr 1fr/.test(indexCss)]);
checks.push(['no global viewport squeeze via transform:scale in the shell CSS', !indexCss.includes('transform:scale(')]);
checks.push(['mobile media query detaches content from the fixed-height shell',
  /@media \(max-width:760px\)\{[\s\S]*?\.main\{height:auto;min-height:100vh\}/.test(indexCss) && /\.content\{overflow-y:visible;flex:none\}/.test(indexCss)]);

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
checks.push(['manifest still declares 15 scripts in sandbox', meta.manifestLen === 15]);

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

  const saleSchema = FORM_SCHEMAS.sale(null);
  log('NEW SALE item field uses the component search type', saleSchema.fields[0].type === 'componentSearch');
  log('NEW SALE schema carries a Category select', saleSchema.fields.some(f=>f.key==='category' && f.options === CATEGORIES));
  log('INVENTORY_GROUP_ORDER is a permutation of CATEGORIES', INVENTORY_GROUP_ORDER.length === CATEGORIES.length && INVENTORY_GROUP_ORDER.slice().sort().join(',') === CATEGORIES.slice().sort().join(','));
  log('component pick keyboard helper is exposed', typeof pnSaleComponentPick === 'function');

  log('catalogEntriesForSlot(PSU) delegates to HardwareCatalog.psus', catalogEntriesForSlot('PSU') === (HardwareCatalog.psus || []));
  log('gpuPsuRequirement and psuResolvedWattage exist', typeof gpuPsuRequirement === 'function' && typeof psuResolvedWattage === 'function');
  log('HardwareCatalog.psuError starts null', HardwareCatalog.psuError === null);

  log('catalogEntriesForSlot(CASE) delegates to HardwareCatalog.cases', catalogEntriesForSlot('CASE') === (HardwareCatalog.cases || []));
  log('catalogEntriesForSlot(COOLER) delegates to HardwareCatalog.coolers', catalogEntriesForSlot('COOLER') === (HardwareCatalog.coolers || []));

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
  const compA = Actions.addInventory({category:'GPU',manufacturer:'ASUS',model:'RTX 3060',purchaseDate:'2026-02-01',purchasePrice:30000,currency:'RSD',estimatedMarketValue:38000,source:'KP',condition:'WORKING',status:'LISTED',notes:''});
  const compB = Actions.addInventory({category:'MOTHERBOARD',manufacturer:'MSI',model:'B450 Tomahawk',purchaseDate:'2026-02-10',purchasePrice:12000,currency:'RSD',estimatedMarketValue:16500,source:'FRIEND',condition:'WORKING',status:'IN_STORAGE',notes:''});
  const compMatches = salesComponentMatches('3060');
  log('component search finds an owned GPU for "3060"', compMatches.some(m=>m.kind==='inventory' && m.cat==='GPU' && m.label.indexOf('3060') > -1));
  log('component search excludes SOLD inventory', compMatches.every(m=>m.kind!=='inventory' || m.item.status !== 'SOLD'));
  const compMatches2 = salesComponentMatches('b450');
  log('component search ranks owned inventory before catalog', compMatches2.length > 0 && compMatches2[0].kind === 'inventory');
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

  const caseSlot = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  const cc = E.caseCapabilities(caseSlot, 'Fractal Design Meshify 2');
  out.push(['catalog label hydrates case caps and stamps CATALOG source', cc && cc.maxGpuLengthMm === 355 && caseSlot.source === 'CATALOG' && caseSlot.catalogKey === 'CASE:FRACTAL DESIGN MESHIFY 2']);
  const coolerSlot = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD'};
  const kc = E.coolerCapabilities(coolerSlot, 'Noctua NH-D15');
  out.push(['catalog label hydrates cooler caps and stamps COOLER source', kc && kc.coolingClass === 'EXTREME' && coolerSlot.source === 'CATALOG']);

  out.push(['catalogSearchAll now covers CASE and COOLER', catalogSearchAll('Meshify').some(m => m.cat === 'CASE') && catalogSearchAll('NH-D15').some(m => m.cat === 'COOLER')]);

  function baseRig(){ return {id:null,family:'INI',variantName:'A',status:'PLANNED',currency:'RSD',slots:emptyRigSlots(),estimatedMarketValue:0,expectedSalePrice:0,targetMarginPct:null,salePrice:null,saleDate:null,notes:''}; }
  function cat(type,label){ return {kind:'CATALOG',catalogType:type,label,cost:0,originalPrice:0,currency:'RSD'}; }

  const single = baseRig();
  single.slots.CASE = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  const caseHtml = renderRigSlotRow('CASE', single);
  out.push(['CASE slot renders generic profile + cap editor + search box', caseHtml.includes('data-rig-generic="CASE"') && caseHtml.includes('data-rig-cap-field="CASE.maxGpuLengthMm"') && caseHtml.includes('data-rig-catalog-item="CASE"')]);
  single.slots.COOLER = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD'};
  const coolerHtml = renderRigSlotRow('COOLER', single);
  out.push(['COOLER slot renders generic profile + cap editor + search box', coolerHtml.includes('data-rig-generic="COOLER"') && coolerHtml.includes('data-rig-cap-field="COOLER.coolingClass"') && coolerHtml.includes('data-rig-catalog-item="COOLER"')]);
  state.rigDraft = single;
  out.push(['RIG BENCH editor injects the BUILD INTEGRITY panel', renderRigEditor().includes('BUILD INTEGRITY') && renderRigEditor().includes('pn-integrity-grid')]);

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
  good.slots.MOBO = cat('MOBO','Gigabyte B550 AORUS ATX');
  good.slots.RAM = {kind:'PLANNED', label:'2x8GB DDR4 dual channel', cost:0, originalPrice:0, currency:'RSD'};
  good.slots.CASE = {kind:'PLANNED', catalogType:'CASE', label:'Fractal Design Meshify 2', cost:0, originalPrice:0, currency:'RSD'};
  good.slots.COOLER = {kind:'PLANNED', catalogType:'COOLER', label:'Noctua NH-D15', cost:0, originalPrice:0, currency:'RSD', caps:{type:'DUAL TOWER',radiator:null,heightMm:160,sockets:['AM4','AM5','LGA1200','LGA1700'],coolingClass:'EXTREME',fanCount:2,noiseClass:'NORMAL',tdpClass:'EXTREME',ramClearance:'NO',notes:''}};
  good.slots.PSU = cat('PSU','BeQuiet Pure Power 750W');
  const g = E.integrity(good);
  out.push(['known compatibility = EXCELLENT integrity, every check PASS', g.state === 'EXCELLENT' && g.checks.every(c => c.status === 'PASS')]);

  const bad = baseRig();
  Object.keys(good.slots).forEach(k => bad.slots[k] = good.slots[k]);
  bad.slots.GPU = cat('GPU','NVIDIA RTX 3080 500mm');
  const b = E.integrity(bad);
  out.push(['GPU over the case limit drops integrity to MARGINAL', b.state === 'MARGINAL' && b.checks.some(c => c.id === 'GPU_CLEARANCE' && c.status === 'WARN')]);
  out.push(['integrity warnings append into rigWarnings', rigWarnings(bad).some(w => w.includes('GPU EXCEEDS CASE CLEARANCE'))]);

  return out;
})()
`;
const enclosureResults = env.run(sandbox, enclosureProbe);

const all = checks.concat(results).concat(interactionResults).concat(volumeResults).concat(rigResults).concat(doctrineResults).concat(enclosureResults);
let fail = 0;
for (const [name, ok] of all){
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!ok) fail++;
}
console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + all.length + ' assertions)');
process.exit(fail === 0 ? 0 : 1);