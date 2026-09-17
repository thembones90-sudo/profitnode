"use strict";

/*
  PROFITNODE — PROFIT BLUEPRINTS VISUAL V1
  Readability-only pass.

  Scope:
  - Bigger typography
  - Stronger hierarchy
  - Taller component rows
  - Larger metrics / doctrine text
  - More readable footer / procurement doctrine
  - No blueprint data or accounting changes
  - No Build Workspace changes
*/
(function installProfitBlueprintsVisualV1(){
  if (window.__pnProfitBlueprintsVisualV1Installed) return;
  window.__pnProfitBlueprintsVisualV1Installed = true;

  const style = document.createElement("style");
  style.id = "pn-profit-blueprints-visual-v1";

  style.textContent = `
/* ============================================================
   PROFIT BLUEPRINTS — READABILITY PASS V1
   ============================================================ */

/* Tabs: stop making primary navigation look like a legal footnote. */
.pn-bp-tabs button{
  min-height:42px !important;
  padding:12px 18px !important;
  font-size:11px !important;
  line-height:1.05 !important;
  letter-spacing:.105em !important;
}

/* Doctrine strip */
.pn-bp-doctrine-banner>div{
  min-height:86px !important;
  padding:14px 16px !important;
  gap:8px !important;
}
.pn-bp-doctrine-banner span{
  font-size:9px !important;
  line-height:1.25 !important;
  letter-spacing:.13em !important;
}
.pn-bp-doctrine-banner b{
  font-size:15px !important;
  line-height:1.22 !important;
  letter-spacing:.015em !important;
}

/* Intro doctrine panel */
.pn-bp-intro{
  padding:18px 20px !important;
  gap:26px !important;
}
.pn-bp-intro span{
  font-size:9px !important;
  line-height:1.15 !important;
}
.pn-bp-intro h2{
  margin-top:7px !important;
  font-size:27px !important;
  line-height:1.05 !important;
  letter-spacing:.045em !important;
}
.pn-bp-intro p{
  font-size:13px !important;
  line-height:1.55 !important;
}

/* Card headers */
.pn-bp-card-head{
  padding:18px 18px 16px !important;
  gap:16px !important;
}
.pn-bp-unit{
  font-size:8.5px !important;
  line-height:1.1 !important;
  letter-spacing:.16em !important;
}
.pn-bp-card h2{
  margin:7px 0 6px !important;
  font-size:34px !important;
  line-height:.98 !important;
  letter-spacing:.055em !important;
}
.pn-bp-card-head p{
  font-size:11.5px !important;
  line-height:1.4 !important;
}
.pn-bp-badges{
  gap:7px !important;
}
.pn-bp-badges .chip{
  padding:5px 8px !important;
  font-size:9.5px !important;
  line-height:1 !important;
  letter-spacing:.08em !important;
}

/* Cost KPIs */
.pn-bp-cost-strip>div{
  min-height:72px !important;
  padding:12px 14px !important;
  gap:7px !important;
}
.pn-bp-cost-strip span{
  font-size:8px !important;
  line-height:1.15 !important;
  letter-spacing:.11em !important;
}
.pn-bp-cost-strip b{
  font-size:15px !important;
  line-height:1.15 !important;
  letter-spacing:.01em !important;
}

/* Component list: biggest readability offender in V1. */
.pn-bp-parts{
  padding:9px 14px !important;
}
.pn-bp-part{
  min-height:46px !important;
  grid-template-columns:66px minmax(0,1fr) auto !important;
  gap:12px !important;
}
.pn-bp-slot{
  font-size:8.5px !important;
  line-height:1.1 !important;
  letter-spacing:.105em !important;
}
.pn-bp-part b{
  font-size:11.5px !important;
  line-height:1.32 !important;
  font-weight:800 !important;
}
.pn-bp-part strong{
  font-size:9.5px !important;
  line-height:1.1 !important;
}

/* Unit field note */
.pn-bp-doctrine{
  margin:7px 14px 14px !important;
  padding:12px 13px !important;
  font-size:11.5px !important;
  line-height:1.5 !important;
}

/* Footer / research line / deploy */
.pn-bp-card-foot{
  padding:13px 14px 14px !important;
  gap:12px !important;
}
.pn-bp-card-foot>span{
  font-size:7.5px !important;
  line-height:1.35 !important;
  letter-spacing:.08em !important;
}
.pn-bp-card-foot .btn{
  min-width:148px !important;
  min-height:40px !important;
  padding:10px 13px !important;
  font-size:10.5px !important;
  line-height:1 !important;
  letter-spacing:.035em !important;
}

/* Bottom procurement doctrine */
.pn-bp-note{
  margin-top:16px !important;
  padding-top:14px !important;
  padding-bottom:14px !important;
  font-size:12.5px !important;
  line-height:1.55 !important;
}
.pn-bp-note b{
  font-size:12.5px !important;
  letter-spacing:.035em !important;
}

/* Preserve three-column desktop structure while making cards breathe. */
@media(min-width:1181px){
  .pn-bp-grid{
    gap:16px !important;
  }
}

/* Tablet */
@media(max-width:1180px){
  .pn-bp-card h2{
    font-size:32px !important;
  }
  .pn-bp-part b{
    font-size:12px !important;
  }
}

/* Mobile: still readable, not gigantic. */
@media(max-width:820px){
  .pn-bp-tabs button{
    font-size:10px !important;
  }
  .pn-bp-doctrine-banner b{
    font-size:14px !important;
  }
  .pn-bp-intro h2{
    font-size:25px !important;
  }
  .pn-bp-card h2{
    font-size:31px !important;
  }
  .pn-bp-part{
    min-height:44px !important;
  }
}
@media(max-width:520px){
  .pn-bp-card h2{
    font-size:29px !important;
  }
  .pn-bp-part{
    grid-template-columns:56px minmax(0,1fr) !important;
    gap:9px !important;
  }
  .pn-bp-part strong{
    grid-column:2 !important;
    font-size:9.5px !important;
    padding-bottom:6px !important;
  }
  .pn-bp-doctrine{
    font-size:11px !important;
  }
}
`;

  document.head.appendChild(style);
  console.info("[PROFITNODE] PROFIT BLUEPRINTS VISUAL V1 ACTIVE — readability pass");
})();
