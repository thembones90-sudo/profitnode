"use strict";

/*
  PROFITNODE THE ROULETTE v3
  Canonical round flow:
  SET STAKE -> JUDGEMENT -> WAGER -> COMMITTED -> RESULT

  - Wheel #1: BET / FUCK OFF / SAVE MONEY.
  - Wheel #2:
      ODD RED
      ODD BLACK
      EVEN RED
      EVEN BLACK
      1ST + 2ND
      1ST + 3RD
      2ND + 3RD
  - A BET protocol always splits the entered stake 50/50 across its two legs.
  - Only two headline KPIs exist: MONEY INVESTED and MONEY GAINED / LOST.
  - Result entry is WIN / LOSS plus the net amount earned or lost.
  - Roulette keeps its own ledger; resolved bet net is included once in COMMAND Realized Profit.
*/

(function installProfitnodeRouletteV3(){
  const ROULETTE_LEDGER_KEY = "rouletteLedger";
  const LEGACY_POOL_KEY = "roulettePools";
  const ROULETTE_DOCTRINE_KEY = "rouletteDoctrine";
  const ROULETTE_FUND_KEY = "roulettePcBuildFund";

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

  const PROTOCOLS = {
    "ODD RED":["ODD","RED"],
    "ODD BLACK":["ODD","BLACK"],
    "EVEN RED":["EVEN","RED"],
    "EVEN BLACK":["EVEN","BLACK"],
    "1ST + 2ND":["1ST THIRD 1-12","2ND THIRD 13-24"],
    "1ST + 3RD":["1ST THIRD 1-12","3RD THIRD 25-36"],
    "2ND + 3RD":["2ND THIRD 13-24","3RD THIRD 25-36"]
  };

  function rouletteEnsureCollections(){
    const data = Store.load();
    let changed = false;

    if (!Array.isArray(data[ROULETTE_LEDGER_KEY])){
      data[ROULETTE_LEDGER_KEY] = [];
      changed = true;
    }

    if (!Array.isArray(data[LEGACY_POOL_KEY])){
      data[LEGACY_POOL_KEY] = [];
      changed = true;
    }

    if (changed) Store.persist();
  }

  rouletteEnsureCollections();

  function rouletteDoctrineLoad(){
    try{
      const raw = localStorage.getItem(ROULETTE_DOCTRINE_KEY);
      const rec = raw ? JSON.parse(raw) : null;
      if (rec && rec.lastJudgementAt) return rec;
    }catch(e){}
    return null;
  }

  function rouletteDoctrineSave(rec){
    try{ localStorage.setItem(ROULETTE_DOCTRINE_KEY, JSON.stringify(rec)); }catch(e){}
  }

  function rouletteDoctrineEvaluate(lastJudgementAt, nowMs){
    const after = Number(lastJudgementAt);

    if (!(after > 0)){
      return {locked:false,allowed:true,nextAt:0,remainingMs:0,label:"00:00:00"};
    }

    const now = !isNaN(Number(nowMs)) ? Number(nowMs) : Date.now();
    const last = new Date(after);
    const t12 = after + 12*3600000;
    const nextMidnight = new Date(last.getFullYear(),last.getMonth(),last.getDate()+1).getTime();
    const nextAt = Math.max(t12,nextMidnight);
    const remainingMs = Math.max(0,nextAt-now);

    return {
      locked:remainingMs>0,
      allowed:remainingMs<=0,
      nextAt:nextAt,
      remainingMs:remainingMs,
      label:rouletteDoctrineCountdown(remainingMs)
    };
  }

  function rouletteDoctrineCountdown(ms){
    if (!(ms>0)) return "00:00:00";
    const total = Math.ceil(ms/1000);
    const pad = n=>String(n).padStart(2,"0");
    return pad(Math.floor(total/3600))+":"+pad(Math.floor((total%3600)/60))+":"+pad(total%60);
  }

  function rouletteDoctrineGate(nowMs){
    const rec = rouletteDoctrineLoad();
    const gate = rouletteDoctrineEvaluate(rec && rec.lastJudgementAt, nowMs);
    gate.verdict = rec ? rec.verdict : null;
    gate.recorded = !!rec;
    return gate;
  }

  function rouletteDoctrineRecordJudgement(verdict){
    const rec = rouletteDoctrineLoad() || {};
    rec.lastJudgementAt = Date.now();
    rec.verdict = verdict;
    rec.round = {
      verdict:verdict,
      stake:rouletteStakeValue(),
      currency:rouletteCurrentCurrency(),
      wager:verdict==="BET" ? (state.rouletteWager||null) : null,
      committedId:state.rouletteCommittedId||null
    };
    rouletteDoctrineSave(rec);
  }

  function rouletteDoctrineUpdateRound(patch){
    const rec = rouletteDoctrineLoad();
    if (!rec || !rec.round) return;
    rec.round = Object.assign({},rec.round,patch);
    rouletteDoctrineSave(rec);
  }

  function rouletteDoctrineCompleteRound(){
    const rec = rouletteDoctrineLoad();
    if (!rec || !rec.round) return;
    rec.round = null;
    rouletteDoctrineSave(rec);
  }

  function rouletteRehydrateDoctrine(){
    const rec = rouletteDoctrineLoad();
    if (!rec || !rec.round || !rec.round.verdict) return;

    state.rouletteVerdict = rec.round.verdict;
    state.rouletteStake = String(rec.round.stake!=null ? rec.round.stake : (state.rouletteStake||""));
    state.rouletteCurrency = rec.round.currency || state.rouletteCurrency;
    state.rouletteWager = rec.round.wager || null;
    state.rouletteCommittedId = rec.round.committedId || null;
  }

  function rouletteDoctrineBannerHtml(){
    const gate = rouletteDoctrineGate();
    if (!gate.locked) return "";

    return '<div class="pn-r3-doctrine-locked" role="status">'+
      '<b>TODAY&#39;S VERDICT IS FINAL</b>'+
      '<span>NEXT JUDGEMENT AVAILABLE IN <em data-pn-r3-cooldown>'+gate.label+'</em></span>'+
    '</div>';
  }

  function rouletteFundLoad(){
    try{
      const raw = localStorage.getItem(ROULETTE_FUND_KEY);
      const fund = raw ? JSON.parse(raw) : null;
      if (fund && Array.isArray(fund.entries)) return fund;
    }catch(e){}
    return {entries:[]};
  }

  function rouletteFundSave(fund){
    try{ localStorage.setItem(ROULETTE_FUND_KEY, JSON.stringify(fund)); }catch(e){}
  }

  function rouletteFundAdd(kind,amount,currency,verdict,note){
    if (!(Number(amount)>0)) return;
    const fund = rouletteFundLoad();
    fund.entries.push({
      at:nowISO(),
      kind:kind,
      amount:Number(amount),
      currency:currency||"RSD",
      verdict:verdict||"",
      note:note||""
    });
    rouletteFundSave(fund);
  }

  function rouletteFundTotal(currency){
    return rouletteFundLoad().entries.reduce(
      (sum,entry)=>sum+convert(Number(entry.amount)||0,entry.currency,currency),
      0
    );
  }

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
    return Math.max(0,Math.round(Number(state.rouletteStake)||0));
  }

  function rouletteCurrentCurrency(){
    return state.rouletteCurrency || displayCurrency();
  }

  function rouletteSplitStake(stake){
    const first = Math.floor(stake/2);
    return [first,stake-first];
  }

  function rouletteProtocolParts(protocol,stake){
    const labels = PROTOCOLS[protocol] || [protocol,""];
    const split = rouletteSplitStake(stake);
    return [
      {label:labels[0],amount:split[0]},
      {label:labels[1],amount:split[1]}
    ];
  }

  function rouletteResetRound(options){
    const keepStake = !!(options && options.keepStake);

    if (!keepStake) state.rouletteStake = "";

    state.rouletteVerdict = null;
    state.rouletteWager = null;
    state.rouletteCommittedId = null;
    state.rouletteNotice = null;
  }

  state.rouletteTab = state.rouletteTab==="RESULTS" ? "RESULTS" : "CHAMBER";
  state.rouletteStake = state.rouletteStake || "";
  state.rouletteCurrency = state.rouletteCurrency || displayCurrency();
  state.rouletteVerdict = null;
  state.rouletteWager = null;
  state.rouletteCommittedId = null;
  state.rouletteVerdictRotation = Number(state.rouletteVerdictRotation)||0;
  state.rouletteWagerRotation = Number(state.rouletteWagerRotation)||0;
  state.rouletteNotice = null;

  let rouletteSpinLocked = false;

  function rouletteRowNet(row,currency){
    if (row.type!=="BET" || row.status!=="RESOLVED") return 0;

    if (row.net!=null){
      return convert(Number(row.net)||0,row.currency,currency);
    }

    if (row.returned!=null){
      const legacyNet = (Number(row.returned)||0) - (Number(row.stake)||0);
      return convert(legacyNet,row.currency,currency);
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

  if (typeof dashboardStats === "function"){
    const pnShopDashboardStats = dashboardStats;
    dashboardStats = function(currency){
      const stats = pnShopDashboardStats(currency);
      const rouletteNet = rouletteStats(currency).net;
      stats.shopRealizedProfit = stats.realizedProfit;
      stats.rouletteRealizedProfit = rouletteNet;
      stats.realizedProfit += rouletteNet;
      return stats;
    };
  }

  function rouletteStatsHtml(currency){
    const stats = rouletteStats(currency);

    return '<div class="pn-r3-stats">'+
      '<div class="pn-r3-invested">'+
        '<span>MONEY INVESTED</span>'+
        '<b>'+money(stats.invested,currency)+'</b>'+
      '</div>'+
      '<div class="pn-r3-net">'+
        '<span>MONEY GAINED / LOST</span>'+
        '<b class="'+(stats.net>0?"pos":stats.net<0?"neg":"zero")+'">'+money(stats.net,currency)+'</b>'+
      '</div>'+
      '<div class="pn-r3-fund">'+
        '<span>PC BUILD FUND</span>'+
        '<b class="pos">'+money(rouletteFundTotal(currency),currency)+'</b>'+
      '</div>'+
    '</div>';
  }

  function rouletteVerdictMessage(verdict){
    if (verdict==="BET") return "POOR JUDGMENT AUTHORIZED";
    if (verdict==="SAVE MONEY") return "CAPITAL PRESERVATION ORDER";
    return "THE NODE REJECTS THIS NONSENSE";
  }

  function rouletteNoticeHtml(){
    if (!state.rouletteNotice) return "";
    return '<div class="pn-r3-notice '+escAttr(state.rouletteNotice.tone||"info")+'">'+escHtml(state.rouletteNotice.text)+'</div>';
  }

  function rouletteRoundNumber(){
    return rouletteLedger().length + 1;
  }

  function rouletteStage(){
    if (state.rouletteCommittedId) return "RESULT";
    if (state.rouletteWager) return "COMMITTED";
    if (state.rouletteVerdict==="BET") return "WAGER";
    if (state.rouletteVerdict) return "JUDGEMENT";
    return "STAKE";
  }

  function rouletteStageStrip(){
    const current = rouletteStage();
    const verdictBet = state.rouletteVerdict==="BET";
    const committed = !!state.rouletteCommittedId;
    const stages = [
      {key:"STAKE",label:"SET STAKE",done:rouletteStakeValue()>0},
      {key:"JUDGEMENT",label:"JUDGEMENT",done:!!state.rouletteVerdict},
      {key:"WAGER",label:"WAGER",done:!!state.rouletteWager},
      {key:"COMMITTED",label:"COMMITTED",done:committed},
      {key:"RESULT",label:"RESULT",done:false}
    ];

    if (state.rouletteVerdict && !verdictBet){
      stages[2].blocked = true;
      stages[3].blocked = true;
      stages[4].blocked = true;
    }

    return '<div class="pn-r3-stage-strip">'+stages.map(stage=>{
      let cls = "";
      if (stage.done) cls = "done";
      if (stage.key===current) cls += " current";
      if (stage.blocked) cls += " blocked";

      const mark = stage.done ? "OK" : stage.blocked ? "X" : stage.key===current ? ">" : "o";

      return '<div class="'+cls.trim()+'"><span>'+mark+'</span><b>'+stage.label+'</b></div>';
    }).join("")+'</div>';
  }

  function rouletteWheelLabels(labels,rotation){
    const count = labels.length;
    const wheelRotation = Number(rotation)||0;

    return labels.map((label,index)=>{
      const angle = -90 + (index+0.5)*(360/count);
      return '<span class="pn-r3-wheel-label" style="--a:'+angle+'deg;--neg-a:'+(-angle)+'deg;--neg-r:'+(-wheelRotation)+'deg">'+escHtml(label)+'</span>';
    }).join("");
  }

  function rouletteVerdictWheel(){
    return '<div class="pn-r3-wheel-shell">'+
      '<div class="pn-r3-pointer"></div>'+
      '<div class="pn-r3-wheel pn-r3-verdict-wheel" data-r3-verdict-wheel style="transform:rotate('+state.rouletteVerdictRotation+'deg)">'+
        rouletteWheelLabels(VERDICTS,state.rouletteVerdictRotation)+
        '<div class="pn-r3-core">PN</div>'+
      '</div>'+
    '</div>';
  }

  function rouletteWagerWheel(){
    return '<div class="pn-r3-wheel-shell">'+
      '<div class="pn-r3-pointer"></div>'+
      '<div class="pn-r3-wheel pn-r3-wager-wheel" data-r3-wager-wheel style="transform:rotate('+state.rouletteWagerRotation+'deg)">'+
        rouletteWheelLabels(WAGERS,state.rouletteWagerRotation)+
        '<div class="pn-r3-core">R</div>'+
      '</div>'+
    '</div>';
  }

  function rouletteProtocolSplitHtml(protocol,stake,currency){
    if (!protocol || stake<=0) return "";

    const parts = rouletteProtocolParts(protocol,stake);

    return '<div class="pn-r3-split">'+
      '<div><span>'+escHtml(parts[0].label)+'</span><b>'+rouletteMoney(parts[0].amount,currency)+'</b></div>'+
      '<div><span>'+escHtml(parts[1].label)+'</span><b>'+rouletteMoney(parts[1].amount,currency)+'</b></div>'+
    '</div>';
  }

  function rouletteProtocolLegend(){
    return '<div class="pn-r3-protocol-key">'+
      '<span><b>ODD RED</b> ODD + RED</span>'+
      '<span><b>ODD BLACK</b> ODD + BLACK</span>'+
      '<span><b>EVEN RED</b> EVEN + RED</span>'+
      '<span><b>EVEN BLACK</b> EVEN + BLACK</span>'+
      '<span><b>1ST + 2ND</b> 1-12 + 13-24</span>'+
      '<span><b>1ST + 3RD</b> 1-12 + 25-36</span>'+
      '<span><b>2ND + 3RD</b> 13-24 + 25-36</span>'+
    '</div>';
  }

  function rouletteResultTerminal(){
    const stake = rouletteStakeValue();
    const currency = rouletteCurrentCurrency();

    if (!state.rouletteVerdict){
      return '<div class="pn-r3-terminal idle"><span>ROUND #'+String(rouletteRoundNumber()).padStart(3,"0")+'</span><b>FATE AWAITS INPUT</b><small>SET STAKE AND SPIN THE JUDGEMENT</small></div>';
    }

    if (state.rouletteVerdict!=="BET"){
      return '<div class="pn-r3-terminal '+(state.rouletteVerdict==="SAVE MONEY"?"save":"retreat")+'">'+
        '<span>THE NODE HAS SPOKEN</span>'+
        '<b>'+escHtml(state.rouletteVerdict)+'</b>'+
        '<small>'+escHtml(rouletteVerdictMessage(state.rouletteVerdict))+'</small>'+
      '</div>';
    }

    if (!state.rouletteWager){
      return '<div class="pn-r3-terminal bet">'+
        '<span>THE NODE HAS SPOKEN</span>'+
        '<b>BET</b>'+
        '<small>SPIN WHEEL #2 FOR THE PROTOCOL</small>'+
      '</div>';
    }

    return '<div class="pn-r3-protocol-terminal">'+
      '<div class="pn-r3-protocol-title">'+
        '<span>THE NODE HAS SPOKEN</span>'+
        '<b>'+escHtml(state.rouletteWager)+'</b>'+
        '<small>TOTAL EXPOSURE '+rouletteMoney(stake,currency)+' / SPLIT 50-50</small>'+
      '</div>'+
      rouletteProtocolSplitHtml(state.rouletteWager,stake,currency)+
    '</div>';
  }

  function rouletteCommittedRow(){
    if (!state.rouletteCommittedId) return null;
    return rouletteLedger().find(row=>row.id===state.rouletteCommittedId) || null;
  }

  function rouletteAwaitingResult(row){
    if (!row){
      state.rouletteCommittedId = null;
      return "";
    }

    const parts = rouletteProtocolParts(row.wager,Number(row.stake)||0);

    return rouletteNoticeHtml()+
      '<section class="panel pn-r3-panel pn-r3-awaiting">'+
        '<div class="panel-head"><h2>AWAITING RESULT</h2><span class="pn-r3-state">ROUND LOCKED</span></div>'+
        '<div class="panel-body">'+
          '<div class="pn-r3-awaiting-head">'+
            '<div><span>PROTOCOL</span><b>'+escHtml(row.wager)+'</b></div>'+
            '<div><span>MONEY INVESTED</span><b>'+rouletteMoney(row.stake,row.currency)+'</b></div>'+
          '</div>'+
          '<div class="pn-r3-awaiting-split">'+
            '<div><span>'+escHtml(parts[0].label)+'</span><b>'+rouletteMoney(parts[0].amount,row.currency)+'</b></div>'+
            '<div><span>'+escHtml(parts[1].label)+'</span><b>'+rouletteMoney(parts[1].amount,row.currency)+'</b></div>'+
          '</div>'+
          '<div class="pn-r3-result-form">'+
            '<label><span>RESULT</span><select data-r3-result-outcome="'+row.id+'">'+
              '<option value="WIN">WIN</option>'+
              '<option value="LOSS">LOSS</option>'+
            '</select></label>'+
            '<label><span>MONEY EARNED / LOST</span><input type="number" min="0" step="1" data-r3-result-amount="'+row.id+'" placeholder="0"></label>'+
            '<button type="button" class="btn btn-primary" data-r3-record-result="'+row.id+'">RECORD RESULT</button>'+
          '</div>'+
          '<div class="pn-r3-result-hint">WIN adds the entered net amount to Realized Profit. LOSS subtracts it. The stake is already known.</div>'+
        '</div>'+
      '</section>';
  }

function rouletteChamber(){
    const committed = rouletteCommittedRow();
    if (committed) return rouletteAwaitingResult(committed);

    const stake = rouletteStakeValue();
    const currency = rouletteCurrentCurrency();
    const hasVerdict = !!state.rouletteVerdict;
    const wagerReady = state.rouletteVerdict==="BET";
    const wagerDone = !!state.rouletteWager;
    const gate = rouletteDoctrineGate();
    const roundClosedByDoctrine = hasVerdict || gate.locked;

    let action = "";

    if (wagerDone){
      action = '<button type="button" class="btn btn-primary pn-r3-commit" data-r3-commit>COMMIT THE DAMAGE</button>';
    } else if (state.rouletteVerdict==="FUCK OFF" || state.rouletteVerdict==="SAVE MONEY"){
      action = '<button type="button" class="btn" data-r3-close-round>END ROUND</button>';
    }

    return rouletteNoticeHtml()+
      rouletteDoctrineBannerHtml()+
      '<div class="pn-r3-controls">'+
        '<label><span>STAKE</span><input type="number" min="0" step="1" value="'+escAttr(state.rouletteStake)+'" data-r3-stake placeholder="3000" '+(roundClosedByDoctrine?"disabled":"")+'></label>'+
        '<label><span>CURRENCY</span><select data-r3-currency '+(roundClosedByDoctrine?"disabled":"")+'>'+
          '<option value="RSD"'+(currency==="RSD"?" selected":"")+'>RSD</option>'+
          '<option value="EUR"'+(currency==="EUR"?" selected":"")+'>EUR</option>'+
        '</select></label>'+
      '</div>'+

      '<div class="pn-r3-wheel-grid">'+
        '<section class="panel pn-r3-panel '+(roundClosedByDoctrine?"pn-r3-locked-wheel":"")+'">'+
          '<div class="panel-head"><h2>WHEEL #1</h2><span class="pn-r3-state">THE JUDGEMENT</span></div>'+
          '<div class="panel-body pn-r3-stage">'+
            rouletteVerdictWheel()+
            '<button type="button" class="btn btn-primary pn-r3-spin" data-r3-spin-verdict '+(stake<=0||roundClosedByDoctrine?"disabled":"")+'>'+
              (hasVerdict?"JUDGEMENT LOCKED":gate.locked?"VERDICT FINAL":"SPIN THE VERDICT")+
            '</button>'+
            '<div class="pn-r3-legend">BET / FUCK OFF / SAVE MONEY</div>'+
          '</div>'+
        '</section>'+

        '<section class="panel pn-r3-panel '+(!wagerReady?"pn-r3-dormant":"")+' '+(wagerDone?"pn-r3-locked-wheel":"")+'">'+
          '<div class="panel-head"><h2>WHEEL #2</h2><span class="pn-r3-state">THE WAGER</span></div>'+
          '<div class="panel-body pn-r3-stage">'+
            rouletteWagerWheel()+
            '<button type="button" class="btn btn-primary pn-r3-spin" data-r3-spin-wager '+(!wagerReady||wagerDone?"disabled":"")+'>'+
              (wagerDone?"PROTOCOL LOCKED":"SPIN THE WAGER")+
            '</button>'+
            rouletteProtocolLegend()+
          '</div>'+
        '</section>'+
      '</div>'+

      '<div class="pn-r3-result-zone">'+
        rouletteResultTerminal()+
        '<div class="pn-r3-actions">'+action+'</div>'+
      '</div>';
  }

  function rouletteHistoryRows(currency){
    const rows = rouletteLedger()
      .slice()
      .sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));

    if (!rows.length){
      return '<tr class="empty-row"><td colspan="7">No roulette rounds recorded yet.</td></tr>';
    }

    const chronological = rows.slice().sort((a,b)=>String(a.createdAt||a.date||"").localeCompare(String(b.createdAt||b.date||"")));
    const roundNumber = new Map(chronological.map((row,index)=>[row.id,index+1]));

    return rows.map(row=>{
      let result = "";
      let protocol = "-";
      let stake = "-";
      let net = null;

      if (row.type==="BET"){
        protocol = row.wager || "BET";
        stake = rouletteMoney(row.stake,row.currency);
        result = row.status==="PENDING" ? "AWAITING RESULT" : (["LOSE","DEFEAT","LOSS"].includes(row.outcome)?"LOSS":row.outcome||"RESOLVED");
        net = row.status==="RESOLVED" ? rouletteRowNet(row,currency) : null;
      } else {
        protocol = row.wager || "-";
        result = row.outcome==="DEFIED" ? "NODE DEFIED" : (row.verdict || "VERDICT");
      }

      return '<tr>'+
        '<td class="mono">#'+String(roundNumber.get(row.id)||0).padStart(3,"0")+'</td>'+
        '<td class="mono">'+fmtDate(row.date)+'</td>'+
        '<td class="num">'+stake+'</td>'+
        '<td>'+escHtml(row.verdict||"BET")+'</td>'+
        '<td><b>'+escHtml(protocol)+'</b></td>'+
        '<td class="pn-r3-result '+(result==="WIN"?"pos":result==="LOSS"?"neg":"")+'">'+escHtml(result)+'</td>'+
        '<td class="num '+(net==null?"":net>=0?"pos":"neg")+'">'+(net==null?"-":money(net,currency))+'</td>'+
      '</tr>';
    }).join("");
  }

  function rouletteResults(currency){
    return rouletteNoticeHtml()+
      '<section class="panel pn-r3-panel">'+
        '<div class="panel-head"><h2>ROUND HISTORY</h2><span class="pn-r3-state">PERMANENT EVIDENCE</span></div>'+
        '<div class="panel-body pn-no-pad">'+
          '<div class="table-scroll">'+
            '<table>'+
              '<thead><tr>'+
                '<th>Round</th>'+
                '<th>Date</th>'+
                '<th class="num">Stake</th>'+
                '<th>Judgement</th>'+
                '<th>Protocol</th>'+
                '<th>Result</th>'+
                '<th class="num">Net</th>'+
              '</tr></thead>'+
              '<tbody>'+rouletteHistoryRows(currency)+'</tbody>'+
            '</table>'+
          '</div>'+
        '</div>'+
      '</section>';
  }

  function rouletteTabs(){
    return '<div class="pn-r3-tabs">'+
      '<button type="button" class="'+(state.rouletteTab==="CHAMBER"?"active":"")+'" data-r3-tab="CHAMBER">CHAMBER</button>'+
      '<button type="button" class="'+(state.rouletteTab==="RESULTS"?"active":"")+'" data-r3-tab="RESULTS">RESULTS</button>'+
    '</div>';
  }

  function renderRouletteV3(){
    const currency = displayCurrency();
    const body = state.rouletteTab==="RESULTS" ? rouletteResults(currency) : rouletteChamber();

    return pageHeader("THE ROULETTE","CHAOS PROTOCOL ARMED","")+
      '<div class="content pn-r3-content">'+
        '<div class="pn-r3-header">'+
          '<span>PROBABILITY ENGINE</span>'+
          '<b>THE ROULETTE</b>'+
          '<small>BAD DECISIONS, CONTROLLED</small>'+
        '</div>'+
        rouletteStatsHtml(currency)+
        rouletteStageStrip()+
        rouletteTabs()+
        body+
      '</div>';
  }

  function rouletteSpinWheel(kind,labels){
    if (rouletteSpinLocked) return;

    const gate = rouletteDoctrineGate();

    if (kind==="verdict" && gate.locked){
      state.rouletteNotice = {tone:"err",text:"TODAY'S VERDICT IS FINAL. ONE DAY, ONE JUDGEMENT, NO APPEAL."};
      render();
      return;
    }

    const stake = rouletteStakeValue();

    if (kind==="verdict" && stake<=0){
      state.rouletteNotice = {tone:"err",text:"ENTER THE STAKE BEFORE SUMMONING FATE."};
      render();
      return;
    }

    if (kind==="verdict" && state.rouletteVerdict) return;
    if (kind==="wager" && (state.rouletteVerdict!=="BET" || state.rouletteWager)) return;

    const selector = kind==="verdict" ? "[data-r3-verdict-wheel]" : "[data-r3-wager-wheel]";
    const wheel = document.querySelector(selector);
    if (!wheel) return;

    const index = rouletteRandomIndex(labels.length);
    const slice = 360/labels.length;
    const center = (index+0.5)*slice;
    const key = kind==="verdict" ? "rouletteVerdictRotation" : "rouletteWagerRotation";

    const current = Number(state[key])||0;
    const desired = ((-center)%360+360)%360;
    const currentMod = ((current%360)+360)%360;
    const delta = (desired-currentMod+360)%360;
    const target = current + 6*360 + delta;

    state[key] = target;
    state.rouletteNotice = null;
    rouletteSpinLocked = true;

    document.querySelectorAll("[data-r3-spin-verdict],[data-r3-spin-wager]").forEach(btn=>btn.disabled=true);

    wheel.style.transform = "rotate("+target+"deg)";
    wheel.classList.add("spinning");

    setTimeout(function(){
      if (kind==="verdict"){
        state.rouletteVerdict = labels[index];
        state.rouletteWager = null;
        rouletteDoctrineRecordJudgement(labels[index]);
      } else {
        state.rouletteWager = labels[index];
        rouletteDoctrineUpdateRound({wager:labels[index]});
      }

      rouletteSpinLocked = false;
      render();
    },3300);
  }

  function rouletteCommit(){
    const stake = rouletteStakeValue();
    const currency = rouletteCurrentCurrency();

    if (state.rouletteVerdict!=="BET" || !state.rouletteWager || stake<=0) return;

    const parts = rouletteProtocolParts(state.rouletteWager,stake);

    const row = rouletteInsert({
      type:"BET",
      status:"PENDING",
      date:todayISO(),
      verdict:"BET",
      wager:state.rouletteWager,
      stake:stake,
      split:[
        {label:parts[0].label,amount:parts[0].amount},
        {label:parts[1].label,amount:parts[1].amount}
      ],
      currency:currency,
      outcome:null,
      net:null,
      notes:"FATE ACCEPTED."
    });

    Timeline.log(
      "ROULETTE_BET",
      "THE ROULETTE \u00B7 "+state.rouletteWager,
      rouletteMoney(stake,currency)+" invested / "+rouletteMoney(parts[0].amount,currency)+" "+parts[0].label+" / "+rouletteMoney(parts[1].amount,currency)+" "+parts[1].label,
      row.date,
      "roulette",
      row.id
    );

    state.rouletteCommittedId = row.id;
    state.rouletteNotice = {tone:"ok",text:"DAMAGE COMMITTED. AWAITING RESULT."};
    rouletteDoctrineUpdateRound({wager:state.rouletteWager,committedId:row.id});
    render();
  }

  function rouletteCloseRound(){
    const verdict = state.rouletteVerdict;
    if (!["FUCK OFF","SAVE MONEY"].includes(verdict)) return;

    const row = rouletteInsert({
      type:"VERDICT",
      date:todayISO(),
      verdict:verdict,
      wager:null,
      avoidedStake:rouletteStakeValue(),
      currency:rouletteCurrentCurrency(),
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

    rouletteResetRound({keepStake:true});
    rouletteDoctrineCompleteRound();

    if (verdict==="SAVE MONEY"){
      rouletteFundAdd("SAVED",row.avoidedStake,row.currency,verdict,"Roulette save");
      state.rouletteNotice = {tone:"ok",text:"VERDICT FINAL. "+rouletteMoney(row.avoidedStake,row.currency)+" SAVED INTO PC BUILD FUND."};
    } else {
      state.rouletteNotice = {tone:"ok",text:"VERDICT FINAL. THE NODE REJECTS THIS NONSENSE. MONEY REMAINS YOURS."};
    }

    render();
  }

  function rouletteRecordResult(id){
    const row = rouletteLedger().find(item=>item.id===id);
    if (!row || row.type!=="BET" || row.status!=="PENDING") return;

    const outcomeEl = document.querySelector('[data-r3-result-outcome="'+CSS.escape(id)+'"]');
    const amountEl = document.querySelector('[data-r3-result-amount="'+CSS.escape(id)+'"]');

    const outcome = outcomeEl ? outcomeEl.value : "LOSS";
    const magnitude = Math.max(0,Math.round(Number(amountEl && amountEl.value)||0));

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

    rouletteResetRound({keepStake:false});
    rouletteDoctrineCompleteRound();

    if (net>0){
      rouletteFundAdd("WIN",net,row.currency,"BET","Roulette win");
    }

    state.rouletteNotice = {
      tone:net>=0?"ok":"err",
      text:"ROUND CLOSED. "+(net>=0?"GAIN ":"LOSS ")+rouletteMoney(Math.abs(net),row.currency)+"."+(net>0?" ROUTED INTO PC BUILD FUND.":" VERDICT STANDS.")
    };
    render();
  }

  function rouletteResumePending(){
    if (state.rouletteCommittedId) return;

    const pending = rouletteLedger()
      .filter(row=>row.type==="BET" && row.status==="PENDING")
      .slice()
      .sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));

    if (!pending.length) return;

    const row = pending[0];
    state.rouletteCommittedId = row.id;
    state.rouletteStake = String(row.stake||"");
    state.rouletteCurrency = row.currency || displayCurrency();
    state.rouletteVerdict = "BET";
    state.rouletteWager = row.wager || null;
  }

  rouletteRehydrateDoctrine();
  rouletteResumePending();

  setInterval(function(){
    const cooldownEl = document.querySelector("[data-pn-r3-cooldown]");
    if (!cooldownEl) return;

    const gate = rouletteDoctrineGate();
    if (!gate.locked) return;
    cooldownEl.textContent = gate.label;
  },1000);

  document.addEventListener("input",function(event){
    if (event.target.matches("[data-r3-stake]")){
      state.rouletteStake = event.target.value;

      const button = document.querySelector("[data-r3-spin-verdict]");
      if (button){
        button.disabled = rouletteStakeValue()<=0 || !!state.rouletteVerdict;
      }
    }
  });

  document.addEventListener("change",function(event){
    if (event.target.matches("[data-r3-currency]")){
      state.rouletteCurrency = event.target.value;
      state.rouletteNotice = null;
    }
  });

  document.addEventListener("click",function(event){
    const tab = event.target.closest("[data-r3-tab]");
    if (tab){
      state.rouletteTab = tab.dataset.r3Tab;
      state.rouletteNotice = null;
      render();
      return;
    }

    if (event.target.closest("[data-r3-spin-verdict]")){
      rouletteSpinWheel("verdict",VERDICTS);
      return;
    }

    if (event.target.closest("[data-r3-spin-wager]")){
      rouletteSpinWheel("wager",WAGERS);
      return;
    }

    if (event.target.closest("[data-r3-commit]")){
      rouletteCommit();
      return;
    }

    if (event.target.closest("[data-r3-close-round]")){
      rouletteCloseRound();
      return;
    }

    const result = event.target.closest("[data-r3-record-result]");
    if (result){
      rouletteRecordResult(result.dataset.r3RecordResult);
    }
  });

  if (typeof inspectBackupFile === "function"){
    const PNCoreInspectBackupRouletteV3 = inspectBackupFile;

    inspectBackupFile = function(raw){
      const counts = PNCoreInspectBackupRouletteV3(raw) || {};

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
    const PNCoreReplaceAllRouletteV3 = Store.replaceAll.bind(Store);

    Store.replaceAll = function(raw){
      PNCoreReplaceAllRouletteV3(raw);

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
        {label:"Judgement",get:row=>row.verdict||""},
        {label:"Protocol",get:row=>row.wager||""},
        {label:"Result",get:row=>["LOSE","DEFEAT","LOSS"].includes(row.outcome)?"LOSS":row.outcome||row.status||""},
        {label:"Money Invested",get:row=>row.type==="BET"?(row.stake||0):0},
        {label:"Money Gained Lost",get:row=>row.type==="BET"?(row.net||0):0},
        {label:"Currency",get:row=>row.currency||""},
        {label:"Notes",get:row=>row.notes||""}
      ]
    };
  }

  if (typeof window !== "undefined" && !window.__pnRouletteDoctrine){
    window.__pnRouletteDoctrine = {
      evaluate:rouletteDoctrineEvaluate,
      countdown:rouletteDoctrineCountdown,
      gate:rouletteDoctrineGate,
      record:rouletteDoctrineRecordJudgement,
      updateRound:rouletteDoctrineUpdateRound,
      completeRound:rouletteDoctrineCompleteRound,
      rehydrate:rouletteRehydrateDoctrine,
      fundAdd:rouletteFundAdd,
      fundTotal:rouletteFundTotal,
      KEY:ROULETTE_DOCTRINE_KEY,
      FUND_KEY:ROULETTE_FUND_KEY
    };
  }

  if (typeof ROUTES !== "undefined"){
    let route = ROUTES.find(row=>row.key==="roulette");

    if (!route){
      const backupIndex = ROUTES.findIndex(row=>row.key==="backup");
      route = {key:"roulette",label:"THE ROULETTE",render:renderRouletteV3};

      if (backupIndex>=0) ROUTES.splice(backupIndex,0,route);
      else ROUTES.push(route);

    } else {
      route.label = "THE ROULETTE";
      route.render = renderRouletteV3;
    }
  }

  const style = document.createElement("style");

  style.textContent = `
  [data-route="roulette"]{
    position:relative;
    color:#d378ff !important;
  }

  .pn-r3-content{
    position:relative;
    isolation:isolate;
  }

  .pn-r3-content:before{
    content:"";
    position:absolute;
    inset:0;
    z-index:-1;
    pointer-events:none;
    background:
      radial-gradient(circle at 17% 8%,rgba(172,27,95,.11),transparent 30%),
      radial-gradient(circle at 83% 15%,rgba(110,35,173,.12),transparent 29%),
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.008) 4px);
  }

  .pn-r3-header{
    border:1px solid rgba(177,66,225,.52);
    border-left:3px solid #ff315f;
    background:linear-gradient(110deg,rgba(80,10,34,.31),rgba(34,11,51,.33),rgba(12,9,16,.76));
    padding:14px 16px;
    margin-bottom:14px;
    display:grid;
    grid-template-columns:auto 1fr auto;
    align-items:center;
    gap:14px;
  }

  .pn-r3-header span,
  .pn-r3-header small{
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }

  .pn-r3-header span{color:#ff9bb4}
  .pn-r3-header small{color:var(--muted);text-align:right}
  .pn-r3-header b{font-size:16px;letter-spacing:.05em}

  .pn-r3-stats{
    display:grid;
    grid-template-columns:1fr 1fr;
    border:1px solid rgba(147,92,193,.52);
    background:rgba(12,9,16,.84);
    margin-bottom:14px;
  }

  .pn-r3-stats>div{
    min-height:102px;
    padding:15px 20px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:8px;
    border-right:1px solid rgba(147,92,193,.45);
  }

  .pn-r3-stats>div:last-child{border-right:0}

  .pn-r3-stats span{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
  }

  .pn-r3-stats b{
    font-family:var(--mono);
    font-size:25px;
  }

  .pn-r3-net b{
    font-size:clamp(28px,3vw,42px);
    letter-spacing:-.04em;
  }

  .pn-r3-stats b.pos{color:var(--green)}
  .pn-r3-stats b.neg{color:var(--red)}
  .pn-r3-stats b.zero{color:#c36cf1}
  .pn-r3-panel td.pn-r3-result.pos,.pn-r3-panel td.num.pos{color:var(--green);font-weight:900}
  .pn-r3-panel td.pn-r3-result.neg,.pn-r3-panel td.num.neg{color:var(--red);font-weight:900}

  .pn-r3-fund b{
    color:#8fd3ff;
  }

  .pn-r3-doctrine-locked{
    margin-bottom:14px;
    padding:12px 14px;
    gap:12px;
    flex-wrap:wrap;
    display:flex;
    align-items:center;
    justify-content:space-between;
    border:1px solid rgba(255,196,57,.45);
    background:linear-gradient(135deg,rgba(120,86,24,.22),rgba(60,20,70,.18));
  }

  .pn-r3-doctrine-locked b{
    color:#ffe08a;
    font-size:11px;
    font-weight:900;
    letter-spacing:.16em;
  }

  .pn-r3-doctrine-locked span{
    color:var(--muted);
    font-family:var(--mono);
    font-size:9px;
    letter-spacing:.06em;
  }

  .pn-r3-doctrine-locked em{
    color:#ffe08a;
    font-style:normal;
    font-size:14px;
  }

  .pn-r3-stage-strip{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    border:1px solid rgba(147,92,193,.45);
    background:rgba(12,9,16,.72);
    margin-bottom:14px;
  }

  .pn-r3-stage-strip>div{
    min-height:38px;
    padding:8px 11px;
    display:flex;
    align-items:center;
    gap:7px;
    border-right:1px solid rgba(147,92,193,.36);
    color:#67606d;
  }

  .pn-r3-stage-strip>div:last-child{border-right:0}

  .pn-r3-stage-strip span{
    width:16px;
    height:16px;
    display:grid;
    place-items:center;
    font-family:var(--mono);
    font-size:8px;
    border:1px solid currentColor;
    border-radius:50%;
  }

  .pn-r3-stage-strip b{
    font-size:8px;
    letter-spacing:.08em;
  }

  .pn-r3-stage-strip .done{color:var(--green)}
  .pn-r3-stage-strip .current{color:#d770ff;background:rgba(118,35,151,.12)}
  .pn-r3-stage-strip .blocked{color:#413b45}

  .pn-r3-tabs{
    display:flex;
    margin-bottom:14px;
  }

  .pn-r3-tabs button{
    min-width:150px;
    padding:10px 16px;
    border:1px solid rgba(147,92,193,.48);
    border-right:0;
    background:rgba(14,10,20,.86);
    color:var(--muted);
    font:inherit;
    font-size:10px;
    font-weight:900;
    letter-spacing:.08em;
    cursor:pointer;
  }

  .pn-r3-tabs button:last-child{border-right:1px solid rgba(147,92,193,.48)}

  .pn-r3-tabs button.active{
    color:#f0ccff;
    background:rgba(126,36,161,.22);
    box-shadow:inset 0 -2px 0 #bd42ff;
  }

  .pn-r3-controls{
    display:grid;
    grid-template-columns:minmax(260px,1fr) 180px;
    gap:12px;
    margin-bottom:14px;
  }

  .pn-r3-controls label,
  .pn-r3-result-form label{
    display:flex;
    flex-direction:column;
    gap:6px;
  }

  .pn-r3-controls label>span,
  .pn-r3-result-form label>span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r3-controls input,
  .pn-r3-controls select,
  .pn-r3-result-form input,
  .pn-r3-result-form select{
    min-height:38px;
    border:1px solid rgba(147,92,193,.48);
    background:rgba(11,8,15,.94);
    color:var(--text);
    padding:8px 10px;
    font:inherit;
    font-family:var(--mono);
  }

  .pn-r3-controls input:disabled,
  .pn-r3-controls select:disabled{
    opacity:.50;
  }

  .pn-r3-wheel-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
    margin-bottom:16px;
  }

  .pn-r3-panel{
    border-color:rgba(147,92,193,.52);
    background:rgba(12,9,16,.84);
  }

  .pn-r3-panel .panel-head{
    border-bottom:1px solid rgba(147,92,193,.44);
  }

  .pn-r3-state{
    color:#a865cf;
    font-family:var(--mono);
    font-size:8px;
    letter-spacing:.08em;
  }

  .pn-r3-stage{
    min-height:470px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    gap:16px;
    padding-top:18px;
  }

  .pn-r3-wheel-shell{
    position:relative;
    width:min(330px,82vw);
    aspect-ratio:1;
    display:grid;
    place-items:center;
  }

  .pn-r3-pointer{
    position:absolute;
    top:-4px;
    left:50%;
    z-index:5;
    transform:translateX(-50%);
    width:0;
    height:0;
    border-left:14px solid transparent;
    border-right:14px solid transparent;
    border-bottom:26px solid #f2dcff;
    filter:drop-shadow(0 0 7px rgba(213,132,255,.48));
  }

  .pn-r3-wheel{
    position:relative;
    width:100%;
    height:100%;
    border-radius:50%;
    border:4px solid rgba(174,105,213,.75);
    box-shadow:
      0 0 0 2px rgba(43,29,50,.95),
      0 0 28px rgba(146,41,183,.20),
      inset 0 0 36px rgba(0,0,0,.54);
    transition:transform 3.3s cubic-bezier(.12,.67,.09,1);
  }

  .pn-r3-verdict-wheel{
    background:
      conic-gradient(
        #ae153f 0deg 120deg,
        #29252e 120deg 240deg,
        #14583d 240deg 360deg
      );
  }

  .pn-r3-wager-wheel{
    background:
      conic-gradient(
        #8e1735 0deg 51.428deg,
        #16151a 51.428deg 102.856deg,
        #c1274d 102.856deg 154.284deg,
        #27232b 154.284deg 205.712deg,
        #4c205c 205.712deg 257.140deg,
        #8c245e 257.140deg 308.568deg,
        #342044 308.568deg 360deg
      );
  }

  .pn-r3-wheel-label{
    position:absolute;
    z-index:2;
    left:50%;
    top:50%;
    width:42%;
    transform-origin:0 0;
    transform:rotate(var(--a)) translate(34%,-50%) rotate(var(--neg-a)) rotate(var(--neg-r));
    color:#f4eafa;
    font-size:9px;
    font-weight:900;
    text-align:center;
    text-shadow:0 1px 3px #000;
  }

  .pn-r3-core{
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
    border:2px solid rgba(203,132,240,.74);
    color:#dba5f8;
    font-family:var(--mono);
    font-size:14px;
    font-weight:900;
    box-shadow:0 0 20px rgba(181,55,227,.22);
  }

  .pn-r3-spin{
    min-width:210px;
    min-height:42px;
  }

  .pn-r3-legend{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r3-protocol-key{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    width:100%;
    gap:5px 12px;
    padding:0 10px;
  }

  .pn-r3-protocol-key span{
    color:var(--muted);
    font-size:7.5px;
    white-space:nowrap;
  }

  .pn-r3-protocol-key b{color:#d5a1f0}

  .pn-r3-dormant{
    opacity:.40;
    filter:saturate(.55);
  }

  .pn-r3-locked-wheel{
    opacity:.70;
  }

  .pn-r3-result-zone{
    border:1px solid rgba(147,92,193,.52);
    background:rgba(12,9,16,.84);
    padding:16px;
    margin-bottom:16px;
    display:flex;
    align-items:center;
    gap:16px;
  }

  .pn-r3-terminal{
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-r3-terminal span,
  .pn-r3-protocol-title span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r3-terminal b{
    font-family:var(--mono);
    font-size:24px;
    color:#d16eff;
  }

  .pn-r3-terminal small,
  .pn-r3-protocol-title small{
    color:var(--muted);
    font-size:8px;
  }

  .pn-r3-terminal.bet b{color:#ff416b}
  .pn-r3-terminal.save b{color:var(--green)}
  .pn-r3-terminal.retreat b{color:#c5bbc9}

  .pn-r3-protocol-terminal{
    flex:1;
    display:grid;
    grid-template-columns:minmax(190px,.75fr) minmax(0,1.25fr);
    gap:18px;
    align-items:center;
  }

  .pn-r3-protocol-title{
    display:flex;
    flex-direction:column;
    gap:5px;
  }

  .pn-r3-protocol-title b{
    color:#f3b3ff;
    font-family:var(--mono);
    font-size:25px;
  }

  .pn-r3-split,
  .pn-r3-awaiting-split{
    display:grid;
    grid-template-columns:1fr 1fr;
    border:1px solid rgba(147,92,193,.46);
  }

  .pn-r3-split>div,
  .pn-r3-awaiting-split>div{
    padding:11px 13px;
    display:flex;
    flex-direction:column;
    gap:5px;
    border-right:1px solid rgba(147,92,193,.42);
  }

  .pn-r3-split>div:last-child,
  .pn-r3-awaiting-split>div:last-child{border-right:0}

  .pn-r3-split span,
  .pn-r3-awaiting-split span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
  }

  .pn-r3-split b,
  .pn-r3-awaiting-split b{
    color:#f2d5ff;
    font-family:var(--mono);
    font-size:15px;
  }

  .pn-r3-actions{
    margin-left:auto;
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  }

  .pn-r3-commit{
    box-shadow:0 0 18px rgba(180,53,239,.14);
  }

  .pn-r3-awaiting{
    margin-bottom:16px;
    border-color:rgba(187,63,240,.62);
    box-shadow:0 0 28px rgba(151,40,197,.10);
  }

  .pn-r3-awaiting-head{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:12px;
    margin-bottom:12px;
  }

  .pn-r3-awaiting-head>div{
    border:1px solid rgba(147,92,193,.46);
    padding:12px 14px;
    display:flex;
    flex-direction:column;
    gap:5px;
  }

  .pn-r3-awaiting-head span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-r3-awaiting-head b{
    font-family:var(--mono);
    font-size:17px;
  }

  .pn-r3-result-form{
    display:grid;
    grid-template-columns:170px minmax(220px,1fr) auto;
    gap:10px;
    align-items:end;
    margin-top:14px;
  }

  .pn-r3-result-hint{
    margin-top:9px;
    color:var(--muted);
    font-size:8px;
  }

  .pn-r3-notice{
    margin-bottom:12px;
    padding:9px 12px;
    border:1px solid rgba(147,92,193,.44);
    background:rgba(75,28,93,.16);
    color:#d7b0ec;
    font-family:var(--mono);
    font-size:9px;
  }

  .pn-r3-notice.ok{
    border-color:rgba(52,200,117,.35);
    color:var(--green);
    background:var(--green-wash);
  }

  .pn-r3-notice.err{
    border-color:rgba(255,67,91,.38);
    color:var(--red);
    background:var(--red-wash);
  }

  @media(max-width:1050px){
    .pn-r3-wheel-grid{grid-template-columns:1fr}
    .pn-r3-stage{min-height:440px}
  }

  @media(max-width:760px){
    .pn-r3-header,
    .pn-r3-stats,
    .pn-r3-controls,
    .pn-r3-protocol-terminal,
    .pn-r3-awaiting-head,
    .pn-r3-result-form{
      grid-template-columns:1fr;
    }

    .pn-r3-header small{text-align:left}

    .pn-r3-stage-strip{
      grid-template-columns:1fr;
    }

    .pn-r3-stage-strip>div{
      border-right:0;
      border-bottom:1px solid rgba(147,92,193,.36);
    }

    .pn-r3-stats>div{
      border-right:0;
      border-bottom:1px solid rgba(147,92,193,.45);
    }

    .pn-r3-stats>div:last-child{border-bottom:0}

    .pn-r3-result-zone{
      align-items:flex-start;
      flex-direction:column;
    }

    .pn-r3-actions{margin-left:0}

    .pn-r3-split,
    .pn-r3-awaiting-split{
      grid-template-columns:1fr;
    }

    .pn-r3-split>div,
    .pn-r3-awaiting-split>div{
      border-right:0;
      border-bottom:1px solid rgba(147,92,193,.42);
    }

    .pn-r3-split>div:last-child,
    .pn-r3-awaiting-split>div:last-child{border-bottom:0}
  }
  `;

  document.head.appendChild(style);
})();
