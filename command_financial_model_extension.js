"use strict";

/*
  PROFITNODE COMMAND Financial Model v1

  Financial doctrine:
  TOTAL SPENT = completed sales cost basis + current unsold capital

  This avoids double-counting sold inventory while still including legacy
  manual sales and cash currently tied up in the PARTS VAULT.
*/

(function installCommandFinancialModel(){

  function pnCmdActiveCapital(currency){
    const inventory = Store.all("inventory");
    const liveIds = new Set(
      inventory
        .filter(item=>item.status!=="SOLD")
        .map(item=>item.id)
    );

    const parts = inventory
      .filter(item=>item.status!=="SOLD")
      .reduce((sum,item)=>sum+convert(item.purchasePrice||0,item.currency,currency),0);

    const repairs = Store.all("repairs")
      .filter(repair=>liveIds.has(repair.inventoryItemId))
      .reduce((sum,repair)=>sum+convert(repair.cost||0,repair.currency,currency),0);

    return parts + repairs;
  }

  function pnCmdSoldCostBasis(currency){
    return Store.all("sales")
      .reduce((sum,sale)=>sum+convert(saleDerived(sale).totalCost||0,sale.currency,currency),0);
  }

  function pnCmdTotalSpent(currency){
    return pnCmdSoldCostBasis(currency) + pnCmdActiveCapital(currency);
  }

  function pnCmdMonthProfit(currency){
    const month = new Date().toISOString().slice(0,7);

    return Store.all("sales")
      .filter(sale=>String(sale.saleDate||"").slice(0,7)===month)
      .reduce((sum,sale)=>sum+convert(saleDerived(sale).profit||0,sale.currency,currency),0);
  }

  function pnCmdDaysSince(date){
    if (!date) return null;
    return Calc.daysHeld(date,todayISO());
  }

  function pnCmdOperationQueue(){
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
                '<span>REPAIR BAY \u00B7 REQUIRES ATTENTION</span>'+
              '</div>'+
              '<span class="chip chip-red-outline">REPAIR</span>'+
            '</div>'
        });
      });

    staleInventoryItems().forEach(entry=>{
      const item = entry.item;
      rows.push({
        priority:90 + Math.min(entry.daysHeld,99)/100,
        html:
          '<div class="pn-op-row clickable" data-open-entity="inventory" data-id="'+item.id+'">'+
            '<span class="pn-op-node warn"></span>'+
            '<div class="pn-op-main">'+
              '<b>'+escHtml(item.manufacturer+" "+item.model)+'</b>'+
              '<span>PARTS VAULT \u00B7 '+entry.daysHeld+' DAYS HELD</span>'+
            '</div>'+
            '<span class="chip '+(entry.daysHeld>=STALE_THRESHOLDS.staleDays?"chip-red":"chip-amber-outline")+'">STALE</span>'+
          '</div>'
      });
    });

    Store.all("inventory")
      .filter(item=>item.status==="LISTED")
      .forEach(item=>{
        const days = pnCmdDaysSince(item.purchaseDate);
        if (days==null || days<STALE_THRESHOLDS.warnDays) return;

        rows.push({
          priority:75,
          html:
            '<div class="pn-op-row clickable" data-open-entity="inventory" data-id="'+item.id+'">'+
              '<span class="pn-op-node warn"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(item.manufacturer+" "+item.model)+'</b>'+
                '<span>LISTED \u00B7 '+days+' DAYS OWNED</span>'+
              '</div>'+
              '<span class="chip chip-amber-outline">WATCH</span>'+
            '</div>'
        });
      });

    Store.all("projects")
      .filter(project=>project.status==="TESTING")
      .forEach(project=>{
        rows.push({
          priority:70,
          html:
            '<div class="pn-op-row clickable" data-open-entity="project" data-id="'+project.id+'">'+
              '<span class="pn-op-node warn"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(project.name)+'</b>'+
                '<span>BUILDS \u00B7 TESTING</span>'+
              '</div>'+
              '<span class="chip '+PROJECT_STATUS_META[project.status].chip+'">TESTING</span>'+
            '</div>'
        });
      });

    Store.all("projects")
      .filter(project=>project.status==="LISTED")
      .forEach(project=>{
        const days = pnCmdDaysSince(project.startDate);
        if (days==null || days<STALE_THRESHOLDS.warnDays) return;

        rows.push({
          priority:65,
          html:
            '<div class="pn-op-row clickable" data-open-entity="project" data-id="'+project.id+'">'+
              '<span class="pn-op-node warn"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(project.name)+'</b>'+
                '<span>BUILDS \u00B7 LISTED \u00B7 '+days+' DAYS OPEN</span>'+
              '</div>'+
              '<span class="chip chip-amber-outline">WATCH</span>'+
            '</div>'
        });
      });

    Store.all("rigs")
      .filter(rig=>rig.status==="TEST_BUILD")
      .forEach(rig=>{
        rows.push({
          priority:60,
          html:
            '<div class="pn-op-row clickable" data-open-rig="'+rig.id+'">'+
              '<span class="pn-op-node warn"></span>'+
              '<div class="pn-op-main">'+
                '<b>'+escHtml(rig.family+(rig.variantName?" / "+rig.variantName:""))+'</b>'+
                '<span>RIG BENCH \u00B7 TEST BUILD</span>'+
              '</div>'+
              '<span class="chip '+RIG_STATUS_META[rig.status].chip+'">TEST BUILD</span>'+
            '</div>'
        });
      });

    rows.sort((a,b)=>b.priority-a.priority);

    return rows.length
      ? rows.slice(0,6).map(row=>row.html).join("")
      : '<div class="pn-command-empty">NO INTERVENTION REQUIRED</div>';
  }

  function pnCmdRigSnapshot(){
    const rigs = Store.all("rigs")
      .filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status))
      .slice()
      .sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))
      .slice(0,2);

    if (!rigs.length){
      return '<div class="pn-command-empty">RIG BENCH IDLE</div>';
    }

    return rigs.map(rig=>{
      const d = rigDerived(rig);

      return '<div class="pn-rig-snapshot clickable" data-open-rig="'+rig.id+'">'+
        '<div>'+
          '<b>'+escHtml(rig.family)+'</b>'+
          '<span>'+escHtml(rig.variantName||"MAIN")+' \u00B7 '+STATUS_LABEL(rig.status)+'</span>'+
        '</div>'+
        '<div class="pn-rig-money">'+
          '<b class="'+(d.profit>=0?"pos":"neg")+'">'+money(d.profit,rig.currency)+'</b>'+
          '<span>EXPECTED PROFIT</span>'+
        '</div>'+
      '</div>';
    }).join("");
  }

  function pnCmdSignalClass(type){
    const t = String(type||"").toUpperCase();
    if (t.includes("SALE") || t.includes("SOLD")) return "pn-signal-sale";
    if (t.includes("PURCHASE") || t.includes("DEAL")) return "pn-signal-hunt";
    if (t.includes("REPAIR")) return "pn-signal-repair";
    if (t.includes("RIG") || t.includes("PROJECT")) return "pn-signal-build";
    return "pn-signal-neutral";
  }

  function pnCmdLatestSignals(){
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
        '<span class="pn-signal-line '+pnCmdSignalClass(signal.type)+'"></span>'+
        '<div class="pn-signal-main">'+
          '<b>'+escHtml(signal.title)+'</b>'+
          '<span>'+escHtml(signal.description||STATUS_LABEL(signal.type||"SIGNAL"))+'</span>'+
        '</div>'+
        '<time>'+fmtDate(signal.date,"short")+'</time>'+
      '</div>';
    }).join("");
  }

  function pnCmdHuntSnapshot(){
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
        '<span class="chip '+label.chip+'">'+best.score.score+' \u00B7 '+label.label+'</span>'+
        '<span>Saved '+money(d.amountSaved,best.deal.currency)+'</span>'+
      '</div>'+
    '</div>';
  }

  function pnCmdCondition(currency,activeCapital,marketValue,activeBuilds,repairCount){
    const vault = Store.all("inventory").filter(item=>item.status==="IN_STORAGE");
    const stale = staleInventoryItems();
    const staleRate = vault.length ? stale.length / vault.length * 100 : 0;
    const coverage = activeCapital>0 ? marketValue / activeCapital * 100 : null;

    const turnover =
      staleRate===0 ? {label:"CLEAR",tone:"good"} :
      staleRate<=25 ? {label:"WATCH",tone:"warn"} :
      {label:"SLOW",tone:"bad"};

    const repairLoad =
      repairCount===0 ? {label:"CLEAR",tone:"good"} :
      repairCount<=2 ? {label:"LIGHT",tone:"warn"} :
      {label:"HEAVY",tone:"bad"};

    const buildLoad =
      activeBuilds===0 ? {label:"IDLE",tone:"good"} :
      activeBuilds<=3 ? {label:"ACTIVE",tone:"warn"} :
      {label:"HEAVY",tone:"bad"};

    return '<div class="pn-condition-list">'+
      '<div><span>STOCK TURNOVER</span><b class="'+turnover.tone+'">'+turnover.label+'</b></div>'+
      '<div><span>STALE RATE</span><b class="'+(staleRate?"warn":"good")+'">'+staleRate.toFixed(1)+'%</b></div>'+
      '<div><span>VALUE COVERAGE</span><b>'+(coverage==null?"-":coverage.toFixed(1)+"%")+'</b></div>'+
      '<div><span>REPAIR LOAD</span><b class="'+repairLoad.tone+'">'+repairLoad.label+'</b></div>'+
      '<div><span>BUILD LOAD</span><b class="'+buildLoad.tone+'">'+buildLoad.label+'</b></div>'+
    '</div>';
  }

  function pnCmdPriority(activeBuilds,activeRigs,vaultCount,repairCount,staleCount){
    if (repairCount){
      return {tone:"danger",code:"RPR",title:"REPAIR INTERVENTION",detail:repairCount===1?"1 part currently requires bench attention":repairCount+" parts currently require bench attention",route:"repairs",action:"OPEN REPAIR BAY"};
    }
    if (staleCount){
      return {tone:"warn",code:"STL",title:"STALE STOCK REQUIRES ACTION",detail:staleCount+" vault item"+(staleCount===1?" has":"s have")+" crossed the holding threshold",route:"inventory",action:"REVIEW VAULT"};
    }
    if (activeRigs){
      return {tone:"active",code:"BLD",title:"BUILD PIPELINE ACTIVE",detail:activeRigs+" live rig"+(activeRigs===1?" is":"s are")+" currently on the bench",route:"rigbuild",action:"OPEN RIG BENCH"};
    }
    if (activeBuilds){
      return {tone:"active",code:"OPS",title:"BUILD OPERATIONS ACTIVE",detail:activeBuilds+" active build record"+(activeBuilds===1?"":"s")+" in the current pipeline",route:"projects",action:"OPEN BUILDS"};
    }
    if (vaultCount){
      return {tone:"good",code:"RDY",title:"NO CRITICAL ACTION",detail:vaultCount+" stored part"+(vaultCount===1?" is":"s are")+" available and the intervention queue is clear",route:"inventory",action:"OPEN VAULT"};
    }
    return {tone:"good",code:"CLR",title:"COMMAND CLEAR",detail:"No active build, repair, or stale-stock intervention is currently required",route:"inventory",action:"OPEN VAULT"};
  }

  function renderCommandFinancialModel(){
    const currency = displayCurrency();
    const stats = dashboardStats(currency);
    const inventory = Store.all("inventory");
    const projects = Store.all("projects");
    const rigs = Store.all("rigs");

    const vaultCount = inventory.filter(item=>item.status==="IN_STORAGE").length;
    const repairCount = inventory.filter(item=>item.status==="REPAIR").length;
    const staleCount = staleInventoryItems().length;

    const activeProjects = projects
      .filter(project=>!["SOLD","PERSONAL","ABANDONED"].includes(project.status))
      .length;

    const activeRigs = rigs
      .filter(rig=>!["SOLD","DISASSEMBLED"].includes(rig.status))
      .length;

    const activeBuilds = activeProjects + activeRigs;
    const activeCapital = pnCmdActiveCapital(currency);
    const totalSpent = pnCmdTotalSpent(currency);
    const marketValue = stats.currentInventoryValue;
    const unrealizedProfit = marketValue - activeCapital;
    const monthProfit = pnCmdMonthProfit(currency);
    const priority = pnCmdPriority(activeBuilds,activeRigs,vaultCount,repairCount,staleCount);

    const statusStrip =
      '<div class="pn-command-status pn-command-telemetry">'+
        '<div class="pn-command-online"><i class="pn-telemetry-node"></i><span>SHOP ONLINE</span><b>LIVE</b></div>'+
        '<div class="pn-telemetry-cell"><i>BLD</i><span>LIVE BUILDS</span><b>'+activeBuilds+'</b></div>'+
        '<div class="pn-telemetry-cell"><i>VLT</i><span>PARTS IN VAULT</span><b>'+vaultCount+'</b></div>'+
        '<div class="pn-telemetry-cell '+(repairCount?'is-danger':'')+'"><i>RPR</i><span>REPAIR QUEUE</span><b>'+repairCount+'</b></div>'+
        '<div class="pn-telemetry-cell '+(staleCount?'is-warn':'')+'"><i>STL</i><span>STALE ITEMS</span><b>'+staleCount+'</b></div>'+
      '</div>';

    const commandPriority =
      '<section class="pn-command-priority is-'+priority.tone+'">'+
        '<div class="pn-priority-code"><i></i><b>'+priority.code+'</b></div>'+
        '<div class="pn-priority-copy"><span>COMMAND PRIORITY</span><strong>'+priority.title+'</strong><em>'+priority.detail+'</em></div>'+
        '<button class="pn-command-link" data-route="'+priority.route+'">'+priority.action+'</button>'+
      '</section>';

    const hero =
      '<div class="pn-command-hero pn-command-hero-finance">'+
        '<section class="pn-profit-core">'+
          '<div class="pn-profit-core-head"><div class="pn-module-label">REALIZED PROFIT</div><span>SETTLED PERFORMANCE</span></div>'+
          '<div class="pn-profit-value '+(stats.realizedProfit>=0?"pos":"neg")+'">'+money(stats.realizedProfit,currency)+'</div>'+
          '<div class="pn-profit-sub">'+
            '<span><b class="'+(monthProfit>=0?"pos":"neg")+'">'+money(monthProfit,currency)+'</b> THIS MONTH</span>'+
            '<span><b>'+pct(stats.lifetimeROI)+'</b> LIFETIME ROI</span>'+
            '<span><b>'+stats.pcsSold+'</b> RIGS SOLD</span>'+
          '</div>'+
          '<div class="pn-profit-node-grid"></div>'+
        '</section>'+

        '<div class="pn-command-kpi-stack pn-financial-matrix">'+
          '<div class="pn-terminal-kpi is-major"><i>OUT</i><span>TOTAL SPENT</span><b>'+money(totalSpent,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi is-major"><i>IN</i><span>TOTAL REVENUE</span><b>'+money(stats.totalRevenue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><i>STK</i><span>CAPITAL IN STOCK</span><b>'+money(activeCapital,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><i>MKT</i><span>MARKET VALUE</span><b>'+money(marketValue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><i>UPL</i><span>UNREALIZED PROFIT</span><b class="'+(unrealizedProfit>=0?"pn-money-pos":"pn-money-neg")+'">'+money(unrealizedProfit,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><i>SAV</i><span>MONEY SAVED</span><b>'+money(stats.totalMoneySaved,currency)+'</b></div>'+
        '</div>'+
      '</div>';

    const pulseAndCondition =
      '<div class="pn-command-grid pn-command-grid-main">'+
        '<section class="panel pn-command-panel pn-command-panel-primary pn-profit-pulse">'+
          '<div class="panel-head"><h2>PROFIT PULSE</h2><span class="pn-terminal-state">ALL TIME \u00B7 '+currency+'</span></div>'+
          '<div class="panel-body">'+renderChart()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel pn-command-panel-operational">'+
          '<div class="panel-head"><h2>SHOP CONDITION</h2><span class="pn-terminal-state">LIVE</span></div>'+
          '<div class="panel-body">'+pnCmdCondition(currency,activeCapital,marketValue,activeBuilds,repairCount)+'</div>'+
        '</section>'+
      '</div>';

    const operations =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel pn-command-panel-operational">'+
          '<div class="panel-head"><h2>OPERATIONS QUEUE</h2><span class="pn-terminal-state">INTERVENTION ONLY</span></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdOperationQueue()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel pn-command-panel-operational">'+
          '<div class="panel-head"><h2>RIG BENCH</h2><button class="pn-command-link" data-route="rigbuild">OPEN BENCH</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdRigSnapshot()+'</div>'+
        '</section>'+
      '</div>';

    const signalsAndHunt =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel pn-command-panel-utility">'+
          '<div class="panel-head"><h2>LATEST SIGNALS</h2><button class="pn-command-link" data-route="history">OPEN ARCHIVE</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdLatestSignals()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel pn-command-panel-utility">'+
          '<div class="panel-head"><h2>THE HUNT</h2><button class="pn-command-link" data-route="deals">OPEN HUNT</button></div>'+
          '<div class="panel-body">'+pnCmdHuntSnapshot()+'</div>'+
        '</section>'+
      '</div>';

    return pageHeader("Dashboard","Shop status and lifetime performance","")+
      '<div class="content pn-command-content">'+
        statusStrip+
        commandPriority+
        hero+
        pulseAndCondition+
        operations+
        signalsAndHunt+
      '</div>';
  }

  renderDashboard = renderCommandFinancialModel;

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(route=>route.key==="dashboard");
    if (route) route.render = renderCommandFinancialModel;
  }

  const style = document.createElement("style");
  style.textContent = `
    .pn-command-content:before{
      opacity:.12;
      background-size:120px 120px;
    }

    .pn-command-telemetry{
      position:relative;
      margin-bottom:10px;
      border-color:rgba(187,194,202,.20);
      background:linear-gradient(180deg,rgba(26,23,30,.90),rgba(11,9,14,.92));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 12px 26px rgba(0,0,0,.18);
    }
    .pn-command-telemetry:before{
      content:"";
      position:absolute;
      left:0;right:0;top:-1px;height:1px;
      background:linear-gradient(90deg,rgba(216,221,225,.62),rgba(157,61,218,.42) 45%,transparent 90%);
    }
    .pn-command-telemetry>div{
      min-height:44px;
      padding:7px 12px;
      justify-content:flex-start;
      border-right-color:rgba(187,194,202,.13);
    }
    .pn-command-telemetry .pn-telemetry-cell i{
      display:grid;
      place-items:center;
      width:26px;height:20px;
      border:1px solid rgba(190,196,204,.22);
      color:#aeb4bc;
      font-family:var(--mono);
      font-size:7px;
      font-style:normal;
      letter-spacing:.08em;
    }
    .pn-command-telemetry .pn-telemetry-cell span{flex:1}
    .pn-command-telemetry .pn-telemetry-cell b{font-size:13px;color:#e6e8eb}
    .pn-command-telemetry .pn-telemetry-cell.is-warn i,
    .pn-command-telemetry .pn-telemetry-cell.is-warn b{color:var(--amber);border-color:rgba(255,190,55,.34)}
    .pn-command-telemetry .pn-telemetry-cell.is-danger i,
    .pn-command-telemetry .pn-telemetry-cell.is-danger b{color:var(--red);border-color:rgba(255,55,85,.34)}
    .pn-command-online{gap:9px}
    .pn-command-online .pn-telemetry-node{
      flex:0 0 auto;
      width:7px;height:7px;
      border-radius:50%;
      background:var(--green);
      box-shadow:0 0 12px var(--green);
    }
    .pn-command-online span{flex:1;width:auto;height:auto;border-radius:0;background:none;box-shadow:none;color:var(--green)}
    .pn-command-online b{font-size:8px;color:var(--green);letter-spacing:.10em}

    .pn-command-priority{
      position:relative;
      min-height:60px;
      display:grid;
      grid-template-columns:42px minmax(0,1fr) auto;
      align-items:center;
      gap:12px;
      margin-bottom:10px;
      padding:8px 13px 8px 10px;
      border:1px solid rgba(190,196,204,.18);
      border-left:2px solid #aeb5bd;
      background:linear-gradient(90deg,rgba(172,180,188,.07),rgba(13,10,17,.86) 32%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
      overflow:hidden;
    }
    .pn-command-priority:after{
      content:"";
      position:absolute;
      width:120px;height:120px;
      right:18%;top:-98px;
      border:1px solid currentColor;
      opacity:.08;
      transform:rotate(45deg);
    }
    .pn-command-priority.is-good{color:var(--green);border-left-color:var(--green)}
    .pn-command-priority.is-active{color:#b75cec;border-left-color:#b75cec}
    .pn-command-priority.is-warn{color:var(--amber);border-left-color:var(--amber)}
    .pn-command-priority.is-danger{color:var(--red);border-left-color:var(--red)}
    .pn-priority-code{
      position:relative;
      width:38px;height:38px;
      display:grid;place-items:center;
      border:1px solid currentColor;
      background:rgba(0,0,0,.20);
    }
    .pn-priority-code i{
      position:absolute;inset:5px;
      border:1px solid currentColor;
      opacity:.25;
      transform:rotate(45deg);
    }
    .pn-priority-code b{position:relative;font-family:var(--mono);font-size:8px;letter-spacing:.08em}
    .pn-priority-copy{min-width:0;display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:baseline;gap:2px 12px}
    .pn-priority-copy span{font-size:7px;font-weight:900;letter-spacing:.14em;color:currentColor}
    .pn-priority-copy strong{font-family:var(--stamp);font-size:13px;letter-spacing:.05em;color:#eceef1}
    .pn-priority-copy em{grid-column:2;font-family:var(--mono);font-size:8px;font-style:normal;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    .pn-command-hero-finance{
      grid-template-columns:minmax(0,1.25fr) minmax(600px,1fr);
      gap:10px;
      margin-bottom:10px;
      align-items:stretch;
    }
    .pn-command-hero-finance .pn-profit-core{
      min-height:194px;
      padding:19px 22px;
      border-color:rgba(184,69,239,.52);
      background:
        linear-gradient(110deg,rgba(96,15,113,.24),rgba(14,11,19,.91) 55%),
        linear-gradient(180deg,rgba(210,216,221,.035),transparent 40%);
      box-shadow:inset 0 1px 0 rgba(231,234,237,.07),0 16px 40px rgba(0,0,0,.20);
    }
    .pn-profit-core-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
    .pn-profit-core-head>span{font-family:var(--mono);font-size:7px;letter-spacing:.11em;color:#77717e}
    .pn-command-hero-finance .pn-profit-value{
      margin-top:10px;
      font-size:clamp(36px,3.3vw,54px);
    }
    .pn-command-hero-finance .pn-profit-sub{
      margin-top:15px;
      padding-top:12px;
    }

    .pn-financial-matrix{
      grid-template-columns:repeat(3,minmax(0,1fr));
      grid-template-rows:repeat(2,minmax(0,1fr));
      gap:8px;
    }

    .pn-financial-matrix .pn-terminal-kpi{
      position:relative;
      min-height:0;
      padding:12px 12px 11px;
      gap:7px;
      justify-content:flex-end;
      border-color:rgba(184,190,198,.20);
      border-top:1px solid rgba(205,211,217,.52);
      background:linear-gradient(155deg,rgba(36,32,40,.72),rgba(11,9,14,.90) 66%);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
    }
    .pn-financial-matrix .pn-terminal-kpi:after{
      content:"";
      position:absolute;
      right:0;top:0;
      width:18px;height:18px;
      border-top:1px solid rgba(183,92,236,.36);
      border-right:1px solid rgba(183,92,236,.36);
    }
    .pn-financial-matrix .pn-terminal-kpi i{
      position:absolute;
      left:11px;top:9px;
      color:#77717e;
      font-family:var(--mono);
      font-size:7px;
      font-style:normal;
      letter-spacing:.09em;
    }
    .pn-financial-matrix .pn-terminal-kpi span{font-size:8px;color:#a29ba9}
    .pn-financial-matrix .pn-terminal-kpi b{font-size:15px;color:#e7e9ec}
    .pn-financial-matrix .pn-terminal-kpi.is-major{
      border-top-color:rgba(185,77,239,.82);
      background:linear-gradient(155deg,rgba(70,25,82,.28),rgba(11,9,14,.92) 68%);
    }
    .pn-financial-matrix .pn-terminal-kpi.is-major b{font-size:17px}

    .pn-command-grid{
      gap:10px;
      margin-bottom:10px;
      align-items:start;
    }
    .pn-command-grid-main{grid-template-columns:minmax(0,1.9fr) minmax(300px,.72fr)}
    .pn-command-panel{
      position:relative;
      overflow:hidden;
      border-color:rgba(180,187,194,.19);
      background:linear-gradient(180deg,rgba(22,18,26,.91),rgba(12,10,15,.91));
      backdrop-filter:blur(2px);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 10px 26px rgba(0,0,0,.13);
    }
    .pn-command-panel:before{
      content:"";
      position:absolute;
      left:0;top:0;width:2px;height:28px;
      background:linear-gradient(#cbd0d5,rgba(177,74,229,.52),transparent);
      opacity:.62;
    }
    .pn-command-panel-primary{
      border-color:rgba(178,75,227,.42);
      box-shadow:inset 0 1px 0 rgba(231,234,237,.055),0 14px 34px rgba(0,0,0,.18);
    }
    .pn-command-panel-operational{border-color:rgba(183,190,197,.24)}
    .pn-command-panel-utility{background:rgba(12,10,15,.74)}
    .pn-command-panel .panel-head{
      position:relative;
      min-height:39px;
      padding:8px 13px;
      border-bottom-color:rgba(181,188,195,.16);
      background:linear-gradient(90deg,rgba(204,210,216,.035),transparent 60%);
    }
    .pn-command-panel .panel-head:after{
      content:"";
      position:absolute;
      left:13px;right:13px;bottom:-1px;height:1px;
      background:linear-gradient(90deg,rgba(205,211,216,.36),rgba(167,71,215,.24) 42%,transparent 82%);
      pointer-events:none;
    }
    .pn-command-panel .panel-head h2{
      color:#cbd0d5;
      background:linear-gradient(180deg,#f0f1f2,#a5abb2);
      -webkit-background-clip:text;
      background-clip:text;
      -webkit-text-fill-color:transparent;
      font-size:12px;
      letter-spacing:.055em;
      text-shadow:0 1px 0 rgba(255,255,255,.05);
    }
    .pn-command-panel .panel-body{padding:13px}
    .pn-command-panel .pn-command-empty{
      min-height:46px;
      padding:10px 13px;
      color:#8f8995;
      background:linear-gradient(90deg,rgba(185,191,198,.025),transparent);
    }
    .pn-command-panel:has(.pn-command-empty) .panel-head{min-height:35px}
    .pn-command-panel:has(.pn-command-empty) .panel-body{padding:0}
    .pn-build-opportunities:has(.pn-intelligence-empty) .panel-body{padding:0}
    .pn-build-opportunities:has(.pn-intelligence-empty) .pn-intelligence-empty{min-height:62px;padding:10px 14px}
    .pn-profit-pulse .panel-body{padding:8px 13px 10px}
    .pn-profit-pulse .chart-wrap svg{filter:drop-shadow(0 6px 14px rgba(29,199,107,.06))}
    .pn-condition-list>div{min-height:38px}
    .pn-condition-list span{font-size:8px;color:#99939f}
    .pn-condition-list b{font-size:10px}

    .pn-command-link{
      position:relative;
      z-index:2;
      color:#b45fe2;
      transition:color .14s ease,text-shadow .14s ease;
    }
    .pn-command-link:hover{color:#e0b1fa;text-shadow:0 0 12px rgba(183,83,232,.42)}

    .pn-money-pos{color:var(--green)!important}
    .pn-money-neg{color:var(--red)!important}

    @media(max-width:1500px){
      .pn-command-hero-finance{grid-template-columns:minmax(0,1.2fr) minmax(480px,1fr)}
      .pn-financial-matrix{grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,minmax(72px,1fr))}
      .pn-command-hero-finance .pn-profit-core{min-height:232px}
    }

    @media(max-width:1180px){
      .pn-command-hero-finance{
        grid-template-columns:1fr;
      }
      .pn-command-hero-finance .pn-profit-core{min-height:190px}
      .pn-command-grid-main{grid-template-columns:1fr}
    }

    @media(max-width:620px){
      .pn-command-priority{grid-template-columns:38px minmax(0,1fr)}
      .pn-command-priority>.pn-command-link{grid-column:2;justify-self:start}
      .pn-priority-copy{display:flex;flex-direction:column;align-items:flex-start}
      .pn-priority-copy em{white-space:normal}
      .pn-financial-matrix{
        grid-template-columns:1fr;
        grid-template-rows:none;
      }
    }
  `;
  document.head.appendChild(style);
})();
