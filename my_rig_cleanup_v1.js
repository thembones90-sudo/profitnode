"use strict";

/*
  PROFITNODE MY RIG CLEANUP V1
  Visual/semantic cleanup only.

  Safety doctrine:
  - no MutationObserver
  - no global render() wrapper
  - no Store writes
  - no Actions writes
  - no hardware/rating/compatibility changes
  - only wraps MY RIG HTML helpers and adds CSS
*/

(function(){
  if (window.__PN_MY_RIG_CLEANUP_V1) return;
  window.__PN_MY_RIG_CLEANUP_V1 = true;

  /* -----------------------------------------------------------
     1) Screen wrapper:
        Insert a restrained SETUP / PERIPHERALS divider before MONITOR.
        Core hardware stays visually primary.
  ----------------------------------------------------------- */
  if (typeof myRigScreenHtml === "function"){
    const PNMyRigCoreScreenHtml = myRigScreenHtml;

    myRigScreenHtml = function(rig){
      let html = PNMyRigCoreScreenHtml.apply(this, arguments);

      const divider =
        '<div class="pn-myrig-cleanup-group-label" aria-hidden="true">' +
          '<span>SETUP / PERIPHERALS</span>' +
        '</div>';

      /* Works for either a filled div card or an empty button card. */
      const monitorCard = /(<(?:div|button)\s+class="pn-myrig-slot[^"]*"[^>]*data-myrig-slot="MONITOR")/;

      if (monitorCard.test(html) && !html.includes("pn-myrig-cleanup-group-label")){
        html = html.replace(monitorCard, divider + "$1");
      }

      return html;
    };
  }

  /* -----------------------------------------------------------
     2) Hero wrapper:
        Break the long one-line hardware summary into two deliberate
        lines after CPU / GPU / RAM. Nothing about the underlying
        identity or hardware data changes.
  ----------------------------------------------------------- */
  if (typeof myRigHeroHtml === "function"){
    const PNMyRigCoreHeroHtml = myRigHeroHtml;

    myRigHeroHtml = function(rig){
      let html = PNMyRigCoreHeroHtml.apply(this, arguments);

      html = String(html).replace(
        /<div class="pn-myrig-summary">([^<]*)<\/div>/,
        function(_all, inner){
          const parts = String(inner).split(" · ").filter(Boolean);
          if (parts.length <= 3) return _all;

          const top = parts.slice(0,3).join(" · ");
          const bottom = parts.slice(3).join(" · ");

          return '<div class="pn-myrig-summary pn-myrig-cleanup-summary">' +
            '<span class="pn-myrig-summary-primary">' + top + '</span>' +
            '<span class="pn-myrig-summary-secondary">' + bottom + '</span>' +
          '</div>';
        }
      );

      return html;
    };
  }

  /* -----------------------------------------------------------
     3) Loadout counter:
        Strengthen 11/11 only when the profile is actually complete.
  ----------------------------------------------------------- */
  if (typeof myRigLoadoutHtml === "function"){
    const PNMyRigCoreLoadoutHtml = myRigLoadoutHtml;

    myRigLoadoutHtml = function(rig){
      let html = PNMyRigCoreLoadoutHtml.apply(this, arguments);

      try{
        const total = Array.isArray(MY_RIG_LOADOUT_ORDER) ? MY_RIG_LOADOUT_ORDER.length : 0;
        const tracked = rig && rig.slots ? Object.keys(rig.slots).length : 0;

        if (total > 0 && tracked === total){
          const needle =
            '<span class="pn-myrig-counter">' +
            tracked + " / " + total + " TRACKED</span>";

          const replacement =
            '<span class="pn-myrig-counter pn-myrig-cleanup-counter">' +
              '<b>' + tracked + " / " + total + '</b>' +
              '<span>TRACKED</span>' +
              '<em>FULL PROFILE</em>' +
            '</span>';

          html = String(html).replace(needle, replacement);
        }
      }catch(_){}

      return html;
    };
  }

  if (typeof document !== "undefined" && document.createElement){
    const style = document.createElement("style");
    style.id = "pn-myrig-cleanup-v1";

    style.textContent = `
/* ============================================================
   PROFITNODE MY RIG CLEANUP V1
   Visual hierarchy pass. No logic.
============================================================ */

/* --- three-column composition: pull the side hardware inward --- */
.pn-myrig-screen{
  grid-template-columns:1fr minmax(300px,1.32fr) 1fr;
  gap:10px;
}
.pn-myrig-col{
  gap:9px;
}

/* --- loadout header status --- */
.pn-myrig-cleanup-counter{
  display:flex;
  align-items:center;
  gap:6px;
  color:var(--muted);
}
.pn-myrig-cleanup-counter b{
  color:var(--text);
  font:800 10px var(--mono);
  letter-spacing:.1em;
}
.pn-myrig-cleanup-counter span{
  font:9px var(--mono);
  letter-spacing:.12em;
}
.pn-myrig-cleanup-counter em{
  font:800 7.5px var(--mono);
  font-style:normal;
  letter-spacing:.1em;
  color:var(--green);
  border:1px solid rgba(62,207,126,.28);
  border-radius:3px;
  padding:2px 5px;
  background:rgba(62,207,126,.05);
}

/* --- core component cards: normalized internal rhythm --- */
.pn-myrig-slot.is-filled{
  min-height:96px;
  padding:10px 12px;
}
.pn-myrig-slot-top{
  min-height:18px;
}
.pn-myrig-slot-model{
  min-height:31px;
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  line-clamp:2;
  overflow:hidden;
  align-content:start;
}
.pn-myrig-slot-spec{
  min-height:14px;
}
.pn-myrig-slot-meta{
  margin-top:auto;
}

/* tier badges stay pinned and visually consistent */
.pn-myrig-slot-tier{
  min-width:44px;
  min-height:17px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
}

/* --- storage stack: compact telemetry, not a spreadsheet --- */
[data-myrig-slot="STORAGE"] .pn-myrig-stack{
  gap:2px;
  margin-top:2px;
  padding:5px 6px 0;
  background:rgba(255,255,255,.012);
  border-top:1px dashed rgba(139,132,149,.35);
}
[data-myrig-slot="STORAGE"] .pn-myrig-stack-row{
  min-height:14px;
  gap:10px;
  font-size:8.5px;
}
[data-myrig-slot="STORAGE"] .pn-myrig-stack-row span{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
[data-myrig-slot="STORAGE"] .pn-myrig-stack-row b{
  min-width:32px;
  text-align:right;
  font-size:8.5px;
  font-variant-numeric:tabular-nums;
  color:var(--green);
}
[data-myrig-slot="STORAGE"] .pn-myrig-stack-sum{
  margin-top:2px;
  padding-bottom:2px;
}

/* --- peripherals become subordinate to the machine itself --- */
.pn-myrig-cleanup-group-label{
  display:flex;
  align-items:center;
  gap:8px;
  margin:3px 0 -1px;
  color:var(--muted);
  opacity:.72;
}
.pn-myrig-cleanup-group-label::after{
  content:"";
  height:1px;
  flex:1;
  background:linear-gradient(90deg,rgba(139,132,149,.36),transparent);
}
.pn-myrig-cleanup-group-label span{
  font:800 7.5px var(--mono);
  letter-spacing:.16em;
  white-space:nowrap;
}

[data-myrig-slot="MONITOR"],
[data-myrig-slot="KEYBOARD"],
[data-myrig-slot="MOUSE"]{
  min-height:76px !important;
  padding-top:8px !important;
  padding-bottom:8px !important;
  background:rgba(35,29,44,.68);
  border-left-width:2px;
  opacity:.84;
}
[data-myrig-slot="MONITOR"]:hover,
[data-myrig-slot="KEYBOARD"]:hover,
[data-myrig-slot="MOUSE"]:hover{
  opacity:1;
}
[data-myrig-slot="MONITOR"] .pn-myrig-slot-model,
[data-myrig-slot="KEYBOARD"] .pn-myrig-slot-model,
[data-myrig-slot="MOUSE"] .pn-myrig-slot-model{
  min-height:22px;
  font-size:11.5px;
}
[data-myrig-slot="MONITOR"] .pn-myrig-slot-spec,
[data-myrig-slot="KEYBOARD"] .pn-myrig-slot-spec,
[data-myrig-slot="MOUSE"] .pn-myrig-slot-spec{
  font-size:9px;
}

/* --- LEVIATHAN hero: command core --- */
.pn-myrig-hero{
  padding:18px 19px 16px;
}
.pn-myrig-hero-main{
  gap:9px;
}
.pn-myrig-name{
  letter-spacing:.015em;
}
.pn-myrig-tierline{
  margin-top:1px;
  padding:7px 0;
}
.pn-myrig-tierline .chip,
.pn-myrig-badges .chip{
  min-height:21px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
}
.pn-myrig-badges{
  align-items:center;
  gap:6px;
}

/* summary becomes an intentional two-line specification block */
.pn-myrig-cleanup-summary{
  display:flex;
  flex-direction:column;
  gap:2px;
  line-height:1.35;
  margin-top:1px;
}
.pn-myrig-summary-primary{
  color:var(--text);
  font-weight:600;
}
.pn-myrig-summary-secondary{
  color:var(--text-dim);
  font-size:10.5px;
}

/* slightly larger radar with better lower-half presence */
.pn-myrig-radar-wrap{
  max-width:166px;
  margin:6px auto 1px;
}
.pn-myrig-radar{
  width:156px;
  height:156px;
}
.pn-myrig-radar-heading{
  margin-bottom:1px;
}

/* edit action becomes part of the hero footer */
.pn-myrig-hero-actions{
  justify-content:flex-end;
  align-items:center;
  padding-top:8px;
  margin-top:1px;
  border-top:1px solid rgba(139,132,149,.25);
}
.pn-myrig-hero-actions .btn{
  opacity:.86;
}
.pn-myrig-hero-actions .btn:hover{
  opacity:1;
}

/* silhouette remains decorative, not a second focal point */
.pn-myrig-silhouette{
  opacity:.13;
}

/* --- collapsed systems: compact, quiet, useful --- */
.pn-myrig-acc{
  margin-bottom:8px;
}
.pn-myrig-acc-head{
  padding:9px 13px;
  min-height:44px;
}
.pn-myrig-acc-titles{
  gap:1px;
}
.pn-myrig-acc-titles b{
  font-size:10.5px;
  letter-spacing:.15em;
}
.pn-myrig-acc-titles em{
  font-size:8px;
  letter-spacing:.035em;
}
.pn-myrig-acc-caret{
  display:flex;
  align-items:center;
  justify-content:center;
  width:20px;
  height:20px;
}
.pn-myrig-acc-body{
  padding:12px 13px 14px;
}

/* --- border hierarchy: hero > core cards > peripherals > accordions --- */
.pn-myrig-hero{
  border-width:1px;
  border-color:var(--tier-border,var(--border-strong));
}
.pn-myrig-slot.is-filled:not([data-myrig-slot="MONITOR"]):not([data-myrig-slot="KEYBOARD"]):not([data-myrig-slot="MOUSE"]){
  border-top-color:rgba(139,132,149,.38);
  border-right-color:rgba(139,132,149,.38);
  border-bottom-color:rgba(139,132,149,.38);
}
.pn-myrig-acc{
  border-color:rgba(139,132,149,.30);
}

/* --- responsive sanity --- */
@media(max-width:1180px){
  .pn-myrig-screen{
    grid-template-columns:1fr;
    gap:10px;
  }
  .pn-myrig-col-center{
    order:-1;
  }
  .pn-myrig-cleanup-group-label{
    margin-top:5px;
  }
}
@media(max-width:760px){
  .pn-myrig-radar{
    width:145px;
    height:145px;
  }
  .pn-myrig-radar-wrap{
    max-width:155px;
  }
  .pn-myrig-cleanup-counter em{
    display:none;
  }
}
`;

    document.head.appendChild(style);
  }
})();
