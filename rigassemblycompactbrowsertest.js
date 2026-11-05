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
  const explicit = process.env.CHROME_PATH || process.env.CHROMIUM_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;
  const unix = ["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"];
  for (const candidate of unix) if (fs.existsSync(candidate)) return candidate;
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

function staticServer(){
  const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(DIR, relative);
    if (!file.startsWith(path.resolve(DIR) + path.sep) && file !== path.join(path.resolve(DIR), "index.html")) return res.writeHead(403).end("Forbidden");
    fs.readFile(file, (err, body) => {
      if (err) return res.writeHead(404).end("Not found");
      res.writeHead(200, {"Content-Type":mime[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control":"no-store"});
      res.end(body);
    });
  });
}

class Cdp {
  constructor(url){ this.url = url; this.id = 0; this.pending = new Map(); this.events = new Map(); }
  async open(){
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result || {});
      } else if (msg.method) (this.events.get(msg.method) || []).forEach(fn => fn(msg.params || {}));
    };
  }
  on(name, fn){ const list = this.events.get(name) || []; list.push(fn); this.events.set(name, list); }
  send(method, params = {}){
    const id = ++this.id;
    return new Promise((resolve, reject) => { this.pending.set(id, {resolve, reject}); this.ws.send(JSON.stringify({id, method, params})); });
  }
  close(){ if (this.ws) this.ws.close(); }
}

async function waitForFile(file, timeout = 12000){
  const started = Date.now();
  while (Date.now() - started < timeout) { if (fs.existsSync(file)) return; await delay(100); }
  throw new Error("Browser debugging endpoint did not start");
}

async function waitForJson(url, timeout = 12000){
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch (_err) {}
    await delay(100);
  }
  throw new Error("Browser debugging endpoint was not reachable");
}

