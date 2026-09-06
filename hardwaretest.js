const fs = require('fs');
const vm = require('vm');

const hardware = JSON.parse(fs.readFileSync(__dirname + '/profitnode_hardware_ratings_v1.json', 'utf8'));
const motherboards = JSON.parse(fs.readFileSync(__dirname + '/profitnode_motherboard_catalog_v1.json', 'utf8'));
const ram = JSON.parse(fs.readFileSync(__dirname + '/profitnode_ram_catalog_v1.json', 'utf8'));
const storage = JSON.parse(fs.readFileSync(__dirname + '/profitnode_storage_catalog_v1.json', 'utf8'));
const appFile = process.argv[2] || 'app.js';
const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const fakeEl = () => ({ addEventListener(){}, innerHTML:'', querySelector:()=>null });
const document = { addEventListener(){}, getElementById:()=>fakeEl(), createElement:()=>({}), head:{appendChild(){}} };
const crypto = { randomUUID: (() => { let n=0; return () => 'hardware-test-' + n++; })() };
const sandbox = { document, localStorage, crypto, window:{}, console, canonicalHardware:hardware, canonicalBoards:motherboards, canonicalRam:ram, canonicalStorage:storage };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/' + appFile, 'utf8'), sandbox, { filename:appFile });

const results = vm.runInContext(`(() => {
  HardwareCatalog.cpus = canonicalHardware.cpus;
  HardwareCatalog.gpus = canonicalHardware.gpus;
  HardwareCatalog.boards = canonicalBoards.boards;
  HardwareCatalog.ramFamilies = canonicalRam.families.map(f=>Object.assign({model:f.series,technology:'DDR4'},f));
  HardwareCatalog.ramSupported = canonicalRam.supported;
  HardwareCatalog.storage = canonicalStorage.entries.map(e=>Object.assign({overall:e.overall_score},e));
  HardwareCatalog.status = 'ready';
  const out=[];
  out.push(['canonical CPU count is 221', HardwareCatalog.cpus.length===221]);
  out.push(['canonical GPU count is 123', HardwareCatalog.gpus.length===123]);
  out.push(['canonical motherboard count is 911', HardwareCatalog.boards.length===911]);
  out.push(['canonical DDR4 family catalog is loaded', HardwareCatalog.ramFamilies.length>=90]);
  out.push(['canonical storage catalog has 1,324 entries', HardwareCatalog.storage.length===1324]);
  out.push(['storage type counts are preserved', HardwareCatalog.storage.filter(e=>e.drive_type==='NVMe SSD').length===658&&HardwareCatalog.storage.filter(e=>e.drive_type==='SATA SSD').length===462&&HardwareCatalog.storage.filter(e=>e.drive_type==='HDD').length===204]);
  out.push(['storage catalog searches model and capacity', catalogSearch('STORAGE','970 evo plus 1tb').some(e=>e.series.includes('970 EVO Plus')&&e.capacity_gb===1000)]);
  out.push(['RAM catalog searches by brand and series', catalogSearch('RAM','vengeance lpx').some(r=>r.series==='Vengeance LPX')]);
  const anchor=catalogFind('CPU','AMD Ryzen 7 5800X3D');
  out.push(['5800X3D canonical gaming anchor preserved', anchor&&anchor.gaming===100&&anchor.overall===90]);
  out.push(['canonical tier order preserved', PN_GEAR_TIERS.join('>')==='SCRAPBLADE>SCRAPWRAITH>REVENANT>GHOUL>ALGHOUL']);
  out.push(['catalog suggestions wait for 2 characters', catalogSearch('MOBO','B').length===0]);
  out.push(['catalog suggestions are capped at 12', catalogSearch('MOBO','B5').length<=12]);
  out.push(['Deal Score remains a separate 0-10 system', DealScore.auto({purchasePrice:50,estimatedMarketValue:100,condition:'WORKING',category:'GPU'}).score<=10]);

  function cat(type,label,cost=0){ return {kind:'CATALOG',catalogType:type,label,cost,currency:'RSD'}; }
  function example(cpu,gpu,board){ const r=newRigDraft('FOUNDATION'); r.slots.CPU=cat('CPU',cpu); r.slots.GPU=cat('GPU',gpu); r.slots.MOBO=cat('MOBO',board); r.slots.RAM={kind:'PLANNED',label:'2x8GB DDR4 dual channel',cost:0,currency:'RSD'}; r.slots.PSU={kind:'PLANNED',label:'Corsair 750W',cost:0,currency:'RSD'}; r.slots.STORAGE={kind:'PLANNED',label:'NVMe SSD 1TB',cost:0,currency:'RSD'}; r.slots.COOLER={kind:'PLANNED',label:'Tower cooler',cost:0,currency:'RSD'}; return r; }
  const ex1=rigHardwareProfile(example('AMD Ryzen 5 3600','NVIDIA RTX 2060 6GB','MSI B450 TOMAHAWK MAX'));
  const ex2=rigHardwareProfile(example('AMD Ryzen 5 5600','AMD RX 6700 XT 12GB','Gigabyte B550 AORUS MASTER'));
  const ex3=rigHardwareProfile(example('AMD Ryzen 7 5700X3D','NVIDIA RTX 3080 10GB','ASRock X570 Taichi'));
  const ex4=rigHardwareProfile(example('AMD Ryzen 5 2600','NVIDIA GTX 1070 8GB','MSI B450 TOMAHAWK MAX'));
  const bad=rigHardwareProfile(example('AMD Ryzen 7 5800X3D','AMD RX 580 8GB','MSI B450 TOMAHAWK MAX'));
  out.push(['3600 + RTX 2060 + B450 is REVENANT', ex1.tier==='REVENANT']);
  out.push(['5600 + RX 6700 XT + B550 is GHOUL', ex2.tier==='GHOUL']);
  out.push(['5700X3D + RTX 3080 + X570 is ALGHOUL', ex3.tier==='ALGHOUL']);
  out.push(['2600 + GTX 1070 is REVENANT', ex4.tier==='REVENANT']);
  out.push(['5800X3D + RX 580 is not ALGHOUL', bad.tier!=='ALGHOUL']);
  out.push(['severe CPU/GPU imbalance warning fires', bad.warnings.some(w=>w.includes('Severe CPU/GPU imbalance'))]);
  const editor=renderRigSlotRow('CPU',Object.assign(example('AMD Ryzen 5 3600','NVIDIA RTX 2060 6GB','MSI B450 TOMAHAWK MAX'),{id:null}));
  out.push(['mode menu no longer exposes PN Hardware Catalog', !editor.includes('PN Hardware Catalog')]);
  out.push(['legacy catalog slots display as Planned Part', editor.includes('<option value="PLANNED" selected>Planned Part</option>')]);
  out.push(['catalog selector uses an automatic results panel', editor.includes('data-rig-catalog-item="CPU"')&&!editor.includes('<datalist')]);
  state.rigDraft = example('AMD Ryzen 5 3600','NVIDIA RTX 2060 6GB','MSI B450 TOMAHAWK MAX');
  state.rigDraft.slots.CPU.label = '3600';
  const searching = renderRigEditor();
  out.push(['typing 3600 immediately renders Ryzen 5 3600', searching.includes('data-rig-catalog-choice="CPU"')&&searching.includes('AMD Ryzen 5 3600')]);
  out.push(['search result separates performance and tier badges', searching.includes('pn-result-rating')&&searching.includes('pn-result-tier pn-tier-revenant')]);
  out.push(['part rating and Gear Tier render separately', editor.includes('pn-meta-pill')&&editor.includes('Performance')&&editor.includes('pn-tier-pill')&&editor.includes('Tier')]);
  out.push(['selected part carries its canonical tier color class', editor.includes('pn-tier-pill pn-tier-revenant')]);
  const ram3200=ramRating({moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16});
  const ram3600=ramRating({moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3600,casLatency:16});
  out.push(['DDR4 true latency formula gives 10ns for 3200 CL16', ram3200.latencyNs===10]);
  out.push(['DDR4 overall formula exposes all five component results', ram3200.capacityScore===75&&ram3200.speedScore===65&&ram3200.latencyScore===80&&ram3200.channelScore===100&&ram3200.overall===78]);
  out.push(['DDR4 3600 CL16 follows canonical formula without brand/RGB bonus', ram3600.overall===84&&ram3600.tier==='GHOUL']);
  const ramRig=newRigDraft('RAM TEST');ramRig.slots.RAM={kind:'PLANNED',catalogType:'RAM',label:'Corsair Vengeance LPX',cost:0,originalPrice:0,currency:'RSD',ram:{technology:'DDR4',moduleCount:1,perModuleCapacity:8,totalCapacity:8,speed:2400,casLatency:16}};
  const ramEditor=renderRigSlotRow('RAM',ramRig);
  out.push(['RIG BUILD renders the compact DDR4 configuration fields', ramEditor.includes('data-rig-ram-field="moduleCount"')&&ramEditor.includes('data-rig-ram-field="speed"')&&!ramEditor.includes('data-rig-ram-field="casLatency"')&&!ramEditor.includes('data-rig-ram-field="voltage"')&&!ramEditor.includes('data-rig-ram-field="model"')]);
  const gpuEditor=renderRigSlotRow('GPU',Object.assign(example('AMD Ryzen 5 3600','NVIDIA RTX 2060 6GB','MSI B450 TOMAHAWK MAX'),{id:null}));
  out.push(['GPU detail omits Raster and RT options', !gpuEditor.includes('Raster')&&!gpuEditor.includes('· RT')]);
  out.push(['user-facing hardware labels spell out PROFITNODE', renderRigEditor.toString().includes('PROFITNODE Rig Performance')&&!renderRigEditor.toString().includes('PN Rig Performance')]);
  out.push(['single-channel and insufficient-capacity RAM warnings fire', rigWarnings(ramRig).some(w=>w.includes('Single-channel'))&&rigWarnings(ramRig).some(w=>w.includes('below 16 GB'))]);
  const storageRig=example('AMD Ryzen 5 3600','NVIDIA RTX 2060 6GB','MSI B450 TOMAHAWK MAX');
  const hdd=HardwareCatalog.storage.find(e=>e.drive_type==='HDD'&&e.capacity_gb===2000),gen4=HardwareCatalog.storage.find(e=>e.drive_type==='NVMe SSD'&&/PCIe 4/.test(e.interface));
  storageRig.slots.STORAGE=cat('STORAGE',hdd.brand+' '+hdd.model);
  storageRig.slots.STORAGE2=cat('STORAGE2',gen4.brand+' '+gen4.model);
  const storageWarnings=rigWarnings(storageRig);
  out.push(['primary and secondary storage slots are distinct', RIG_SLOT_LABELS.STORAGE==='Primary Storage'&&RIG_SLOT_LABELS.STORAGE2==='Secondary Storage']);
  out.push(['HDD-only primary warning fires', storageWarnings.some(w=>w.includes('HDD-ONLY PRIMARY'))]);
  out.push(['newer NVMe on older platform is compatible but speed limited', storageWarnings.some(w=>w.includes('COMPATIBLE — PCIe SPEED LIMITED'))]);
  const storageEditor=renderRigSlotRow('STORAGE2',storageRig);
  out.push(['secondary storage shows role-specific suitability', storageEditor.includes('Secondary ')&&storageEditor.includes('Bulk ')&&storageEditor.includes('Archive ')]);
  return out;
})()`, sandbox);

let failures=0;
for(const [name,ok] of results){ console.log((ok?'PASS':'FAIL')+' - '+name); if(!ok) failures++; }
console.log('\n'+(failures===0?'ALL PASSED':failures+' FAILED'));
process.exit(failures===0?0:1);
