"use strict";

/*
  PROFITNODE COMMAND SEPARATOR TUNE v2
  Restrained separators, spacing, and depth hierarchy for THE COMMAND.
*/

(function installProfitnodeCommandSeparatorTune(){
  const style = document.createElement("style");
  style.textContent = `
  .pn-command-content{
    padding-top:2px;
  }

  .main:has(.pn-command-content){
    background-color:rgba(8,6,11,.18);
  }

  .pn-command-content:before{
    opacity:.08;
  }

  .pn-command-status,
  .pn-command-panel,
  .pn-terminal-kpi,
  .pn-hunt-card,
  .pn-opportunity-card,
  .pn-intel-strip,
  .pn-health-grid{
    border-color:rgba(170,90,220,.18) !important;
  }

  .pn-command-status{
    margin-bottom:17px;
    background:rgba(14,11,19,.88);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.025),
      inset 1px 0 0 rgba(255,255,255,.02),
      0 4px 14px rgba(0,0,0,.22);
  }

  .pn-command-status>div{
    padding:10px 15px;
    border-right-color:rgba(170,90,220,.16) !important;
  }

  .pn-command-telemetry:before{
    opacity:.08;
  }

  .pn-command-hero{
    gap:17px;
    margin-bottom:17px;
  }

  .pn-profit-core{
    border-color:rgba(176,84,245,.62);
  }

  .pn-command-content .pn-command-hero-finance .pn-profit-core{
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.045),
      inset 1px 0 0 rgba(255,255,255,.03),
      0 10px 30px rgba(0,0,0,.32),
      0 0 36px rgba(176,84,245,.055);
  }

  .pn-command-content .pn-profit-value.pos{
    isolation:isolate;
    text-shadow:none;
  }

  .pn-command-content .pn-profit-value.pos:before{
    content:"";
    position:absolute;
    z-index:-1;
    left:-6%;
    top:50%;
    width:72%;
    height:112px;
    transform:translateY(-50%);
    background:radial-gradient(ellipse at 36% 50%,rgba(62,207,126,.105),rgba(62,207,126,.035) 38%,transparent 72%);
    filter:blur(14px);
    pointer-events:none;
  }

  .pn-profit-sub{
    margin-top:22px;
    padding-top:16px;
    border-top-color:rgba(255,255,255,.10);
  }

  .pn-command-kpi-stack{
    gap:12px;
  }

  .pn-terminal-kpi{
    padding:16px;
    border-top-color:rgba(170,90,220,.18) !important;
  }

  .pn-command-content .pn-financial-matrix .pn-terminal-kpi{
    background:rgba(14,11,19,.88);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.025),
      inset 1px 0 0 rgba(255,255,255,.02),
      0 4px 14px rgba(0,0,0,.22);
  }

  .pn-command-content .pn-financial-matrix .pn-terminal-kpi.is-major{
    background:linear-gradient(155deg,rgba(70,25,82,.18),rgba(14,11,19,.88) 68%);
  }

  .pn-command-grid{
    gap:17px;
    margin-bottom:17px;
  }

  .pn-command-panel{
    background:rgba(14,11,19,.88);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.025),
      inset 1px 0 0 rgba(255,255,255,.02),
      0 4px 14px rgba(0,0,0,.22);
  }

  .pn-command-panel:before{
    opacity:.05;
  }

  .pn-command-panel .panel-head{
    border-bottom:1px solid rgba(170,90,220,.15);
    background:
      linear-gradient(180deg,rgba(255,255,255,.022),rgba(0,0,0,.065)),
      rgba(12,9,16,.36);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.018);
  }

  .pn-command-panel .panel-head:after{
    background:linear-gradient(90deg,rgba(205,211,216,.20),rgba(167,71,215,.13) 42%,transparent 82%);
  }

  .pn-command-priority{
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.035),
      inset 1px 0 0 rgba(255,255,255,.025),
      0 8px 24px rgba(0,0,0,.30);
  }

  .pn-command-priority.is-good{
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035),inset 1px 0 0 rgba(255,255,255,.025),0 8px 24px rgba(0,0,0,.30),0 0 22px rgba(62,207,126,.05);
  }

  .pn-command-priority.is-active{
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035),inset 1px 0 0 rgba(255,255,255,.025),0 8px 24px rgba(0,0,0,.30),0 0 22px rgba(183,92,236,.06);
  }

  .pn-command-priority.is-warn{
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035),inset 1px 0 0 rgba(255,255,255,.025),0 8px 24px rgba(0,0,0,.30),0 0 22px rgba(245,158,11,.055);
  }

  .pn-command-priority.is-danger{
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035),inset 1px 0 0 rgba(255,255,255,.025),0 8px 24px rgba(0,0,0,.30),0 0 22px rgba(220,38,38,.06);
  }

  .pn-condition-list>div,
  .pn-op-row,
  .pn-rig-snapshot,
  .pn-signal-row,
  .pn-health-grid>div,
  .pn-intel-cell{
    border-color:rgba(170,90,220,.18) !important;
  }

  .pn-condition-list>div{
    min-height:43px;
  }

  .pn-op-row,
  .pn-rig-snapshot,
  .pn-signal-row{
    padding:11px 16px;
  }

  .pn-hunt-card,
  .pn-opportunity-card{
    box-shadow:inset 0 0 0 1px rgba(186,114,240,.05);
  }

  .pn-build-opportunities,
  .pn-health-panel{
    margin-bottom:17px !important;
  }

  .pn-intel-strip,
  .pn-health-grid{
    margin-bottom:16px;
  }

  @media(max-width:1180px){
    .pn-command-status{
      margin-bottom:16px;
    }
    .pn-command-hero,
    .pn-command-grid,
    .pn-build-opportunities,
    .pn-health-panel{
      gap:16px;
      margin-bottom:16px !important;
    }
  }
  `;
  document.head.appendChild(style);
})();
