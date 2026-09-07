"use strict";

/*
  PROFITNODE THE ROULETTE v1
  Separate chaos ledger. No roulette action changes normal shop finances.
*/

(function installProfitnodeRoulette(){
  const ROULETTE_POOL_KEY = "roulettePools";
  const ROULETTE_LEDGER_KEY = "rouletteLedger";
  const VERDICTS = ["BET","FUCK OFF","SAVE MONEY"];
  const WAGERS = [
    "RED",
    "BLACK",
    "ODD",
    "EVEN",
    "I \u00B7 1\u201312",
    "II \u00B7 13\u201324",
    "III \u00B7 25\u201336"
  ];

  function rouletteEnsureCollections(){
    const data = Store.load();
    let changed = false;

    if (!Array.isArray(data[ROULETTE_POOL_KEY])){
      data[ROULETTE_POOL_KEY] = [];
      changed = true;
    }

    if (!Array.isArray(data[ROULETTE_LEDGER_KEY])){
      data[ROULETTE_LEDGER_KEY] = [];
      changed = true;
    }

    if (changed) Store.persist();
  }

  rouletteEnsureCollections();

  function roulettePools(){
    rouletteEnsureCollections();
    return Store.all(ROULETTE_POOL_KEY);
  }

  function rouletteLedger(){
    rouletteEnsureCollections();
    return Store.all(ROULETTE_LEDGER_KEY);
  }

  function rouletteInsert(collection,row){
    rouletteEnsureCollections();
    return Store.insert(collection,row);
  }

  function rouletteMoney(value,currency){
    return money(Number(value)||0,currency || displayCurrency());
  }

  function rouletteRandomIndex(length){
    if (!length) return 0;
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return Math.floor((values[0] / 4294967296) * length);
  }

  function rouletteNow(){
    return nowISO();
  }

  function rouletteResetSession(options){
    const keepStake = options && options.keepStake;
    const keepPool = options && options.keepPool;

    if (!keepStake) state.rouletteStake = "";
    if (!keepPool) state.roulettePoolId = "";

    state.rouletteVerdict = null;
    state.rouletteWager = null;
    state.rouletteNotice = null;
  }

  state.rouletteTab = state.rouletteTab || "CHAMBER";
  state.rouletteStake = state.rouletteStake || "";
  state.roulettePoolId = state.roulettePoolId || "";
  state.rouletteCurrency = state.rouletteCurrency || displayCurrency();
  state.rouletteVerdict = state.rouletteVerdict || null;
  state.rouletteWager = state.rouletteWager || null;
  state.rouletteVerdictRotation = Number(state.rouletteVerdictRotation)||0;
  state.rouletteWagerRotation = Number(state.rouletteWagerRotation)||0;
  state.rouletteNotice = state.rouletteNotice || null;

  let rouletteSpinLocked = false;

  function roulettePoolResolvedNet(poolId,currency){
    return rouletteLedger()
      .filter(row=>row.poolId===poolId && row.type==="BET" && row.status==="RESOLVED")
      .reduce((sum,row)=>sum+convert(row.net||0,row.currency,currency),0);
  }

  function roulettePoolExposure(poolId,currency){
    return rouletteLedger()
      .filter(row=>row.poolId===poolId && row.type==="BET" && row.status==="PENDING")
      .reduce((sum,row)=>sum+convert(row.stake||0,row.currency,currency),0);
  }

  function roulettePoolBalance(pool){
    if (!pool) return 0;
    const currency = pool.currency || "RSD";
    return Number(pool.startingAmount||0) +
      roulettePoolResolvedNet(pool.id,currency) -
      roulettePoolExposure(pool.id,currency);
  }

  function rouletteSelectedPool(){
    return roulettePools().find(pool=>pool.id===state.roulettePoolId) || null;
  }

  function rouletteStakeValue(){
    return Math.max(0,Number(state.rouletteStake)||0);
  }

  function rouletteCanExpose(stake,stakeCurrency,pool){
    if (!pool) return {ok:true};
    const available = roulettePoolBalance(pool);
    const stakeInPool = convert(stake,stakeCurrency,pool.currency);
    if (stakeInPool>available){
      return {
        ok:false,
        error:"STAKE EXCEEDS AVAILABLE POOL CAPITAL: "+rouletteMoney(available,pool.currency)
      };
    }
    return {ok:true};
  }

  function rouletteVerdictTone(verdict){
    if (verdict==="BET") return "bet";
    if (verdict==="SAVE MONEY") return "save";
    return "retreat";
  }

  function rouletteVerdictMessage(verdict){
    if (verdict==="BET") return "POOR JUDGMENT AUTHORIZED";
    if (verdict==="SAVE MONEY") return "CAPITAL PRESERVATION EVENT";
    return "TACTICAL RETREAT APPROVED";
  }

  function rouletteNoticeHtml(){
    if (!state.rouletteNotice) return "";
    return '<div class="pn-roulette-notice '+escAttr(state.rouletteNotice.tone||"info")+'">'+escHtml(state.rouletteNotice.text)+'</div>';
  }

  function rouletteStats(currency){
    const ledger = rouletteLedger();
    const bets = ledger.filter(row=>row.type==="BET");
    const resolved = bets.filter(row=>row.status==="RESOLVED");
    const pending = bets.filter(row=>row.status==="PENDING");
    const wins = resolved.filter(row=>row.outcome==="WIN");
    const losses = resolved.filter(row=>row.outcome==="LOSE");
    const verdicts = ledger.filter(row=>row.type==="VERDICT");

    const totalBet = bets.reduce((sum,row)=>sum+convert(row.stake||0,row.currency,currency),0);
    const returned = resolved.reduce((sum,row)=>sum+convert(row.returned||0,row.currency,currency),0);
    const net = resolved.reduce((sum,row)=>sum+convert(row.net||0,row.currency,currency),0);
    const exposure = pending.reduce((sum,row)=>sum+convert(row.stake||0,row.currency,currency),0);
    const nodeSaved = verdicts
      .filter(row=>row.verdict==="FUCK OFF" || row.verdict==="SAVE MONEY")
      .reduce((sum,row)=>sum+convert(row.avoidedStake||0,row.currency,currency),0);
    const savedMoney = verdicts
      .filter(row=>row.verdict==="SAVE MONEY")
      .reduce((sum,row)=>sum+convert(row.avoidedStake||0,row.currency,currency),0);

    const biggestWin = wins.length
      ? wins.slice().sort((a,b)=>convert(b.net,b.currency,currency)-convert(a.net,a.currency,currency))[0]
      : null;
    const biggestLoss = losses.length
      ? losses.slice().sort((a,b)=>convert(a.net,a.currency,currency)-convert(b.net,b.currency,currency))[0]
      : null;

    return {
      totalBet:totalBet,
      returned:returned,
      net:net,
      exposure:exposure,
      winRate:(wins.length+losses.length)?wins.length/(wins.length+losses.length)*100:null,
      fuckOffs:verdicts.filter(row=>row.verdict==="FUCK OFF").length,
      saves:verdicts.filter(row=>row.verdict==="SAVE MONEY").length,
      nodeSaved:nodeSaved,
      savedMoney:savedMoney,
      biggestWin:biggestWin,
      biggestLoss:biggestLoss,
      wins:wins.length,
      losses:losses.length,
      pending:pending.length
    };
  }

  function rouletteDamageStrip(currency){
    const s = rouletteStats(currency);
    return '<div class="pn-roulette-damage">'+
      '<div><span>TOTAL BET</span><b>'+money(s.totalBet,currency)+'</b></div>'+
      '<div><span>TOTAL RETURNED</span><b>'+money(s.returned,currency)+'</b></div>'+
      '<div class="pn-roulette-net"><span>NET DAMAGE</span><b class="'+(s.net>=0?"pos":"neg")+'">'+money(s.net,currency)+'</b></div>'+
      '<div><span>WIN RATE</span><b>'+(s.winRate==null?"-":s.winRate.toFixed(1)+"%")+'</b></div>'+
      '<div><span>CURRENT EXPOSURE</span><b class="warn">'+money(s.exposure,currency)+'</b></div>'+
      '<div><span>THE NODE SAVED YOU</span><b class="pos">'+money(s.nodeSaved,currency)+'</b></div>'+
    '</div>';
  }

  function rouletteTabs(){
    const tabs = ["CHAMBER","POOL","WIN / LOSE"];
    return '<div class="pn-roulette-tabs">'+tabs.map(tab=>{
      return '<button type="button" class="'+(state.rouletteTab===tab?"active":"")+'" data-roulette-tab="'+escAttr(tab)+'">'+escHtml(tab)+'</button>';
    }).join("")+'</div>';
  }

  function rouletteWheelLabels(labels){
    const count = labels.length;
    return labels.map((label,index)=>{
      const angle = index * (360/count);
      return '<span class="pn-wheel-label" style="--a:'+angle+'deg;--neg:'+(-angle)+'deg">'+escHtml(label)+'</span>';
    }).join("");
  }

  function rouletteVerdictWheel(){
    return '<div class="pn-wheel-shell pn-wheel-shell-verdict">'+
      '<div class="pn-wheel-pointer"></div>'+
      '<div class="pn-roulette-wheel pn-verdict-wheel" data-roulette-verdict-wheel style="transform:rotate('+state.rouletteVerdictRotation+'deg)">'+
        rouletteWheelLabels(VERDICTS)+
        '<div class="pn-wheel-core">PN</div>'+
      '</div>'+
    '</div>';
  }

  function rouletteWagerWheel(){
    return '<div class="pn-wheel-shell pn-wheel-shell-wager">'+
      '<div class="pn-wheel-pointer"></div>'+
      '<div class="pn-roulette-wheel pn-wager-wheel" data-roulette-wager-wheel style="transform:rotate('+state.rouletteWagerRotation+'deg)">'+
        rouletteWheelLabels(WAGERS)+
        '<div class="pn-wheel-core">R</div>'+
      '</div>'+
    '</div>';
  }

  function roulettePoolOptions(){
    const active = roulettePools().filter(pool=>pool.status!=="PAUSED");
    return '<option value="">UNALLOCATED</option>'+active.map(pool=>{
      const balance = roulettePoolBalance(pool);
      return '<option value="'+pool.id+'"'+(state.roulettePoolId===pool.id?" selected":"")+'>'+escHtml(pool.name)+' / '+escHtml(rouletteMoney(balance,pool.currency))+'</option>';
    }).join("");
  }

  function rouletteResultTerminal(){
    if (!state.rouletteVerdict){
      return '<div class="pn-roulette-terminal idle"><span>FATE AWAITS INPUT</span><b>SPIN THE VERDICT</b></div>';
    }

    const tone = rouletteVerdictTone(state.rouletteVerdict);
    let html = '<div class="pn-roulette-terminal '+tone+'">'+
      '<span>THE NODE HAS SPOKEN</span>'+
      '<b>'+escHtml(state.rouletteVerdict)+'</b>'+
      '<small>'+escHtml(rouletteVerdictMessage(state.rouletteVerdict))+'</small>'+
    '</div>';

    if (state.rouletteVerdict==="BET" && state.rouletteWager){
      html += '<div class="pn-wager-result"><span>WAGER PROTOCOL</span><b>'+escHtml(state.rouletteWager)+'</b></div>';
    }

    return html;
  }

  function rouletteChamber(currency){
    const pool = rouletteSelectedPool();
    const stake = rouletteStakeValue();
    const verdict = state.rouletteVerdict;
    const wagerReady = verdict==="BET";

    let action = "";

    if (verdict==="BET" && state.rouletteWager){
      action = '<button type="button" class="btn btn-primary pn-lock-bet" data-roulette-lock-bet>LOCK BET</button>';
    } else if (verdict==="FUCK OFF" || verdict==="SAVE MONEY"){
      action = '<button type="button" class="btn pn-log-verdict" data-roulette-log-verdict>LOG VERDICT</button>';
    }

    return rouletteNoticeHtml()+
      '<div class="pn-roulette-controls">'+
        '<label><span>STAKE</span><input type="number" min="0" step="1" value="'+escAttr(state.rouletteStake)+'" data-roulette-stake placeholder="3000"></label>'+
        '<label><span>CURRENCY</span><select data-roulette-currency><option value="RSD"'+(state.rouletteCurrency==="RSD"?" selected":"")+'>RSD</option><option value="EUR"'+(state.rouletteCurrency==="EUR"?" selected":"")+'>EUR</option></select></label>'+
        '<label><span>INVESTMENT POOL</span><select data-roulette-pool>'+roulettePoolOptions()+'</select></label>'+
        '<div class="pn-roulette-exposure"><span>AVAILABLE</span><b>'+(pool?rouletteMoney(roulettePoolBalance(pool),pool.currency):"UNALLOCATED")+'</b></div>'+
      '</div>'+
      '<div class="pn-roulette-chamber-grid">'+
        '<section class="panel pn-chaos-panel">'+
          '<div class="panel-head"><h2>WHEEL OF FORTUNE</h2><span class="pn-chaos-state">VERDICT PROTOCOL</span></div>'+
          '<div class="panel-body pn-wheel-stage">'+
            rouletteVerdictWheel()+
            '<button type="button" class="btn btn-primary pn-spin-button" data-roulette-spin-verdict '+(stake<=0?"disabled":"")+'>SPIN THE VERDICT</button>'+
            '<div class="pn-wheel-legend">BET / FUCK OFF / SAVE MONEY</div>'+
          '</div>'+
        '</section>'+
        '<section class="panel pn-chaos-panel '+(!wagerReady?"pn-chaos-dormant":"")+'">'+
          '<div class="panel-head"><h2>THE WAGER</h2><span class="pn-chaos-state">THIRDS PROTOCOL</span></div>'+
          '<div class="panel-body pn-wheel-stage">'+
            rouletteWagerWheel()+
            '<button type="button" class="btn btn-primary pn-spin-button" data-roulette-spin-wager '+(!wagerReady?"disabled":"")+'>SPIN THE WAGER</button>'+
            '<div class="pn-wheel-legend">RED / BLACK / ODD / EVEN / I / II / III</div>'+
          '</div>'+
        '</section>'+
      '</div>'+
      '<div class="pn-roulette-result-zone">'+rouletteResultTerminal()+'<div class="pn-roulette-actions">'+action+'</div></div>';
  }

  function roulettePoolTab(currency){
    const pools = roulettePools().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    const totalStart = pools.reduce((sum,pool)=>sum+convert(pool.startingAmount||0,pool.currency,currency),0);
    const totalBalance = pools.reduce((sum,pool)=>sum+convert(roulettePoolBalance(pool),pool.currency,currency),0);
    const totalExposure = pools.reduce((sum,pool)=>sum+convert(roulettePoolExposure(pool.id,pool.currency),pool.currency,currency),0);

    const rows = pools.length ? pools.map(pool=>{
      const balance = roulettePoolBalance(pool);
      const exposure = roulettePoolExposure(pool.id,pool.currency);
      const referenced = rouletteLedger().some(row=>row.poolId===pool.id);
      return '<tr>'+
        '<td><b>'+escHtml(pool.name)+'</b>'+(pool.notes?'<br><span class="kind-tag">'+escHtml(pool.notes)+'</span>':"")+'</td>'+
        '<td><span class="chip '+(pool.status==="PAUSED"?"chip-muted":"chip-green-outline")+'">'+escHtml(pool.status||"ACTIVE")+'</span></td>'+
        '<td class="num">'+rouletteMoney(pool.startingAmount,pool.currency)+'</td>'+
        '<td class="num">'+rouletteMoney(balance,pool.currency)+'</td>'+
        '<td class="num">'+rouletteMoney(exposure,pool.currency)+'</td>'+
        '<td class="num"><button type="button" class="btn btn-sm" data-roulette-toggle-pool="'+pool.id+'">'+(pool.status==="PAUSED"?"ACTIVATE":"PAUSE")+'</button> '+(!referenced?'<button type="button" class="btn btn-sm btn-danger" data-roulette-delete-pool="'+pool.id+'">DELETE</button>':"")+'</td>'+
      '</tr>';
    }).join("") : '<tr class="empty-row"><td colspan="6">No investment pools yet.</td></tr>';

    return rouletteNoticeHtml()+
      '<div class="pn-roulette-pool-summary">'+
        '<div><span>STARTING CAPITAL</span><b>'+money(totalStart,currency)+'</b></div>'+
        '<div><span>CURRENT BANKROLL</span><b class="'+(totalBalance>=totalStart?"pos":"neg")+'">'+money(totalBalance,currency)+'</b></div>'+
        '<div><span>ACTIVE EXPOSURE</span><b class="warn">'+money(totalExposure,currency)+'</b></div>'+
      '</div>'+
      '<div class="panel pn-chaos-panel">'+
        '<div class="panel-head"><h2>INVESTMENT POOL</h2><span class="pn-chaos-state">WAR CHEST</span></div>'+
        '<div class="panel-body">'+
          '<div class="pn-pool-add">'+
            '<label><span>POOL NAME</span><input type="text" data-roulette-pool-name placeholder="ROULETTE FUND"></label>'+
            '<label><span>STARTING AMOUNT</span><input type="number" min="0" step="1" data-roulette-pool-amount placeholder="10000"></label>'+
            '<label><span>CURRENCY</span><select data-roulette-pool-currency><option value="RSD">RSD</option><option value="EUR">EUR</option></select></label>'+
            '<label><span>NOTES</span><input type="text" data-roulette-pool-notes placeholder="Optional"></label>'+
            '<button type="button" class="btn btn-primary" data-roulette-add-pool>ADD TO POOL</button>'+
          '</div>'+
          '<div class="table-scroll"><table><thead><tr><th>Pool</th><th>Status</th><th class="num">Starting</th><th class="num">Current</th><th class="num">Exposure</th><th class="num">Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
        '</div>'+
      '</div>';
  }

  function rouletteStrategyRows(currency){
    return WAGERS.map(wager=>{
      const rows = rouletteLedger().filter(row=>row.type==="BET" && row.status==="RESOLVED" && row.wager===wager);
      const wins = rows.filter(row=>row.outcome==="WIN").length;
      const losses = rows.filter(row=>row.outcome==="LOSE").length;
      const net = rows.reduce((sum,row)=>sum+convert(row.net||0,row.currency,currency),0);
      return '<tr><td><b>'+escHtml(wager)+'</b></td><td class="num">'+rows.length+'</td><td class="num">'+wins+'-'+losses+'</td><td class="num '+(net>=0?"pos":"neg")+'">'+money(net,currency)+'</td></tr>';
    }).join("");
  }

  function roulettePendingRows(){
    const pending = rouletteLedger().filter(row=>row.type==="BET" && row.status==="PENDING").slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if (!pending.length) return '<div class="pn-roulette-empty">NO ACTIVE EXPOSURE</div>';

    return pending.map(row=>{
      const pool = roulettePools().find(pool=>pool.id===row.poolId);
      return '<div class="pn-pending-bet">'+
        '<div class="pn-pending-main"><span>'+fmtDate(row.date)+'</span><b>'+escHtml(row.wager)+'</b><small>'+(pool?escHtml(pool.name)+" / ":"")+rouletteMoney(row.stake,row.currency)+'</small></div>'+
        '<label><span>RETURNED</span><input type="number" min="0" step="1" data-roulette-return="'+row.id+'" placeholder="0"></label>'+
        '<div class="pn-pending-actions"><button type="button" class="btn btn-sm btn-primary" data-roulette-resolve="WIN" data-id="'+row.id+'">WIN</button><button type="button" class="btn btn-sm btn-danger" data-roulette-resolve="LOSE" data-id="'+row.id+'">LOSE</button><button type="button" class="btn btn-sm" data-roulette-resolve="VOID" data-id="'+row.id+'">VOID</button></div>'+
      '</div>';
    }).join("");
  }

  function rouletteHistoryRows(currency){
    const rows = rouletteLedger().slice().sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
    if (!rows.length) return '<tr class="empty-row"><td colspan="9">No roulette records yet. Remarkable restraint.</td></tr>';

    return rows.map(row=>{
      const pool = roulettePools().find(pool=>pool.id===row.poolId);
      const label = row.type==="BET" ? (row.wager||"BET") : row.verdict;
      const result = row.type==="BET" ? (row.status==="PENDING"?"PENDING":row.outcome) : "VERDICT";
      const net = row.type==="BET" && row.status==="RESOLVED" ? convert(row.net||0,row.currency,currency) : null;
      const stake = row.type==="BET" ? row.stake : row.avoidedStake;
      return '<tr>'+
        '<td class="mono">'+fmtDate(row.date)+'</td>'+
        '<td><b>'+escHtml(label||"")+'</b></td>'+
        '<td>'+escHtml(result||"")+'</td>'+
        '<td>'+escHtml(pool?pool.name:"UNALLOCATED")+'</td>'+
        '<td class="num">'+rouletteMoney(stake,row.currency)+'</td>'+
        '<td class="num">'+(row.type==="BET" && row.status==="RESOLVED"?rouletteMoney(row.returned,row.currency):"-")+'</td>'+
        '<td class="num '+(net==null?"":net>=0?"pos":"neg")+'">'+(net==null?"-":money(net,currency))+'</td>'+
        '<td>'+escHtml(row.notes||"")+'</td>'+
        '<td class="num"><button type="button" class="btn btn-sm btn-ghost" data-roulette-delete-record="'+row.id+'">DELETE</button></td>'+
      '</tr>';
    }).join("");
  }

  function rouletteWinLoseTab(currency){
    const s = rouletteStats(currency);
    const biggestWin = s.biggestWin ? money(convert(s.biggestWin.net,s.biggestWin.currency,currency),currency) : "-";
    const biggestLoss = s.biggestLoss ? money(convert(s.biggestLoss.net,s.biggestLoss.currency,currency),currency) : "-";

    return rouletteNoticeHtml()+
      '<div class="pn-roulette-report-grid">'+
        '<div><span>BIGGEST WIN</span><b class="pos">'+biggestWin+'</b></div>'+
        '<div><span>BIGGEST LOSS</span><b class="neg">'+biggestLoss+'</b></div>'+
        '<div><span>FUCK OFFS</span><b>'+s.fuckOffs+'</b></div>'+
        '<div><span>SAVE MONEY</span><b>'+s.saves+'</b></div>'+
        '<div><span>MONEY SAVED</span><b class="pos">'+money(s.savedMoney,currency)+'</b></div>'+
        '<div><span>W / L</span><b>'+s.wins+' / '+s.losses+'</b></div>'+
      '</div>'+
      '<div class="pn-roulette-two-col">'+
        '<section class="panel pn-chaos-panel">'+
          '<div class="panel-head"><h2>ACTIVE EXPOSURE</h2><span class="pn-chaos-state">RESOLVE THE DAMAGE</span></div>'+
          '<div class="panel-body pn-no-pad">'+roulettePendingRows()+'</div>'+
        '</section>'+
        '<section class="panel pn-chaos-panel">'+
          '<div class="panel-head"><h2>STRATEGY DAMAGE</h2><span class="pn-chaos-state">FAMOUS THIRDS INCLUDED</span></div>'+
          '<div class="panel-body pn-no-pad"><div class="table-scroll"><table><thead><tr><th>Protocol</th><th class="num">Bets</th><th class="num">W-L</th><th class="num">Net</th></tr></thead><tbody>'+rouletteStrategyRows(currency)+'</tbody></table></div></div>'+
        '</section>'+
      '</div>'+
      '<section class="panel pn-chaos-panel" style="margin-top:14px">'+
        '<div class="panel-head"><h2>MANUAL RESULT</h2><span class="pn-chaos-state">BACKFILL OLD DAMAGE</span></div>'+
        '<div class="panel-body"><div class="pn-manual-result">'+
          '<label><span>DATE</span><input type="date" data-roulette-manual-date value="'+todayISO()+'"></label>'+
          '<label><span>WAGER</span><select data-roulette-manual-wager>'+WAGERS.map(w=>'<option value="'+escAttr(w)+'">'+escHtml(w)+'</option>').join("")+'</select></label>'+
          '<label><span>STAKE</span><input type="number" min="0" step="1" data-roulette-manual-stake></label>'+
          '<label><span>RETURNED</span><input type="number" min="0" step="1" data-roulette-manual-return></label>'+
          '<label><span>CURRENCY</span><select data-roulette-manual-currency><option value="RSD">RSD</option><option value="EUR">EUR</option></select></label>'+
          '<label><span>RESULT</span><select data-roulette-manual-outcome><option value="WIN">WIN</option><option value="LOSE">LOSE</option><option value="VOID">VOID</option></select></label>'+
          '<label class="pn-manual-notes"><span>NOTES</span><input type="text" data-roulette-manual-notes placeholder="Optional"></label>'+
          '<button type="button" class="btn btn-primary" data-roulette-add-manual>RECORD RESULT</button>'+
        '</div></div>'+
      '</section>'+
      '<section class="panel pn-chaos-panel" style="margin-top:14px">'+
        '<div class="panel-head"><h2>WIN / LOSE LEDGER</h2><span class="pn-chaos-state">PERMANENT EVIDENCE</span></div>'+
        '<div class="panel-body pn-no-pad"><div class="table-scroll"><table><thead><tr><th>Date</th><th>Protocol</th><th>Result</th><th>Pool</th><th class="num">Risked</th><th class="num">Returned</th><th class="num">Net</th><th>Notes</th><th></th></tr></thead><tbody>'+rouletteHistoryRows(currency)+'</tbody></table></div></div>'+
      '</section>';
  }

  function renderRoulette(){
    const currency = displayCurrency();
    let body = rouletteChamber(currency);
    if (state.rouletteTab==="POOL") body = roulettePoolTab(currency);
    if (state.rouletteTab==="WIN / LOSE") body = rouletteWinLoseTab(currency);

    return pageHeader("THE ROULETTE","CHAOS PROTOCOL ARMED","")+
      '<div class="content pn-roulette-content">'+
        '<div class="pn-chaos-header"><span>PROBABILITY ENGINE</span><b>THE ROULETTE</b><small>BAD DECISIONS, CONTROLLED</small></div>'+
        rouletteDamageStrip(currency)+
        rouletteTabs()+
        body+
      '</div>';
  }

  function rouletteSpinWheel(kind,labels){
    if (rouletteSpinLocked) return;

    const stake = rouletteStakeValue();
    if (kind==="verdict" && stake<=0){
      state.rouletteNotice = {tone:"err",text:"SET A STAKE BEFORE SUMMONING FATE."};
      render();
      return;
    }

    if (kind==="wager" && state.rouletteVerdict!=="BET") return;

    const index = rouletteRandomIndex(labels.length);
    const slice = 360/labels.length;
    const center = index*slice;
    const key = kind==="verdict" ? "rouletteVerdictRotation" : "rouletteWagerRotation";
    const wheelSelector = kind==="verdict" ? "[data-roulette-verdict-wheel]" : "[data-roulette-wager-wheel]";
    const wheel = document.querySelector(wheelSelector);
    if (!wheel) return;

    const current = Number(state[key])||0;
    const desired = ((-center)%360+360)%360;
    const currentMod = ((current%360)+360)%360;
    const delta = (desired-currentMod+360)%360;
    const target = current + 6*360 + delta;

    state[key] = target;
    state.rouletteNotice = null;
    rouletteSpinLocked = true;

    document.querySelectorAll("[data-roulette-spin-verdict],[data-roulette-spin-wager]").forEach(btn=>btn.disabled=true);
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
    },3800);
  }

  function rouletteLogVerdict(){
    const stake = rouletteStakeValue();
    const verdict = state.rouletteVerdict;
    if (!stake || !["FUCK OFF","SAVE MONEY"].includes(verdict)) return;

    const currency = state.rouletteCurrency || displayCurrency();
    const row = rouletteInsert(ROULETTE_LEDGER_KEY,{
      type:"VERDICT",
      date:todayISO(),
      verdict:verdict,
      avoidedStake:stake,
      currency:currency,
      poolId:state.roulettePoolId || null,
      notes:rouletteVerdictMessage(verdict)
    });

    Timeline.log(
      "ROULETTE_VERDICT",
      "THE ROULETTE \u00B7 "+verdict,
      rouletteMoney(stake,currency)+" exposure avoided.",
      row.date,
      "roulette",
      row.id
    );

    rouletteResetSession({keepStake:true,keepPool:true});
    state.rouletteNotice = {tone:"ok",text:verdict+" RECORDED. CAPITAL REMAINS UNHARMED."};
    render();
  }

  function rouletteLockBet(){
    const stake = rouletteStakeValue();
    const wager = state.rouletteWager;
    const pool = rouletteSelectedPool();
    const currency = state.rouletteCurrency || displayCurrency();

    if (state.rouletteVerdict!=="BET" || !wager || stake<=0) return;

    const exposure = rouletteCanExpose(stake,currency,pool);
    if (!exposure.ok){
      state.rouletteNotice = {tone:"err",text:exposure.error};
      render();
      return;
    }

    const row = rouletteInsert(ROULETTE_LEDGER_KEY,{
      type:"BET",
      status:"PENDING",
      date:todayISO(),
      verdict:"BET",
      wager:wager,
      stake:stake,
      returned:null,
      net:null,
      outcome:null,
      currency:currency,
      poolId:state.roulettePoolId || null,
      notes:"FATE ACCEPTED."
    });

    Timeline.log(
      "ROULETTE_BET",
      "THE ROULETTE \u00B7 "+wager,
      rouletteMoney(stake,currency)+" exposed. FATE ACCEPTED.",
      row.date,
      "roulette",
      row.id
    );

    rouletteResetSession({keepStake:false,keepPool:true});
    state.rouletteNotice = {tone:"ok",text:wager+" LOCKED. ACTIVE EXPOSURE RECORDED."};
    render();
  }

  function rouletteResolveBet(id,outcome){
    const row = rouletteLedger().find(item=>item.id===id);
    if (!row || row.type!=="BET" || row.status!=="PENDING") return;

    const input = document.querySelector('[data-roulette-return="'+CSS.escape(id)+'"]');
    let returned = input ? Number(input.value)||0 : 0;

    if (outcome==="VOID" && (!input || input.value==="")) returned = Number(row.stake)||0;

    const net = returned - (Number(row.stake)||0);
    const updated = Store.update(ROULETTE_LEDGER_KEY,id,{
      status:"RESOLVED",
      outcome:outcome,
      returned:returned,
      net:net,
      resolvedAt:rouletteNow()
    });

    Timeline.log(
      "ROULETTE_RESULT",
      "THE ROULETTE RESULT \u00B7 "+outcome,
      row.wager+" \u00B7 "+rouletteMoney(row.stake,row.currency)+" -> "+rouletteMoney(returned,row.currency)+" \u00B7 NET "+rouletteMoney(net,row.currency),
      todayISO(),
      "roulette",
      updated.id
    );

    state.rouletteNotice = {tone:net>=0?"ok":"err",text:"RESULT RECORDED. NET "+rouletteMoney(net,row.currency)+"."};
    render();
  }

  function rouletteAddManual(){
    const date = document.querySelector("[data-roulette-manual-date]");
    const wager = document.querySelector("[data-roulette-manual-wager]");
    const stake = document.querySelector("[data-roulette-manual-stake]");
    const returned = document.querySelector("[data-roulette-manual-return]");
    const currency = document.querySelector("[data-roulette-manual-currency]");
    const outcome = document.querySelector("[data-roulette-manual-outcome]");
    const notes = document.querySelector("[data-roulette-manual-notes]");

    const stakeValue = Math.max(0,Number(stake && stake.value)||0);
    let returnValue = Math.max(0,Number(returned && returned.value)||0);
    const outcomeValue = outcome ? outcome.value : "LOSE";

    if (stakeValue<=0){
      state.rouletteNotice = {tone:"err",text:"MANUAL RESULT NEEDS A STAKE."};
      render();
      return;
    }

    if (outcomeValue==="VOID" && (!returned || returned.value==="")) returnValue = stakeValue;

    rouletteInsert(ROULETTE_LEDGER_KEY,{
      type:"BET",
      status:"RESOLVED",
      date:date && date.value ? date.value : todayISO(),
      verdict:"BET",
      wager:wager ? wager.value : WAGERS[0],
      stake:stakeValue,
      returned:returnValue,
      net:returnValue-stakeValue,
      outcome:outcomeValue,
      currency:currency ? currency.value : "RSD",
      poolId:null,
      notes:notes ? notes.value.trim() : "Manual history entry",
      resolvedAt:rouletteNow()
    });

    state.rouletteNotice = {tone:"ok",text:"MANUAL RESULT ADDED TO THE EVIDENCE LOCKER."};
    render();
  }

  function rouletteAddPool(){
    const name = document.querySelector("[data-roulette-pool-name]");
    const amount = document.querySelector("[data-roulette-pool-amount]");
    const currency = document.querySelector("[data-roulette-pool-currency]");
    const notes = document.querySelector("[data-roulette-pool-notes]");

    const poolName = name ? name.value.trim() : "";
    const start = Math.max(0,Number(amount && amount.value)||0);

    if (!poolName || start<=0){
      state.rouletteNotice = {tone:"err",text:"POOL NAME AND STARTING CAPITAL ARE REQUIRED."};
      render();
      return;
    }

    rouletteInsert(ROULETTE_POOL_KEY,{
      name:poolName,
      startingAmount:start,
      currency:currency ? currency.value : "RSD",
      notes:notes ? notes.value.trim() : "",
      status:"ACTIVE"
    });

    state.rouletteNotice = {tone:"ok",text:"INVESTMENT POOL CREATED."};
    render();
  }

  function rouletteTogglePool(id){
    const pool = roulettePools().find(row=>row.id===id);
    if (!pool) return;
    Store.update(ROULETTE_POOL_KEY,id,{status:pool.status==="PAUSED"?"ACTIVE":"PAUSED"});
    if (pool.id===state.roulettePoolId && pool.status!=="PAUSED") state.roulettePoolId="";
    render();
  }

  function rouletteDeletePool(id){
    if (rouletteLedger().some(row=>row.poolId===id)){
      state.rouletteNotice = {tone:"err",text:"POOL HAS LEDGER HISTORY. PAUSE IT INSTEAD OF DELETING IT."};
      render();
      return;
    }
    Store.remove(ROULETTE_POOL_KEY,id);
    if (state.roulettePoolId===id) state.roulettePoolId="";
    render();
  }

  function rouletteDeleteRecord(id){
    Store.remove(ROULETTE_LEDGER_KEY,id);
    state.rouletteNotice = {tone:"ok",text:"ROULETTE RECORD DELETED."};
    render();
  }

  document.addEventListener("input",function(event){
    if (event.target.matches("[data-roulette-stake]")){
      state.rouletteStake = event.target.value;
    }
  });

  document.addEventListener("change",function(event){
    if (event.target.matches("[data-roulette-pool]")){
      state.roulettePoolId = event.target.value;
      const pool = rouletteSelectedPool();
      if (pool) state.rouletteCurrency = pool.currency;
      state.rouletteNotice = null;
      render();
    }
    if (event.target.matches("[data-roulette-currency]")){
      state.rouletteCurrency = event.target.value;
      state.rouletteNotice = null;
      render();
    }
  });

  document.addEventListener("click",function(event){
    const tab = event.target.closest("[data-roulette-tab]");
    if (tab){
      state.rouletteTab = tab.dataset.rouletteTab;
      state.rouletteNotice = null;
      render();
      return;
    }

    if (event.target.closest("[data-roulette-spin-verdict]")){
      rouletteSpinWheel("verdict",VERDICTS);
      return;
    }

    if (event.target.closest("[data-roulette-spin-wager]")){
      rouletteSpinWheel("wager",WAGERS);
      return;
    }

    if (event.target.closest("[data-roulette-log-verdict]")){
      rouletteLogVerdict();
      return;
    }

    if (event.target.closest("[data-roulette-lock-bet]")){
      rouletteLockBet();
      return;
    }

    const resolve = event.target.closest("[data-roulette-resolve]");
    if (resolve){
      rouletteResolveBet(resolve.dataset.id,resolve.dataset.rouletteResolve);
      return;
    }

    if (event.target.closest("[data-roulette-add-manual]")){
      rouletteAddManual();
      return;
    }

    if (event.target.closest("[data-roulette-add-pool]")){
      rouletteAddPool();
      return;
    }

    const togglePool = event.target.closest("[data-roulette-toggle-pool]");
    if (togglePool){
      rouletteTogglePool(togglePool.dataset.rouletteTogglePool);
      return;
    }

    const deletePool = event.target.closest("[data-roulette-delete-pool]");
    if (deletePool){
      rouletteDeletePool(deletePool.dataset.rouletteDeletePool);
      return;
    }

    const deleteRecord = event.target.closest("[data-roulette-delete-record]");
    if (deleteRecord){
      rouletteDeleteRecord(deleteRecord.dataset.rouletteDeleteRecord);
    }
  });

  /* Backup compatibility for the new collections. */
  if (typeof inspectBackupFile === "function"){
    const PNCoreInspectBackupRoulette = inspectBackupFile;
    inspectBackupFile = function(raw){
      const counts = PNCoreInspectBackupRoulette(raw) || {};
      if (Array.isArray(raw[ROULETTE_POOL_KEY])) counts[ROULETTE_POOL_KEY] = raw[ROULETTE_POOL_KEY].length;
      if (Array.isArray(raw[ROULETTE_LEDGER_KEY])) counts[ROULETTE_LEDGER_KEY] = raw[ROULETTE_LEDGER_KEY].length;
      return Object.keys(counts).length ? counts : null;
    };
  }

  if (Store && typeof Store.replaceAll === "function"){
    const PNCoreReplaceAllRoulette = Store.replaceAll.bind(Store);
    Store.replaceAll = function(raw){
      PNCoreReplaceAllRoulette(raw);
      const data = Store.load();
      data[ROULETTE_POOL_KEY] = Array.isArray(raw && raw[ROULETTE_POOL_KEY]) ? raw[ROULETTE_POOL_KEY] : [];
      data[ROULETTE_LEDGER_KEY] = Array.isArray(raw && raw[ROULETTE_LEDGER_KEY]) ? raw[ROULETTE_LEDGER_KEY] : [];
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
        {label:"Wager",get:row=>row.wager||""},
        {label:"Status",get:row=>row.status||""},
        {label:"Outcome",get:row=>row.outcome||""},
        {label:"Stake",get:row=>row.stake||row.avoidedStake||0},
        {label:"Returned",get:row=>row.returned||0},
        {label:"Net",get:row=>row.net||0},
        {label:"Currency",get:row=>row.currency||""},
        {label:"Notes",get:row=>row.notes||""}
      ]
    };
  }

  /* Insert THE ROULETTE before BLACKBOX and renumber the terminal. */
  if (typeof ROUTES !== "undefined" && !ROUTES.some(route=>route.key==="roulette")){
    const backupIndex = ROUTES.findIndex(route=>route.key==="backup");
    const route = {key:"roulette",label:"THE ROULETTE",nix:"10",render:renderRoulette};
    if (backupIndex>=0) ROUTES.splice(backupIndex,0,route);
    else ROUTES.push(route);
    ROUTES.forEach((row,index)=>row.nix=String(index+1).padStart(2,"0"));
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

  .pn-roulette-content{
    position:relative;
    isolation:isolate;
  }
  .pn-roulette-content:before{
    content:"";
    position:absolute;
    inset:0;
    z-index:-1;
    pointer-events:none;
    background:
      radial-gradient(circle at 20% 12%,rgba(172,27,95,.10),transparent 31%),
      radial-gradient(circle at 82% 18%,rgba(110,35,173,.11),transparent 30%),
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.008) 4px);
  }

  .pn-chaos-header{
    border:1px solid rgba(177,66,225,.44);
    border-left:3px solid #ff315f;
    background:linear-gradient(110deg,rgba(80,10,34,.30),rgba(34,11,51,.32),rgba(12,9,16,.74));
    padding:14px 16px;
    margin-bottom:12px;
    display:grid;
    grid-template-columns:auto 1fr auto;
    gap:14px;
    align-items:center;
    box-shadow:inset 0 0 30px rgba(119,32,151,.06);
  }
  .pn-chaos-header span,
  .pn-chaos-header small{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.12em;
  }
  .pn-chaos-header b{
    color:#f0d8ff;
    font-size:15px;
    letter-spacing:.08em;
  }

  .pn-roulette-damage{
    display:grid;
    grid-template-columns:repeat(6,minmax(0,1fr));
    border:1px solid rgba(165,91,211,.42);
    background:rgba(12,9,16,.82);
    margin-bottom:12px;
  }
  .pn-roulette-damage>div{
    min-height:61px;
    padding:10px 12px;
    border-right:1px solid rgba(165,91,211,.30);
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:5px;
  }
  .pn-roulette-damage>div:last-child{border-right:0}
  .pn-roulette-damage span,
  .pn-roulette-pool-summary span,
  .pn-roulette-report-grid span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }
  .pn-roulette-damage b,
  .pn-roulette-pool-summary b,
  .pn-roulette-report-grid b{
    font-family:var(--mono);
    font-size:13px;
  }
  .pn-roulette-damage .pn-roulette-net{
    background:linear-gradient(180deg,rgba(103,19,51,.18),transparent);
  }
  .pn-roulette-damage b.pos,
  .pn-roulette-pool-summary b.pos,
  .pn-roulette-report-grid b.pos,
  .pn-roulette-content .pos{color:var(--green)}
  .pn-roulette-damage b.neg,
  .pn-roulette-pool-summary b.neg,
  .pn-roulette-report-grid b.neg,
  .pn-roulette-content .neg{color:var(--red)}
  .pn-roulette-content .warn{color:var(--amber)}

  .pn-roulette-tabs{
    display:inline-flex;
    border:1px solid rgba(159,82,208,.38);
    background:rgba(14,10,18,.82);
    margin-bottom:12px;
  }
  .pn-roulette-tabs button{
    min-width:124px;
    padding:9px 14px;
    border:0;
    border-right:1px solid rgba(159,82,208,.32);
    background:transparent;
    color:var(--muted);
    font:inherit;
    font-size:9px;
    font-weight:900;
    letter-spacing:.10em;
    cursor:pointer;
  }
  .pn-roulette-tabs button:last-child{border-right:0}
  .pn-roulette-tabs button.active{
    color:#f0d8ff;
    background:rgba(136,40,174,.16);
    box-shadow:inset 0 -2px 0 #b041df;
  }

  .pn-roulette-controls{
    display:grid;
    grid-template-columns:1fr .65fr 1.4fr .8fr;
    gap:10px;
    margin-bottom:12px;
  }
  .pn-roulette-controls label,
  .pn-pool-add label,
  .pn-pending-bet label,
  .pn-manual-result label{
    display:flex;
    flex-direction:column;
    gap:5px;
  }
  .pn-roulette-controls label>span,
  .pn-pool-add label>span,
  .pn-pending-bet label>span,
  .pn-manual-result label>span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }
  .pn-roulette-exposure{
    border:1px solid rgba(159,82,208,.34);
    background:rgba(14,10,18,.78);
    padding:9px 11px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:5px;
  }
  .pn-roulette-exposure span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }
  .pn-roulette-exposure b{font-family:var(--mono);font-size:11px}

  .pn-roulette-chamber-grid,
  .pn-roulette-two-col{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:14px;
  }
  .pn-chaos-panel{
    border-color:rgba(165,91,211,.44) !important;
    background:rgba(12,9,16,.86) !important;
    box-shadow:0 14px 35px rgba(0,0,0,.18),inset 0 0 0 1px rgba(207,96,255,.035);
  }
  .pn-chaos-panel .panel-head{
    border-bottom:1px solid rgba(165,91,211,.34);
  }
  .pn-chaos-state{
    color:#b45fda;
    font-family:var(--mono);
    font-size:8px;
    letter-spacing:.08em;
  }
  .pn-chaos-dormant{opacity:.48;filter:saturate(.55)}

  .pn-wheel-stage{
    min-height:430px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
  }
  .pn-wheel-shell{
    position:relative;
    width:min(330px,80vw);
    aspect-ratio:1;
    margin-bottom:18px;
    filter:drop-shadow(0 18px 35px rgba(0,0,0,.38));
  }
  .pn-wheel-pointer{
    position:absolute;
    z-index:8;
    left:50%;
    top:-5px;
    width:0;
    height:0;
    border-left:13px solid transparent;
    border-right:13px solid transparent;
    border-top:25px solid #f0d8ff;
    transform:translateX(-50%);
    filter:drop-shadow(0 0 8px rgba(240,216,255,.35));
  }
  .pn-roulette-wheel{
    position:absolute;
    inset:10px;
    border-radius:50%;
    border:2px solid rgba(231,169,255,.60);
    box-shadow:
      inset 0 0 0 6px rgba(10,7,13,.68),
      inset 0 0 36px rgba(166,40,191,.20),
      0 0 28px rgba(138,34,180,.16);
    transition:transform 3.8s cubic-bezier(.11,.72,.07,1);
    overflow:hidden;
  }
  .pn-verdict-wheel{
    background:conic-gradient(from -60deg,
      #9f163a 0 120deg,
      #2a2530 120deg 240deg,
      #244a3a 240deg 360deg);
  }
  .pn-wager-wheel{
    background:conic-gradient(from -25.714deg,
      #8e1738 0 51.428deg,
      #201a27 51.428deg 102.856deg,
      #5d1d74 102.856deg 154.284deg,
      #24202a 154.284deg 205.712deg,
      #7b1735 205.712deg 257.140deg,
      #4e1a67 257.140deg 308.568deg,
      #241c2c 308.568deg 360deg);
  }
  .pn-roulette-wheel.spinning{
    box-shadow:
      inset 0 0 0 6px rgba(10,7,13,.68),
      inset 0 0 46px rgba(212,45,191,.26),
      0 0 40px rgba(255,49,95,.18);
  }
  .pn-wheel-label{
    --radius:120px;
    position:absolute;
    left:50%;
    top:50%;
    width:94px;
    margin-left:-47px;
    margin-top:-9px;
    text-align:center;
    transform:rotate(var(--a)) translateY(-120px) rotate(var(--neg));
    transform-origin:50% 50%;
    color:#f6eaff;
    font-size:9px;
    font-weight:900;
    letter-spacing:.04em;
    text-shadow:0 1px 4px rgba(0,0,0,.75);
  }
  .pn-wheel-core{
    position:absolute;
    left:50%;
    top:50%;
    width:62px;
    height:62px;
    border-radius:50%;
    transform:translate(-50%,-50%);
    display:flex;
    align-items:center;
    justify-content:center;
    border:2px solid rgba(235,188,255,.68);
    background:radial-gradient(circle,#391344,#100a15 68%);
    color:#e9c8ff;
    font-family:var(--mono);
    font-size:14px;
    font-weight:900;
    box-shadow:0 0 22px rgba(188,61,229,.28);
  }
  .pn-spin-button{
    min-width:190px;
    box-shadow:0 0 18px rgba(150,45,194,.12);
  }
  .pn-wheel-legend{
    margin-top:8px;
    color:var(--muted);
    font-size:8px;
    font-weight:800;
    letter-spacing:.07em;
  }

  .pn-roulette-result-zone{
    margin-top:14px;
    display:flex;
    align-items:stretch;
    gap:12px;
  }
  .pn-roulette-terminal{
    flex:1;
    min-height:98px;
    border:1px solid rgba(165,91,211,.42);
    background:rgba(12,9,16,.84);
    padding:14px 16px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:4px;
    position:relative;
    overflow:hidden;
  }
  .pn-roulette-terminal:after{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.015) 4px);
  }
  .pn-roulette-terminal span,
  .pn-wager-result span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.10em;
  }
  .pn-roulette-terminal b{
    font-size:25px;
    line-height:1;
    letter-spacing:.05em;
  }
  .pn-roulette-terminal small{color:var(--muted);font-size:9px}
  .pn-roulette-terminal.bet b{color:#ff5478;text-shadow:0 0 20px rgba(255,49,95,.18)}
  .pn-roulette-terminal.save b{color:var(--green)}
  .pn-roulette-terminal.retreat b{color:#aaa1b0}
  .pn-roulette-terminal.idle b{color:#c774eb}
  .pn-wager-result{
    width:240px;
    border:1px solid rgba(165,91,211,.42);
    background:rgba(55,16,69,.20);
    padding:14px 16px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:6px;
  }
  .pn-wager-result b{font-size:18px;color:#e7c0ff}
  .pn-roulette-actions{
    min-width:160px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .pn-roulette-actions .btn{width:100%;min-height:48px}

  .pn-roulette-notice{
    padding:9px 12px;
    margin-bottom:10px;
    border:1px solid rgba(165,91,211,.38);
    background:rgba(61,20,77,.15);
    color:#d7b6e9;
    font-family:var(--mono);
    font-size:9px;
  }
  .pn-roulette-notice.ok{border-color:var(--green-dim);color:var(--green);background:var(--green-wash)}
  .pn-roulette-notice.err{border-color:var(--red-dim);color:var(--red);background:var(--red-wash)}

  .pn-roulette-pool-summary,
  .pn-roulette-report-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    border:1px solid rgba(165,91,211,.40);
    background:rgba(12,9,16,.82);
    margin-bottom:12px;
  }
  .pn-roulette-report-grid{grid-template-columns:repeat(6,minmax(0,1fr))}
  .pn-roulette-pool-summary>div,
  .pn-roulette-report-grid>div{
    min-height:61px;
    padding:10px 12px;
    border-right:1px solid rgba(165,91,211,.30);
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:5px;
  }
  .pn-roulette-pool-summary>div:last-child,
  .pn-roulette-report-grid>div:last-child{border-right:0}

  .pn-pool-add{
    display:grid;
    grid-template-columns:1.1fr .8fr .55fr 1.2fr auto;
    gap:9px;
    align-items:end;
    margin-bottom:14px;
  }
  .pn-pool-add .btn{min-height:36px}

  .pn-pending-bet{
    min-height:68px;
    padding:10px 12px;
    display:grid;
    grid-template-columns:minmax(0,1fr) 120px auto;
    gap:12px;
    align-items:center;
    border-bottom:1px solid rgba(165,91,211,.28);
  }
  .pn-pending-bet:last-child{border-bottom:0}
  .pn-pending-main{
    display:flex;
    flex-direction:column;
    gap:3px;
    min-width:0;
  }
  .pn-pending-main span,
  .pn-pending-main small{color:var(--muted);font-size:8px}
  .pn-pending-main b{font-size:12px}
  .pn-pending-actions{display:flex;gap:5px;flex-wrap:wrap}
  .pn-roulette-empty{
    min-height:90px;
    display:flex;
    align-items:center;
    justify-content:center;
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-manual-result{
    display:grid;
    grid-template-columns:.75fr 1fr .7fr .7fr .55fr .65fr 1.2fr auto;
    gap:8px;
    align-items:end;
  }
  .pn-manual-result .btn{min-height:36px}

  @media(max-width:1250px){
    .pn-roulette-damage,
    .pn-roulette-report-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .pn-roulette-controls{grid-template-columns:1fr 1fr}
    .pn-pool-add{grid-template-columns:1fr 1fr}
    .pn-manual-result{grid-template-columns:repeat(2,1fr)}
  }
  @media(max-width:900px){
    .pn-roulette-chamber-grid,
    .pn-roulette-two-col{grid-template-columns:1fr}
    .pn-roulette-result-zone{flex-direction:column}
    .pn-wager-result,.pn-roulette-actions{width:auto;min-width:0}
    .pn-wheel-stage{min-height:400px}
  }
  @media(max-width:620px){
    .pn-roulette-damage,
    .pn-roulette-report-grid,
    .pn-roulette-pool-summary,
    .pn-roulette-controls,
    .pn-pool-add,
    .pn-manual-result{grid-template-columns:1fr}
    .pn-roulette-tabs{display:flex;width:100%}
    .pn-roulette-tabs button{min-width:0;flex:1}
    .pn-chaos-header{grid-template-columns:1fr;gap:4px}
    .pn-pending-bet{grid-template-columns:1fr}
  }
  `;
  document.head.appendChild(style);
})();
