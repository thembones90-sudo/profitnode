"use strict";

/*
  PROFITNODE THE ROULETTE - PRODUCTION ART WIRING v9

  Binds the canonical assets under assets/roulette/ to the live Roulette UI.
  The live HTML/JS wheel remains interactive. Artwork is chassis, machinery,
  hub, pointer, background atmosphere, crest and result altar only.
*/

(function installRouletteProductionArt(){
  const ROOT = "assets/roulette/";

  const ART = {
    judgement: ROOT + "judgement_core_chassis.png",
    wager: ROOT + "wager_core_chassis.png",
    hub: ROOT + "roulette_hub.png",
    pointer: ROOT + "roulette_pointer.png",
    crest: ROOT + "roulette_crest.png",
    background: ROOT + "roulette_background_overlay.png",
    altar: ROOT + "roulette_result_altar.png"
  };

  const urls = Object.values(ART);

  function preload(url){
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve({url:url,ok:true});
      image.onerror = () => resolve({url:url,ok:false});
      image.src = url;
    });
  }

  Promise.all(urls.map(preload)).then(results => {
    const failed = results.filter(row => !row.ok);

    if (failed.length){
      document.body.classList.add("pn-roulette-art-error");
      console.warn("[PROFITNODE] Roulette art failed to load:", failed.map(row => row.url));
      return;
    }

    document.body.classList.remove("pn-roulette-art-error");
    document.body.classList.add("pn-roulette-art-ready");
  });

  const style = document.createElement("style");

  style.textContent = `
  /*
    FALLBACK DOCTRINE
    Until every asset has loaded, V8 remains visible unchanged.
  */
  body:not(.pn-roulette-art-ready) .pn-r3-content{
    --pn-art-opacity:0;
  }

  body.pn-roulette-art-ready .pn-r3-content{
    --pn-art-opacity:1;
  }

  /*
    PAGE MACHINERY CAVITY
    This is atmospheric only. It never replaces the normal PROFITNODE page
    background and it cannot intercept clicks.
  */
  body.pn-roulette-art-ready .pn-r3-content{
    background-image:
      linear-gradient(180deg,rgba(8,5,11,.12),rgba(8,5,11,.44)),
      url("${ART.background}") !important;
    background-size:cover,cover !important;
    background-position:center,center !important;
    background-repeat:no-repeat,no-repeat !important;
    background-blend-mode:normal,screen !important;
  }

  body.pn-roulette-art-ready .pn-r3-content:before{
    opacity:.72 !important;
  }

  /*
    CREST WATERMARK
    One identity mark, not another banner.
  */
  body.pn-roulette-art-ready .pn-r3-stats:after{
    content:"";
    position:absolute;
    left:50%;
    top:50%;
    width:94px;
    height:94px;
    transform:translate(-50%,-50%);
    pointer-events:none;
    z-index:0;
    background:url("${ART.crest}") center/contain no-repeat;
    opacity:.065;
    filter:saturate(.7) brightness(.9);
  }

  body.pn-roulette-art-ready .pn-r3-stats>div{
    position:relative;
    z-index:1;
  }

  /*
    LIVE CORE CHASSIS
    The chassis floats outside the interactive wheel. The live color sectors
    and labels remain untouched inside the transparent circular opening.
  */
  body.pn-roulette-art-ready .pn-r3-wheel-shell{
    overflow:visible !important;
  }

  body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-wheel-shell:before,
  body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-wheel-shell:before{
    content:"" !important;
    position:absolute !important;
    left:50% !important;
    top:50% !important;
    width:calc(var(--pn-roulette-wheel-size,320px) * 1.49) !important;
    height:calc(var(--pn-roulette-wheel-size,320px) * 1.55) !important;
    transform:translate(-50%,-50%) !important;
    z-index:7 !important;
    pointer-events:none !important;
    border:0 !important;
    border-radius:0 !important;
    -webkit-mask:none !important;
    mask:none !important;
    animation:none !important;
    opacity:.96 !important;
    filter:
      drop-shadow(0 16px 22px rgba(0,0,0,.42))
      drop-shadow(0 0 13px rgba(213,48,89,.13)) !important;
    background-position:center !important;
    background-size:contain !important;
    background-repeat:no-repeat !important;
  }

  body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-wheel-shell:before{
    background-image:url("${ART.judgement}") !important;
  }

  body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-wheel-shell:before{
    background-image:url("${ART.wager}") !important;
  }

  /*
    Keep one thin animated probability halo behind the chassis so the static
    production art still feels alive.
  */
  body.pn-roulette-art-ready .pn-r3-wheel-shell:after{
    content:"" !important;
    position:absolute !important;
    inset:-12px !important;
    z-index:1 !important;
    pointer-events:none !important;
    border-radius:50% !important;
    background:
      conic-gradient(
        transparent 0 35deg,
        rgba(255,51,91,.42) 35deg 39deg,
        transparent 39deg 123deg,
        rgba(175,70,235,.36) 123deg 128deg,
        transparent 128deg 214deg,
        rgba(255,51,91,.30) 214deg 219deg,
        transparent 219deg 302deg,
        rgba(175,70,235,.28) 302deg 307deg,
        transparent 307deg 360deg
      ) !important;
    -webkit-mask:radial-gradient(circle,transparent 0 90%,#000 90% 93%,transparent 93%) !important;
    mask:radial-gradient(circle,transparent 0 90%,#000 90% 93%,transparent 93%) !important;
    opacity:.62 !important;
    animation:pnProductionHalo 18s linear infinite !important;
  }

  /*
    POINTER ASSEMBLY
    Replace the CSS triangle with the production pointer. It remains fixed
    while the wheel rotates underneath.
  */
  body.pn-roulette-art-ready .pn-r3-pointer{
    position:absolute !important;
    left:50% !important;
    top:-42px !important;
    width:56px !important;
    height:112px !important;
    transform:translateX(-50%) !important;
    z-index:12 !important;
    pointer-events:none !important;
    border:0 !important;
    background:url("${ART.pointer}") center top/contain no-repeat !important;
    filter:
      drop-shadow(0 5px 6px rgba(0,0,0,.50))
      drop-shadow(0 0 9px rgba(255,47,89,.33)) !important;
  }

  body.pn-roulette-art-ready .pn-r3-pointer:before,
  body.pn-roulette-art-ready .pn-r3-pointer:after{
    display:none !important;
  }

  /*
    REACTOR HUB
    roulette_hub.png contains PN in its artwork. For the wager core we mask
    that central text and render a live R above it.
  */
  body.pn-roulette-art-ready .pn-r3-core{
    width:76px !important;
    height:76px !important;
    z-index:13 !important;
    overflow:visible !important;
    border:0 !important;
    border-radius:50% !important;
    background:url("${ART.hub}") center/138px 162px no-repeat !important;
    box-shadow:
      0 0 0 8px rgba(8,5,11,.25),
      0 0 25px rgba(187,56,226,.25) !important;
    color:transparent !important;
    font-size:0 !important;
  }

  body.pn-roulette-art-ready .pn-r3-core:before{
    display:none !important;
  }

  body.pn-roulette-art-ready .pn-r3-core:after{
    content:"PN" !important;
    position:absolute !important;
    left:50% !important;
    top:50% !important;
    width:34px !important;
    height:34px !important;
    transform:translate(-50%,-50%) !important;
    display:grid !important;
    place-items:center !important;
    border-radius:50% !important;
    background:rgba(20,10,24,.72) !important;
    box-shadow:none !important;
    color:#ff889f !important;
    font-family:var(--mono) !important;
    font-size:11px !important;
    font-weight:900 !important;
    text-shadow:0 0 9px rgba(255,49,95,.48) !important;
  }

  body.pn-roulette-art-ready .pn-r3-wager-wheel .pn-r3-core:after{
    content:"R" !important;
  }

  /*
    Preserve the exact deterministic label anchors above the wheel texture but
    below the fixed machinery.
  */
  body.pn-roulette-art-ready .pn-r3-wheel-label{
    z-index:6 !important;
  }

  body.pn-roulette-art-ready .pn-r3-wheel{
    z-index:4 !important;
  }

  /*
    RESULT ALTAR
    The frame scales with the panel. Live text and buttons stay HTML.
  */
  body.pn-roulette-art-ready .pn-r3-result-zone{
    min-height:clamp(112px,13vh,150px) !important;
    padding:
      clamp(24px,3.2vh,38px)
      clamp(52px,5.5vw,92px) !important;
    border-color:rgba(177,83,216,.38) !important;
    background:
      linear-gradient(100deg,rgba(24,7,28,.38),rgba(8,5,11,.78)),
      url("${ART.altar}") center/100% 100% no-repeat !important;
    box-shadow:
      0 14px 34px rgba(0,0,0,.20),
      inset 0 0 30px rgba(255,0,72,.035) !important;
  }

  body.pn-roulette-art-ready .pn-r3-result-zone:before{
    content:"" !important;
    position:absolute !important;
    left:50% !important;
    bottom:-20px !important;
    width:86px !important;
    height:86px !important;
    transform:translateX(-50%) !important;
    pointer-events:none !important;
    background:url("${ART.crest}") center/contain no-repeat !important;
    opacity:.11 !important;
    -webkit-mask:none !important;
    mask:none !important;
  }

  body.pn-roulette-art-ready .pn-r3-result-zone:after{
    content:"MACHINE SPIRIT OBSERVING" !important;
    right:clamp(38px,4vw,72px) !important;
    bottom:clamp(18px,2vh,30px) !important;
    color:rgba(214,126,225,.28) !important;
  }

  body.pn-roulette-art-ready .pn-r3-terminal,
  body.pn-roulette-art-ready .pn-r3-protocol-terminal,
  body.pn-roulette-art-ready .pn-r3-actions{
    position:relative;
    z-index:4;
  }

  /*
    State-specific altar lighting.
  */
  body.pn-roulette-art-ready .pn-r3-result-zone.pn-result-save{
    filter:drop-shadow(0 0 10px rgba(63,207,125,.08));
  }

  body.pn-roulette-art-ready .pn-r3-result-zone.pn-result-denied{
    filter:saturate(.72) drop-shadow(0 0 11px rgba(255,52,88,.10));
  }

  body.pn-roulette-art-ready .pn-r3-result-zone.pn-result-bet{
    filter:drop-shadow(0 0 12px rgba(187,67,237,.12));
  }

  /*
    Active spin event: chassis LEDs appear hotter while the live wheel spins.
  */
  body.pn-roulette-art-ready .pn-r3-spin-active .pn-r3-wheel-shell:before{
    filter:
      brightness(1.14)
      saturate(1.16)
      drop-shadow(0 16px 22px rgba(0,0,0,.42))
      drop-shadow(0 0 18px rgba(255,44,84,.22)) !important;
  }

  body.pn-roulette-art-ready .pn-r3-spin-active .pn-r3-pointer{
    filter:
      brightness(1.18)
      drop-shadow(0 5px 6px rgba(0,0,0,.50))
      drop-shadow(0 0 14px rgba(255,47,89,.50)) !important;
  }

  @keyframes pnProductionHalo{
    to{transform:rotate(-360deg)}
  }

  /*
    RESPONSIVE ART FIT
    Chassis ratio follows the live wheel rather than imposing a fixed canvas.
  */
  @media(max-width:920px){
    body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:first-child .pn-r3-wheel-shell:before,
    body.pn-roulette-art-ready .pn-r3-wheel-grid .pn-r3-panel:last-child .pn-r3-wheel-shell:before{
      width:calc(var(--pn-roulette-wheel-size,280px) * 1.46) !important;
      height:calc(var(--pn-roulette-wheel-size,280px) * 1.52) !important;
    }

    body.pn-roulette-art-ready .pn-r3-result-zone{
      padding:
        clamp(20px,3vh,32px)
        clamp(34px,5vw,62px) !important;
    }
  }

  @media(max-width:700px){
    body.pn-roulette-art-ready .pn-r3-pointer{
      width:48px !important;
      height:96px !important;
      top:-36px !important;
    }

    body.pn-roulette-art-ready .pn-r3-result-zone{
      padding:24px 30px !important;
    }
  }
  `;

  document.head.appendChild(style);
})();
