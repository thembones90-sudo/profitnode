"use strict";
const env = require("./pn_test_env.js");
const sandbox = env.createSandbox();
env.loadAll(sandbox, __dirname);

const results = require("vm").runInContext(`(function(){
  Store.load();
  const out = [];
  const rig = newRigDraft("COMPACT TEST");
  out.push(["new rigs default to the New Cash budget, without a mandatory limit", rig.budget === 0 && rig.budgetMode === "NEW_CASH"]);
  rig.slots.CPU = {kind:"PLANNED",label:"AMD Ryzen 5 5600",cost:10000,originalPrice:12000,currency:"RSD"};
  rig.budget = 50000;
  state.route = "rigbuild";
  state.rigDraft = rig;
  const route = ROUTES.find(r => r.key === "rigbuild");
  let html = route.render();
  out.push(["editor exposes budget strip", html.includes("data-rig-budget-rail") && html.includes("BUILD BUDGET")]);
  out.push(["budget offers both basis modes", html.includes("TOTAL COST BASIS") && html.includes("NEW CASH SPEND")]);
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

  Store.setMeta({displayCurrency:"EUR"});
  rig.budget = 23500;
  html = route.render();
  out.push(["EUR mode converts budget and costs consistently", html.includes('value="200"') && html.includes("€100.00") && html.includes("€85.11") && html.includes("€14.89 LEFT")]);
  rig.budgetMode = "NEW_CASH";
  html = route.render();
  out.push(["EUR new-cash remaining is converted once", html.includes("€114.89 LEFT")]);

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
