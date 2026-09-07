"use strict";

/* PROFITNODE THE ROULETTE - CURSED VISUAL LAYER v4 */
(function installRouletteCursedVisuals(){
  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(row=>row.key==="roulette");
    if (route && typeof route.render === "function" && !route.__pnCurseWrapped){
      const previous = route.render;
      route.render = function(){
        let html = previous.apply(this,arguments);
        const marker = '<div class="content pn-r3-content">';
        const rail =
          '<div class="pn-curse-rail" aria-hidden="true">'+
            '<span>RISK ACCEPTED</span>'+
            '<span>NO REFUNDS FROM FATE</span>'+
            '<span>VOLATILITY ONLINE</span>'+
            '<span>THIS WAS YOUR IDEA</span>'+
          '</div>';
        if (html.includes(marker)) html = html.replace(marker,marker+rail);
        return html;
      };
      route.__pnCurseWrapped = true;
    }
  }

  const style = document.createElement("style");
  style.textContent = `
  .pn-r3-content{
    overflow:hidden;
    padding-bottom:24px;
    background:
      radial-gradient(circle at 11% 19%,rgba(142,0,45,.13),transparent 26%),
      radial-gradient(circle at 88% 12%,rgba(103,21,160,.15),transparent 31%),
      linear-gradient(180deg,rgba(8,5,11,.08),rgba(8,5,11,.36));
  }

  .pn-r3-content:after{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    z-index:20;
    opacity:.16;
    mix-blend-mode:screen;
    background:
      repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.020) 4px),
      linear-gradient(90deg,transparent 0 48%,rgba(255,36,92,.025) 49%,transparent 50% 100%);
    animation:pnCurseScan 8s linear infinite;
  }

  .pn-curse-rail{
    position:relative;
    z-index:2;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    margin-bottom:12px;
    border:1px solid rgba(220,54,105,.34);
    background:
      repeating-linear-gradient(135deg,rgba(255,46,91,.025) 0 8px,transparent 8px 16px),
      rgba(12,8,15,.86);
    box-shadow:inset 0 -1px 0 rgba(177,69,240,.08);
  }

  .pn-curse-rail span{
    min-height:28px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-right:1px solid rgba(165,85,205,.26);
    color:#8f768f;
    font-family:var(--mono);
    font-size:7px;
    font-weight:900;
    letter-spacing:.13em;
    text-align:center;
  }

  .pn-curse-rail span:last-child{border-right:0}
  .pn-curse-rail span:nth-child(2){color:#d56a8a}
  .pn-curse-rail span:nth-child(4){color:#b46cdd;animation:pnCurseBlink 5.4s steps(1,end) infinite}

  .pn-r3-header{
    position:relative;
    overflow:hidden;
    border-color:rgba(229,49,99,.50);
    border-left-width:4px;
    min-height:58px;
    background:
      linear-gradient(100deg,rgba(111,8,38,.42),rgba(56,12,75,.34) 47%,rgba(10,7,14,.90)),
      repeating-linear-gradient(135deg,rgba(255,255,255,.018) 0 7px,transparent 7px 14px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.025),
      0 0 30px rgba(148,31,184,.08);
  }

  .pn-r3-header:before,
  .pn-r3-header:after{
    content:"";
    position:absolute;
    pointer-events:none;
  }

  .pn-r3-header:before{
    width:180px;
    height:1px;
    right:18px;
    bottom:9px;
    background:linear-gradient(90deg,transparent,#c946ff,#ff365f,transparent);
    opacity:.48;
  }

  .pn-r3-header:after{
    width:7px;
    height:7px;
    border:1px solid #ff365f;
    right:17px;
    top:10px;
    transform:rotate(45deg);
    box-shadow:0 0 12px rgba(255,54,95,.40);
  }

  .pn-r3-header b{
    position:relative;
    color:#f5e8fa;
    text-shadow:
      1px 0 0 rgba(255,41,89,.30),
      -1px 0 0 rgba(162,55,230,.26);
  }

  .pn-r3-stats{
    border-color:rgba(170,83,212,.54);
    box-shadow:
      inset 0 0 0 1px rgba(167,70,209,.035),
      0 14px 34px rgba(0,0,0,.10);
  }

  .pn-r3-stats>div{
    position:relative;
    overflow:hidden;
  }

  .pn-r3-stats>div:after{
    content:"";
    position:absolute;
    right:-22px;
    bottom:-26px;
    width:90px;
    height:90px;
    border:1px solid rgba(183,75,234,.09);
    transform:rotate(45deg);
  }

  .pn-r3-net{
    background:linear-gradient(120deg,rgba(79,18,103,.08),rgba(30,9,38,.17));
  }

  .pn-r3-net b.pos{
    text-shadow:0 0 24px rgba(42,230,132,.17);
    animation:pnMoneyBreath 4.4s ease-in-out infinite;
  }

  .pn-r3-net b.neg{
    text-shadow:0 0 25px rgba(255,52,78,.20);
    animation:pnDamageFlicker 3.8s steps(1,end) infinite;
  }

  .pn-r3-net b.zero{
    text-shadow:0 0 22px rgba(196,81,239,.16);
  }

  .pn-r3-stage-strip{
    position:relative;
    border-color:rgba(167,82,204,.50);
    background:rgba(8,6,11,.88);
    box-shadow:inset 0 -1px 0 rgba(214,64,255,.05);
  }

  .pn-r3-stage-strip>div{
    min-height:42px;
  }

  .pn-r3-stage-strip .current{
    background:
      linear-gradient(90deg,rgba(117,28,155,.23),rgba(82,16,105,.08));
    box-shadow:
      inset 0 -2px 0 rgba(205,66,255,.72),
      inset 0 0 22px rgba(146,40,188,.08);
  }

  .pn-r3-stage-strip .done span{
    box-shadow:0 0 9px rgba(40,224,127,.18);
  }

  .pn-r3-tabs button{
    position:relative;
    overflow:hidden;
  }

  .pn-r3-tabs button.active:after{
    content:"";
    position:absolute;
    left:24%;
    right:24%;
    bottom:0;
    height:2px;
    background:#d04aff;
    box-shadow:0 0 12px rgba(208,74,255,.55);
  }

  .pn-r3-panel{
    position:relative;
    overflow:hidden;
    border-color:rgba(163,85,203,.53);
    box-shadow:
      inset 0 0 0 1px rgba(160,70,205,.025),
      0 12px 30px rgba(0,0,0,.12);
    transition:opacity .25s ease,filter .25s ease,border-color .25s ease,box-shadow .25s ease;
  }

  .pn-r3-panel:before{
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

  .pn-r3-panel:not(.pn-r3-dormant):not(.pn-r3-locked-wheel){
    border-color:rgba(194,72,247,.68);
    box-shadow:
      inset 0 0 0 1px rgba(188,75,234,.035),
      0 0 34px rgba(153,48,194,.10);
  }

  .pn-r3-panel:not(.pn-r3-dormant):not(.pn-r3-locked-wheel) .pn-r3-state{
    color:#d176ff;
    text-shadow:0 0 10px rgba(198,78,255,.30);
  }

  .pn-r3-dormant{
    opacity:.63 !important;
    filter:saturate(.68) brightness(.86) !important;
  }

  .pn-r3-locked-wheel{
    opacity:.54 !important;
    filter:saturate(.72) brightness(.82);
  }

  .pn-r3-stage{
    min-height:410px !important;
    gap:12px !important;
    padding-top:14px !important;
  }

  .pn-r3-wheel-shell{
    width:min(300px,78vw) !important;
  }

  .pn-r3-wheel-shell:before,
  .pn-r3-wheel-shell:after{
    content:"";
    position:absolute;
    pointer-events:none;
    border-radius:50%;
  }

  .pn-r3-wheel-shell:before{
    inset:-9px;
    border:1px dashed rgba(189,87,236,.28);
    animation:pnSigilSpin 28s linear infinite;
  }

  .pn-r3-wheel-shell:after{
    inset:-16px;
    border-top:1px solid rgba(255,58,96,.28);
    border-right:1px solid transparent;
    border-bottom:1px solid rgba(162,63,215,.18);
    border-left:1px solid transparent;
    animation:pnSigilSpinReverse 19s linear infinite;
  }

  .pn-r3-wheel{
    border-color:rgba(193,94,231,.86) !important;
    box-shadow:
      0 0 0 2px rgba(32,21,39,.98),
      0 0 30px rgba(169,46,210,.20),
      inset 0 0 42px rgba(0,0,0,.60) !important;
  }

  .pn-r3-pointer{
    top:-7px !important;
    border-left-width:12px !important;
    border-right-width:12px !important;
    border-bottom-width:28px !important;
    border-bottom-color:#f7e8ff !important;
    filter:
      drop-shadow(0 0 6px rgba(222,144,255,.55))
      drop-shadow(0 6px 10px rgba(255,35,83,.18)) !important;
  }

  .pn-r3-pointer:after{
    content:"";
    position:absolute;
    width:3px;
    height:8px;
    left:-1px;
    top:17px;
    background:#ff315f;
    box-shadow:0 0 8px rgba(255,49,95,.70);
  }

  .pn-r3-wheel-label{
    width:40% !important;
    font-size:8.5px !important;
    letter-spacing:.015em;
    line-height:1.1;
    text-shadow:
      0 1px 3px rgba(0,0,0,.95),
      0 0 7px rgba(255,255,255,.08) !important;
  }

  .pn-r3-core{
    width:58px !important;
    height:58px !important;
    border-color:rgba(219,134,255,.82) !important;
    background:
      radial-gradient(circle at 42% 36%,rgba(101,28,124,.68),#120d16 67%) !important;
    box-shadow:
      0 0 22px rgba(181,55,227,.23),
      inset 0 0 12px rgba(255,255,255,.025) !important;
  }

  .pn-r3-spin{
    position:relative;
    min-width:224px !important;
    letter-spacing:.055em;
    box-shadow:0 0 18px rgba(162,51,208,.12);
  }

  .pn-r3-spin:not(:disabled):hover{
    box-shadow:0 0 24px rgba(194,70,244,.22);
  }

  .pn-r3-protocol-key{
    border-top:1px solid rgba(160,82,196,.20);
    padding-top:9px !important;
  }

  .pn-r3-result-zone{
    position:relative;
    min-height:98px;
    border-color:rgba(167,83,211,.57) !important;
    background:
      linear-gradient(100deg,rgba(50,9,63,.22),rgba(10,7,14,.91) 54%),
      rgba(10,7,14,.92) !important;
    box-shadow:inset 3px 0 0 rgba(193,65,240,.22);
  }

  .pn-r3-result-zone:has(.pn-r3-protocol-terminal){
    border-color:rgba(220,67,246,.76) !important;
    box-shadow:
      inset 3px 0 0 #ff315f,
      0 0 34px rgba(162,46,209,.13);
  }

  .pn-r3-protocol-title b{
    text-shadow:
      1px 0 0 rgba(255,52,89,.42),
      -1px 0 0 rgba(151,58,236,.46),
      0 0 18px rgba(202,75,255,.16);
    animation:pnProtocolGlitch 6.2s steps(1,end) infinite;
  }

  .pn-r3-split,
  .pn-r3-awaiting-split{
    border-color:rgba(181,94,219,.52) !important;
    background:rgba(12,8,16,.66);
  }

  .pn-r3-split>div:first-child,
  .pn-r3-awaiting-split>div:first-child{
    box-shadow:inset 2px 0 0 rgba(255,54,94,.24);
  }

  .pn-r3-split>div:last-child,
  .pn-r3-awaiting-split>div:last-child{
    box-shadow:inset -2px 0 0 rgba(178,72,228,.18);
  }

  .pn-r3-commit{
    background:linear-gradient(100deg,#9b1b45,#8b239d) !important;
    border-color:#d9438c !important;
    color:#fff !important;
    box-shadow:
      0 0 18px rgba(227,50,111,.15),
      inset 0 0 14px rgba(255,255,255,.025) !important;
    animation:pnCommitPulse 2.9s ease-in-out infinite;
  }

  .pn-r3-defy{
    border-color:rgba(137,115,146,.45) !important;
    background:rgba(23,20,27,.70) !important;
  }

  .pn-r3-awaiting{
    border-color:rgba(222,63,117,.64) !important;
    background:
      linear-gradient(115deg,rgba(91,12,42,.20),rgba(27,8,37,.16),rgba(10,7,14,.93)) !important;
    box-shadow:
      inset 3px 0 0 #ff315f,
      0 0 36px rgba(197,49,97,.08) !important;
  }

  .pn-r3-awaiting .panel-head h2{
    color:#f3dbe7;
    text-shadow:0 0 11px rgba(255,53,96,.16);
  }

  .pn-r3-result-form button{
    min-height:38px;
  }

  @keyframes pnCurseScan{
    0%{transform:translateY(-3px)}
    50%{transform:translateY(3px)}
    100%{transform:translateY(-3px)}
  }

  @keyframes pnCurseBlink{
    0%,88%,100%{opacity:.92}
    89%{opacity:.24}
    90%{opacity:1}
    92%{opacity:.38}
    94%{opacity:.92}
  }

  @keyframes pnSigilSpin{to{transform:rotate(360deg)}}
  @keyframes pnSigilSpinReverse{to{transform:rotate(-360deg)}}

  @keyframes pnMoneyBreath{
    0%,100%{filter:brightness(1)}
    50%{filter:brightness(1.10)}
  }

  @keyframes pnDamageFlicker{
    0%,82%,100%{opacity:1;transform:translateX(0)}
    83%{opacity:.72;transform:translateX(1px)}
    84%{opacity:1;transform:translateX(-1px)}
    85%{transform:translateX(0)}
  }

  @keyframes pnProtocolGlitch{
    0%,91%,100%{transform:translateX(0);filter:none}
    92%{transform:translateX(1px);filter:brightness(1.18)}
    93%{transform:translateX(-1px)}
    94%{transform:translateX(0)}
  }

  @keyframes pnCommitPulse{
    0%,100%{filter:brightness(1);box-shadow:0 0 18px rgba(227,50,111,.15)}
    50%{filter:brightness(1.06);box-shadow:0 0 26px rgba(227,50,111,.23)}
  }

  @media(max-width:900px){
    .pn-curse-rail{grid-template-columns:1fr 1fr}
    .pn-r3-wheel-shell{width:min(286px,78vw) !important}
  }

  @media(max-width:620px){
    .pn-curse-rail{grid-template-columns:1fr}
    .pn-curse-rail span{border-right:0;border-bottom:1px solid rgba(165,85,205,.18)}
  }
  `;

  document.head.appendChild(style);
})();
