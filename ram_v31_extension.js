"use strict";

/*
  PROFITNODE RAM V3.1 - DDR4 generation-relative classification
  Audit: 2026-09-12

  V3 remains the numeric foundation.
  V3.1 adds:
    - DDR4 generation-relative class floors/caps
    - 3-DIMM support
    - latency-qualified gaming / enthusiast classes
    - topology restrictions
    - complete 4/8/16/32 GB DIMM configuration handling
*/
(() => {
  const VERSION = "PN_RAM_V3_1_2026";
  const baseRamRating = globalThis.ramRating;
  const baseRenderRamConfig = globalThis.renderRamConfig;
  const baseRenderCatalogMeta = globalThis.renderCatalogMeta;

  if (typeof baseRamRating !== "function") {
    console.error("[PROFITNODE] RAM V3.1 aborted: RAM V3 base rating function not found.");
    return;
  }

  const TIERS = ["POOR","COMMON","UNCOMMON","RARE","EPIC","LEGENDARY","ARTIFACT"];
  const SCORE_BANDS = {
    POOR:[0,29], COMMON:[30,44], UNCOMMON:[45,59],
    RARE:[60,74], EPIC:[75,87], LEGENDARY:[88,96], ARTIFACT:[97,100]
  };
  const FLOOR_SCORE = {POOR:0,COMMON:30,UNCOMMON:45,RARE:60,EPIC:75,LEGENDARY:88,ARTIFACT:97};
  const CEIL_SCORE  = {POOR:29,COMMON:44,UNCOMMON:59,RARE:74,EPIC:87,LEGENDARY:96,ARTIFACT:100};

  const DDR4_SPEEDS = [2133,2400,2666,2800,2933,3000,3200,3333,3466,3600,3733,3800,3866,4000,4133,4266,4400,4600,4800,5000,5066,5333];
  const MODULE_COUNTS = [1,2,3,4];
  const PER_DIMM = [4,8,16,32];

  const tierIndex = t => Math.max(0, TIERS.indexOf(String(t || "").toUpperCase()));
  const tierFromScore = s => s <= 29 ? "POOR" : s <= 44 ? "COMMON" : s <= 59 ? "UNCOMMON" :
                             s <= 74 ? "RARE" : s <= 87 ? "EPIC" : s <= 96 ? "LEGENDARY" : "ARTIFACT";
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  function normTech(v, speed) {
    const s = String(v || "").toUpperCase().trim();
    if (s === "DDR4" || s === "DDR5") return s;
    return Number(speed) >= 4800 ? "DDR5" : "DDR4";
  }

  function trueLatencyNs(speed, cas) {
    speed = Number(speed); cas = Number(cas);
    return speed > 0 && cas > 0 ? cas * 2000 / speed : null;
  }

  // "Good CL" means the kit actually earns its speed class.
  // Thresholds are deliberately generation-relative, not arbitrary MT/s worship.
  function ddr4PerfClass(speed, cas) {
    const ns = trueLatencyNs(speed, cas);
    if (!ns) return {name:"UNKNOWN", rank:0, latencyNs:null};

    // Exceptional / tuned DDR4
    if (speed >= 4133 && ns <= 9.5) return {name:"EXTREME", rank:5, latencyNs:ns};
    if (speed >= 3733 && ns <= 9.6) return {name:"ENTHUSIAST", rank:4, latencyNs:ns};

    // Gaming-class anchors:
    // 3000 CL16 = 10.67ns, 3200 CL16 = 10ns, 3600 CL18 = 10ns.
    if (speed >= 3000 && ns <= 10.7) return {name:"GAMING", rank:3, latencyNs:ns};
    if (speed >= 2800 && ns <= 12.3) return {name:"UPPER_MAINSTREAM", rank:2, latencyNs:ns};
    if (speed >= 2666 && ns <= 14.5) return {name:"MAINSTREAM", rank:1, latencyNs:ns};
    return {name:"BASIC", rank:0, latencyNs:ns};
  }

  // Matrix floor for logical DDR4 configurations.
  // Columns: basic 2133-2400, 2666, 2800-2933, gaming 3000-3200,
  // gaming+ 3333-3600, enthusiast 3733-4000, extreme 4133+.
  const MATRIX = {
    "1x4":  ["POOR","POOR","POOR","COMMON","COMMON","COMMON","UNCOMMON"],
    "2x4":  ["COMMON","COMMON","COMMON","UNCOMMON","UNCOMMON","RARE","RARE"],
    "3x4":  ["COMMON","COMMON","UNCOMMON","UNCOMMON","RARE","RARE","EPIC"],
    "4x4":  ["COMMON","UNCOMMON","UNCOMMON","RARE","RARE","EPIC","EPIC"],

    "1x8":  ["COMMON","COMMON","COMMON","UNCOMMON","UNCOMMON","RARE","RARE"],
    "2x8":  ["COMMON","COMMON","UNCOMMON","RARE","RARE","EPIC","EPIC"],
    "3x8":  ["UNCOMMON","UNCOMMON","RARE","RARE","RARE","EPIC","EPIC"],
    "4x8":  ["UNCOMMON","RARE","RARE","RARE","EPIC","EPIC","LEGENDARY"],

    "1x16": ["COMMON","COMMON","UNCOMMON","UNCOMMON","RARE","RARE","EPIC"],
    "2x16": ["UNCOMMON","RARE","RARE","RARE","EPIC","EPIC","LEGENDARY"],
    "3x16": ["RARE","RARE","RARE","RARE","EPIC","EPIC","LEGENDARY"],
    "4x16": ["RARE","RARE","RARE","EPIC","EPIC","LEGENDARY","LEGENDARY"],

    "1x32": ["UNCOMMON","UNCOMMON","RARE","RARE","RARE","EPIC","EPIC"],
    "2x32": ["RARE","RARE","RARE","EPIC","EPIC","LEGENDARY","LEGENDARY"],
    "3x32": ["RARE","RARE","EPIC","EPIC","EPIC","LEGENDARY","LEGENDARY"],
    "4x32": ["RARE","EPIC","EPIC","EPIC","LEGENDARY","LEGENDARY","LEGENDARY"]
  };

  function speedColumn(speed) {
    speed = Number(speed) || 0;
    if (speed <= 2400) return 0;
    if (speed <= 2666) return 1;
    if (speed <= 2933) return 2;
    if (speed <= 3200) return 3;
    if (speed <= 3600) return 4;
    if (speed <= 4000) return 5;
    return 6;
  }

  function qualifiedMatrixTier(count, each, speed, cas) {
    const key = `${count}x${each}`;
    const row = MATRIX[key];
    if (!row) return null;
    let col = speedColumn(speed);
    const perf = ddr4PerfClass(speed, cas);

    // Fast frequency does not earn a fast column with trash timings.
    if (col >= 6 && perf.rank < 5) col = perf.rank >= 4 ? 5 : perf.rank >= 3 ? 4 : 2;
    else if (col >= 5 && perf.rank < 4) col = perf.rank >= 3 ? 4 : 2;
    else if (col >= 3 && perf.rank < 3) col = perf.rank >= 2 ? 2 : perf.rank >= 1 ? 1 : 0;

    return {tier:row[col], column:col, perf};
  }

  function ddr4TopologyScore(count) {
    return ({1:45,2:100,3:75,4:90})[Number(count)] || 0;
  }

  function ramV31Rating(config) {
    const e = Object.assign({}, config || {});
    const speed = Number(e.speed) || 0;
    const tech = normTech(e.technology, speed);

    // DDR5 stays exactly on V3 doctrine.
    if (tech !== "DDR4") return baseRamRating(e);

    const count = Number(e.moduleCount) || 0;
    const each = Number(e.perModuleCapacity) || 0;
    const total = Number(e.totalCapacity) || count * each;
    const cas = Number(e.casLatency) || 0;

    // Feed V3 a legal topology so its component subscores remain useful.
    // Then replace topology contribution for 3 DIMMs.
    const baseInput = Object.assign({}, e, {technology:"DDR4"});
    if (count === 3) baseInput.moduleCount = 4;
    const base = baseRamRating(baseInput);

    let raw = Number(base.overall) || 0;
    if (count === 3) {
      const oldTopo = Number(base.topologyScore) || 90;
      raw = Math.round(raw - 0.15 * oldTopo + 0.15 * ddr4TopologyScore(3));
    }

    const q = qualifiedMatrixTier(count, each, speed, cas);
    let score = clamp(raw, 0, 100);
    let matrixTier = q ? q.tier : tierFromScore(score);

    // Matrix is the DDR4 generation-relative classification floor.
    score = Math.max(score, FLOOR_SCORE[matrixTier]);

    // Single DIMM cannot claim the same class as a matched dual-channel kit.
    // Cap normal single-DIMM DDR4 at EPIC even if capacity/frequency is absurd.
    if (count === 1) score = Math.min(score, CEIL_SCORE.EPIC);

    // 3 DIMMs are valid but asymmetric. They may score well through capacity,
    // yet cannot reach ARTIFACT and get an explicit topology warning.
    if (count === 3) score = Math.min(score, CEIL_SCORE.LEGENDARY);

    // Ordinary DDR4 never becomes ARTIFACT through capacity alone.
    // ARTIFACT is reserved for a future explicit exceptional-bin rule.
    score = Math.min(score, CEIL_SCORE.LEGENDARY);

    const finalTier = tierFromScore(score);
    const warnings = Array.isArray(base.warnings) ? base.warnings.slice() : [];
    if (count === 1 && !warnings.some(x => /single/i.test(x))) {
      warnings.push("Single-DIMM DDR4 is topology-limited and cannot claim full matched-kit class.");
    }
    if (count === 3) {
      warnings.push("Three-DIMM DDR4 is valid but asymmetric; topology receives a penalty.");
    }
    if (count === 4 && speed > 4000 && !warnings.some(x => /four-dimm/i.test(x))) {
      warnings.push("Four-DIMM high-speed DDR4 may require manual tuning.");
    }

    return Object.assign({}, base, {
      technology:"DDR4",
      totalCapacity:total,
      topologyScore:ddr4TopologyScore(count),
      channelScore:ddr4TopologyScore(count),
      latencyNs:trueLatencyNs(speed,cas) == null ? null : Number(trueLatencyNs(speed,cas).toFixed(2)),
      overall:score,
      tierIndex:tierIndex(finalTier),
      tier:finalTier,
      rating_method:VERSION,
      ddr4Class:q ? q.perf.name : "UNKNOWN",
      matrixTier,
      baseV3Score:Number(base.overall) || 0,
      warnings
    });
  }

  globalThis.ramRating = ramV31Rating;
  try { ramRating = ramV31Rating; } catch (_) {}

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[c]);
  }
  function options(values,current,suffix="") {
    return values.map(v => `<option value="${v}"${String(v)===String(current)?" selected":""}>${v}${suffix}</option>`).join("");
  }
  function boolSelect(name,label,value) {
    return `<label><span>${label}</span><select data-rig-ram-field="${name}">
      <option value="unknown"${value == null ? " selected":""}>Unknown</option>
      <option value="true"${value === true || value === "true" ? " selected":""}>Yes</option>
      <option value="false"${value === false || value === "false" ? " selected":""}>No</option>
    </select></label>`;
  }

  // Replace the V3 editor so 3-DIMM DDR4 is actually selectable.
  globalThis.renderRamConfig = function renderRamConfigV31(slot) {
    const r = Object.assign({
      technology:"DDR4", dimmType:"UDIMM", moduleCount:2, perModuleCapacity:8,
      speed:3200, casLatency:16, rgb:false, xmp:null, expo:null, notes:""
    }, slot && slot.ram || {});
    const tech = normTech(r.technology,r.speed);
    if (tech !== "DDR4") return baseRenderRamConfig(slot);

    const rating = ramV31Rating(r);
    const warning = rating.warnings.length
      ? `<div class="ram-config-wide hint" style="color:var(--amber,#d9a441)">${esc(rating.warnings.join(" · "))}</div>`
      : "";

    return `<div class="ram-config-grid">
      <label><span>Technology</span><select data-rig-ram-field="technology">${options(["DDR4","DDR5"],tech)}</select></label>
      <label><span>DIMM Type</span><select data-rig-ram-field="dimmType">${options(["UDIMM","CUDIMM"],r.dimmType || "UDIMM")}</select></label>
      <label><span>Modules</span><select data-rig-ram-field="moduleCount">${options(MODULE_COUNTS,Number(r.moduleCount))}</select></label>
      <label><span>Each GB</span><select data-rig-ram-field="perModuleCapacity">${options(PER_DIMM,Number(r.perModuleCapacity))}</select></label>
      <label><span>MT/s</span><select data-rig-ram-field="speed">${options(DDR4_SPEEDS,Number(r.speed))}</select></label>
      <label><span>CAS Latency</span><input type="number" min="10" max="40" step="1" data-rig-ram-field="casLatency" value="${esc(r.casLatency)}"></label>
      <label><span>RGB</span><select data-rig-ram-field="rgb">${options(["false","true"],String(!!r.rgb))}</select></label>
      ${boolSelect("xmp","XMP",r.xmp)}
      ${boolSelect("expo","EXPO",r.expo)}
      <label class="ram-config-wide"><span>RAM Notes</span><input type="text" data-rig-ram-field="notes" value="${esc(r.notes || "")}" placeholder="e.g. matched kit / mixed modules"></label>
      ${warning}
    </div>`;
  };
  try { renderRamConfig = globalThis.renderRamConfig; } catch (_) {}

  globalThis.renderCatalogMeta = function renderCatalogMetaV31(type,item,slot) {
    if (type !== "RAM") return baseRenderCatalogMeta(type,item,slot);
    const r = ramV31Rating(slot && slot.ram);
    const performance = `<span class="pn-meta-pill pn-performance-pill"><span>Performance</span><b>${r.overall}</b></span>`;
    const tier = `<span class="pn-meta-pill pn-tier-pill ${pnTierClass(r.tier)}"><span>Tier</span><b>${r.tier}</b></span>`;
    const detail = `<span class="pn-meta-detail">Capacity ${r.capacityScore} · Bandwidth ${r.bandwidthScore} · Latency ${r.latencyScore} · Topology ${r.topologyScore}${r.latencyNs != null ? ` · ${r.latencyNs}ns` : ""}${r.technology==="DDR4" ? ` · ${r.ddr4Class}` : ""}</span>`;
    return `<div class="rig-catalog-meta">${performance}${tier}${detail}</div>`;
  };
  try { renderCatalogMeta = globalThis.renderCatalogMeta; } catch (_) {}

  const anchors = [
    {name:"2x8 DDR4-2666 CL16",moduleCount:2,perModuleCapacity:8,speed:2666,casLatency:16},
    {name:"2x8 DDR4-2933 CL16",moduleCount:2,perModuleCapacity:8,speed:2933,casLatency:16},
    {name:"2x8 DDR4-3000 CL16",moduleCount:2,perModuleCapacity:8,speed:3000,casLatency:16},
    {name:"2x8 DDR4-3200 CL16",moduleCount:2,perModuleCapacity:8,speed:3200,casLatency:16},
    {name:"2x8 DDR4-3600 CL18",moduleCount:2,perModuleCapacity:8,speed:3600,casLatency:18},
    {name:"2x8 DDR4-3600 CL16",moduleCount:2,perModuleCapacity:8,speed:3600,casLatency:16},
    {name:"2x8 DDR4-3800 CL16",moduleCount:2,perModuleCapacity:8,speed:3800,casLatency:16},
    {name:"2x16 DDR4-3200 CL16",moduleCount:2,perModuleCapacity:16,speed:3200,casLatency:16},
    {name:"2x16 DDR4-3600 CL16",moduleCount:2,perModuleCapacity:16,speed:3600,casLatency:16},
    {name:"4x8 DDR4-3200 CL16",moduleCount:4,perModuleCapacity:8,speed:3200,casLatency:16},
    {name:"4x8 DDR4-3600 CL16",moduleCount:4,perModuleCapacity:8,speed:3600,casLatency:16},
    {name:"2x32 DDR4-3200 CL16",moduleCount:2,perModuleCapacity:32,speed:3200,casLatency:16},
    {name:"3x8 DDR4-3200 CL16",moduleCount:3,perModuleCapacity:8,speed:3200,casLatency:16}
  ].map(a => {
    const rating = ramV31Rating(Object.assign({technology:"DDR4",dimmType:"UDIMM"},a));
    return {name:a.name,score:rating.overall,tier:rating.tier,class:rating.ddr4Class,latencyNs:rating.latencyNs};
  });

  globalThis.__PN_RAM_V31 = {
    version:VERSION,
    auditDate:"2026-09-12",
    doctrine:"DDR4 generation-relative quality + present-day usefulness",
    moduleCounts:MODULE_COUNTS.slice(),
    perDimmGb:PER_DIMM.slice(),
    matrix:MATRIX,
    anchors,
    rate:ramV31Rating
  };

  console.log(`[PROFITNODE] RAM V3.1 active: DDR4 generation-relative matrix enabled; 3-DIMM support enabled; ${anchors.length} anchors checked.`);
})();
