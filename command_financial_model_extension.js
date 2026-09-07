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

    const statusStrip =
      '<div class="pn-command-status">'+
        '<div class="pn-command-online"><span></span>SHOP ONLINE</div>'+
        '<div><span>LIVE BUILDS</span><b>'+activeBuilds+'</b></div>'+
        '<div><span>PARTS IN VAULT</span><b>'+vaultCount+'</b></div>'+
        '<div><span>REPAIR QUEUE</span><b>'+repairCount+'</b></div>'+
        '<div><span>STALE ITEMS</span><b>'+staleCount+'</b></div>'+
      '</div>';

    const hero =
      '<div class="pn-command-hero pn-command-hero-finance">'+
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

        '<div class="pn-command-kpi-stack pn-financial-matrix">'+
          '<div class="pn-terminal-kpi"><span>TOTAL SPENT</span><b>'+money(totalSpent,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>TOTAL REVENUE</span><b>'+money(stats.totalRevenue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>CAPITAL IN STOCK</span><b>'+money(activeCapital,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>MARKET VALUE</span><b>'+money(marketValue,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>UNREALIZED PROFIT</span><b class="'+(unrealizedProfit>=0?"pn-money-pos":"pn-money-neg")+'">'+money(unrealizedProfit,currency)+'</b></div>'+
          '<div class="pn-terminal-kpi"><span>MONEY SAVED</span><b>'+money(stats.totalMoneySaved,currency)+'</b></div>'+
        '</div>'+
      '</div>';

    const pulseAndCondition =
      '<div class="pn-command-grid pn-command-grid-main">'+
        '<section class="panel pn-command-panel pn-profit-pulse">'+
          '<div class="panel-head"><h2>PROFIT PULSE</h2><span class="pn-terminal-state">ALL TIME \u00B7 '+currency+'</span></div>'+
          '<div class="panel-body">'+renderChart()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>SHOP CONDITION</h2><span class="pn-terminal-state">LIVE</span></div>'+
          '<div class="panel-body">'+pnCmdCondition(currency,activeCapital,marketValue,activeBuilds,repairCount)+'</div>'+
        '</section>'+
      '</div>';

    const operations =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>OPERATIONS QUEUE</h2><span class="pn-terminal-state">INTERVENTION ONLY</span></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdOperationQueue()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>RIG BENCH</h2><button class="pn-command-link" data-route="rigbuild">OPEN BENCH</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdRigSnapshot()+'</div>'+
        '</section>'+
      '</div>';

    const signalsAndHunt =
      '<div class="pn-command-grid">'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>LATEST SIGNALS</h2><button class="pn-command-link" data-route="history">OPEN ARCHIVE</button></div>'+
          '<div class="panel-body pn-no-pad">'+pnCmdLatestSignals()+'</div>'+
        '</section>'+
        '<section class="panel pn-command-panel">'+
          '<div class="panel-head"><h2>THE HUNT</h2><button class="pn-command-link" data-route="deals">OPEN HUNT</button></div>'+
          '<div class="panel-body">'+pnCmdHuntSnapshot()+'</div>'+
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

  renderDashboard = renderCommandFinancialModel;

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(route=>route.key==="dashboard");
    if (route) route.render = renderCommandFinancialModel;
  }

  const style = document.createElement("style");
  style.textContent = `
    .pn-command-hero-finance{
      grid-template-columns:minmax(0,1.55fr) minmax(420px,1fr);
    }

    .pn-financial-matrix{
      grid-template-columns:1fr 1fr;
      grid-template-rows:repeat(3,1fr);
    }

    .pn-financial-matrix .pn-terminal-kpi{
      min-height:0;
    }

    .pn-money-pos{color:var(--green)}
    .pn-money-neg{color:var(--red)}

    @media(max-width:1180px){
      .pn-command-hero-finance{
        grid-template-columns:1fr;
      }
    }

    @media(max-width:620px){
      .pn-financial-matrix{
        grid-template-columns:1fr;
        grid-template-rows:none;
      }
    }
  `;
  document.head.appendChild(style);
})();