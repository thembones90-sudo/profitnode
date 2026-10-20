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

function browserPath(){
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const rel = [["Google","Chrome","Application","chrome.exe"],["Microsoft","Edge","Application","msedge.exe"]];
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
    for (const width of [1440, 1024, 768, 390]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {width,height:900,deviceScaleFactor:1,mobile:false});
      await delay(120);
      const responsive = await evaluate(`(()=>{const budget=document.querySelector('.pn-rig-budget');const results=document.querySelector('.pn-rig-results-primary');const content=document.querySelector('.content');return{budgetColumns:getComputedStyle(budget).gridTemplateColumns.split(' ').length,resultColumns:getComputedStyle(results).gridTemplateColumns.split(' ').length,docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,contentOverflow:content.scrollWidth>content.clientWidth}})()`);
      const expectedBudgetColumns = width > 1700 ? 5 : width > 1000 ? 3 : width > 620 ? 2 : 1;
      check(width + "px budget rail is responsive", !responsive.docOverflow && !responsive.contentOverflow && responsive.budgetColumns === expectedBudgetColumns, JSON.stringify(responsive));
    }
    await cdp.send("Emulation.setDeviceMetricsOverride", {width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const interaction = await evaluate(`(()=>{const budget=document.querySelector('[data-rig-budget-input]');budget.value='60000';budget.dispatchEvent(new Event('input',{bubbles:true}));const mode=document.querySelector('select[data-rig-budget-mode]');mode.value='NEW_CASH';mode.dispatchEvent(new Event('change',{bubbles:true}));saveRigDraft();const saved=Store.get('rigs',state.rigDraft.id);return{draftBudget:state.rigDraft.budget,draftMode:state.rigDraft.budgetMode,savedBudget:saved&&saved.budget,savedMode:saved&&saved.budgetMode}})()`);
    check("budget and mode persist with the rig record", interaction.draftBudget === 60000 && interaction.draftMode === "NEW_CASH" && interaction.savedBudget === 60000 && interaction.savedMode === "NEW_CASH", JSON.stringify(interaction));
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
