"use strict";

/*
  PROFITNODE COMMAND SEPARATOR TUNE v1
  Slightly stronger borders, dividers, and spacing for THE COMMAND.
*/

(function installProfitnodeCommandSeparatorTune(){
  const style = document.createElement("style");
  style.textContent = `
  .pn-command-content{
    padding-top:2px;
  }

  .pn-command-status,
  .pn-command-panel,
  .pn-terminal-kpi,
  .pn-hunt-card,
  .pn-opportunity-card,
  .pn-intel-strip,
  .pn-health-grid{
    border-color:rgba(150,100,205,.42) !important;
  }

  .pn-command-status{
    margin-bottom:17px;
    box-shadow:
      0 12px 34px rgba(0,0,0,.16),
      inset 0 0 0 1px rgba(175,110,235,.08);
  }

  .pn-command-status>div{
    padding:10px 15px;
    border-right-color:rgba(150,100,205,.40) !important;
  }

  .pn-command-hero{
    gap:17px;
    margin-bottom:17px;
  }

  .pn-profit-core{
    border-color:rgba(176,84,245,.62);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.028),
      0 18px 50px rgba(0,0,0,.20),
      inset 0 0 0 1px rgba(192,96,255,.05);
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
    border-top-color:rgba(167,55,236,.78) !important;
    box-shadow:inset 0 0 0 1px rgba(181,105,234,.04);
  }

  .pn-command-grid{
    gap:17px;
    margin-bottom:17px;
  }

  .pn-command-panel{
    box-shadow:
      0 12px 34px rgba(0,0,0,.15),
      inset 0 0 0 1px rgba(177,110,228,.04);
  }

  .pn-command-panel .panel-head{
    border-bottom:1px solid rgba(150,100,205,.36);
  }

  .pn-condition-list>div,
  .pn-op-row,
  .pn-rig-snapshot,
  .pn-signal-row,
  .pn-health-grid>div,
  .pn-intel-cell{
    border-color:rgba(150,100,205,.34) !important;
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