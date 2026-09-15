"use strict";

/*
  PROFITNODE Build Workspace Refinement v1
  Presentation-only refinement pass.

  Goals:
  - More breathing room in BUILD RATING.
  - Stronger financial KPI hierarchy.
  - COMPLETION -> LOADOUT COMPLETION.
  - Show owned/planned acquisition state inside the completion KPI.
  - Normalize component-card vertical rhythm.
  - COST DETAILS summary becomes owned/planned rather than generic entry count.
  - Give OPTIONAL / EXTRA PARTS secondary action a little more visual authority.
  - Do not alter compatibility, project, inventory, treasury, ratings, or catalogs.
*/

function pnBwrSlotCounts(project){
  const slots = (typeof PROJECT_BUILD_SLOTS !== "undefined" ? PROJECT_BUILD_SLOTS : [])
    .map(k => project && project.slots ? project.slots[k] : null)
    .filter(Boolean);

  const owned = slots.filter(s => s && s.kind === "INVENTORY").length;
  const planned = slots.filter(s => s && s.kind === "PLANNED").length;

  return {
    owned,
    planned,
    filled: slots.length,
    total: typeof PROJECT_BUILD_SLOTS !== "undefined" ? PROJECT_BUILD_SLOTS.length : slots.length
  };
}

function pnBwrCostCounts(project){
  if (typeof pbBuildCostRows === "function"){
    try{
      const rows = pbBuildCostRows(project) || {};
      return {
        owned: Array.isArray(rows.owned) ? rows.owned.length : 0,
        planned: Array.isArray(rows.planned) ? rows.planned.length : 0
      };
    }catch(_){}
  }
  return pnBwrSlotCounts(project);
}

/*
  DISPLAY DEDUPE v1 already owns the lower cost-detail renderer.
  We wrap its output, preserving all itemized rows and only sharpening
  the collapsed summary text.
*/
if (typeof pbCostBreakdownHtml === "function"){
  const PNCorePbCostBreakdownHtmlBwr = pbCostBreakdownHtml;

  pbCostBreakdownHtml = function(project){
    let html = PNCorePbCostBreakdownHtmlBwr.apply(this, arguments);
    const counts = pnBwrCostCounts(project);

    const summary =
      "ITEMIZED COMPONENT COSTS · " +
      counts.owned + " OWNED · " +
      counts.planned + " PLANNED";

    html = String(html).replace(
      /ITEMIZED COMPONENT COSTS(?:\s*·\s*\d+\s+ENTRIES)?/i,
      summary
    );

    return html;
  };
}

/*
  The Project Build renderer already calculates slot completion.
  We post-process only its returned HTML:
    COMPLETION -> LOADOUT COMPLETION
    8 / 8 slots -> 8 / 8 slots + 1 OWNED · 7 PLANNED
  No data is persisted or changed.
*/
if (typeof renderProjectBuild === "function"){
  const PNCoreRenderProjectBuildBwr = renderProjectBuild;

  renderProjectBuild = function(){
    let html = PNCoreRenderProjectBuildBwr.apply(this, arguments);

    let project = null;
    try{
      project = typeof pbProject === "function" ? pbProject() : null;
    }catch(_){}

    if (!project) return html;

    const counts = pnBwrSlotCounts(project);

    html = String(html).replace(
      '<div class="kpi-label">COMPLETION</div>',
      '<div class="kpi-label">LOADOUT COMPLETION</div>'
    );

    const oldSub =
      '<div class="kpi-sub">' +
      counts.filled + " / " + counts.total +
      ' slots</div></div>';

    const newSub =
      '<div class="kpi-sub pn-pb-loadout-sub">' +
        '<span class="pn-pb-slot-fill">' +
          counts.filled + " / " + counts.total + " slots" +
        '</span>' +
        '<span class="pn-pb-acq-summary">' +
          '<span class="is-owned">' + counts.owned + ' OWNED</span>' +
          '<span class="pn-pb-acq-dot">·</span>' +
          '<span class="is-planned">' + counts.planned + ' PLANNED</span>' +
        '</span>' +
      '</div></div>';

    if (html.includes(oldSub)){
      html = html.replace(oldSub, newSub);
    }

    return html;
  };
}

