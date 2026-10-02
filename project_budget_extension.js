"use strict";

/*
  PROFITNODE — Planned Budget for rig builds.

  Adds a "Planned Budget (optional)" field to the project create/edit
  form (same FORM_SCHEMAS.project schema used for both NEW PROJECT and
  EDIT DETAILS), and surfaces spend-against-budget in the Build
  Workspace: a BUDGET tile next to the existing cost tiles showing
  remaining/over amount and % used, plus a warning banner once actual
  spend (Actions.projectBuildStats().totalCostBasis — the same "money
  actually spent" figure already used everywhere else in the build
  workspace) passes the budget.

  This is additive only: no field is required, nothing here blocks
  adding parts past budget — it's a tracked limit, not a hard stop.
  Projects with no budget set render exactly as before.
*/
(function installProjectBudgetV1(){

  // 1. Add the field to the project form (NEW PROJECT + EDIT DETAILS).
  if (typeof FORM_SCHEMAS !== "undefined" && typeof FORM_SCHEMAS.project === "function" && !FORM_SCHEMAS.project.__pnBudgetV1){
    const baseSchema = FORM_SCHEMAS.project;
    const wrappedSchema = function(existing){
      const schema = baseSchema(existing);
      const budgetField = { key: "budget", label: "Planned Budget (optional)", type: "number", half: true };
      const afterCurrency = schema.fields.findIndex(f => f.key === "currency");
      if (afterCurrency >= 0) schema.fields.splice(afterCurrency + 1, 0, budgetField);
      else schema.fields.push(budgetField);
      return schema;
    };
    wrappedSchema.__pnBudgetV1 = true;
    FORM_SCHEMAS.project = wrappedSchema;
  }

  // 1b. Route-dispatch fix (unrelated bug, found while building this feature):
  // ROUTES.push({..., render:renderProjectBuild}) in project_build_extension.js
  // captures the function reference that existed AT THAT LOAD MOMENT. Every
  // later extension that does `renderProjectBuild = wrap(renderProjectBuild)`
  // (build_workspace_refinement_extension.js's "LOADOUT COMPLETION" label,
  // project_delete_extension.js's DELETE BUILD button, and this file's budget
  // tile) only reassigns the global variable — render() actually calls
  // ROUTES.find(...).render(), which still points at the ORIGINAL unwrapped
  // function. So none of those three wraps have ever actually rendered.
  // Fix: make the route entry call through the global by name, so it always
  // picks up whichever function `renderProjectBuild` currently points to.
  if (typeof ROUTES !== "undefined"){
    const routeEntry = ROUTES.find(r => r && r.key === "projectbuild");
    if (routeEntry && !routeEntry.__pnDynamicDispatchV1){
      routeEntry.render = function(){ return renderProjectBuild.apply(this, arguments); };
      routeEntry.__pnDynamicDispatchV1 = true;
    }
  }

  // 2. Surface it in the Build Workspace: a BUDGET tile + over-budget banner.
  if (typeof renderProjectBuild === "function" && !renderProjectBuild.__pnBudgetV1){
    const baseRender = renderProjectBuild;
    const wrappedRender = function(){
      let html = baseRender();
      const p = typeof pbProject === "function" ? pbProject() : null;
      const budget = p ? Number(p.budget) : 0;
      if (!p || !(budget > 0)) return html;

      const stats = Actions.projectBuildStats(p);
      const spent = Number(stats.totalCostBasis) || 0;
      const remaining = budget - spent;
      const pctUsed = Math.round((spent / budget) * 100);
      const over = remaining < 0;

      const tile = '<div class="kpi" data-pb-budget="' + budget + '" data-pb-budget-remaining="' + remaining + '">'
        + '<div class="kpi-label">BUDGET</div>'
        + '<div class="kpi-value" style="color:' + (over ? "var(--red)" : "var(--green)") + '">'
          + money(Math.abs(remaining), p.currency) + (over ? " OVER" : " LEFT")
        + '</div>'
        + '<div class="kpi-sub">' + pctUsed + '% of ' + money(budget, p.currency) + ' spent</div>'
        + '</div>';

      // Fixed anchor text that always follows the EST. MARKET VALUE tile,
      // regardless of that tile's own (dynamic) value.
      html = html.replace('manual current estimate</div></div>', 'manual current estimate</div></div>' + tile);

      if (over){
        const warning = '<div class="panel" style="margin-top:8px;border-color:var(--red)"><div class="panel-body" style="color:var(--red)">'
          + 'OVER BUDGET — ' + money(Math.abs(remaining), p.currency) + ' past the planned ' + money(budget, p.currency) + ' for this build.'
          + '</div></div>';
        html = html.replace('<div class="content pn-pb-page">', '<div class="content pn-pb-page">' + warning);
      }

      return html;
    };
    wrappedRender.__pnBudgetV1 = true;
    renderProjectBuild = wrappedRender;
  }

  console.info("[PROFITNODE] Project planned-budget tracking active.");
})();
