const fs = require('fs');
const vm = require('vm');

const hardware = JSON.parse(fs.readFileSync(__dirname + '/profitnode_hardware_ratings_v1.json', 'utf8'));
const motherboards = JSON.parse(fs.readFileSync(__dirname + '/profitnode_motherboard_catalog_v1.json', 'utf8'));
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
const sandbox = { document, localStorage, crypto, window:{}, console, canonicalHardware:hardware, canonicalBoards:motherboards };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/' + appFile, 'utf8'), sandbox, { filename:appFile });

const results = vm.runInContext(`(() => {
  HardwareCatalog.cpus = canonicalHardware.cpus;
  HardwareCatalog.gpus = canonicalHardware.gpus;
  HardwareCatalog.boards = canonicalBoards.boards;
  HardwareCatalog.status = 'ready';
  const out=[];
  out.push(['canonical CPU count is 221', HardwareCatalog.cpus.length===221]);
  out.push(['canonical GPU count is 123', HardwareCatalog.gpus.length===123]);
  out.push(['canonical motherboard count is 911', HardwareCatalog.boards.length===911]);
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
  out.push(['catalog selector is searchable through datalist', editor.includes('list="pn-catalog-CPU"')&&editor.includes('data-rig-catalog-item="CPU"')]);
  out.push(['part rating and Gear Tier render separately', editor.includes('PN Performance Rating')&&editor.includes('Gear Tier')]);
  return out;
})()`, sandbox);

let failures=0;
for(const [name,ok] of results){ console.log((ok?'PASS':'FAIL')+' - '+name); if(!ok) failures++; }
console.log('\n'+(failures===0?'ALL PASSED':failures+' FAILED'));
process.exit(failures===0?0:1);