if (typeof document !== "undefined" && document.createElement){
  const style = document.createElement("style");
  style.id = "pn-build-workspace-refinement-v1";

  style.textContent = `
/* -------------------------------------------------------------
   BUILD RATING — same information, less compression
------------------------------------------------------------- */
.pn-pb-rating .panel-body{
  padding-top:14px;
  padding-bottom:15px;
}
.pn-pb-rating-overall{
  gap:16px;
  margin-bottom:3px;
}
.pn-pb-rating-verdict{
  line-height:1.38;
  padding-top:2px;
  padding-bottom:2px;
}
.pn-pb-rating-cats{
  margin-top:16px;
  gap:11px 16px;
}
.pn-pb-rating-item{
  padding:1px 0;
}
.pn-pb-rating-conf{
  margin-top:3px;
}

/* -------------------------------------------------------------
   FINANCIAL KPI STRIP — numbers lead, labels recede
------------------------------------------------------------- */
.pn-pb-stats .kpi{
  padding-top:12px;
  padding-bottom:11px;
}
.pn-pb-stats .kpi-label{
  font-size:8px;
  letter-spacing:.13em;
  opacity:.68;
}
.pn-pb-stats .kpi-value{
  margin-top:4px;
  font-size:17px;
  line-height:1.08;
  font-weight:900;
  letter-spacing:.01em;
}
.pn-pb-stats .kpi-sub{
  margin-top:5px;
  font-size:9px;
  line-height:1.25;
  opacity:.72;
}

/* LOADOUT completion means slots populated, not physically assembled. */
.pn-pb-loadout-sub{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.pn-pb-acq-summary{
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:4px;
  font:800 8px var(--mono);
  letter-spacing:.065em;
}
.pn-pb-acq-summary .is-owned{
  color:var(--green,#33d17a);
  opacity:1;
}
.pn-pb-acq-summary .is-planned{
  color:#58aee8;
  opacity:1;
}
.pn-pb-acq-dot{
  color:var(--text-muted,#8b8495);
}

/* -------------------------------------------------------------
   COMPONENT LOADOUT — consistent card rhythm
------------------------------------------------------------- */
.pn-pb-grid{
  align-items:stretch;
}
.pn-pb-slot:not(.is-empty){
  min-height:168px;
}
.pn-pb-slot-model-line{
  min-height:38px;
  align-content:flex-start;
}
.pn-pb-slot-model{
  align-self:flex-start;
}
.pn-pb-slot-spec,
.pn-pb-ram-config:not(.pn-pb-ram-inline){
  min-height:14px;
}
.pn-pb-slot-foot{
  margin-top:auto;
  min-height:48px;
  align-content:flex-start;
}

/* -------------------------------------------------------------
   COST DETAILS — useful collapsed summary, no duplicated totals
------------------------------------------------------------- */
.pn-pb-cost-detail-only .pn-pb-cost-details > summary{
  letter-spacing:.07em;
}
.pn-pb-cost-detail-only .pn-pb-cost-cols{
  margin-top:10px;
}

/* -------------------------------------------------------------
   OPTIONAL / EXTRA PARTS — secondary action, not invisible action
------------------------------------------------------------- */
[data-pb-extra-new]{
  border-color:rgba(88,174,232,.55) !important;
  color:#74c7ff !important;
  background:rgba(88,174,232,.075) !important;
  box-shadow:inset 0 0 0 1px rgba(88,174,232,.06);
}
[data-pb-extra-new]:hover{
  border-color:rgba(88,174,232,.82) !important;
  background:rgba(88,174,232,.13) !important;
  color:#a6ddff !important;
}

/* Compatibility intentionally untouched. */

@media(max-width:820px){
  .pn-pb-slot:not(.is-empty){
    min-height:158px;
  }
  .pn-pb-slot-model-line{
    min-height:32px;
  }
}
`;

  document.head.appendChild(style);
}
