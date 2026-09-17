"use strict";

/* PROFITNODE — RARE HONOR GUARD ART V4
   Desktop visual skin for the RARE Profit Blueprints roster.
   Uses generated picture layers as presentation only.
   Does not touch blueprint data, deployment logic, SHOP FUND, or Build Workspace. */
(function(){
  if (window.__pnRareHonorGuardArtV4Installed) return;
  window.__pnRareHonorGuardArtV4Installed = true;

  const ASSET = "assets/profit_blueprints/rare_v4/";
  const style = document.createElement("style");
  style.id = "pn-rare-honor-guard-art-v4-style";
  style.textContent = `
  .pn-rv3-page.is-rare{
    position:relative;
    isolation:isolate;
    --rhg-blue:#27b8ff;
    --rhg-cyan:#4de2ff;
    --rhg-violet:#b83cff;
  }
  .pn-rv3-page.is-rare::before{
    content:"";
    position:absolute;
    inset:-18px -18px -28px;
    z-index:-2;
    pointer-events:none;
    background:
      linear-gradient(rgba(4,7,12,.84),rgba(4,7,12,.88)),
      url("${ASSET}rare_page_bg.png?v=4") center top/cover no-repeat;
    opacity:.88;
  }
  .pn-rv3-page.is-rare::after{
    content:"";
    position:absolute;
    inset:-18px -18px -28px;
    z-index:-1;
    pointer-events:none;
    background:
      radial-gradient(circle at 50% 7%,rgba(28,149,255,.10),transparent 27%),
      radial-gradient(circle at 90% 62%,rgba(111,47,255,.08),transparent 25%);
  }

  .pn-rv3-page.is-rare .pn-rv3-tabs,
  .pn-rv3-page.is-rare .pn-rv3-tier-tabs{
    position:relative;
    z-index:2;
  }
  .pn-rv3-page.is-rare .pn-rv3-tabs{
    gap:0;
    margin-bottom:8px;
    border-bottom-color:rgba(50,180,255,.22);
  }
  .pn-rv3-page.is-rare .pn-rv3-tabs button{
    min-width:230px;
    min-height:46px;
    background:linear-gradient(180deg,rgba(10,19,31,.94),rgba(5,10,17,.94));
    border-color:rgba(55,166,224,.38);
    color:#87abc1;
    box-shadow:inset 0 0 16px rgba(39,184,255,.025);
  }
  .pn-rv3-page.is-rare .pn-rv3-tabs .active{
    color:#eefaff;
    border-color:rgba(48,192,255,.75);
    background:linear-gradient(180deg,rgba(16,56,87,.7),rgba(6,20,34,.9));
    box-shadow:inset 0 -2px 0 #2fc8ff,0 0 14px rgba(47,200,255,.14);
  }
  .pn-rv3-page.is-rare .pn-rv3-tier-tabs{
    gap:7px;
    margin-bottom:12px;
  }
  .pn-rv3-page.is-rare .pn-rv3-tier-tabs button{
    min-height:34px;
    padding:8px 16px;
    background:linear-gradient(180deg,rgba(8,15,24,.96),rgba(4,9,15,.96));
    border-color:rgba(54,140,185,.32);
  }
  .pn-rv3-page.is-rare .pn-rv3-tier-tabs .active.rare{
    color:#62ddff;
    border-color:#2bbaff;
    box-shadow:inset 0 0 12px rgba(38,190,255,.10),0 0 12px rgba(38,190,255,.12);
  }

  @media (min-width:1181px){
    .pn-rv3-page.is-rare .pn-rv3-hero{
      display:block;
      width:100%;
      height:clamp(145px,11.8vw,205px);
      min-height:0;
      margin:0 0 12px;
      padding:0;
      border:0;
      background:url("${ASSET}honor_guard_hero.png?v=4") center/100% 100% no-repeat;
      box-shadow:0 0 20px rgba(41,170,255,.07);
      overflow:hidden;
    }
    .pn-rv3-page.is-rare .pn-rv3-hero>*{visibility:hidden!important;}

    .pn-rv3-page.is-rare .pn-rv3-laws{
      display:block;
      width:100%;
      height:clamp(92px,7.2vw,124px);
      min-height:0;
      margin:0 0 14px;
      padding:0;
      border:0;
      background:url("${ASSET}rare_doctrine_strip.png?v=4") center/100% 100% no-repeat;
      box-shadow:0 0 16px rgba(36,175,255,.05);
      overflow:hidden;
    }
    .pn-rv3-page.is-rare .pn-rv3-laws>*{visibility:hidden!important;}

    .pn-rv3-page.is-rare .pn-rv3-grid{
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:12px;
      align-items:stretch;
    }
    .pn-rv3-page.is-rare .pn-rv3-card{
      min-height:0;
      aspect-ratio:2 / 3;
      border:0!important;
      background-color:transparent!important;
      background-repeat:no-repeat!important;
      background-position:center!important;
      background-size:100% 100%!important;
      box-shadow:none!important;
      overflow:visible;
      transform:translateZ(0);
      transition:transform .16s ease, filter .16s ease;
    }
    .pn-rv3-page.is-rare .pn-rv3-card:hover{
      transform:translateY(-2px);
      filter:drop-shadow(0 0 10px rgba(49,186,255,.22));
    }
    .pn-rv3-page.is-rare .pn-rv3-card::before{display:none!important;}
    .pn-rv3-page.is-rare .pn-rv3-card.is-steel{background-image:url("${ASSET}stone_guard_card.png?v=4")!important;}
    .pn-rv3-page.is-rare .pn-rv3-card.is-blood{background-image:url("${ASSET}blood_guard_card.png?v=4")!important;}
    .pn-rv3-page.is-rare .pn-rv3-card.is-legion{background-image:url("${ASSET}legionnaire_card.png?v=4")!important;}

    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-card-head,
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-budget,
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-section,
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-note,
    .pn-rv3-page.is-rare .pn-rv3-card>footer{
      display:none!important;
    }
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-deploy{
      display:block!important;
      position:absolute!important;
      z-index:5;
      left:8.8%!important;
      right:8.8%!important;
      top:83.0%!important;
      width:auto!important;
      height:7.0%!important;
      min-height:0!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      background:url("${ASSET}muster_build_button.png?v=4") center/100% 100% no-repeat!important;
      color:transparent!important;
      font-size:0!important;
      opacity:.005;
      cursor:pointer;
      box-shadow:none!important;
      transition:opacity .15s ease,filter .15s ease;
    }
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-deploy span{display:none!important;}
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-deploy:hover,
    .pn-rv3-page.is-rare .pn-rv3-card>.pn-rv3-deploy:focus-visible{
      opacity:.24;
      filter:drop-shadow(0 0 13px rgba(206,57,255,.85));
      outline:none!important;
    }

    .pn-rv3-page.is-rare .pn-rv3-procurement{
      width:100%;
      height:clamp(76px,6.2vw,104px);
      min-height:0;
      margin:10px 0 0;
      padding:0;
      border:0!important;
      background:url("${ASSET}procurement_law_strip.png?v=4") center/100% 100% no-repeat;
      color:transparent!important;
      font-size:0!important;
      overflow:hidden;
    }
    .pn-rv3-page.is-rare .pn-rv3-procurement *{visibility:hidden!important;}
  }

  @media (max-width:1180px){
    .pn-rv3-page.is-rare::before{opacity:.32;}
    .pn-rv3-page.is-rare .pn-rv3-card{box-shadow:0 0 0 1px rgba(71,169,235,.1)!important;}
  }
  `;
  document.head.appendChild(style);
  console.info("[PROFITNODE] RARE HONOR GUARD ART V4 ACTIVE");
})();
