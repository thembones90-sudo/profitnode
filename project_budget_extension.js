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

  // 3. COST DETAILS: budget vs. spent/planned/remaining, plus every part's
  // share of the budget. Spent = totalCostBasis and planned = plannedCost,
  // the same figures the BUDGET tile uses, so the two never disagree.
  // pbCostBreakdownHtml is called by name from renderProjectBuild at render
  // time, so reassigning the global here is picked up.
  if (typeof pbCostBreakdownHtml === "function" && !pbCostBreakdownHtml.__pnBudgetV1){
    const baseCostHtml = pbCostBreakdownHtml;
    const pct = (part, budget) => Math.round((part / budget) * 1000) / 10;
    const wrappedCostHtml = function(project){
      const html = baseCostHtml.apply(this, arguments);
      const budget = project ? Number(project.budget) : 0;
      if (!(budget > 0) || typeof pbBuildCostRows !== "function") return html;

      const cur = project.currency;
      const stats = Actions.projectBuildStats(project);
      const spent = Number(stats.totalCostBasis) || 0;
      const planned = Number(stats.plannedCost) || 0;
      const left = budget - spent;
      const leftAfterPlanned = left - planned;
      const groups = pbBuildCostRows(project);
      const rows = []
        .concat((groups.direct || []).map(r => ({ label: r.label, amount: Number(r.amount) || 0, kind: "PAID" })))
        .concat((groups.reused || []).map(r => ({ label: r.label, amount: Number(r.amount) || 0, kind: "REUSED" })))
        .concat((groups.planned || []).map(r => ({ label: r.label, amount: Number(r.amount) || 0, kind: "PLANNED" })))
        .sort((a, b) => b.amount - a.amount);

      const barW = v => Math.max(0, Math.min(100, pct(v, budget)));
      const spentW = barW(spent), plannedW = Math.min(barW(planned), 100 - spentW);
      const bar = '<div class="pn-pb-budget-bar">'
        + '<span class="pn-pb-budget-seg is-spent" style="width:' + spentW + '%"></span>'
        + '<span class="pn-pb-budget-seg is-planned" style="width:' + plannedW + '%"></span>'
        + '</div>';

      const stat = (label, value, cls, attr) => '<div class="pn-pb-budget-stat' + (cls ? " " + cls : "") + '"' + (attr || "") + '>' + label + '<b>' + value + '</b></div>';
      const signed = v => (v < 0 ? "−" : "") + money(Math.abs(v), cur);
      const summary = '<div class="pn-pb-budget-stats">'
        + stat("BUDGET", money(budget, cur), "", ' data-pb-budget-total="' + budget + '"')
        + stat("SPENT", money(spent, cur) + ' <small>' + pct(spent, budget) + '%</small>', "is-spent", ' data-pb-budget-spent="' + spent + '"')
        + stat("PLANNED", money(planned, cur) + ' <small>' + pct(planned, budget) + '%</small>', "is-planned", ' data-pb-budget-planned="' + planned + '"')
        + stat("LEFT NOW", signed(left), left < 0 ? "is-over" : "is-left", ' data-pb-budget-left="' + left + '"')
        + stat("LEFT AFTER PLANNED", signed(leftAfterPlanned), leftAfterPlanned < 0 ? "is-over" : "is-left", ' data-pb-budget-left-after-planned="' + leftAfterPlanned + '"')
        + '</div>';

      const partRows = rows.length
        ? rows.map(r => '<div class="pn-pb-budget-row" data-pb-budget-row="' + r.kind + '">'
            + '<span class="pn-pb-budget-kind is-' + r.kind.toLowerCase() + '">' + r.kind + '</span>'
            + '<span class="pn-pb-budget-label">' + escHtml(r.label) + '</span>'
            + '<span class="pn-pb-budget-mini"><span class="is-' + r.kind.toLowerCase() + '" style="width:' + barW(r.amount) + '%"></span></span>'
            + '<span class="pn-pb-budget-amt">' + money(r.amount, cur) + '</span>'
            + '<span class="pn-pb-budget-pct">' + pct(r.amount, budget) + '%</span>'
            + '</div>').join("")
        : '<p class="hint">No parts with a cost yet.</p>';

      const section = '<div class="pn-pb-budget" data-pb-budget-breakdown>'
        + '<div class="pn-pb-budget-head">BUDGET BREAKDOWN</div>'
        + summary + bar
        + '<div class="pn-pb-budget-rows">' + partRows + '</div>'
        + '</div>';

      return String(html).replace('<div class="panel-body">', '<div class="panel-body">' + section);
    };
    wrappedCostHtml.__pnBudgetV1 = true;
    pbCostBreakdownHtml = wrappedCostHtml;

    const style = document.createElement("style");
    style.textContent = ".pn-pb-budget{border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;margin-bottom:8px;background:rgba(160,180,200,.03)}"
      + ".pn-pb-budget-head{font:800 9px var(--mono);letter-spacing:.14em;color:#9fb4c8;margin-bottom:6px}"
      + ".pn-pb-budget-stats{display:flex;gap:8px;flex-wrap:wrap}"
      + ".pn-pb-budget-stat{flex:1;min-width:120px;display:flex;flex-direction:column;gap:3px;font:800 8.5px var(--mono);letter-spacing:.08em;color:var(--text-muted)}"
      + ".pn-pb-budget-stat b{font-size:13px;letter-spacing:.02em;color:var(--text)}"
      + ".pn-pb-budget-stat small{font-size:9px;color:var(--text-muted);font-weight:700}"
      + ".pn-pb-budget-stat.is-left b{color:var(--green)}.pn-pb-budget-stat.is-over b{color:var(--red)}"
      + ".pn-pb-budget-bar{display:flex;height:8px;margin:8px 0 6px;border-radius:4px;overflow:hidden;background:rgba(160,180,200,.10)}"
      + ".pn-pb-budget-seg.is-spent{background:var(--green)}"
      + ".pn-pb-budget-seg.is-planned{background:repeating-linear-gradient(45deg,var(--blue),var(--blue) 4px,transparent 4px,transparent 7px)}"
      + ".pn-pb-budget-rows{display:flex;flex-direction:column}"
      + ".pn-pb-budget-row{display:grid;grid-template-columns:62px minmax(0,1fr) minmax(60px,160px) 84px 46px;align-items:center;gap:8px;font-size:11.5px;padding:3px 0;border-bottom:1px dashed var(--border)}"
      + ".pn-pb-budget-row:last-child{border-bottom:0}"
      + ".pn-pb-budget-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      + ".pn-pb-budget-amt,.pn-pb-budget-pct{text-align:right;font-family:var(--mono)}.pn-pb-budget-pct{color:var(--text-muted);font-size:10.5px}"
      + ".pn-pb-budget-kind{font:800 8px var(--mono);letter-spacing:.1em;text-align:center;border:1px solid var(--border-strong);border-radius:3px;padding:1px 0}"
      + ".pn-pb-budget-kind.is-paid{color:var(--green);border-color:var(--green)}.pn-pb-budget-kind.is-reused{color:#b98cff;border-color:#b98cff}.pn-pb-budget-kind.is-planned{color:var(--blue);border-color:var(--blue)}"
      + ".pn-pb-budget-mini{height:5px;border-radius:3px;background:rgba(160,180,200,.10);overflow:hidden}.pn-pb-budget-mini>span{display:block;height:100%}"
      + ".pn-pb-budget-mini>.is-paid{background:var(--green)}.pn-pb-budget-mini>.is-reused{background:#b98cff}.pn-pb-budget-mini>.is-planned{background:var(--blue)}"
      + "@media(max-width:760px){.pn-pb-budget-row{grid-template-columns:56px minmax(0,1fr) 76px 40px}.pn-pb-budget-mini{display:none}}";
    document.head.appendChild(style);
  }

  console.info("[PROFITNODE] Project planned-budget tracking active.");
})();
