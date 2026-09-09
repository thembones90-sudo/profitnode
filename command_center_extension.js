"use strict";

/*
  PROFITNODE COMMAND CENTER v1
  Operational command deck for SHADEZY REPAIR SHOP.
*/

(function installProfitnodeCommandCenter(){

  function pnCommandActiveCapital(currency){
    const inventory = Store.all("inventory");
    const liveIds = new Set(inventory.filter(item=>item.status!=="SOLD").map(item=>item.id));

    const parts = inventory
      .filter(item=>item.status!=="SOLD")
      .reduce((sum,item)=>sum+convert(item.purchasePrice||0,item.currency,currency),0);

    const repairs = Store.all("repairs")
      .filter(repair=>liveIds.has(repair.inventoryItemId))
      .reduce((sum,repair)=>sum+convert(repair.cost||0,repair.currency,currency),0);

    return parts + repairs;
  }

  function pnCommandMonthProfit(currency){
    const month = new Date().toISOString().slice(0,7);

    return Store.all("sales")
      .filter(sale=>String(sale.saleDate||"").slice(0,7)===month)
      .reduce((sum,sale)=>sum+convert(saleDerived(sale).profit,sale.currency,currency),0);
  }

  function pnCommandTypeClass(type){
    const t = String(type||"").toUpperCase();
    if (t.includes("SALE") || t.includes("SOLD")) return "pn-signal-sale";
    if (t.includes("PURCHASE") || t.includes("DEAL")) return "pn-signal-hunt";
    if (t.includes("REPAIR")) return "pn-signal-repair";
    if (t.includes("RIG") || t.includes("PROJECT")) return "pn-signal-build";
    return "pn-signal-neutral";
  }

  function pnCommandOperationQueue(currency){
    const rows = [];

    Store.all("inventory")
      .filter(item=>item.status==="REPAIR")
      .forEach(item=>{
        rows.push({
          priority:100,
          html:
            '<div class="pn-op-row clickable" data-open-entity="inventory" data-id="'+item.id+'">'+
              '<span class="pn-op-node danger"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(item.manufacturer+" "+item.model)+'</b>'+
                '<span>REPAIR BAY \xb7 <span class="'+categoryColorClass(item.category)+'" style="color:var(--cat)">'+escHtml(item.category)+'</span></span>'+
              '</div>'+
              '<span class="chip chip-red-outline">REPAIR</span>'+
            '</div>'
        });
      });

    staleInventoryItems().forEach(entry=>{
      const item = entry.item;
      rows.push({
        priority:80 + Math.min(entry.daysHeld,99)/100,
        html:
          '<div class="pn-op-row clickable" data-open-entity="inventory" data-id="'+item.id+'">'+
            '<span class="pn-op-node warn"></span>'+
            '<div class="pn-op-main">'+
              '<b>'+escHtml(item.manufacturer+" "+item.model)+'</b>'+
              '<span>PARTS VAULT \xb7 '+entry.daysHeld+' DAYS HELD</span>'+
            '</div>'+
            '<span class="chip '+(entry.daysHeld>=STALE_THRESHOLDS.staleDays?"chip-red":"chip-amber-outline")+'">STALE</span>'+
          '</div>'
      });
    });

    Store.all("projects")
      .filter(project=>!["SOLD","PERSONAL","ABANDONED"].includes(project.status))
      .forEach(project=>{
        rows.push({
          priority:60,
          html:
            '<div class="pn-op-row clickable" data-open-entity="project" data-id="'+project.id+'">'+
              '<span class="pn-op-node live"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(project.name)+'</b>'+
                '<span>BUILDS \xb7 '+STATUS_LABEL(project.status)+'</span>'+
              '</div>'+
              '<span class="chip '+PROJECT_STATUS_META[project.status].chip+'">'+STATUS_LABEL(project.status)+'</span>'+
            '</div>'
        });
      });

    Store.all("rigs")
      .filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status))
      .forEach(rig=>{
        rows.push({
          priority:50,
          html:
            '<div class="pn-op-row clickable" data-open-rig="'+rig.id+'">'+
              '<span class="pn-op-node live"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(rig.family+(rig.variantName?" / "+rig.variantName:""))+'</b>'+
                '<span>RIG ASSEMBLY \xb7 '+STATUS_LABEL(rig.status)+'</span>'+
              '</div>'+
              '<span class="chip '+RIG_STATUS_META[rig.status].chip+'">'+STATUS_LABEL(rig.status)+'</span>'+
            '</div>'
        });
      });

    rows.sort((a,b)=>b.priority-a.priority);

    if (!rows.length){
      return '<div class="pn-command-empty">NO ACTIVE WARNINGS OR BUILD TASKS</div>';
    }

    return rows.slice(0,6).map(row=>row.html).join("");
  }

  function pnCommandRigSnapshot(currency){
    const rigs = Store.all("rigs")
      .filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status))
      .slice()
      .sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))
      .slice(0,2);

    if (!rigs.length){
      return '<div class="pn-command-empty">RIG ASSEMBLY IDLE</div>';
    }

    return rigs.map(rig=>{
      const d = rigDerived(rig);

      return '<div class="pn-rig-snapshot clickable" data-open-rig="'+rig.id+'">'+
        '<div>'+
          '<b>'+escHtml(rig.family)+'</b>'+
          '<span>'+escHtml(rig.variantName||"MAIN")+' \xb7 '+STATUS_LABEL(rig.status)+'</span>'+
        '</div>'+
        '<div class="pn-rig-money">'+
          '<b class="'+(d.profit>=0?"pos":"neg")+'">'+money(d.profit,rig.currency)+'</b>'+
          '<span>EXPECTED PROFIT</span>'+
        '</div>'+
      '</div>';
    }).join("");
  }

  function pnCommandHuntSnapshot(){
    const deals = Store.all("deals");

    if (!deals.length){
      return '<div class="pn-command-empty">NO ACQUISITION SIGNALS LOGGED</div>';
    }

    const ranked = deals
      .map(deal=>({deal:deal,score:dealScoreResolved(deal)}))
      .sort((a,b)=>b.score.score-a.score.score);

    const best = ranked[0];
    const label = dealScoreLabel(best.score.score);
    const d = dealDerived(best.deal);

    return '<div class="pn-hunt-card clickable" data-open-entity="deal" data-id="'+best.deal.id+'">'+
      '<div class="pn-hunt-kicker">TOP ACQUISITION SIGNAL</div>'+
      '<div class="pn-hunt-name">'+escHtml(best.deal.item)+'</div>'+
      '<div class="pn-hunt-meta">'+
        '<span class="chip '+label.chip+'">'+best.score.score+' \xb7 '+label.label+'</span>'+
        '<span>Saved '+money(d.amountSaved,best.deal.currency)+'</span>'+
      '</div>'+
    '</div>';
  }

  function pnCommandLatestSignals(){
    const signals = Store.all("timeline")
      .slice()
      .sort((a,b)=>String((b.date||"")+(b.createdAt||"")).localeCompare(String((a.date||"")+(a.createdAt||""))))
      .slice(0,6);

    if (!signals.length){
      return '<div class="pn-command-empty">NO SIGNALS RECORDED</div>';
    }

    return signals.map(signal=>{
      let openAttr = "";

      if (signal.relatedType && signal.relatedId){
        if (signal.relatedType==="rig"){
          openAttr = ' data-open-rig="'+signal.relatedId+'"';
        }
        else if (["project","inventory","deal","sale","repair"].includes(signal.relatedType)){
          openAttr = ' data-open-entity="'+signal.relatedType+'" data-id="'+signal.relatedId+'"';
        }
      }

      return '<div class="pn-signal-row'+(openAttr?' clickable':'')+'"'+openAttr+'>'+
        '<span class="pn-signal-line '+pnCommandTypeClass(signal.type)+'"></span>'+
        '<div class="pn-signal-main">'+
          '<b>'+escHtml(signal.title)+'</b>'+
          '<span>'+escHtml(signal.description||STATUS_LABEL(signal.type||"SIGNAL"))+'</span>'+
        '</div>'+
        '<time>'+fmtDate(signal.date,"short")+'</time>'+
      '</div>';
    }).join("");
  }

  function pnCommandCondition(currency){
    const inventory = Store.all("inventory");
    const stale = staleInventoryItems();
    const vault = inventory.filter(item=>item.status==="IN_STORAGE").length;
    const repairQueue = inventory.filter(item=>item.status==="REPAIR").length;
    const projectCount = Store.all("projects").filter(project=>!["SOLD","PERSONAL","ABANDONED"].includes(project.status)).length;
    const rigCount = Store.all("rigs").filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status)).length;
    const ratio = vault ? stale.length / vault : 0;

    const turnover =
      stale.length===0 ? {label:"CLEAR",tone:"good"} :
      ratio<=0.25 ? {label:"WATCH",tone:"warn"} :
      {label:"SLOW",tone:"bad"};

    return '<div class="pn-condition-list">'+
      '<div><span>STOCK TURNOVER</span><b class="'+turnover.tone+'">'+turnover.label+'</b></div>'+
      '<div><span>STALE INVENTORY</span><b class="'+(stale.length?"warn":"good")+'">'+stale.length+'</b></div>'+
      '<div><span>REPAIR QUEUE</span><b class="'+(repairQueue?"warn":"good")+'">'+repairQueue+'</b></div>'+
      '<div><span>OPEN BUILDS</span><b>'+(projectCount+rigCount)+'</b></div>'+
      '<div><span>ACTIVE CAPITAL</span><b>'+money(pnCommandActiveCapital(currency),currency)+'</b></div>'+
    '</div>';
  }

  function renderCommandCenter(){
    const currency = displayCurrency();
    const stats = dashboardStats(currency);
    const inventory = Store.all("inventory");
    const projects = Store.all("projects");
    const rigs = Store.all("rigs");
    const sales = Store.all("sales");

    const vaultCount = inventory.filter(item=>item.status==="IN_STORAGE").length;
    const repairCount = inventory.filter(item=>item.status==="REPAIR").length;
    const activeProjects = projects.filter(project=>!["SOLD","PERSONAL","ABANDONED"].includes(project.status)).length;
    const activeRigs = rigs.filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status)).length;
    const activeBuilds = activeProjects + activeRigs;
    const activeCapital = pnCommandActiveCapital(currency);
    const monthProfit = pnCommandMonthProfit(currency);

    const statusStrip =
      '<div class="pn-command-status">'+
        '<div class="pn-command-online"><span></span>SHOP ONLINE</div>'+
        '<div><span>LIVE BUILDS</span><b>'+activeBuilds+'</b></div>'+
        '<div><span>PARTS IN VAULT</span><b>'+vaultCount+'</b></div>'+
        '<div><span>REPAIR QUEUE</span><b>'+repairCount+'</b></div>'+
        '<div><span>CAPITAL DEPLOYED</span><b>'+money(activeCapital,currency)+'</b></div>'+
      '</div>';

    const hero =
      '<div class="pn-command-hero">'+
        '<section class="pn-profit-core">'+
          '<div class="pn-module-label">REALIZED PROFIT</div>'+
          '<div class="pn-profit-value '+(stats.realizedProfit>=0?"pos":"neg")+'">'+money(stats.realizedProfit,currency)+'</div>'+
          '<div class="pn-profit-sub">'+
            '<span><b class="'+(monthProfit>=0?"pos":"neg")+'">'+money(monthProfit,currency)+'</b> THIS MONTH</span>'+
            '<span><b>'+pct(stats.lifetimeROI)+'</b> LIFETIME ROI</span>'+
            '<span><b>'+stats.pcsSold+'</b> RIGS SOLD</span>'+
          '</div>'+
          '<div class="pn-profit-node-grid"></div>'+
        '</section>'+

        '<div class="pn-command-kpi-stack">'+
          '<div class="pn-terminal-kpi"><span>CAPITAL IN STOCK</span><b>'+money(activeCapital,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>MARKET VALUE</span><b>'+money(stats.currentInventoryValue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>TOTAL REVENUE</span><b>'+money(stats.totalRevenue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>MONEY SAVED</span><b>'+money(stats.totalMoneySaved,currency)+'</b></div>'+
        '</div>'+
      '</div>';

    const pulseAndCondition =
      '<div class="pn-command-grid pn-command-grid-main">'+
        '<section class="panel pn-command-panel pn-profit-pulse">'+
          '<div class="panel-head"><h2>PROFIT PULSE</h2><span class="pn-terminal-state">ALL TIME \xb7 '+currency+'</span></div>'+
          '<div class="panel-body">'+renderChart()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>SHOP CONDITION</h2><span class="pn-terminal-state">LIVE</span></div>'+
          '<div class="panel-body">'+pnCommandCondition(currency)+'</div>'+
        '</section>'+
      '</div>';

    const operations =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>OPERATIONS QUEUE</h2><span class="pn-terminal-state">PRIORITY FEED</span></div>'+
          '<div class="panel-body pn-no-pad">'+pnCommandOperationQueue(currency)+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>RIG ASSEMBLY</h2><button class="pn-command-link" data-route="rigbuild">OPEN ASSEMBLY</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCommandRigSnapshot(currency)+'</div>'+
        '</section>'+
      '</div>';

    const signalsAndHunt =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>LATEST SIGNALS</h2><button class="pn-command-link" data-route="history">OPEN ARCHIVE</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCommandLatestSignals()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>THE HUNT</h2><button class="pn-command-link" data-route="deals">OPEN HUNT</button></div>'+
          '<div class="panel-body">'+pnCommandHuntSnapshot()+'</div>'+
        '</section>'+
      '</div>';

    return pageHeader("Dashboard","Shop status and lifetime performance","")+
      '<div class="content pn-command-content">'+
        statusStrip+
        hero+
        pulseAndCondition+
        operations+
        signalsAndHunt+
      '</div>';
  }

  renderDashboard = renderCommandCenter;

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(route=>route.key==="dashboard");
    if (route) route.render = renderCommandCenter;
  }

  const style = document.createElement("style");
  style.textContent = `
  .pn-command-content{
    position:relative;
    isolation:isolate;
  }
  .pn-command-content:before{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    z-index:-1;
    opacity:.20;
    background:
      linear-gradient(90deg,transparent 49.7%,rgba(179,58,255,.08) 50%,transparent 50.3%),
      linear-gradient(0deg,transparent 49.7%,rgba(255,55,104,.05) 50%,transparent 50.3%);
    background-size:96px 96px;
    mask-image:linear-gradient(to bottom,rgba(0,0,0,.8),transparent 82%);
  }

  .pn-command-status{
    display:grid;
    grid-template-columns:1.05fr repeat(4,1fr);
    border:1px solid var(--border);
    background:rgba(13,10,17,.78);
    margin-bottom:14px;
    box-shadow:0 12px 34px rgba(0,0,0,.16);
  }
  .pn-command-status>div{
    min-height:48px;
    padding:9px 13px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    border-right:1px solid var(--border);
  }
  .pn-command-status>div:last-child{border-right:0}
  .pn-command-status span{
    font-size:9px;
    letter-spacing:.09em;
    color:var(--muted);
    font-weight:800;
  }
  .pn-command-status b{
    font-family:var(--mono);
    font-size:11px;
  }
  .pn-command-online{
    justify-content:flex-start !important;
    color:var(--green);
    font-weight:900;
    font-size:10px;
    letter-spacing:.09em;
  }
  .pn-command-online span{
    width:7px;
    height:7px;
    border-radius:50%;
    background:var(--green);
    box-shadow:0 0 12px var(--green);
  }

  .pn-command-hero{
    display:grid;
    grid-template-columns:minmax(0,1.65fr) minmax(330px,.9fr);
    gap:14px;
    margin-bottom:14px;
  }
  .pn-profit-core{
    position:relative;
    overflow:hidden;
    min-height:190px;
    padding:22px 24px;
    border:1px solid rgba(170,58,255,.48);
    background:
      linear-gradient(135deg,rgba(95,13,109,.22),rgba(14,11,19,.88) 56%),
      rgba(12,9,16,.88);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.025),
      0 18px 50px rgba(0,0,0,.20);
  }
  .pn-profit-core:after{
    content:"";
    position:absolute;
    width:230px;
    height:230px;
    right:-85px;
    top:-92px;
    border:1px solid rgba(196,72,255,.22);
    transform:rotate(45deg);
    box-shadow:0 0 70px rgba(128,27,171,.12);
  }
  .pn-module-label{
    font-size:10px;
    font-weight:900;
    letter-spacing:.13em;
    color:#bb72e8;
  }
  .pn-profit-value{
    position:relative;
    z-index:2;
    margin-top:12px;
    font-family:var(--mono);
    font-size:clamp(34px,4vw,58px);
    line-height:1;
    letter-spacing:-.055em;
    font-weight:900;
    text-shadow:0 0 28px rgba(128,255,160,.10);
  }
  .pn-profit-value.pos,.pn-profit-sub b.pos{color:var(--green)}
  .pn-profit-value.neg,.pn-profit-sub b.neg{color:var(--red)}
  .pn-profit-sub{
    position:relative;
    z-index:2;
    display:flex;
    flex-wrap:wrap;
    gap:20px;
    margin-top:20px;
    padding-top:14px;
    border-top:1px solid rgba(255,255,255,.07);
  }
  .pn-profit-sub span{
    display:flex;
    flex-direction:column;
    gap:3px;
    color:var(--muted);
    font-size:9px;
    letter-spacing:.07em;
    font-weight:800;
  }
  .pn-profit-sub b{
    color:var(--text);
    font-family:var(--mono);
    font-size:13px;
    letter-spacing:0;
  }
  .pn-profit-node-grid{
    position:absolute;
    inset:auto 20px 18px auto;
    width:88px;
    height:48px;
    opacity:.35;
    background:
      radial-gradient(circle at 8px 8px,#b43cff 0 2px,transparent 3px),
      radial-gradient(circle at 44px 23px,#ff3a69 0 2px,transparent 3px),
      radial-gradient(circle at 78px 10px,#b43cff 0 2px,transparent 3px),
      linear-gradient(25deg,transparent 48%,rgba(184,62,255,.45) 49%,rgba(184,62,255,.45) 51%,transparent 52%);
  }

  .pn-command-kpi-stack{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
  }
  .pn-terminal-kpi{
    min-height:90px;
    padding:14px;
    border:1px solid var(--border);
    border-top:2px solid rgba(167,55,236,.58);
    background:rgba(13,10,17,.82);
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:8px;
  }
  .pn-terminal-kpi span{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }
  .pn-terminal-kpi b{
    font-family:var(--mono);
    font-size:17px;
  }

  .pn-command-grid{
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    gap:14px;
    margin-bottom:14px;
  }
  .pn-command-grid-main{
    grid-template-columns:minmax(0,1.8fr) minmax(285px,.7fr);
  }
  .pn-command-panel{
    background:rgba(14,11,18,.84);
    backdrop-filter:blur(3px);
    box-shadow:0 12px 34px rgba(0,0,0,.15);
  }
  .pn-command-panel .panel-head{
    min-height:42px;
  }
  .pn-command-panel .panel-head h2{
    letter-spacing:.06em;
  }
  .pn-terminal-state{
    color:#9e59cf;
    font-family:var(--mono);
    font-size:9px;
    letter-spacing:.08em;
  }
  .pn-no-pad{padding:0 !important}

  .pn-condition-list{
    display:flex;
    flex-direction:column;
  }
  .pn-condition-list>div{
    display:flex;
    align-items:center;
    justify-content:space-between;
    min-height:41px;
    gap:14px;
    border-bottom:1px solid var(--border);
  }
  .pn-condition-list>div:last-child{border-bottom:0}
  .pn-condition-list span{
    color:var(--muted);
    font-size:9px;
    font-weight:800;
    letter-spacing:.07em;
  }
  .pn-condition-list b{
    font-family:var(--mono);
    font-size:11px;
  }
  .pn-condition-list b.good{color:var(--green)}
  .pn-condition-list b.warn{color:var(--amber)}
  .pn-condition-list b.bad{color:var(--red)}

  .pn-op-row,
  .pn-rig-snapshot,
  .pn-signal-row{
    min-height:56px;
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px 14px;
    border-bottom:1px solid var(--border);
    transition:background .14s ease,border-color .14s ease;
  }
  .pn-op-row:last-child,
  .pn-rig-snapshot:last-child,
  .pn-signal-row:last-child{border-bottom:0}
  .pn-op-row.clickable:hover,
  .pn-rig-snapshot.clickable:hover,
  .pn-signal-row.clickable:hover{
    background:rgba(151,54,211,.07);
  }
  .pn-op-node{
    flex:0 0 auto;
    width:7px;
    height:7px;
    border-radius:50%;
    background:var(--muted);
  }
  .pn-op-node.live{
    background:#a846df;
    box-shadow:0 0 10px rgba(168,70,223,.65);
  }
  .pn-op-node.warn{
    background:var(--amber);
    box-shadow:0 0 10px rgba(255,190,55,.35);
  }
  .pn-op-node.danger{
    background:var(--red);
    box-shadow:0 0 10px rgba(255,55,85,.38);
  }
  .pn-op-main,
  .pn-signal-main{
    flex:1 1 auto;
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:4px;
  }
  .pn-op-main b,
  .pn-signal-main b{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:11px;
  }
  .pn-op-main span,
  .pn-signal-main span{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:var(--muted);
    font-size:9px;
    letter-spacing:.05em;
  }

  .pn-rig-snapshot{
    justify-content:space-between;
  }
  .pn-rig-snapshot>div:first-child{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:4px;
  }
  .pn-rig-snapshot>div:first-child b{
    font-size:12px;
  }
  .pn-rig-snapshot>div:first-child span{
    color:var(--muted);
    font-size:9px;
  }
  .pn-rig-money{
    text-align:right;
    display:flex;
    flex-direction:column;
    gap:3px;
  }
  .pn-rig-money b{
    font-family:var(--mono);
    font-size:12px;
  }
  .pn-rig-money b.pos{color:var(--green)}
  .pn-rig-money b.neg{color:var(--red)}
  .pn-rig-money span{
    color:var(--muted);
    font-size:8px;
    letter-spacing:.07em;
  }

  .pn-signal-line{
    width:3px;
    height:31px;
    border-radius:2px;
    background:var(--muted);
  }
  .pn-signal-sale{background:var(--green)}
  .pn-signal-hunt{background:var(--amber)}
  .pn-signal-repair{background:var(--red)}
  .pn-signal-build{background:#a846df}
  .pn-signal-neutral{background:#665d70}
  .pn-signal-row time{
    color:var(--muted);
    font-family:var(--mono);
    font-size:9px;
    white-space:nowrap;
  }

  .pn-hunt-card{
    min-height:142px;
    padding:16px;
    border:1px solid rgba(171,62,232,.26);
    background:
      linear-gradient(135deg,rgba(113,26,143,.16),rgba(17,13,21,.52));
    display:flex;
    flex-direction:column;
    justify-content:center;
    transition:border-color .14s ease,background .14s ease;
  }
  .pn-hunt-card:hover{
    border-color:rgba(198,80,255,.48);
    background:linear-gradient(135deg,rgba(113,26,143,.22),rgba(17,13,21,.62));
  }
  .pn-hunt-kicker{
    color:#a965d1;
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }
  .pn-hunt-name{
    margin-top:8px;
    font-size:18px;
    font-weight:900;
  }
  .pn-hunt-meta{
    margin-top:14px;
    display:flex;
    align-items:center;
    gap:12px;
    flex-wrap:wrap;
    color:var(--muted);
    font-size:10px;
  }

  .pn-command-link{
    border:0;
    background:transparent;
    color:#a965d1;
    font:inherit;
    font-family:var(--mono);
    font-size:9px;
    font-weight:900;
    letter-spacing:.06em;
    cursor:pointer;
  }
  .pn-command-link:hover{color:#d38fff}

  .pn-command-empty{
    min-height:76px;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:14px;
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.09em;
  }

  @media(max-width:1180px){
    .pn-command-status{
      grid-template-columns:repeat(2,1fr);
    }
    .pn-command-status>div{
      border-bottom:1px solid var(--border);
    }
    .pn-command-hero{
      grid-template-columns:1fr;
    }
    .pn-command-grid-main{
      grid-template-columns:1fr;
    }
  }

  @media(max-width:820px){
    .pn-command-grid{
      grid-template-columns:1fr;
    }
    .pn-command-kpi-stack{
      grid-template-columns:1fr 1fr;
    }
  }

  @media(max-width:600px){
    .pn-command-status,
    .pn-command-kpi-stack{
      grid-template-columns:1fr;
    }
    .pn-profit-sub{
      flex-direction:column;
      gap:10px;
    }
  }
  `;
  document.head.appendChild(style);
})();
