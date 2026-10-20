"use strict";
const env = require("./pn_test_env.js");
const sandbox = env.createSandbox();
env.loadAll(sandbox, __dirname);

const results = require("vm").runInContext(`(function(){
  Store.load();
  const out = [];
  const rig = newRigDraft("COMPACT TEST");
  out.push(["new rigs default to the New Cash budget, without a mandatory limit", rig.budget === 0 && rig.budgetMode === "NEW_CASH" && rig.budgetCurrency === "RSD"]);
  rig.slots.CPU = {kind:"PLANNED",label:"AMD Ryzen 5 5600",cost:10000,originalPrice:12000,currency:"RSD"};
  rig.budget = 50000;
  state.route = "rigbuild";
  state.rigDraft = rig;
  const route = ROUTES.find(r => r.key === "rigbuild");
  let html = route.render();
  out.push(["editor exposes budget strip", html.includes("data-rig-budget-rail") && html.includes("BUILD BUDGET")]);
  out.push(["budget offers both basis modes", html.includes("TOTAL COST BASIS") && html.includes("NEW CASH SPEND")]);
  out.push(["budget currency is selectable independently of overall app", html.includes("data-rig-budget-currency") && html.includes("<option value=\\"EUR\\"") && html.includes("<option value=\\"RSD\\"")]);
  out.push(["new cash ignores inventory basis", html.includes("40.000 RSD LEFT") && html.includes('data-budget-mode="NEW_CASH"')]);
  out.push(["rating, details and Build Check use compact folds", ["rating","details","check"].every(k => html.includes('data-rig-fold="'+k+'"'))]);
  const severe = ["FAIL","WARNING"].includes(buildCheckModel(rig).verdict);
  out.push(["Build Check opens for warning/failure", /data-rig-fold="check" open/.test(html) === severe]);
  out.push(["financial tools remain available", html.includes("Expected Sale Price") && html.includes("Target Margin %")]);

  const gpu = Store.insert("inventory",{category:"GPU",manufacturer:"Test",model:"Card",purchasePrice:100,currency:"EUR",estimatedMarketValue:135,purchaseDate:"2026-10-20",status:"IN_STORAGE",condition:"WORKING",source:"PURCHASE"});
  rig.slots.GPU = {kind:"INVENTORY",inventoryItemId:gpu.id};
  html = route.render();
  out.push(["owned EUR inventory converts to RSD", html.includes("11.750 RSD")]);
  out.push(["owned inventory does not consume new cash cap", html.includes("40.000 RSD LEFT")]);
  rig.budgetMode = "TOTAL_COST";
  html = route.render();
  out.push(["total basis includes owned GPU and planned CPU", html.includes("28.250 RSD LEFT")]);

  rig.budgetCurrency = "EUR";
  rig.budget = 23500;
  html = route.render();
  out.push(["EUR budget works while global display remains RSD", html.includes('data-budget-currency="EUR"') && html.includes('value="200"') && html.includes("€100.00") && html.includes("€85.11") && html.includes("€14.89 LEFT")]);
  Store.setMeta({displayCurrency:"EUR"});
  html = route.render();
  out.push(["EUR mode converts budget and costs consistently", html.includes('value="200"') && html.includes("€100.00") && html.includes("€85.11") && html.includes("€14.89 LEFT")]);
  Store.setMeta({displayCurrency:"RSD"});
  html = route.render();
  out.push(["EUR budget remains EUR after global switch back to RSD", html.includes('data-budget-currency="EUR"') && html.includes('value="200"') && html.includes("€14.89 LEFT")]);
  rig.budgetMode = "NEW_CASH";
  html = route.render();
  out.push(["EUR new-cash remaining is converted once", html.includes("€114.89 LEFT")]);

  rig.budgetCurrency = "RSD";
  html = route.render();
  out.push(["switching budget view to RSD preserves the canonical limit", rig.budget === 23500 && html.includes('value="23.500"') && html.includes("13.500 RSD LEFT")]);
  delete rig.budgetMode;
  html = route.render();
  out.push(["older rigs without budgetMode default to new cash", html.includes('data-budget-mode="NEW_CASH"')]);
  return out;
})()`, sandbox);

let failed = 0;
for (const [name, ok] of results) {
  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  if (!ok) failed++;
}
if (failed) process.exitCode = 1;
