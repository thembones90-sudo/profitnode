"use strict";

/*
  PROFITNODE RAM V3
  Audit: 2026-09-12

  Replaces the RAM Foundation v1 scoring curve with a configuration-first model:
    35% capacity
    30% bandwidth
    20% true CAS latency
    15% DIMM topology

  Brand, RGB and price do not affect performance.
*/
(() => {
  const VERSION = "PN_RAM_V3_2026";
  const POLICY_URL = "profitnode_ram_v3_policy.json?v=ram-v3-20260912";

  const FALLBACK_POLICY = {
    version: VERSION,
    auditDate: "2026-09-12",
    method: {
      capacityWeight: 0.35,
      bandwidthWeight: 0.30,
      latencyWeight: 0.20,
      topologyWeight: 0.15,
      formula: "35% capacity + 30% bandwidth + 20% true CAS latency + 15% DIMM topology"
    },
    tierThresholds: [
      {tier:"POOR",max:29},{tier:"COMMON",max:44},{tier:"UNCOMMON",max:59},
      {tier:"RARE",max:74},{tier:"EPIC",max:87},{tier:"LEGENDARY",max:96},
      {tier:"ARTIFACT",max:100}
    ],
    capacityCurve: {
      4:5,8:15,12:25,16:45,24:60,32:75,48:85,64:92,96:97,128:99,192:100,256:100
    },
    bandwidthCurve: {
      2133:15,2400:20,2666:26,2800:30,2933:33,3000:35,3200:38,3333:41,
      3466:43,3600:45,3733:48,3800:49,3866:50,4000:52,4133:54,4266:56,
      4400:58,4600:60,4800:62,5000:64,5066:65,5200:67,5333:69,5600:72,
      6000:78,6200:79.5,6400:81,6600:83,6800:85,7000:87,7200:89,7400:90.5,
      7600:92,7800:93,8000:94,8200:95,8400:96,8600:97,8800:98,9000:99,9600:100
    },
    latencyCurveNs: {
      7:100,8:96,9:90,10:84,11:76,12:68,13:60,14:52,15:44,16:36,18:25,20:15,24:5
    },
    topologyScores: {
      DDR4:{1:45,2:100,4:90},
      DDR5:{1:45,2:100,4:80}
    },
    supported: {
      technologies:["DDR4","DDR5"],
      dimm_types:["UDIMM","CUDIMM"],
      per_module_gb:[4,8,16,24,32,48,64],
      module_counts:[1,2,4],
      ddr4_speeds_mt_s:[2133,2400,2666,2800,2933,3000,3200,3333,3466,3600,3733,3800,3866,4000,4133,4266,4400,4600,4800,5000,5066,5333],
      ddr5_speeds_mt_s:[4800,5000,5066,5200,5333,5600,6000,6200,6400,6600,6800,7000,7200,7400,7600,7800,8000,8200,8400,8600,8800,9000,9600]
    },
    defaults: {
      DDR4:{technology:"DDR4",dimmType:"UDIMM",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16,rgb:false,xmp:null,expo:null,notes:""},
      DDR5:{technology:"DDR5",dimmType:"UDIMM",moduleCount:2,perModuleCapacity:16,totalCapacity:32,speed:6000,casLatency:30,rgb:false,xmp:null,expo:null,notes:""}
    },
    familyAdditions: [],
    familyEnrichments: []
  };

  let policy = FALLBACK_POLICY;
  const baseLoadHardwareCatalog = loadHardwareCatalog;
  const baseRenderCatalogMeta = renderCatalogMeta;

  const finite = v => Number.isFinite(Number(v));
  const normTech = (v, speed) => {
    const s = String(v || "").toUpperCase().trim();
    if (s === "DDR4" || s === "DDR5") return s;
    return Number(speed) >= 4800 ? "DDR5" : "DDR4";
  };
  const clamp100 = v => Math.max(0, Math.min(100, Number(v) || 0));

  function interp(value, table) {
    const points = Object.keys(table || {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    if (!points.length) return 0;
    const x = Number(value);
    if (!Number.isFinite(x)) return 0;
    if (x <= points[0]) return Number(table[points[0]]) || 0;
    if (x >= points[points.length - 1]) return Number(table[points[points.length - 1]]) || 0;
    const hiIndex = points.findIndex(p => p >= x);
    const lo = points[hiIndex - 1], hi = points[hiIndex];
    const loVal = Number(table[lo]) || 0, hiVal = Number(table[hi]) || 0;
    return loVal + ((x - lo) / (hi - lo)) * (hiVal - loVal);
  }

  function tierIndex(score) {
    const rows = policy.tierThresholds || FALLBACK_POLICY.tierThresholds;
    for (let i=0; i<rows.length; i++) if (score <= Number(rows[i].max)) return i;
    return rows.length - 1;
  }

  function topologyScore(technology, modules) {
    const tech = policy.topologyScores && policy.topologyScores[technology];
    const score = tech && tech[String(modules)];
    return Number(score) || 0;
  }

  function ramV3Rating(config) {
    const e = config || {};
    const count = Number(e.moduleCount) || 0;
    const each = Number(e.perModuleCapacity) || 0;
    const total = Number(e.totalCapacity) || count * each;
    const speed = Number(e.speed) || 0;
    const cas = Number(e.casLatency) || 0;
    const technology = normTech(e.technology, speed);

    const capacityScore = total ? interp(total, policy.capacityCurve) : 0;
    const bandwidthScore = speed ? interp(speed, policy.bandwidthCurve) : 0;
    const latencyNs = speed && cas ? cas * 2000 / speed : null;
    const latencyScore = latencyNs == null ? 0 : interp(latencyNs, policy.latencyCurveNs);
    const topoScore = topologyScore(technology, count);

    const m = policy.method || FALLBACK_POLICY.method;
    const overall = Math.round(
      Number(m.capacityWeight) * capacityScore +
      Number(m.bandwidthWeight) * bandwidthScore +
      Number(m.latencyWeight) * latencyScore +
      Number(m.topologyWeight) * topoScore
    );
    const ti = tierIndex(overall);

    const warnings = [];
    if (count === 1) warnings.push("Single-DIMM configuration reduces memory-channel balance.");
    if (technology === "DDR5" && count === 4 && speed > 6000) {
      warnings.push("Four-DIMM DDR5 at high data rates may require downclocking or manual tuning.");
    }
    if (technology === "DDR4" && count === 4 && speed > 4000) {
      warnings.push("Four-DIMM high-speed DDR4 may require manual tuning.");
    }

    return {
      technology,
      dimmType: String(e.dimmType || "UDIMM").toUpperCase(),
      totalCapacity: total,
      capacityScore: Math.round(capacityScore),
      bandwidthScore: Math.round(bandwidthScore),
      speedScore: Math.round(bandwidthScore),
      latencyScore: Math.round(latencyScore),
      topologyScore: Math.round(topoScore),
      channelScore: Math.round(topoScore),
      latencyNs: latencyNs == null ? null : Number(latencyNs.toFixed(2)),
      overall: clamp100(overall),
      tierIndex: ti,
      tier: pnTier(ti),
      rating_method: VERSION,
      warnings
    };
  }

  // Replace the v1 rating function globally for all downstream consumers.
  ramRating = ramV3Rating;
  globalThis.ramRating = ramV3Rating;

  function boolSelect(name, label, value) {
    return '<label><span>'+label+'</span><select data-rig-ram-field="'+name+'">'
      +'<option value="unknown"'+(value == null ? ' selected' : '')+'>Unknown</option>'
      +'<option value="true"'+(value === true || value === "true" ? ' selected' : '')+'>Yes</option>'
      +'<option value="false"'+(value === false || value === "false" ? ' selected' : '')+'>No</option>'
      +'</select></label>';
  }

  function optionSelect(name, label, current, values, suffix) {
    return '<label><span>'+label+'</span><select data-rig-ram-field="'+name+'">'
      + values.map(v => '<option value="'+v+'"'+(String(current)===String(v)?' selected':'')+'>'+v+(suffix||'')+'</option>').join('')
      + '</select></label>';
  }

  renderRamConfig = function renderRamConfigV3(slot) {
    const input = Object.assign({}, policy.defaults && policy.defaults.DDR4 || FALLBACK_POLICY.defaults.DDR4, slot && slot.ram || {});
    input.technology = normTech(input.technology, input.speed);
    input.dimmType = String(input.dimmType || "UDIMM").toUpperCase();

    const supported = policy.supported || FALLBACK_POLICY.supported;
    const speeds = input.technology === "DDR5"
      ? (supported.ddr5_speeds_mt_s || [])
      : (supported.ddr4_speeds_mt_s || []);

    const rating = ramV3Rating(input);
    const warning = rating.warnings.length
      ? '<div class="ram-config-wide hint" style="color:var(--amber,#d9a441)">'+escHtml(rating.warnings.join(" · "))+'</div>'
      : '';

    return '<div class="ram-config-grid">'
      + optionSelect("technology","Technology",input.technology,supported.technologies || ["DDR4","DDR5"])
      + optionSelect("dimmType","DIMM Type",input.dimmType,supported.dimm_types || ["UDIMM","CUDIMM"])
      + optionSelect("moduleCount","Modules",Number(input.moduleCount),supported.module_counts || [1,2,4])
      + optionSelect("perModuleCapacity","Each GB",Number(input.perModuleCapacity),supported.per_module_gb || [4,8,16,24,32,48,64])
      + optionSelect("speed","MT/s",Number(input.speed),speeds)
      + '<label><span>CAS Latency</span><input type="number" min="10" max="80" step="1" data-rig-ram-field="casLatency" value="'+escAttr(input.casLatency || "")+'" placeholder="e.g. 30"></label>'
      + '<label><span>RGB</span><select data-rig-ram-field="rgb"><option value="false"'+(input.rgb?'':' selected')+'>No</option><option value="true"'+(input.rgb?' selected':'')+'>Yes</option></select></label>'
      + boolSelect("xmp","XMP",input.xmp)
      + boolSelect("expo","EXPO",input.expo)
      + '<label class="ram-config-wide"><span>RAM Notes</span><input type="text" data-rig-ram-field="notes" value="'+escAttr(input.notes || "")+'" placeholder="e.g. matched kit / mixed modules"></label>'
      + warning
      + '</div>';
  };
  globalThis.renderRamConfig = renderRamConfig;

  renderCatalogMeta = function renderCatalogMetaRamV3(type, item, slot) {
    if (type !== "RAM") return baseRenderCatalogMeta(type, item, slot);
    const r = ramV3Rating(slot && slot.ram);
    const performance = '<span class="pn-meta-pill pn-performance-pill"><span>Performance</span><b>'+r.overall+'</b></span>';
    const tier = '<span class="pn-meta-pill pn-tier-pill '+pnTierClass(r.tier)+'"><span>Tier</span><b>'+r.tier+'</b></span>';
    const detail = '<span class="pn-meta-detail">Capacity '+r.capacityScore
      +' · Bandwidth '+r.bandwidthScore
      +' · Latency '+r.latencyScore
      +' · Topology '+r.topologyScore
      +(r.latencyNs != null ? ' · '+r.latencyNs+'ns' : '')
      +'</span>';
    return '<div class="rig-catalog-meta">'+performance+tier+detail+'</div>';
  };
  globalThis.renderCatalogMeta = renderCatalogMeta;

  function familyKey(f) {
    return pnNorm((f.brand || "")+" "+(f.series || f.model || ""));
  }

  function mergeFamilyPolicy(p) {
    const list = HardwareCatalog.ramFamilies || [];
    const map = new Map(list.map(f => [familyKey(f), f]));

    (p.familyEnrichments || []).forEach(extra => {
      const found = map.get(familyKey(extra));
      if (found) Object.assign(found, extra, {model: found.model || found.series});
    });

    let added = 0;
    (p.familyAdditions || []).forEach(extra => {
      const key = familyKey(extra);
      if (!key || map.has(key)) return;
      const next = Object.assign({
        model: extra.series,
        technology: extra.technology || "DDR5",
        rgb: !!extra.rgb,
        ram_v3_added: true
      }, extra);
      list.push(next);
      map.set(key, next);
      added++;
    });

    return added;
  }

  function preferredKit(family) {
    const kits = Array.isArray(family && family.kits) ? family.kits : [];
    if (!kits.length) return null;
    const scored = kits.slice().sort((a,b) => {
      const rank = k =>
        (Number(k.capacity)===32 ? 1000 : 0) +
        (Number(k.sticks)===2 ? 500 : 0) +
        (Number(k.speed)===6000 ? 300 : 0) +
        (Number(k.cas)===30 ? 200 : 0) +
        Number(k.speed || 0)/100;
      return rank(b)-rank(a);
    });
    return scored[0] || null;
  }

  function applySmartFamilyDefault(family, ram) {
    if (!ram || !family) return;
    const tech = normTech(family.technology, ram.speed);
    const kit = preferredKit(family);
    let next;
    if (kit) {
      const sticks = Number(kit.sticks) || 2;
      const cap = Number(kit.capacity) || (tech === "DDR5" ? 32 : 16);
      next = {
        technology: tech,
        dimmType: String(family.dimm_type || "UDIMM").toUpperCase(),
        moduleCount: sticks,
        perModuleCapacity: cap / sticks,
        totalCapacity: cap,
        speed: Number(kit.speed) || (tech === "DDR5" ? 6000 : 3200),
        casLatency: Number(kit.cas) || (tech === "DDR5" ? 30 : 16),
        rgb: !!family.rgb,
        xmp: kit.xmp == null ? null : !!kit.xmp,
        expo: kit.expo == null ? null : !!kit.expo,
        notes: ram.notes || ""
      };
    } else {
      next = Object.assign({}, policy.defaults && policy.defaults[tech] || FALLBACK_POLICY.defaults[tech], {
        rgb: !!family.rgb,
        dimmType: String(family.dimm_type || "UDIMM").toUpperCase(),
        notes: ram.notes || ""
      });
    }
    Object.assign(ram, next);
  }

  // Wrap the complete CPU -> GPU -> motherboard loader chain.
  loadHardwareCatalog = async function loadHardwareCatalogRamV3() {
    const catalog = await baseLoadHardwareCatalog();
    let fetchError = null;
    try {
      const response = await fetch(POLICY_URL);
      if (!response.ok) throw new Error("RAM V3 policy HTTP "+response.status);
      policy = await response.json();
    } catch (err) {
      fetchError = err;
      policy = FALLBACK_POLICY;
      console.warn("[PROFITNODE] RAM V3 policy fetch failed; embedded V3 policy used.", err);
    }

    const sourceFamilyCount = (HardwareCatalog.ramFamilies || []).length;
    const addedFamilies = mergeFamilyPolicy(policy);
    HardwareCatalog.ramSupported = Object.assign({}, HardwareCatalog.ramSupported || {}, policy.supported || {});
    HardwareCatalog.ramRatingsVersion = policy.version || VERSION;
    HardwareCatalog.ramRatingsAuditDate = policy.auditDate || "2026-09-12";
    HardwareCatalog.ramRatingsMethod = policy.method || FALLBACK_POLICY.method;

    // Family tier is not a fixed property in V3; the actual selected configuration is rated.
    (HardwareCatalog.ramFamilies || []).forEach(f => {
      f.ram_rating_mode = "CONFIGURATION";
      f.ram_rating_method = policy.version || VERSION;
    });

    // Bring canonical MY RIG RAM tier onto the same V3 ruler.
    try {
      if (typeof MY_RIG_CANONICAL_LOADOUT !== "undefined" && MY_RIG_CANONICAL_LOADOUT.slots && MY_RIG_CANONICAL_LOADOUT.slots.RAM) {
        const c = ramV3Rating({technology:"DDR5",moduleCount:2,perModuleCapacity:16,totalCapacity:32,speed:6000,casLatency:30});
        MY_RIG_CANONICAL_LOADOUT.slots.RAM.tier = c.tier;
      }
      if (typeof MyRig !== "undefined" && MyRig && typeof MyRig.ramFromSpecs === "function") {
        MyRig.ramFromSpecs = function ramFromSpecsV3(label, entry) {
          const spec = String(label || "").toUpperCase();
          let total = null, speed = null, cl = null, modules = null, each = null;
          const capMatch = spec.match(/(\d+)\s*GB/);
          if (capMatch) total = parseInt(capMatch[1],10);
          const speedMatch = spec.match(/DDR5?-?(\d{4,5})/i);
          if (speedMatch) speed = parseInt(speedMatch[1],10);
          const clMatch = spec.match(/CL\s*(\d{2,3})/i);
          if (clMatch) cl = parseInt(clMatch[1],10);
          const modMatch = spec.match(/(?:\(|\b)(\d+)\s*[X×]\s*(\d+)\s*GB(?:\)|\b)/i);
          if (modMatch) {
            modules = parseInt(modMatch[1],10);
            each = parseInt(modMatch[2],10);
            total = total || modules * each;
          }
          if (!modules && total) modules = total <= 16 ? 1 : 2;
          if (!each && total && modules) each = total / modules;
          const technology = /DDR5/i.test(spec) || Number(speed)>=4800 ? "DDR5" : (entry && entry.technology || "DDR4");
          return total && speed ? ramV3Rating({
            technology, totalCapacity: total, moduleCount: modules, perModuleCapacity: each,
            speed, casLatency: cl || (technology === "DDR5" ? 30 : 16)
          }) : null;
        };
      }
    } catch (err) {
      console.warn("[PROFITNODE] RAM V3 MY RIG alignment skipped.", err);
    }

    globalThis.__PN_RAM_V3 = {
      version: policy.version || VERSION,
      auditDate: policy.auditDate || "2026-09-12",
      sourceFamilyCount,
      addedFamilies,
      familyCount: (HardwareCatalog.ramFamilies || []).length,
      supported: HardwareCatalog.ramSupported,
      formula: (policy.method || FALLBACK_POLICY.method).formula,
      policyFallbackUsed: !!fetchError,
      rate: ramV3Rating
    };

    console.info(
      "[PROFITNODE] RAM V3 active:",
      (HardwareCatalog.ramFamilies || []).length+" families;",
      addedFamilies+" V3 family additions;",
      "configuration-first scoring enabled."
    );

    return catalog;
  };
  globalThis.loadHardwareCatalog = loadHardwareCatalog;

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (!root) return;

    // Normalize EXPO booleans and technology-dependent defaults after the base change handler runs.
    root.addEventListener("change", e => {
      const fieldEl = e.target.closest && e.target.closest("[data-rig-ram-field]");
      if (!fieldEl) return;
      try {
        if (typeof state === "undefined" || !state.rigDraft || !state.rigDraft.slots || !state.rigDraft.slots.RAM) return;
        const ram = state.rigDraft.slots.RAM.ram || (state.rigDraft.slots.RAM.ram = {});
        const field = fieldEl.dataset.rigRamField;

        if (field === "expo") {
          ram.expo = fieldEl.value === "unknown" ? null : fieldEl.value === "true";
        } else if (field === "technology") {
          const tech = normTech(fieldEl.value, ram.speed);
          ram.technology = tech;
          const currentSpeed = Number(ram.speed) || 0;
          if (tech === "DDR5" && currentSpeed < 4800) {
            Object.assign(ram, policy.defaults && policy.defaults.DDR5 || FALLBACK_POLICY.defaults.DDR5);
          } else if (tech === "DDR4" && currentSpeed >= 5600) {
            Object.assign(ram, policy.defaults && policy.defaults.DDR4 || FALLBACK_POLICY.defaults.DDR4);
          }
        } else if (field === "dimmType") {
          ram.dimmType = String(fieldEl.value || "UDIMM").toUpperCase();
        }
        ram.totalCapacity = Number(ram.moduleCount || 0) * Number(ram.perModuleCapacity || 0);
        if (typeof render === "function") render();
      } catch (err) {
        console.warn("[PROFITNODE] RAM V3 config normalization skipped.", err);
      }
    });

    // After the base RIG catalog handler selects a family, replace the obsolete DDR4 default
    // with the family's preferred kit or technology-appropriate V3 default.
    root.addEventListener("click", e => {
      const btn = e.target.closest && e.target.closest("[data-rig-catalog-choice]");
      if (!btn || btn.dataset.rigCatalogChoice !== "RAM") return;
      try {
        if (typeof state === "undefined" || !state.rigDraft || !state.rigDraft.slots || !state.rigDraft.slots.RAM) return;
        const family = catalogFind("RAM", btn.dataset.rigCatalogValue);
        if (!family) return;
        const ram = state.rigDraft.slots.RAM.ram || (state.rigDraft.slots.RAM.ram = {});
        applySmartFamilyDefault(family, ram);
        if (typeof render === "function") render();
      } catch (err) {
        console.warn("[PROFITNODE] RAM V3 family default skipped.", err);
      }
    });
  });
})();
