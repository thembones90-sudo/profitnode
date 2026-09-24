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
    await evaluate(`loadHardwareCatalog().then(()=>{render();return HardwareCatalog.status})`);
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    const shell=await evaluate(`({brand:document.title==='PROFITNODE'&&!!document.querySelector('[aria-label="PROFITNODE"]'),routes:new Set(Array.from(document.querySelectorAll('[data-route]'),e=>e.dataset.route)).size,legacy:!!document.querySelector('.brand-shop:not([data-pn-sidebar-cleanup="hidden"])'),schema:Store.load().meta.schemaVersion})`);
    check("app loads its complete visible navigation in a real browser",shell.brand&&shell.routes===14,JSON.stringify(shell));
    check("sidebar cleanup runs in the real DOM",!shell.legacy);
    check("browser storage initializes on the current schema",shell.schema===4);
    const navVisual=await evaluate(`(()=>{const rig=document.querySelector('[data-route="rigbuild"]'),roulette=document.querySelector('[data-route="roulette"]'),chrome=getComputedStyle(rig,'::before'),lightning=getComputedStyle(rig,'::after');return {rigLabel:rig.textContent.trim(),chromeAnimation:chrome.animationName,chromeFill:chrome.webkitTextFillColor,chromeBackground:chrome.backgroundImage,chromeFilter:chrome.filter,lightningColor:lightning.backgroundColor,lightningAnimation:lightning.animationName,lightningShape:lightning.clipPath,rouletteAfter:getComputedStyle(roulette,'::after').content}})()`);
    check("RIG ASSEMBLY uses one uniform gold with no multicolor gradient",navVisual.rigLabel==='RIG ASSEMBLY'&&navVisual.chromeAnimation.includes('pnRigAssemblyChrome')&&navVisual.chromeFill==='rgb(231, 188, 78)'&&navVisual.chromeBackground==='none'&&navVisual.chromeFilter!=='none',JSON.stringify(navVisual));
    check("RIG ASSEMBLY lightning uses the same single gold",navVisual.lightningColor==='rgb(231, 188, 78)'&&navVisual.lightningAnimation.includes('pnRigAssemblyLightning')&&navVisual.lightningShape!=='none',JSON.stringify(navVisual));
    check("Roulette sidebar indicator dot is removed",navVisual.rouletteAfter==='none'||navVisual.rouletteAfter==='normal',JSON.stringify(navVisual));
    const sidebarVisual=await evaluate(`(()=>{const by=key=>document.querySelector('[data-route="'+key+'"]'),css=(key,pseudo)=>getComputedStyle(by(key),pseudo),links=Array.from(document.querySelectorAll('.mainnav>.navlink')),divider=key=>css(key,'::after');return{width:getComputedStyle(document.querySelector('.sidebar')).width,rows:links.length,rowHeights:links.map(x=>x.getBoundingClientRect().height),fontSize:css('inventory').fontSize,fontWeight:css('inventory').fontWeight,letterSpacing:css('inventory').letterSpacing,paddingLeft:css('inventory').paddingLeft,standard:css('inventory').color,mail:css('mail').color,roulette:css('roulette').color,blackbox:css('backup').color,rigLeft:css('rigbuild','::before').left,inactiveRail:css('inventory').borderLeftColor,activeRail:css('dashboard').borderLeftColor,activeBackground:css('dashboard').backgroundImage,activeShadow:css('dashboard').boxShadow,separators:['analytics','roadto','history'].map(key=>({height:divider(key).height,background:divider(key).backgroundColor,margin:css(key).marginBottom}))}})()`);
    check("sidebar keeps its width and uses disciplined 56px condensed navigation rows",sidebarVisual.width==='216px'&&sidebarVisual.rows===14&&sidebarVisual.rowHeights.every(h=>h>=54&&h<=58)&&sidebarVisual.fontSize==='14px'&&sidebarVisual.fontWeight==='700'&&parseFloat(sidebarVisual.letterSpacing)>1.3&&sidebarVisual.paddingLeft==='28px'&&sidebarVisual.rigLeft==='28px',JSON.stringify(sidebarVisual));
    check("sidebar route identities resolve to silver, crimson, violet, dark steel, and gold",sidebarVisual.standard==='rgb(197, 203, 210)'&&sidebarVisual.mail==='rgb(185, 75, 88)'&&sidebarVisual.roulette==='rgb(168, 116, 197)'&&sidebarVisual.blackbox==='rgb(125, 135, 146)'&&navVisual.chromeFill==='rgb(231, 188, 78)',JSON.stringify(sidebarVisual));
    check("sidebar active state uses a restrained accent rail, gradient, and inset glow",sidebarVisual.inactiveRail==='rgba(0, 0, 0, 0)'&&sidebarVisual.activeRail==='rgb(174, 183, 193)'&&sidebarVisual.activeBackground.includes('gradient')&&sidebarVisual.activeShadow!=='none',JSON.stringify(sidebarVisual));
    check("sidebar group boundaries use only faint one-pixel separators and spacing",sidebarVisual.separators.every(x=>x.height==='1px'&&x.background!=='rgba(0, 0, 0, 0)'&&x.margin==='13px'),JSON.stringify(sidebarVisual));
    const specialRails={},specialRailExpected={rigbuild:'rgb(231, 188, 78)',mail:'rgb(212, 90, 103)',roulette:'rgb(189, 133, 220)',backup:'rgb(154, 165, 177)'};
    for(const key of Object.keys(specialRailExpected)){await evaluate(`document.querySelector('[data-route="${key}"]').click()`);specialRails[key]=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('[data-route="${key}"]'));return{rail:s.borderLeftColor,background:s.backgroundImage,shadow:s.boxShadow}})()`)}
    check("sidebar special tabs retain their accent rails in active state",Object.keys(specialRailExpected).every(key=>specialRails[key].rail===specialRailExpected[key]&&specialRails[key].background.includes('gradient')&&specialRails[key].shadow!=='none'),JSON.stringify(specialRails));
    await evaluate(`document.querySelector('[data-route="dashboard"]').click()`);
    const hoverPoint=await evaluate(`(()=>{const r=document.querySelector('[data-route="inventory"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:hoverPoint.x,y:hoverPoint.y}); await delay(220);
    const sidebarHover=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('[data-route="inventory"]'));return{color:s.color,paddingLeft:s.paddingLeft,rail:s.borderLeftColor,background:s.backgroundImage,transform:s.transform,transition:s.transitionDuration}})()`);
    check("sidebar hover brightens, shifts three pixels, reveals its rail, and never scales",sidebarHover.color==='rgb(241, 243, 245)'&&Math.abs(parseFloat(sidebarHover.paddingLeft)-31)<.1&&sidebarHover.rail!=='rgba(0, 0, 0, 0)'&&sidebarHover.background.includes('gradient')&&sidebarHover.transform==='none'&&sidebarHover.transition.includes('0.15s'),JSON.stringify(sidebarHover));
    await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:1000,y:1000});

    const desktop=await evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,content:getComputedStyle(document.querySelector('.content')).overflowY})`);
    check("1920x1080 shell has no document-level horizontal clipping",!desktop.overflow);
    check("desktop keeps the intended internal scroll layer",desktop.content==="auto"||desktop.content==="scroll");
    const command=await evaluate(`(()=>{const hero=document.querySelector('.pn-command-hero-finance'),matrix=document.querySelector('.pn-financial-matrix'),priority=document.querySelector('.pn-command-priority'),content=document.querySelector('.content');return {title:document.querySelector('h1')&&document.querySelector('h1').textContent,roadBanner:!!document.querySelector('.pn-roadto-feat'),contentFirst:content&&content.firstElementChild&&content.firstElementChild.className,priority:!!priority,telemetry:document.querySelectorAll('.pn-command-telemetry>div').length,kpis:document.querySelectorAll('.pn-financial-matrix .pn-terminal-kpi').length,major:document.querySelectorAll('.pn-terminal-kpi.is-major').length,cols:getComputedStyle(matrix).gridTemplateColumns.split(' ').length,heroHeight:Math.round(hero.getBoundingClientRect().height),panelTiers:['primary','operational','utility'].every(t=>!!document.querySelector('.pn-command-panel-'+t))}})()`);
    check("COMMAND starts with the welcome heading and no ROAD TO banner gap",command.title==='WELCOME BACK, COMMANDER'&&!command.roadBanner&&String(command.contentFirst).includes('pn-command-telemetry'),JSON.stringify(command));
    check("COMMAND renders one operational priority and five telemetry channels",command.priority&&command.telemetry===5,JSON.stringify(command));
    check("COMMAND uses a compact five-metric financial matrix at 1920px",command.kpis===5&&command.major===2&&command.cols===3&&command.heroHeight<250,JSON.stringify(command));
    check("COMMAND exposes three levels of panel hierarchy",command.panelTiers);
    const commandDepth=await evaluate(`(()=>{const read=(el,pseudo)=>{const s=getComputedStyle(el,pseudo);return{background:s.backgroundColor,image:s.backgroundImage,border:s.borderTopColor,borderBottom:s.borderBottomColor,shadow:s.boxShadow,opacity:s.opacity,filter:s.filter}},content=document.querySelector('.pn-command-content'),panel=document.querySelector('.pn-command-panel'),kpi=document.querySelector('.pn-terminal-kpi:not(.is-major)'),head=panel.querySelector('.panel-head'),profit=document.querySelector('.pn-profit-core'),value=document.querySelector('.pn-profit-value.pos'),priority=document.querySelector('.pn-command-priority');return{main:read(document.querySelector('.main')),background:read(content,'::before'),panel:read(panel),panelEdge:read(panel,'::before'),kpi:read(kpi),head:read(head),profit:read(profit),ambient:value?read(value,'::before'):null,priority:read(priority)}})()`);
    check("COMMAND depth level 0 lowers the artwork and grid behind content",commandDepth.main.background==='rgba(8, 6, 11, 0.18)'&&Math.abs(parseFloat(commandDepth.background.opacity)-.08)<.001,JSON.stringify(commandDepth));
    check("COMMAND depth level 1 mounts standard panels and KPI cards above the background",commandDepth.panel.background==='rgba(14, 11, 19, 0.88)'&&commandDepth.kpi.background==='rgba(14, 11, 19, 0.88)'&&commandDepth.panel.border==='rgba(170, 90, 220, 0.18)'&&commandDepth.panel.shadow.includes('4px 14px')&&commandDepth.kpi.shadow.includes('4px 14px')&&parseFloat(commandDepth.panelEdge.opacity)<=.05,JSON.stringify(commandDepth));
    check("COMMAND panel headers read as restrained strips within their modules",commandDepth.head.image.includes('gradient')&&commandDepth.head.background==='rgba(12, 9, 16, 0.36)'&&commandDepth.head.borderBottom==='rgba(170, 90, 220, 0.15)',JSON.stringify(commandDepth));
    check("COMMAND depth level 2 keeps priority and REALIZED PROFIT physically dominant",commandDepth.priority.shadow.includes('8px 24px')&&commandDepth.profit.shadow.includes('10px 30px')&&commandDepth.profit.shadow!==commandDepth.panel.shadow,JSON.stringify(commandDepth));
    check("REALIZED PROFIT uses one broad green screen glow behind the figure",!!commandDepth.ambient&&commandDepth.ambient.image.includes('radial-gradient')&&commandDepth.ambient.image.includes('62, 207, 126')&&commandDepth.ambient.filter!=='none',JSON.stringify(commandDepth));
    const freshness=await evaluate(`(()=>{Store.setMeta({displayCurrency:Store.load().meta.displayCurrency});render();const el=document.querySelector('[data-pn-command-updated]');return {present:!!el,fresh:el&&el.classList.contains('is-fresh'),label:el&&el.textContent,stamp:localStorage.getItem('profitnode_last_updated_v1')}})()`);
    check("COMMAND reports and pulses on a saved data change",freshness.present&&freshness.fresh&&freshness.label.includes('LAST UPDATED')&&/^\d{4}-\d{2}-\d{2}T/.test(freshness.stamp||''),JSON.stringify(freshness));
    const commandShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(os.tmpdir(),"profitnode-command-1920.png"),Buffer.from(commandShot.data,"base64"));
    check("COMMAND renders a valid 1920x1080 frame",!!commandShot.data&&commandShot.data.length>10000);
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1100,height:900,deviceScaleFactor:1,mobile:false});
    const commandResponsive=await evaluate(`(()=>{const hero=document.querySelector('.pn-command-hero-finance');return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,heroCols:getComputedStyle(hero).gridTemplateColumns.split(' ').length,priorityWidth:document.querySelector('.pn-command-priority').getBoundingClientRect().width}})()`);
    check("COMMAND stacks safely at 1100px without horizontal clipping",!commandResponsive.overflow&&commandResponsive.heroCols===1&&commandResponsive.priorityWidth>500,JSON.stringify(commandResponsive));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    const commandNarrow=await evaluate(`(()=>{const frame=document.querySelector('.pn-command-content').getBoundingClientRect(),hero=document.querySelector('.pn-command-hero-finance'),matrix=document.querySelector('.pn-financial-matrix'),profit=document.querySelector('.pn-profit-core'),value=document.querySelector('.pn-profit-value.pos'),priority=document.querySelector('.pn-command-priority'),panels=Array.from(document.querySelectorAll('.pn-command-panel')),heads=Array.from(document.querySelectorAll('.pn-command-panel .panel-head')),inside=el=>{const r=el.getBoundingClientRect();return r.left>=frame.left-1&&r.right<=frame.right+1},ambient=value&&getComputedStyle(value,'::before');return{overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,heroCols:getComputedStyle(hero).gridTemplateColumns.split(' ').length,matrixCols:getComputedStyle(matrix).gridTemplateColumns.split(' ').length,profitInside:inside(profit),priorityInside:inside(priority),panelsInside:panels.every(inside),headsInside:heads.every(inside),headersFit:heads.every(x=>x.scrollWidth<=x.clientWidth+1),ambientWidth:ambient?parseFloat(ambient.width):0,profitWidth:profit.getBoundingClientRect().width}})()`);
    check("COMMAND keeps a bounded single-column layout at 390px",!commandNarrow.overflow&&commandNarrow.heroCols===1&&commandNarrow.matrixCols===1&&commandNarrow.profitInside&&commandNarrow.priorityInside&&commandNarrow.panelsInside,JSON.stringify(commandNarrow));
    check("COMMAND headers and capped profit glow stay inside narrow surfaces",commandNarrow.headsInside&&commandNarrow.headersFit&&commandNarrow.ambientWidth>0&&commandNarrow.ambientWidth<=560&&commandNarrow.ambientWidth<=commandNarrow.profitWidth,JSON.stringify(commandNarrow));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

    await evaluate(`document.querySelector('[data-route="treasury"]').click();const t=pnTreasuryCoreDraft(Store.load().treasury),cash=t.balances.find(x=>x.sourceKey==='CASH_EUR');cash.amount=650;t.obligations=[];Store.load().treasury=t;Store.persist();render()`);await delay(250);
    const warChest=await evaluate(`(()=>{const content=document.querySelector('.pn-treasury'),sources=Array.from(document.querySelectorAll('[data-wc-source]')),icons=sources.map(x=>x.querySelector('img')),movement=document.querySelector('.pn-wc-movement-grid'),hero=document.querySelector('.pn-wc-hero'),segments=Array.from(document.querySelectorAll('.pn-wc-gauge-segment')),marker=document.querySelector('.pn-wc-gauge-floor span'),sourceLabel=document.querySelector('.pn-wc-source span');return{title:document.querySelector('h1').textContent,sources:sources.length,iconsLoaded:icons.every(x=>x.complete&&x.naturalWidth>0),currentHoard:document.body.textContent.includes('CURRENT HOARD'),fresh:document.body.textContent.includes('LAST RECOUNTED'),planningFx:document.body.textContent.includes('PLANNING FX'),reserveTitle:document.querySelector('.pn-wc-sources .pn-wc-section-head').textContent.trim(),movementCols:getComputedStyle(movement).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,ledgerRows:document.querySelectorAll('.pn-wc-ledger-row').length,ledgerEmpty:document.body.textContent.includes('NO MOVEMENTS'),ledgerFilters:document.querySelectorAll('[data-treasury-flow-filter]').length,runway:document.body.textContent.includes('RUNWAY'),surplus:!!document.querySelector('.pn-wc-surplus-protocol'),markerSize:parseFloat(getComputedStyle(marker).fontSize),sourceLabelSize:parseFloat(getComputedStyle(sourceLabel).fontSize),band:hero&&hero.dataset.wcBand,segments:segments.map(x=>x.className)}})()`);
    check("WAR CHEST loads all five local source marks in a clean 1920px reserve row",String(warChest.title).toUpperCase()==='WAR CHEST'&&warChest.sources===5&&warChest.iconsLoaded&&!warChest.currentHoard&&warChest.movementCols===4&&!warChest.overflow,JSON.stringify(warChest));
    check("Fortress Reserve renders the BLOOD / YELLOW / GREEN scale and resolves €650 to YELLOW",warChest.band==='YELLOW'&&warChest.segments.length===3&&warChest.segments.some(x=>/blood/.test(x))&&warChest.segments.some(x=>/yellow/.test(x))&&warChest.segments.some(x=>/green/.test(x)),JSON.stringify(warChest));
    check("WAR CHEST keeps freshness visible and the ledger bounded to five rows",warChest.fresh&&warChest.ledgerRows<=5,JSON.stringify(warChest));
    check("WAR CHEST removes duplicate FX/source labels and hides inactive reserve intelligence",!warChest.planningFx&&warChest.reserveTitle==='RESERVES'&&!warChest.runway&&!warChest.surplus,JSON.stringify(warChest));
    check("WAR CHEST empty ledger collapses to NO MOVEMENTS without dead filters",warChest.ledgerEmpty&&warChest.ledgerFilters===0,JSON.stringify(warChest));
    check("WAR CHEST threshold and reserve labels meet the raised 10px text floor",warChest.markerSize>=10&&warChest.sourceLabelSize>=10,JSON.stringify(warChest));
    const recountGuard=await evaluate(`(()=>{const cash=()=>(Store.load().treasury.balances.find(b=>b.sourceKey==='CASH_RSD')||{}).amount||0,before=cash();document.querySelector('[data-treasury-new]').click();document.querySelector('[data-route="inventory"]').click();document.querySelector('[data-open-form="inventory"]').click();const f=document.querySelector('[data-entity-form]'),set=(n,v)=>{f.elements[n].value=v;f.elements[n].dispatchEvent(new Event('change',{bubbles:true}))};set('category','GPU');set('manufacturer','Test');set('model','Recount Guard 2700');set('purchasePrice','2700');set('currency','RSD');set('purchaseDate',todayISO());set('estimatedMarketValue','3000');f.querySelector('[type="submit"]').click();const item=Store.all('inventory').find(i=>i.model==='Recount Guard 2700'),afterAdd=cash();document.querySelector('[data-route="treasury"]').click();const held=!!state.treasuryDraft;document.querySelector('[data-treasury-save]').click();const stored=JSON.parse(localStorage.getItem('profitnode_ledger_v1')).treasury,flows=stored.flows.filter(x=>item&&x.refType==='inventory'&&x.refId===item.id&&x.kind==='ACQUISITION'),result={before,afterAdd,held,afterSave:cash(),storedCash:(stored.balances.find(b=>b.sourceKey==='CASH_RSD')||{}).amount,flows:flows.length,signed:flows[0]&&flows[0].signedDelta};item&&Actions.removeInventory(item.id);result.afterDelete=cash();render();return result})()`);
    check("PARTS VAULT purchase made while a WAR CHEST recount is open survives the recount SAVE",recountGuard.held&&recountGuard.afterAdd===recountGuard.before-2700&&recountGuard.afterSave===recountGuard.before-2700&&recountGuard.storedCash===recountGuard.before-2700&&recountGuard.flows===1&&recountGuard.signed===-2700&&recountGuard.afterDelete===recountGuard.before,JSON.stringify(recountGuard));
    await evaluate(`(()=>{const t=pnTreasuryCoreDraft(Store.load().treasury),cash=t.balances.find(x=>x.sourceKey==='CASH_EUR');cash.amount=900;Store.load().treasury=t;Store.persist();render()})()`);await delay(100);
    const surplusProtocol=await evaluate(`(()=>{const el=document.querySelector('.pn-wc-surplus-protocol');return{exists:!!el,text:el&&el.textContent,legacyGrid:!!document.querySelector('.pn-wc-protocol-grid')}})()`);
    check("WAR CHEST reveals one compact 50/30/20 line only after the €800 reserve gate",surplusProtocol.exists&&!surplusProtocol.legacyGrid&&/ROAD TO/.test(surplusProtocol.text)&&/HARDWARE/.test(surplusProtocol.text)&&/FREE/.test(surplusProtocol.text),JSON.stringify(surplusProtocol));
    await evaluate(`(()=>{const t=pnTreasuryCoreDraft(Store.load().treasury),cash=t.balances.find(x=>x.sourceKey==='CASH_EUR');cash.amount=650;Store.load().treasury=t;Store.persist();render()})()`);await delay(100);
    await evaluate(`document.querySelector('[data-treasury-new]').click()`);await delay(100);
    const recountDrawer=await evaluate(`(()=>{const shell=document.querySelector('.pn-wc-drawer-shell'),drawer=document.querySelector('.pn-treasury-editor');return{shell:!!shell,dialog:shell&&shell.getAttribute('role'),height:drawer&&Math.round(drawer.getBoundingClientRect().height),right:drawer&&Math.round(drawer.getBoundingClientRect().right),viewport:innerWidth}})()`);
    check("RECOUNT THE HOARD opens as a full-height focused drawer",recountDrawer.shell&&recountDrawer.dialog==='dialog'&&recountDrawer.height===1080&&recountDrawer.right===recountDrawer.viewport,JSON.stringify(recountDrawer));
    await evaluate(`document.querySelector('[data-treasury-cancel]').click()`);
    const warChestShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(os.tmpdir(),"profitnode-war-chest-1920.png"),Buffer.from(warChestShot.data,"base64"));
    check("WAR CHEST renders a valid 1920x1080 frame",!!warChestShot.data&&warChestShot.data.length>10000);

    await evaluate(`document.querySelector('[data-route="inventory"]').click();document.querySelector('[data-open-form="inventory"]').click()`);
    let modal=await evaluate(`(()=>{const health=document.querySelector('.pn-storage-only');return {open:!!document.querySelector('form[data-entity-form="inventory"]'),healthHidden:health.hidden,healthDisplay:getComputedStyle(health).display,inspector:!!document.querySelector('[data-pn-tier-inspector]')}})()`);
    check("new inventory opens with the tier inspector",modal.open&&modal.inspector);
    check("drive health is actually hidden for non-storage parts",modal.healthHidden&&modal.healthDisplay==='none',JSON.stringify(modal));
    const motherboardPick=await evaluate(`(()=>{const input=document.querySelector('[data-part-search]');input.value='ASRock B450M Pro4 R2.0';input.dispatchEvent(new Event('input',{bubbles:true}));const pick=Array.from(document.querySelectorAll('[data-part-search-pick]')).find(x=>x.textContent.includes('B450M Pro4 R2.0'));if(pick)pick.click();const form=document.querySelector('form[data-entity-form="inventory"]'),health=form.querySelector('.pn-storage-only');return {picked:!!pick,category:form.elements.category.value,hidden:health.hidden,display:getComputedStyle(health).display}})()`);
    check("motherboard auto-detection keeps Drive Health out of the rendered form",motherboardPick.picked&&motherboardPick.category==='MOTHERBOARD'&&motherboardPick.hidden&&motherboardPick.display==='none',JSON.stringify(motherboardPick));
    await evaluate(`(()=>{const f=document.querySelector('form[data-entity-form="inventory"]');const set=(n,v)=>{const e=f.elements[n];e.value=v;e.dispatchEvent(new Event(n==='category'?'change':'input',{bubbles:true}))};set('category','STORAGE');set('manufacturer','Samsung');set('model','970 EVO Plus 1TB');set('purchasePrice','5000');set('estimatedMarketValue','8000');set('driveHealthPercent','87');return true})()`);
    modal=await evaluate(`(()=>{const health=document.querySelector('.pn-storage-only');return {healthHidden:health.hidden,healthDisplay:getComputedStyle(health).display,read:document.querySelector('.pn-part-tier-read').textContent}})()`);
    check("storage selection reveals the bounded health field",!modal.healthHidden&&modal.healthDisplay!=='none',JSON.stringify(modal));
    check("tier explanation updates live while editing",/COMMON|UNCOMMON|RARE|EPIC|LEGENDARY/.test(modal.read)&&/match|evidence|heuristic/i.test(modal.read),JSON.stringify(modal));
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
    check("backup/restore round-trip preserves schema and drive health",backup.recognized&&backup.health===87&&backup.schema===4,JSON.stringify(backup));

    const directSale=await evaluate(`(()=>{const item=Actions.addInventory({category:'GPU',manufacturer:'EVGA',model:'Browser Direct Sale GPU',purchaseDate:'2026-09-01',purchasePrice:5000,currency:'RSD',estimatedMarketValue:9000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''}),before=dashboardStats('RSD');state.route='inventory';state.filters.inventory.status='ACTIVE';render();document.querySelector('[data-open-entity="inventory"][data-id="'+item.id+'"]').click();document.querySelector('[data-mark-inventory-sold="'+item.id+'"]').click();const form=document.querySelector('[data-inventory-sale-form]'),warning=form.querySelector('[data-inventory-sale-loss-warning]');form.elements.salePrice.value='4000';form.elements.salePrice.dispatchEvent(new Event('input',{bubbles:true}));const lossWarning={shown:!warning.hidden,text:warning.textContent};form.elements.salePrice.value='9000';form.elements.salePrice.dispatchEvent(new Event('input',{bubbles:true}));const warningCleared=warning.hidden;form.elements.saleDate.value='2026-09-12';form.querySelector('[type="submit"]').click();const sale=Store.all('sales').find(s=>s.inventoryItemId===item.id),after=dashboardStats('RSD'),flow=sale&&Store.load().treasury.flows.find(f=>f.refType==='sale'&&f.refId===sale.id&&f.kind==='SALE'),notice=document.querySelector('[data-inventory-sale-notice]'),counts=Array.from(document.querySelectorAll('[data-inventory-count]'),e=>e.dataset.inventoryCount);return {itemId:item.id,modalClosed:!document.querySelector('[data-inventory-sale-form]'),status:Store.get('inventory',item.id).status,saleId:sale&&sale.id,completed:sale&&saleIsCompleted(sale),profitDelta:after.realizedProfit-before.realizedProfit,flow:flow&&flow.amount,activeVisible:!!document.querySelector('[data-open-entity="inventory"][data-id="'+item.id+'"]'),lossWarning:lossWarning,warningCleared:warningCleared,notice:notice&&notice.textContent,noticeLink:!!document.querySelector('[data-view-inventory-sale="'+sale.id+'"]'),counts:counts}})()`);
    check("sale modal warns below acquisition cost without blocking completion",directSale.lossWarning.shown&&directSale.lossWarning.text.includes('5.000 RSD')&&directSale.lossWarning.text.includes('1.000 RSD')&&directSale.warningCleared,JSON.stringify(directSale.lossWarning));
    check("MARK AS SOLD records the completed sale, credits cash, and enters SOLD IN TRANSIT",directSale.modalClosed&&directSale.status==='SOLD_IN_TRANSIT'&&directSale.saleId&&directSale.completed,JSON.stringify(directSale));
    check("direct inventory sale realizes profit once while SOLD IN TRANSIT remains active inventory",directSale.profitDelta===4000&&directSale.flow===9000&&directSale.activeVisible,JSON.stringify(directSale));
    check("sale completion shows revenue, profit, Ledger action, and inventory counts",directSale.notice&&directSale.notice.includes('SALE COMPLETED')&&directSale.notice.includes('9.000 RSD')&&directSale.notice.includes('4.000 RSD')&&directSale.noticeLink&&['ACTIVE','SOLD','TOTAL'].every(key=>directSale.counts.includes(key)),JSON.stringify(directSale));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:720,height:900,deviceScaleFactor:1,mobile:false});
    const mobileSaleUi=await evaluate(`(()=>{const notice=document.querySelector('[data-inventory-sale-notice]'),counts=document.querySelector('.pn-inventory-counts');return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,noticeDirection:getComputedStyle(notice).flexDirection,countsWidth:Math.round(counts.getBoundingClientRect().width),contentWidth:Math.round(document.querySelector('.content').getBoundingClientRect().width)}})()`);
    check("sale notice and inventory counters stack safely on mobile",!mobileSaleUi.overflow&&mobileSaleUi.noticeDirection==='column'&&mobileSaleUi.countsWidth<=mobileSaleUi.contentWidth,JSON.stringify(mobileSaleUi));
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
    await evaluate(`document.querySelector('[data-inventory-sale-notice] [data-view-inventory-sale]').click()`);
    const noticeLink=await evaluate(`({route:state.route,modalEntity:state.modal&&state.modal.entityType,modalId:state.modal&&state.modal.id,notice:!!state.inventorySaleNotice})`);
    check("VIEW IN LEDGER opens the exact completed sale",noticeLink.route==='sales'&&noticeLink.modalEntity==='sale'&&noticeLink.modalId===directSale.saleId&&!noticeLink.notice,JSON.stringify(noticeLink));
    await evaluate(`document.querySelector('[data-close-modal]').click()`);
    const soldViewLink=await evaluate(`(()=>{Actions.markInventoryDelivered('${directSale.itemId}');state.route='inventory';state.filters.inventory.status='SOLD';render();const row=document.querySelector('[data-open-entity="inventory"][data-id="${directSale.itemId}"]');if(!row)return {button:false,label:'',route:state.route,status:Store.get('inventory','${directSale.itemId}')&&Store.get('inventory','${directSale.itemId}').status};row.click();const button=document.querySelector('[data-view-inventory-sale="${directSale.saleId}"]'),label=button&&button.textContent;button&&button.click();return {button:!!button,label:label||'',route:state.route,modalEntity:state.modal&&state.modal.entityType,modalId:state.modal&&state.modal.id,status:Store.get('inventory','${directSale.itemId}')&&Store.get('inventory','${directSale.itemId}').status}})()`);
    check("SOLD inventory detail VIEW SALE opens its linked Ledger record",soldViewLink.button&&soldViewLink.label.includes('VIEW SALE')&&soldViewLink.route==='sales'&&soldViewLink.modalEntity==='sale'&&soldViewLink.modalId===directSale.saleId,JSON.stringify(soldViewLink));
    await evaluate(`document.querySelector('[data-close-modal]').click()`);
    const soldEdit=await evaluate(`(()=>{const cash=()=>Store.load().treasury.flows.filter(f=>f.refType==='sale'&&f.refId==='${directSale.saleId}').reduce((s,f)=>s+f.signedDelta,0),before=cash();state.route='inventory';state.filters.inventory.status='SOLD';render();document.querySelector('[data-open-entity="inventory"][data-id="${directSale.itemId}"]').click();const f=document.querySelector('[data-entity-form]');if(!f)return {form:false};const shown=f.elements.status.value;f.elements.notes.value='buyer picked up';f.querySelector('[type="submit"]').click();const item=Store.get('inventory','${directSale.itemId}');return {form:true,shown,status:item.status,notes:item.notes,credit:cash(),before}})()`);
    check("saving a SOLD item edit form keeps it SOLD with its sale credit intact",soldEdit.form&&soldEdit.shown==='SOLD'&&soldEdit.status==='SOLD'&&soldEdit.notes==='buyer picked up'&&soldEdit.credit===soldEdit.before&&soldEdit.credit===9000,JSON.stringify(soldEdit));

    const buildUi=await evaluate(`(()=>{const board=Actions.addInventory({category:'MOTHERBOARD',manufacturer:'Biostar',model:'TB250-BTC',purchaseDate:'2026-09-01',purchasePrice:9000,currency:'RSD',estimatedMarketValue:11000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''}),project=Actions.addProject({name:'BROWSER QUALITY BUILD',startDate:'2026-09-12',status:'BUILDING',purpose:'FLIP',currency:'RSD',additionalCosts:0,estimatedMarketValue:0,notes:''});Actions.setProjectSlot(project.id,'MOBO','INVENTORY',{inventoryItemId:board.id});Actions.setProjectSlot(project.id,'CPU','PLANNED',{label:'Intel Core i7-6700',cost:5000,currency:'RSD',catalogType:'CPU'});Actions.setProjectSlot(project.id,'GPU','PLANNED',{label:'AMD RX 560 4GB',cost:7000,currency:'RSD',catalogType:'GPU'});state.pbId=project.id;state.route='projectbuild';render();const builds=document.querySelector('[data-route="projects"]'),navStyle=getComputedStyle(builds),quality=slot=>{const card=document.querySelector('[data-pb-slot="'+slot+'"]'),badge=card&&card.querySelector('[data-pb-quality-badge]');return {card:card&&card.dataset.pbQuality,badge:badge&&badge.textContent,color:badge&&getComputedStyle(badge).color,border:badge&&getComputedStyle(badge).borderTopColor}},heading=document.querySelector('[data-pb-loadout]>.panel-head h2'),headingStyle=getComputedStyle(heading),labels=Array.from(document.querySelectorAll('[data-pb-loadout] .pn-pb-slot .pn-cat-label')),labelStyles=labels.map(x=>getComputedStyle(x));return {route:state.route,parent:activeNavRoute(state.route),buildsActive:builds.classList.contains('active')&&builds.classList.contains('is-powered'),aria:builds.getAttribute('aria-current'),activeCount:document.querySelectorAll('[data-nav-active="true"]').length,hiddenWorkspace:!document.querySelector('[data-route="projectbuild"]'),navBackground:navStyle.backgroundImage,navShadow:navStyle.boxShadow,mobo:quality('MOBO'),cpu:quality('CPU'),gpu:quality('GPU'),badges:document.querySelectorAll('[data-pb-loadout] [data-pb-quality-badge]').length,typography:{heading:heading.textContent,headingSize:headingStyle.fontSize,headingWeight:headingStyle.fontWeight,headingTransform:headingStyle.textTransform,labels:labels.map(x=>x.textContent),sizes:labelStyles.map(x=>x.fontSize),weights:labelStyles.map(x=>x.fontWeight),transforms:labelStyles.map(x=>x.textTransform),colors:labelStyles.map(x=>x.color)}}})()`);
    check("BUILD WORKSPACE powers only its BUILDS parent navigation item",buildUi.route==='projectbuild'&&buildUi.parent==='projects'&&buildUi.buildsActive&&buildUi.aria==='page'&&buildUi.activeCount===1&&buildUi.hiddenWorkspace&&buildUi.navBackground.includes('gradient')&&buildUi.navShadow!=='none',JSON.stringify(buildUi));
    check("BUILD loadout heading and all eight category labels are uppercase, bold, and 25% larger",buildUi.typography.heading==='COMPONENT LOADOUT'&&buildUi.typography.headingSize==='15.625px'&&buildUi.typography.headingWeight==='700'&&buildUi.typography.headingTransform==='uppercase'&&buildUi.typography.labels.join('|')==='MOTHERBOARD|CPU|RAM|GPU|PRIMARY STORAGE|PSU|CASE|COOLER'&&buildUi.typography.sizes.every(x=>x==='15.625px')&&buildUi.typography.weights.every(x=>x==='700')&&buildUi.typography.transforms.every(x=>x==='uppercase'),JSON.stringify(buildUi.typography));
    check("BUILD category typography preserves all eight category colors",new Set(buildUi.typography.colors).size===8,JSON.stringify(buildUi.typography.colors));
    check("BUILD loadout renders canonical V3 quality badges for owned and planned catalog components",buildUi.mobo.card==='COMMON'&&buildUi.mobo.badge==='COMMON'&&buildUi.cpu.card==='UNCOMMON'&&buildUi.cpu.badge==='UNCOMMON'&&buildUi.gpu.card==='POOR'&&buildUi.gpu.badge==='POOR'&&buildUi.badges===3&&buildUi.mobo.color!==buildUi.cpu.color&&buildUi.mobo.border!==buildUi.cpu.border,JSON.stringify(buildUi));
    await evaluate(`Actions.addInventory({category:'CPU',manufacturer:'Intel',model:'Core i7-6700',purchaseDate:'2026-09-01',purchasePrice:500,currency:'RSD',estimatedMarketValue:3000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});document.querySelector('[data-pb-edit-slot="CPU"]').click()`);
    await cdp.send("Input.insertText",{text:"i7 6700"});await delay(150);
    const buildPicker=await evaluate(`(()=>{const input=document.querySelector('[data-pb-component-search="CPU"]'),rows=Array.from(document.querySelectorAll('[data-pb-picker-pick]'));return {value:input&&input.value,focused:document.activeElement===input,vault:rows.filter(x=>x.dataset.pbResultSource==='vault').length,registry:rows.filter(x=>x.dataset.pbResultSource==='registry').length,first:rows[0]&&rows[0].dataset.pbResultSource,sourceForm:!!document.querySelector('[data-pb-slot-mode]')}})()`);
    check("BUILD component picker keeps focus and combines Vault-first with registry results",buildPicker.value==='i7 6700'&&buildPicker.focused&&buildPicker.vault===1&&buildPicker.registry>=1&&buildPicker.first==='vault'&&!buildPicker.sourceForm,JSON.stringify(buildPicker));
    const pickedVault=await evaluate(`(()=>{document.querySelector('[data-pb-result-source="vault"]').click();document.querySelector('[data-pb-acq-confirm]').click();const item=Store.all('inventory').find(x=>x.model==='Core i7-6700'&&x.purchasePrice===500),slot=Store.get('projects',state.pbId).slots.CPU,card=document.querySelector('[data-pb-slot="CPU"]');return {kind:slot.kind,id:slot.inventoryItemId,itemId:item&&item.id,status:item&&item.status,project:item&&item.assignedProjectId,card:card&&card.textContent}})()`);
    check("one result click assigns the exact Vault item and exposes its paid cost",pickedVault.kind==='INVENTORY'&&pickedVault.id===pickedVault.itemId&&pickedVault.status==='IN_BUILD'&&pickedVault.project&&pickedVault.card.includes('PAID')&&pickedVault.card.includes('500 RSD'),JSON.stringify(pickedVault));
    await evaluate(`document.querySelector('[data-pb-quick-price="CPU"]').click()`);await cdp.send("Input.insertText",{text:"750"});
    const priceEditor=await evaluate(`(()=>{const input=document.querySelector('[data-pb-quick-price-input="CPU"]');return {value:input&&input.value,focused:document.activeElement===input,fields:document.querySelectorAll('[data-pb-quick-price-input]').length}})()`);
    check("component price edit is a focused inline purchase-price field",priceEditor.value==='750'&&priceEditor.focused&&priceEditor.fields===1,JSON.stringify(priceEditor));
    const paidUpdate=await evaluate(`(()=>{document.querySelector('[data-pb-quick-price-save="CPU"]').click();const item=Store.all('inventory').find(x=>x.model==='Core i7-6700'&&x.assignedProjectId===state.pbId),basis=document.querySelector('[data-pb-cost="basis"]'),planned=document.querySelector('[data-pb-cost="planned"]'),final=document.querySelector('[data-pb-est-final]');return {price:item&&item.purchasePrice,card:document.querySelector('[data-pb-slot="CPU"]').textContent,basis:basis&&basis.textContent,planned:planned&&planned.textContent,final:final&&final.textContent}})()`);
    check("paid edit refreshes the card and keeps basis/planned/final totals separate",paidUpdate.price===750&&paidUpdate.card.includes('750 RSD')&&paidUpdate.basis.includes('9.750 RSD')&&paidUpdate.planned.includes('7.000 RSD')&&paidUpdate.final.includes('16.750 RSD'),JSON.stringify(paidUpdate));
    await evaluate(`(()=>{document.querySelector('[data-pb-edit-slot="GPU"]').click();const input=document.querySelector('[data-pb-component-search="GPU"]');input.value='rx 560';input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:720,height:900,deviceScaleFactor:1,mobile:false});
    const mobileBuildUi=await evaluate(`(()=>{const grid=document.querySelector('.pn-pb-grid'),picker=document.querySelector('.pn-pb-picker'),content=document.querySelector('.content'),pr=picker.getBoundingClientRect(),cr=content.getBoundingClientRect(),summary=document.querySelector('.pn-pb-stats');return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,badges:document.querySelectorAll('[data-pb-loadout] [data-pb-quality-badge]').length,pickerInside:pr.left>=cr.left&&pr.right<=cr.right+1,summaryColumns:getComputedStyle(summary).gridTemplateColumns.split(' ').length,sources:document.querySelectorAll('[data-pb-result-source]').length}})()`);
    check("BUILD cards, unified picker, and cost summary stay usable on mobile",!mobileBuildUi.overflow&&mobileBuildUi.columns===1&&mobileBuildUi.badges===3&&mobileBuildUi.pickerInside&&mobileBuildUi.summaryColumns===2&&mobileBuildUi.sources>0,JSON.stringify(mobileBuildUi));
    await evaluate(`document.querySelector('[data-pb-cancel-slot]').click()`);
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

    const caseFlow=await evaluate(`(()=>{const owned=Actions.addInventory({category:'CASE',manufacturer:'RAIDMAX',model:'VECTOR V219 ATX',purchaseDate:'2026-09-01',purchasePrice:4899,currency:'RSD',estimatedMarketValue:6000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''});document.querySelector('[data-pb-edit-slot="CASE"]').click();const picker={size:!!document.querySelector('[data-pb-case-size]'),commercialSearch:!!document.querySelector('[data-pb-component-search="CASE"]'),choices:Array.from(document.querySelectorAll('[data-pb-case-size] option')).map(x=>x.textContent),vault:document.querySelector('[data-pb-case-vault="'+owned.id+'"]')&&document.querySelector('[data-pb-case-vault="'+owned.id+'"]').textContent};const size=document.querySelector('[data-pb-case-size]'),name=document.querySelector('[data-pb-case-custom]'),cost=document.querySelector('[data-pb-case-cost]');size.value='atx-mid-tower';size.dispatchEvent(new Event('change',{bubbles:true}));name.value='Browser Custom Case';name.dispatchEvent(new Event('input',{bubbles:true}));cost.value='4000';cost.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-pb-save-case]').click();const planned=Store.get('projects',state.pbId).slots.CASE,plannedCard=document.querySelector('[data-pb-slot="CASE"]').textContent,moboFit=document.querySelector('[data-pb-compat]').textContent;document.querySelector('[data-pb-edit-slot="CASE"]').click();document.querySelector('[data-pb-case-vault="'+owned.id+'"]').click();const exact=Store.get('projects',state.pbId).slots.CASE,item=Store.get('inventory',owned.id),ownedCard=document.querySelector('[data-pb-slot="CASE"]').textContent;return {picker:picker,planned:{kind:planned.kind,size:planned.genericCaseSizeId,label:planned.label,cost:planned.cost,forms:planned.caps&&planned.caps.formFactors,card:plannedCard,fit:moboFit},owned:{slotId:exact.inventoryItemId,itemId:item.id,status:item.status,project:item.assignedProjectId,card:ownedCard}}})()`);
    check("BUILD CASE uses standard sizes and exact Vault cases instead of commercial search",caseFlow.picker.size&&!caseFlow.picker.commercialSearch&&caseFlow.picker.choices.includes('ATX Mid Tower')&&caseFlow.picker.choices.includes('Other / Custom')&&caseFlow.picker.vault.includes('4.899 RSD')&&caseFlow.planned.kind==='PLANNED'&&caseFlow.planned.size==='atx-mid-tower'&&caseFlow.planned.label==='Browser Custom Case'&&caseFlow.planned.cost===4000&&caseFlow.planned.forms.join(',')==='ITX,MATX,ATX'&&caseFlow.planned.card.includes('PLANNED COST')&&caseFlow.owned.slotId===caseFlow.owned.itemId&&caseFlow.owned.status==='IN_BUILD'&&caseFlow.owned.project&&caseFlow.owned.card.includes('VAULT · IN BUILD')&&caseFlow.owned.card.includes('4.899 RSD'),JSON.stringify(caseFlow));

    const pending=await evaluate(`(()=>{const part=Actions.addInventory({category:'GPU',manufacturer:'EVGA',model:'Browser Pending GPU',purchaseDate:'2026-09-01',purchasePrice:10000,currency:'RSD',estimatedMarketValue:15000,source:'OTHER',condition:'WORKING',status:'IN_STORAGE',notes:''}),before=dashboardStats('RSD'),sale=Actions.addSale({saleState:'PENDING',inventoryItemId:part.id,itemName:'EVGA Browser Pending GPU',saleDate:'2026-09-09',buyerPrice:14000,originalInvestment:10000,additionalCosts:0,currency:'RSD',saleType:'COMPONENT',category:'GPU',notes:''});state.route='sales';render();const after=dashboardStats('RSD');return {saleId:sale.id,status:Store.get('inventory',part.id).status,unchanged:before.totalRevenue===after.totalRevenue&&before.realizedProfit===after.realizedProfit,pending:!!document.querySelector('.pn-pending-sales-panel [data-id="'+sale.id+'"]'),completed:!!document.querySelector('.pn-completed-sales-panel'),action:!!document.querySelector('[data-complete-pending-sale="'+sale.id+'"]')}})()`);
    check("LEDGER renders a separate pending-sales section without realizing its money",pending.status==='LISTED'&&pending.unchanged&&pending.pending&&pending.completed&&pending.action,JSON.stringify(pending));
    await evaluate(`document.querySelector('[data-complete-pending-sale="${pending.saleId}"]').click()`);
    const completionForm=await evaluate(`({open:!!document.querySelector('form[data-entity-form="sale"]'),state:document.querySelector('[name="saleState"]')&&document.querySelector('[name="saleState"]').value})`);
    check("pending sale completion opens a review form preselected COMPLETED",completionForm.open&&completionForm.state==='COMPLETED',JSON.stringify(completionForm));
    await evaluate(`document.querySelector('[data-close-modal]').click()`);

    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1100,height:800,deviceScaleFactor:1,mobile:false});
    await evaluate(`state.route='rigbuild';state.rigDraft=newRigDraft('BROWSER TEST');state.rigDraft.slots.CPU={kind:'PLANNED',catalogType:'CPU',label:'',cost:0,originalPrice:0,currency:'RSD'};state.rigDraft.slots.MOBO={kind:'PLANNED',catalogType:'MOBO',label:'ASRock B450M-HDV',cost:0,originalPrice:0,currency:'RSD'};state.rigDraft.slots.RAM={kind:'PLANNED',catalogType:'RAM',label:'Corsair Vengeance LPX',cost:0,originalPrice:0,currency:'RSD',ram:{technology:'DDR4',dimmType:'UDIMM',moduleCount:3,perModuleCapacity:8,speed:3200,casLatency:16}};state.rigDraft.slots.CASE={kind:'PLANNED',catalogType:'CASE',label:'Fractal Design Meshify 2',cost:0,originalPrice:0,currency:'RSD'};render()`);
    const responsive=await evaluate(`(()=>{const row=document.querySelector('.rig-slot-row'),style=getComputedStyle(row);return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cols:style.gridTemplateColumns.split(' ').length}})()`);
    check("RIG BENCH stacks safely at 1100px without page clipping",!responsive.overflow&&responsive.cols>=2);
    const moboCanonical=await evaluate(`(()=>{const input=document.querySelector('[data-rig-catalog-item="MOBO"]'),row=input&&input.closest('.rig-slot-row'),status=document.querySelector('[data-bc-finding="MOBO_FORM_FACTOR"]');return {meta:row&&row.textContent,status:status&&status.dataset.bcLevel}})()`);
    check("RIG BENCH displays and checks canonical motherboard form factor",moboCanonical.meta.includes('FORM mATX · SOCKET AM4 · CHIPSET B450')&&moboCanonical.status==='PASS',JSON.stringify(moboCanonical));
    const ramV31=await evaluate(`(()=>{const row=document.querySelector('[data-rig-catalog-item="RAM"]').closest('.rig-slot-row'),modules=row.querySelector('[data-rig-ram-field="moduleCount"]'),rating=ramRating(state.rigDraft.slots.RAM.ram);return {v3:__PN_RAM_V3&&__PN_RAM_V3.version,v31:__PN_RAM_V31&&__PN_RAM_V31.version,three:Array.from(modules.options).some(o=>o.value==='3'),selected:modules.value,total:rating.totalCapacity,topology:rating.topologyScore,tier:rating.tier,warning:row.textContent.includes('Three-DIMM DDR4 is valid but asymmetric')}})()`);
    check("RIG BENCH loads RAM V3.1 with selectable and correctly scored three-DIMM DDR4",ramV31.v3==='PN_RAM_V3_2026'&&ramV31.v31==='PN_RAM_V3_1_2026'&&ramV31.three&&ramV31.selected==='3'&&ramV31.total===24&&ramV31.topology===75&&ramV31.tier==='RARE'&&ramV31.warning,JSON.stringify(ramV31));
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
    // The active quest is now pinned as the featured card at the top of its
    // own page too (not just the Dashboard widget), so .pn-roadto-feat is
    // expected here for the just-created ACTIVE quest.
    check("ROAD TO route opens a live quest page with its controls",quest.h1==='ROAD TO'&&quest.form&&quest.feat,JSON.stringify(quest));
    const questDetail=await evaluate(`(()=>{RoadToUI.focusId=Store.all('roadTo')[0].id;render();return {add:!!document.querySelector('[data-roadto-add]'),remove:!!document.querySelector('[data-roadto-remove]'),target:!!document.querySelector('[data-roadto-set-target]'),history:document.body.textContent.includes('+75.000 RSD'),open:document.querySelector('.pn-roadto-detail .panel-head h2')&&document.querySelector('.pn-roadto-detail .panel-head h2').textContent}})()`);
    check("ROAD TO detail shows fund controls and persisted history",questDetail.add&&questDetail.remove&&questDetail.target&&questDetail.history&&questDetail.open.includes('Browser RTX 5090'),JSON.stringify(questDetail));
    await evaluate(`document.querySelector('[data-route="myrig"]').click();MyRig.ensure();render()`);
    const rig=await evaluate(`(()=>{const h1=document.querySelector('h1')&&document.querySelector('h1').textContent;return {h1:h1,hero:!!document.querySelector('.pn-myrig-hero'),loadout:document.body.textContent.includes('COMPONENT LOADOUT'),compat:!!document.querySelector('[data-myrig-compat]')}})()`);
    check("MY RIG route opens the LEVIATHAN personal rig page",rig.h1==='MY RIG'&&rig.hero&&rig.loadout&&rig.compat,JSON.stringify(rig));
    await evaluate(`document.querySelector('[data-myrig-slot-edit="MOBO"]').click();document.querySelector('[data-myrig-catalog-search]').focus()`);
    await cdp.send("Input.insertText",{text:"b"});
    const oneLetter=await evaluate(`(()=>{const x=document.querySelector('[data-myrig-catalog-search]');return {value:x&&x.value,focused:document.activeElement===x}})()`);
    await cdp.send("Input.insertText",{text:"4"});
    await cdp.send("Input.insertText",{text:"5"});
    await cdp.send("Input.insertText",{text:"0"});
    await delay(150);
    const uninterruptedSearch=await evaluate(`(()=>{const x=document.querySelector('[data-myrig-catalog-search]');return {value:x&&x.value,focused:document.activeElement===x,matches:document.querySelectorAll('[data-myrig-catalog-pick]').length}})()`);
    check("MY RIG catalog search keeps focus and accepts uninterrupted typing",oneLetter.value==='b'&&oneLetter.focused&&uninterruptedSearch.value==='b450'&&uninterruptedSearch.focused&&uninterruptedSearch.matches>0,JSON.stringify({oneLetter,uninterruptedSearch}));
    await evaluate(`document.querySelector('[data-myrig-cancel-slot]').click()`);
    await evaluate(`MyRig.setSlot('GPU',{label:'NVIDIA RTX 3080 10GB',specs:'10 GB GDDR6X',purchasePrice:94000,purchaseDate:'2026-01-15',notes:'',vaultId:null});MyRig.setResale(132000);render()`);
    const rigVal=await evaluate(`(()=>{const s=document.querySelector('[data-myrig-slot="GPU"]');return !!s&&s.textContent.includes('NVIDIA RTX 3080 10GB')&&!document.querySelector('[data-myrig-value]')})()`);
    check("MY RIG slot persists in the live ledger with no value panel",rigVal);
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
