"use strict";

/*
  PROFITNODE THE ROULETTE v2
  Simplified chaos protocol:
  - Wheel 1 decides BET / FUCK OFF / SAVE MONEY.
  - Wheel 2 decides the actual roulette protocol.
  - Only two KPIs survive: MONEY INVESTED and MONEY GAINED / LOST.
  - Results are entered manually as WIN / DEFEAT with the net amount gained or lost.
  - Roulette accounting remains completely separate from normal shop finances.
*/

(function installProfitnodeRouletteV2(){
  const ROULETTE_LEDGER_KEY = "rouletteLedger";
  const LEGACY_POOL_KEY = "roulettePools";

  const VERDICTS = ["BET","FUCK OFF","SAVE MONEY"];
  const WAGERS = [
    "ODD RED",
    "ODD BLACK",
    "EVEN RED",
    "EVEN BLACK",
    "1ST + 2ND",
    "1ST + 3RD",
    "2ND + 3RD"
  ];

  function rouletteEnsureCollections(){
    const data = Store.load();
    let changed = false;

    if (!Array.isArray(data[ROULETTE_LEDGER_KEY])){
      data[ROULETTE_LEDGER_KEY] = [];
      changed = true;
    }

    /* Preserve old pool data in backups, but v2 no longer exposes pool management. */
    if (!Array.isArray(data[LEGACY_POOL_KEY])){
      data[LEGACY_POOL_KEY] = [];
      changed = true;
    }

    if (changed) Store.persist();
  }

  rouletteEnsureCollections();

  function rouletteLedger(){
    rouletteEnsureCollections();
    return Store.all(ROULETTE_LEDGER_KEY);
  }

  function rouletteInsert(row){
    rouletteEnsureCollections();
    return Store.insert(ROULETTE_LEDGER_KEY,row);
  }

  function rouletteMoney(value,currency){
    return money(Number(value)||0,currency||displayCurrency());
  }

  function rouletteRandomIndex(length){
    if (!length) return 0;

    if (globalThis.crypto && typeof crypto.getRandomValues === "function"){
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return Math.floor((values[0] / 4294967296) * length);
    }

    return Math.floor(Math.random()*length);
  }

  function rouletteStakeValue(){
    return Math.max(0,Number(state.rouletteStake)||0);
  }

  function rouletteResetRound(keepStake){
    if (!keepStake) state.rouletteStake = "";
    state.rouletteVerdict = null;
    state.rouletteWager = null;
    state.rouletteNotice = null;
  }

  state.rouletteTab = state.rouletteTab || "CHAMBER";
  state.rouletteStake = state.rouletteStake || "";
  state.rouletteCurrency = state.rouletteCurrency || displayCurrency();
  state.rouletteVerdict = null;
  state.rouletteWager = null;
  state.rouletteVerdictRotation = Number(state.rouletteVerdictRotation)||0;
  state.rouletteWagerRotation = Number(state.rouletteWagerRotation)||0;
  state.rouletteNotice = null;
  state.roulettePendingFocus = state.roulettePendingFocus || null;

  let rouletteSpinLocked = false;

  function rouletteRowNet(row,currency){
    if (row.type!=="BET" || row.status!=="RESOLVED") return 0;

    if (row.net!=null){
      return convert(Number(row.net)||0,row.currency,currency);
    }

    /* Legacy fallback: old v1 records stored returned amount. */
    if (row.returned!=null){
      const net = (Number(row.returned)||0) - (Number(row.stake)||0);
      return convert(net,row.currency,currency);
    }

    return 0;
  }

  function rouletteStats(currency){
    const bets = rouletteLedger().filter(row=>row.type==="BET");

    const invested = bets.reduce(
      (sum,row)=>sum+convert(Number(row.stake)||0,row.currency,currency),
      0
    );

    const net = bets.reduce(
      (sum,row)=>sum+rouletteRowNet(row,currency),
      0
    );

    return {invested:invested,net:net};
  }

  function rouletteStatsHtml(currency){
    const stats = rouletteStats(currency);

    return '<div class="pn-r2-stats">'+
      '<div>'+
        '<span>MONEY INVESTED</span>'+
        '<b>'+money(stats.invested,currency)+'</b>'+
      '</div>'+
      '<div>'+
        '<span>MONEY GAINED / LOST</span>'+
        '<b class="'+(stats.net>0?"pos":stats.net<0?"neg":"")+'">'+money(stats.net,currency)+'</b>'+
      '</div>'+
    '</div>';
  }

  function rouletteVerdictMessage(verdict){
    if (verdict==="BET") return "POOR JUDGMENT AUTHORIZED";
    if (verdict==="SAVE MONEY") return "CAPITAL PRESERVATION EVENT";
    return "TACTICAL RETREAT APPROVED";
  }

  function rouletteNoticeHtml(){
    if (!state.rouletteNotice) return "";
    return '<div class="pn-r2-notice '+escAttr(state.rouletteNotice.tone||"info")+'">'+escHtml(state.rouletteNotice.text)+'</div>';
  }

  function rouletteWheelLabels(labels){
    const count = labels.length;

    return labels.map((label,index)=>{
      const angle = index*(360/count);
      return '<span class="pn-r2-wheel-label" style="--a:'+angle+'deg;--neg:'+(-angle)+'deg">'+escHtml(label)+'</span>';
    }).join("");
  }

  function rouletteVerdictWheel(){
    return '<div class="pn-r2-wheel-shell">'+
      '<div class="pn-r2-pointer"></div>'+
      '<div class="pn-r2-wheel pn-r2-verdict-wheel" data-r2-verdict-wheel style="transform:rotate('+state.rouletteVerdictRotation+'deg)">'+
        rouletteWheelLabels(VERDICTS)+
        '<div class="pn-r2-core">PN</div>'+
      '</div>'+
    '</div>';
  }

  function rouletteWagerWheel(){
    return '<div class="pn-r2-wheel-shell">'+
      '<div class="pn-r2-pointer"></div>'+
      '<div class="pn-r2-wheel pn-r2-wager-wheel" data-r2-wager-wheel style="transform:rotate('+state.rouletteWagerRotation+'deg)">'+
        rouletteWheelLabels(WAGERS)+
        '<div class="pn-r2-core">R</div>'+
      '</div>'+
    '</div>';
  }

  function rouletteProtocolLegend(){
    return '<div class="pn-r2-protocol-key">'+
      '<span><b>ODD RED</b> odd + red</span>'+
      '<span><b>ODD BLACK</b> odd + black</span>'+
      '<span><b>EVEN RED</b> even + red</span>'+
      '<span><b>EVEN BLACK</b> even + black</span>'+
      '<span><b>1ST + 2ND</b> 1-12 + 13-24</span>'+
      '<span><b>1ST + 3RD</b> 1-12 + 25-36</span>'+
      '<span><b>2ND + 3RD</b> 13-24 + 25-36</span>'+
    '</div>';
  }

  function rouletteResultTerminal(){
    if (!state.rouletteVerdict){
      return '<div class="pn-r2-terminal idle"><span>FATE AWAITS INPUT</span><b>SPIN THE VERDICT</b></div>';
    }

    let html =
      '<div class="pn-r2-terminal '+(state.rouletteVerdict==="BET"?"bet":state.rouletteVerdict==="SAVE MONEY"?"save":"retreat")+'">'+
        '<span>THE NODE HAS SPOKEN</span>'+
        '<b>'+escHtml(state.rouletteVerdict)+'</b>'+
        '<small>'+escHtml(rouletteVerdictMessage(state.rouletteVerdict))+'</small>'+
      '</div>';

    if (state.rouletteVerdict==="BET" && state.rouletteWager){
      html +=
        '<div class="pn-r2-wager-result">'+
          '<span>WAGER PROTOCOL</span>'+
          '<b>'+escHtml(state.rouletteWager)+'</b>'+
        '</div>';
    }

    return html;
  }

  function roulettePendingRows(){
    const pending = rouletteLedger()
      .filter(row=>row.type==="BET" && row.status==="PENDING")
      .slice()
      .sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));

    if (!pending.length){
      return '<div class="pn-r2-empty">NO UNRESOLVED BETS</div>';
    }

    return pending.map(row=>{
      const focused = state.roulettePendingFocus===row.id;
      return '<div class="pn-r2-pending '+(focused?"focused":"")+'">'+
        '<div class="pn-r2-pending-copy">'+
          '<span>'+fmtDate(row.date)+'</span>'+
          '<b>'+escHtml(row.wager||"BET")+'</b>'+
          '<small>'+rouletteMoney(row.stake,row.currency)+' INVESTED</small>'+
        '</div>'+
        '<div class="pn-r2-result-entry">'+
          '<label><span>RESULT</span><select data-r2-result-outcome="'+row.id+'">'+
            '<option value="WIN">WIN</option>'+
            '<option value="DEFEAT">DEFEAT</option>'+
          '</select></label>'+
          '<label><span>AMOUNT EARNED / LOST</span><input type="number" min="0" step="1" data-r2-result-amount="'+row.id+'" placeholder="0"></label>'+
          '<button type="button" class="btn btn-primary" data-r2-record-result="'+row.id+'">RECORD RESULT</button>'+
        '</div>'+
      '</div>';
    }).join("");
  }

  function rouletteHistoryRows(currency){
    const rows = rouletteLedger()
      .filter(row=>row.type==="BET")
      .slice()
      .sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));

    if (!rows.length){
      return '<tr class="empty-row"><td colspan="7">No roulette bets recorded yet.</td></tr>';
    }

    return rows.map(row=>{
      const outcome =
        row.status==="PENDING" ? "PENDING" :
        row.outcome==="LOSE" ? "DEFEAT" :
        row.outcome || "RESOLVED";

      const net = row.status==="RESOLVED" ? rouletteRowNet(row,currency) : null;

      return '<tr>'+
        '<td class="mono">'+fmtDate(row.date)+'</td>'+
        '<td><b>'+escHtml(row.wager||"BET")+'</b></td>'+
        '<td>'+escHtml(outcome)+'</td>'+
        '<td class="num">'+rouletteMoney(row.stake,row.currency)+'</td>'+
        '<td class="num '+(net==null?"":net>=0?"pos":"neg")+'">'+(net==null?"-":money(net,currency))+'</td>'+
        '<td>'+escHtml(row.notes||"")+'</td>'+
        '<td class="num"><button type="button" class="btn btn-sm btn-ghost" data-r2-delete="'+row.id+'">DELETE</button></td>'+
      '</tr>';
    }).join("");
  }

  function rouletteChamber(){
    const stake = rouletteStakeValue();
    const wagerReady = state.rouletteVerdict==="BET";

    let roundAction = "";

    if (state.rouletteVerdict==="BET" && state.rouletteWager){
      roundAction =
        '<button type="button" class="btn btn-primary pn-r2-lock" data-r2-lock-bet>'+
          'LOCK BET'+
        '</button>';
    }

    if (state.rouletteVerdict==="FUCK OFF" || state.rouletteVerdict==="SAVE MONEY"){
      roundAction =
        '<button type="button" class="btn" data-r2-new-round>NEW ROUND</button>';
    }

    return rouletteNoticeHtml()+
      '<div class="pn-r2-controls">'+
        '<label><span>HOW MUCH DAMAGE?</span><input type="number" min="0" step="1" value="'+escAttr(state.rouletteStake)+'" data-r2-stake placeholder="3000"></label>'+
        '<label><span>CURRENCY</span><select data-r2-currency>'+
          '<option value="RSD"'+(state.rouletteCurrency==="RSD"?" selected":"")+'>RSD</option>'+
          '<option value="EUR"'+(state.rouletteCurrency==="EUR"?" selected":"")+'>EUR</option>'+
        '</select></label>'+
      '</div>'+

      '<div class="pn-r2-wheel-grid">'+
        '<section class="panel pn-r2-panel">'+
          '<div class="panel-head"><h2>WHEEL #1</h2><span class="pn-r2-state">THE JUDGEMENT</span></div>'+
          '<div class="panel-body pn-r2-stage">'+
            rouletteVerdictWheel()+
            '<button type="button" class="btn btn-primary pn-r2-spin" data-r2-spin-verdict '+(stake<=0?"disabled":"")+'>'+
              'SPIN THE VERDICT'+
            '</button>'+
            '<div class="pn-r2-legend">BET / FUCK OFF / SAVE MONEY</div>'+
          '</div>'+
        '</section>'+

        '<section class="panel pn-r2-panel '+(!wagerReady?"pn-r2-dormant":"")+'">'+
          '<div class="panel-head"><h2>WHEEL #2</h2><span class="pn-r2-state">THE WAGER</span></div>'+
          '<div class="panel-body pn-r2-stage">'+
            rouletteWagerWheel()+
            '<button type="button" class="btn btn-primary pn-r2-spin" data-r2-spin-wager '+(!wagerReady?"disabled":"")+'>'+
              'SPIN THE WAGER'+
            '</button>'+
            rouletteProtocolLegend()+
          '</div>'+
        '</section>'+
      '</div>'+

      '<div class="pn-r2-result-zone">'+
        rouletteResultTerminal()+
        '<div class="pn-r2-round-actions">'+roundAction+'</div>'+
      '</div>'+

      '<section class="panel pn-r2-panel pn-r2-pending-panel">'+
        '<div class="panel-head"><h2>IMPORT RESULT</h2><span class="pn-r2-state">WIN OR DEFEAT</span></div>'+
        '<div class="panel-body pn-no-pad">'+roulettePendingRows()+'</div>'+
      '</section>';
  }

  function rouletteResults(currency){
    return rouletteNoticeHtml()+
      '<section class="panel pn-r2-panel">'+
        '<div class="panel-head"><h2>ROULETTE LEDGER</h2><span class="pn-r2-state">PERMANENT DAMAGE RECORD</span></div>'+
        '<div class="panel-body pn-no-pad">'+
          '<div class="table-scroll">'+
            '<table>'+
              '<thead><tr>'+
                '<th>Date</th>'+
                '<th>Protocol</th>'+
                '<th>Result</th>'+
                '<th class="num">Invested</th>'+
                '<th class="num">Gained / Lost</th>'+
                '<th>Notes</th>'+
                '<th></th>'+
              '</tr></thead>'+
              '<tbody>'+rouletteHistoryRows(currency)+'</tbody>'+
            '</table>'+
          '</div>'+
        '</div>'+
      '</section>';
  }

  function rouletteTabs(){
    return '<div class="pn-r2-tabs">'+
      '<button type="button" class="'+(state.rouletteTab==="CHAMBER"?"active":"")+'" data-r2-tab="CHAMBER">CHAMBER</button>'+
      '<button type="button" class="'+(state.rouletteTab==="RESULTS"?"active":"")+'" data-r2-tab="RESULTS">RESULTS</button>'+
    '</div>';
  }

  function renderRouletteV2(){
    const currency = displayCurrency();
    const body = state.rouletteTab==="RESULTS" ? rouletteResults(currency) : rouletteChamber();

    return pageHeader("THE ROULETTE","CHAOS PROTOCOL ARMED","")+
      '<div class="content pn-r2-content">'+
        '<div class="pn-r2-header">'+
          '<span>PROBABILITY ENGINE</span>'+
          '<b>THE ROULETTE</b>'+
          '<small>BAD DECISIONS, CONTROLLED</small>'+
        '</div>'+
        rouletteStatsHtml(currency)+
        rouletteTabs()+
        body+
      '</div>';
  }

  function rouletteSpinWheel(kind,labels){
    if (rouletteSpinLocked) return;

    const stake = rouletteStakeValue();

    if (kind==="verdict" && stake<=0){
      state.rouletteNotice = {tone:"err",text:"ENTER THE AMOUNT BEFORE SUMMONING FATE."};
      render();
      return;
    }

    if (kind==="wager" && state.rouletteVerdict!=="BET") return;

    const selector = kind==="verdict" ? "[data-r2-verdict-wheel]" : "[data-r2-wager-wheel]";
    const wheel = document.querySelector(selector);
    if (!wheel) return;

    const index = rouletteRandomIndex(labels.length);
    const slice = 360/labels.length;
    const center = index*slice;
    const key = kind==="verdict" ? "rouletteVerdictRotation" : "rouletteWagerRotation";

    const current = Number(state[key])||0;
    const desired = ((-center)%360+360)%360;
    const currentMod = ((current%360)+360)%360;
    const delta = (desired-currentMod+360)%360;
    const target = current + 6*360 + delta;

    state[key] = target;
    state.rouletteNotice = null;
    rouletteSpinLocked = true;

    document.querySelectorAll("[data-r2-spin-verdict],[data-r2-spin-wager]").forEach(btn=>btn.disabled=true);

    wheel.style.transform = "rotate("+target+"deg)";
    wheel.classList.add("spinning");

    setTimeout(function(){
      if (kind==="verdict"){
        state.rouletteVerdict = labels[index];
        state.rouletteWager = null;
      } else {
        state.rouletteWager = labels[index];
      }

      rouletteSpinLocked = false;
      render();
    },3300);
  }

  function rouletteLockBet(){
    const stake = rouletteStakeValue();

    if (state.rouletteVerdict!=="BET" || !state.rouletteWager || stake<=0) return;

    const row = rouletteInsert({
      type:"BET",
      status:"PENDING",
      date:todayISO(),
      verdict:"BET",
      wager:state.rouletteWager,
      stake:stake,
      currency:state.rouletteCurrency||displayCurrency(),
      outcome:null,
      net:null,
      notes:"FATE ACCEPTED."
    });

    Timeline.log(
      "ROULETTE_BET",
      "THE ROULETTE \u00B7 "+state.rouletteWager,
      rouletteMoney(stake,row.currency)+" invested. FATE ACCEPTED.",
      row.date,
      "roulette",
      row.id
    );

    state.roulettePendingFocus = row.id;
    rouletteResetRound(true);
    state.rouletteNotice = {tone:"ok",text:"BET LOCKED. IMPORT THE RESULT WHEN THE DAMAGE IS KNOWN."};
    render();
  }

  function rouletteRecordResult(id){
    const row = rouletteLedger().find(item=>item.id===id);
    if (!row || row.type!=="BET" || row.status!=="PENDING") return;

    const outcomeEl = document.querySelector('[data-r2-result-outcome="'+CSS.escape(id)+'"]');
    const amountEl = document.querySelector('[data-r2-result-amount="'+CSS.escape(id)+'"]');

    const outcome = outcomeEl ? outcomeEl.value : "DEFEAT";
    const magnitude = Math.max(0,Number(amountEl && amountEl.value)||0);

    if (magnitude<=0){
      state.rouletteNotice = {tone:"err",text:"ENTER HOW MUCH MONEY WAS EARNED OR LOST."};
      render();
      return;
    }

    const net = outcome==="WIN" ? magnitude : -magnitude;

    Store.update(ROULETTE_LEDGER_KEY,id,{
      status:"RESOLVED",
      outcome:outcome,
      net:net,
      resultAmount:magnitude,
      resolvedAt:nowISO()
    });

    Timeline.log(
      "ROULETTE_RESULT",
      "THE ROULETTE RESULT \u00B7 "+outcome,
      row.wager+" \u00B7 NET "+rouletteMoney(net,row.currency),
      todayISO(),
      "roulette",
      id
    );

    state.roulettePendingFocus = null;
    state.rouletteNotice = {
      tone:net>=0?"ok":"err",
      text:"RESULT RECORDED. "+(net>=0?"GAIN ":"LOSS ")+rouletteMoney(Math.abs(net),row.currency)+"."
    };
    render();
  }

  function rouletteLogNonBetVerdict(){
    const verdict = state.rouletteVerdict;

    if (!["FUCK OFF","SAVE MONEY"].includes(verdict)) return;

    const row = rouletteInsert({
      type:"VERDICT",
      date:todayISO(),
      verdict:verdict,
      avoidedStake:rouletteStakeValue(),
      currency:state.rouletteCurrency||displayCurrency(),
      notes:rouletteVerdictMessage(verdict)
    });

    Timeline.log(
      "ROULETTE_VERDICT",
      "THE ROULETTE \u00B7 "+verdict,
      rouletteMoney(row.avoidedStake,row.currency)+" not invested.",
      row.date,
      "roulette",
      row.id
    );
  }

  function rouletteDeleteRecord(id){
    Store.remove(ROULETTE_LEDGER_KEY,id);

    if (state.roulettePendingFocus===id){
      state.roulettePendingFocus = null;
    }

    state.rouletteNotice = {tone:"ok",text:"ROULETTE RECORD DELETED."};
    render();
  }

  document.addEventListener("input",function(event){
    if (event.target.matches("[data-r2-stake]")){
      state.rouletteStake = event.target.value;

      const button = document.querySelector("[data-r2-spin-verdict]");
      if (button){
        button.disabled = rouletteStakeValue()<=0;
      }
    }
  });

  document.addEventListener("change",function(event){
    if (event.target.matches("[data-r2-currency]")){
      state.rouletteCurrency = event.target.value;
      state.rouletteNotice = null;
    }
  });

  document.addEventListener("click",function(event){
    const tab = event.target.closest("[data-r2-tab]");
    if (tab){
      state.rouletteTab = tab.dataset.r2Tab;
      state.rouletteNotice = null;
      render();
      return;
    }

    if (event.target.closest("[data-r2-spin-verdict]")){
      rouletteSpinWheel("verdict",VERDICTS);
      return;
    }

    if (event.target.closest("[data-r2-spin-wager]")){
      rouletteSpinWheel("wager",WAGERS);
      return;
    }

    if (event.target.closest("[data-r2-lock-bet]")){
      rouletteLockBet();
      return;
    }

    if (event.target.closest("[data-r2-new-round]")){
      rouletteLogNonBetVerdict();
      rouletteResetRound(true);
      render();
      return;
    }

    const result = event.target.closest("[data-r2-record-result]");
    if (result){
      rouletteRecordResult(result.dataset.r2RecordResult);
      return;
    }

    const del = event.target.closest("[data-r2-delete]");
    if (del){
      rouletteDeleteRecord(del.dataset.r2Delete);
    }
  });

  /* Backups: export already serializes the entire ledger object. Restore needs the custom arrays preserved. */
  if (typeof inspectBackupFile === "function"){
    const PNCoreInspectBackupRouletteV2 = inspectBackupFile;

    inspectBackupFile = function(raw){
      const counts = PNCoreInspectBackupRouletteV2(raw) || {};

      if (Array.isArray(raw[ROULETTE_LEDGER_KEY])){
        counts[ROULETTE_LEDGER_KEY] = raw[ROULETTE_LEDGER_KEY].length;
      }

      if (Array.isArray(raw[LEGACY_POOL_KEY])){
        counts[LEGACY_POOL_KEY] = raw[LEGACY_POOL_KEY].length;
      }

      return Object.keys(counts).length ? counts : null;
    };
  }

  if (Store && typeof Store.replaceAll === "function"){
    const PNCoreReplaceAllRouletteV2 = Store.replaceAll.bind(Store);

    Store.replaceAll = function(raw){
      PNCoreReplaceAllRouletteV2(raw);

      const data = Store.load();
      data[ROULETTE_LEDGER_KEY] = Array.isArray(raw && raw[ROULETTE_LEDGER_KEY]) ? raw[ROULETTE_LEDGER_KEY] : [];
      data[LEGACY_POOL_KEY] = Array.isArray(raw && raw[LEGACY_POOL_KEY]) ? raw[LEGACY_POOL_KEY] : [];
      Store.persist();
    };
  }

  if (typeof CSV_EXPORTS !== "undefined"){
    CSV_EXPORTS[ROULETTE_LEDGER_KEY] = {
      label:"Roulette Ledger",
      columns:[
        {label:"Date",get:row=>row.date||""},
        {label:"Type",get:row=>row.type||""},
        {label:"Verdict",get:row=>row.verdict||""},
        {label:"Protocol",get:row=>row.wager||""},
        {label:"Status",get:row=>row.status||""},
        {label:"Outcome",get:row=>row.outcome==="LOSE"?"DEFEAT":row.outcome||""},
        {label:"Money Invested",get:row=>row.type==="BET"?(row.stake||0):0},
        {label:"Money Gained Lost",get:row=>row.type==="BET"?(row.net||0):0},
        {label:"Currency",get:row=>row.currency||""},
        {label:"Notes",get:row=>row.notes||""}
      ]
    };
  }

  if (typeof ROUTES !== "undefined"){
    let route = ROUTES.find(row=>row.key==="roulette");

    if (!route){
      const backupIndex = ROUTES.findIndex(row=>row.key==="backup");
      route = {key:"roulette",label:"THE ROULETTE",nix:"10",render:renderRouletteV2};

      if (backupIndex>=0) ROUTES.splice(backupIndex,0,route);
      else ROUTES.push(route);

      ROUTES.forEach((row,index)=>row.nix=String(index+1).padStart(2,"0"));
    } else {
      route.label = "THE ROULETTE";
      route.render = renderRouletteV2;
    }
  }

  const style = document.createElement("style");

  style.textContent = `
  [data-route="roulette"]{
    position:relative;
    color:#d378ff !important;
  }

  [data-route="roulette"]:after{
    content:"";
    position:absolute;
    right:12px;
    top:50%;
    width:5px;
    height:5px;
    border-radius:50%;
    background:#ff315f;
    box-shadow:0 0 10px #ff315f;
    transform:translateY(-50%);
  }

  .pn-r2-content{
    position:relative;
    isolation:isolate;
  }

  .pn-r2-content:before{
    content:"";
    position:absolute;
    inset:0;
    z-index:-1;
    pointer-events:none;
    background:
      radial-gradient(circle at 17% 8%,rgba(172,27,95,.10),transparent 30%),
      radial-gradient(circle at 83% 15%,rgba(110,35,173,.11),transparent 29%),
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.008) 4px);
  }

  .pn-r2-header{
    border:1px solid rgba(177,66,225,.48);
    border-left:3px solid #ff315f;
    background:linear-gradient(110deg,rgba(80,10,34,.30),rgba(34,11,51,.32),rgba(12,9,16,.74));
    padding:14px 16px;
    margin-bottom:14px;
    display:grid;
    grid-template-columns:auto 1fr auto;
    align-items:center;
    gap:14px;
  }

  .pn-r2-header span,
  .pn-r2-header small{
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }

  .pn-r2-header span{color:#ff9bb4}
  .pn-r2-header small{color:var(--muted);text-align:right}
  .pn-r2-header b{font-size:16px;letter-spacing:.05em}

  .pn-r2-stats{
    display:grid;
    grid-template-columns:1fr 1fr;
    margin-bottom:14px;
    border:1px solid rgba(147,92,193,.48);
    background:rgba(12,9,16,.80);
  }

  .pn-r2-stats>div{
    min-height:82px;
    padding:14px 18px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:7px;
    border-right:1px solid rgba(147,92,193,.42);
  }

  .pn-r2-stats>div:last-child{border-right:0}

  .pn-r2-stats span{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }

  .pn-r2-stats b{
    font-family:var(--mono);
    font-size:22px;
  }

  .pn-r2-stats b.pos{color:var(--green)}
  .pn-r2-stats b.neg{color:var(--red)}

  .pn-r2-tabs{
    display:flex;
    margin-bottom:14px;
  }

  .pn-r2-tabs button{
    min-width:150px;
    padding:10px 16px;
    border:1px solid rgba(147,92,193,.45);
    border-right:0;
    background:rgba(14,10,20,.86);
    color:var(--muted);
    font:inherit;
    font-size:10px;
    font-weight:900;
    letter-spacing:.08em;
    cursor:pointer;
  }

  .pn-r2-tabs button:last-child{border-right:1px solid rgba(147,92,193,.45)}

  .pn-r2-tabs button.active{
    color:#f0ccff;
    background:rgba(126,36,161,.22);
    box-shadow:inset 0 -2px 0 #bd42ff;
  }

  .pn-r2-controls{
    display:grid;
    grid-template-columns:minmax(260px,1fr) 180px;
    gap:12px;
    margin-bottom:14px;
  }

  .pn-r2-controls label,
  .pn-r2-result-entry label{
    display:flex;
    flex-direction:column;
    gap:6px;
  }

  .pn-r2-controls label>span,
  .pn-r2-result-entry label>span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r2-controls input,
  .pn-r2-controls select,
  .pn-r2-result-entry input,
  .pn-r2-result-entry select{
    min-height:38px;
    border:1px solid rgba(147,92,193,.45);
    background:rgba(11,8,15,.92);
    color:var(--text);
    padding:8px 10px;
    font:inherit;
    font-family:var(--mono);
  }

  .pn-r2-wheel-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
    margin-bottom:16px;
  }

  .pn-r2-panel{
    border-color:rgba(147,92,193,.50);
    background:rgba(12,9,16,.82);
  }

  .pn-r2-panel .panel-head{
    border-bottom:1px solid rgba(147,92,193,.42);
  }

  .pn-r2-state{
    color:#a865cf;
    font-family:var(--mono);
    font-size:8px;
    letter-spacing:.08em;
  }

  .pn-r2-stage{
    min-height:470px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    gap:16px;
    padding-top:18px;
  }

  .pn-r2-wheel-shell{
    position:relative;
    width:min(330px,82vw);
    aspect-ratio:1;
    display:grid;
    place-items:center;
  }

  .pn-r2-pointer{
    position:absolute;
    top:-4px;
    left:50%;
    z-index:5;
    transform:translateX(-50%);
    width:0;
    height:0;
    border-left:14px solid transparent;
    border-right:14px solid transparent;
    border-top:0;
    border-bottom:26px solid #f2dcff;
    filter:drop-shadow(0 0 7px rgba(213,132,255,.48));
  }

  .pn-r2-wheel{
    position:relative;
    width:100%;
    height:100%;
    border-radius:50%;
    border:4px solid rgba(174,105,213,.72);
    box-shadow:
      0 0 0 2px rgba(43,29,50,.95),
      0 0 26px rgba(146,41,183,.18),
      inset 0 0 36px rgba(0,0,0,.52);
    transition:transform 3.3s cubic-bezier(.12,.67,.09,1);
  }

  .pn-r2-verdict-wheel{
    background:
      conic-gradient(
        #ae153f 0deg 120deg,
        #29252e 120deg 240deg,
        #14583d 240deg 360deg
      );
  }

  .pn-r2-wager-wheel{
    background:
      conic-gradient(
        #6d152d 0deg 51.428deg,
        #18161d 51.428deg 102.856deg,
        #8b1b39 102.856deg 154.284deg,
        #242029 154.284deg 205.712deg,
        #392041 205.712deg 257.140deg,
        #5a1830 257.140deg 308.568deg,
        #27202f 308.568deg 360deg
      );
  }

  .pn-r2-wheel-label{
    position:absolute;
    z-index:2;
    left:50%;
    top:50%;
    width:42%;
    transform-origin:0 0;
    transform:
      rotate(var(--a))
      translate(34%,-50%);
    color:#f4eafa;
    font-size:9px;
    font-weight:900;
    text-align:center;
    text-shadow:0 1px 3px #000;
  }

  .pn-r2-wheel-label::first-line{}

  .pn-r2-core{
    position:absolute;
    left:50%;
    top:50%;
    width:62px;
    height:62px;
    border-radius:50%;
    transform:translate(-50%,-50%);
    display:grid;
    place-items:center;
    background:radial-gradient(circle,#36113f,#0d0a11 68%);
    border:2px solid rgba(203,132,240,.72);
    color:#dba5f8;
    font-family:var(--mono);
    font-size:14px;
    font-weight:900;
    box-shadow:0 0 20px rgba(181,55,227,.20);
  }

  .pn-r2-spin{
    min-width:210px;
    min-height:42px;
  }

  .pn-r2-legend{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r2-protocol-key{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    width:100%;
    gap:5px 12px;
    padding:0 10px;
  }

  .pn-r2-protocol-key span{
    color:var(--muted);
    font-size:7.5px;
    white-space:nowrap;
  }

  .pn-r2-protocol-key b{
    color:#d5a1f0;
  }

  .pn-r2-dormant{
    opacity:.42;
    filter:saturate(.55);
  }

  .pn-r2-result-zone{
    border:1px solid rgba(147,92,193,.48);
    background:rgba(12,9,16,.82);
    padding:15px 16px;
    margin-bottom:16px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:14px;
  }

  .pn-r2-terminal{
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-r2-terminal span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r2-terminal b{
    font-family:var(--mono);
    font-size:24px;
    color:#d16eff;
  }

  .pn-r2-terminal small{
    color:var(--muted);
    font-size:8px;
  }

  .pn-r2-terminal.bet b{color:#ff416b}
  .pn-r2-terminal.save b{color:var(--green)}
  .pn-r2-terminal.retreat b{color:#c5bbc9}

  .pn-r2-wager-result{
    display:flex;
    flex-direction:column;
    gap:4px;
    margin-left:auto;
    padding-left:18px;
    border-left:1px solid rgba(147,92,193,.42);
  }

  .pn-r2-wager-result span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r2-wager-result b{
    color:#f4c4ff;
    font-family:var(--mono);
    font-size:18px;
  }

  .pn-r2-round-actions{
    margin-left:auto;
  }

  .pn-r2-pending-panel{
    margin-bottom:16px;
  }

  .pn-r2-pending{
    min-height:82px;
    padding:12px 14px;
    display:grid;
    grid-template-columns:minmax(180px,.7fr) minmax(0,1.5fr);
    gap:18px;
    align-items:center;
    border-bottom:1px solid rgba(147,92,193,.34);
  }

  .pn-r2-pending:last-child{border-bottom:0}

  .pn-r2-pending.focused{
    background:rgba(112,36,144,.11);
    box-shadow:inset 3px 0 0 #bd42ff;
  }

  .pn-r2-pending-copy{
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-r2-pending-copy span,
  .pn-r2-pending-copy small{
    color:var(--muted);
    font-size:8px;
  }

  .pn-r2-pending-copy b{
    font-size:12px;
  }

  .pn-r2-result-entry{
    display:grid;
    grid-template-columns:150px minmax(190px,1fr) auto;
    gap:10px;
    align-items:end;
  }

  .pn-r2-notice{
    margin-bottom:12px;
    padding:9px 12px;
    border:1px solid rgba(147,92,193,.44);
    background:rgba(75,28,93,.16);
    color:#d7b0ec;
    font-family:var(--mono);
    font-size:9px;
  }

  .pn-r2-notice.ok{
    border-color:rgba(52,200,117,.35);
    color:var(--green);
    background:var(--green-wash);
  }

  .pn-r2-notice.err{
    border-color:rgba(255,67,91,.38);
    color:var(--red);
    background:var(--red-wash);
  }

  .pn-r2-empty{
    min-height:70px;
    display:grid;
    place-items:center;
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.08em;
  }

  @media(max-width:1050px){
    .pn-r2-wheel-grid{
      grid-template-columns:1fr;
    }

    .pn-r2-stage{
      min-height:440px;
    }
  }

  @media(max-width:760px){
    .pn-r2-header{
      grid-template-columns:1fr;
    }

    .pn-r2-header small{text-align:left}

    .pn-r2-stats,
    .pn-r2-controls,
    .pn-r2-pending{
      grid-template-columns:1fr;
    }

    .pn-r2-stats>div{
      border-right:0;
      border-bottom:1px solid rgba(147,92,193,.42);
    }

    .pn-r2-stats>div:last-child{border-bottom:0}

    .pn-r2-result-entry{
      grid-template-columns:1fr;
    }

    .pn-r2-result-zone{
      align-items:flex-start;
      flex-direction:column;
    }

    .pn-r2-wager-result{
      margin-left:0;
      padding-left:0;
      border-left:0;
      padding-top:10px;
      border-top:1px solid rgba(147,92,193,.42);
    }

    .pn-r2-round-actions{
      margin-left:0;
    }
  }
  `;

  document.head.appendChild(style);
})();
