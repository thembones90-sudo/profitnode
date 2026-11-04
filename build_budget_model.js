"use strict";

(function installBuildBudgetModelV1(){
  if (globalThis.PN_BUDGET && globalThis.PN_BUDGET.__v1) return;

  const WARN_PCT = 80;
  const MAX_RSD = 1e9;
  const MODE_INFO = {
    NEW_CASH: {label:"NEW CASH SPEND", short:"NEW CASH", help:"Counts only money still to be spent. Owned Vault parts are sunk cost and never consume this budget."},
    TOTAL_COST: {label:"TOTAL COST BASIS", short:"TOTAL COST", help:"Counts the true landed cost: owned/reused basis plus every planned purchase."}
  };
  const ERR = {
    EMPTY: "A build budget is required. Enter an amount greater than zero.",
    NONNUMERIC: "Budget must be a plain number, e.g. 500 or 58.750.",
    NEGATIVE: "Budget cannot be negative.",
    ZERO: "Budget must be greater than zero.",
    TOO_LARGE: "Budget is too large to be a real build limit.",
    CURRENCY: "Choose EUR or RSD for the budget."
  };

  const normCurrency = c => c === "EUR" ? "EUR" : c === "RSD" ? "RSD" : null;
  const roundFor = v => Math.round(v * 100) / 100;
  const toRsd = (v, c) => c === "EUR" ? eurToRsd(v) : v;
  const fromRsd = (v, c) => c === "EUR" ? rsdToEur(v) : v;
  const fail = code => ({ok:false, code, error:ERR[code]});

  function parse(input, currency, opts){
    opts = opts || {};
    const c = normCurrency(currency);
    if (!c) return fail("CURRENCY");
    let amount;
    if (typeof input === "number"){
      if (Number.isNaN(input)) return fail("NONNUMERIC");
      if (!Number.isFinite(input)) return fail("TOO_LARGE");
      amount = input;
    } else {
      const raw = String(input == null ? "" : input).trim();
      if (!raw) return fail("EMPTY");
      const cleaned = raw.replace(/\s+/g, "").replace(/(?:RSD|EUR|€|дин\.?)/gi, "");
      if (!cleaned) return fail("NONNUMERIC");
      if (opts.format === "number"){
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned)) return fail("NONNUMERIC");
        amount = Number(cleaned);
      } else {
        if (!/^[+-]?[\d.,]*\d[\d.,]*$/.test(cleaned)) return fail("NONNUMERIC");
        const negative = cleaned.charAt(0) === "-";
        amount = parseMoneyInput(cleaned.replace(/^[+-]/, ""));
        if (negative) amount = -amount;
      }
      if (Number.isNaN(amount)) return fail("NONNUMERIC");
      if (!Number.isFinite(amount)) return fail("TOO_LARGE");
    }
    if (amount < 0) return fail("NEGATIVE");
    if (amount === 0) return fail("ZERO");
    amount = roundFor(amount, c);
    if (!(amount > 0)) return fail("ZERO");
    const rsd = toRsd(amount, c);
    if (!(rsd <= MAX_RSD)) return fail("TOO_LARGE");
    return {ok:true, amount, currency:c, rsd};
  }

  function isValid(value){
    if (value === null || value === undefined || value === "" || typeof value === "boolean") return false;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 && n <= MAX_RSD;
  }

  function toneFor(limit, committed, spent){
    if (!(limit > 0)) return {tone:"unset", status:"NO LIMIT SET", pct:0};
    const pct = committed / limit * 100;
    const eps = 1e-6;
    if (spent - limit > eps) return {tone:"over", status:"BUDGET BREACH", pct};
    if (committed - limit > eps) return {tone:"over", status:spent > 0 ? "PLANNED BREACH" : "OVER BUDGET", pct};
    if (pct >= WARN_PCT) return {tone:"warn", status:"NEAR LIMIT", pct};
    return {tone:"ok", status:"WITHIN PARAMETERS", pct};
  }

  function rigCurrency(rig){
    return normCurrency(rig && rig.budgetCurrency) || (typeof displayCurrency === "function" && displayCurrency() === "EUR" ? "EUR" : "RSD");
  }

  function rigRequiresBudget(rig){
    return !!(rig && rig.budgetRequired);
  }

  function rigModel(rig){
    rig = rig || {};
    const currency = rigCurrency(rig);
    const mode = rig.budgetMode === "TOTAL_COST" ? "TOTAL_COST" : "NEW_CASH";
    const limit = isValid(rig.budget) ? Number(rig.budget) : 0;
    const seen = new Set();
    const parts = [];
    let owned = 0, planned = 0, unpriced = 0, duplicates = 0;
    (typeof RIG_SLOTS !== "undefined" ? RIG_SLOTS : []).forEach(key => {
      const slot = rig.slots && rig.slots[key];
      if (!slot) return;
      const resolved = rigSlotResolved(slot, "RSD", key);
      const cost = Math.max(0, Number(resolved && resolved.cost) || 0);
      const label = (resolved && resolved.label) || slot.label || (typeof RIG_SLOT_LABELS !== "undefined" && RIG_SLOT_LABELS[key]) || key;
      if (slot.kind === "INVENTORY"){
        const ids = typeof rigInventoryItemIds === "function" ? rigInventoryItemIds(slot) : [slot.inventoryItemId].filter(Boolean);
        if (ids.length && ids.every(id => seen.has(id))){ duplicates++; return; }
        ids.forEach(id => seen.add(id));
        owned += cost;
        parts.push({slot:key, label, kind:"OWNED", amount:cost});
      } else {
        planned += cost;
        const isUnpriced = !(cost > 0);
        if (isUnpriced) unpriced++;
        parts.push({slot:key, label, kind:isUnpriced ? "UNPRICED" : "PLANNED", amount:cost});
      }
    });
    const totalBasis = owned + planned;
    const committed = mode === "NEW_CASH" ? planned : totalBasis;
    const available = limit - committed;
    const t = toneFor(limit, committed, 0);
    const target = Number(rig.expectedSalePrice) > 0 ? Number(rig.expectedSalePrice) : 0;
    const margin = Number(rig.targetMarginPct);
    const suggested = !(target > 0) && totalBasis > 0 && Number.isFinite(margin) && margin > 0 && margin < 100 && typeof suggestedSalePrice === "function" ? suggestedSalePrice(totalBasis, margin) : null;
    const resale = target > 0 ? {
      target, source:"EXPECTED SALE PRICE", breakEven:totalBasis,
      profitBasis:target - totalBasis, marginPct:(target - totalBasis) / target * 100,
      cashRecovery:target - planned
    } : null;
    return {
      kind:"rig", currency, mode, modeInfo:MODE_INFO[mode], limit, required:rigRequiresBudget(rig), valid:limit > 0,
      paidCash:null, plannedCash:planned, unpricedCount:unpriced, duplicateCount:duplicates,
      ownedBasis:owned, totalBasis, committed, available, variance:available,
      usedPct:t.pct, tone:t.tone, status:limit > 0 ? t.status : rigRequiresBudget(rig) ? "BUDGET REQUIRED" : t.status,
      resale, suggested, suggestedMarginPct:suggested != null ? margin : null, parts
    };
  }

  function projectModel(project){
    project = project || {};
    const currency = project.currency || "RSD";
    const mode = project.budgetMode === "NEW_CASH" ? "NEW_CASH" : "TOTAL_COST";
    const limit = isValid(project.budget) ? Number(project.budget) : 0;
    const stats = Actions.projectBuildStats(project);
    const paidCash = Number(stats.projectCash) || 0;
    const reused = Number(stats.reusedInventoryBasis != null ? stats.reusedInventoryBasis : stats.reusedBasis) || 0;
    const totalBasis = Number(stats.totalCostBasis) || 0;
    const planned = Number(stats.plannedCost) || 0;
    const allocs = typeof pnBudgetAllocations === "function" ? pnBudgetAllocations(project) : [];
    const allocated = allocs.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const spent = mode === "NEW_CASH" ? paidCash : totalBasis;
    const committed = spent + planned + allocated;
    const leftNow = limit - spent;
    const available = limit - committed;
    const t = toneFor(limit, committed, spent);
    const listing = Number(project.listingPrice) > 0 ? Number(project.listingPrice) : 0;
    const est = Number(project.estimatedMarketValue) > 0 ? Number(project.estimatedMarketValue) : 0;
    const target = listing || est;
    const breakEven = totalBasis + planned + allocated;
    const resale = target > 0 && project.status !== "SOLD" && project.status !== "GIFTED" ? {
      target, source:listing ? "LISTING PRICE" : "EST. MARKET VALUE", breakEven,
      profitBasis:target - breakEven, marginPct:(target - breakEven) / target * 100,
      cashRecovery:target - (paidCash + planned + allocated)
    } : null;
    return {
      kind:"project", currency, mode, modeInfo:MODE_INFO[mode], limit, required:!!project.budgetRequired, valid:limit > 0,
      paidCash, reusedBasis:reused, totalBasis, plannedCash:planned, allocated, allocations:allocs,
      spent, committed, leftNow, available, variance:available,
      usedPct:t.pct, tone:t.tone, status:limit > 0 ? t.status : project.budgetRequired ? "BUDGET REQUIRED" : t.status,
      resale
    };
  }

  // A project's budget and currency-less allocations are stored in project currency.
  // When the currency changes, convert the unchanged budget and pin allocation currency so meaning is preserved.
  function projectCurrencyPatch(prev, data){
    const from = prev && prev.currency, to = data && data.currency;
    if (!from || !to || from === to) return data;
    const out = Object.assign({}, data);
    if (isValid(prev.budget)){
      const submitted = Object.prototype.hasOwnProperty.call(data, "budget") ? data.budget : prev.budget;
      if (submitted === null || submitted === undefined || submitted === "" || Math.abs(Number(submitted) - Number(prev.budget)) < 1e-9){
        if (submitted !== null && submitted !== "") out.budget = roundFor(convert(Number(prev.budget), from, to), to);
      }
    }
    const map = data.allocations || prev.allocations;
    if (map && typeof map === "object"){
      const pinned = {};
      Object.keys(map).forEach(k => {
        const a = map[k];
        pinned[k] = a && typeof a === "object" ? Object.assign({}, a, {currency:a.currency || from}) : a;
      });
      out.allocations = pinned;
    }
    return out;
  }

  function fmt(value, currency){
    return money(value, currency);
  }

  globalThis.PN_BUDGET = {
    __v1:true, WARN_PCT, MAX_RSD, MODE_INFO, ERR,
    parse, isValid, toneFor, rigModel, projectModel, rigCurrency, rigRequiresBudget,
    projectCurrencyPatch, toRsd, fromRsd, roundFor, fmt
  };
  globalThis.pnBudgetParse = parse;
  globalThis.pnRigBudgetModel = rigModel;
  globalThis.pnProjectBudgetModel = projectModel;

  console.info("[PROFITNODE] Build budget model active · NEW CASH / TOTAL COST shared math.");
})();
