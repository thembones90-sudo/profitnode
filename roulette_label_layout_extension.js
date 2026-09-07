"use strict";

/*
  PROFITNODE Roulette Label Layout Fix v3

  Deterministic sector-center coordinates.
  No chained rotate/translate positioning. No geometry improvisation.
  The wheel still rotates, but each label has a fixed anchor point inside its
  canonical sector and only counter-rotates its own text orientation.
*/

(function installRouletteLabelLayoutFixV3(){
  const style = document.createElement("style");

  style.textContent = `
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

  /*
    WHEEL #1
    Sector centers:
      BET        = 60deg
      FUCK OFF   = 180deg
      SAVE MONEY = 300deg
  */
  .pn-r3-verdict-wheel .pn-r3-wheel-label{
    width:30% !important;
    max-width:30% !important;
    font-size:8.4px !important;
    line-height:1 !important;
    letter-spacing:.01em !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(1){
    left:76.85% !important;
    top:34.50% !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(2){
    left:50.00% !important;
    top:81.00% !important;
  }

  .pn-r3-verdict-wheel .pn-r3-wheel-label:nth-of-type(3){
    left:23.15% !important;
    top:34.50% !important;
  }

  /*
    WHEEL #2
    Seven exact sector-center anchors, radius ~34% of wheel diameter.
    This creates a protected central dead zone around the R hub and prevents
    neighboring labels from barging into each other like drunk accountants.
  */
  .pn-r3-wager-wheel .pn-r3-wheel-label{
    width:22% !important;
    max-width:22% !important;
    font-size:7.0px !important;
    line-height:1 !important;
    letter-spacing:.015em !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(1){
    left:64.75% !important;
    top:19.37% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(2){
    left:83.15% !important;
    top:42.43% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(3){
    left:76.58% !important;
    top:71.20% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(4){
    left:50.00% !important;
    top:84.00% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(5){
    left:23.42% !important;
    top:71.20% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(6){
    left:16.85% !important;
    top:42.43% !important;
  }

  .pn-r3-wager-wheel .pn-r3-wheel-label:nth-of-type(7){
    left:35.25% !important;
    top:19.37% !important;
  }

  .pn-r3-wager-wheel .pn-r3-core{
    box-shadow:
      0 0 0 10px rgba(10,7,14,.28),
      0 0 22px rgba(181,55,227,.23),
      inset 0 0 12px rgba(255,255,255,.025) !important;
  }

  @media(max-width:900px){
    .pn-r3-verdict-wheel .pn-r3-wheel-label{
      font-size:8px !important;
    }

    .pn-r3-wager-wheel .pn-r3-wheel-label{
      width:23% !important;
      max-width:23% !important;
      font-size:6.6px !important;
    }
  }
  `;

  document.head.appendChild(style);
})();
