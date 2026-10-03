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

  // Budget reserved for slots whose part isn't chosen yet:
  // project.allocations = { SLOT: { amount, currency } } (currency defaults to the
  // project's; amounts are converted to the project currency here). An
  // allocation only counts while its slot is still empty, so adding the real
  // part supersedes it. Kept apart from project slots on purpose: it never
  // touches slot counts, build rating, compatibility or profit accounting.
  globalThis.pnBudgetAllocations = function(project){
    const map = project && project.allocations;
    if (!map || typeof map !== "object") return [];
    return Object.keys(map)
      .filter(k => !(project.slots && project.slots[k]))
      .map(k => {
        const raw = Number(map[k] && map[k].amount) || 0, cur = (map[k] && map[k].currency) || project.currency;
        return { slotKey: k, amount: typeof convert === "function" ? convert(raw, cur, project.currency) : raw };
      })
      .filter(a => a.amount > 0);
  };
  const allocatedTotal = project => pnBudgetAllocations(project).reduce((sum, a) => sum + a.amount, 0);

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
        + '<div class="kpi-sub">' + pctUsed + '% of ' + money(budget, p.currency) + ' spent' + (allocatedTotal(p) > 0 ? ' · ' + money(allocatedTotal(p), p.currency) + ' allocated' : '') + '</div>'
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

  // 3. COST DETAILS: command-console budget readout. Spent = totalCostBasis
  // and planned = plannedCost, the same figures the BUDGET tile uses, so the
  // two never disagree. The bar is split per part in that part's loadout
  // colour (CATEGORY_META), planned parts hatched. pbCostBreakdownHtml is
  // called by name from renderProjectBuild at render time, so reassigning
  // the global here is picked up.
  if (typeof pbCostBreakdownHtml === "function" && !pbCostBreakdownHtml.__pnBudgetV2){
    const baseCostHtml = pbCostBreakdownHtml;
    const pct = (part, whole) => whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
    const slotKeysByLength = typeof RIG_SLOT_LABELS !== "undefined" ? Object.keys(RIG_SLOT_LABELS).sort((a, b) => RIG_SLOT_LABELS[b].length - RIG_SLOT_LABELS[a].length) : [];
    const GAUGE_COLORS = globalThis.PN_SLOT_GAUGE_COLORS = { CPU: "#39C6F4", GPU: "#B25CFF", MOBO: "#F2C94C", RAM: "#2FE0A8", STORAGE: "#4F6BFF", STORAGE2: "#7D8DFF", STORAGE3: "#A5B0FF", STORAGE4: "#A5B0FF", STORAGE5: "#A5B0FF", STORAGE6: "#A5B0FF", STORAGE7: "#A5B0FF", STORAGE8: "#A5B0FF", PSU: "#FF8A3D", COOLER: "#FF5FB0", CASE: "#B9C3D0" };
    const rowMeta = label => {
      const key = slotKeysByLength.find(k => String(label).indexOf(RIG_SLOT_LABELS[k] + " — ") === 0);
      return key ? { slot: RIG_SLOT_LABELS[key].toUpperCase(), short: key === "MOBO" ? "MOBO" : key === "STORAGE" ? "STORAGE" : RIG_SLOT_LABELS[key].toUpperCase(), name: String(label).slice(RIG_SLOT_LABELS[key].length + 3), color: GAUGE_COLORS[key] || "#9fb4c8" } : { slot: "EXTRA", short: "EXTRA", name: String(label), color: "#9BE15D" };
    };
    const wrappedCostHtml = function(project){
      const html = baseCostHtml.apply(this, arguments);
      const budget = project ? Number(project.budget) : 0;
      if (!(budget > 0) || typeof pbBuildCostRows !== "function") return html;

      const cur = project.currency;
      const m = v => money(v, cur);
      const signed = v => (v < 0 ? "−" : "") + money(Math.abs(v), cur);
      const stats = Actions.projectBuildStats(project);
      const spent = Number(stats.totalCostBasis) || 0;
      const planned = Number(stats.plannedCost) || 0;
      const allocs = pnBudgetAllocations(project);
      const allocated = allocs.reduce((sum, a) => sum + a.amount, 0);
      const left = budget - spent;
      const leftAfterPlanned = left - planned - allocated;
      const committed = spent + planned + allocated;
      const breach = leftAfterPlanned < 0;
      const status = left < 0 ? "BUDGET BREACH" : breach ? "PLANNED BREACH" : pct(committed, budget) >= 90 ? "NEAR LIMIT" : "WITHIN PARAMETERS";
      const statusCls = left < 0 || breach ? "is-breach" : pct(committed, budget) >= 90 ? "is-warn" : "is-ok";

      const groups = pbBuildCostRows(project);
      const tag = (rows, kind) => (rows || []).map(r => Object.assign({ amount: Number(r.amount) || 0, kind, label: r.label }, rowMeta(r.label)));
      const allocRows = allocs.map(a => {
        const parts = String(a.slotKey).split(":"), base = RIG_SLOT_LABELS[parts[0]] || parts[0], stick = parts.length > 1 ? "Stick " + "AB".charAt(Number(parts[1])) + " budget reserved" : "Budget reserved";
        return Object.assign({}, rowMeta(base + " — " + stick + ", part not chosen yet"), { amount: a.amount, kind: "ALLOCATED", label: base });
      });
      const rows = [].concat(tag(groups.direct, "PAID"), tag(groups.reused, "REUSED"), tag(groups.planned, "PLANNED"), allocRows).sort((a, b) => b.amount - a.amount);

      const scale = Math.max(budget, committed);
      let cursor = 0;
      const segData = rows.filter(r => r.amount > 0).map(r => {
        const width = pct(r.amount, scale), sg = { r, width, center: cursor + width / 2, text: r.short + " " + pct(r.amount, budget) + "%" };
        cursor += width;
        return sg;
      });
      const segs = segData.map(sg => '<span class="pn-cc-seg' + (sg.r.kind === "PLANNED" ? " is-planned" : sg.r.kind === "ALLOCATED" ? " is-alloc" : "") + '" title="' + escHtml(sg.r.slot + " · " + sg.r.name + " · " + m(sg.r.amount)) + '" style="--c:' + sg.r.color + ';width:' + sg.width + '%"></span>').join("");
      const pills = segData.map((sg, i) => '<span class="pn-cc-pill" data-pill="' + i + '" data-start="' + (sg.center - sg.width / 2) + '" data-width="' + sg.width + '" data-full="' + escAttr(sg.text) + '" data-name="' + escAttr(sg.r.short) + '" style="--c:' + sg.r.color + '">' + escHtml(sg.text) + "</span>").join("");
      const limitAt = pct(budget, scale);
      const ticks = [25, 50, 75].map(t => '<span class="pn-cc-tick" style="left:' + (limitAt * t / 100) + '%"></span>').join("")
        + (scale > budget ? '<span class="pn-cc-limit" style="left:' + limitAt + '%"></span>' : "");

      const mini = (label, value, cls, attr) => '<div class="pn-cc-mini' + (cls ? " " + cls : "") + '"' + attr + '><span class="pn-cc-k">' + label + '</span><b>' + value + '</b></div>';
      const head = '<div class="pn-cc-head"><span class="pn-cc-title"><i></i>FISCAL OPS // BUDGET TELEMETRY</span><span class="pn-cc-status ' + statusCls + '">' + status + '</span></div>';
      const top = '<div class="pn-cc-top">'
        + '<div class="pn-cc-hero"><span class="pn-cc-k">LEFT AFTER PLANNED' + (allocated > 0 ? " + ALLOCATED" : "") + '</span><div class="pn-cc-big' + (breach ? " is-neg" : "") + '" data-pb-budget-left-after-planned="' + leftAfterPlanned + '">' + signed(leftAfterPlanned) + '</div>'
          + '<div class="pn-cc-sub">of ' + m(budget) + ' budget · ' + pct(committed, budget) + '% committed</div></div>'
        + '<div class="pn-cc-minis">'
          + mini("BUDGET", m(budget), "", ' data-pb-budget-total="' + budget + '"')
          + mini("SPENT", m(spent), "", ' data-pb-budget-spent="' + spent + '"')
          + mini("PLANNED", m(planned), "is-planned", ' data-pb-budget-planned="' + planned + '"')
          + (allocated > 0 ? mini("ALLOCATED", m(allocated), "is-alloc", ' data-pb-budget-allocated="' + allocated + '"') : "")
          + mini("LEFT NOW", signed(left), left < 0 ? "is-neg" : "is-pos", ' data-pb-budget-left="' + left + '"')
        + '</div></div>';
      const bar = '<div class="pn-cc-gauge" data-pn-cc-gauge><div class="pn-cc-bar">' + segs + ticks + '</div><div class="pn-cc-labels">' + pills + "</div></div>"
        + '<div class="pn-cc-scale"><span style="left:0">0</span>' + [25, 50, 75].map(t => '<span class="is-mid" style="left:' + (limitAt * t / 100) + '%">' + t + '%</span>').join("") + '<span class="is-end" style="left:' + limitAt + '%">' + m(budget) + '</span></div>';
      const partRows = rows.length
        ? rows.map(r => '<div class="pn-cc-row" data-pb-budget-row="' + r.kind + '" style="--c:' + r.color + '">'
            + '<span class="pn-cc-slot">' + escHtml(r.slot) + '</span>'
            + '<span class="pn-cc-name">' + escHtml(r.name) + '</span>'
            + '<span class="pn-cc-kind is-' + r.kind.toLowerCase() + '">' + r.kind + '</span>'
            + '<span class="pn-cc-amt">' + m(r.amount) + '</span>'
            + '<span class="pn-cc-pct">' + pct(r.amount, budget) + '%</span>'
            + '</div>').join("")
        : '<p class="pn-cc-empty">No parts with a cost logged yet.</p>';

      const section = '<div class="pn-cc ' + statusCls + '" data-pb-budget-breakdown>'
        + '<span class="pn-cc-corner tl"></span><span class="pn-cc-corner br"></span>'
        + head + top + bar + '<div class="pn-cc-rows">' + partRows + '</div></div>';

      return String(html).replace('<div class="panel-body">', '<div class="panel-body">' + section);
    };
    wrappedCostHtml.__pnBudgetV2 = true;
    pbCostBreakdownHtml = wrappedCostHtml;

    const style = document.createElement("style");
    style.textContent = ""
      + ".pn-cc{--cc-edge:#58aee8;--cc-glow:rgba(88,174,232,.22);position:relative;margin-bottom:10px;padding:16px 20px 14px;border:1px solid rgba(88,174,232,.45);"
        + "clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px);"
        + "background:linear-gradient(90deg,rgba(88,174,232,.05) 1px,transparent 1px) 0 0/28px 28px,linear-gradient(0deg,rgba(88,174,232,.04) 1px,transparent 1px) 0 0/28px 28px,"
        + "linear-gradient(160deg,rgba(88,174,232,.12),rgba(50,198,166,.05) 45%,rgba(10,10,20,.35));box-shadow:inset 0 0 40px -12px var(--cc-glow)}"
      + ".pn-cc.is-warn{--cc-edge:#f0b44a;--cc-glow:rgba(240,180,74,.22);border-color:rgba(240,180,74,.5)}"
      + ".pn-cc.is-breach{--cc-edge:var(--red);--cc-glow:rgba(255,70,70,.28);border-color:rgba(255,70,70,.6)}"
      + ".pn-cc-corner{position:absolute;width:26px;height:26px;border:2px solid var(--cc-edge);pointer-events:none;filter:drop-shadow(0 0 4px var(--cc-edge))}"
      + ".pn-cc-corner.tl{top:4px;right:4px;border-left:0;border-bottom:0}.pn-cc-corner.br{bottom:4px;left:4px;border-right:0;border-top:0}"
      + ".pn-cc-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid rgba(88,174,232,.25)}"
      + ".pn-cc-title{display:flex;align-items:center;gap:9px;font:600 14px var(--stamp);letter-spacing:.24em;color:var(--cc-edge)}"
      + ".pn-cc-title i{width:9px;height:9px;background:var(--cc-edge);transform:rotate(45deg);box-shadow:0 0 8px var(--cc-edge);animation:pnCcPulse 2.4s ease-in-out infinite}"
      + "@keyframes pnCcPulse{50%{opacity:.35}}"
      + ".pn-cc-status{font:600 12px var(--stamp);letter-spacing:.2em;padding:4px 12px;border:1px solid;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}"
      + ".pn-cc-status.is-ok{color:var(--green);background:rgba(80,255,120,.08)}.pn-cc-status.is-warn{color:#f0b44a;background:rgba(240,180,74,.1)}.pn-cc-status.is-breach{color:#fff;background:var(--red);border-color:var(--red);animation:pnCcBreach 1.2s ease-in-out infinite}"
      + "@keyframes pnCcBreach{50%{opacity:.7;box-shadow:0 0 14px rgba(255,70,70,.5)}}"
      + ".pn-cc-top{display:flex;justify-content:space-between;align-items:flex-end;gap:18px 28px;flex-wrap:wrap}"
      + ".pn-cc-k{font:600 12px var(--stamp);letter-spacing:.2em;color:var(--text-muted)}"
      + ".pn-cc-big{font:700 46px/1.05 var(--stamp);letter-spacing:.02em;color:var(--green);text-shadow:0 0 22px rgba(80,255,120,.3);margin:4px 0 2px}.pn-cc-big.is-neg{color:var(--red);text-shadow:0 0 22px rgba(255,70,70,.35)}"
      + ".pn-cc-sub{font:500 13px var(--mono);color:var(--text-muted)}"
      + ".pn-cc-minis{display:flex;gap:26px;flex-wrap:wrap}.pn-cc-mini{display:flex;flex-direction:column;gap:4px;padding-left:10px;border-left:2px solid rgba(88,174,232,.35)}"
      + ".pn-cc-mini b{font:600 22px var(--stamp);letter-spacing:.03em;color:var(--text)}.pn-cc-mini.is-pos b{color:var(--green)}.pn-cc-mini.is-neg b{color:var(--red)}.pn-cc-mini.is-planned b{color:#74c7ff}"
      + ".pn-cc-gauge{position:relative;margin:18px 0 6px}.pn-cc-bar{position:relative;display:flex;height:60px;overflow:hidden;background:rgba(160,180,200,.07);box-shadow:inset 0 0 0 1px rgba(88,174,232,.3);clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}"
      + ".pn-cc-seg{background:var(--c);box-shadow:inset -2px 0 0 rgba(0,0,0,.6),0 0 12px -2px var(--c)}"
      + ".pn-cc-seg.is-alloc{background:repeating-linear-gradient(90deg,var(--c) 0 2px,color-mix(in srgb,var(--c) 22%,transparent) 2px 7px);box-shadow:inset 0 0 0 1px var(--c)}"
      + ".pn-cc-kind.is-allocated{color:#f2c94c;border-style:dotted}.pn-cc-mini.is-alloc b{color:#f2c94c}"
      + ".pn-cc-seg.is-planned{background:repeating-linear-gradient(45deg,var(--c),var(--c) 5px,transparent 5px,transparent 9px)}"
      + ".pn-cc-seg{min-width:0}"
      + ".pn-cc-labels{position:absolute;inset:0;pointer-events:none}"
      + ".pn-cc-pill{position:absolute;left:0;top:21px;height:18px;line-height:18px;visibility:hidden;font:600 12px var(--stamp);letter-spacing:.08em;white-space:nowrap;color:#fff;background:rgba(8,8,18,.74);padding:0 7px;border-radius:2px}"
      + ".pn-cc-pill.is-placed{visibility:visible}.pn-cc-pill.is-out{background:rgba(8,8,18,.9);color:var(--c);box-shadow:inset 3px 0 0 var(--c),0 0 0 1px color-mix(in srgb,var(--c) 70%,transparent)}"
      + ".pn-cc-tick{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.22)}"
      + ".pn-cc-limit{position:absolute;top:0;bottom:0;width:3px;margin-left:-1px;background:var(--red);box-shadow:0 0 10px var(--red)}"
      + ".pn-cc-scale{position:relative;height:16px;font:500 12px var(--mono);color:var(--text-muted);margin-bottom:14px}.pn-cc-scale>span{position:absolute;top:0;white-space:nowrap}.pn-cc-scale>.is-mid{transform:translateX(-50%)}.pn-cc-scale>.is-end{transform:translateX(-100%)}"
      + ".pn-cc-rows{display:flex;flex-direction:column;gap:5px}"
      + ".pn-cc-row{display:grid;grid-template-columns:170px minmax(0,1fr) 96px 110px 64px;align-items:center;gap:12px;padding:9px 12px;border-left:3px solid var(--c);"
        + "background:linear-gradient(90deg,color-mix(in srgb,var(--c) 13%,transparent),transparent 50%);clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}"
      + ".pn-cc-row:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--c) 22%,transparent),transparent 65%)}"
      + ".pn-cc-slot{font:600 14px var(--stamp);letter-spacing:.14em;color:var(--c)}"
      + ".pn-cc-name{font:500 15px var(--sans);color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      + ".pn-cc-kind{font:600 11px var(--stamp);letter-spacing:.14em;text-align:center;padding:3px 0;border:1px solid}"
      + ".pn-cc-kind.is-paid{color:var(--green)}.pn-cc-kind.is-reused{color:#c39bff}.pn-cc-kind.is-planned{color:#74c7ff;border-style:dashed}"
      + ".pn-cc-amt{font:600 17px var(--mono);text-align:right;color:var(--text)}.pn-cc-pct{font:500 13px var(--mono);text-align:right;color:var(--text-muted)}"
      + ".pn-cc-empty{font:500 14px var(--sans);color:var(--text-muted);margin:4px 0}"
      + "@media(max-width:760px){.pn-cc{padding:14px 14px 12px}.pn-cc-big{font-size:36px}.pn-cc-minis{gap:14px 18px}.pn-cc-mini b{font-size:18px}"
        + ".pn-cc-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'slot amt' 'name pct' 'kind kind';row-gap:3px}"
        + ".pn-cc-slot{grid-area:slot}.pn-cc-name{grid-area:name;white-space:normal}.pn-cc-amt{grid-area:amt}.pn-cc-pct{grid-area:pct}.pn-cc-kind{grid-area:kind;justify-self:start;padding:2px 8px}}"
      + "@media(prefers-reduced-motion:reduce){.pn-cc-title i,.pn-cc-status.is-breach{animation:none}}";
    document.head.appendChild(style);

    // Places every gauge label on the bar using the bar's real width: inside
    // its segment when the text fits (falling back to the part name alone),
    // otherwise as an outlined label centred on its segment in a lane above
    // or below the inside labels. The bar grows extra lanes when needed so
    // labels never overlap.
    const ROW = 20;
    globalThis.pnLayoutBudgetGauges = function(){
      document.querySelectorAll("[data-pn-cc-gauge]").forEach(gauge => {
        const W = gauge.clientWidth, bar = gauge.querySelector(".pn-cc-bar");
        if (!W || !bar) return;
        const lanes = [], items = [];
        gauge.querySelectorAll(".pn-cc-pill").forEach(pill => {
          const segL = Number(pill.dataset.start) / 100 * W, segW = Number(pill.dataset.width) / 100 * W, center = segL + segW / 2;
          pill.classList.remove("is-out", "is-placed");
          let inside = false;
          for (const text of [pill.dataset.full, pill.dataset.name]){
            pill.textContent = text;
            if (pill.offsetWidth <= segW - 6){ inside = true; break; }
          }
          if (!inside){ pill.textContent = pill.dataset.full; pill.classList.add("is-out"); }
          const w = pill.offsetWidth, left = inside ? center - w / 2 : Math.max(12, Math.min(center - w / 2, W - 12 - w));
          let lane = -1;
          if (!inside){
            lane = lanes.findIndex(spans => spans.every(r => left + w + 4 <= r[0] || left >= r[1] + 4));
            if (lane < 0){ lane = lanes.length; lanes.push([]); }
            lanes[lane].push([left, left + w]);
          }
          items.push({ pill, left, lane });
        });
        const above = Math.ceil(lanes.length / 2), below = Math.floor(lanes.length / 2);
        const height = Math.max(60, (above + 1 + below) * ROW + 4), mid = Math.round((height - 18) / 2);
        bar.style.height = height + "px";
        items.forEach(it => {
          let top = mid;
          if (it.lane >= 0){
            const row = Math.floor(it.lane / 2) + 1;
            top = it.lane % 2 === 0 ? mid - row * ROW : mid + row * ROW;
          }
          it.pill.style.left = it.left + "px";
          it.pill.style.top = top + "px";
          it.pill.classList.add("is-placed");
        });
      });
    };
    if (typeof render === "function" && !render.__pnGaugeLayoutV1){
      const baseRender = render;
      const wrapped = function(){
        const out = baseRender.apply(this, arguments);
        try { pnLayoutBudgetGauges(); } catch (_){}
        return out;
      };
      wrapped.__pnGaugeLayoutV1 = true;
      render = wrapped;
    }
    let resizeFrame = 0;
    if (typeof window !== "undefined" && typeof window.addEventListener === "function" && typeof requestAnimationFrame === "function") window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { try { pnLayoutBudgetGauges(); } catch (_){} });
    });
  }

  console.info("[PROFITNODE] Project planned-budget tracking active.");
})();
