"use strict";

/*
  PROFITNODE THE ROULETTE - OMNISSIAH VISUAL LAYER v5
  Visual-only machine-cult corruption. No betting math or ledger logic changes.
*/

(function installRouletteOmnissiahVisuals(){
  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(row=>row.key==="roulette");

    if (route && typeof route.render==="function" && !route.__pnOmnissiahWrapped){
      const previous = route.render;

      route.render = function(){
        let html = previous.apply(this,arguments);

        html = html.replace(
          '<div class="pn-r3-header">',
          '<div class="pn-omnissiah-blessing" aria-hidden="true">'+
            '<span>MACHINE SPIRIT AWAKE</span>'+
            '<b>OMNISSIAH BLESS THIS WAGER</b>'+
            '<span>RNG SANCTIFIED // LIABILITY DENIED</span>'+
          '</div>'+
          '<div class="pn-r3-header">'
        );

        html = html.replace(
          '<h2>WHEEL #1</h2>',
          '<h2>WHEEL #1 <small class="pn-core-designation">JUDGEMENT CORE</small></h2>'
        );

        html = html.replace(
          '<h2>WHEEL #2</h2>',
          '<h2>WHEEL #2 <small class="pn-core-designation">WAGER CORE</small></h2>'
        );

        html = html.replace(
          '<div class="pn-r3-wheel-grid">',
          '<div class="pn-machine-litany" aria-hidden="true">'+
            '<span>01 // SANCTIFY INPUT</span>'+
            '<span>02 // CONSULT MACHINE</span>'+
            '<span>03 // ACCEPT CONSEQUENCE</span>'+
            '<span>04 // RECORD DAMAGE</span>'+
          '</div>'+
          '<div class="pn-r3-wheel-grid">'
        );

        return html;
      };

      route.__pnOmnissiahWrapped = true;
    }
  }

  const style = document.createElement("style");

  style.textContent = `
  .pn-r3-content{
    background:
      radial-gradient(circle at 50% 32%,rgba(141,23,52,.10),transparent 23%),
      radial-gradient(circle at 11% 18%,rgba(142,0,45,.14),transparent 25%),
      radial-gradient(circle at 88% 12%,rgba(103,21,160,.16),transparent 30%),
      linear-gradient(180deg,rgba(8,5,11,.08),rgba(8,5,11,.40)) !important;
  }

  .pn-r3-content:before{
    background:
      linear-gradient(90deg,transparent 0 11%,rgba(169,38,76,.035) 11.15%,transparent 11.3% 88%,rgba(126,45,162,.035) 88.15%,transparent 88.3%),
      linear-gradient(0deg,transparent 0 18%,rgba(126,45,162,.025) 18.15%,transparent 18.3% 78%,rgba(169,38,76,.025) 78.15%,transparent 78.3%),
      radial-gradient(circle at 17% 8%,rgba(172,27,95,.10),transparent 30%),
      radial-gradient(circle at 83% 15%,rgba(110,35,173,.11),transparent 29%),
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.008) 4px) !important;
  }

  .pn-omnissiah-blessing{
    position:relative;
    z-index:4;
    min-height:42px;
    display:grid;
    grid-template-columns:1fr auto 1fr;
    align-items:center;
    gap:14px;
    padding:7px 14px;
    margin-bottom:10px;
    border:1px solid rgba(196,53,86,.58);
    background:
      repeating-linear-gradient(135deg,rgba(255,40,73,.045) 0 9px,transparent 9px 18px),
      linear-gradient(90deg,rgba(71,7,21,.62),rgba(25,8,31,.94) 44%,rgba(76,8,27,.60));
    box-shadow:
      inset 0 0 22px rgba(202,45,81,.06),
      0 0 24px rgba(111,21,142,.07);
  }

  .pn-omnissiah-blessing:before,
  .pn-omnissiah-blessing:after{
    content:"";
    position:absolute;
    top:50%;
    width:34px;
    height:1px;
    background:linear-gradient(90deg,transparent,#ff315f);
  }

  .pn-omnissiah-blessing:before{left:8px}
  .pn-omnissiah-blessing:after{
    right:8px;
    transform:rotate(180deg);
  }

  .pn-omnissiah-blessing span{
    color:#8d788d;
    font-family:var(--mono);
    font-size:7px;
    font-weight:900;
    letter-spacing:.13em;
  }

  .pn-omnissiah-blessing span:last-child{
    text-align:right;
    color:#a97bbd;
  }

  .pn-omnissiah-blessing b{
    color:#ff90aa;
    font-family:var(--mono);
    font-size:11px;
    letter-spacing:.11em;
    text-shadow:
      1px 0 0 rgba(255,35,77,.52),
      -1px 0 0 rgba(167,67,235,.40),
      0 0 14px rgba(255,45,91,.16);
    animation:pnOmnissiahGlitch 6.8s steps(1,end) infinite;
  }

  .pn-machine-litany{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:1px;
    margin:-2px 0 10px;
    border:1px solid rgba(139,75,165,.30);
    background:rgba(8,6,11,.82);
  }

  .pn-machine-litany span{
    min-height:25px;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#705f73;
    font-family:var(--mono);
    font-size:6.5px;
    font-weight:900;
    letter-spacing:.08em;
    border-right:1px solid rgba(139,75,165,.20);
  }

  .pn-machine-litany span:last-child{border-right:0}
  .pn-machine-litany span:nth-child(2){color:#9d6eb0}
  .pn-machine-litany span:nth-child(3){color:#b5657d}
  .pn-machine-litany span:nth-child(4){color:#d27a93}

  .pn-core-designation{
    display:inline-block;
    margin-left:9px;
    color:#764b80;
    font-family:var(--mono);
    font-size:6.5px;
    font-weight:900;
    letter-spacing:.11em;
    vertical-align:middle;
  }

  .pn-r3-panel .panel-head{
    background:
      linear-gradient(90deg,rgba(39,8,27,.18),rgba(10,7,14,.68)),
      repeating-linear-gradient(90deg,transparent 0 42px,rgba(173,60,205,.025) 42px 43px) !important;
  }

  .pn-r3-panel .panel-head:after{
    content:"";
    position:absolute;
    left:36px;
    right:36px;
    bottom:0;
    height:1px;
    background:linear-gradient(90deg,transparent,#9e35c6 32%,#ff315f 50%,#9e35c6 68%,transparent);
    opacity:.22;
  }

  .pn-r3-wheel-shell:before{
    inset:-12px !important;
    border:0 !important;
    background:
      repeating-conic-gradient(
        from 0deg,
        rgba(199,74,235,.28) 0deg 2deg,
        transparent 2deg 8deg
      );
    -webkit-mask:
      radial-gradient(circle,transparent 0 88%,#000 88% 91%,transparent 91%);
    mask:
      radial-gradient(circle,transparent 0 88%,#000 88% 91%,transparent 91%);
    animation:pnSigilSpin 24s linear infinite !important;
    opacity:.52;
  }

  .pn-r3-wheel-shell:after{
    inset:-22px !important;
    border:0 !important;
    background:
      conic-gradient(
        transparent 0 36deg,
        rgba(255,52,88,.35) 36deg 42deg,
        transparent 42deg 126deg,
        rgba(169,67,228,.28) 126deg 132deg,
        transparent 132deg 216deg,
        rgba(255,52,88,.28) 216deg 222deg,
        transparent 222deg 306deg,
        rgba(169,67,228,.24) 306deg 312deg,
        transparent 312deg 360deg
      );
    -webkit-mask:
      radial-gradient(circle,transparent 0 93%,#000 93% 95%,transparent 95%);
    mask:
      radial-gradient(circle,transparent 0 93%,#000 93% 95%,transparent 95%);
    animation:pnSigilSpinReverse 17s linear infinite !important;
    opacity:.64;
  }

  .pn-r3-wheel{
    box-shadow:
      0 0 0 2px rgba(25,17,31,.98),
      0 0 0 5px rgba(118,44,140,.18),
      0 0 38px rgba(156,42,193,.20),
      inset 0 0 48px rgba(0,0,0,.64) !important;
  }

  .pn-r3-wheel:before,
  .pn-r3-wheel:after{
    content:"";
    position:absolute;
    pointer-events:none;
    border-radius:50%;
    z-index:1;
  }

  .pn-r3-wheel:before{
    inset:9%;
    border:1px solid rgba(255,255,255,.025);
    box-shadow:
      0 0 0 8px rgba(255,255,255,.008),
      inset 0 0 28px rgba(0,0,0,.16);
  }

  .pn-r3-wheel:after{
    inset:24%;
    border:1px dashed rgba(201,100,240,.12);
    animation:pnInnerRite 13s linear infinite reverse;
  }

  .pn-r3-core{
    z-index:6 !important;
    width:60px !important;
    height:60px !important;
    background:
      radial-gradient(circle at 50% 50%,rgba(123,37,145,.60) 0 24%,rgba(16,10,20,.98) 26% 100%) !important;
    border:2px solid rgba(219,134,255,.84) !important;
    box-shadow:
      0 0 0 6px rgba(255,49,95,.035),
      0 0 0 9px rgba(165,61,221,.035),
      0 0 24px rgba(181,55,227,.25),
      inset 0 0 12px rgba(255,255,255,.03) !important;
  }

  .pn-r3-core:before,
  .pn-r3-core:after{
    content:"";
    position:absolute;
    pointer-events:none;
  }

  .pn-r3-core:before{
    width:76px;
    height:76px;
    border-radius:50%;
    border:1px dotted rgba(255,62,99,.25);
    animation:pnInnerRite 10s linear infinite;
  }

  .pn-r3-core:after{
    width:86px;
    height:1px;
    background:linear-gradient(90deg,transparent,rgba(255,56,97,.38),transparent);
    box-shadow:0 0 8px rgba(255,56,97,.12);
    animation:pnCoreCross 7s linear infinite;
  }

  .pn-r3-pointer{
    z-index:9 !important;
  }

  .pn-r3-pointer:before{
    content:"";
    position:absolute;
    width:28px;
    height:28px;
    left:-14px;
    top:-8px;
    border:1px solid rgba(255,49,95,.32);
    transform:rotate(45deg);
    box-shadow:0 0 12px rgba(255,49,95,.10);
  }

  .pn-r3-result-zone{
    overflow:hidden;
  }

  .pn-r3-result-zone:before{
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

  .pn-r3-result-zone:after{
    content:"";
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:1px;
    background:linear-gradient(90deg,transparent,#ff315f,#b843e9,transparent);
    animation:pnRiteSweep 4.8s linear infinite;
  }

  .pn-r3-terminal b,
  .pn-r3-protocol-title b{
    position:relative;
  }

  .pn-r3-terminal b:after,
  .pn-r3-protocol-title b:after{
    content:"";
    display:inline-block;
    width:5px;
    height:12px;
    margin-left:7px;
    background:#ff315f;
    opacity:.40;
    animation:pnLitanyCursor 1.35s steps(1,end) infinite;
  }

  .pn-r3-spin:not(:disabled){
    background:
      linear-gradient(100deg,rgba(126,31,165,.98),rgba(181,56,236,.96)) !important;
    border-color:rgba(221,110,255,.65) !important;
    box-shadow:
      0 0 0 1px rgba(255,49,95,.08),
      0 0 22px rgba(173,58,218,.18) !important;
  }

  .pn-r3-spin:not(:disabled):before{
    content:"";
    position:absolute;
    inset:3px;
    pointer-events:none;
    border:1px solid rgba(255,255,255,.035);
  }

  .pn-r3-commit{
    text-shadow:0 0 8px rgba(255,255,255,.14);
  }

  @keyframes pnOmnissiahGlitch{
    0%,87%,100%{transform:translateX(0);filter:none}
    88%{transform:translateX(1px);filter:brightness(1.25)}
    89%{transform:translateX(-2px)}
    90%{transform:translateX(1px)}
    91%{transform:translateX(0)}
  }

  @keyframes pnInnerRite{
    to{transform:rotate(360deg)}
  }

  @keyframes pnCoreCross{
    to{transform:rotate(360deg)}
  }

  @keyframes pnRiteSweep{
    0%{transform:translateX(-45%);opacity:.10}
    42%{opacity:.55}
    100%{transform:translateX(45%);opacity:.10}
  }

  @keyframes pnLitanyCursor{
    0%,46%{opacity:.15}
    47%,100%{opacity:.65}
  }

  @media(max-width:900px){
    .pn-omnissiah-blessing{
      grid-template-columns:1fr;
      text-align:center;
    }

    .pn-omnissiah-blessing span:last-child{text-align:center}

    .pn-machine-litany{
      grid-template-columns:1fr 1fr;
    }
  }

  @media(max-width:620px){
    .pn-machine-litany{
      grid-template-columns:1fr;
    }
  }
  `;

  document.head.appendChild(style);
})();
