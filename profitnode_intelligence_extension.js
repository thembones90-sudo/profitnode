"use strict";

/*
  PROFITNODE OPERATING INTELLIGENCE v1

  Adds:
  - canonical true cost basis
  - capital velocity
  - inventory aging
  - build opportunity detection
  - BLACKBOX data health
  - PERSONAL inventory exclusion from shop financial KPIs
*/

(function installProfitnodeOperatingIntelligence(){

  function pnIsShopInventoryItem(item){
    return !!item && item.status !== "SOLD" && item.status !== "PERSONAL";
  }

  function pnItemExtraCosts(item,currency){
    if (!item) return 0;

    const raw =
      Number(item.shippingCost || 0) +
      Number(item.accessoryCosts || 0) +
      Number(item.miscCosts || 0) +
      Number(item.additionalCosts || 0);

    return convert(raw,item.currency || currency,currency);
  }

  function pnTrueItemCost(item,currency){
    if (!item) return 0;

    return (
      convert(item.purchasePrice || 0,item.currency,currency) +
      repairCostForItem(item.id,currency) +
      pnItemExtraCosts(item,currency)
    );
  }

  function pnShopInventory(currency){
    return Store.all("inventory").filter(pnIsShopInventoryItem);
  }

  function pnActiveCapital(currency){
    return pnShopInventory(currency)
      .reduce((sum,item)=>sum+pnTrueItemCost(item,currency),0);
  }

  function pnMarketValue(currency){
    return pnShopInventory(currency)
      .reduce((sum,item)=>sum+convert(item.estimatedMarketValue || 0,item.currency,currency),0);
  }

  function pnSoldCostBasis(currency){
    return Store.all("sales")
      .reduce((sum,sale)=>sum+convert(saleDerived(sale).totalCost || 0,sale.currency,currency),0);
  }

  function pnTotalSpent(currency){
    return pnSoldCostBasis(currency) + pnActiveCapital(currency);
  }

  globalThis.PNFinance = {
    trueItemCost:pnTrueItemCost,
    activeCapital:pnActiveCapital,
    marketValue:pnMarketValue,
    soldCostBasis:pnSoldCostBasis,
    totalSpent:pnTotalSpent
  };

  /*
    RIG BENCH uses the same true cost basis as BUILDS.
    An inventory part with repair expense now carries that expense into rig economics.
  */
  if (typeof rigSlotResolved === "function"){
    const PNCoreRigSlotResolvedTrueCost = rigSlotResolved;

    rigSlotResolved = function(slot,currency,slotKey){
      const resolved = PNCoreRigSlotResolvedTrueCost(slot,currency,slotKey);

      if (
        slot &&
        slot.kind === "INVENTORY" &&
        resolved &&
        resolved.item
      ){
        resolved.purchaseOnlyCost = resolved.cost;
        resolved.repairCost = repairCostForItem(resolved.item.id,currency);
        resolved.cost = pnTrueItemCost(resolved.item,currency);
        resolved.trueCost = resolved.cost;
      }

      return resolved;
    };
  }

  /*
    Correct shop-level financial KPIs:
    - PERSONAL inventory is not business capital.
    - Unrealized profit uses true cost, not purchase price alone.
    - Total capital invested becomes the canonical lifetime TOTAL SPENT.
  */
  if (typeof dashboardStats === "function"){
    const PNCoreDashboardStatsIntelligence = dashboardStats;

    dashboardStats = function(currency){
      const out = PNCoreDashboardStatsIntelligence(currency);
      const activeCapital = pnActiveCapital(currency);
      const marketValue = pnMarketValue(currency);

      out.totalCapitalInvested = pnTotalSpent(currency);
      out.currentInventoryValue = marketValue;
      out.unrealizedProfit = marketValue - activeCapital;

      return out;
    };
  }

  function pnDaysHeldForSale(sale){
    if (typeof saleDaysHeldResolved === "function"){
      return saleDaysHeldResolved(sale);
    }
    return saleDerived(sale).daysHeld;
  }

  function pnCapitalVelocity(currency){
    const sales = Store.all("sales");
    const tracked = sales
      .map(sale=>{
        const days = pnDaysHeldForSale(sale);
        return {
          sale:sale,
          days:days,
          profit:convert(saleDerived(sale).profit || 0,sale.currency,currency)
        };
      })
      .filter(row=>row.days!=null && !isNaN(row.days) && row.days>=0);

    const avgHold = tracked.length
      ? tracked.reduce((sum,row)=>sum+row.days,0) / tracked.length
      : null;

    const fastest = tracked.length
      ? tracked.slice().sort((a,b)=>a.days-b.days)[0]
      : null;

    const slowest = tracked.length
      ? tracked.slice().sort((a,b)=>b.days-a.days)[0]
      : null;

    const soldBasis = pnSoldCostBasis(currency);
    const revenue = sales.reduce(
      (sum,sale)=>sum+convert(sale.buyerPrice || 0,sale.currency,currency),
      0
    );
    const profit = sales.reduce(
      (sum,sale)=>sum+convert(saleDerived(sale).profit || 0,sale.currency,currency),
      0
    );

    const returnPace =
      soldBasis>0 && avgHold!=null && avgHold>0
        ? (profit / soldBasis) * (30 / avgHold) * 100
        : null;

    const capitalRecovery = soldBasis>0 ? revenue / soldBasis : null;

    return {
      tracked:tracked.length,
      avgHold:avgHold,
      fastest:fastest,
      slowest:slowest,
      returnPace:returnPace,
      capitalRecovery:capitalRecovery
    };
  }

  function pnCapitalVelocityHtml(currency){
    const v = pnCapitalVelocity(currency);

    return ''+
      '<div class="pn-intel-strip">'+
        '<div class="pn-intel-cell"><span>AVG HOLD</span><b>'+(v.avgHold==null?"-":v.avgHold.toFixed(1)+"D")+'</b></div>'+
        '<div class="pn-intel-cell"><span>FASTEST FLIP</span><b>'+(v.fastest?v.fastest.days+"D":"-")+'</b><small>'+(v.fastest?escHtml(v.fastest.sale.itemName):"NO DATA")+'</small></div>'+
        '<div class="pn-intel-cell"><span>SLOWEST FLIP</span><b>'+(v.slowest?v.slowest.days+"D":"-")+'</b><small>'+(v.slowest?escHtml(v.slowest.sale.itemName):"NO DATA")+'</small></div>'+
        '<div class="pn-intel-cell"><span>30D RETURN PACE</span><b class="'+(v.returnPace!=null && v.returnPace>=0?"pn-money-pos":"pn-money-neg")+'">'+(v.returnPace==null?"-":v.returnPace.toFixed(1)+"%")+'</b></div>'+
        '<div class="pn-intel-cell"><span>CAPITAL RECOVERY</span><b>'+(v.capitalRecovery==null?"-":v.capitalRecovery.toFixed(2)+"x")+'</b><small>'+v.tracked+' TIMED SALES</small></div>'+
      '</div>';
  }

  function pnInventoryAging(currency){
    const buckets = {
      fresh:[],
      watch:[],
      stale:[],
      dead:[]
    };

    Store.all("inventory")
      .filter(item=>
        item.status !== "SOLD" &&
        item.status !== "PERSONAL" &&
        !["IN_BUILD","IN_RIG"].includes(item.status)
      )
      .forEach(item=>{
        const days = Calc.daysHeld(item.purchaseDate,todayISO());
        if (days==null || isNaN(days)) return;

        const row = {item:item,days:days};

        if (days<=30) buckets.fresh.push(row);
        else if (days<=60) buckets.watch.push(row);
        else if (days<=90) buckets.stale.push(row);
        else buckets.dead.push(row);
      });

    const deadValue = buckets.dead.reduce(
      (sum,row)=>sum+pnTrueItemCost(row.item,currency),
      0
    );

    return {buckets:buckets,deadValue:deadValue};
  }

  function pnInventoryAgingHtml(currency){
    const a = pnInventoryAging(currency);

    return ''+
      '<div class="pn-section-kicker">INVENTORY AGING</div>'+
      '<div class="pn-intel-strip pn-aging-strip">'+
        '<div class="pn-intel-cell pn-age-fresh"><span>FRESH 0-30D</span><b>'+a.buckets.fresh.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-watch"><span>WATCH 31-60D</span><b>'+a.buckets.watch.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-stale"><span>STALE 61-90D</span><b>'+a.buckets.stale.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-dead"><span>DEAD STOCK 90D+</span><b>'+a.buckets.dead.length+'</b></div>'+
        '<div class="pn-intel-cell"><span>DEAD STOCK COST</span><b class="'+(a.deadValue>0?"pn-money-neg":"pn-money-pos")+'">'+money(a.deadValue,currency)+'</b></div>'+
      '</div>';
  }

  function pnAvailableParts(){
    return Store.all("inventory").filter(item=>
      item.status === "IN_STORAGE" &&
      !item.assignedProjectId &&
      !item.assignedRigId &&
      !["DEAD","FAULTY"].includes(item.condition)
    );
  }

  function pnCategory(items,category){
    return items.filter(item=>item.category===category);
  }

  function pnItemSpread(item,currency){
    return (
      convert(item.estimatedMarketValue || 0,item.currency,currency) -
      pnTrueItemCost(item,currency)
    );
  }

  function pnBestPart(items,currency){
    if (!items.length) return null;

    return items
      .slice()
      .sort((a,b)=>pnItemSpread(b,currency)-pnItemSpread(a,currency))[0];
  }

  function pnCpuMoboCompatible(cpu,mobo){
    if (!cpu || !mobo) return {compatible:false,verified:false};

    const cpuText = pnNorm((cpu.manufacturer||"")+" "+cpu.model);
    const moboText = pnNorm((mobo.manufacturer||"")+" "+mobo.model);

    const cpuSocket = detectCpuSocket(cpuText);
    const moboSocket = detectMoboSocket(moboText);

    if (cpuSocket && moboSocket){
      return {
        compatible:cpuSocket===moboSocket,
        verified:true,
        cpuSocket:cpuSocket,
        moboSocket:moboSocket
      };
    }

    return {
      compatible:true,
      verified:false,
      cpuSocket:cpuSocket,
      moboSocket:moboSocket
    };
  }

  function pnBuildOpportunities(currency){
    const available = pnAvailableParts();

    const cpus = pnCategory(available,"CPU");
    const mobos = pnCategory(available,"MOTHERBOARD");
    const gpus = pnCategory(available,"GPU");
    const rams = pnCategory(available,"RAM");

    if (!cpus.length || !mobos.length || !gpus.length || !rams.length){
      return {
        opportunities:[],
        missing:[
          !cpus.length?"CPU":null,
          !mobos.length?"MOTHERBOARD":null,
          !gpus.length?"GPU":null,
          !rams.length?"RAM":null
        ].filter(Boolean)
      };
    }

    const psu = pnBestPart(pnCategory(available,"PSU"),currency);
    const storage = pnBestPart(pnCategory(available,"STORAGE"),currency);
    const pcCase = pnBestPart(pnCategory(available,"CASE"),currency);
    const cooler = pnBestPart(pnCategory(available,"COOLING"),currency);
    const gpu = pnBestPart(gpus,currency);
    const ram = pnBestPart(rams,currency);

    const candidates = [];

    cpus.forEach(cpu=>{
      mobos.forEach(mobo=>{
        const socket = pnCpuMoboCompatible(cpu,mobo);
        if (!socket.compatible) return;

        const parts = [cpu,mobo,gpu,ram,psu,storage,pcCase,cooler].filter(Boolean);
        const cost = parts.reduce(
          (sum,item)=>sum+pnTrueItemCost(item,currency),
          0
        );
        const market = parts.reduce(
          (sum,item)=>sum+convert(item.estimatedMarketValue || 0,item.currency,currency),
          0
        );
        const spread = market-cost;

        candidates.push({
          cpu:cpu,
          mobo:mobo,
          gpu:gpu,
          ram:ram,
          parts:parts,
          cost:cost,
          market:market,
          spread:spread,
          socket:socket,
          completeness:parts.length
        });
      });
    });

    candidates.sort((a,b)=>
      b.spread-a.spread ||
      b.completeness-a.completeness
    );

    return {
      opportunities:candidates.slice(0,3),
      missing:[]
    };
  }

  function pnOpportunityCard(op,currency,index){
    const parts = [
      op.cpu.manufacturer+" "+op.cpu.model,
      op.mobo.manufacturer+" "+op.mobo.model,
      op.gpu.manufacturer+" "+op.gpu.model,
      op.ram.manufacturer+" "+op.ram.model
    ];

    return ''+
      '<div class="pn-opportunity-card">'+
        '<div class="pn-opportunity-head">'+
          '<div>'+
            '<span>NODE MATCH '+String(index+1).padStart(2,"0")+'</span>'+
            '<b>'+op.completeness+' PART BUILD PATH</b>'+
          '</div>'+
          '<span class="chip '+(op.socket.verified?"chip-green-outline":"chip-amber-outline")+'">'+(op.socket.verified?"SOCKET VERIFIED":"VERIFY SOCKET")+'</span>'+
        '</div>'+
        '<div class="pn-opportunity-parts">'+parts.map(label=>'<span>'+escHtml(label)+'</span>').join("")+'</div>'+
        '<div class="pn-opportunity-money">'+
          '<div><span>TRUE COST</span><b>'+money(op.cost,currency)+'</b></div>'+
          '<div><span>COMPONENT MARKET BASELINE</span><b>'+money(op.market,currency)+'</b></div>'+
          '<div><span>POTENTIAL SPREAD</span><b class="'+(op.spread>=0?"pn-money-pos":"pn-money-neg")+'">'+money(op.spread,currency)+'</b></div>'+
        '</div>'+
      '</div>';
  }

  function pnBuildOpportunitiesHtml(currency){
    const data = pnBuildOpportunities(currency);

    let body = "";

    if (!data.opportunities.length){
      body =
        '<div class="pn-intelligence-empty">'+
          '<b>NO COMPLETE BUILD PATH DETECTED</b>'+
          '<span>Missing unassigned stock: '+escHtml(data.missing.join(", ") || "compatible core parts")+'</span>'+
        '</div>';
    } else {
      body = '<div class="pn-opportunity-grid">'+
        data.opportunities.map((op,index)=>pnOpportunityCard(op,currency,index)).join("")+
      '</div>';
    }

    return ''+
      '<section class="panel pn-command-panel pn-build-opportunities">'+
        '<div class="panel-head">'+
          '<h2>BUILD OPPORTUNITIES</h2>'+
          '<span class="pn-terminal-state">PART SYNERGY</span>'+
        '</div>'+
        '<div class="panel-body">'+body+'</div>'+
      '</section>';
  }

  function pnDataHealth(){
    const collections = [
      "projects","inventory","deals","sales","timeline","repairs","rigs"
    ];
    const problems = [];
    const metadata = [];

    collections.forEach(name=>{
      const seen = new Set();

      Store.all(name).forEach(row=>{
        if (!row || !row.id) return;

        if (seen.has(row.id)){
          problems.push("DUPLICATE ID in "+name+": "+row.id);
        }
        seen.add(row.id);
      });
    });

    const projects = new Map(Store.all("projects").map(row=>[row.id,row]));
    const rigs = new Map(Store.all("rigs").map(row=>[row.id,row]));
    const inventory = new Map(Store.all("inventory").map(row=>[row.id,row]));

    Store.all("inventory").forEach(item=>{
      if (item.assignedProjectId && !projects.has(item.assignedProjectId)){
        problems.push("ORPHAN PROJECT LINK: "+item.manufacturer+" "+item.model);
      }

      if (item.assignedRigId && !rigs.has(item.assignedRigId)){
        problems.push("ORPHAN RIG LINK: "+item.manufacturer+" "+item.model);
      }

      if (item.status==="SOLD" && item.assignedRigId){
        const rig = rigs.get(item.assignedRigId);
        if (rig && rig.status!=="SOLD"){
          problems.push("SOLD PART still assigned to active rig: "+item.manufacturer+" "+item.model);
        }
      }
    });

    Store.all("repairs").forEach(repair=>{
      if (repair.inventoryItemId && !inventory.has(repair.inventoryItemId)){
        problems.push("ORPHAN REPAIR LINK: "+repair.id);
      }
    });

    Store.all("rigs").forEach(rig=>{
      RIG_SLOTS.forEach(slotKey=>{
        const slot = rig.slots && rig.slots[slotKey];

        if (
          slot &&
          slot.kind==="INVENTORY" &&
          slot.inventoryItemId &&
          !inventory.has(slot.inventoryItemId)
        ){
          problems.push("MISSING RIG PART: "+rig.family+" / "+rig.variantName+" / "+slotKey);
        }
      });
    });

    ["inventory","projects","deals","sales","repairs","rigs"].forEach(name=>{
      Store.all(name).forEach(row=>{
        if (row.currency && !CURRENCIES.includes(row.currency)){
          problems.push("INVALID CURRENCY in "+name+": "+row.currency);
        }
      });
    });

    Store.all("sales").forEach(sale=>{
      if (!sale.saleType || !sale.saleSource){
        metadata.push(sale.itemName || sale.id);
      }
    });

    return {
      problems:problems,
      metadata:metadata
    };
  }

  function pnDataHealthHtml(){
    const health = pnDataHealth();
    const clean = health.problems.length===0;

    return ''+
      '<div class="panel pn-health-panel" style="margin-bottom:16px">'+
        '<div class="panel-head">'+
          '<h2>DATABASE HEALTH</h2>'+
          '<span class="chip '+(clean?"chip-green":"chip-red")+'">'+(clean?"CLEAN":"ATTENTION")+'</span>'+
        '</div>'+
        '<div class="panel-body">'+
          '<div class="pn-health-grid">'+
            '<div><span>STRUCTURAL ISSUES</span><b class="'+(clean?"pn-money-pos":"pn-money-neg")+'">'+health.problems.length+'</b></div>'+
            '<div><span>LEGACY SALE METADATA</span><b>'+health.metadata.length+'</b></div>'+
            '<div><span>CHECKED COLLECTIONS</span><b>7</b></div>'+
          '</div>'+
          (health.problems.length
            ? '<div class="pn-health-list">'+health.problems.slice(0,8).map(msg=>'<div>'+escHtml(msg)+'</div>').join("")+'</div>'
            : '<div class="pn-health-ok">No orphan links, duplicate IDs, missing rig inventory references, or invalid currencies detected.</div>')+
          (health.metadata.length
            ? '<div class="pn-health-note">Legacy sale metadata remains on '+health.metadata.length+' record(s). Resolved runtime semantics still work, but future edits can normalize these records.</div>'
            : '')+
        '</div>'+
      '</div>';
  }

  function pnInjectAfterContentOpen(html,block){
    const marker = '<div class="content">';
    const index = html.indexOf(marker);

    if (index<0) return html;

    return (
      html.slice(0,index+marker.length) +
      block +
      html.slice(index+marker.length)
    );
  }

  function pnPatchCommandFinancialCells(html,currency){
    const active = pnActiveCapital(currency);
    const market = pnMarketValue(currency);
    const spent = pnTotalSpent(currency);
    const unrealized = market-active;

    function replaceMetric(label,valueHtml){
      const rx = new RegExp(
        '(<span>'+label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'<\\/span><b(?: class="[^"]*")?>)[^<]*(<\\/b>)'
      );
      return valueHtml;
    }

    html = html.replace(
      /(<span>TOTAL SPENT<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(spent,currency)+'$2'
    );

    html = html.replace(
      /(<span>CAPITAL IN STOCK<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(active,currency)+'$2'
    );

    html = html.replace(
      /(<span>MARKET VALUE<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(market,currency)+'$2'
    );

    html = html.replace(
      /(<span>UNREALIZED PROFIT<\/span><b class="[^"]*">)[^<]*(<\/b>)/,
      '$1'+money(unrealized,currency)+'$2'
    );

    return html;
  }

  function pnWrapRoute(key,wrapper){
    if (typeof ROUTES === "undefined") return;

    const route = ROUTES.find(row=>row.key===key);
    if (!route || typeof route.render !== "function") return;

    const previous = route.render;

    route.render = function(){
      return wrapper(previous.apply(this,arguments));
    };
  }

  /*
    COMMAND:
    - correct PERSONAL exclusion in final visible financial cells
    - add build opportunity detection
  */
  pnWrapRoute("dashboard",function(html){
    const currency = displayCurrency();

    html = pnPatchCommandFinancialCells(html,currency);

    const block = pnBuildOpportunitiesHtml(currency);
    const latestMarker =
      '<div class="pn-command-grid">'+
      '<section class="panel pn-command-panel">'+
      '<div class="panel-head"><h2>LATEST SIGNALS</h2>';

    if (html.includes(latestMarker)){
      html = html.replace(latestMarker,block+latestMarker);
    } else {
      const close = '</div>';
      const pos = html.lastIndexOf(close);
      if (pos>=0) html = html.slice(0,pos)+block+html.slice(pos);
    }

    return html;
  });

  /*
    INTEL:
    capital velocity becomes a first-class operational metric.
  */
  pnWrapRoute("analytics",function(html){
    const currency = displayCurrency();
    const block =
      '<div class="pn-section-kicker">CAPITAL VELOCITY</div>'+
      pnCapitalVelocityHtml(currency);

    return pnInjectAfterContentOpen(html,block);
  });

  /*
    PARTS VAULT:
    add stock aging without changing the user's filters or records.
  */
  pnWrapRoute("inventory",function(html){
    return pnInjectAfterContentOpen(
      html,
      pnInventoryAgingHtml(displayCurrency())
    );
  });

  /*
    RIG BENCH:
    make the slot economics language match the new true-cost calculation.
  */
  pnWrapRoute("rigbuild",function(html){
    if (typeof state !== "undefined" && state.rigDraft){
      html = html.replace("Paid Price","True Cost");
      html = html.replace(
        '<div class="content rig-editor-content">',
        '<div class="content rig-editor-content"><div class="pn-true-cost-note"><b>TRUE COST BASIS ACTIVE</b><span>Inventory parts include purchase price plus logged repair expense.</span></div>'
      );
    }
    return html;
  });

  /*
    BLACKBOX:
    hide retired Build Planner from active product language and show data health.
    Legacy plan arrays remain in JSON backup compatibility.
  */
  pnWrapRoute("backup",function(html){
    html = html.replace(
      /<div class="rank-row"><div class="rank-body"><div class="rank-name">Plans<\/div><\/div><div class="rank-val">\d+<\/div><\/div>/,
      ''
    );

    html = html
      .replace(
        "projects, inventory, repairs, deals, sales, plans and the activity timeline",
        "builds, inventory, repairs, deals, sales, rigs and the activity timeline"
      )
      .replace(
        "every project, inventory item, repair, deal, sale, plan and timeline entry",
        "every build, inventory item, repair, deal, sale, rig and timeline entry"
      );

    return pnInjectAfterContentOpen(html,pnDataHealthHtml());
  });

  const style = document.createElement("style");
  style.textContent = `
  .pn-section-kicker{
    margin:0 0 7px;
    color:#a965d1;
    font-size:9px;
    font-weight:900;
    letter-spacing:.12em;
  }

  .pn-intel-strip{
    display:grid;
    grid-template-columns:repeat(5,minmax(0,1fr));
    border:1px solid var(--border);
    background:rgba(13,10,17,.82);
    margin-bottom:14px;
  }

  .pn-intel-cell{
    min-height:66px;
    padding:11px 13px;
    border-right:1px solid var(--border);
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:4px;
  }

  .pn-intel-cell:last-child{border-right:0}

  .pn-intel-cell span{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-intel-cell b{
    font-family:var(--mono);
    font-size:15px;
  }

  .pn-intel-cell small{
    color:var(--muted);
    font-size:8px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .pn-age-fresh{box-shadow:inset 0 2px 0 rgba(72,220,134,.40)}
  .pn-age-watch{box-shadow:inset 0 2px 0 rgba(235,177,68,.42)}
  .pn-age-stale{box-shadow:inset 0 2px 0 rgba(235,111,68,.46)}
  .pn-age-dead{box-shadow:inset 0 2px 0 rgba(240,62,80,.55)}

  .pn-build-opportunities{
    margin-bottom:14px;
  }

  .pn-opportunity-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:10px;
  }

  .pn-opportunity-card{
    border:1px solid rgba(166,68,220,.28);
    background:
      linear-gradient(145deg,rgba(111,27,143,.13),rgba(12,9,16,.50));
    padding:13px;
    min-width:0;
  }

  .pn-opportunity-head{
    display:flex;
    justify-content:space-between;
    gap:10px;
    align-items:flex-start;
  }

  .pn-opportunity-head>div{
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-opportunity-head span{
    color:#a965d1;
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-opportunity-head b{
    font-size:11px;
  }

  .pn-opportunity-parts{
    display:flex;
    flex-direction:column;
    gap:3px;
    margin:12px 0;
    padding:9px 0;
    border-top:1px solid var(--border);
    border-bottom:1px solid var(--border);
  }

  .pn-opportunity-parts span{
    color:var(--muted);
    font-size:9px;
    overflow:hidden;
    white-space:nowrap;
    text-overflow:ellipsis;
  }

  .pn-opportunity-money{
    display:grid;
    grid-template-columns:1fr;
    gap:7px;
  }

  .pn-opportunity-money>div{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
  }

  .pn-opportunity-money span{
    color:var(--muted);
    font-size:8px;
    letter-spacing:.06em;
    font-weight:800;
  }

  .pn-opportunity-money b{
    font-family:var(--mono);
    font-size:10px;
  }

  .pn-intelligence-empty{
    min-height:88px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    gap:6px;
    color:var(--muted);
    text-align:center;
  }

  .pn-intelligence-empty b{
    color:var(--text);
    font-size:10px;
    letter-spacing:.08em;
  }

  .pn-intelligence-empty span{
    font-size:9px;
  }

  .pn-true-cost-note{
    display:flex;
    align-items:center;
    gap:12px;
    border:1px solid rgba(168,85,247,.28);
    border-left:3px solid #a855f7;
    background:rgba(91,31,119,.10);
    padding:9px 12px;
    margin-bottom:10px;
  }

  .pn-true-cost-note b{
    color:#bd72ea;
    font-size:9px;
    letter-spacing:.08em;
  }

  .pn-true-cost-note span{
    color:var(--muted);
    font-size:9px;
  }

  .pn-health-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    border:1px solid var(--border);
  }

  .pn-health-grid>div{
    padding:10px 12px;
    border-right:1px solid var(--border);
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-health-grid>div:last-child{border-right:0}

  .pn-health-grid span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-health-grid b{
    font-family:var(--mono);
    font-size:14px;
  }

  .pn-health-list{
    margin-top:10px;
    display:flex;
    flex-direction:column;
    gap:5px;
  }

  .pn-health-list div{
    border-left:2px solid var(--red);
    background:var(--red-wash);
    padding:7px 9px;
    color:var(--red);
    font-family:var(--mono);
    font-size:9px;
  }

  .pn-health-ok{
    margin-top:10px;
    color:var(--green);
    font-size:9px;
  }

  .pn-health-note{
    margin-top:8px;
    color:var(--amber);
    font-size:9px;
  }

  @media(max-width:1100px){
    .pn-intel-strip{
      grid-template-columns:repeat(2,minmax(0,1fr));
    }

    .pn-opportunity-grid{
      grid-template-columns:1fr;
    }
  }

  @media(max-width:650px){
    .pn-intel-strip,
    .pn-health-grid{
      grid-template-columns:1fr;
    }

    .pn-intel-cell,
    .pn-health-grid>div{
      border-right:0;
      border-bottom:1px solid var(--border);
    }
  }
  `;

  document.head.appendChild(style);
})();