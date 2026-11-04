"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const env = require("./pn_test_env.js");
const sandbox = env.createSandbox();
env.loadAll(sandbox, __dirname);
env.fireDOMContentLoaded(sandbox);
for (const file of ["profit_blueprints_v1.js", "profit_blueprints_rare_v3.js"]) {
  try { vm.runInContext(fs.readFileSync(path.join(__dirname, file), "utf8"), sandbox, {filename:file}); }
  catch (err) { sandbox.__pnBlueprintLoadError = (sandbox.__pnBlueprintLoadError || "") + file + ": " + err.message + " "; }
}

const results = vm.runInContext(`(function(){
  Store.load();
  const out = [];
  const t = (name, ok) => out.push([name, !!ok]);
  const near = (a, b) => Math.abs(a - b) < 0.01;
  const B = PN_BUDGET;
  const inv = (o) => Store.insert("inventory", Object.assign({category:"GPU",manufacturer:"Test",model:"Part",purchasePrice:0,currency:"RSD",estimatedMarketValue:0,purchaseDate:"2026-10-20",status:"IN_STORAGE",condition:"WORKING",source:"PURCHASE"}, o));

  // ---- 1. Input validation ----
  const rejects = [["", "EMPTY"], ["   ", "EMPTY"], [null, "EMPTY"], ["abc", "NONNUMERIC"], ["12abc", "NONNUMERIC"], ["NaN", "NONNUMERIC"], ["Infinity", "NONNUMERIC"], ["1e999", "NONNUMERIC"], ["0", "ZERO"], ["0,00", "ZERO"], ["-5", "NEGATIVE"], ["-500 EUR", "NEGATIVE"], ["99999999999", "TOO_LARGE"]];
  rejects.forEach(([raw, code]) => { const r = B.parse(raw, "RSD"); t("parse rejects " + JSON.stringify(raw) + " as " + code, !r.ok && r.code === code && r.error); });
  t("parse rejects numeric NaN and Infinity", !B.parse(NaN, "EUR").ok && !B.parse(Infinity, "EUR").ok && !B.parse(-1, "EUR").ok && !B.parse(0, "EUR").ok);
  t("parse rejects an unknown currency", B.parse("100", "USD").code === "CURRENCY");
  const eur = B.parse("500", "EUR");
  t("500 EUR parses to canonical 58.750 RSD", eur.ok && eur.amount === 500 && eur.rsd === 58750);
  const rsd = B.parse("58.750", "RSD");
  t("58.750 RSD (thousands dot) parses to 58750", rsd.ok && rsd.amount === 58750 && rsd.rsd === 58750);
  t("European decimal 1.234,56 EUR parses", near(B.parse("1.234,56", "EUR").amount, 1234.56));
  t("currency symbols are tolerated", B.parse("€ 200", "EUR").amount === 200 && B.parse("23500 RSD", "RSD").amount === 23500);
  t("number-format parse (project form) accepts 1e4 and rejects 1e999", B.parse("1e4", "RSD", {format:"number"}).amount === 10000 && B.parse("1e999", "RSD", {format:"number"}).code === "TOO_LARGE");
  t("isValid only accepts finite positive stored budgets", B.isValid(1) && !B.isValid(0) && !B.isValid(null) && !B.isValid("") && !B.isValid(-1) && !B.isValid(NaN) && !B.isValid(Infinity) && !B.isValid(true));

  // ---- 2. New rig budget requirement (UI path) ----
  state.route = "rigbuild";
  const rigsBefore = Store.all("rigs").length;
  pnRigBudgetBeginUiNew();
  const draft = newRigDraft("BUDGET UI");
  t("UI-created rig drafts are budget-required with an unset (null) limit", draft.budgetRequired === true && draft.budget === null && draft.budgetMode === "NEW_CASH");
  const plain = newRigDraft("PROGRAMMATIC");
  t("programmatic newRigDraft stays legacy-compatible (no requirement)", !plain.budgetRequired);
  state.rigDraft = draft;
  let html = ROUTES.find(r => r.key === "rigbuild").render();
  t("required rail shows REQUIRED chip and BUDGET REQUIRED status", html.includes("pn-rig-budget-req") && html.includes("BUDGET REQUIRED") && html.includes('aria-required="true"'));
  t("UI guard blocks SAVE/ASSEMBLE without a budget", pnRigBudgetGuard() === false && state.rigNotice && state.rigNotice.tone === "err");
  html = ROUTES.find(r => r.key === "rigbuild").render();
  t("blocked save shows an inline role=alert error and aria-invalid", html.includes('role="alert" data-rig-budget-error') && html.includes('aria-invalid="true"'));
  t("raw saveRigDraft refuses to insert a required rig without budget", saveRigDraft() === null && Store.all("rigs").length === rigsBefore);
  ["abc", "0", "-5", "Infinity", "1e999"].forEach(raw => {
    const r = pnRigBudgetApplyInput(draft, raw);
    t("rig input " + JSON.stringify(raw) + " is refused without coercion", !r.ok && draft.budget === null && pnRigBudgetGuard() === false);
  });
  draft.budgetCurrency = "EUR";
  const ok = pnRigBudgetApplyInput(draft, "500");
  t("valid EUR input stores canonical RSD and clears the error", ok.ok && draft.budget === 58750 && !state.rigBudgetEntry && pnRigBudgetGuard() === true);
  const savedId = saveRigDraft();
  const saved = Store.get("rigs", savedId);
  t("rig saves once budget is valid and persists policy + currency", saved && saved.budget === 58750 && saved.budgetCurrency === "EUR" && saved.budgetRequired === true);
  pnRigBudgetApplyInput(draft, "");
  t("clearing a once-valid budget blocks save even before an error was shown", draft.budget === 58750 && pnRigBudgetGuard() === false);
  pnRigBudgetApplyInput(draft, "500");
  pnRigBudgetApplyInput(draft, "garbage");
  t("invalid edit on a saved rig keeps the last valid limit (no data loss) and blocks save", draft.budget === 58750 && pnRigBudgetGuard() === false);
  pnRigBudgetApplyInput(draft, "");
  t("clearing a required rig's budget is refused", draft.budget === 58750 && pnRigBudgetGuard() === false);
  pnRigBudgetApplyInput(draft, "600");
  t("recovering with a valid amount unblocks", near(draft.budget, 70500) && pnRigBudgetGuard() === true);

  // ---- 3. Legacy rigs ----
  const legacy = Store.insert("rigs", {family:"LEGACY", variantName:"MAIN", status:"PLANNED", purpose:"FLIP", currency:"RSD", slots:emptyRigSlots(), estimatedMarketValue:0, expectedSalePrice:0, notes:""});
  state.rigDraft = JSON.parse(JSON.stringify(legacy));
  t("legacy rig without budget is not blocked", pnRigBudgetGuard() === true && saveRigDraft() === legacy.id);
  html = ROUTES.find(r => r.key === "rigbuild").render();
  t("legacy rig rail invites a limit without REQUIRED", html.includes("SET LIMIT") && !html.includes("pn-rig-budget-req") && html.includes('data-budget-mode="NEW_CASH"'));
  pnRigBudgetApplyInput(state.rigDraft, "");
  t("legacy rigs may keep an empty budget", state.rigDraft.budget === null && pnRigBudgetGuard() === true);

  // ---- 4. Duplicate ----
  Store.update("rigs", savedId, {targetMarginPct:25, budgetMode:"TOTAL_COST"});
  const dupCopy = pnRigBudgetDuplicate(savedId);
  t("duplicating a budgeted rig copies budget, mode, currency, margin and policy", dupCopy && dupCopy.id && dupCopy.budget === 58750 && dupCopy.budgetMode === "TOTAL_COST" && dupCopy.budgetCurrency === "EUR" && dupCopy.targetMarginPct === 25 && dupCopy.budgetRequired === true);
  const direct = Actions.duplicateRig(savedId, "API COPY");
  t("Actions.duplicateRig keeps budget fields too", direct && direct.budget === 58750 && direct.budgetMode === "TOTAL_COST");
  const nRigs = Store.all("rigs").length;
  const legacyDup = pnRigBudgetDuplicate(legacy.id);
  t("duplicating a budgetless rig opens an unsaved draft that requires a budget", legacyDup && legacyDup.id === null && legacyDup.budgetRequired === true && legacyDup.budget === null && Store.all("rigs").length === nRigs);
  t("legacy API duplicate of a budgetless rig still works", !!Actions.duplicateRig(legacy.id, "LEGACY API"));

  // ---- 5. Both cost modes, RAM sticks, storage, unpriced, dedupe ----
  const gpu = inv({category:"GPU", purchasePrice:100, currency:"EUR"});
  const ramA = inv({category:"RAM", model:"8GB A", purchasePrice:2000});
  const ramB = inv({category:"RAM", model:"8GB B", purchasePrice:2000});
  const ssd = inv({category:"STORAGE", model:"SSD", purchasePrice:3000});
  const rig = newRigDraft("MATH");
  rig.budget = 50000;
  rig.slots.CPU = {kind:"PLANNED", label:"AMD Ryzen 5 5600", cost:10000, currency:"RSD"};
  rig.slots.GPU = {kind:"INVENTORY", inventoryItemId:gpu.id};
  rig.slots.RAM = {kind:"INVENTORY", inventoryItemId:ramA.id, ramInventoryItemIds:[ramA.id, ramB.id]};
  rig.slots.STORAGE = {kind:"INVENTORY", inventoryItemId:ssd.id};
  rig.slots.STORAGE2 = {kind:"PLANNED", label:"Extra HDD", cost:2500, currency:"RSD"};
  rig.slots.PSU = {kind:"PLANNED", label:"Unknown PSU", cost:0, currency:"RSD"};
  let m = pnRigBudgetModel(rig);
  t("owned basis = EUR GPU converted + both RAM sticks once + SSD", near(m.ownedBasis, 11750 + 4000 + 3000));
  t("planned cash = CPU + extra storage drive", m.plannedCash === 12500);
  t("unpriced planned PSU is flagged, not silently treated as fine", m.unpricedCount === 1 && m.parts.some(p => p.kind === "UNPRICED"));
  t("NEW CASH commits only planned purchases", m.mode === "NEW_CASH" && m.committed === 12500 && m.available === 37500);
  rig.budgetMode = "TOTAL_COST";
  m = pnRigBudgetModel(rig);
  t("TOTAL COST commits owned basis + planned", near(m.committed, 31250) && near(m.available, 18750));
  rig.slots.STORAGE3 = {kind:"INVENTORY", inventoryItemId:ssd.id};
  m = pnRigBudgetModel(rig);
  t("the same inventory item in two slots is counted once", m.duplicateCount === 1 && near(m.committed, 31250));
  delete rig.slots.STORAGE3;
  rig.slots.CPU = {kind:"INVENTORY", inventoryItemId:inv({category:"CPU", purchasePrice:9000}).id};
  m = pnRigBudgetModel(rig);
  t("replacing a planned part with owned stock moves its cost, no double count", m.plannedCash === 2500 && near(m.ownedBasis, 11750 + 4000 + 3000 + 9000));

  // ---- 6. Warning tones (>=80% warn, >100% over, never a hard block) ----
  const toneRig = budget => { const r = newRigDraft("TONE"); r.budget = budget; r.slots.CPU = {kind:"PLANNED", label:"CPU", cost:8000, currency:"RSD"}; return pnRigBudgetModel(r); };
  t("79% is within parameters", toneRig(10126).tone === "ok");
  t("80% is near limit", toneRig(10000).tone === "warn" && toneRig(10000).status === "NEAR LIMIT");
  t("100% exactly is still a warning, not over", toneRig(8000).tone === "warn");
  t("over 100% is over budget", toneRig(7999).tone === "over" && toneRig(7999).available < 0);
  const overDraft = newRigDraft("OVER"); overDraft.budgetRequired = true; overDraft.budget = 1000; overDraft.slots.CPU = {kind:"PLANNED", label:"CPU", cost:8000, currency:"RSD"};
  state.rigDraft = overDraft;
  t("an over-budget rig can still be saved (warning, not a cap)", pnRigBudgetGuard() === true && !!saveRigDraft());
  html = ROUTES.find(r => r.key === "rigbuild").render();
  t("over-budget rail announces status politely and draws a limit marker", html.includes('role="status" aria-live="polite"') && html.includes("OVER BUDGET") && html.includes("tick-limit"));

  // ---- 7. Rig sale outlook ----
  const sale = newRigDraft("SALE");
  sale.budget = 50000;
  sale.slots.CPU = {kind:"PLANNED", label:"CPU", cost:10000, currency:"RSD"};
  sale.slots.GPU = {kind:"INVENTORY", inventoryItemId:gpu.id};
  sale.expectedSalePrice = 50000;
  m = pnRigBudgetModel(sale);
  t("break-even equals true basis (owned + planned)", near(m.resale.breakEven, 21750));
  t("projected profit uses true basis, not cash", near(m.resale.profitBasis, 28250) && near(m.resale.marginPct, 56.5));
  t("cash back is measured against new cash only", near(m.resale.cashRecovery, 40000));
  state.rigDraft = sale;
  html = ROUTES.find(r => r.key === "rigbuild").render();
  t("rail renders the sale outlook with basis profit", html.includes("data-rig-sale-outlook") && html.includes('data-rig-profit-basis="28250"'));
  sale.expectedSalePrice = 0; sale.targetMarginPct = 20;
  m = pnRigBudgetModel(sale);
  t("without a sale price only a labelled margin suggestion is offered", m.resale === null && near(m.suggested, 21750 / 0.8));
  sale.targetMarginPct = null;
  m = pnRigBudgetModel(sale);
  t("no price is invented when neither price nor margin exists", m.resale === null && m.suggested === null);

  // ---- 8. Project form ----
  function projectForm(values, id){
    const form = __pnEl({tag:"form", attrs:{"data-entity-form":"project"}, dataset:Object.assign({entityForm:"project"}, id ? {id} : {})});
    Object.keys(values).forEach(k => form.appendChild(__pnEl({tag:k === "currency" || k === "budgetMode" || k === "status" || k === "purpose" ? "select" : "input", name:k, attrs:{name:k}, value:values[k]})));
    return form;
  }
  const baseValues = {name:"FORM BUILD", startDate:"2026-11-04", status:"PLANNING", purpose:"FLIP", currency:"RSD", budgetMode:"NEW_CASH", additionalCosts:"0"};
  const schemaNew = FORM_SCHEMAS.project(null);
  const bf = schemaNew.fields.find(f => f.key === "budget");
  t("NEW PROJECT schema has a required Build Budget and a mode select", bf && bf.required && bf.min > 0 && schemaNew.fields.some(f => f.key === "budgetMode" && f.default === "NEW_CASH"));
  t("budget field renders with hint and error slot", renderFieldHtml(bf, null).includes("data-pb-budget-error") && renderFieldHtml(bf, null).includes(" required"));
  const projBefore = Store.all("projects").length;
  ["", "0", "-5", "abc", "1e999"].forEach(raw => {
    const form = projectForm(Object.assign({}, baseValues, {budget:raw}));
    handleFormSubmit(form);
    const input = form.querySelector('[name="budget"]');
    t("NEW PROJECT with budget " + JSON.stringify(raw) + " is refused and focused", Store.all("projects").length === projBefore && input.focused === true && input.getAttribute && input.getAttribute("aria-invalid") === "true");
  });
  handleFormSubmit(projectForm(Object.assign({}, baseValues, {budget:"25000"})));
  const created = Store.all("projects").find(p => p.name === "FORM BUILD");
  t("NEW PROJECT with a positive budget is created with mode and policy", created && created.budget === 25000 && created.budgetMode === "NEW_CASH" && created.budgetRequired === true);
  handleFormSubmit(projectForm(Object.assign({}, baseValues, {name:"FORM BUILD EDIT", budget:""}), created.id));
  t("EDIT of a policy project cannot clear the budget", Store.get("projects", created.id).name === "FORM BUILD" && Store.get("projects", created.id).budget === 25000);
  const legacyProject = Actions.addProject({name:"LEGACY PROJECT", startDate:"2026-01-01", status:"PLANNING", currency:"RSD", componentIds:[], additionalCosts:0});
  t("FORM_SCHEMAS for a legacy project keeps the budget optional, TOTAL COST default", !FORM_SCHEMAS.project(legacyProject).fields.find(f => f.key === "budget").required && FORM_SCHEMAS.project(legacyProject).fields.find(f => f.key === "budgetMode").default === "TOTAL_COST");
  handleFormSubmit(projectForm(Object.assign({}, baseValues, {name:"LEGACY RENAMED", budget:"", budgetMode:"TOTAL_COST"}), legacyProject.id));
  t("EDIT of a legacy project without a budget still saves", Store.get("projects", legacyProject.id).name === "LEGACY RENAMED");
  handleFormSubmit(projectForm(Object.assign({}, baseValues, {name:"LEGACY BAD", budget:"-3", budgetMode:"TOTAL_COST"}), legacyProject.id));
  t("EDIT of a legacy project rejects a negative budget", Store.get("projects", legacyProject.id).name === "LEGACY RENAMED");
  t("Actions.addProject stays legacy-compatible without a budget", !!legacyProject && legacyProject.budget === undefined);

  // ---- 9. Currency change on edit ----
  const cp = Actions.addProject({name:"CURRENCY", startDate:"2026-11-01", status:"PLANNING", currency:"RSD", componentIds:[], additionalCosts:0, budget:23500, budgetMode:"TOTAL_COST", allocations:{PSU:{amount:4700}}});
  Actions.updateProject(cp.id, {currency:"EUR", budget:23500});
  let cpNow = Store.get("projects", cp.id);
  t("changing project currency converts the unchanged budget (23.500 RSD → €200)", cpNow.currency === "EUR" && cpNow.budget === 200);
  t("currency-less allocations are pinned to the old currency", cpNow.allocations.PSU.currency === "RSD" && near(pnBudgetAllocations(cpNow)[0].amount, 40));
  Actions.updateProject(cp.id, {currency:"RSD", budget:300});
  cpNow = Store.get("projects", cp.id);
  t("a budget retyped during a currency change is taken as entered", cpNow.currency === "RSD" && cpNow.budget === 300);

  // ---- 10. Project math: paid cash vs basis, reserves, RAM sticks, extra storage ----
  const pm = Actions.addProject({name:"MATH PROJECT", startDate:"2026-11-01", status:"PLANNING", currency:"RSD", componentIds:[], additionalCosts:500, budget:40000});
  const bought = inv({category:"GPU", purchasePrice:15000, assignedProjectId:pm.id, acquisitionProjectId:pm.id});
  const reused = inv({category:"MOTHERBOARD", purchasePrice:6000, assignedProjectId:pm.id});
  Store.update("projects", pm.id, {slots:Object.assign(emptyRigSlots(), {GPU:{kind:"INVENTORY", inventoryItemId:bought.id}, MOBO:{kind:"INVENTORY", inventoryItemId:reused.id}, CPU:{kind:"PLANNED", label:"Ryzen 5 5600", cost:9000, currency:"RSD"}}), extras:[{label:"Extra SSD", cost:2000, currency:"RSD"}], allocations:{PSU:{amount:3000, currency:"RSD"}}});
  let p = Store.get("projects", pm.id);
  let pmod = pnProjectBudgetModel(p);
  t("legacy project without budgetMode defaults to TOTAL COST", pmod.mode === "TOTAL_COST");
  t("paid cash = parts bought for the build + extra costs", pmod.paidCash === 15500);
  t("reused basis is tracked separately", pmod.reusedBasis === 6000 && pmod.totalBasis === 21500);
  t("planned includes slot parts and planned extra storage", pmod.plannedCash === 11000);
  t("TOTAL COST commits basis + planned + reserved", pmod.committed === 21500 + 11000 + 3000 && pmod.available === 40000 - 35500);
  Store.update("projects", pm.id, {budgetMode:"NEW_CASH"});
  p = Store.get("projects", pm.id);
  pmod = pnProjectBudgetModel(p);
  t("NEW CASH excludes reused Vault basis", pmod.spent === 15500 && pmod.committed === 15500 + 11000 + 3000 && pmod.leftNow === 24500);
  let costHtml = pbCostBreakdownHtml(p);
  t("FISCAL OPS shows mode chip, PAID CASH and the excluded reused basis", costHtml.includes('data-pb-budget-mode-chip="NEW_CASH"') && costHtml.includes("PAID CASH") && costHtml.includes('data-pb-budget-reused="6000"') && costHtml.includes("pn-cc-row is-excluded"));
  t("FISCAL OPS spent attribute follows the mode", costHtml.includes('data-pb-budget-spent="15500"'));
  Actions.setProjectSlot(pm.id, "PSU", "PLANNED", {label:"650W PSU", cost:4000, currency:"RSD"});
  p = Store.get("projects", pm.id);
  pmod = pnProjectBudgetModel(p);
  t("an allocation drops out once its slot gets a real part (no double count)", pmod.allocated === 0 && pmod.plannedCash === 15000);
  Store.update("projects", pm.id, {ramPaired:false, allocations:{"RAM:0":{amount:2500, currency:"RSD"}, "RAM:1":{amount:2500, currency:"RSD"}}});
  p = Store.get("projects", pm.id);
  t("unpaired RAM reserves budget per stick", pnProjectBudgetModel(p).allocated === 5000);
  Store.update("projects", pm.id, {slots:Object.assign({}, p.slots, {RAM:{kind:"PLANNED", label:"8GB stick", cost:2200, currency:"RSD", sticks:[{kind:"PLANNED", label:"8GB stick", cost:2200, currency:"RSD"}, null]}})});
  p = Store.get("projects", pm.id);
  pmod = pnProjectBudgetModel(p);
  t("filling stick A drops only its reserve", pmod.allocated === 2500);

  // ---- 11. Project tones, alerts and sale outlook ----
  Store.update("projects", pm.id, {budget:20000, listingPrice:60000});
  p = Store.get("projects", pm.id);
  pmod = pnProjectBudgetModel(p);
  t("planned overshoot is a PLANNED BREACH while paid cash is inside the limit", pmod.tone === "over" && pmod.status === "PLANNED BREACH" && pmod.leftNow > 0);
  Store.update("projects", pm.id, {budget:15000});
  t("paid cash over the limit is a BUDGET BREACH", pnProjectBudgetModel(Store.get("projects", pm.id)).status === "BUDGET BREACH");
  Store.update("projects", pm.id, {budget:200000});
  p = Store.get("projects", pm.id);
  pmod = pnProjectBudgetModel(p);
  t("project sale outlook: break-even = basis + planned + reserves", pmod.resale && pmod.resale.breakEven === pmod.totalBasis + pmod.plannedCash + pmod.allocated && pmod.resale.source === "LISTING PRICE");
  t("project projected profit and cash recovery keep basis and cash apart", pmod.resale.profitBasis === 60000 - pmod.resale.breakEven && pmod.resale.cashRecovery === 60000 - (pmod.paidCash + pmod.plannedCash + pmod.allocated));
  costHtml = pbCostBreakdownHtml(p);
  t("FISCAL OPS renders sale outlook and 80% warning line", costHtml.includes("data-pb-sale-outlook") && costHtml.includes("is-warn-line"));
  state.pbId = pm.id; state.route = "projectbuild";
  Store.update("projects", pm.id, {budget:30000});
  const pageHtml = renderProjectBuild();
  t("workspace shows a mode-labelled BUDGET tile and an accessible alert", pageHtml.includes('data-pb-budget-mode="NEW_CASH"') && pageHtml.includes("BUDGET · NEW CASH") && /data-pb-budget-alert="(planned|breach|warn)"/.test(pageHtml));
  const legacyBudgetless = renderProjectBuild.call(null) && (state.pbId = legacyProject.id, renderProjectBuild());
  t("legacy project without budget renders without budget tile or alert", !legacyBudgetless.includes("data-pb-budget=") && !legacyBudgetless.includes("data-pb-budget-alert"));

  // ---- 12. Blueprints ----
  const bpLoadError = globalThis.__pnBlueprintLoadError || "";
  const api = window.__pnProfitBlueprintsV1, rare = window.__pnProfitBlueprintsRareV3;
  if (api && api.deploy){
    const before = new Set(Store.all("projects").map(x => x.id));
    api.deploy(api.blueprints[0]);
    const bp = Store.all("projects").find(x => !before.has(x.id));
    t("uncommon blueprint deploy sets its hard cap as required budget", bp && bp.budget === api.hardCapRsd && bp.budgetRequired === true && bp.budgetMode === "TOTAL_COST");
  } else t("uncommon blueprint module loads in the harness " + bpLoadError, false);
  if (rare && rare.deploy){
    const before = new Set(Store.all("projects").map(x => x.id));
    rare.deploy(rare.rareBlueprints[0]);
    const bp = Store.all("projects").find(x => !before.has(x.id));
    t("rare blueprint deploy sets its hard cap as required budget", bp && bp.budget === rare.rareHardCapRsd && bp.budgetRequired === true);
  } else t("rare blueprint module loads in the harness " + bpLoadError, false);

  // ---- 13. Backup round trip ----
  const snapshot = JSON.parse(JSON.stringify(Store.load()));
  const roundTrip = snapshot.rigs.find(r => r.id === savedId);
  t("budget fields survive a JSON backup round trip", roundTrip && roundTrip.budget === 58750 && roundTrip.budgetCurrency === "EUR" && roundTrip.budgetRequired === true);
  return out;
})()`, sandbox);

let failed = 0;
for (const [name, ok] of results) {
  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  if (!ok) failed++;
}
console.log(failed ? "\n" + failed + " FAILED of " + results.length : "\nALL PASSED (" + results.length + " assertions)");
if (failed) process.exitCode = 1;
