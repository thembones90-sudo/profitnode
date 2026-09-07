"use strict";

/*
  PROFITNODE Roulette Label Layout Fix v2

  Deliberately CSS-only.
  The failed v1 attempted to rewrite rouletteWheelLabels() and damaged the
  function boundary. This layer leaves the proven V4 JS untouched and only
  changes label geometry.

  Existing wheel custom properties are reused:
    --a      sector angle
    --neg-a  counter-rotation for sector angle
    --neg-r  counter-rotation for final wheel rotation
*/

(function installRouletteLabelLayoutFixV2(){
  const style = document.createElement("style");

  style.textContent = `
  /*
    Wheel #1:
    Give each word a compact box and move its center well outside the PN hub.
  */
  .pn-r3-verdict-wheel .pn-r3-wheel-label{
    width:26% !important;
    font-size:8.4px !important;
    line-height:1.05 !important;
    letter-spacing:.015em !important;
    white-space:normal !important;
    transform:
      rotate(var(--a))
      translate(88%,-50%)
      rotate(var(--neg-a))
      rotate(var(--neg-r)) !important;
  }

  /*
    Wheel #2:
    Seven sectors need much narrower boxes and a substantially larger radial
    offset. The old 40% boxes starting only ~14% from the hub were literally
    occupying each other's living rooms.
  */
  .pn-r3-wager-wheel .pn-r3-wheel-label{
    width:19% !important;
    max-width:19% !important;
    font-size:7.0px !important;
    line-height:1.02 !important;
    letter-spacing:.02em !important;
    white-space:normal !important;
    transform:
      rotate(var(--a))
      translate(136%,-50%)
      rotate(var(--neg-a))
      rotate(var(--neg-r)) !important;
  }

  /*
    Slightly stronger legibility without making the labels glow like a
    nightclub evacuation sign.
  */
  .pn-r3-verdict-wheel .pn-r3-wheel-label,
  .pn-r3-wager-wheel .pn-r3-wheel-label{
    text-shadow:
      0 1px 3px rgba(0,0,0,.98),
      0 0 5px rgba(255,255,255,.06) !important;
    pointer-events:none;
  }

  /*
    Protect the central dead zone visually. It helps separate the labels from
    the hub even when a long protocol name is nearby.
  */
  .pn-r3-wager-wheel .pn-r3-core{
    box-shadow:
      0 0 0 8px rgba(10,7,14,.26),
      0 0 22px rgba(181,55,227,.23),
      inset 0 0 12px rgba(255,255,255,.025) !important;
  }

  @media(max-width:900px){
    .pn-r3-wager-wheel .pn-r3-wheel-label{
      width:18% !important;
      max-width:18% !important;
      font-size:6.7px !important;
      transform:
        rotate(var(--a))
        translate(145%,-50%)
        rotate(var(--neg-a))
        rotate(var(--neg-r)) !important;
    }
  }
  `;

  document.head.appendChild(style);
})();