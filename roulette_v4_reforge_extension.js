"use strict";

/*
  PROFITNODE THE ROULETTE V4 — MACHINE CHAMBER REFORGE

  Presentation-only overhaul layered on top of the canonical Roulette V3 logic.
  Existing event handlers and doctrine remain authoritative:
    - one judgement per day
    - minimum 12h discipline
    - no rerolls / no override
    - BET unlocks wager stage
    - SAVE MONEY / FUCK OFF end the round
    - existing history/localStorage remains untouched

  V4 replaces only the Roulette route renderer and adds scoped styling.
*/
(function installProfitnodeRouletteV4(){
  if (window.__pnRouletteV4Installed) return;
  window.__pnRouletteV4Installed = true;

  const LEDGER_KEY = "rouletteLedger";
  const VERDICTS = ["BET","FUCK OFF","SAVE MONEY"];
  const WAGERS = [
    "ODD RED","ODD BLACK","EVEN RED","EVEN BLACK",
    "1ST + 2ND","1ST + 3RD","2ND + 3RD"
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

  function n(v){
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  function ledger(){
    const data = Store.load();
    return Array.isArray(data[LEDGER_KEY]) ? data[LEDGER_KEY] : [];
  }

  function currentCurrency(){
    return state.rouletteCurrency || displayCurrency();
  }

  function stake(){
    return Math.max(0,Math.round(n(state.rouletteStake)));
  }

  function rowNet(row,currency){
    if (!row || row.type!=="BET" || row.status!=="RESOLVED") return 0;
    if (row.net!=null) return convert(n(row.net),row.currency,currency);
    if (row.returned!=null) return convert(n(row.returned)-n(row.stake),row.currency,currency);
    return 0;
  }

  function stats(currency){
    const rows = ledger();
    const bets = rows.filter(row=>row.type==="BET");
    return {
      invested:bets.reduce((sum,row)=>sum+convert(n(row.stake),row.currency,currency),0),
      net:bets.reduce((sum,row)=>sum+rowNet(row,currency),0),
      rounds:rows.length
    };
  }

  function shopFund(currency){
    try{
      if (typeof window.pnShopFundBalance === "function"){
        return n(window.pnShopFundBalance(currency));
      }
      if (typeof window.pnShopFundBalanceRsd === "function"){
        return currency==="RSD"
          ? n(window.pnShopFundBalanceRsd())
          : convert(n(window.pnShopFundBalanceRsd()),"RSD",currency);
      }
    }catch(error){}
    try{
      if (window.__pnRouletteDoctrine && typeof window.__pnRouletteDoctrine.fundTotal==="function"){
        return n(window.__pnRouletteDoctrine.fundTotal(currency));
      }
    }catch(error){}
    return 0;
  }

  function gate(){
    try{
      if (window.__pnRouletteDoctrine && typeof window.__pnRouletteDoctrine.gate==="function"){
        return window.__pnRouletteDoctrine.gate();
      }
    }catch(error){}
    return {locked:false,allowed:true,label:"READY",remainingMs:0};
  }

  function protocolParts(protocol,total){
    const names = PROTOCOLS[protocol] || [protocol||"",""];
    const first = Math.floor(total/2);
    return [
      {label:names[0],amount:first},
      {label:names[1],amount:total-first}
    ];
  }

  function wheelLabels(labels,rotation){
    const count = labels.length;
    const r = n(rotation);
    return labels.map((label,index)=>{
      const angle = -90 + (index+.5)*(360/count);
      return '<span class="pn-r3-wheel-label" style="--a:'+angle+'deg;--neg-a:'+(-angle)+'deg;--neg-r:'+(-r)+'deg">'+escHtml(label)+'</span>';
    }).join("");
  }

  function verdictWheel(){
    return '<div class="pn-r3-wheel-shell pn-r4-wheel-shell">'+
      '<div class="pn-r4-target-ring" aria-hidden="true"></div>'+
      '<div class="pn-r3-pointer"></div>'+
      '<div class="pn-r3-wheel pn-r3-verdict-wheel" data-r3-verdict-wheel style="transform:rotate('+n(state.rouletteVerdictRotation)+'deg)">'+
        wheelLabels(VERDICTS,state.rouletteVerdictRotation)+
        '<div class="pn-r3-core"><span>PN</span><small>JUDGE</small></div>'+
      '</div>'+
    '</div>';
  }

  function wagerWheel(){
    return '<div class="pn-r3-wheel-shell pn-r4-wheel-shell pn-r4-wager-shell">'+
      '<div class="pn-r4-target-ring" aria-hidden="true"></div>'+
      '<div class="pn-r3-pointer"></div>'+
      '<div class="pn-r3-wheel pn-r3-wager-wheel" data-r3-wager-wheel style="transform:rotate('+n(state.rouletteWagerRotation)+'deg)">'+
        wheelLabels(WAGERS,state.rouletteWagerRotation)+
        '<div class="pn-r3-core"><span>R</span><small>WAGER</small></div>'+
      '</div>'+
    '</div>';
  }

  function summary(currency){
    const s = stats(currency);
    const g = gate();
    const next = g.locked ? g.label : "READY";
    return '<section class="pn-r4-summary" aria-label="Roulette command summary">'+
      '<article class="pn-r4-kpi hero"><span>SHOP FUND</span><b>'+money(shopFund(currency),currency)+'</b><small>AVAILABLE BUILD CAPITAL</small></article>'+
      '<article class="pn-r4-kpi"><span>NET RESULT</span><b class="'+(s.net>0?"pos":s.net<0?"neg":"")+'">'+money(s.net,currency)+'</b><small>ROULETTE LIFETIME</small></article>'+
      '<article class="pn-r4-kpi"><span>TOTAL INVESTED</span><b>'+money(s.invested,currency)+'</b><small>COMMITTED STAKE</small></article>'+
      '<article class="pn-r4-kpi"><span>ROUNDS</span><b>'+s.rounds+'</b><small>CHRONICLE ENTRIES</small></article>'+
      '<article class="pn-r4-kpi ready '+(g.locked?"locked":"")+'"><span>NEXT JUDGEMENT</span><b '+(g.locked?'data-pn-r3-cooldown':'')+'>'+escHtml(next)+'</b><small>'+(g.locked?"DOCTRINE LOCK":"MACHINE READY")+'</small></article>'+
    '</section>';
  }

  function doctrineStrip(){
    return '<div class="pn-r4-doctrine">'+
      '<span>ONE JUDGEMENT</span><i></i>'+
      '<span>12H DISCIPLINE</span><i></i>'+
      '<span>NO REROLL</span><i></i>'+
      '<span>OUTCOME FINAL</span>'+
    '</div>';
  }

  function stageRail(){
    const hasVerdict = !!state.rouletteVerdict;
    const bet = state.rouletteVerdict==="BET";
    const hasWager = !!state.rouletteWager;
    const committed = !!state.rouletteCommittedId;

    let current = "STAKE";
    if (committed) current = "RESULT";
    else if (hasWager) current = "RESULT";
    else if (bet) current = "WAGER";
    else if (hasVerdict) current = "RESULT";
    else if (stake()>0) current = "JUDGEMENT";

    const stages = [
      {key:"STAKE",no:"01",label:"STAKE",done:stake()>0 || hasVerdict},
      {key:"JUDGEMENT",no:"02",label:"JUDGEMENT",done:hasVerdict},
      {key:"WAGER",no:"03",label:"WAGER",done:hasWager,skip:hasVerdict && !bet},
      {key:"RESULT",no:"04",label:"RESULT",done:false}
    ];

    return '<div class="pn-r4-rail">'+stages.map((s,index)=>{
      const cls = [
        s.done?"done":"",
        s.skip?"skip":"",
        s.key===current?"current":""
      ].filter(Boolean).join(" ");
      return '<div class="pn-r4-rail-step '+cls+'">'+
        '<span>'+s.no+'</span><b>'+s.label+'</b>'+
        (index<stages.length-1?'<i></i>':'')+
      '</div>';
    }).join("")+'</div>';
  }

  function tabBar(){
    return '<div class="pn-r4-tabs">'+
      '<button type="button" class="'+(state.rouletteTab!=="RESULTS"?"active":"")+'" data-r3-tab="CHAMBER">CHAMBER</button>'+
      '<button type="button" class="'+(state.rouletteTab==="RESULTS"?"active":"")+'" data-r3-tab="RESULTS">CHRONICLE</button>'+
    '</div>';
  }

  function verdictCopy(verdict){
    if (verdict==="BET") return {title:"RISK DOCTRINE ACCEPTED",detail:"Wager protocol unlocked.",tone:"bet"};
    if (verdict==="SAVE MONEY") return {title:"CAPITAL PRESERVED",detail:"Machine spirit approves restraint.",tone:"save"};
    return {title:"WAGER DENIED",detail:"Resources remain untouched.",tone:"deny"};
  }

  function judgementResult(){
    if (!state.rouletteVerdict) return "";
    const c = verdictCopy(state.rouletteVerdict);
    return '<div class="pn-r4-verdict '+c.tone+'">'+
      '<span>JUDGEMENT</span>'+
      '<strong>'+escHtml(state.rouletteVerdict)+'</strong>'+
      '<b>'+c.title+'</b>'+
      '<small>'+c.detail+'</small>'+
    '</div>';
  }

  function stakeControls(currency,locked){
    return '<div class="pn-r4-stake-zone">'+
      '<div class="pn-r4-fund-readout"><span>AVAILABLE SHOP FUND</span><b>'+money(shopFund(currency),currency)+'</b><small>SOURCE: SHOP FUND</small></div>'+
      '<div class="pn-r4-stake-control">'+
        '<label><span>STAKE</span><div class="pn-r4-input-wrap"><input type="number" min="0" step="1" value="'+escAttr(state.rouletteStake||"")+'" data-r3-stake placeholder="3000" '+(locked?"disabled":"")+'><select data-r3-currency '+(locked?"disabled":"")+'>'+
          '<option value="RSD"'+(currency==="RSD"?" selected":"")+'>RSD</option>'+
          '<option value="EUR"'+(currency==="EUR"?" selected":"")+'>EUR</option>'+
        '</select></div></label>'+
        '<div class="pn-r4-presets">'+
          [500,1000,2000,3000].map(v=>'<button type="button" data-r4-stake-preset="'+v+'" '+(locked?"disabled":"")+'>'+v.toLocaleString("en-US")+'</button>').join("")+
          '<span>CUSTOM INPUT ENABLED</span>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function judgementChamber(){
    const currency = currentCurrency();
    const g = gate();
    const hasVerdict = !!state.rouletteVerdict;
    const locked = hasVerdict || g.locked;
    const canSpin = stake()>0 && !locked;

    return '<section class="pn-r4-chamber pn-r4-judgement">'+
      '<div class="pn-r4-panel-head"><div><span>01 // PRIMARY RITUAL</span><h2>JUDGEMENT CHAMBER</h2></div><b>'+(g.locked?"DOCTRINE LOCKED":hasVerdict?"VERDICT SEALED":"MACHINE READY")+'</b></div>'+
      stakeControls(currency,locked)+
      '<div class="pn-r4-judgement-body">'+
        '<div class="pn-r4-wheel-zone">'+verdictWheel()+
          '<button type="button" class="btn btn-primary pn-r4-primary" data-r3-spin-verdict '+(!canSpin?"disabled":"")+'>'
            +(hasVerdict?"JUDGEMENT SEALED":g.locked?"VERDICT FINAL":"AUTHORIZE JUDGEMENT")+
          '</button>'+
          '<small>BET / SAVE MONEY / FUCK OFF</small>'+
        '</div>'+
        '<div class="pn-r4-judgement-data">'+
          (hasVerdict?judgementResult():
            '<div class="pn-r4-machine-idle"><span>ROUND #'+String(ledger().length+1).padStart(3,"0")+'</span><b>FATE AWAITS INPUT</b><small>Set stake. Authorize one judgement. Accept the result.</small></div>')+
        '</div>'+
      '</div>'+
    '</section>';
  }

  function wagerPanel(){
    if (state.rouletteVerdict!=="BET") return "";

    const currency = currentCurrency();
    const total = stake();
    const selected = state.rouletteWager;
    const parts = selected ? protocolParts(selected,total) : null;

    return '<section class="pn-r4-chamber pn-r4-wager '+(selected?"locked":"")+'">'+
      '<div class="pn-r4-panel-head"><div><span>02 // EXECUTION PROTOCOL</span><h2>WAGER CHAMBER</h2></div><b>'+(selected?"PROTOCOL SEALED":"UNLOCKED BY BET")+'</b></div>'+
      '<div class="pn-r4-wager-grid">'+
        '<div class="pn-r4-wheel-zone">'+wagerWheel()+
          '<button type="button" class="btn btn-primary pn-r4-primary" data-r3-spin-wager '+(selected?"disabled":"")+'>'+(selected?"PROTOCOL SEALED":"SPIN WAGER")+'</button>'+
        '</div>'+
        '<div class="pn-r4-protocol">'+
          (selected ?
            '<span>SELECTED PROTOCOL</span><strong>'+escHtml(selected)+'</strong>'+
            '<div class="pn-r4-split">'+
              '<div><span>'+escHtml(parts[0].label)+'</span><b>'+money(parts[0].amount,currency)+'</b></div>'+
              '<div><span>'+escHtml(parts[1].label)+'</span><b>'+money(parts[1].amount,currency)+'</b></div>'+
            '</div>'+
            '<div class="pn-r4-exposure"><span>TOTAL EXPOSURE</span><b>'+money(total,currency)+'</b></div>'+
            '<button type="button" class="btn btn-primary pn-r4-commit" data-r3-commit>COMMIT WAGER</button>'+
            '<small>Once committed, no edits, rerolls or intervention.</small>'
          :
            '<span>WAGER PROTOCOL</span><strong>AWAITING SPIN</strong>'+
            '<p>Odd/even + colour, or paired thirds. The stake will be split 50/50 across both legs.</p>'+
            '<div class="pn-r4-protocol-list">'+WAGERS.map(w=>'<i>'+escHtml(w)+'</i>').join("")+'</div>'
          )+
        '</div>'+
      '</div>'+
    '</section>';
  }

  function closingPanel(){
    if (!state.rouletteVerdict || state.rouletteVerdict==="BET") return "";
    const c = verdictCopy(state.rouletteVerdict);
    return '<section class="pn-r4-resolution '+c.tone+'">'+
      '<span>ROUND RESOLUTION</span>'+
      '<b>'+c.title+'</b>'+
      '<p>'+c.detail+'</p>'+
      '<div><strong>'+money(stake(),currentCurrency())+'</strong><small>'+(state.rouletteVerdict==="SAVE MONEY"?"PRESERVED / ROUTED TO BUILD CAPITAL":"NOT WAGERED")+'</small></div>'+
      '<button type="button" class="btn btn-primary" data-r3-close-round>FINALIZE ROUND</button>'+
    '</section>';
  }

  function committedRow(){
    if (!state.rouletteCommittedId) return null;
    return ledger().find(row=>row.id===state.rouletteCommittedId) || null;
  }

  function resultPanel(row){
    if (!row) return "";
    const parts = protocolParts(row.wager,n(row.stake));
    return '<section class="pn-r4-chamber pn-r4-result-entry">'+
      '<div class="pn-r4-panel-head"><div><span>03 // SEALED OUTCOME</span><h2>PROTOCOL LOCKED</h2></div><b>NO FURTHER INTERVENTION</b></div>'+
      '<div class="pn-r4-result-grid">'+
        '<div class="pn-r4-result-lock">'+
          '<span>WAGER</span><strong>'+escHtml(row.wager||"BET")+'</strong>'+
          '<div class="pn-r4-split">'+
            '<div><span>'+escHtml(parts[0].label)+'</span><b>'+money(parts[0].amount,row.currency)+'</b></div>'+
            '<div><span>'+escHtml(parts[1].label)+'</span><b>'+money(parts[1].amount,row.currency)+'</b></div>'+
          '</div>'+
          '<small>TOTAL STAKE '+money(row.stake,row.currency)+'</small>'+
        '</div>'+
        '<div class="pn-r4-result-form">'+
          '<label><span>RESULT</span><select data-r3-result-outcome="'+escAttr(row.id)+'"><option value="WIN">WIN</option><option value="LOSS">LOSS</option></select></label>'+
          '<label><span>NET MONEY EARNED / LOST</span><input type="number" min="0" step="1" data-r3-result-amount="'+escAttr(row.id)+'" placeholder="0"></label>'+
          '<button type="button" class="btn btn-primary pn-r4-primary" data-r3-record-result="'+escAttr(row.id)+'">FINALIZE RESULT</button>'+
          '<small>Enter the net amount. The result is final.</small>'+
        '</div>'+
      '</div>'+
    '</section>';
  }

  function chamber(){
    const pending = committedRow();
    if (pending) return resultPanel(pending);

    return '<div class="pn-r4-chambers">'+
      judgementChamber()+
      wagerPanel()+
      closingPanel()+
    '</div>';
  }

  function historyRows(currency){
    const rows = ledger().slice().sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")));
    if (!rows.length) return '<tr class="empty-row"><td colspan="8">No judgement has been recorded.</td></tr>';

    const chronological = rows.slice().sort((a,b)=>String(a.createdAt||a.date||"").localeCompare(String(b.createdAt||b.date||"")));
    const numbers = new Map(chronological.map((row,index)=>[row.id,index+1]));

    return rows.map(row=>{
      const isBet = row.type==="BET";
      const result = isBet
        ? (row.status==="PENDING" ? "PENDING" : (["LOSE","DEFEAT","LOSS"].includes(row.outcome)?"LOSS":row.outcome||"RESOLVED"))
        : (row.verdict==="SAVE MONEY"?"SAVED":row.verdict==="FUCK OFF"?"DENIED":row.verdict||"VERDICT");
      const net = isBet && row.status==="RESOLVED" ? rowNet(row,currency) : null;
      const fundAfter = row.fundAfter!=null ? money(convert(n(row.fundAfter),row.currency||currency,currency),currency) : "—";

      return '<tr>'+
        '<td class="mono">#'+String(numbers.get(row.id)||0).padStart(3,"0")+'</td>'+
        '<td class="mono">'+fmtDate(row.date)+'</td>'+
        '<td class="num">'+(isBet?money(row.stake,row.currency):row.avoidedStake?money(row.avoidedStake,row.currency):"—")+'</td>'+
        '<td>'+escHtml(row.verdict||"BET")+'</td>'+
        '<td>'+escHtml(row.wager||"—")+'</td>'+
        '<td><span class="pn-r4-result-chip '+String(result).toLowerCase().replace(/[^a-z]+/g,"-")+'">'+escHtml(result)+'</span></td>'+
        '<td class="num '+(net==null?"":net>=0?"pos":"neg")+'">'+(net==null?"—":money(net,currency))+'</td>'+
        '<td class="num">'+fundAfter+'</td>'+
      '</tr>';
    }).join("");
  }

  function chronicle(currency){
    return '<section class="pn-r4-chamber pn-r4-chronicle">'+
      '<div class="pn-r4-panel-head"><div><span>PERMANENT MACHINE RECORD</span><h2>CHRONICLE OF FATE</h2></div><b>'+ledger().length+' ENTRIES</b></div>'+
      '<div class="table-scroll"><table>'+
        '<thead><tr><th>Round</th><th>Date</th><th class="num">Stake</th><th>Judgement</th><th>Protocol</th><th>Result</th><th class="num">Net</th><th class="num">Fund After</th></tr></thead>'+
        '<tbody>'+historyRows(currency)+'</tbody>'+
      '</table></div>'+
    '</section>';
  }

  function renderRouletteV4(){
    const currency = displayCurrency();
    return pageHeader("THE ROULETTE","CHAOS PROTOCOL ARMED","")+
      '<div class="content pn-r4-content">'+
        doctrineStrip()+
        summary(currency)+
        stageRail()+
        tabBar()+
        (state.rouletteTab==="RESULTS" ? chronicle(currency) : chamber())+
      '</div>';
  }

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(row=>row.key==="roulette");
    if (route){
      route.label = "THE ROULETTE";
      route.render = renderRouletteV4;
    }
  }

  document.addEventListener("click",function(event){
    const preset = event.target.closest("[data-r4-stake-preset]");
    if (!preset) return;
    if (preset.disabled) return;
    state.rouletteStake = String(preset.dataset.r4StakePreset||"");
    state.rouletteNotice = null;
    render();
  });

  const style = document.createElement("style");
  style.dataset.pnRouletteV4 = "true";
  style.textContent = `
    .pn-r4-content{
      --r4-edge:rgba(166,75,211,.38);
      --r4-edge-hot:rgba(213,75,255,.72);
      --r4-panel:rgba(10,8,14,.90);
      --r4-panel-2:rgba(18,11,23,.92);
      --r4-muted:#817887;
      --r4-text:#ece8ef;
      position:relative;
      isolation:isolate;
      padding-top:16px;
    }
    .pn-r4-content:before{
      content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
      background:
        radial-gradient(circle at 22% 5%,rgba(154,24,82,.10),transparent 29%),
        radial-gradient(circle at 80% 12%,rgba(105,43,170,.10),transparent 28%),
        linear-gradient(90deg,transparent 49.8%,rgba(187,74,238,.025) 50%,transparent 50.2%);
      background-size:auto,auto,90px 90px;
    }

    .pn-r4-doctrine{
      min-height:42px;margin-bottom:14px;padding:0 18px;
      display:flex;align-items:center;justify-content:center;gap:18px;
      border:1px solid rgba(178,43,97,.46);
      background:linear-gradient(90deg,rgba(64,10,31,.72),rgba(27,11,35,.82),rgba(64,10,31,.72));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
      color:#df809d;font:800 9px/1 var(--mono);letter-spacing:.15em;
    }
    .pn-r4-doctrine i{width:3px;height:3px;border-radius:50%;background:#a93f79;box-shadow:0 0 8px #b44685}

    .pn-r4-summary{
      display:grid;grid-template-columns:1.45fr repeat(4,1fr);
      border:1px solid var(--r4-edge);
      background:rgba(8,7,11,.86);
      margin-bottom:16px;
    }
    .pn-r4-kpi{
      min-width:0;min-height:94px;padding:14px 16px;
      display:flex;flex-direction:column;justify-content:center;gap:7px;
      border-right:1px solid rgba(155,80,190,.24);
    }
    .pn-r4-kpi:last-child{border-right:0}
    .pn-r4-kpi span,.pn-r4-kpi small{
      font:800 8px/1.2 var(--mono);letter-spacing:.11em;color:var(--r4-muted);
    }
    .pn-r4-kpi b{
      font:900 clamp(18px,1.7vw,27px)/1 var(--mono);color:var(--r4-text);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .pn-r4-kpi.hero{
      position:relative;
      background:linear-gradient(110deg,rgba(100,28,116,.20),rgba(18,10,22,.15));
      box-shadow:inset 2px 0 0 #b64cdf;
    }
    .pn-r4-kpi.hero b{color:#40d58b;font-size:clamp(22px,2.25vw,35px)}
    .pn-r4-kpi b.pos{color:var(--green)}
    .pn-r4-kpi b.neg{color:var(--red)}
    .pn-r4-kpi.ready b{color:#74dfa8}
    .pn-r4-kpi.ready.locked b{color:#e3bd66}

    .pn-r4-rail{
      display:grid;grid-template-columns:repeat(4,1fr);
      margin:0 0 14px;
      border-top:1px solid rgba(141,68,175,.26);
      border-bottom:1px solid rgba(141,68,175,.26);
      background:rgba(8,7,11,.52);
    }
    .pn-r4-rail-step{
      position:relative;min-height:44px;padding:0 14px;
      display:flex;align-items:center;gap:8px;color:#544e59;
    }
    .pn-r4-rail-step>span{
      font:900 8px/1 var(--mono);letter-spacing:.08em;
      width:22px;height:22px;display:grid;place-items:center;
      border:1px solid currentColor;clip-path:polygon(20% 0,100% 0,100% 80%,80% 100%,0 100%,0 20%);
    }
    .pn-r4-rail-step>b{font:900 8px/1 var(--mono);letter-spacing:.12em}
    .pn-r4-rail-step>i{
      position:absolute;right:0;width:32%;height:1px;background:currentColor;opacity:.28;
      transform:translateX(50%);
    }
    .pn-r4-rail-step.done{color:#a54ed1}
    .pn-r4-rail-step.current{color:#e087ff;background:linear-gradient(90deg,rgba(166,49,202,.10),transparent)}
    .pn-r4-rail-step.current>span{box-shadow:0 0 16px rgba(216,94,255,.28);animation:pnR4Pulse 2s ease-in-out infinite}
    .pn-r4-rail-step.skip{color:#39343c;text-decoration:line-through}
    @keyframes pnR4Pulse{50%{box-shadow:0 0 22px rgba(216,94,255,.52)}}

    .pn-r4-tabs{display:flex;margin-bottom:14px}
    .pn-r4-tabs button{
      min-width:142px;padding:10px 16px;border:1px solid rgba(146,73,178,.35);
      background:#0d0a11;color:#77707d;font:900 9px/1 var(--mono);letter-spacing:.12em;cursor:pointer;
    }
    .pn-r4-tabs button+button{border-left:0}
    .pn-r4-tabs button.active{color:#e3adfa;background:rgba(102,34,130,.22);box-shadow:inset 0 -2px 0 #bd4bf0}

    .pn-r4-chambers{display:grid;gap:16px}
    .pn-r4-chamber{
      border:1px solid var(--r4-edge);background:var(--r4-panel);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 20px 45px rgba(0,0,0,.18);
    }
    .pn-r4-panel-head{
      min-height:62px;padding:12px 16px;
      display:flex;align-items:center;justify-content:space-between;gap:16px;
      border-bottom:1px solid rgba(159,76,192,.28);
      background:linear-gradient(90deg,rgba(62,20,76,.17),transparent 65%);
    }
    .pn-r4-panel-head>div{display:grid;gap:5px}
    .pn-r4-panel-head span,.pn-r4-panel-head>b{
      font:800 8px/1.1 var(--mono);letter-spacing:.12em;color:#8b628f;
    }
    .pn-r4-panel-head h2{margin:0;color:#e9e4ec;font-size:15px;letter-spacing:.05em}
    .pn-r4-panel-head>b{color:#b467cf;text-align:right}

    .pn-r4-stake-zone{
      padding:14px 16px;display:grid;grid-template-columns:minmax(220px,.7fr) minmax(340px,1.3fr);gap:14px;
      border-bottom:1px solid rgba(159,76,192,.18);
      background:rgba(255,255,255,.012);
    }
    .pn-r4-fund-readout,.pn-r4-stake-control{
      min-width:0;padding:12px 14px;border:1px solid rgba(143,76,167,.22);background:rgba(6,6,9,.48);
    }
    .pn-r4-fund-readout{display:flex;flex-direction:column;justify-content:center;gap:7px}
    .pn-r4-fund-readout span,.pn-r4-fund-readout small,.pn-r4-stake-control label>span{
      color:#79717e;font:800 8px/1.1 var(--mono);letter-spacing:.11em;
    }
    .pn-r4-fund-readout b{font:900 25px/1 var(--mono);color:#47d892}
    .pn-r4-input-wrap{display:grid;grid-template-columns:1fr 96px;margin-top:7px}
    .pn-r4-input-wrap input,.pn-r4-input-wrap select,.pn-r4-result-form input,.pn-r4-result-form select{
      min-width:0;min-height:42px;border:1px solid rgba(155,86,185,.38);background:#09070c;color:#eae5ed;
      padding:8px 10px;font:800 13px/1 var(--mono);
    }
    .pn-r4-input-wrap select{border-left:0}
    .pn-r4-presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
    .pn-r4-presets button{
      border:1px solid rgba(147,79,174,.30);background:#100b14;color:#9b8ca1;padding:6px 9px;
      font:800 8px/1 var(--mono);cursor:pointer;
    }
    .pn-r4-presets button:hover:not(:disabled){border-color:#b653d7;color:#e0b4ef}
    .pn-r4-presets button:disabled{opacity:.35}
    .pn-r4-presets span{margin-left:auto;color:#5e5861;font:700 7px/1 var(--mono);letter-spacing:.08em}

    .pn-r4-judgement-body{display:grid;grid-template-columns:minmax(390px,.95fr) minmax(320px,1.05fr)}
    .pn-r4-wheel-zone{
      min-height:430px;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      border-right:1px solid rgba(151,76,181,.19);
    }
    .pn-r4-wheel-zone>small{color:#615b64;font:800 7px/1 var(--mono);letter-spacing:.13em}
    .pn-r4-judgement-data{padding:28px;display:flex;align-items:center;justify-content:center}
    .pn-r4-machine-idle,.pn-r4-verdict{
      width:min(440px,100%);padding:28px;border:1px solid rgba(145,76,174,.24);
      background:linear-gradient(135deg,rgba(24,12,29,.72),rgba(7,7,10,.88));display:grid;gap:10px;
    }
    .pn-r4-machine-idle span,.pn-r4-verdict>span{
      color:#716a74;font:800 8px/1 var(--mono);letter-spacing:.12em;
    }
    .pn-r4-machine-idle b{font-size:28px;color:#d58df2;letter-spacing:.04em}
    .pn-r4-machine-idle small,.pn-r4-verdict small{color:#77707a;line-height:1.5}
    .pn-r4-verdict strong{font:900 38px/1 var(--mono)}
    .pn-r4-verdict b{font-size:14px;letter-spacing:.08em}
    .pn-r4-verdict.bet strong,.pn-r4-verdict.bet b{color:#ef5477}
    .pn-r4-verdict.save strong,.pn-r4-verdict.save b{color:#45d18d}
    .pn-r4-verdict.deny strong,.pn-r4-verdict.deny b{color:#aaa2ad}

    .pn-r4-wheel-shell{width:min(315px,74vw)}
    .pn-r4-wager-shell{width:min(270px,68vw)}
    .pn-r4-target-ring{
      position:absolute;inset:-12px;border-radius:50%;pointer-events:none;z-index:0;
      border:1px dashed rgba(203,91,235,.26);
      box-shadow:0 0 32px rgba(149,47,188,.12);
    }
    .pn-r4-target-ring:before,.pn-r4-target-ring:after{
      content:"";position:absolute;left:50%;top:50%;background:rgba(215,106,243,.18);transform:translate(-50%,-50%);
    }
    .pn-r4-target-ring:before{width:calc(100% + 24px);height:1px}
    .pn-r4-target-ring:after{height:calc(100% + 24px);width:1px}

    .pn-r4-content .pn-r3-wheel{
      border:2px solid rgba(188,86,221,.66);
      box-shadow:0 0 0 6px rgba(29,17,34,.96),0 0 0 7px rgba(172,68,202,.24),0 0 34px rgba(139,43,174,.18),inset 0 0 55px rgba(0,0,0,.62);
      background-color:#110d15;
    }
    .pn-r4-content .pn-r3-verdict-wheel{
      background:
        radial-gradient(circle at center,transparent 0 27%,rgba(5,4,7,.62) 28% 31%,transparent 32%),
        repeating-conic-gradient(from 0deg,rgba(255,255,255,.025) 0deg 1deg,transparent 1deg 15deg),
        conic-gradient(#8f1638 0 120deg,#211d25 120deg 240deg,#114a35 240deg 360deg);
    }
    .pn-r4-content .pn-r3-wager-wheel{
      background:
        radial-gradient(circle at center,transparent 0 28%,rgba(5,4,7,.62) 29% 32%,transparent 33%),
        repeating-conic-gradient(from 0deg,rgba(255,255,255,.022) 0deg 1deg,transparent 1deg 12deg),
        conic-gradient(#67142d 0 51.428deg,#151218 51.428deg 102.856deg,#872038 102.856deg 154.284deg,#211d25 154.284deg 205.712deg,#3c1948 205.712deg 257.14deg,#5b1f46 257.14deg 308.568deg,#281931 308.568deg 360deg);
    }
    .pn-r4-content .pn-r3-wheel-label{font-size:8px;color:#e7dae9;text-shadow:0 1px 3px #000}
    .pn-r4-content .pn-r3-core{
      width:66px;height:66px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
      border:1px solid rgba(204,104,229,.68);background:radial-gradient(circle,#35123f 0,#100b14 68%);
      box-shadow:0 0 0 5px rgba(10,8,13,.76),0 0 20px rgba(178,66,214,.24);
    }
    .pn-r4-content .pn-r3-core span{font:900 13px/1 var(--mono)}
    .pn-r4-content .pn-r3-core small{font:800 6px/1 var(--mono);letter-spacing:.10em;color:#80628b}
    .pn-r4-content .pn-r3-pointer{
      top:-9px;border-left-width:10px;border-right-width:10px;border-bottom-width:22px;
      border-bottom-color:#e9d5ef;filter:drop-shadow(0 0 7px rgba(213,132,255,.38));
    }
    .pn-r4-primary{min-width:220px;min-height:42px;letter-spacing:.08em}

    .pn-r4-wager-grid{display:grid;grid-template-columns:minmax(360px,.85fr) minmax(360px,1.15fr)}
    .pn-r4-protocol{padding:30px;display:flex;flex-direction:column;justify-content:center;gap:12px}
    .pn-r4-protocol>span,.pn-r4-exposure span{color:#746c78;font:800 8px/1 var(--mono);letter-spacing:.12em}
    .pn-r4-protocol>strong{font:900 31px/1 var(--mono);color:#e887ff}
    .pn-r4-protocol>p{max-width:520px;color:#837b87;line-height:1.55}
    .pn-r4-protocol-list{display:flex;flex-wrap:wrap;gap:6px}
    .pn-r4-protocol-list i{font-style:normal;padding:6px 8px;border:1px solid rgba(147,79,174,.22);color:#756a7b;font:800 7px/1 var(--mono)}
    .pn-r4-split{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:4px 0}
    .pn-r4-split>div{padding:12px;border:1px solid rgba(151,79,178,.25);background:rgba(7,6,9,.55);display:grid;gap:5px}
    .pn-r4-split span{color:#716974;font:800 7px/1 var(--mono);letter-spacing:.09em}
    .pn-r4-split b{font:900 16px/1 var(--mono);color:#ddd4e0}
    .pn-r4-exposure{display:flex;align-items:center;justify-content:space-between;padding:12px;border-top:1px solid rgba(151,79,178,.18);border-bottom:1px solid rgba(151,79,178,.18)}
    .pn-r4-exposure b{font:900 17px/1 var(--mono);color:#e4d8e7}
    .pn-r4-commit{margin-top:8px;min-height:46px;border-color:#8f263f!important;background:linear-gradient(90deg,#541429,#7b1f3d)!important;box-shadow:0 0 22px rgba(151,31,66,.14)}
    .pn-r4-protocol>small{color:#665e69}

    .pn-r4-resolution{
      padding:28px;border:1px solid rgba(150,78,179,.34);background:rgba(10,8,13,.90);
      display:grid;grid-template-columns:1fr auto;gap:8px 24px;align-items:center;
    }
    .pn-r4-resolution>span{font:800 8px/1 var(--mono);letter-spacing:.12em;color:#776f7a}
    .pn-r4-resolution>b{grid-column:1;font-size:22px}
    .pn-r4-resolution>p{grid-column:1;margin:0;color:#817984}
    .pn-r4-resolution>div{grid-column:2;grid-row:1/4;display:grid;gap:5px;text-align:right}
    .pn-r4-resolution>div strong{font:900 24px/1 var(--mono)}
    .pn-r4-resolution>div small{color:#746c78;font:800 7px/1 var(--mono)}
    .pn-r4-resolution>button{grid-column:1/3;justify-self:start;margin-top:8px}
    .pn-r4-resolution.save b,.pn-r4-resolution.save strong{color:#45d18d}
    .pn-r4-resolution.deny b,.pn-r4-resolution.deny strong{color:#aaa2ad}

    .pn-r4-result-grid{display:grid;grid-template-columns:1fr 1fr}
    .pn-r4-result-lock,.pn-r4-result-form{padding:28px}
    .pn-r4-result-lock{border-right:1px solid rgba(151,79,178,.20);display:grid;gap:10px}
    .pn-r4-result-lock>span,.pn-r4-result-form label>span{color:#746c78;font:800 8px/1 var(--mono);letter-spacing:.11em}
    .pn-r4-result-lock>strong{font:900 29px/1 var(--mono);color:#e480fc}
    .pn-r4-result-lock>small{color:#746c78;font:800 8px/1 var(--mono)}
    .pn-r4-result-form{display:grid;grid-template-columns:160px 1fr;gap:12px;align-content:center}
    .pn-r4-result-form label{display:grid;gap:7px}
    .pn-r4-result-form button,.pn-r4-result-form>small{grid-column:1/3}
    .pn-r4-result-form>small{color:#6c646f}

    .pn-r4-chronicle table{width:100%}
    .pn-r4-chronicle td,.pn-r4-chronicle th{white-space:nowrap}
    .pn-r4-result-chip{
      display:inline-flex;padding:4px 7px;border:1px solid rgba(137,77,157,.25);
      color:#9a8da0;font:900 7px/1 var(--mono);letter-spacing:.08em;
    }
    .pn-r4-result-chip.win,.pn-r4-result-chip.saved{color:#49d694;border-color:rgba(73,214,148,.32)}
    .pn-r4-result-chip.loss{color:#ef5a6d;border-color:rgba(239,90,109,.32)}
    .pn-r4-result-chip.denied{color:#aaa2ad}
    .pn-r4-chronicle td.pos{color:var(--green);font-weight:900}
    .pn-r4-chronicle td.neg{color:var(--red);font-weight:900}

    @media(max-width:1080px){
      .pn-r4-summary{grid-template-columns:repeat(3,1fr)}
      .pn-r4-kpi:nth-child(3){border-right:0}
      .pn-r4-kpi:nth-child(n+4){border-top:1px solid rgba(155,80,190,.24)}
      .pn-r4-judgement-body,.pn-r4-wager-grid{grid-template-columns:1fr}
      .pn-r4-wheel-zone{border-right:0;border-bottom:1px solid rgba(151,76,181,.19)}
    }
    @media(max-width:760px){
      .pn-r4-doctrine{justify-content:flex-start;overflow:auto;white-space:nowrap}
      .pn-r4-summary{grid-template-columns:1fr 1fr}
      .pn-r4-kpi{border-top:1px solid rgba(155,80,190,.18)}
      .pn-r4-kpi.hero{grid-column:1/3}
      .pn-r4-rail-step{padding:0 7px}
      .pn-r4-rail-step>b{display:none}
      .pn-r4-rail-step>i{width:45%}
      .pn-r4-tabs button{flex:1;min-width:0}
      .pn-r4-stake-zone{grid-template-columns:1fr}
      .pn-r4-presets span{width:100%;margin-left:0}
      .pn-r4-judgement-body,.pn-r4-wager-grid,.pn-r4-result-grid{display:block}
      .pn-r4-wheel-zone{min-height:390px;padding:22px 12px}
      .pn-r4-judgement-data,.pn-r4-protocol,.pn-r4-result-lock,.pn-r4-result-form{padding:20px}
      .pn-r4-result-lock{border-right:0;border-bottom:1px solid rgba(151,79,178,.20)}
      .pn-r4-result-form{display:grid;grid-template-columns:1fr}
      .pn-r4-result-form button,.pn-r4-result-form>small{grid-column:auto}
      .pn-r4-resolution{grid-template-columns:1fr}
      .pn-r4-resolution>div,.pn-r4-resolution>button,.pn-r4-resolution>b,.pn-r4-resolution>p{grid-column:1;grid-row:auto;text-align:left}
      .pn-r4-primary,.pn-r4-commit{width:100%}
    }
    @media(max-width:480px){
      .pn-r4-summary{grid-template-columns:1fr}
      .pn-r4-kpi.hero{grid-column:auto}
      .pn-r4-kpi{min-height:78px}
      .pn-r4-kpi b{font-size:20px}
      .pn-r4-input-wrap{grid-template-columns:1fr 82px}
      .pn-r4-wheel-shell{width:min(285px,78vw)}
      .pn-r4-wager-shell{width:min(260px,74vw)}
      .pn-r4-machine-idle b{font-size:22px}
    }
  `;
  document.head.appendChild(style);

  console.info("[PROFITNODE] THE ROULETTE V4 REFORGE ACTIVE");
})();
