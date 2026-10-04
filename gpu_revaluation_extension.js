"use strict";

/* PROFITNODE GPU MASTER V4 runtime layer - 2026-10-04
   - V3's 129 audited modern GPUs remain authoritative and unchanged.
   - Master V4 expands the discrete desktop gaming registry with legacy + Intel Arc.
   - Current Tom's native raster data remains primary; legacy cards carry explicit confidence.
   - RT, VRAM, price/value and board-partner quality remain separate concepts.
*/
(() => {
  const VERSION = "gpu-master-v4-20261004";
  const V3_URL = "profitnode_gpu_ratings_v3.json?v=" + VERSION;
  const MASTER_URL = "profitnode_gpu_master_registry_v4.json?v=" + VERSION;
  const ALIASES_URL = "profitnode_gpu_aliases_v4.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;
  const baseCatalogFind = catalogFind;
  const modelKey = value => String(value || "").trim();
  let aliasPolicy = { ambiguous: new Set(), excluded: [] };

  const policyKey = value => pnNorm(value)
    .replace(/^(NVIDIA|AMD|INTEL) /, "")
    .replace(/^(GEFORCE|RADEON) /, "");

  const isExcludedVariant = value => aliasPolicy.excluded.some(pattern => pattern.test(String(value || "")));
  const isAmbiguousIdentity = value => aliasPolicy.ambiguous.has(policyKey(value));

  catalogFind = function catalogFindGpuMasterV4(slotKey, label) {
    if (slotKey === "GPU" && (isExcludedVariant(label) || isAmbiguousIdentity(label))) return null;
    return baseCatalogFind(slotKey, label);
  };

  const fetchJson = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(url + " HTTP " + response.status);
    return response.json();
  };

  const aliasesByCanonical = aliasDoc => {
    const out = {};
    Object.entries((aliasDoc && aliasDoc.aliases) || {}).forEach(([alias, canonical]) => {
      (out[canonical] || (out[canonical] = [])).push(alias);
    });
    return out;
  };

  const legacyRtValue = entry => {
    const family = String(entry.family || "");
    if (entry.brand === "Intel" || /Arc|Alchemist|Battlemage|RTX|RDNA 2|RDNA 3|RDNA 4/i.test(family)) return null;
    return 0;
  };

  const applyMasterEntry = (item, rating, aliases, isNew) => {
    const score = Number(rating.score);
    const updated = Object.assign({}, item || {}, {
      brand: rating.brand || (item && item.brand) || "",
      model: rating.model,
      overall: score,
      pn_score: score,
      raster: isNew ? score : (item && item.raster),
      ray_tracing: isNew ? legacyRtValue(rating) : (item && item.ray_tracing),
      family: rating.family || (item && item.family),
      rating_method: rating.rating_method || VERSION,
      rating_confidence: rating.confidence || "UNKNOWN",
      benchmark_basis: rating.source_basis || null,
      vram_gb: rating.vram_gb == null ? null : Number(rating.vram_gb),
      vram_state: rating.vram_state || "UNKNOWN",
      last_verified: rating.last_verified || "2026-10-04",
      gpu_v4: true,
      aliases: aliases || []
    });
    ["passmark_g3d","legacy_toms_pct","raster_1080p","raster_1440p","raster_4k","notes"].forEach(k => {
      if (rating[k] != null) updated[k] = rating[k];
    });
    updated.pn_tier = gpuGearTier(updated);
    updated.pn_tier_name = pnTier(updated.pn_tier);
    return updated;
  };

  loadHardwareCatalog = async function loadHardwareCatalogGpuMasterV4() {
    const catalog = await baseLoadHardwareCatalog();
    try {
      const [v3, master, aliasDoc] = await Promise.all([
        fetchJson(V3_URL), fetchJson(MASTER_URL), fetchJson(ALIASES_URL)
      ]);
      aliasPolicy = {
        ambiguous: new Set((aliasDoc.do_not_auto_alias || []).map(policyKey)),
        excluded: (aliasDoc.excluded_variant_patterns || []).map(pattern => new RegExp(pattern, "i"))
      };
      const masterMap = new Map((master.entries || []).map(x => [modelKey(x.model), x]));
      const aliasIndex = aliasesByCanonical(aliasDoc);
      const seen = new Set();
      const rebuilt = [];
      let removedLegacyCpuContamination = 0;
      let existingApplied = 0;
      let appended = 0;

      (HardwareCatalog.gpus || []).forEach(item => {
        const platform = String(item.platform || "").toUpperCase();
        if (platform === "AM3" || platform === "AM3+") {
          removedLegacyCpuContamination++;
          return;
        }
        const model = modelKey(item.model);
        const rating = masterMap.get(model);
        const updated = rating ? applyMasterEntry(item, rating, aliasIndex[model], false) : item;
        const key = pnNorm((updated.brand || "") + " " + updated.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuilt.push(updated);
        if (rating) existingApplied++;
      });

      (master.entries || []).forEach(rating => {
        const key = pnNorm((rating.brand || "") + " " + rating.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuilt.push(applyMasterEntry(null, rating, aliasIndex[rating.model], true));
        appended++;
      });

      HardwareCatalog.gpus = rebuilt;
      HardwareCatalog.gpuRatingsVersion = master.version;
      HardwareCatalog.gpuRatingsAuditDate = master.auditDate;
      HardwareCatalog.gpuRatingsMethod = Object.assign({}, v3.method || {}, master.doctrine || {});
      HardwareCatalog.gpuAliasesVersion = aliasDoc.version;
      HardwareCatalog.gpuRegistryCounts = master.counts;

      globalThis.__PN_GPU_V4 = {
        version: master.version,
        auditDate: master.auditDate,
        v3Count: master.counts && master.counts.v3,
        expected: master.counts && master.counts.total,
        existingApplied,
        appended,
        gpuCount: rebuilt.length,
        removedLegacyCpuContamination
      };

      console.info(
        "[PROFITNODE] GPU MASTER V4 active:",
        rebuilt.length + " desktop GPUs (" + existingApplied + " existing + " + appended + " expansion)."
      );
    } catch (error) {
      console.error("[PROFITNODE] GPU MASTER V4 failed; previous GPU catalog preserved.", error);
    }
    return HardwareCatalog;
  };
})();
