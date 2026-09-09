"use strict";

const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const DIR = __dirname;
const checks = [];
const errors = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (name, ok, detail = "") => checks.push([name, !!ok, detail]);

function browserPath() {
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const rel = [
    ["Google", "Chrome", "Application", "chrome.exe"],
    ["Microsoft", "Edge", "Application", "msedge.exe"]
  ];
  for (const root of roots) for (const parts of rel) {
    const candidate = path.join(root, ...parts);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function staticServer() {
  const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(DIR, relative);
    if (!file.startsWith(path.resolve(DIR) + path.sep) && file !== path.join(path.resolve(DIR), "index.html")) {
      res.writeHead(403).end("Forbidden"); return;
    }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end("Not found"); return; }
      res.writeHead(200, {"Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control":"no-store"});
      res.end(body);
    });
  });
}

class Cdp {
  constructor(url) { this.url=url; this.id=0; this.pending=new Map(); this.events=new Map(); }
  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => { this.ws.onopen=resolve; this.ws.onerror=reject; });
    this.ws.onmessage = event => {
      const msg=JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const {resolve,reject}=this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result || {});
      } else if (msg.method) (this.events.get(msg.method)||[]).forEach(fn=>fn(msg.params||{}));
    };
  }
  on(name, fn) { const list=this.events.get(name)||[]; list.push(fn); this.events.set(name,list); }
  send(method, params={}) {
    const id=++this.id;
    return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});
  }
  close() { if (this.ws) this.ws.close(); }
}

async function waitForFile(file, timeout=12000) {
  const started=Date.now();
  while (Date.now()-started<timeout) { if (fs.existsSync(file)) return; await delay(100); }
  throw new Error("Browser debugging endpoint did not start");
}

async function waitForJson(url, timeout=12000) {
  const started=Date.now(); let last;
  while (Date.now()-started<timeout) {
    try { const response=await fetch(url); if(response.ok) return response.json(); }
    catch (err) { last=err; }
    await delay(100);
  }
  throw last || new Error("Browser debugging endpoint was not reachable");
}

