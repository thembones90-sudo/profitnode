"use strict";

(function installRigAssemblyCompactV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnRigCompactV1) return;

  const B = globalThis.PN_BUDGET;
  let pendingUiNewRig = false, focusNewRig = false;
  const baseNewRigDraft = newRigDraft;
  newRigDraft = function(){
    const rig = baseNewRigDraft.apply(this, arguments);
    if (rig.budget === undefined || rig.budget === 0) rig.budget = null;
    if (!rig.budgetMode) rig.budgetMode = "NEW_CASH";
    if (!rig.budgetCurrency) rig.budgetCurrency = displayCurrency() === "EUR" ? "EUR" : "RSD";
    if (pendingUiNewRig){ rig.budgetRequired = true; pendingUiNewRig = false; focusNewRig = true; }
    return rig;
  };

  const baseSaveRigDraft = saveRigDraft;
  saveRigDraft = function(){
    const draft = state.rigDraft;
    if (draft && !draft.id && B.rigRequiresBudget(draft) && !B.isValid(draft.budget)) return null;
    return baseSaveRigDraft.apply(this, arguments);
  };

  const BUDGET_FIELDS = ["budget","budgetMode","budgetCurrency","budgetRequired","targetMarginPct"];
  const baseDuplicateRig = Actions.duplicateRig;
  Actions.duplicateRig = function(id){
    const src = Store.get("rigs", id);
    const copy = baseDuplicateRig.apply(this, arguments);
    if (!copy || !src) return copy;
    const patch = {};
    BUDGET_FIELDS.forEach(k => { if (src[k] !== undefined && src[k] !== null) patch[k] = src[k]; });
    if (!Object.keys(patch).length) return copy;
    return Store.update("rigs", copy.id, patch) || Object.assign(copy, patch);
  };

  // The stored budget and component costs remain in canonical RSD.
  // budgetCurrency controls only entry and presentation, independently of the global display setting.
  function budgetCurrencyOf(rig){ return B.rigCurrency(rig); }
  function budgetDisplayValue(value, currency){ return currency === "EUR" ? rsdToEur(value) : value; }
  function budgetMoney(value, currency){ return money(budgetDisplayValue(value, currency), currency); }
  function budgetInputValue(value, currency){
    const converted = budgetDisplayValue(value, currency);
    return currency === "EUR"
      ? converted.toLocaleString("en-IE", {maximumFractionDigits:2})
      : converted.toLocaleString("en-US", {maximumFractionDigits:0}).replace(/,/g, ".");
  }

  function budgetEntry(rig){
    const e = state.rigBudgetEntry;
    return e && rig && e.rig === rig ? e : null;
  }

  function rigBudgetBlock(rig){
    if (!rig) return null;
    const entry = budgetEntry(rig);
    if (entry && entry.code) return entry.error || B.ERR[entry.code] || B.ERR.NONNUMERIC;
    if (B.rigRequiresBudget(rig) && !B.isValid(rig.budget)) return B.ERR.EMPTY;
    return null;
  }

  // Invalid text never overwrites the last valid limit; it is kept for display and blocks saving.
  function applyBudgetInput(rig, raw){
    const res = B.parse(raw, budgetCurrencyOf(rig));
    if (res.ok){ rig.budget = res.rsd; state.rigBudgetEntry = null; return res; }
    if (res.code === "EMPTY" && !B.rigRequiresBudget(rig)){ rig.budget = null; state.rigBudgetEntry = null; return res; }
    const prev = budgetEntry(rig);
    state.rigBudgetEntry = {rig, raw:String(raw == null ? "" : raw), error:res.code === "EMPTY" && !(prev && prev.attempted) ? null : res.error, code:res.code, attempted:!!(prev && prev.attempted)};
    return res;
  }

  const pctText = v => (Math.round(v * 10) / 10).toLocaleString("en-US") + "%";
  function rigBudgetRail(rig){
    const m = B.rigModel(rig);
    const currency = m.currency, mode = m.mode, budget = m.limit;
    const entry = budgetEntry(rig);
    const error = entry && entry.error ? entry.error : null;
    const tone = "is-" + m.tone + (m.required && !m.valid ? " is-required" : "") + (error ? " is-invalid" : "");
    const remaining = m.available;
    const remainingText = !m.valid ? (m.required ? "BUDGET REQUIRED" : "SET LIMIT") : budgetMoney(Math.abs(remaining), currency) + (remaining < 0 ? " OVER" : " LEFT");
    const used = Math.round(m.usedPct);
    const scale = Math.max(budget, m.committed) || 1;
    const ownedCounted = mode === "TOTAL_COST";
    const segOwned = m.valid && ownedCounted ? m.ownedBasis / scale * 100 : 0;
    const segPlanned = m.valid ? m.plannedCash / scale * 100 : 0;
    const limitAt = m.valid ? budget / scale * 100 : 100;
    const inputValue = entry ? entry.raw : (m.valid ? budgetInputValue(budget, currency) : "");
    let foot;
    if (!m.valid) foot = m.required ? "Every new build needs a limit. Enter a budget above zero to unlock SAVE and ASSEMBLE." : "Legacy rig without a limit. Set a budget to track this build.";
    else if (remaining < 0) foot = "Over budget by " + budgetMoney(-remaining, currency) + " (" + used + "% committed). Saving still works — trim parts or raise the limit.";
    else if (m.tone === "warn") foot = used + "% committed · near the limit, " + budgetMoney(remaining, currency) + " left.";
    else foot = used + "% committed";
    if (m.valid && m.unpricedCount) foot += " · " + m.unpricedCount + " planned part" + (m.unpricedCount === 1 ? "" : "s") + " unpriced";

    const stat = (label, value, sub, cls, attr) => '<div class="pn-rig-budget-stat' + (cls ? " " + cls : "") + '"' + (attr || "") + '><span>' + label + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : "") + '</div>';
    const partRows = m.parts.length ? m.parts.map(p => {
      const counted = p.kind !== "OWNED" || ownedCounted;
      return '<div class="pn-rig-budget-row is-' + p.kind.toLowerCase() + (counted ? "" : " is-excluded") + '" data-rig-budget-row="' + p.kind + '"><span class="k">' + escHtml(p.slot) + '</span><span class="n">' + escHtml(p.label) + '</span><span class="t">' + (p.kind === "OWNED" && !counted ? "OWNED · SUNK" : p.kind) + '</span><span class="a">' + (p.kind === "UNPRICED" ? "—" : budgetMoney(p.amount, currency)) + '</span><span class="p">' + (counted && m.valid && p.amount > 0 ? pctText(p.amount / budget * 100) : "—") + '</span></div>';
    }).join("") : '<p class="pn-rig-budget-hint">No parts in this build yet.</p>';

    return '<section class="pn-rig-budget ' + tone + '" data-rig-budget-rail data-budget-mode="' + mode + '" data-budget-currency="' + currency + '" data-budget-tone="' + m.tone + '" aria-label="Build budget">'
      + '<div class="pn-rig-budget-main"><label class="pn-rig-budget-k" for="pn-rig-budget-input">BUILD BUDGET' + (m.required ? ' <i class="pn-rig-budget-req">REQUIRED</i>' : "") + '</label>'
      + '<div class="pn-rig-budget-entry"><input id="pn-rig-budget-input" type="text" inputmode="decimal" autocomplete="off" aria-label="Build budget amount" aria-describedby="' + (error ? "pn-rig-budget-err " : "") + 'pn-rig-budget-foot"' + (m.required ? ' aria-required="true"' : "") + (error ? ' aria-invalid="true"' : "") + ' data-rig-budget-input value="' + escAttr(inputValue) + '" placeholder="' + (m.required ? "REQUIRED" : "SET BUDGET") + '"><select data-rig-budget-currency aria-label="Build budget currency"><option value="EUR"' + (currency === "EUR" ? " selected" : "") + '>EUR</option><option value="RSD"' + (currency === "RSD" ? " selected" : "") + '>RSD</option></select></div>'
      + (error ? '<p class="pn-rig-budget-err" id="pn-rig-budget-err" role="alert" data-rig-budget-error>' + escHtml(error) + '</p>' : "")
      + '</div>'
      + '<label class="pn-rig-budget-mode"><span>BUDGET MODE <em class="pn-rig-budget-chip" data-rig-budget-status>' + escHtml(m.status) + '</em></span><select data-rig-budget-mode aria-describedby="pn-rig-budget-mode-help"><option value="TOTAL_COST"' + (mode === "TOTAL_COST" ? " selected" : "") + '>TOTAL COST BASIS</option><option value="NEW_CASH"' + (mode === "NEW_CASH" ? " selected" : "") + '>NEW CASH SPEND</option></select><small id="pn-rig-budget-mode-help">' + escHtml(m.modeInfo.help) + '</small></label>'
      + stat("OWNED BASIS", budgetMoney(m.ownedBasis, currency), ownedCounted ? "counted · Vault parts" : "sunk · not new cash", "is-owned", ' data-rig-owned-basis="' + m.ownedBasis + '"')
      + stat("PLANNED CASH", budgetMoney(m.plannedCash, currency), m.unpricedCount ? m.unpricedCount + " unpriced" : "still to buy", "is-planned" + (m.unpricedCount ? " has-unpriced" : ""), ' data-rig-planned-cash="' + m.plannedCash + '"')
      + stat(remaining < 0 ? "OVER BUDGET" : "AVAILABLE", remainingText, m.valid ? "committed " + budgetMoney(m.committed, currency) : "", "is-result", ' data-rig-available="' + (m.valid ? remaining : "") + '"')
      + '<div class="pn-rig-budget-meter" role="progressbar" aria-label="Budget committed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, Math.max(0, used)) + '" aria-valuetext="' + (m.valid ? used + "% of budget committed" : "No budget set") + '">'
        + '<i class="seg-owned" style="width:' + segOwned.toFixed(2) + '%"></i><i class="seg-planned" style="width:' + segPlanned.toFixed(2) + '%"></i>'
        + (m.valid ? '<b class="tick-warn" style="left:' + (limitAt * B.WARN_PCT / 100).toFixed(2) + '%" title="' + B.WARN_PCT + '% warning line"></b>' + (m.committed > budget ? '<b class="tick-limit" style="left:' + limitAt.toFixed(2) + '%" title="Budget limit"></b>' : "") : "")
      + '</div>'
      + '<div class="pn-rig-budget-foot" id="pn-rig-budget-foot" role="status" aria-live="polite">' + escHtml(foot) + '</div>'
      + '<details class="pn-rig-budget-more" data-rig-fold="budget-ledger"' + (foldState("budget-ledger", false) ? " open" : "") + '><summary><b>COST LEDGER</b><span>' + m.parts.length + ' part' + (m.parts.length === 1 ? "" : "s") + '</span></summary>'
        + '<div class="pn-rig-budget-rows">' + partRows + '</div></details>'
      + '</section>';
  }

  function focusBudgetInput(){
    const el = document.querySelector("[data-rig-budget-input]");
    if (el && el.focus) el.focus();
  }

  // UI guard for user-triggered SAVE / ASSEMBLE / DISASSEMBLE / MARK SOLD. Returns false when blocked.
  globalThis.pnRigBudgetGuard = function(){
    const rig = state.rigDraft;
    const msg = rigBudgetBlock(rig);
    if (!msg) return true;
    const prev = budgetEntry(rig);
    state.rigBudgetEntry = {rig, raw:prev ? prev.raw : "", error:msg, code:prev ? prev.code : "EMPTY", attempted:true};
    setRigNotice("err", "Budget required — " + msg);
    focusBudgetInput();
    return false;
  };
  globalThis.pnRigBudgetApplyInput = applyBudgetInput;
  globalThis.pnRigBudgetBeginUiNew = function(){ pendingUiNewRig = true; };

  // Duplicate keeps the source budget. A source without a valid budget opens as an unsaved draft that must get one.
  globalThis.pnRigBudgetDuplicate = function(id){
    const src = Store.get("rigs", id);
    if (!src) return null;
    if (B.isValid(src.budget)){
      const copy = Actions.duplicateRig(id, null);
      if (!copy) return null;
      if (!copy.budgetRequired) Store.update("rigs", copy.id, {budgetRequired:true});
      return JSON.parse(JSON.stringify(Store.get("rigs", copy.id) || copy));
    }
    return {id:null, family:src.family, variantName:(src.variantName || "MAIN") + " copy", status:"PLANNED", purpose:src.purpose, currency:src.currency, slots:JSON.parse(JSON.stringify(src.slots || {})), estimatedMarketValue:src.estimatedMarketValue, expectedSalePrice:src.expectedSalePrice, targetMarginPct:src.targetMarginPct == null ? null : src.targetMarginPct, salePrice:null, saleDate:null, notes:src.notes || "", budget:null, budgetMode:src.budgetMode || "NEW_CASH", budgetCurrency:B.rigCurrency(src), budgetRequired:true};
  };

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
    const checkStatus = escHtml(check.verdict)+" · "+(counts.FAIL ? counts.FAIL+" FAIL · " : "")+(counts.WARN ? counts.WARN+" WARN · " : "")+(counts.PASS || 0)+" VERIFIED · "+(counts.UNVERIFIED || 0)+" UNVERIFIED";
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
    const SAVE_TRIGGERS = "[data-rig-save],[data-assemble-rig],[data-disassemble-rig],[data-mark-rig-sold]";
    document.addEventListener("click", e => {
      const t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      if (t.closest("[data-new-rig],[data-new-rig-variant]")){ pnRigBudgetBeginUiNew(); return; }
      const dup = t.closest("[data-duplicate-rig]");
      if (dup){
        e.preventDefault(); e.stopImmediatePropagation();
        const draft = pnRigBudgetDuplicate(dup.dataset.duplicateRig);
        if (!draft) return;
        state.rigDraft = draft;
        state.rigBudgetEntry = null;
        if (!draft.id){ setRigNotice("err", "Copy opened as a draft — set its build budget before saving."); focusBudgetInput(); }
        else render();
        return;
      }
      if (t.closest(SAVE_TRIGGERS) && state.rigDraft && !pnRigBudgetGuard()){ e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    document.addEventListener("click", () => {
      pendingUiNewRig = false;
      if (!focusNewRig) return;
      focusNewRig = false;
      setTimeout(focusBudgetInput, 0);
    });
    root.addEventListener("input", e => {
      const input = e.target.closest && e.target.closest("[data-rig-budget-input]");
      if (!input || !state.rigDraft) return;
      applyBudgetInput(state.rigDraft, input.value);
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
    + C+" .pn-rig-budget{--budget-tone:#58aee8;position:relative;display:grid;grid-template-columns:minmax(210px,1.25fr) minmax(220px,1fr) repeat(3,minmax(145px,.8fr));gap:8px 18px;align-items:start;margin-bottom:8px;padding:10px 16px 10px;border:1px solid color-mix(in srgb,var(--budget-tone) 48%,transparent);border-left:4px solid var(--budget-tone);background:linear-gradient(90deg,color-mix(in srgb,var(--budget-tone) 12%,transparent),rgba(8,8,18,.72) 45%),repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0 1px,transparent 1px 22px);clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);transition:border-color .25s ease}"
    + C+" .pn-rig-budget.is-ok{--budget-tone:#3ee07a}"+C+" .pn-rig-budget.is-warn{--budget-tone:#f2c94c}"+C+" .pn-rig-budget.is-over{--budget-tone:#ff4a4a}"+C+" .pn-rig-budget.is-required{--budget-tone:#ff9f43}"
    + C+" .pn-rig-budget-k,"+C+" .pn-rig-budget-stat>span,"+C+" .pn-rig-budget-mode>span{display:flex;align-items:center;gap:8px;min-height:16px;margin-bottom:4px;font:600 10px var(--stamp);letter-spacing:.18em;color:color-mix(in srgb,var(--budget-tone) 72%,#fff)}"
    + C+" .pn-rig-budget-req{font:700 8.5px var(--stamp);font-style:normal;letter-spacing:.16em;padding:1px 6px;color:#0a0a12;background:var(--budget-tone)}"
    + C+" .pn-rig-budget-chip{margin-left:auto;font:700 8.5px var(--stamp);font-style:normal;letter-spacing:.14em;padding:1px 7px;color:var(--budget-tone);border:1px solid color-mix(in srgb,var(--budget-tone) 70%,transparent);background:color-mix(in srgb,var(--budget-tone) 12%,transparent);white-space:nowrap}"
    + C+" .pn-rig-budget-entry{display:flex;align-items:center;gap:8px}"+C+" .pn-rig-budget-entry input{flex:1 1 0;min-width:0;height:34px;font:700 20px var(--stamp)!important;color:#fff}"+C+" .pn-rig-budget-entry select{flex:0 0 76px;width:76px;min-width:76px;height:34px;padding:4px 6px;font:700 12px var(--stamp)!important;letter-spacing:.04em;color:var(--budget-tone);border-color:var(--budget-tone)!important}"
    + C+" .pn-rig-budget.is-required .pn-rig-budget-entry input,"+C+" .pn-rig-budget-entry input[aria-invalid=true]{border-color:var(--budget-tone)!important;box-shadow:0 0 0 1px var(--budget-tone),0 0 14px -4px var(--budget-tone)}"+C+" .pn-rig-budget-entry input[aria-invalid=true]{--budget-tone:#ff4a4a}"
    + C+" .pn-rig-budget-entry input:focus-visible,"+C+" .pn-rig-budget select:focus-visible,"+C+" .pn-rig-budget-more>summary:focus-visible{outline:2px solid var(--budget-tone);outline-offset:2px}"
    + C+" .pn-rig-budget-err{margin:5px 0 0;font:600 11px var(--mono);color:#ff8c8c}"+C+" .pn-rig-budget-err::before{content:'! ';font-weight:700;color:#ff4a4a}"
    + C+" .pn-rig-budget-mode{min-width:0}"+C+" .pn-rig-budget-mode select{width:100%;height:34px;padding-top:4px;padding-bottom:4px;font:600 11px var(--stamp)!important;letter-spacing:.08em}"+C+" .pn-rig-budget-mode small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px;font:500 10px/1.35 var(--sans);color:var(--text-muted)}"
    + C+" .pn-rig-budget-stat{min-width:0;padding-left:10px;border-left:2px solid color-mix(in srgb,var(--budget-tone) 36%,transparent)}"+C+" .pn-rig-budget-stat b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 17px/1.25 var(--stamp);letter-spacing:.03em;color:#fff}"+C+" .pn-rig-budget-stat small{display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 9.5px var(--mono);letter-spacing:.04em;color:var(--text-muted)}"
    + C+" .pn-rig-budget-stat.is-owned{border-left-color:#c39bff}"+C+" .pn-rig-budget-stat.is-planned{border-left-color:#74c7ff}"+C+" .pn-rig-budget-stat.has-unpriced small{color:#f2c94c}"+C+" .pn-rig-budget-stat.is-result b{color:var(--budget-tone);text-shadow:0 0 14px color-mix(in srgb,var(--budget-tone) 45%,transparent)}"
    + C+" .pn-rig-budget-meter{grid-column:1/-1;position:relative;display:flex;height:8px;margin-top:2px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 calc(5% - 2px),transparent calc(5% - 2px) 5%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}"
    + C+" .pn-rig-budget-meter>i{display:block;height:100%;transition:width .3s ease}"+C+" .pn-rig-budget-meter>.seg-owned{background:repeating-linear-gradient(135deg,#c39bff 0 4px,color-mix(in srgb,#c39bff 45%,transparent) 4px 7px)}"+C+" .pn-rig-budget-meter>.seg-planned{background:var(--budget-tone);box-shadow:0 0 10px var(--budget-tone)}"
    + C+" .pn-rig-budget-meter>b{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px}"+C+" .pn-rig-budget-meter>.tick-warn{background:#f2c94c;opacity:.75}"+C+" .pn-rig-budget-meter>.tick-limit{width:3px;background:#ff4a4a;box-shadow:0 0 8px #ff4a4a}"
    + C+" .pn-rig-budget-foot{grid-column:1/-1;margin-top:-2px;font:500 10.5px var(--mono);color:var(--text-muted);text-align:right}"+C+" .pn-rig-budget.is-over .pn-rig-budget-foot,"+C+" .pn-rig-budget.is-warn .pn-rig-budget-foot,"+C+" .pn-rig-budget.is-required .pn-rig-budget-foot{color:color-mix(in srgb,var(--budget-tone) 80%,#fff)}"
    + C+" .pn-rig-budget-more{grid-column:1/-1;min-width:0;border-top:1px dashed color-mix(in srgb,var(--budget-tone) 30%,transparent)}"+C+" .pn-rig-budget-more>summary{display:flex;align-items:center;gap:12px;padding:6px 0 0;cursor:pointer;list-style:none}"+C+" .pn-rig-budget-more>summary::-webkit-details-marker{display:none}"
    + C+" .pn-rig-budget-more>summary::before{content:'+';width:14px;font:700 13px var(--stamp);color:var(--budget-tone)}"+C+" .pn-rig-budget-more[open]>summary::before{content:'\\2212'}"+C+" .pn-rig-budget-more>summary b{font:600 10px var(--stamp);letter-spacing:.18em;color:#fff;white-space:nowrap}"+C+" .pn-rig-budget-more>summary span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 10.5px var(--mono);color:var(--text-muted)}"
    + C+" .pn-rig-budget-hint{margin:8px 0;font:500 11px var(--sans);color:var(--text-muted)}"
    + C+" .pn-rig-budget-rows{display:flex;flex-direction:column;gap:3px;margin-bottom:4px}"+C+" .pn-rig-budget-row{display:grid;grid-template-columns:86px minmax(0,1fr) 128px 112px 56px;gap:10px;align-items:center;padding:4px 8px;border-left:2px solid #74c7ff;background:rgba(255,255,255,.025);font:500 11px var(--mono)}"
    + C+" .pn-rig-budget-row .k{font:600 10px var(--stamp);letter-spacing:.14em;color:#fff}"+C+" .pn-rig-budget-row .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}"+C+" .pn-rig-budget-row .t{font:600 9px var(--stamp);letter-spacing:.12em;color:#74c7ff}"+C+" .pn-rig-budget-row .a,"+C+" .pn-rig-budget-row .p{text-align:right;color:var(--text)}"+C+" .pn-rig-budget-row .p{color:var(--text-muted)}"
    + C+" .pn-rig-budget-row.is-owned{border-left-color:#c39bff}"+C+" .pn-rig-budget-row.is-owned .t{color:#c39bff}"+C+" .pn-rig-budget-row.is-unpriced{border-left-color:#f2c94c}"+C+" .pn-rig-budget-row.is-unpriced .t{color:#f2c94c}"+C+" .pn-rig-budget-row.is-excluded{opacity:.62}"
    + "@media(prefers-reduced-motion:reduce){"+C+" .pn-rig-budget,"+C+" .pn-rig-budget-meter>i{transition:none}}"
    + "@media(max-width:620px){"+C+" .pn-rig-budget{padding:10px 12px}"+C+" .pn-rig-budget-row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'k a' 'n p' 't t';row-gap:1px}"+C+" .pn-rig-budget-row .k{grid-area:k}"+C+" .pn-rig-budget-row .n{grid-area:n}"+C+" .pn-rig-budget-row .t{grid-area:t}"+C+" .pn-rig-budget-row .a{grid-area:a}"+C+" .pn-rig-budget-row .p{grid-area:p}"+C+" .pn-rig-budget-foot{text-align:left}}"
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
    + "@media(max-width:620px){"+C+" .pn-rig-budget{grid-template-columns:minmax(0,1fr)}"+C+" .pn-rig-fold>summary{grid-template-columns:1fr auto}"+C+" .pn-rig-fold>summary span{grid-column:1/-1;grid-row:2;white-space:normal}"+C+" .pn-rig-results-primary{grid-template-columns:1fr!important}}";
  document.head.appendChild(style);

  console.info("[PROFITNODE] RIG ASSEMBLY compact budget controls active.");
})();
