"use strict";

const fs = require("fs");
const path = require("path");
const env = require("./pn_test_env.js");

const DIR = __dirname;
const overlay = JSON.parse(fs.readFileSync(path.join(DIR, "profitnode_cpu_ratings_v3.json"), "utf8"));
const baseHardware = JSON.parse(fs.readFileSync(path.join(DIR, "profitnode_hardware_ratings_v1.json"), "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function jsonResponse(value, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(clone(value)),
    text: () => Promise.resolve(JSON.stringify(value))
  });
}

function localJson(name) {
  const file = path.join(DIR, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

async function boot(options = {}) {
  const sandbox = env.createSandbox();
  sandbox.fetch = rawUrl => {
    const name = String(rawUrl || "").split("?")[0].replace(/^.*[\\/]/, "");
    if (name === "profitnode_cpu_ratings_v3.json" && options.cpuOverlayFailure) {
      return jsonResponse({}, false, 503);
    }
    if (name === "profitnode_cpu_ratings_v3.json") return jsonResponse(overlay);
    if (name === "profitnode_hardware_ratings_v1.json") {
      return jsonResponse(options.hardware || baseHardware);
    }
    const data = localJson(name);
    return data ? jsonResponse(data) : jsonResponse({}, false, 404);
  };
  env.loadAll(sandbox, DIR);
  await env.run(sandbox, "loadHardwareCatalog()");
  return sandbox;
}

function normalized(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function tierForScore(score) {
  if (score <= 29) return "POOR";
  if (score <= 44) return "COMMON";
  if (score <= 59) return "UNCOMMON";
  if (score <= 74) return "RARE";
  if (score <= 87) return "EPIC";
  if (score <= 96) return "LEGENDARY";
  return "ARTIFACT";
}

async function main() {
  const results = [];
  const ratings = overlay.ratings || {};
  const unrated = overlay.unrated || {};
  const ratingRows = Object.entries(ratings);
  const baseCandidates = (baseHardware.cpus || []).concat(
    (baseHardware.gpus || []).filter(item => (overlay.moveFromGpu || []).includes(String(item.platform || "").toUpperCase()))
  );

  results.push(["V3 contains exactly 355 benchmark-backed CPU ratings", ratingRows.length === 355]);
  results.push(["V3 contains exactly three explicit unrated/hold decisions", Object.keys(unrated).length === 3]);
  results.push(["every rating row preserves overall, gaming, workstation, and confidence", ratingRows.every(([, row]) => Array.isArray(row) && row.length >= 4 && row.slice(0, 3).every(value => Number.isInteger(value) && value >= 0 && value <= 100) && String(row[3] || "").trim())]);
  results.push(["rounded dimensions remain coherent with overall, allowing only one-point source-rounding drift or the documented low-end cap", ratingRows.every(([, row]) => Math.abs(row[0] - Math.round(0.65 * row[1] + 0.35 * row[2])) <= 1 || row[0] === 29)]);
  results.push(["V3 model keys have no normalized duplicates", (() => { const seen = new Set(); return ratingRows.every(([model]) => { const key = normalized(model); if (seen.has(key)) return false; seen.add(key); return true; }); })()]);
  results.push(["rated and unrated model sets never overlap", Object.keys(unrated).every(model => !ratings[model])]);
  results.push(["every alias points to an authoritative rated or unrated model", Object.values(overlay.aliases || {}).every(model => ratings[model] || unrated[model])]);
  results.push(["every base CPU and migrated AM3/AM3+ record is explicitly rated or unrated", baseCandidates.every(item => { const model = (overlay.aliases || {})[item.model] || item.model; return !!ratings[model] || !!unrated[model]; })]);
  results.push(["PassMark formula and provenance remain declared in the authoritative dataset", /ThreadMark\/5086/.test(overlay.formula.gaming) && /CPUMark\/71987/.test(overlay.formula.productivity) && /0\.65\*gaming\+0\.35\*productivity/.test(overlay.formula.overall)]);

  const sandbox = await boot();
  const runtime = env.run(sandbox, `(() => ({
    cpus: HardwareCatalog.cpus.map(cpu => ({
      brand: cpu.brand, model: cpu.model, overall: cpu.overall, pn_score: cpu.pn_score,
      gaming: cpu.gaming, workstation: cpu.workstation, pn_tier: cpu.pn_tier,
      tier_name: pnTier(cpuGearTier(cpu)),
      state: cpu.cpu_rating_state, method: cpu.rating_method, confidence: cpu.rating_confidence,
      platform: cpu.platform, availability: cpu.availability_status
    })),
    gpuCpuContamination: HardwareCatalog.gpus.filter(item => ['AM3','AM3+'].includes(String(item.platform || '').toUpperCase())).length,
    metadata: Object.assign({}, globalThis.__PN_CPU_V5),
    formula: Object.assign({}, HardwareCatalog.cpuRatingsFormula)
  }))()`);
  const byModel = new Map(runtime.cpus.map(cpu => [cpu.model, cpu]));
  const ratedRuntime = runtime.cpus.filter(cpu => cpu.state === "RATED");

  results.push(["runtime applies all 355 authoritative ratings", ratedRuntime.length === 355 && runtime.metadata.ratedApplied === 355]);
  results.push(["runtime score dimensions exactly match every V3 row", ratingRows.every(([model, row]) => { const cpu = byModel.get(model); return cpu && cpu.overall === row[0] && cpu.pn_score === row[0] && cpu.gaming === row[1] && cpu.workstation === row[2] && cpu.confidence === row[3]; })]);
  results.push(["runtime tiers exactly match the canonical 29/44/59/74/87/96/100 boundaries", ratedRuntime.every(cpu => cpu.tier_name === tierForScore(cpu.overall))]);
  results.push(["runtime exposes PassMark provenance and finance exclusions", runtime.formula.source === "PassMark CPU Mark + Thread Mark" && runtime.formula.excludes.includes("purchase price") && runtime.formula.excludes.includes("manual quality overrides")]);
  results.push(["AM3 and AM3+ CPU records migrate out of the GPU catalog", runtime.metadata.movedFromGpu > 0 && runtime.gpuCpuContamination === 0]);
  results.push(["documented unreleased CPUs remain present but unscored and untiered", ["Ryzen 5 9600X3D", "Ryzen 5 PRO 9400"].every(model => { const cpu = byModel.get(model); return cpu && cpu.overall === null && cpu.pn_score === null && cpu.gaming === null && cpu.workstation === null && cpu.pn_tier === null && cpu.state === "INTENTIONALLY_UNRATED"; })]);
  results.push(["the ambiguous Phenom II X4 900 placeholder remains removed", !byModel.has("Phenom II X4 900")]);

  const score = model => byModel.get(model);
  results.push(["Ryzen 5 5500 rates above Core i7-6700", score("Ryzen 5 5500").overall > score("Core i7-6700").overall]);
  results.push(["Ryzen 5 5600 rates above Ryzen 5 5500", score("Ryzen 5 5600").overall > score("Ryzen 5 5500").overall]);
  results.push(["Ryzen 5 3600 rates above Ryzen 5 2600X", score("Ryzen 5 3600").overall > score("Ryzen 5 2600X").overall]);
  results.push(["Ryzen 7 5800X3D gaming rates above Ryzen 7 5800X gaming", score("Ryzen 7 5800X3D").gaming > score("Ryzen 7 5800X").gaming]);
  results.push(["Ryzen 9 5950X workstation rates above Ryzen 7 5800X3D workstation", score("Ryzen 9 5950X").workstation > score("Ryzen 7 5800X3D").workstation]);
  results.push(["modern high-end CPUs remain decisively above legacy mainstream CPUs", score("Ryzen 9 9950X3D").overall > score("Core i7-6700").overall && score("Ryzen 7 9800X3D").overall > score("Core i7-7700K").overall]);

  const financeInvariant = env.run(sandbox, `(() => {
    const cheap = {category:'CPU', manufacturer:'AMD', model:'Ryzen 5 5600', purchasePrice:1, estimatedMarketValue:1};
    const expensive = {category:'CPU', manufacturer:'AMD', model:'Ryzen 5 5600', purchasePrice:999999, estimatedMarketValue:2000000};
    const a = pnPartNameTier(cheap), b = pnPartNameTier(expensive);
    const ak = inventoryItemTierKey(cheap), bk = inventoryItemTierKey(expensive);
    return a.rating === b.rating && a.key === b.key && ak.score === bk.score && ak.tier === bk.tier;
  })()`);
  results.push(["purchase price and resale value never alter CPU rating or tier", financeInvariant]);

  const syntheticHardware = clone(baseHardware);
  syntheticHardware.cpus.push({
    brand: "TEST",
    model: "Unlisted Overlay CPU",
    platform: "TEST",
    overall: 99,
    gaming: 99,
    workstation: 99,
    availability_status: "RELEASED"
  });
  const missingSandbox = await boot({ hardware: syntheticHardware });
  const missingOverlayResult = env.run(missingSandbox, `(() => {
    const cpu = HardwareCatalog.cpus.find(item => item.model === 'Unlisted Overlay CPU');
    const visual = pnPartNameTier({category:'CPU', manufacturer:'TEST', model:'Unlisted Overlay CPU'});
    const sort = inventoryItemTierKey({category:'CPU', manufacturer:'TEST', model:'Unlisted Overlay CPU'});
    const rig = newRigDraft('UNRATED CPU CHECK');
    rig.slots.CPU = {kind:'PLANNED', catalogType:'CPU', label:'TEST Unlisted Overlay CPU', cost:0, originalPrice:0, currency:'RSD'};
    const resolved = rigSlotResolved(rig.slots.CPU, 'RSD', 'CPU');
    const profile = rigHardwareProfile(rig);
    return {cpu, visual, sort, resolvedHasPn:!!(resolved && resolved.pn), profile, meta: Object.assign({}, globalThis.__PN_CPU_V5)};
  })()`);
  results.push(["a CPU missing from V3 fails closed instead of retaining a legacy score", missingOverlayResult.cpu && missingOverlayResult.cpu.overall === null && missingOverlayResult.cpu.pn_score === null && missingOverlayResult.cpu.gaming === null && missingOverlayResult.cpu.workstation === null && missingOverlayResult.cpu.pn_tier === null && missingOverlayResult.cpu.cpu_rating_state === "MISSING_OVERLAY" && missingOverlayResult.meta.missingOverlay === 1]);
  results.push(["Parts Vault keeps a known unscored CPU visibly UNRATED instead of applying a name heuristic", missingOverlayResult.visual.key === "UNRATED" && missingOverlayResult.visual.rating === "—" && missingOverlayResult.visual.source === "catalog" && missingOverlayResult.sort.tier === null && missingOverlayResult.sort.score === null]);
  results.push(["Rig Assembly and Build Rating keep a known unscored CPU unverified instead of treating it as zero performance", missingOverlayResult.resolvedHasPn === false && missingOverlayResult.profile.complete === false && missingOverlayResult.profile.cpu === null]);

  const failedSandbox = await boot({ cpuOverlayFailure: true });
  const failureState = env.run(failedSandbox, `({
    status: HardwareCatalog.cpuRatingsStatus,
    scored: HardwareCatalog.cpus.filter(cpu => Number.isFinite(cpu.overall) || Number.isFinite(cpu.pn_score)).length,
    tiered: HardwareCatalog.cpus.filter(cpu => cpu.pn_tier != null).length,
    states: Array.from(new Set(HardwareCatalog.cpus.map(cpu => cpu.cpu_rating_state)))
  })`);
  results.push(["an unavailable V3 overlay disables legacy CPU scores instead of silently using them", failureState.status === "error" && failureState.scored === 0 && failureState.tiered === 0 && failureState.states.length === 1 && failureState.states[0] === "OVERLAY_UNAVAILABLE"]);

  let failures = 0;
  for (const [name, ok] of results) {
    console.log((ok ? "PASS" : "FAIL") + " - " + name);
    if (!ok) failures++;
  }
  console.log("\n" + (failures === 0 ? "ALL PASSED" : failures + " FAILED") + " (" + results.length + " assertions)");
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