async function main() {
  const executable=browserPath();
  if (!executable) throw new Error("Chrome or Edge was not found");
  const server=staticServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const port=server.address().port, url=`http://127.0.0.1:${port}/`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),"profitnode-browser-"));
  const browser=spawn(executable,["--headless=new","--no-sandbox","--disable-gpu","--disable-gpu-sandbox","--disable-software-rasterizer","--no-first-run","--no-default-browser-check","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{stdio:"ignore",windowsHide:true});
  let cdp;
  try {
    const active=path.join(profile,"DevToolsActivePort"); await waitForFile(active);
    const debugPort=fs.readFileSync(active,"utf8").split(/\r?\n/)[0];
    const targets=await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target=targets.find(t=>t.type==="page"); if (!target) throw new Error("No browser page target");
    cdp=new Cdp(target.webSocketDebuggerUrl); await cdp.open();
    cdp.on("Runtime.exceptionThrown",e=>errors.push("EXCEPTION: "+(e.exceptionDetails&&e.exceptionDetails.text||"unknown")));
    cdp.on("Runtime.consoleAPICalled",e=>{if(["error","warning"].includes(e.type))errors.push(e.type.toUpperCase()+": "+e.args.map(a=>a.value||a.description||"").join(" "));});
    cdp.on("Log.entryAdded",e=>{if(e.entry&&["error","warning"].includes(e.entry.level)){const msg=e.entry.level.toUpperCase()+": "+e.entry.text+" "+(e.entry.url||"");if(!(msg.includes("ERR_NETWORK_ACCESS_DENIED")&&msg.includes("fonts.googleapis.com")))errors.push(msg.trim());}});
    await Promise.all([cdp.send("Page.enable"),cdp.send("Runtime.enable"),cdp.send("Log.enable")]);
    let loaded; const loadedPromise=()=>new Promise(resolve=>{loaded=resolve;cdp.on("Page.loadEventFired",resolve);});
    let wait=loadedPromise(); await cdp.send("Page.navigate",{url}); await wait; await delay(1600);
    const evaluate=async expression=>(await cdp.send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true})).result.value;
    const shell=await evaluate(`({brand:document.title==='PROFITNODE'&&!!document.querySelector('[aria-label="PROFITNODE"]'),routes:new Set(Array.from(document.querySelectorAll('[data-route]'),e=>e.dataset.route)).size,legacy:!!document.querySelector('.brand-shop:not([data-pn-sidebar-cleanup="hidden"])'),schema:Store.load().meta.schemaVersion})`);
    check("app loads its complete navigation in a real browser",shell.brand&&shell.routes===14,JSON.stringify(shell));
    check("sidebar cleanup runs in the real DOM",!shell.legacy);
    check("browser storage initializes on the current schema",shell.schema===2);
    const navVisual=await evaluate(`(()=>{const rig=document.querySelector('[data-route="rigbuild"]'),roulette=document.querySelector('[data-route="roulette"]'),chrome=getComputedStyle(rig,'::before'),lightning=getComputedStyle(rig,'::after');return {rigLabel:rig.textContent.trim(),chromeAnimation:chrome.animationName,chromeFill:chrome.webkitTextFillColor,chromeBackground:chrome.backgroundImage,chromeFilter:chrome.filter,lightningColor:lightning.backgroundColor,lightningAnimation:lightning.animationName,lightningShape:lightning.clipPath,rouletteAfter:getComputedStyle(roulette,'::after').content}})()`);
    check("RIG ASSEMBLY uses one uniform gold with no multicolor gradient",navVisual.rigLabel==='RIG ASSEMBLY'&&navVisual.chromeAnimation.includes('pnRigAssemblyChrome')&&navVisual.chromeFill==='rgb(231, 188, 78)'&&navVisual.chromeBackground==='none'&&navVisual.chromeFilter!=='none',JSON.stringify(navVisual));
    check("RIG ASSEMBLY lightning uses the same single gold",navVisual.lightningColor==='rgb(231, 188, 78)'&&navVisual.lightningAnimation.includes('pnRigAssemblyLightning')&&navVisual.lightningShape!=='none',JSON.stringify(navVisual));
    check("Roulette sidebar indicator dot is removed",navVisual.rouletteAfter==='none'||navVisual.rouletteAfter==='normal',JSON.stringify(navVisual));

    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const desktop=await evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,content:getComputedStyle(document.querySelector('.content')).overflowY})`);
    check("1920x1080 shell has no document-level horizontal clipping",!desktop.overflow);
    check("desktop keeps the intended internal scroll layer",desktop.content==="auto"||desktop.content==="scroll");
    const command=await evaluate(`(()=>{const hero=document.querySelector('.pn-command-hero-finance'),matrix=document.querySelector('.pn-financial-matrix'),priority=document.querySelector('.pn-command-priority');return {priority:!!priority,telemetry:document.querySelectorAll('.pn-command-telemetry>div').length,kpis:document.querySelectorAll('.pn-financial-matrix .pn-terminal-kpi').length,major:document.querySelectorAll('.pn-terminal-kpi.is-major').length,cols:getComputedStyle(matrix).gridTemplateColumns.split(' ').length,heroHeight:Math.round(hero.getBoundingClientRect().height),panelTiers:['primary','operational','utility'].every(t=>!!document.querySelector('.pn-command-panel-'+t))}})()`);
    check("COMMAND renders one operational priority and five telemetry channels",command.priority&&command.telemetry===5,JSON.stringify(command));
    check("COMMAND uses a compact six-metric 3x2 financial matrix at 1920px",command.kpis===6&&command.major===2&&command.cols===3&&command.heroHeight<250,JSON.stringify(command));
    check("COMMAND exposes three levels of panel hierarchy",command.panelTiers);
    const freshness=await evaluate(`(()=>{Store.setMeta({displayCurrency:Store.load().meta.displayCurrency});render();const el=document.querySelector('[data-pn-command-updated]');return {present:!!el,fresh:el&&el.classList.contains('is-fresh'),label:el&&el.textContent,stamp:localStorage.getItem('profitnode_last_updated_v1')}})()`);
    check("COMMAND reports and pulses on a saved data change",freshness.present&&freshness.fresh&&freshness.label.includes('LAST UPDATED')&&/^\d{4}-\d{2}-\d{2}T/.test(freshness.stamp||''),JSON.stringify(freshness));
    const commandShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(os.tmpdir(),"profitnode-command-1920.png"),Buffer.from(commandShot.data,"base64"));
    check("COMMAND renders a valid 1920x1080 frame",!!commandShot.data&&commandShot.data.length>10000);
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1100,height:900,deviceScaleFactor:1,mobile:false});
    const commandResponsive=await evaluate(`(()=>{const hero=document.querySelector('.pn-command-hero-finance');return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,heroCols:getComputedStyle(hero).gridTemplateColumns.split(' ').length,priorityWidth:document.querySelector('.pn-command-priority').getBoundingClientRect().width}})()`);
    check("COMMAND stacks safely at 1100px without horizontal clipping",!commandResponsive.overflow&&commandResponsive.heroCols===1&&commandResponsive.priorityWidth>500,JSON.stringify(commandResponsive));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

    await evaluate(`document.querySelector('[data-route="inventory"]').click();document.querySelector('[data-open-form="inventory"]').click()`);
    let modal=await evaluate(`(()=>{const health=document.querySelector('.pn-storage-only');return {open:!!document.querySelector('form[data-entity-form="inventory"]'),healthHidden:health.hidden,healthDisplay:getComputedStyle(health).display,inspector:!!document.querySelector('[data-pn-tier-inspector]')}})()`);
    check("new inventory opens with the tier inspector",modal.open&&modal.inspector);
    check("drive health is actually hidden for non-storage parts",modal.healthHidden&&modal.healthDisplay==='none',JSON.stringify(modal));
    const motherboardPick=await evaluate(`(()=>{const input=document.querySelector('[data-part-search]');input.value='ASRock B450M Pro4 R2.0';input.dispatchEvent(new Event('input',{bubbles:true}));const pick=Array.from(document.querySelectorAll('[data-part-search-pick]')).find(x=>x.textContent.includes('B450M Pro4 R2.0'));if(pick)pick.click();const form=document.querySelector('form[data-entity-form="inventory"]'),health=form.querySelector('.pn-storage-only');return {picked:!!pick,category:form.elements.category.value,hidden:health.hidden,display:getComputedStyle(health).display}})()`);
    check("motherboard auto-detection keeps Drive Health out of the rendered form",motherboardPick.picked&&motherboardPick.category==='MOTHERBOARD'&&motherboardPick.hidden&&motherboardPick.display==='none',JSON.stringify(motherboardPick));
    await evaluate(`(()=>{const f=document.querySelector('form[data-entity-form="inventory"]');const set=(n,v)=>{const e=f.elements[n];e.value=v;e.dispatchEvent(new Event(n==='category'?'change':'input',{bubbles:true}))};set('category','STORAGE');set('manufacturer','Samsung');set('model','970 EVO Plus 1TB');set('purchasePrice','5000');set('estimatedMarketValue','8000');set('driveHealthPercent','87');return true})()`);
    modal=await evaluate(`(()=>{const health=document.querySelector('.pn-storage-only');return {healthHidden:health.hidden,healthDisplay:getComputedStyle(health).display,read:document.querySelector('.pn-part-tier-read').textContent}})()`);
    check("storage selection reveals the bounded health field",!modal.healthHidden&&modal.healthDisplay!=='none',JSON.stringify(modal));
    check("tier explanation updates live while editing",/T[1-5]/.test(modal.read)&&/match|evidence|heuristic/i.test(modal.read));
    await evaluate(`document.querySelector('form[data-entity-form="inventory"]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
    const saved=await evaluate(`(()=>{const x=Store.all('inventory').find(i=>i.model==='970 EVO Plus 1TB');return {id:x&&x.id,health:x&&x.driveHealthPercent,row:document.body.textContent.includes('970 EVO Plus 1TB'),tier:!!document.querySelector('[data-pn-part-tier]')}})()`);
    check("inventory save persists storage health and renders the item",saved.id&&saved.health===87&&saved.row);
    check("PARTS VAULT renders tier color on the part-name span",saved.tier);
    await evaluate(`document.querySelector('[data-open-entity="inventory"][data-id="${saved.id}"]').click()`);
    const reopened=await evaluate(`({health:document.querySelector('[name="driveHealthPercent"]').value,override:!!document.querySelector('[name="catalogOverride"]'),visible:!document.querySelector('.pn-storage-only').hidden})`);
    check("saved storage health survives reopen/edit",reopened.health==="87"&&reopened.visible);
    check("manual catalog correction is available only as advanced detail",reopened.override);
    await evaluate(`document.querySelector('[data-close-modal]').click()`);
    const backup=await evaluate(`(()=>{const raw=JSON.stringify(Store.load()),report=inspectBackupFile(JSON.parse(raw));Store.replaceAll(JSON.parse(raw));const x=Store.all('inventory').find(i=>i.id==='${saved.id}');return {recognized:!!report&&report.inventory>=1,health:x&&x.driveHealthPercent,schema:Store.load().meta.schemaVersion}})()`);
    check("backup/restore round-trip preserves schema and drive health",backup.recognized&&backup.health===87&&backup.schema===2,JSON.stringify(backup));

    const pending=await evaluate(`(()=>{const part=Actions.addInventory({category:'GPU',manufacturer:'EVGA',model:'Browser Pending GPU',purchaseDate:'2026-09-01',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''}),before=dashboardStats('RSD'),sale=Actions.addSale({saleState:'PENDING',inventoryItemId:part.id,itemName:'EVGA Browser Pending GPU',saleDate:'2026-09-09',buyerPrice:14000,originalInvestment:10000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'GPU',notes:''});state.route='sales';render();const after=dashboardStats('RSD');return {saleId:sale.id,status:Store.get('inventory',part.id).status,unchanged:before.totalRevenue===after.totalRevenue&&before.realizedProfit===after.realizedProfit,pending:!!document.querySelector('.pn-pending-sales-panel [data-id="'+sale.id+'"]'),completed:!!document.querySelector('.pn-completed-sales-panel'),action:!!document.querySelector('[data-complete-pending-sale="'+sale.id+'"]')}})()`);
    check("LEDGER renders a separate pending-sales section without realizing its money",pending.status==='LISTED'&&pending.unchanged&&pending.pending&&pending.completed&&pending.action,JSON.stringify(pending));
    await evaluate(`document.querySelector('[data-complete-pending-sale="${pending.saleId}"]').click()`);
    const completionForm=await evaluate(`({open:!!document.querySelector('form[data-entity-form="sale"]'),state:document.querySelector('[name="saleState"]')&&document.querySelector('[name="saleState"]').value})`);
    check("pending sale completion opens a review form preselected COMPLETED",completionForm.open&&completionForm.state==='COMPLETED',JSON.stringify(completionForm));
    await evaluate(`document.querySelector('[data-close-modal]').click()`);

    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1100,height:800,deviceScaleFactor:1,mobile:false});
    await evaluate(`state.route='rigbuild';state.rigDraft=newRigDraft('BROWSER TEST');state.rigDraft.slots.CPU={kind:'PLANNED',catalogType:'CPU',label:'',cost:0,originalPrice:0,currency:'RSD'};state.rigDraft.slots.MOBO={kind:'PLANNED',catalogType:'MOBO',label:'ASRock B450M-HDV',cost:0,originalPrice:0,currency:'RSD'};state.rigDraft.slots.CASE={kind:'PLANNED',catalogType:'CASE',label:'Fractal Design Meshify 2',cost:0,originalPrice:0,currency:'RSD'};render()`);
    const responsive=await evaluate(`(()=>{const row=document.querySelector('.rig-slot-row'),style=getComputedStyle(row);return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cols:style.gridTemplateColumns.split(' ').length}})()`);
    check("RIG BENCH stacks safely at 1100px without page clipping",!responsive.overflow&&responsive.cols>=2);
    const moboCanonical=await evaluate(`(()=>{const input=document.querySelector('[data-rig-catalog-item="MOBO"]'),row=input&&input.closest('.rig-slot-row'),status=document.querySelector('[data-bc-finding="MOBO_FORM_FACTOR"]');return {meta:row&&row.textContent,status:status&&status.dataset.bcLevel}})()`);
    check("RIG BENCH displays and checks canonical motherboard form factor",moboCanonical.meta.includes('FORM mATX · SOCKET AM4 · CHIPSET B450')&&moboCanonical.status==='PASS',JSON.stringify(moboCanonical));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const evidence=await evaluate(`(()=>{const part=(type,label)=>({kind:'PLANNED',catalogType:type,label,cost:0,originalPrice:0,currency:'RSD'}),r=newRigDraft('EVIDENCE TEST');r.slots.CPU=part('CPU','AMD Ryzen 5 3600');r.slots.GPU=part('GPU','NVIDIA GTX 1070 8GB');r.slots.MOBO=part('MOBO','ASRock B450M Pro4 R2.0');r.slots.RAM=Object.assign(part('RAM','Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz'),{ram:{moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}});r.slots.PSU=part('PSU','Montech CENTURY 550W');r.slots.CASE=Object.assign(part('CASE','Generic ATX Airflow Case'),{genericId:'generic-atx-airflow'});r.slots.COOLER=part('COOLER','AMD Wraith Stealth');r.slots.STORAGE=part('STORAGE','Samsung 850 EVO 120GB');state.rigDraft=r;render();const psu=document.querySelector('[data-bc-tile="psu"]'),fit=document.querySelector('[data-bc-tile="fit"]'),watt=document.querySelector('[data-bc-finding="PSU_WATTAGE"]'),conn=document.querySelector('[data-bc-finding="PSU_CONNECTORS"]'),mobo=document.querySelector('[data-bc-finding="MOBO_FORM_FACTOR"]'),gpu=document.querySelector('[data-bc-finding="GPU_CLEARANCE"]');return {verdict:document.querySelector('.pn-build-check').dataset.buildCheckVerdict,verification:document.querySelector('.pn-build-check').dataset.buildCheckVerification,psuText:psu.textContent,psuPass:psu.dataset.bcPass,psuUnknown:psu.dataset.bcUnverified,fitText:fit.textContent,fitPass:fit.dataset.bcPass,fitUnknown:fit.dataset.bcUnverified,watt:watt&&watt.dataset.bcLevel,conn:conn&&conn.dataset.bcLevel,mobo:mobo&&mobo.dataset.bcLevel,gpu:gpu&&gpu.dataset.bcLevel,gpuText:gpu&&gpu.textContent}})()`);
    check("PSU tile preserves six verified checks beside one connector unknown",evidence.psuPass==='6'&&evidence.psuUnknown==='1'&&evidence.psuText.includes('6 PASS / 1 UNVERIFIED')&&evidence.watt==='PASS'&&evidence.conn==='UNVERIFIED',JSON.stringify(evidence));
    check("FIT tile independently verifies motherboard, cooler and generic GPU envelope",evidence.fitPass==='3'&&evidence.fitUnknown==='0'&&evidence.mobo==='PASS'&&evidence.gpu==='PASS'&&evidence.gpuText.includes('generic envelope'),JSON.stringify(evidence));
    check("partial evidence keeps compatibility PASS while verification remains partial",evidence.verdict==='PASS'&&evidence.verification==='PARTIAL',JSON.stringify(evidence));
    await evaluate(`(()=>{const x=document.querySelector('[data-rig-catalog-item="CPU"]');x.value='3600';x.dispatchEvent(new Event('input',{bubbles:true}));return true})()`); await delay(250);
    const search=await evaluate(`({matches:document.querySelectorAll('[data-rig-catalog-choice="CPU"]').length,text:document.body.textContent})`);
    check("typing opens matching hardware results without arrow click",search.matches>0&&search.text.includes('Ryzen 5 3600'));
    await evaluate(`(()=>{const p=document.querySelector('[data-rig-slot-field="CPU.cost"]');p.focus();return {start:p.selectionStart,end:p.selectionEnd,value:p.value}})()`);
    await cdp.send("Input.insertText",{text:"3000"});
    const price=await evaluate(`document.querySelector('[data-rig-slot-field="CPU.cost"]').value`);
    check("zero-valued price input accepts normal replacement typing",price==="3000");
    const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    check("1920/1100 browser flow produces a valid rendered frame",!!shot.data&&shot.data.length>10000);
    await evaluate(`document.querySelector('[data-route="roadto"]').click();RoadTo.create({name:'Browser RTX 5090',category:'GPU',target:200000,refType:'catalog'});RoadTo.addFunds(Store.all('roadTo')[0].id,75000);render()`);
    const quest=await evaluate(`(()=>{const h1=document.querySelector('h1')&&document.querySelector('h1').textContent;return {h1:h1,form:!!document.querySelector('[data-roadto-create]'),feat:!!document.querySelector('.pn-roadto-feat')}})()`);
    check("ROAD TO route opens a live quest page with its controls",quest.h1==='ROAD TO'&&quest.form&&!quest.feat,JSON.stringify(quest));
    const questDetail=await evaluate(`(()=>{RoadToUI.focusId=Store.all('roadTo')[0].id;render();return {add:!!document.querySelector('[data-roadto-add]'),remove:!!document.querySelector('[data-roadto-remove]'),target:!!document.querySelector('[data-roadto-set-target]'),history:document.body.textContent.includes('+75.000 RSD'),open:document.querySelector('.pn-roadto-detail .panel-head h2')&&document.querySelector('.pn-roadto-detail .panel-head h2').textContent}})()`);
    check("ROAD TO detail shows fund controls and persisted history",questDetail.add&&questDetail.remove&&questDetail.target&&questDetail.history&&questDetail.open.includes('Browser RTX 5090'),JSON.stringify(questDetail));
    await evaluate(`document.querySelector('[data-route="myrig"]').click();MyRig.ensure();render()`);
    const rig=await evaluate(`(()=>{const h1=document.querySelector('h1')&&document.querySelector('h1').textContent;return {h1:h1,hero:!!document.querySelector('.pn-myrig-hero'),loadout:document.body.textContent.includes('COMPONENT LOADOUT'),compat:!!document.querySelector('[data-myrig-compat]')}})()`);
    check("MY RIG route opens the LEVIATHAN personal rig page",rig.h1==='MY RIG'&&rig.hero&&rig.loadout&&rig.compat,JSON.stringify(rig));
    await evaluate(`MyRig.setSlot('GPU',{label:'NVIDIA RTX 3080 10GB',specs:'10 GB GDDR6X',purchasePrice:94000,purchaseDate:'2026-01-15',notes:'',vaultId:null});MyRig.setResale(132000);render()`);
    const rigVal=await evaluate(`(()=>{const v=document.querySelector('[data-myrig-value]');return !!v&&v.textContent.includes('94.000 RSD')&&v.textContent.includes('EST. RESALE')})()`);
    check("MY RIG slot and value update persist in the live ledger",rigVal);
    await delay(300);
    check("browser run has no console errors or warnings",errors.length===0,errors.join(" | "));
  } finally {
    if (cdp) cdp.close();
    browser.kill();
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await Promise.race([new Promise(resolve=>server.close(resolve)),delay(1000)]);
    try { fs.rmSync(profile,{recursive:true,force:true}); } catch (_) {}
  }
  let failed=0;
  for (const [name,ok,detail] of checks) { console.log(`${ok?"PASS":"FAIL"} - ${name}${!ok&&detail?" ("+detail+")":""}`); if(!ok) failed++; }
  if (failed) { console.error(`\n${failed} browser assertion(s) failed.`); process.exitCode=1; }
  else console.log(`\nALL PASSED (${checks.length} browser assertions)`);
}

main().catch(err=>{console.error("BROWSER TEST FAILED - "+(err&&err.stack||err));process.exitCode=1;});
