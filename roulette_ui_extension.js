"use strict";

/*
  PROFITNODE THE ROULETTE - CANONICAL UI v7

  One visual system. One responsive system. One label system.
  The Roulette core remains responsible for state, spinning and accounting.
*/

(function installCanonicalRouletteUI(){
  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(row=>row.key==="roulette");

    if (route && typeof route.render==="function" && !route.__pnCanonicalUIWrapped){
      const previous = route.render;

      route.render = function(){
        let html = previous.apply(this,arguments);

        /* Remove the redundant internal title bar. The page header already names the node. */
        html = html.replace(
          /<div class="pn-r3-header">[\s\S]*?<\/div>/,
          ""
        );

        /* One ceremonial banner only. */
        const contentMarker = '<div class="content pn-r3-content">';
        const blessing =
          '<div class="pn-roulette-blessing" aria-hidden="true">'+
            '<span>MACHINE SPIRIT AWAKE</span>'+
            '<b>OMNISSIAH BLESS THIS WAGER</b>'+
            '<span>RNG SANCTIFIED // LIABILITY DENIED</span>'+
          '</div>';

        if (html.includes(contentMarker)){
          html = html.replace(contentMarker,contentMarker+blessing);
        }

        /* One name per wheel. No duplicated "wheel / core / state" labels. */
        html = html.replace(
          '<div class="panel-head"><h2>WHEEL #1</h2><span class="pn-r3-state">THE JUDGEMENT</span></div>',
          '<div class="panel-head pn-roulette-core-head"><h2><span>01</span> JUDGEMENT CORE</h2></div>'
        );

        html = html.replace(
          '<div class="panel-head"><h2>WHEEL #2</h2><span class="pn-r3-state">THE WAGER</span></div>',
          '<div class="panel-head pn-roulette-core-head"><h2><span>02</span> WAGER CORE</h2></div>'
        );

        /* The wheels already contain these words. The result panel explains the split. */
        html = html.replace(
          /<div class="pn-r3-legend">[\s\S]*?<\/div>/g,
          ""
        );

        html = html.replace(
          /<div class="pn-r3-protocol-key">[\s\S]*?<\/div>/g,
          ""
        );

        return html;
      };

      route.__pnCanonicalUIWrapped = true;
    }
  }

  const root = document.documentElement;
  let resizeFrame = 0;

  function clamp(min,value,max){
    return Math.max(min,Math.min(value,max));
  }

  function updateRouletteViewport(){
    cancelAnimationFrame(resizeFrame);

    resizeFrame = requestAnimationFrame(function(){
      const page = document.querySelector(".pn-r3-content");
      const body = document.body;

      if (!page){
        body.classList.remove("pn-roulette-open","pn-roulette-compact","pn-roulette-tight");
        return;
      }

      body.classList.add("pn-roulette-open");

      const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      const grid = page.querySelector(".pn-r3-wheel-grid");
      const gridWidth = grid ? grid.getBoundingClientRect().width : page.getBoundingClientRect().width;
      const twoColumns = vw > 880;
      const panelWidth = twoColumns ? Math.max(260,(gridWidth-16)/2) : Math.max(260,gridWidth);

      const byWidth = panelWidth * 0.50;
      const byHeight = vh * 0.32;
      const wheel = clamp(178,Math.min(byWidth,byHeight,310),310);

      root.style.setProperty("--pn-roulette-wheel-size",wheel.toFixed(1)+"px");
      body.classList.toggle("pn-roulette-compact",vh < 900);
      body.classList.toggle("pn-roulette-tight",vh < 730);
    });
  }

  window.addEventListener("resize",updateRouletteViewport,{passive:true});

  if (window.ResizeObserver){
    const observer = new ResizeObserver(updateRouletteViewport);
    observer.observe(document.documentElement);
  }

  const mutation = new MutationObserver(updateRouletteViewport);
  mutation.observe(document.body,{childList:true,subtree:true});
  updateRouletteViewport();

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

  body.pn-roulette-open{
    overflow-y:auto !important;
  }

  body.pn-roulette-open .pn-r3-content{
    position:relative;
    isolation:isolate;
    overflow-x:hidden !important;
    overflow-y:visible !important;
    min-width:0 !important;
    padding-bottom:clamp(14px,2vh,26px) !important;
    background:
      radial-gradient(circle at 50% 32%,rgba(141,23,52,.09),transparent 24%),
      radial-gradient(circle at 10% 16%,rgba(135,0,44,.13),transparent 26%),
      radial-gradient(circle at 88% 12%,rgba(93,19,151,.15),transparent 30%),
      linear-gradient(180deg,rgba(8,5,11,.06),rgba(8,5,11,.38)) !important;
  }

  body.pn-roulette-open .pn-r3-content:before{
    content:"";
    position:absolute;
    inset:0;
    z-index:-1;
    pointer-events:none;
    background:
      linear-gradient(90deg,transparent 0 11%,rgba(169,38,76,.03) 11.15%,transparent 11.3% 88%,rgba(126,45,162,.03) 88.15%,transparent 88.3%),
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.008) 4px);
  }

  body.pn-roulette-open .pn-r3-content:after{
    content:"";
    position:absolute;
    inset:0;
    z-index:20;
    pointer-events:none;
    opacity:.12;
    mix-blend-mode:screen;
    background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.017) 4px);
    animation:pnCanonicalScan 8s linear infinite;
  }

  .pn-roulette-blessing{
    position:relative;
    z-index:4;
    min-height:clamp(32px,4.5vh,42px);
    display:grid;
    grid-template-columns:1fr auto 1fr;
    align-items:center;
    gap:14px;
    padding:
      clamp(5px,.8vh,7px)
      clamp(10px,1vw,14px);
    margin-bottom:clamp(8px,1.2vh,14px);
    border:1px solid rgba(196,53,86,.55);
    background:
      repeating-linear-gradient(135deg,rgba(255,40,73,.04) 0 9px,transparent 9px 18px),
      linear-gradient(90deg,rgba(71,7,21,.60),rgba(25,8,31,.94) 44%,rgba(76,8,27,.58));
    box-shadow:
      inset 0 0 22px rgba(202,45,81,.055),
      0 0 24px rgba(111,21,142,.065);
  }

  .pn-roulette-blessing span{
    color:#8d788d;
    font-family:var(--mono);
    font-size:7px;
    font-weight:900;
    letter-spacing:.13em;
  }

  .pn-roulette-blessing span:last-child{
    text-align:right;
    color:#a97bbd;
  }

  .pn-roulette-blessing b{
    color:#ff90aa;
    font-family:var(--mono);
    font-size:11px;
    letter-spacing:.11em;
    text-shadow:
      1px 0 0 rgba(255,35,77,.50),
      -1px 0 0 rgba(167,67,235,.38),
      0 0 14px rgba(255,45,91,.15);
    animation:pnCanonicalGlitch 6.8s steps(1,end) infinite;
  }

  body.pn-roulette-open .pn-r3-stats{
    border-color:rgba(157,85,195,.52) !important;
    background:rgba(11,8,15,.84) !important;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-stats>div{
    min-height:clamp(64px,8.8vh,96px) !important;
    padding:
      clamp(9px,1.35vh,15px)
      clamp(12px,1.2vw,20px) !important;
  }

  body.pn-roulette-open .pn-r3-stats b{
    font-size:clamp(18px,2vw,25px) !important;
  }

  body.pn-roulette-open .pn-r3-net b{
    font-size:clamp(26px,3vw,42px) !important;
  }

  .pn-r3-net b.pos{
    color:var(--green) !important;
    text-shadow:0 0 24px rgba(42,230,132,.17);
  }

  .pn-r3-net b.neg{
    color:var(--red) !important;
    text-shadow:0 0 25px rgba(255,52,78,.20);
    animation:pnCanonicalDamage 3.8s steps(1,end) infinite;
  }

  .pn-r3-net b.zero{
    color:#c36cf1 !important;
    text-shadow:0 0 22px rgba(196,81,239,.16);
  }

  body.pn-roulette-open .pn-r3-stage-strip{
    border-color:rgba(157,85,195,.48) !important;
    background:rgba(8,6,11,.88) !important;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-stage-strip>div{
    min-height:clamp(29px,4vh,40px) !important;
    padding:
      clamp(5px,.75vh,8px)
      clamp(7px,.8vw,11px) !important;
  }

  body.pn-roulette-open .pn-r3-stage-strip .current{
    background:linear-gradient(90deg,rgba(117,28,155,.23),rgba(82,16,105,.08)) !important;
    box-shadow:inset 0 -2px 0 rgba(205,66,255,.72);
  }

  body.pn-roulette-open .pn-r3-tabs{
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-tabs button{
    padding:
      clamp(7px,.9vh,10px)
      clamp(10px,1vw,16px) !important;
  }

  body.pn-roulette-open .pn-r3-controls{
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-controls input,
  body.pn-roulette-open .pn-r3-controls select,
  body.pn-roulette-open .pn-r3-result-form input,
  body.pn-roulette-open .pn-r3-result-form select{
    min-height:clamp(32px,4vh,38px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-grid{
    grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
    gap:clamp(9px,1vw,16px) !important;
    align-items:stretch;
    min-width:0;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-panel{
    position:relative;
    overflow:hidden;
    min-width:0;
    border-color:rgba(163,85,203,.53) !important;
    background:rgba(12,9,16,.84) !important;
    box-shadow:
      inset 0 0 0 1px rgba(160,70,205,.025),
      0 12px 30px rgba(0,0,0,.12);
    transition:opacity .25s ease,filter .25s ease,border-color .25s ease,box-shadow .25s ease;
  }

  body.pn-roulette-open .pn-r3-panel:before{
    content:"";
    position:absolute;
    z-index:3;
    pointer-events:none;
    left:0;
    top:0;
    width:28px;
    height:28px;
    border-left:2px solid rgba(255,53,96,.48);
    border-top:2px solid rgba(255,53,96,.48);
  }

  .pn-roulette-core-head{
    min-height:38px !important;
    background:
      linear-gradient(90deg,rgba(39,8,27,.18),rgba(10,7,14,.68)),
      repeating-linear-gradient(90deg,transparent 0 42px,rgba(173,60,205,.025) 42px 43px) !important;
    border-bottom:1px solid rgba(147,92,193,.42) !important;
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
    border-color:rgba(194,72,247,.68) !important;
    box-shadow:
      inset 0 0 0 1px rgba(188,75,234,.035),
      0 0 34px rgba(153,48,194,.10);
  }

  body.pn-roulette-open .pn-r3-dormant{
    opacity:.62 !important;
    filter:saturate(.68) brightness(.86) !important;
  }

  body.pn-roulette-open .pn-r3-locked-wheel{
    opacity:.54 !important;
    filter:saturate(.72) brightness(.82) !important;
  }

  body.pn-roulette-open .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,300px) + 72px) !important;
    height:auto !important;
    padding-top:clamp(8px,1.25vh,13px) !important;
    padding-bottom:clamp(8px,1.25vh,13px) !important;
    gap:clamp(7px,1vh,10px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-shell{
    width:var(--pn-roulette-wheel-size,300px) !important;
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
    inset:-12px;
    background:repeating-conic-gradient(from 0deg,rgba(199,74,235,.27) 0deg 2deg,transparent 2deg 8deg);
    -webkit-mask:radial-gradient(circle,transparent 0 88%,#000 88% 91%,transparent 91%);
    mask:radial-gradient(circle,transparent 0 88%,#000 88% 91%,transparent 91%);
    animation:pnCanonicalSigil 24s linear infinite;
    opacity:.50;
  }

  body.pn-roulette-open .pn-r3-wheel-shell:after{
    inset:-21px;
    background:
      conic-gradient(
        transparent 0 36deg,
        rgba(255,52,88,.34) 36deg 42deg,
        transparent 42deg 126deg,
        rgba(169,67,228,.27) 126deg 132deg,
        transparent 132deg 216deg,
        rgba(255,52,88,.27) 216deg 222deg,
        transparent 222deg 306deg,
        rgba(169,67,228,.23) 306deg 312deg,
        transparent 312deg 360deg
      );
    -webkit-mask:radial-gradient(circle,transparent 0 93%,#000 93% 95%,transparent 95%);
    mask:radial-gradient(circle,transparent 0 93%,#000 93% 95%,transparent 95%);
    animation:pnCanonicalSigilReverse 17s linear infinite;
    opacity:.62;
  }

  body.pn-roulette-open .pn-r3-wheel{
    border-color:rgba(193,94,231,.84) !important;
    box-shadow:
      0 0 0 2px rgba(25,17,31,.98),
      0 0 0 5px rgba(118,44,140,.16),
      0 0 36px rgba(156,42,193,.18),
      inset 0 0 48px rgba(0,0,0,.64) !important;
  }

  body.pn-roulette-open .pn-r3-pointer{
    z-index:9 !important;
    top:-7px !important;
    border-left-width:12px !important;
    border-right-width:12px !important;
    border-bottom-width:28px !important;
    border-bottom-color:#f7e8ff !important;
    filter:
      drop-shadow(0 0 6px rgba(222,144,255,.55))
      drop-shadow(0 6px 10px rgba(255,35,83,.18)) !important;
  }

  body.pn-roulette-open .pn-r3-pointer:after{
    content:"";
    position:absolute;
    width:3px;
    height:8px;
    left:-1px;
    top:17px;
    background:#ff315f;
    box-shadow:0 0 8px rgba(255,49,95,.70);
  }

  /*
    Canonical label geometry.
    Fixed sector-center anchors. No chained radial transform pileups.
  */
  .pn-r3-verdict-wheel .pn-r3-wheel-label,
  .pn-r3-wager-wheel .pn-r3-wheel-label{
    position:absolute !important;
    z-index:4 !important;
    margin:0 !important;
    padding:0 2px !important;
    transform-origin:center center !important;
    transform:translate(-50%,-50%) rotate(var(--neg-r)) !important;
    text-align:center !important;
    white-space:nowrap !important;
    pointer-events:none !important;
    text-shadow:
      0 1px 3px rgba(0,0,0,.98),
      0 0 5px rgba(255,255,255,.06) !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label{
    width:30% !important;
    max-width:30% !important;
    font-size:8.4px !important;
    line-height:1 !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(1){left:76.85% !important;top:34.50% !important}
  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(2){left:50.00% !important;top:81.00% !important}
  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(3){left:23.15% !important;top:34.50% !important}

  .pn-r3-wager-wheel .pn-r3-wheel-label{
    width:22% !important;
    max-width:22% !important;
    font-size:7px !important;
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
    width:58px !important;
    height:58px !important;
    background:radial-gradient(circle at 50% 50%,rgba(123,37,145,.58) 0 24%,rgba(16,10,20,.98) 26% 100%) !important;
    border:2px solid rgba(219,134,255,.82) !important;
    box-shadow:
      0 0 0 8px rgba(10,7,14,.25),
      0 0 24px rgba(181,55,227,.23),
      inset 0 0 12px rgba(255,255,255,.03) !important;
  }

  body.pn-roulette-open .pn-r3-spin{
    position:relative;
    min-width:clamp(178px,34%,224px) !important;
    min-height:clamp(34px,4.5vh,42px) !important;
    letter-spacing:.055em;
  }

  body.pn-roulette-open .pn-r3-spin:not(:disabled){
    background:linear-gradient(100deg,rgba(126,31,165,.98),rgba(181,56,236,.96)) !important;
    border-color:rgba(221,110,255,.65) !important;
    box-shadow:0 0 22px rgba(173,58,218,.18) !important;
  }

  body.pn-roulette-open .pn-r3-result-zone{
    position:relative;
    overflow:hidden;
    min-height:clamp(68px,9vh,94px) !important;
    padding:clamp(10px,1.3vh,15px) !important;
    margin-bottom:clamp(8px,1.2vh,14px) !important;
    border-color:rgba(177,83,216,.57) !important;
    background:linear-gradient(100deg,rgba(50,9,63,.22),rgba(10,7,14,.92) 54%) !important;
    box-shadow:inset 3px 0 0 rgba(193,65,240,.22);
  }

  body.pn-roulette-open .pn-r3-result-zone:before{
    content:"MACHINE SPIRIT OBSERVING";
    position:absolute;
    right:12px;
    bottom:8px;
    color:rgba(166,102,183,.23);
    font-family:var(--mono);
    font-size:6.5px;
    font-weight:900;
    letter-spacing:.13em;
  }

  body.pn-roulette-open .pn-r3-commit{
    background:linear-gradient(100deg,#9b1b45,#8b239d) !important;
    border-color:#d9438c !important;
    color:#fff !important;
    box-shadow:0 0 22px rgba(227,50,111,.18) !important;
    animation:pnCanonicalCommit 2.9s ease-in-out infinite;
  }

  body.pn-roulette-open .pn-r3-defy{
    border-color:rgba(137,115,146,.45) !important;
    background:rgba(23,20,27,.70) !important;
  }

  /* Compact browser heights. */
  body.pn-roulette-compact .pn-roulette-blessing b{font-size:9px}
  body.pn-roulette-compact .pn-roulette-blessing span{font-size:6.2px}
  body.pn-roulette-compact .pn-r3-stats>div{min-height:60px !important}
  body.pn-roulette-compact .pn-r3-stage{min-height:calc(var(--pn-roulette-wheel-size,250px) + 62px) !important}

  body.pn-roulette-tight .pn-roulette-blessing{
    min-height:28px;
    padding:4px 9px;
  }

  body.pn-roulette-tight .pn-roulette-blessing b{font-size:8px}
  body.pn-roulette-tight .pn-roulette-blessing span{font-size:5.6px}
  body.pn-roulette-tight .pn-r3-stats>div{min-height:50px !important;padding:7px 11px !important}
  body.pn-roulette-tight .pn-r3-stage-strip>div{min-height:26px !important;padding:4px 6px !important}
  body.pn-roulette-tight .pn-r3-stage-strip b{font-size:6.6px !important}
  body.pn-roulette-tight .pn-r3-tabs button{padding:6px 10px !important;min-width:115px !important}
  body.pn-roulette-tight .pn-r3-stage{min-height:calc(var(--pn-roulette-wheel-size,210px) + 54px) !important}
  body.pn-roulette-tight .pn-r3-result-zone{min-height:58px !important}

  @media(max-width:880px){
    body.pn-roulette-open .pn-r3-wheel-grid{
      grid-template-columns:1fr !important;
    }

    body.pn-roulette-open .pn-r3-controls{
      grid-template-columns:minmax(0,1fr) minmax(120px,180px) !important;
    }

    body.pn-roulette-open .pn-r3-wheel-shell{
      max-width:min(78vw,310px) !important;
    }
  }

  @media(max-width:680px){
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

    body.pn-roulette-open .pn-r3-stats>div{
      border-right:0 !important;
      border-bottom:1px solid rgba(147,92,193,.45);
    }

    body.pn-roulette-open .pn-r3-stats>div:last-child{
      border-bottom:0;
    }

    body.pn-roulette-open .pn-r3-stage-strip{
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    }

    body.pn-roulette-open .pn-r3-result-zone{
      flex-direction:column !important;
      align-items:flex-start !important;
    }
  }

  @keyframes pnCanonicalScan{
    0%{transform:translateY(-3px)}
    50%{transform:translateY(3px)}
    100%{transform:translateY(-3px)}
  }

  @keyframes pnCanonicalGlitch{
    0%,87%,100%{transform:translateX(0);filter:none}
    88%{transform:translateX(1px);filter:brightness(1.25)}
    89%{transform:translateX(-2px)}
    90%{transform:translateX(1px)}
    91%{transform:translateX(0)}
  }

  @keyframes pnCanonicalSigil{to{transform:rotate(360deg)}}
  @keyframes pnCanonicalSigilReverse{to{transform:rotate(-360deg)}}

  @keyframes pnCanonicalDamage{
    0%,82%,100%{opacity:1;transform:translateX(0)}
    83%{opacity:.72;transform:translateX(1px)}
    84%{opacity:1;transform:translateX(-1px)}
    85%{transform:translateX(0)}
  }

  @keyframes pnCanonicalCommit{
    0%,100%{filter:brightness(1)}
    50%{filter:brightness(1.08)}
  }
  `;

  document.head.appendChild(style);
})();