async function main(){
  const executable = browserPath();
  if (!executable) throw new Error("Chrome or Edge was not found");
  const server = staticServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "profitnode-rig-compact-"));
  const browser = spawn(executable, ["--headless=new","--no-sandbox","--disable-gpu","--disable-gpu-sandbox","--disable-software-rasterizer","--no-first-run","--no-default-browser-check","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"], {stdio:"ignore", windowsHide:true});
  let cdp;
  try {
    const active = path.join(profile, "DevToolsActivePort");
    await waitForFile(active);
    const debugPort = fs.readFileSync(active, "utf8").split(/\r?\n/)[0];
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find(item => item.type === "page");
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    cdp.on("Runtime.exceptionThrown", event => errors.push("EXCEPTION: " + ((event.exceptionDetails && event.exceptionDetails.text) || "unknown")));
    cdp.on("Runtime.consoleAPICalled", event => { if (["error","warning"].includes(event.type)) errors.push(event.type.toUpperCase() + ": " + event.args.map(arg => arg.value || arg.description || "").join(" ")); });
    cdp.on("Log.entryAdded", event => { if (event.entry && ["error","warning"].includes(event.entry.level)) { const text = event.entry.text || ""; if (!text.includes("fonts.googleapis.com")) errors.push(event.entry.level.toUpperCase() + ": " + text); } });
    await Promise.all([cdp.send("Page.enable"), cdp.send("Runtime.enable"), cdp.send("Log.enable")]);
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const loaded = new Promise(resolve => cdp.on("Page.loadEventFired", resolve));
    await cdp.send("Page.navigate", {url:`http://127.0.0.1:${port}/`});
    await loaded;
    await delay(1600);
    const evaluate = async expression => (await cdp.send("Runtime.evaluate", {expression, awaitPromise:true, returnByValue:true})).result.value;
    await evaluate(`loadHardwareCatalog().then(()=>true)`);
    const initial = await evaluate(`(()=>{state.route='rigbuild';state.rigDraft=newRigDraft('COMPACT BROWSER TEST');state.rigDraft.budget=50000;state.rigDraft.slots.CPU={kind:'PLANNED',label:'AMD Ryzen 5 5600',cost:10000,originalPrice:12000,currency:'RSD'};state.rigDraft.slots.GPU={kind:'PLANNED',label:'NVIDIA RTX 3060 12GB',cost:25000,originalPrice:30000,currency:'RSD'};render();const content=document.querySelector('.content'),folds=Array.from(document.querySelectorAll('[data-rig-fold]')),results=document.querySelector('.pn-rig-results-primary');return{budget:!!document.querySelector('[data-rig-budget-rail]'),folds:folds.map(x=>({key:x.dataset.rigFold,open:x.open})),columns:getComputedStyle(results).gridTemplateColumns.split(' ').length,docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,contentOverflow:content.scrollWidth>content.clientWidth,scrollHeight:content.scrollHeight,clientHeight:content.clientHeight,detailsVisible:!!document.querySelector('[data-rig-budget-input]')}})()`);
    check("compact budget rail renders in RIG ASSEMBLY", initial.budget && initial.detailsVisible, JSON.stringify(initial));
    check("rating and project details default collapsed", initial.folds.some(x=>x.key === "rating" && !x.open) && initial.folds.some(x=>x.key === "details" && !x.open), JSON.stringify(initial.folds));
    check("Build Check follows severity-controlled default", initial.folds.some(x=>x.key === "check"), JSON.stringify(initial.folds));
    check("1920x1080 stays free of horizontal overflow", !initial.docOverflow && !initial.contentOverflow, JSON.stringify(initial));
    check("financial summary compacts to one eight-tile row", initial.columns === 8, JSON.stringify(initial));
    check("default workflow fits close to one desktop viewport", initial.scrollHeight <= 1300, JSON.stringify(initial));
    await evaluate(`(()=>{const gate=document.getElementById('pn-cloud-gate');if(gate)gate.remove();return true})()`);
    const shot = await cdp.send("Page.captureScreenshot", {format:"png", captureBeyondViewport:false});
    fs.writeFileSync(process.env.PN_RIG_SCREENSHOT || path.join(os.tmpdir(), "profitnode-rig-compact-1920.png"), Buffer.from(shot.data, "base64"));
    check("compact editor renders a valid 1920x1080 frame", !!shot.data && shot.data.length > 10000);

    await evaluate(`(()=>{window.__pnKeepDraft=JSON.stringify(state.rigDraft);const part=(t,l,c,o)=>({kind:'PLANNED',catalogType:t,label:l,cost:c,originalPrice:o,currency:'RSD'}),r=newRigDraft('BLOODWORKS CONSOLE TEST');r.budget=90000;
      r.slots.CPU=part('CPU','AMD Ryzen 5 5600',10500,14000);r.slots.GPU=part('GPU','NVIDIA RTX 3060 12GB',26000,32000);r.slots.MOBO=part('MOBO','ASRock B450M Pro4 R2.0',7200,9000);
      r.slots.RAM=Object.assign(part('RAM','Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz',4200,5500),{ram:{technology:'DDR4',dimmType:'UDIMM',moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}});
      r.slots.PSU=part('PSU','Montech CENTURY 550W',6000,7500);r.slots.CASE=part('CASE','Generic ATX Airflow Case',3500,4500);r.slots.COOLER=part('COOLER','Thermalright Assassin X 120 Refined SE',2100,2600);r.slots.STORAGE=part('STORAGE','Samsung 970 EVO Plus 1TB',5400,7000);
      state.rigDraft=r;state.rigCompactPanels={};render();saveRigDraft();render();const g=document.getElementById('pn-cloud-gate');if(g)g.remove();document.querySelector('.content').scrollTop=0;return true})()`);
    await delay(150);
    const consoleUi = await evaluate(`(()=>{const rows=Array.from(document.querySelectorAll('.rig-slot-row')),label=r=>r.querySelector('.rig-slot-label').textContent.trim().toUpperCase(),box=e=>{const b=e.getBoundingClientRect();return{l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width),h:Math.round(b.height)}};
      const colors={};rows.forEach(r=>colors[label(r)]=getComputedStyle(r.querySelector('.rig-slot-label')).color);
      const spacing=e=>{if(!e)return null;const s=getComputedStyle(e),f=parseFloat(s.fontSize),ws=parseFloat(s.wordSpacing)||0,ls=parseFloat(s.letterSpacing)||0;return{text:e.textContent.trim().slice(0,30),ratioWord:+(ws/f).toFixed(2),ratioLetter:+(ls/f).toFixed(2)}};
      const pseudo=(e,p)=>{const s=getComputedStyle(e,p),f=parseFloat(s.fontSize);return{text:s.content,ratioWord:+((parseFloat(s.wordSpacing)||0)/f).toFixed(2),ratioLetter:+((parseFloat(s.letterSpacing)||0)/f).toFixed(2)}};
      const kpi=k=>document.querySelector('[data-bw-kpi="'+k+'"]');
      const labels=[pseudo(document.querySelector('.pn-rig-cmd-top h1'),'::before'),spacing(document.querySelector('.pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type>.panel-head h2')),spacing(rows.map(r=>r.querySelector('.rig-slot-label')).find(x=>x.textContent.trim().toUpperCase()==='PRIMARY STORAGE'))]
        .concat(Array.from(document.querySelectorAll('.pn-rig-fold>summary>b')).map(spacing)).concat([spacing(kpi('expected-sale-price').querySelector('.kpi-label')),spacing(kpi('target-margin').querySelector('.kpi-label'))]).concat(Array.from(document.querySelectorAll('.rig-slot-columns>span')).map(spacing));
      const cols=rows.map(r=>({paid:box(r.querySelector('.rig-slot-price:not(.is-secondary) input')),orig:box(r.querySelector('.rig-slot-price.is-secondary input')),act:box(r.querySelector('.rig-slot-actions')),src:box(r.querySelector('.rig-slot-control>select')),part:box(r.querySelector('.rig-slot-detail'))}));
      const same=k=>cols.every(c=>Math.abs(c[k].l-cols[0][k].l)<=1&&Math.abs(c[k].r-cols[0][k].r)<=1);
      const single=rows.filter(r=>['CPU','GPU','MOTHERBOARD','PSU','PRIMARY STORAGE'].includes(label(r))).map(r=>Math.round(r.getBoundingClientRect().height));
      const profit=kpi('expected-profit').querySelector('.kpi-value');
      return{colors,unique:new Set(Object.values(colors)).size,labels,aligned:{paid:same('paid'),orig:same('orig'),act:same('act'),src:same('src'),part:same('part')},partWidest:cols.every(c=>c.part.w>c.src.w*2&&c.part.w>c.paid.w*3),header:Array.from(document.querySelectorAll('.rig-slot-columns>span')).map(x=>x.textContent).join('|'),headerVisible:getComputedStyle(document.querySelector('.rig-slot-columns')).display==='grid',single,
        unsetProfitHidden:getComputedStyle(profit.closest('.kpi')).display==='none',salePrompt:(document.querySelector('[data-bw-focus-sale]')||{}).textContent||'',saleState:document.querySelector('.pn-rig-results-primary').dataset.bwSale,checkSummary:document.querySelector('[data-rig-fold=check]>summary').textContent}})()`);
    const expectColors = {"CPU":"rgb(57, 198, 244)","GPU":"rgb(178, 92, 255)","RAM":"rgb(47, 224, 168)","MOTHERBOARD":"rgb(242, 201, 76)","PSU":"rgb(255, 138, 61)","CASE":"rgb(185, 195, 208)","COOLER":"rgb(255, 95, 176)","PRIMARY STORAGE":"rgb(79, 107, 255)"};
    check("BLOODWORKS keeps one identity color per component category", consoleUi.unique === 8 && Object.keys(expectColors).every(k => consoleUi.colors[k] === expectColors[k]), JSON.stringify(consoleUi.colors));
    check("multi-word BLOODWORKS labels have explicit word spacing without extreme tracking", consoleUi.labels.length >= 14 && consoleUi.labels.every(x => x && x.ratioWord >= 0.3 && x.ratioLetter <= 0.18), JSON.stringify(consoleUi.labels));
    check("component matrix exposes the six-column header", consoleUi.headerVisible && consoleUi.header === "COMPONENT|SOURCE|SELECTED PART|TRUE COST|ORIGINAL PRICE|FAMILY", consoleUi.header);
    check("source, part, prices and FAMILY align vertically across every bay", Object.values(consoleUi.aligned).every(Boolean) && consoleUi.partWidest, JSON.stringify(consoleUi.aligned));
    check("single-line bays stay compact at 1920px", consoleUi.single.length === 5 && consoleUi.single.every(h => h <= 76), JSON.stringify(consoleUi.single));
    check("unset sale price replaces profit, ROI and margin with one sale-price prompt", consoleUi.saleState === "unset" && consoleUi.unsetProfitHidden && /SET EXPECTED SALE PRICE/i.test(consoleUi.salePrompt), JSON.stringify({saleState:consoleUi.saleState,hidden:consoleUi.unsetProfitHidden,prompt:consoleUi.salePrompt}));
    const slim = await evaluate(`(()=>{const ram=document.querySelector('[data-rig-catalog-item="RAM"]').closest('.rig-slot-row'),adv=ram.querySelector('.pn-bw-ram-adv'),vis=e=>!!e&&e.getClientRects().length>0;
      const coreVisible=['technology','moduleCount','perModuleCapacity','speed','casLatency'].filter(k=>vis(ram.querySelector('[data-rig-ram-field="'+k+'"]'))).length;
      const advHidden=['voltage','partNumber','matchedKit','rgb','xmp','expo','notes'].filter(k=>{const el=ram.querySelector('[data-rig-ram-field="'+k+'"]'),d=el&&el.closest('details');return !!d&&!d.open}).length;
      const list=document.querySelector('.pn-bc-details-list'),pass=list.querySelectorAll('[data-bc-level="PASS"]'),passVisible=Array.from(pass).filter(vis).length;
      const foot=document.querySelector('.pn-rig-budget-foot').textContent;
      document.querySelector('[data-bw-focus-sale]').click();const focused=document.activeElement&&document.activeElement.dataset.rigField;
      return{advOpen:adv&&adv.open,coreVisible,advHidden,ramHeight:Math.round(ram.getBoundingClientRect().height),pass:pass.length,passVisible,chips:vis(document.querySelector('.pn-rig-fold-check .pn-bc-chips')),toggle:(document.querySelector('[data-bw-show-verified]')||{}).textContent,foot,focused}})()`);
    check("RAM keeps core fields inline and folds the seven advanced fields", slim.advOpen === false && slim.coreVisible === 5 && slim.advHidden === 7 && slim.ramHeight <= 175, JSON.stringify(slim));
    check("Build Check hides duplicate count chips and verified rows behind one toggle", slim.pass > 0 && slim.passVisible === 0 && !slim.chips && new RegExp("SHOW " + slim.pass + " VERIFIED").test(slim.toggle || ""), JSON.stringify(slim));
    check("budget footer is a single short status", /^\d+% committed$/.test(slim.foot.trim()), slim.foot);
    check("sale-price prompt focuses the Expected Sale Price input", slim.focused === "expectedSalePrice", JSON.stringify(slim));
    const verifiedToggle = await evaluate(`(()=>{document.querySelector('[data-bw-show-verified]').click();const shown=Array.from(document.querySelectorAll('.pn-bc-details-list [data-bc-level="PASS"]')).filter(e=>e.getClientRects().length).length;document.querySelector('[data-bw-show-verified]').click();const hidden=Array.from(document.querySelectorAll('.pn-bc-details-list [data-bc-level="PASS"]')).filter(e=>e.getClientRects().length).length;return{shown,hidden}})()`);
    check("verified Build Check rows can be shown and hidden again", verifiedToggle.shown > 0 && verifiedToggle.hidden === 0, JSON.stringify(verifiedToggle));
    await evaluate(`(()=>{document.querySelector('.content').scrollTop=0;return true})()`);
    await delay(250);
    const premium = await evaluate(`(()=>{const rowOf=k=>document.querySelector('[data-rig-slot-mode="'+k+'"]').closest('.rig-slot-row'),dot=k=>{const d=rowOf(k).querySelector('[data-bw-bay-status]');return d&&d.dataset.bwBayStatus},dock=document.querySelector('[data-bw-dock]');
      return{dots:document.querySelectorAll('.rig-slot-row [data-bw-bay-status]').length,psu:dot('PSU'),storage:dot('STORAGE'),labelWidthOk:Array.from(document.querySelectorAll('.rig-slot-label')).every(l=>l.scrollWidth<=l.clientWidth+1),
        sources:Array.from(document.querySelectorAll('[data-rig-slot-mode="CPU"] option')).map(o=>o.value+':'+o.textContent).join('|'),sim:(document.querySelector('.pn-bw-sim')||{}).textContent,
        deleteInMenu:!!document.querySelector('.pn-bw-more [data-confirm-delete^="rig:"]'),deleteVisible:Array.from(document.querySelectorAll('[data-confirm-delete^="rig:"]')).some(b=>{const d=b.closest('details');return !d||d.open}),
        unmatched:document.querySelectorAll('.pn-bw-unmatched').length,familyButtons:document.querySelectorAll('[data-rig-copy-slot-to-family]').length,family:document.querySelector('.pn-rig-cmd[data-rig-view=editor]').dataset.bwFamily,
        dockTag:dock&&dock.tagName,dockSave:!!(dock&&dock.querySelector('[data-rig-save]')),dockStuckAtTop:dock&&dock.classList.contains('is-stuck'),bayPanelStyled:!!document.querySelector('.pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type .pn-bw-bay-count')}})()`);
    check("every bay carries a Build Check status LED mapped from its findings", premium.dots === 8 && premium.psu === "WARN" && premium.storage === "PASS" && premium.labelWidthOk, JSON.stringify(premium));
    check("source selector uses short tags without changing values", premium.sources === "EMPTY:Empty|INVENTORY:Vault|PLANNED:Planned", premium.sources);
    check("simulation note is a chip and DELETE RIG lives in the overflow menu", premium.sim === "SIMULATION" && premium.deleteInMenu && !premium.deleteVisible, JSON.stringify(premium));
    check("unmatched case and cooler show an UNMATCHED chip instead of the long sentence", premium.unmatched === 2, JSON.stringify(premium));
    check("FAMILY copy is hidden when the rig has no sibling variants", premium.family === "solo" && premium.familyButtons === 0, JSON.stringify(premium));
    check("summary dock is an aside that keeps the bay panel styling intact and starts hidden", premium.dockTag === "ASIDE" && premium.dockSave && premium.dockStuckAtTop === false && premium.bayPanelStyled, JSON.stringify(premium));
    await evaluate(`(()=>{document.querySelector('.content').scrollTop=900;return true})()`);
    await delay(300);
    const docked = await evaluate(`(()=>{const d=document.querySelector('[data-bw-dock]'),bar=d.firstElementChild.getBoundingClientRect(),c=document.querySelector('.content').getBoundingClientRect();return{stuck:d.classList.contains('is-stuck'),visible:getComputedStyle(d.firstElementChild).visibility,offset:Math.round(bar.top-c.top),text:d.textContent}})()`);
    check("summary dock pins to the top of the workspace after scrolling past the budget strip", docked.stuck && docked.visible === "visible" && Math.abs(docked.offset) <= 2 && /AVAILABLE/.test(docked.text) && /BUILD CHECK/.test(docked.text), JSON.stringify(docked));
    const withSibling = await evaluate(`(()=>{document.querySelector('.content').scrollTop=0;Actions.duplicateRig(state.rigDraft.id);render();return{buttons:document.querySelectorAll('[data-rig-copy-slot-to-family]').length,family:document.querySelector('.pn-rig-cmd[data-rig-view=editor]').dataset.bwFamily||''}})()`);
    check("FAMILY copy returns once a sibling variant exists", withSibling.buttons === 8 && withSibling.family === "", JSON.stringify(withSibling));
    check("Build Check summary shows verdict and counts while collapsed", /^BUILD CHECK(PASS|WARNING|FAIL|UNVERIFIED) · .*\d+ VERIFIED · \d+ UNVERIFIED/.test(consoleUi.checkSummary.replace(/(COLLAPSE|EXPAND)$/, "")), consoleUi.checkSummary);
    const hoverBefore = await evaluate(`(()=>{document.activeElement&&document.activeElement.blur&&document.activeElement.blur();document.querySelector('.content').scrollTop=0;const r=document.querySelector('.rig-slot-row'),b=r.getBoundingClientRect(),l=r.querySelector('.rig-slot-label').getBoundingClientRect();return{x:Math.round(b.left+b.width*0.3),y:Math.round(b.top+8),pad:getComputedStyle(r).padding,label:[l.left,l.top].join(',')}})()`);
    await cdp.send("Input.dispatchMouseEvent", {type:"mouseMoved", x:hoverBefore.x, y:hoverBefore.y});
    await delay(250);
    const hoverAfter = await evaluate(`(()=>{const r=document.querySelector('.rig-slot-row'),l=r.querySelector('.rig-slot-label').getBoundingClientRect();return{hover:r.matches(':hover'),pad:getComputedStyle(r).padding,label:[l.left,l.top].join(',')}})()`);
    check("row hover never moves text or changes padding", hoverAfter.hover && hoverAfter.pad === hoverBefore.pad && hoverAfter.label === hoverBefore.label, JSON.stringify({hoverBefore, hoverAfter}));
    const salePos = await evaluate(`(()=>{state.rigDraft.expectedSalePrice=90000;render();const v=document.querySelector('[data-bw-kpi="expected-profit"] .kpi-value');return{state:document.querySelector('.pn-rig-results-primary').dataset.bwSale,color:getComputedStyle(v).color,cash:(document.querySelector('[data-bw-cash-back]')||{}).textContent}})()`);
    check("positive expected profit uses restrained green and shows cash back", salePos.state === "set" && salePos.color === "rgb(95, 224, 144)" && /cash back .* after new spend/.test(salePos.cash || ""), JSON.stringify(salePos));
    for (const [width, height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {width,height,deviceScaleFactor:1,mobile:false});
      await delay(150);
      const full = await evaluate(`(()=>{const c=document.querySelector('.content'),rows=Array.from(document.querySelectorAll('.rig-slot-row'));return{docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,contentOverflow:c.scrollWidth>c.clientWidth,visible:rows.every(r=>{const p=r.querySelector('.rig-slot-price input'),l=r.querySelector('.rig-slot-label'),d=r.querySelector('.rig-slot-detail');return p.getBoundingClientRect().width>40&&l.getBoundingClientRect().width>20&&d.getBoundingClientRect().width>120})}})()`);
      check(width + "px fully-populated BLOODWORKS has no horizontal overflow and keeps labels, parts and costs visible", !full.docOverflow && !full.contentOverflow && full.visible, JSON.stringify(full));
    }
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await evaluate(`(()=>{state.rigDraft=JSON.parse(window.__pnKeepDraft);render();return true})()`);
    await delay(120);

    for (const width of [1440, 1024, 768, 390]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {width,height:900,deviceScaleFactor:1,mobile:false});
      await delay(120);
      const responsive = await evaluate(`(()=>{const budget=document.querySelector('.pn-rig-budget');const results=document.querySelector('.pn-rig-results-primary');const content=document.querySelector('.content');return{budgetColumns:getComputedStyle(budget).gridTemplateColumns.split(' ').length,resultColumns:getComputedStyle(results).gridTemplateColumns.split(' ').length,docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,contentOverflow:content.scrollWidth>content.clientWidth,culprits:content.scrollWidth>content.clientWidth?Array.from(content.querySelectorAll("*")).filter(el=>el.getBoundingClientRect().right>content.getBoundingClientRect().right+1).slice(0,8).map(el=>el.tagName+"."+String(el.className).slice(0,40)+":"+Math.round(el.getBoundingClientRect().right)):[]}})()`);
      const expectedBudgetColumns = width > 1700 ? 5 : width > 1000 ? 3 : width > 620 ? 2 : 1;
      check(width + "px budget rail is responsive", !responsive.docOverflow && !responsive.contentOverflow && responsive.budgetColumns === expectedBudgetColumns, JSON.stringify(responsive));
    }
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const interaction = await evaluate(`(()=>{const budget=document.querySelector('[data-rig-budget-input]');budget.value='60000';budget.dispatchEvent(new Event('input',{bubbles:true}));const mode=document.querySelector('select[data-rig-budget-mode]');mode.value='NEW_CASH';mode.dispatchEvent(new Event('change',{bubbles:true}));saveRigDraft();const saved=Store.get('rigs',state.rigDraft.id);return{draftBudget:state.rigDraft.budget,draftMode:state.rigDraft.budgetMode,savedBudget:saved&&saved.budget,savedMode:saved&&saved.budgetMode}})()`);
    check("budget and mode persist with the rig record", interaction.draftBudget === 60000 && interaction.draftMode === "NEW_CASH" && interaction.savedBudget === 60000 && interaction.savedMode === "NEW_CASH", JSON.stringify(interaction));
    const eurEntry = await evaluate(`(()=>{const selector=document.querySelector('[data-rig-budget-currency]');selector.value='EUR';selector.dispatchEvent(new Event('change',{bubbles:true}));const before=document.querySelector('[data-rig-budget-input]').value;const budget=document.querySelector('[data-rig-budget-input]');budget.value='500';budget.dispatchEvent(new Event('input',{bubbles:true}));render();const draft=state.rigDraft;const stat=document.querySelector('.pn-rig-budget-stat.is-result b').textContent;saveRigDraft();const saved=Store.get('rigs',draft.id);return{globalCurrency:displayCurrency(),before,amount:document.querySelector('[data-rig-budget-input]').value,currency:document.querySelector('[data-rig-budget-currency]').value,storedBudget:draft.budget,savedBudget:saved.budget,savedCurrency:saved.budgetCurrency,remaining:stat}})()`);
    check("EUR budget entry works while global currency stays RSD", eurEntry.globalCurrency === "RSD" && eurEntry.currency === "EUR" && eurEntry.storedBudget === 58750 && eurEntry.amount === "500" && eurEntry.remaining.includes("€202.13"), JSON.stringify(eurEntry));
    check("EUR budget and currency persist with rig record", eurEntry.savedBudget === 58750 && eurEntry.savedCurrency === "EUR", JSON.stringify(eurEntry));
    const currencyRoundTrip = await evaluate(`(()=>{const selector=document.querySelector('[data-rig-budget-currency]');selector.value='RSD';selector.dispatchEvent(new Event('change',{bubbles:true}));const rsdValue=document.querySelector('[data-rig-budget-input]').value;const rsdRemaining=document.querySelector('.pn-rig-budget-stat.is-result b').textContent;const unchanged=state.rigDraft.budget;const saved=Store.get('rigs',state.rigDraft.id);state.rigDraft=JSON.parse(JSON.stringify(saved));render();return{rsdValue,rsdRemaining,unchanged,restoredCurrency:document.querySelector('[data-rig-budget-currency]').value,restoredAmount:document.querySelector('[data-rig-budget-input]').value,restoredBudget:state.rigDraft.budget}})()`);
    check("changing EUR to RSD converts display, not the budget", currencyRoundTrip.rsdValue === "58.750" && currencyRoundTrip.rsdRemaining.includes("23.750 RSD") && currencyRoundTrip.unchanged === 58750, JSON.stringify(currencyRoundTrip));
    check("reloading saved rig restores the independent EUR selection", currencyRoundTrip.restoredCurrency === "EUR" && currencyRoundTrip.restoredAmount === "500" && currencyRoundTrip.restoredBudget === 58750, JSON.stringify(currencyRoundTrip));
    const guard = await evaluate(`(()=>{pnRigBudgetBeginUiNew();state.rigDraft=newRigDraft('GUARD BROWSER TEST');state.rigDraft.slots.CPU={kind:'PLANNED',label:'AMD Ryzen 5 5600',cost:10000,originalPrice:12000,currency:'RSD'};render();const before=Store.all('rigs').length;document.querySelector('[data-rig-save]').click();const blocked={rigs:Store.all('rigs').length===before,draftKept:!!state.rigDraft&&state.rigDraft.family==='GUARD BROWSER TEST',error:(document.querySelector('[data-rig-budget-error]')||{}).textContent||'',invalid:document.querySelector('[data-rig-budget-input]').getAttribute('aria-invalid'),focused:document.activeElement===document.querySelector('[data-rig-budget-input]')};const input=document.querySelector('[data-rig-budget-input]');input.value='-5';input.dispatchEvent(new Event('input',{bubbles:true}));const negativeBudget=state.rigDraft.budget;input.value='400';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-rig-save]').click();const savedRig=Store.all('rigs').find(r=>r.family==='GUARD BROWSER TEST');return{blocked,negativeBudget,savedBudget:savedRig&&savedRig.budget,savedRequired:savedRig&&savedRig.budgetRequired}})()`);
    check("SAVE on a new rig without budget is blocked with inline error and focus", guard.blocked.rigs && guard.blocked.draftKept && guard.blocked.error.length > 10 && guard.blocked.invalid === "true" && guard.blocked.focused, JSON.stringify(guard));
    check("negative input is refused and a valid budget then saves", guard.negativeBudget === null && guard.savedBudget === 400 && guard.savedRequired === true, JSON.stringify(guard));
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:false});
    await delay(120);
    const mobile = await evaluate(`(()=>{const id=Store.all('rigs').find(r=>r.family==='GUARD BROWSER TEST').id;state.rigDraft=JSON.parse(JSON.stringify(Store.get('rigs',id)));state.rigDraft.expectedSalePrice=30000;state.rigCompactPanels=Object.assign(state.rigCompactPanels||{},{'budget-ledger':true});render();const content=document.querySelector('.content');const rail=document.querySelector('[data-rig-budget-rail]');return{overflow:content.scrollWidth>content.clientWidth||document.documentElement.scrollWidth>document.documentElement.clientWidth,outlook:!document.querySelector('[data-rig-sale-outlook]')&&!!document.querySelector('[data-rig-budget-rail] .pn-rig-budget-rows'),railHeight:Math.round(rail.getBoundingClientRect().height),tone:rail.dataset.budgetTone}})()`);
    check("390px open cost ledger stays inside the viewport without a duplicate sale outlook", !mobile.overflow && mobile.outlook && mobile.tone === "over", JSON.stringify(mobile));
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await delay(250);
    check("browser run has no console errors or warnings", errors.length === 0, errors.join(" | "));
  } finally {
    if (cdp) cdp.close();
    browser.kill();
    server.close();
  }
  let failed = 0;
  for (const [name, ok, detail] of checks) {
    console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail ? "  " + detail : ""));
    if (!ok) failed++;
  }
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
