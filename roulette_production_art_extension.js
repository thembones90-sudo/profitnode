"use strict";

/*
  PROFITNODE THE ROULETTE - PRODUCTION ART INTEGRATION V12

  V11 art is now bound to the proven V8 Roulette layout.
  The live wheel sectors, labels, buttons and accounting remain HTML/CSS/JS.
  Artwork is only machinery, atmosphere, hub, pointer, crest and result frame.
*/

(function installRouletteProductionArtV12(){
  const ART = {
    judgement: "assets/roulette/judgement_core_chassis.png?v=roulette-art-v11",
    wager: "assets/roulette/wager_core_chassis.png?v=roulette-art-v11",
    hub: "assets/roulette/roulette_hub.png?v=roulette-art-v11",
    pointer: "assets/roulette/roulette_pointer.png?v=roulette-art-v11",
    crest: "assets/roulette/roulette_crest.png?v=roulette-art-v11",
    background: "assets/roulette/roulette_background_overlay.png?v=roulette-art-v11",
    altar: "assets/roulette/roulette_result_altar.png?v=roulette-art-v11"
  };

  const root = document.documentElement;

  function preload(url){
    return new Promise(resolve=>{
      const img = new Image();
      img.onload = ()=>resolve({url,ok:true});
      img.onerror = ()=>resolve({url,ok:false});
      img.src = url;
    });
  }

  Promise.all(Object.values(ART).map(preload)).then(results=>{
    const failed = results.filter(row=>!row.ok);

    if (failed.length){
      root.classList.add("pn-roulette-art-v12-error");
      console.warn("[PROFITNODE] Roulette V12 art load failure:", failed);
      return;
    }

    root.classList.remove("pn-roulette-art-v12-error");
    root.classList.add("pn-roulette-art-v12-ready");
  });

  const style = document.createElement("style");

  style.textContent = `
  /*
    Do not touch Roulette until all seven files have loaded.
    V8 remains the visual fallback.
  */
  html:not(.pn-roulette-art-v12-ready) .pn-r3-content{
    --pn-production-art-visible:0;
  }

  html.pn-roulette-art-v12-ready .pn-r3-content{
    --pn-production-art-visible:1;
  }

  /*
    BACKGROUND OVERLAY
    Actual art replaces the old synthetic rear machinery layer.
    Low opacity on purpose. UI remains king.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-content:before{
    content:"" !important;
    position:absolute !important;
    inset:0 !important;
    z-index:-2 !important;
    pointer-events:none !important;
    background-image:url("${ART.background}") !important;
    background-size:cover !important;
    background-position:center !important;
    background-repeat:no-repeat !important;
    opacity:.11 !important;
    filter:saturate(.92) brightness(.82) !important;
  }

  /*
    STATS CREST
    Tiny branding watermark only. It must never compete with MONEY INVESTED.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-stats:after{
    content:"" !important;
    position:absolute !important;
    left:50% !important;
    top:50% !important;
    width:clamp(72px,7vw,108px) !important;
    height:clamp(72px,7vw,108px) !important;
    transform:translate(-50%,-50%) !important;
    z-index:0 !important;
    pointer-events:none !important;
    background:url("${ART.crest}") center/contain no-repeat !important;
    opacity:.055 !important;
    filter:saturate(.76) brightness(.78) !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-stats>div{
    position:relative !important;
    z-index:1 !important;
  }

  /*
    WHEEL CHASSIS
    Critical difference from failed V9:
    the 1024x1024 chassis is a BACKGROUND MACHINE behind the live wheel.
    It never covers sector labels or the interactive disc.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,320px) * 1.18 + 90px) !important;
    overflow:visible !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-stage:after{
    content:"" !important;
    position:absolute !important;
    left:50% !important;
    top:calc(50% - 24px) !important;
    width:calc(var(--pn-roulette-wheel-size,320px) * 1.30) !important;
    height:calc(var(--pn-roulette-wheel-size,320px) * 1.30) !important;
    transform:translate(-50%,-50%) !important;
    z-index:1 !important;
    pointer-events:none !important;
    background-position:center !important;
    background-size:contain !important;
    background-repeat:no-repeat !important;
    opacity:.90 !important;
    filter:
      brightness(.82)
      saturate(.92)
      drop-shadow(0 15px 20px rgba(0,0,0,.34))
      drop-shadow(0 0 12px rgba(198,53,88,.10)) !important;
    transition:filter .25s ease,opacity .25s ease !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open
  .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-stage:after{
    background-image:url("${ART.judgement}") !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open
  .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-stage:after{
    background-image:url("${ART.wager}") !important;
  }

  /*
    Keep the live wheel above the chassis.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-wheel-shell{
    position:relative !important;
    z-index:4 !important;
  }

  /*
    V8 already draws a synthetic cog assembly in ::before.
    The real chassis replaces it. Keep only the thin animated halo.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-wheel-shell:before{
    opacity:0 !important;
    animation:none !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-wheel-shell:after{
    inset:-15px !important;
    z-index:1 !important;
    opacity:.48 !important;
    animation-duration:22s !important;
  }

  /*
    LIVE POINTER
    Real pointer art, fixed above a rotating wheel.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-pointer{
    position:absolute !important;
    left:50% !important;
    top:calc(var(--pn-roulette-wheel-size,320px) * -.115) !important;
    width:clamp(34px,calc(var(--pn-roulette-wheel-size,320px) * .155),56px) !important;
    height:clamp(68px,calc(var(--pn-roulette-wheel-size,320px) * .31),112px) !important;
    transform:translateX(-50%) !important;
    z-index:12 !important;
    pointer-events:none !important;
    border:0 !important;
    background-image:url("${ART.pointer}") !important;
    background-size:contain !important;
    background-position:center top !important;
    background-repeat:no-repeat !important;
    filter:
      brightness(.94)
      drop-shadow(0 5px 7px rgba(0,0,0,.52))
      drop-shadow(0 0 8px rgba(255,49,95,.25)) !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-pointer:before,
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-pointer:after{
    display:none !important;
  }

  /*
    HUB
    The generated hub has no PN/R text.
    The existing live HTML letters remain above it.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-core{
    width:clamp(50px,calc(var(--pn-roulette-wheel-size,320px) * .19),72px) !important;
    height:clamp(50px,calc(var(--pn-roulette-wheel-size,320px) * .19),72px) !important;
    z-index:13 !important;
    display:grid !important;
    place-items:center !important;
    overflow:visible !important;
    border:0 !important;
    border-radius:50% !important;
    background-image:url("${ART.hub}") !important;
    background-size:contain !important;
    background-position:center !important;
    background-repeat:no-repeat !important;
    color:#ffe9f0 !important;
    font-size:clamp(9px,calc(var(--pn-roulette-wheel-size,320px) * .034),12px) !important;
    font-weight:900 !important;
    text-shadow:
      0 1px 2px #000,
      0 0 8px rgba(255,59,100,.52) !important;
    box-shadow:
      0 0 0 6px rgba(8,5,11,.24),
      0 0 20px rgba(185,57,226,.16) !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-core:before,
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-core:after{
    display:none !important;
  }

  /*
    RESULT ALTAR
    The frame is a CSS background behind the live terminal.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-result-zone{
    min-height:clamp(108px,12vh,142px) !important;
    padding:
      clamp(22px,2.8vh,34px)
      clamp(48px,5vw,78px) !important;
    background:
      linear-gradient(100deg,rgba(21,7,26,.42),rgba(8,5,11,.80)),
      url("${ART.altar}") center/100% 100% no-repeat !important;
    border-color:rgba(179,76,213,.44) !important;
    box-shadow:
      inset 0 0 26px rgba(255,0,72,.025),
      0 12px 28px rgba(0,0,0,.18) !important;
  }

  /*
    Decorative crest inside the result altar.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-result-zone:before{
    content:"" !important;
    position:absolute !important;
    left:50% !important;
    bottom:-24px !important;
    width:88px !important;
    height:88px !important;
    transform:translateX(-50%) !important;
    pointer-events:none !important;
    background:url("${ART.crest}") center/contain no-repeat !important;
    opacity:.10 !important;
    -webkit-mask:none !important;
    mask:none !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-result-zone:after{
    right:clamp(26px,3vw,52px) !important;
    bottom:clamp(14px,1.5vh,22px) !important;
  }

  /*
    Live result content always sits above the altar art.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-result-zone>*{
    position:relative !important;
    z-index:3 !important;
  }

  /*
    ACTIVE SPIN
    Wake the chassis and pointer without moving the artwork itself.
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-open
  .pn-r3-spin-active .pn-r3-stage:after{
    opacity:1 !important;
    filter:
      brightness(1.02)
      saturate(1.10)
      drop-shadow(0 15px 20px rgba(0,0,0,.34))
      drop-shadow(0 0 18px rgba(255,52,91,.18)) !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-open
  .pn-r3-spin-active .pn-r3-pointer{
    filter:
      brightness(1.12)
      drop-shadow(0 5px 7px rgba(0,0,0,.52))
      drop-shadow(0 0 13px rgba(255,49,95,.48)) !important;
  }

  /*
    SHORT WINDOWS
  */
  html.pn-roulette-art-v12-ready body.pn-roulette-compact .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,270px) * 1.17 + 76px) !important;
  }

  html.pn-roulette-art-v12-ready body.pn-roulette-tight .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,220px) * 1.15 + 66px) !important;
  }

  /*
    NARROW LAYOUT
    Chassis follows the same responsive stack as the existing V8 UI.
  */
  @media(max-width:920px){
    html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-stage:after{
      width:calc(var(--pn-roulette-wheel-size,280px) * 1.27) !important;
      height:calc(var(--pn-roulette-wheel-size,280px) * 1.27) !important;
    }
  }

  @media(max-width:700px){
    html.pn-roulette-art-v12-ready body.pn-roulette-open .pn-r3-result-zone{
      padding:22px 28px !important;
    }
  }
  `;

  document.head.appendChild(style);
})();
