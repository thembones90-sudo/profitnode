"use strict";

(function installRigAssemblyCompactV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnRigCompactV1) return;

  const baseNewRigDraft = newRigDraft;
  newRigDraft = function(){
    const rig = baseNewRigDraft.apply(this, arguments);
    if (rig.budget == null) rig.budget = 0;
    if (!rig.budgetMode) rig.budgetMode = "NEW_CASH";
    if (!rig.budgetCurrency) rig.budgetCurrency = displayCurrency() === "EUR" ? "EUR" : "RSD";
    return rig;
  };

  function rigBudgetCosts(rig){
    let owned = 0, planned = 0;
    RIG_SLOTS.forEach(key => {
      const slot = rig.slots && rig.slots[key];
      if (!slot) return;
      const resolved = rigSlotResolved(slot, "RSD", key);
      const cost = Number(resolved && resolved.cost) || 0;
      if (slot.kind === "INVENTORY") owned += cost;
      else planned += cost;
    });
    return { owned, planned, total: owned + planned };
  }

  // The stored budget and component costs remain in canonical RSD.
  // budgetCurrency controls only entry and presentation, independently of the global display setting.
  function budgetCurrencyOf(rig){
    return rig.budgetCurrency === "EUR" || rig.budgetCurrency === "RSD"
      ? rig.budgetCurrency : (displayCurrency() === "EUR" ? "EUR" : "RSD");
  }

  function budgetDisplayValue(value, currency){
    return currency === "EUR" ? rsdToEur(value) : value;
  }

  function budgetMoney(value, currency){
    return money(budgetDisplayValue(value, currency), currency);
  }

  function budgetInputValue(value, currency){
    const converted = budgetDisplayValue(value, currency);
    return currency === "EUR"
      ? converted.toLocaleString("en-IE", {maximumFractionDigits:2})
      : converted.toLocaleString("en-US", {maximumFractionDigits:0}).replace(/,/g, ".");
  }

  function rigBudgetRail(rig){
    const budget = Number(rig.budget) || 0;
    const currency = budgetCurrencyOf(rig);
    const mode = rig.budgetMode === "TOTAL_COST" ? "TOTAL_COST" : "NEW_CASH";
    const costs = rigBudgetCosts(rig);
    const committed = mode === "NEW_CASH" ? costs.planned : costs.total;
    const remaining = budget - committed;
    const used = budget > 0 ? Math.round(committed / budget * 100) : 0;
    const tone = !(budget > 0) ? "is-unset" : remaining < 0 ? "is-over" : used >= 80 ? "is-warn" : "is-ok";
    const width = budget > 0 ? Math.min(100, Math.max(0, used)) : 0;
    const remainingText = !(budget > 0) ? "SET LIMIT" : budgetMoney(Math.abs(remaining), currency) + (remaining < 0 ? " OVER" : " LEFT");
    return '<section class="pn-rig-budget '+tone+'" data-rig-budget-rail data-budget-mode="'+mode+'" data-budget-currency="'+currency+'">'
      + '<div class="pn-rig-budget-main"><span class="pn-rig-budget-k">BUILD BUDGET</span>'
      + '<div class="pn-rig-budget-entry"><input type="text" inputmode="decimal" autocomplete="off" aria-label="Build budget amount" data-rig-budget-input value="'+escAttr(budget > 0 ? budgetInputValue(budget, currency) : "")+'" placeholder="SET BUDGET"><select data-rig-budget-currency aria-label="Build budget currency"><option value="EUR"'+(currency === "EUR" ? " selected" : "")+'>EUR</option><option value="RSD"'+(currency === "RSD" ? " selected" : "")+'>RSD</option></select></div></div>'
      + '<label class="pn-rig-budget-mode"><span>BUDGET MODE</span><select data-rig-budget-mode><option value="TOTAL_COST"'+(mode === "TOTAL_COST" ? " selected" : "")+'>TOTAL COST BASIS</option><option value="NEW_CASH"'+(mode === "NEW_CASH" ? " selected" : "")+'>NEW CASH SPEND</option></select></label>'
      + '<div class="pn-rig-budget-stat"><span>OWNED BASIS</span><b>'+budgetMoney(costs.owned, currency)+'</b></div>'
      + '<div class="pn-rig-budget-stat"><span>PLANNED CASH</span><b>'+budgetMoney(costs.planned, currency)+'</b></div>'
      + '<div class="pn-rig-budget-stat is-result"><span>'+(remaining < 0 ? "OVER BUDGET" : "AVAILABLE")+'</span><b>'+remainingText+'</b></div>'
      + '<div class="pn-rig-budget-meter"><i style="width:'+width+'%"></i></div>'
      + '<div class="pn-rig-budget-foot">'+(!(budget > 0) ? "Set a limit to track this build." : used+"% committed · "+(mode === "NEW_CASH" ? "planned purchases only" : "owned basis + planned purchases"))+'</div>'
      + '</section>';
  }

  function foldBetween(html, startNeedle, endNeedle, key, title, status, open){
    const start = html.indexOf(startNeedle);
    if (start < 0) return html;
    const end = html.indexOf(endNeedle, start + startNeedle.length);
    if (end < 0) return html;
    const body = html.slice(start, end);
    const folded = '<details class="pn-rig-fold pn-rig-fold-'+key+'" data-rig-fold="'+key+'"'+(open ? " open" : "")+'><summary><b>'+title+'</b><span>'+status+'</span><i>'+(open ? "COLLAPSE" : "EXPAND")+'</i></summary>'+body+'</details>';
    return html.slice(0, start) + folded + html.slice(end);
  }

  function foldState(key, fallback){
    const map = state.rigCompactPanels || (state.rigCompactPanels = {});
    return Object.prototype.hasOwnProperty.call(map, key) ? !!map[key] : !!fallback;
  }

  function compactEditorHtml(html, rig){
    const derived = rigDerived(rig);
    const check = buildCheckModel(rig);
    const counts = check.counts || {};
    const corePresent = ["CPU","GPU","MOBO","RAM","PSU"].filter(k => rig.slots && rig.slots[k]).length;
    const ratingStatus = derived.hardware.complete ? derived.hardware.performance+" PERFORMANCE · "+derived.hardware.tier : "UNRATED · "+corePresent+"/5 CORE";
    const detailStatus = escHtml(rig.family || "UNTITLED RIG")+" · "+STATUS_LABEL(rig.status)+" · "+STATUS_LABEL(rig.purpose || "FLIP")+(rig.notes && rig.notes.trim() ? " · NOTES" : " · NO NOTES");
    const checkStatus = escHtml(check.verdict)+" · "+(counts.PASS || 0)+" VERIFIED · "+(counts.UNVERIFIED || 0)+" UNVERIFIED";
    const severe = check.verdict === "FAIL" || check.verdict === "WARNING";

    const contentOpen = '<div data-rig-view="editor" class="pn-rig-cmd content rig-editor-content">';
    html = html.replace(contentOpen, contentOpen + rigBudgetRail(rig));
    html = foldBetween(html, '<div class="panel pn-pb-rating', '<div class="panel" style="margin-top:10px">', "rating", "BUILD RATING", ratingStatus, foldState("rating", false));
    html = foldBetween(html, '<div class="panel" style="margin-top:10px">', '<div class="panel pn-build-check', "details", "PROJECT DETAILS", detailStatus, foldState("details", false));
    html = foldBetween(html, '<div class="panel pn-build-check', '<div class="pn-shop-read', "check", "BUILD CHECK", checkStatus, severe || foldState("check", false));
    return html;
  }

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    if (state.rigDraft) html = compactEditorHtml(html, state.rigDraft);
    else if (!state.rigFamilyView) html = html.replace(/<div class="info-note"><b>HOW RIG BUILD WORKS<\/b>([\s\S]*?)<\/div>/, '<details class="pn-rig-how"><summary>HOW RIG BUILD WORKS</summary><div class="info-note"><b>SIMULATION RULES</b>$1</div></details>');
    return html;
  };
  route.__pnRigCompactV1 = true;

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (!root) return;
    root.addEventListener("input", e => {
      const input = e.target.closest && e.target.closest("[data-rig-budget-input]");
      if (!input || !state.rigDraft) return;
      const currency = budgetCurrencyOf(state.rigDraft);
      const amount = Math.max(0, parseMoneyInput(input.value));
      state.rigDraft.budget = currency === "EUR" ? eurToRsd(amount) : amount;
      if (typeof renderDebounced === "function") renderDebounced("[data-rig-budget-input]", 180);
    });
    root.addEventListener("change", e => {
      const currencyInput = e.target.closest && e.target.closest("[data-rig-budget-currency]");
      if (currencyInput && state.rigDraft) {
        // Switching currencies never changes the actual spending limit.
        state.rigDraft.budgetCurrency = currencyInput.value === "EUR" ? "EUR" : "RSD";
        render();
        return;
      }
      const mode = e.target.closest && e.target.closest("[data-rig-budget-mode]");
      if (!mode || !state.rigDraft) return;
      state.rigDraft.budgetMode = mode.value === "NEW_CASH" ? "NEW_CASH" : "TOTAL_COST";
      render();
    });
    root.addEventListener("toggle", e => {
      const fold = e.target.closest && e.target.closest("[data-rig-fold]");
      if (!fold) return;
      const map = state.rigCompactPanels || (state.rigCompactPanels = {});
      map[fold.dataset.rigFold] = !!fold.open;
    }, true);
  });

  const C = ".pn-rig-cmd[data-rig-view=editor]";
  const style = document.createElement("style");
  style.textContent = ""
    + C+"{--budget-tone:#58aee8}"
    + C+" .pn-rig-budget{--budget-tone:#58aee8;position:relative;display:grid;grid-template-columns:minmax(210px,1.25fr) minmax(220px,1fr) repeat(3,minmax(145px,.8fr));gap:10px 18px;align-items:end;margin-bottom:8px;padding:10px 16px 12px;border:1px solid color-mix(in srgb,var(--budget-tone) 48%,transparent);border-left:4px solid var(--budget-tone);background:linear-gradient(90deg,color-mix(in srgb,var(--budget-tone) 12%,transparent),rgba(8,8,18,.7) 45%);clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}"
    + C+" .pn-rig-budget.is-ok{--budget-tone:#3ee07a}"+C+" .pn-rig-budget.is-warn{--budget-tone:#f2c94c}"+C+" .pn-rig-budget.is-over{--budget-tone:#ff4a4a}"
    + C+" .pn-rig-budget-k,"+C+" .pn-rig-budget-stat span,"+C+" .pn-rig-budget-mode span{display:block;margin-bottom:4px;font:600 10px var(--stamp);letter-spacing:.18em;color:color-mix(in srgb,var(--budget-tone) 72%,#fff)}"
    + C+" .pn-rig-budget-entry{display:flex;align-items:center;gap:8px}"+C+" .pn-rig-budget-entry input{flex:1 1 0;min-width:0;height:34px;font:700 20px var(--stamp)!important;color:#fff}"+C+" .pn-rig-budget-entry select{flex:0 0 76px;width:76px;min-width:76px;height:34px;padding:4px 6px;font:700 12px var(--stamp)!important;letter-spacing:.04em;color:var(--budget-tone);border-color:var(--budget-tone)!important}"
    + C+" .pn-rig-budget-mode select{height:34px;padding-top:4px;padding-bottom:4px;font:600 11px var(--stamp)!important;letter-spacing:.08em}"
    + C+" .pn-rig-budget-stat{min-width:0;padding-left:10px;border-left:2px solid color-mix(in srgb,var(--budget-tone) 36%,transparent)}"+C+" .pn-rig-budget-stat b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 17px var(--stamp);letter-spacing:.03em;color:#fff}"+C+" .pn-rig-budget-stat.is-result b{color:var(--budget-tone)}"
    + C+" .pn-rig-budget-meter{grid-column:1/-1;height:4px;background:rgba(255,255,255,.07);overflow:hidden}"+C+" .pn-rig-budget-meter i{display:block;height:100%;background:var(--budget-tone);box-shadow:0 0 10px var(--budget-tone)}"
    + C+" .pn-rig-budget-foot{grid-column:1/-1;margin-top:-6px;font:500 10px var(--mono);color:var(--text-muted);text-align:right}"
    + C+" .pn-rig-fold{margin-top:8px;border:1px solid rgba(231,188,78,.3);background:rgba(8,8,18,.5);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)}"
    + C+" .pn-rig-fold>summary{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;min-height:42px;padding:7px 12px;cursor:pointer;list-style:none;background:linear-gradient(90deg,rgba(231,188,78,.09),transparent 65%)}"+C+" .pn-rig-fold>summary::-webkit-details-marker{display:none}"
    + C+" .pn-rig-fold>summary b{font:600 13px var(--stamp);letter-spacing:.2em;color:#fff}"+C+" .pn-rig-fold>summary span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 11px var(--mono);color:var(--text-muted)}"+C+" .pn-rig-fold>summary i{font:600 9px var(--stamp);letter-spacing:.16em;color:#e7bc4e;font-style:normal}"
    + C+" .pn-rig-fold[open]>summary{border-bottom:1px solid rgba(231,188,78,.24)}"+C+" .pn-rig-fold>.panel{margin:0!important;border:0!important;clip-path:none!important}"+C+" .pn-rig-fold>.panel>.panel-head{display:none}"
    + C+" .rig-slot-row{margin:3px 0!important;padding-top:7px!important;padding-bottom:7px!important}"+C+" .rig-slot-columns{padding-top:5px;padding-bottom:5px}"+C+" .rig-slot-row select,"+C+" .rig-slot-row input{min-height:34px!important}"
    + C+" .pn-shop-read{margin-top:8px!important;padding-top:8px!important;padding-bottom:8px!important}"
    + C+" .pn-rig-results-primary{grid-template-columns:repeat(8,minmax(0,1fr))!important;gap:6px!important;margin-top:8px!important}"
    + C+" .pn-rig-results-primary>.kpi{min-height:76px!important;padding:8px 9px 8px 12px!important}"+C+" .pn-rig-results-primary .kpi-label{font-size:9px!important;letter-spacing:.12em!important}"+C+" .pn-rig-results-primary .kpi-value,"+C+" .pn-rig-results-primary .planner-kpi-input{font-size:20px!important}"+C+" .pn-rig-results-primary .kpi-sub{font-size:9px!important;line-height:1.25!important}"
    + ".pn-rig-cmd .pn-rig-how{margin-top:10px;border:1px dashed rgba(231,188,78,.35);background:rgba(231,188,78,.035)}"+".pn-rig-cmd .pn-rig-how>summary{padding:10px 14px;cursor:pointer;font:600 11px var(--stamp);letter-spacing:.18em;color:#e7bc4e}"+".pn-rig-cmd .pn-rig-how .info-note{margin:0;border:0;border-top:1px dashed rgba(231,188,78,.25)}"
    + "@media(max-width:1700px){"+C+" .pn-rig-results-primary{grid-template-columns:repeat(4,minmax(0,1fr))!important}"+C+" .pn-rig-budget{grid-template-columns:repeat(3,minmax(0,1fr))}"+C+" .pn-rig-budget-main,"+C+" .pn-rig-budget-mode{grid-column:auto}}"
    + "@media(max-width:1000px){"+C+" .pn-rig-budget{grid-template-columns:repeat(2,minmax(0,1fr))}"+C+" .pn-rig-results-primary{grid-template-columns:repeat(2,minmax(0,1fr))!important}}"
    + "@media(max-width:620px){"+C+" .pn-rig-budget{grid-template-columns:1fr}"+C+" .pn-rig-fold>summary{grid-template-columns:1fr auto}"+C+" .pn-rig-fold>summary span{grid-column:1/-1;grid-row:2;white-space:normal}"+C+" .pn-rig-results-primary{grid-template-columns:1fr!important}}";
  document.head.appendChild(style);

  console.info("[PROFITNODE] RIG ASSEMBLY compact budget controls active.");
})();
