"use strict";

/*
  PROFITNODE THE ROULETTE - GRAPHICS OVERDRIVE v8

  Goal:
  - preserve the cleaned V7 structure
  - push the page into a true machine-cult probability engine
  - keep responsive scaling and functional compatibility with the Roulette core
*/

(function installRouletteGraphicsOverdrive(){
  if (typeof ROUTES !== "undefined") {
    const route = ROUTES.find(row => row.key === "roulette");

    if (route && typeof route.render === "function" && !route.__pnRouletteGraphicsWrapped) {
      const previous = route.render;

      route.render = function(){
        let html = previous.apply(this, arguments);

        html = html.replace(/<div class="pn-r3-header">[\s\S]*?<\/div>/, "");
        html = html.replace(/<div class="pn-r3-legend">[\s\S]*?<\/div>/g, "");
        html = html.replace(/<div class="pn-r3-protocol-key">[\s\S]*?<\/div>/g, "");

        const blessing =
          '<div class="pn-roulette-blessing" aria-hidden="true">' +
            '<span>MACHINE SPIRIT AWAKE</span>' +
            '<b>OMNISSIAH BLESS THIS WAGER</b>' +
            '<span>RNG SANCTIFIED // LIABILITY DENIED</span>' +
          '</div>';

        if (!html.includes('pn-roulette-blessing')) {
          html = html.replace('<div class="content pn-r3-content">', '<div class="content pn-r3-content">' + blessing);
        }

        html = html.replace(
          '<div class="panel-head"><h2>WHEEL #1</h2><span class="pn-r3-state">THE JUDGEMENT</span></div>',
          '<div class="panel-head pn-roulette-core-head"><h2><span>01</span> JUDGEMENT CORE</h2></div>'
        );

        html = html.replace(
          '<div class="panel-head"><h2>WHEEL #2</h2><span class="pn-r3-state">THE WAGER</span></div>',
          '<div class="panel-head pn-roulette-core-head"><h2><span>02</span> WAGER CORE</h2></div>'
        );

        return html;
      };

      route.__pnRouletteGraphicsWrapped = true;
    }
  }

  const root = document.documentElement;
  let resizeFrame = 0;
  let ritualTimer = 0;

  function clamp(min, value, max){
    return Math.max(min, Math.min(value, max));
  }

  function activateRitual(panel){
    document.body.classList.add("pn-roulette-ritual-live");
    clearTimeout(ritualTimer);

    if (panel) {
      panel.classList.add("pn-r3-spin-active");
      setTimeout(() => panel.classList.remove("pn-r3-spin-active"), 3600);
    }

    ritualTimer = setTimeout(() => {
      document.body.classList.remove("pn-roulette-ritual-live");
    }, 3800);
  }

  function bindSpinButtons(scope){
    (scope || document).querySelectorAll('.pn-r3-spin').forEach(button => {
      if (button.dataset.pnRouletteBound === '1') return;
      button.dataset.pnRouletteBound = '1';
      button.addEventListener('click', () => {
        const panel = button.closest('.pn-r3-panel');
        activateRitual(panel);
      });
    });
  }

  function syncResultState(){
    const zone = document.querySelector('.pn-r3-result-zone');
    if (!zone) return;

    const text = (zone.textContent || '').toUpperCase();
    zone.classList.remove('pn-result-save', 'pn-result-denied', 'pn-result-bet');

    if (text.includes('SAVE MONEY')) zone.classList.add('pn-result-save');
    else if (text.includes('FUCK OFF')) zone.classList.add('pn-result-denied');
    else if (text.includes('BET')) zone.classList.add('pn-result-bet');
  }

  function updateRouletteViewport(){
    cancelAnimationFrame(resizeFrame);

    resizeFrame = requestAnimationFrame(function(){
      const page = document.querySelector('.pn-r3-content');
      const body = document.body;

      if (!page) {
        body.classList.remove('pn-roulette-open', 'pn-roulette-compact', 'pn-roulette-tight');
        return;
      }

      body.classList.add('pn-roulette-open');

      const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      const grid = page.querySelector('.pn-r3-wheel-grid');
      const gridWidth = grid ? grid.getBoundingClientRect().width : page.getBoundingClientRect().width;
      const twoColumns = vw > 920;
      const panelWidth = twoColumns ? Math.max(260, (gridWidth - 16) / 2) : Math.max(260, gridWidth);

      const byWidth = panelWidth * 0.48;
      const byHeight = vh * 0.33;
      const wheel = clamp(182, Math.min(byWidth, byHeight, 360), 360);

      root.style.setProperty('--pn-roulette-wheel-size', wheel.toFixed(1) + 'px');
      body.classList.toggle('pn-roulette-compact', vh < 910);
      body.classList.toggle('pn-roulette-tight', vh < 760);

      bindSpinButtons(page);
      syncResultState();
    });
  }

  window.addEventListener('resize', updateRouletteViewport, { passive:true });

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(updateRouletteViewport);
    observer.observe(document.documentElement);
  }

  const mutation = new MutationObserver(() => {
    bindSpinButtons(document);
    syncResultState();
    updateRouletteViewport();
  });

  mutation.observe(document.body, { childList:true, subtree:true, characterData:true });
  bindSpinButtons(document);
  updateRouletteViewport();

  const style = document.createElement('style');
  style.textContent = `
  [data-route="roulette"]{
    position:relative;
    color:#d378ff !important;
  }

  body.pn-roulette-open{
    overflow-y:auto !important;
  }

  body.pn-roulette-open .pn-r3-content{
    position:relative;
    isolation:isolate;
    overflow-x:hidden !important;
    overflow-y:visible !important;
    min-width:0 !important;
    padding-bottom:clamp(16px,2vh,28px) !important;
    background:
      radial-gradient(circle at 50% 76%, rgba(255,32,74,.08), transparent 24%),
      radial-gradient(circle at 15% 14%, rgba(165,30,222,.12), transparent 26%),
      radial-gradient(circle at 85% 12%, rgba(255,28,91,.10), transparent 24%),
      linear-gradient(180deg, rgba(7,5,10,.12), rgba(8,5,11,.42)) !important;
  }

  body.pn-roulette-open .pn-r3-content:before{
    content:"";
    position:absolute;
    inset:0;
    z-index:-2;
    pointer-events:none;
    background:
      linear-gradient(90deg, transparent 0 9%, rgba(195,42,82,.05) 9.15%, transparent 9.3% 90.7%, rgba(165,72,226,.045) 90.85%, transparent 91%),
      radial-gradient(circle at 24% 54%, rgba(145,28,53,.08), transparent 18%),
      radial-gradient(circle at 74% 56%, rgba(116,42,160,.08), transparent 18%),
      repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.008) 4px),
      linear-gradient(180deg, rgba(255,255,255,.01), transparent 24%, transparent 74%, rgba(255,255,255,.008));
  }

  body.pn-roulette-open .pn-r3-content:after{
    content:"";
    position:absolute;
    inset:0;
    z-index:-1;
    pointer-events:none;
    opacity:.14;
    mix-blend-mode:screen;
    background:
      linear-gradient(90deg, transparent 0 30%, rgba(255,42,95,.06) 33%, transparent 36%, transparent 64%, rgba(154,62,220,.055) 67%, transparent 70%),
      repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,.015) 3px 4px);
    animation:pnRouletteScan 9s linear infinite;
  }

  .pn-roulette-blessing{
    position:relative;
    z-index:4;
    min-height:clamp(34px,4.7vh,46px);
    display:grid;
    grid-template-columns:1fr auto 1fr;
    align-items:center;
    gap:14px;
    padding:clamp(6px,.85vh,8px) clamp(12px,1.1vw,16px);
    margin-bottom:clamp(8px,1.25vh,14px);
    border:1px solid rgba(207,52,85,.58);
    background:
      repeating-linear-gradient(135deg, rgba(255,38,76,.04) 0 10px, transparent 10px 20px),
      linear-gradient(90deg, rgba(76,7,24,.72), rgba(28,9,35,.95) 45%, rgba(90,8,30,.72));
    box-shadow:
      inset 0 0 26px rgba(202,45,81,.07),
      0 0 26px rgba(111,21,142,.08);
  }

  .pn-roulette-blessing:before,
  .pn-roulette-blessing:after{
    content:"";
    position:absolute;
    top:0;
    width:56px;
    height:100%;
    pointer-events:none;
    opacity:.26;
    background:
      linear-gradient(180deg, rgba(255,255,255,.06), transparent 22%, transparent 78%, rgba(255,255,255,.03)),
      repeating-linear-gradient(90deg, rgba(255,255,255,.02) 0 2px, transparent 2px 8px);
  }

  .pn-roulette-blessing:before{ left:0; }
  .pn-roulette-blessing:after{ right:0; }

  .pn-roulette-blessing span{
    color:#8d788d;
    font-family:var(--mono);
    font-size:7px;
    font-weight:900;
    letter-spacing:.13em;
  }

  .pn-roulette-blessing span:last-child{
    text-align:right;
    color:#ab83bf;
  }

  .pn-roulette-blessing b{
    color:#ff92ab;
    font-family:var(--mono);
    font-size:11px;
    letter-spacing:.12em;
    text-shadow:
      1px 0 0 rgba(255,35,77,.50),
      -1px 0 0 rgba(167,67,235,.38),
      0 0 16px rgba(255,45,91,.16);
    animation:pnRouletteGlitch 6.9s steps(1,end) infinite;
  }

  body.pn-roulette-open .pn-r3-stats{
    position:relative;
    border-color:rgba(157,85,195,.55) !important;
    background:rgba(11,8,15,.86) !important;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
    box-shadow:inset 0 0 0 1px rgba(168,82,203,.04);
  }

  body.pn-roulette-open .pn-r3-stats:before{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    background:
      linear-gradient(90deg, transparent 0 46%, rgba(255,45,91,.035) 49%, transparent 52%),
      radial-gradient(circle at 18% 45%, rgba(255,35,82,.04), transparent 18%),
      radial-gradient(circle at 82% 38%, rgba(161,77,225,.05), transparent 20%);
  }

  body.pn-roulette-open .pn-r3-stats > div{
    min-height:clamp(72px,9.4vh,108px) !important;
    padding:clamp(10px,1.4vh,16px) clamp(14px,1.2vw,20px) !important;
  }

  body.pn-roulette-open .pn-r3-stats b{
    font-size:clamp(18px,2vw,27px) !important;
  }

  body.pn-roulette-open .pn-r3-net b{
    font-size:clamp(28px,3vw,45px) !important;
  }

  .pn-r3-net b.pos{
    color:var(--green) !important;
    text-shadow:0 0 24px rgba(42,230,132,.19);
  }

  .pn-r3-net b.neg{
    color:var(--red) !important;
    text-shadow:0 0 25px rgba(255,52,78,.22);
    animation:pnRouletteDamage 3.8s steps(1,end) infinite;
  }

  .pn-r3-net b.zero{
    color:#c36cf1 !important;
    text-shadow:0 0 22px rgba(196,81,239,.18);
  }

  body.pn-roulette-open .pn-r3-stage-strip{
    position:relative;
    border-color:rgba(157,85,195,.50) !important;
    background:rgba(8,6,11,.90) !important;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
    overflow:visible !important;
  }

  body.pn-roulette-open .pn-r3-stage-strip:after{
    content:"";
    position:absolute;
    left:25%;
    right:25%;
    bottom:-18px;
    height:22px;
    pointer-events:none;
    background:
      linear-gradient(90deg,
        transparent 0,
        transparent calc(25% - 1px), rgba(193,74,241,.34) calc(25% - 1px), rgba(193,74,241,.34) 25%,
        transparent 25%, transparent calc(75% - 1px), rgba(193,74,241,.34) calc(75% - 1px), rgba(193,74,241,.34) 75%,
        transparent 75%, transparent 100%),
      linear-gradient(180deg, rgba(193,74,241,.34), transparent 78%);
    opacity:.45;
  }

  body.pn-roulette-open .pn-r3-stage-strip > div{
    min-height:clamp(30px,4.1vh,42px) !important;
    padding:clamp(5px,.75vh,8px) clamp(8px,.82vw,11px) !important;
  }

  body.pn-roulette-open .pn-r3-stage-strip .current{
    background:linear-gradient(90deg, rgba(117,28,155,.24), rgba(82,16,105,.08)) !important;
    box-shadow:inset 0 -2px 0 rgba(205,66,255,.75), inset 0 0 18px rgba(172,52,230,.10);
  }

  body.pn-roulette-open .pn-r3-tabs,
  body.pn-roulette-open .pn-r3-controls,
  body.pn-roulette-open .pn-r3-wheel-grid,
  body.pn-roulette-open .pn-r3-result-zone{
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-tabs button{
    padding:clamp(7px,.9vh,10px) clamp(10px,1vw,16px) !important;
  }

  body.pn-roulette-open .pn-r3-controls input,
  body.pn-roulette-open .pn-r3-controls select,
  body.pn-roulette-open .pn-r3-result-form input,
  body.pn-roulette-open .pn-r3-result-form select{
    min-height:clamp(34px,4.2vh,40px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-grid{
    position:relative;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
    gap:clamp(10px,1vw,16px) !important;
    align-items:stretch;
    min-width:0;
  }

  body.pn-roulette-open .pn-r3-panel{
    position:relative;
    overflow:hidden;
    min-width:0;
    border-color:rgba(166,85,205,.56) !important;
    background:
      linear-gradient(180deg, rgba(18,12,23,.94), rgba(12,8,16,.86)),
      linear-gradient(90deg, rgba(255,35,83,.02), transparent 22%, transparent 78%, rgba(163,79,226,.02)) !important;
    box-shadow:
      inset 0 0 0 1px rgba(160,70,205,.03),
      inset 0 0 42px rgba(255,0,72,.03),
      0 14px 34px rgba(0,0,0,.16);
    transition:opacity .25s ease, filter .25s ease, border-color .25s ease, box-shadow .25s ease, transform .25s ease;
  }

  body.pn-roulette-open .pn-r3-panel:before{
    content:"";
    position:absolute;
    z-index:1;
    pointer-events:none;
    left:0;
    top:0;
    width:34px;
    height:34px;
    border-left:2px solid rgba(255,53,96,.56);
    border-top:2px solid rgba(255,53,96,.56);
  }

  body.pn-roulette-open .pn-r3-panel:after{
    content:"";
    position:absolute;
    inset:0;
    z-index:0;
    pointer-events:none;
    opacity:.18;
    background:
      radial-gradient(circle at 50% 58%, rgba(255,37,79,.10), transparent 24%),
      linear-gradient(90deg, transparent 0 8%, rgba(255,255,255,.01) 8.2%, transparent 8.4% 91.5%, rgba(255,255,255,.01) 91.7%, transparent 91.9%),
      repeating-linear-gradient(0deg, transparent 0 15px, rgba(255,255,255,.008) 15px 16px);
  }

  body.pn-roulette-open .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-stage:before,
  body.pn-roulette-open .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-stage:before{
    content:"";
    position:absolute;
    inset:8% 6% 16% 6%;
    z-index:0;
    pointer-events:none;
    border-radius:24px;
    opacity:.22;
  }

  body.pn-roulette-open .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-stage:before{
    background:
      radial-gradient(circle at 50% 50%, rgba(255,38,82,.10), transparent 32%),
      conic-gradient(from 0deg, rgba(255,58,92,.09), transparent 18%, transparent 42%, rgba(177,67,236,.06) 48%, transparent 62%, transparent 100%),
      radial-gradient(circle at 18% 52%, rgba(255,43,85,.08), transparent 12%),
      radial-gradient(circle at 82% 52%, rgba(155,67,214,.08), transparent 12%);
  }

  body.pn-roulette-open .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-stage:before{
    background:
      radial-gradient(circle at 50% 50%, rgba(170,70,230,.08), transparent 30%),
      conic-gradient(from 0deg, rgba(255,58,92,.07), transparent 14%, transparent 38%, rgba(177,67,236,.08) 45%, transparent 60%, transparent 100%),
      radial-gradient(circle at 16% 56%, rgba(177,67,236,.09), transparent 12%),
      radial-gradient(circle at 84% 38%, rgba(255,43,85,.07), transparent 11%);
  }

  .pn-roulette-core-head{
    position:relative;
    z-index:3;
    min-height:40px !important;
    background:
      linear-gradient(90deg, rgba(39,8,27,.22), rgba(10,7,14,.72)),
      repeating-linear-gradient(90deg, transparent 0 42px, rgba(173,60,205,.025) 42px 43px) !important;
    border-bottom:1px solid rgba(147,92,193,.44) !important;
  }

  .pn-roulette-core-head h2{
    display:flex;
    align-items:center;
    gap:9px;
  }

  .pn-roulette-core-head h2 span{
    color:#ff667f;
    font-family:var(--mono);
    font-size:8px;
    letter-spacing:.08em;
  }

  body.pn-roulette-open .pn-r3-panel:not(.pn-r3-dormant):not(.pn-r3-locked-wheel){
    border-color:rgba(198,72,247,.72) !important;
    box-shadow:
      inset 0 0 0 1px rgba(188,75,234,.04),
      inset 0 0 48px rgba(255,0,72,.03),
      0 0 36px rgba(153,48,194,.11);
  }

  body.pn-roulette-open .pn-r3-dormant{
    opacity:.64 !important;
    filter:saturate(.68) brightness(.86) !important;
  }

  body.pn-roulette-open .pn-r3-locked-wheel{
    opacity:.56 !important;
    filter:saturate(.74) brightness(.84) !important;
  }

  body.pn-roulette-open .pn-r3-spin-active{
    border-color:rgba(255,76,118,.82) !important;
    box-shadow:
      inset 0 0 0 1px rgba(255,110,154,.08),
      inset 0 0 60px rgba(255,0,72,.06),
      0 0 42px rgba(255,43,88,.18);
    transform:translateY(-1px);
  }

  body.pn-roulette-open .pn-r3-stage{
    position:relative;
    z-index:2;
    min-height:calc(var(--pn-roulette-wheel-size,320px) + 78px) !important;
    height:auto !important;
    padding-top:clamp(8px,1.2vh,12px) !important;
    padding-bottom:clamp(8px,1.2vh,12px) !important;
    gap:clamp(7px,1vh,10px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-shell{
    position:relative;
    z-index:2;
    width:var(--pn-roulette-wheel-size,320px) !important;
    max-width:calc(100% - 26px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-shell:before,
  body.pn-roulette-open .pn-r3-wheel-shell:after{
    content:"";
    position:absolute;
    pointer-events:none;
    border-radius:50%;
  }

  body.pn-roulette-open .pn-r3-wheel-shell:before{
    inset:-18px;
    background:
      repeating-conic-gradient(
        from 0deg,
        rgba(255,255,255,.10) 0deg 1.8deg,
        rgba(66,45,75,.90) 1.8deg 9deg,
        rgba(160,65,205,.08) 9deg 10deg,
        rgba(38,28,46,.96) 10deg 18deg
      );
    -webkit-mask:radial-gradient(circle, transparent 0 79%, #000 79% 92%, transparent 92%);
    mask:radial-gradient(circle, transparent 0 79%, #000 79% 92%, transparent 92%);
    box-shadow:0 0 24px rgba(196,81,239,.12);
    animation:pnCogIdle 28s linear infinite;
  }

  body.pn-roulette-open .pn-r3-wheel-shell:after{
    inset:-30px;
    background:
      conic-gradient(
        transparent 0 34deg,
        rgba(255,54,90,.36) 34deg 38deg,
        transparent 38deg 118deg,
        rgba(173,67,232,.30) 118deg 123deg,
        transparent 123deg 198deg,
        rgba(255,54,90,.30) 198deg 202deg,
        transparent 202deg 284deg,
        rgba(173,67,232,.25) 284deg 288deg,
        transparent 288deg 360deg
      );
    -webkit-mask:radial-gradient(circle, transparent 0 92%, #000 92% 94.5%, transparent 94.5%);
    mask:radial-gradient(circle, transparent 0 92%, #000 92% 94.5%, transparent 94.5%);
    opacity:.74;
    animation:pnHaloCounter 18s linear infinite;
  }

  body.pn-roulette-open .pn-r3-spin-active .pn-r3-wheel-shell:before,
  body.pn-roulette-ritual-live .pn-r3-wheel-shell:before{
    animation-duration:4.8s;
  }

  body.pn-roulette-open .pn-r3-spin-active .pn-r3-wheel-shell:after,
  body.pn-roulette-ritual-live .pn-r3-wheel-shell:after{
    animation-duration:2.8s;
    opacity:.92;
  }

  body.pn-roulette-open .pn-r3-wheel{
    position:relative;
    border-color:rgba(197,94,231,.86) !important;
    box-shadow:
      0 0 0 2px rgba(25,17,31,.98),
      0 0 0 5px rgba(118,44,140,.17),
      0 0 42px rgba(156,42,193,.18),
      inset 0 0 54px rgba(0,0,0,.68) !important;
    overflow:hidden;
  }

  body.pn-roulette-open .pn-r3-wheel:before{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    border-radius:50%;
    background:
      radial-gradient(circle at 32% 26%, rgba(255,255,255,.12), transparent 20%),
      radial-gradient(circle at 68% 72%, rgba(0,0,0,.24), transparent 24%),
      repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.02) 0 2px, transparent 2px 11px),
      linear-gradient(145deg, rgba(255,255,255,.03), transparent 18%, transparent 82%, rgba(255,255,255,.02));
    mix-blend-mode:screen;
    opacity:.65;
  }

  body.pn-roulette-open .pn-r3-wheel:after{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    border-radius:50%;
    background:
      conic-gradient(
        from 0deg,
        rgba(255,255,255,.00) 0deg,
        rgba(255,255,255,.13) 0.7deg,
        rgba(255,255,255,.00) 1.4deg,
        rgba(255,255,255,.00) 119deg,
        rgba(255,255,255,.13) 119.7deg,
        rgba(255,255,255,.00) 120.4deg,
        rgba(255,255,255,.00) 239deg,
        rgba(255,255,255,.13) 239.7deg,
        rgba(255,255,255,.00) 240.4deg,
        rgba(255,255,255,.00) 360deg
      );
    opacity:.30;
  }

  .pn-r3-wager-wheel:after{
    background:
      conic-gradient(
        from 0deg,
        rgba(255,255,255,.00) 0deg,
        rgba(255,255,255,.13) 0.7deg,
        rgba(255,255,255,.00) 1.4deg,
        rgba(255,255,255,.00) 50.4deg,
        rgba(255,255,255,.13) 51deg,
        rgba(255,255,255,.00) 51.6deg,
        rgba(255,255,255,.00) 101.8deg,
        rgba(255,255,255,.13) 102.4deg,
        rgba(255,255,255,.00) 103deg,
        rgba(255,255,255,.00) 153.1deg,
        rgba(255,255,255,.13) 153.7deg,
        rgba(255,255,255,.00) 154.3deg,
        rgba(255,255,255,.00) 204.5deg,
        rgba(255,255,255,.13) 205.1deg,
        rgba(255,255,255,.00) 205.7deg,
        rgba(255,255,255,.00) 256deg,
        rgba(255,255,255,.13) 256.6deg,
        rgba(255,255,255,.00) 257.2deg,
        rgba(255,255,255,.00) 307.4deg,
        rgba(255,255,255,.13) 308deg,
        rgba(255,255,255,.00) 308.6deg,
        rgba(255,255,255,.00) 360deg
      ) !important;
  }

  body.pn-roulette-open .pn-r3-pointer{
    z-index:9 !important;
    top:-8px !important;
    border-left-width:12px !important;
    border-right-width:12px !important;
    border-bottom-width:30px !important;
    border-bottom-color:#f7e8ff !important;
    filter:drop-shadow(0 0 7px rgba(222,144,255,.60)) drop-shadow(0 6px 10px rgba(255,35,83,.22)) !important;
  }

  body.pn-roulette-open .pn-r3-pointer:before{
    content:"";
    position:absolute;
    left:-15px;
    top:-16px;
    width:30px;
    height:20px;
    border-radius:7px 7px 2px 2px;
    background:linear-gradient(180deg, rgba(96,91,102,.95), rgba(34,29,40,.98));
    border:1px solid rgba(213,177,228,.28);
    box-shadow:0 0 0 2px rgba(17,13,21,.9), 0 4px 10px rgba(0,0,0,.32);
  }

  body.pn-roulette-open .pn-r3-pointer:after{
    content:"";
    position:absolute;
    width:6px;
    height:6px;
    border-radius:50%;
    left:-3px;
    top:-10px;
    background:#ff315f;
    box-shadow:0 0 10px rgba(255,49,95,.86), 0 0 18px rgba(255,49,95,.54);
    animation:pnLampPulse 2.6s ease-in-out infinite;
  }

  body.pn-roulette-open .pn-r3-spin-active .pn-r3-pointer:after,
  body.pn-roulette-ritual-live .pn-r3-pointer:after{
    animation-duration:.55s;
    box-shadow:0 0 12px rgba(255,49,95,.96), 0 0 22px rgba(255,49,95,.74);
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label,
  .pn-r3-wager-wheel .pn-r3-wheel-label{
    position:absolute !important;
    z-index:4 !important;
    margin:0 !important;
    padding:0 2px !important;
    transform-origin:center center !important;
    transform:translate(-50%, -50%) rotate(var(--neg-r)) !important;
    text-align:center !important;
    white-space:nowrap !important;
    pointer-events:none !important;
    font-weight:900 !important;
    text-shadow:0 1px 3px rgba(0,0,0,.98), 0 0 6px rgba(255,255,255,.08) !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label{
    width:30% !important;
    max-width:30% !important;
    font-size:8.6px !important;
    line-height:1 !important;
    letter-spacing:.01em !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(1){left:76.85% !important;top:34.50% !important}
  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(2){left:50.00% !important;top:81.00% !important}
  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(3){left:23.15% !important;top:34.50% !important}

  .pn-r3-wager-wheel .pn-r3-wheel-label{
    width:22% !important;
    max-width:22% !important;
    font-size:7.2px !important;
    line-height:1 !important;
    letter-spacing:.015em !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(1){left:64.75% !important;top:19.37% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(2){left:83.15% !important;top:42.43% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(3){left:76.58% !important;top:71.20% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(4){left:50.00% !important;top:84.00% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(5){left:23.42% !important;top:71.20% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(6){left:16.85% !important;top:42.43% !important}
  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(7){left:35.25% !important;top:19.37% !important}

  body.pn-roulette-open .pn-r3-core{
    z-index:6 !important;
    width:62px !important;
    height:62px !important;
    background:
      radial-gradient(circle at 50% 50%, rgba(149,41,177,.72) 0 12%, rgba(45,17,54,.98) 13% 40%, rgba(12,8,16,.98) 41% 100%) !important;
    border:2px solid rgba(219,134,255,.84) !important;
    box-shadow:
      0 0 0 8px rgba(10,7,14,.30),
      0 0 28px rgba(181,55,227,.24),
      inset 0 0 12px rgba(255,255,255,.04) !important;
  }

  body.pn-roulette-open .pn-r3-core:before{
    content:"";
    position:absolute;
    inset:6px;
    border-radius:50%;
    pointer-events:none;
    background:
      radial-gradient(circle at 50% 50%, rgba(255,92,124,.34), transparent 38%),
      repeating-conic-gradient(from 0deg, rgba(255,255,255,.08) 0deg 5deg, transparent 5deg 45deg);
    opacity:.62;
  }

  body.pn-roulette-open .pn-r3-core:after{
    content:"";
    position:absolute;
    width:8px;
    height:8px;
    border-radius:50%;
    left:50%;
    top:50%;
    transform:translate(-50%, -50%);
    box-shadow:
      -19px -19px 0 0 rgba(122,113,135,.78),
      19px -19px 0 0 rgba(122,113,135,.78),
      19px 19px 0 0 rgba(122,113,135,.78),
      -19px 19px 0 0 rgba(122,113,135,.78);
    background:rgba(122,113,135,.78);
  }

  body.pn-roulette-open .pn-r3-spin{
    position:relative;
    min-width:clamp(182px,34%,238px) !important;
    min-height:clamp(36px,4.6vh,44px) !important;
    letter-spacing:.055em;
    overflow:hidden;
  }

  body.pn-roulette-open .pn-r3-spin:not(:disabled){
    background:linear-gradient(100deg, rgba(126,31,165,.98), rgba(181,56,236,.96)) !important;
    border-color:rgba(221,110,255,.66) !important;
    box-shadow:0 0 22px rgba(173,58,218,.18) !important;
  }

  body.pn-roulette-open .pn-r3-spin:not(:disabled):before{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    background:linear-gradient(110deg, transparent 0 42%, rgba(255,255,255,.14) 48%, transparent 54% 100%);
    transform:translateX(-110%);
  }

  body.pn-roulette-open .pn-r3-spin:not(:disabled):hover:before{
    animation:pnButtonSweep .9s ease;
  }

  body.pn-roulette-open .pn-r3-result-zone{
    position:relative;
    overflow:hidden;
    min-height:clamp(78px,10vh,106px) !important;
    padding:clamp(12px,1.3vh,16px) !important;
    border-color:rgba(177,83,216,.58) !important;
    background:
      linear-gradient(100deg, rgba(50,9,63,.24), rgba(10,7,14,.94) 54%),
      radial-gradient(circle at 50% 110%, rgba(255,35,82,.12), transparent 30%) !important;
    box-shadow:inset 4px 0 0 rgba(193,65,240,.24), inset 0 0 42px rgba(255,0,72,.03);
  }

  body.pn-roulette-open .pn-r3-result-zone:before{
    content:"";
    position:absolute;
    width:110px;
    height:110px;
    right:calc(50% - 55px);
    bottom:-54px;
    pointer-events:none;
    border-radius:50%;
    opacity:.26;
    background:
      repeating-conic-gradient(from 0deg, rgba(255,53,96,.16) 0deg 5deg, transparent 5deg 18deg),
      radial-gradient(circle at 50% 50%, rgba(177,67,236,.20), transparent 62%);
    -webkit-mask:radial-gradient(circle, transparent 0 42%, #000 42% 78%, transparent 78%);
    mask:radial-gradient(circle, transparent 0 42%, #000 42% 78%, transparent 78%);
  }

  body.pn-roulette-open .pn-r3-result-zone:after{
    content:"MACHINE SPIRIT OBSERVING";
    position:absolute;
    right:12px;
    bottom:8px;
    color:rgba(166,102,183,.24);
    font-family:var(--mono);
    font-size:6.5px;
    font-weight:900;
    letter-spacing:.13em;
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-save{
    box-shadow:inset 4px 0 0 rgba(68,205,126,.28), inset 0 0 42px rgba(68,205,126,.03);
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-save h2,
  body.pn-roulette-open .pn-r3-result-zone.pn-result-save strong{
    color:#7df0ae !important;
    text-shadow:0 0 16px rgba(68,205,126,.18);
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-denied{
    box-shadow:inset 4px 0 0 rgba(255,67,96,.34), inset 0 0 42px rgba(255,67,96,.05);
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-denied h2,
  body.pn-roulette-open .pn-r3-result-zone.pn-result-denied strong{
    color:#ffd4de !important;
    text-shadow:1px 0 0 rgba(255,55,95,.35), -1px 0 0 rgba(164,73,224,.22), 0 0 12px rgba(255,55,95,.12);
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-bet{
    box-shadow:inset 4px 0 0 rgba(194,84,241,.32), inset 0 0 42px rgba(194,84,241,.05);
  }

  body.pn-roulette-open .pn-r3-result-zone.pn-result-bet h2,
  body.pn-roulette-open .pn-r3-result-zone.pn-result-bet strong{
    color:#f1a8ff !important;
    text-shadow:0 0 16px rgba(194,84,241,.20);
  }

  body.pn-roulette-open .pn-r3-commit{
    background:linear-gradient(100deg, #9b1b45, #8b239d) !important;
    border-color:#d9438c !important;
    color:#fff !important;
    box-shadow:0 0 22px rgba(227,50,111,.20) !important;
    animation:pnCommitPulse 2.9s ease-in-out infinite;
  }

  body.pn-roulette-compact .pn-roulette-blessing b{font-size:9px}
  body.pn-roulette-compact .pn-roulette-blessing span{font-size:6.2px}
  body.pn-roulette-compact .pn-r3-stage{min-height:calc(var(--pn-roulette-wheel-size,270px) + 66px) !important}

  body.pn-roulette-tight .pn-roulette-blessing{
    min-height:28px;
    padding:4px 9px;
  }

  body.pn-roulette-tight .pn-roulette-blessing b{font-size:8px}
  body.pn-roulette-tight .pn-roulette-blessing span{font-size:5.6px}
  body.pn-roulette-tight .pn-r3-stats > div{min-height:54px !important; padding:7px 11px !important}
  body.pn-roulette-tight .pn-r3-stage-strip > div{min-height:26px !important; padding:4px 6px !important}
  body.pn-roulette-tight .pn-r3-stage-strip b{font-size:6.6px !important}
  body.pn-roulette-tight .pn-r3-tabs button{padding:6px 10px !important; min-width:115px !important}
  body.pn-roulette-tight .pn-r3-stage{min-height:calc(var(--pn-roulette-wheel-size,220px) + 56px) !important}
  body.pn-roulette-tight .pn-r3-result-zone{min-height:62px !important}

  @media (max-width: 920px){
    body.pn-roulette-open .pn-r3-wheel-grid{
      grid-template-columns:1fr !important;
    }

    body.pn-roulette-open .pn-r3-controls{
      grid-template-columns:minmax(0,1fr) minmax(120px,180px) !important;
    }

    body.pn-roulette-open .pn-r3-wheel-shell{
      max-width:min(78vw, 360px) !important;
    }
  }

  @media (max-width: 700px){
    .pn-roulette-blessing{
      grid-template-columns:1fr;
      text-align:left;
    }

    .pn-roulette-blessing span:last-child{
      text-align:left;
    }

    body.pn-roulette-open .pn-r3-stats,
    body.pn-roulette-open .pn-r3-controls{
      grid-template-columns:1fr !important;
    }

    body.pn-roulette-open .pn-r3-stats > div{
      border-right:0 !important;
      border-bottom:1px solid rgba(147,92,193,.45);
    }

    body.pn-roulette-open .pn-r3-stats > div:last-child{
      border-bottom:0;
    }

    body.pn-roulette-open .pn-r3-stage-strip{
      grid-template-columns:repeat(2, minmax(0,1fr)) !important;
    }

    body.pn-roulette-open .pn-r3-result-zone{
      flex-direction:column !important;
      align-items:flex-start !important;
    }
  }

  @keyframes pnRouletteScan{
    0%{transform:translateY(-3px)}
    50%{transform:translateY(3px)}
    100%{transform:translateY(-3px)}
  }

  @keyframes pnRouletteGlitch{
    0%, 87%, 100%{transform:translateX(0);filter:none}
    88%{transform:translateX(1px);filter:brightness(1.25)}
    89%{transform:translateX(-2px)}
    90%{transform:translateX(1px)}
    91%{transform:translateX(0)}
  }

  @keyframes pnRouletteDamage{
    0%,82%,100%{opacity:1;transform:translateX(0)}
    83%{opacity:.72;transform:translateX(1px)}
    84%{opacity:1;transform:translateX(-1px)}
    85%{transform:translateX(0)}
  }

  @keyframes pnCogIdle{ to{ transform:rotate(360deg) } }
  @keyframes pnHaloCounter{ to{ transform:rotate(-360deg) } }

  @keyframes pnLampPulse{
    0%,100%{opacity:.82; transform:scale(1)}
    50%{opacity:1; transform:scale(1.08)}
  }

  @keyframes pnButtonSweep{
    from{ transform:translateX(-110%) }
    to{ transform:translateX(110%) }
  }

  @keyframes pnCommitPulse{
    0%,100%{filter:brightness(1)}
    50%{filter:brightness(1.08)}
  }
  `;

  document.head.appendChild(style);
})();
