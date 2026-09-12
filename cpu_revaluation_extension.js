"use strict";

/*
  PROFITNODE CPU V3 runtime migration
  Audit: 2026-09-12
  Purpose:
    - apply the normalized PN_CPU_V3_2026 scores to every audited CPU
    - move AM3 / AM3+ CPU records out of the legacy GPU array at runtime
    - normalize the malformed "FX-4000 FX-4100" record to "FX-4100"
    - suppress the unverified plain "Phenom II X4 900" record
    - preserve documented-unreleased HOLD CPUs as unrated
*/
(() => {
  const VERSION = "cpu-v3-20260912";
  const OVERLAY_URL = "profitnode_cpu_ratings_v3.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;

  const canonicalModel = (model, overlay) => {
    const raw = String(model || "").trim();
    return (overlay.aliases && overlay.aliases[raw]) || raw;
  };

  const applyCpuV3 = (item, overlay) => {
    const model = canonicalModel(item.model, overlay);
    const unrated = overlay.unrated && overlay.unrated[model];

    // This SKU could not be verified. Do not let an invented score leak into UI.
    if (model === "Phenom II X4 900" && unrated) return null;

    const rating = overlay.ratings && overlay.ratings[model];
    if (!rating) {
      // HOLD / documented-unreleased records remain in the catalog but unrated.
      if (unrated) {
        const held = Object.assign({}, item, {
          model,
          overall: null,
          pn_score: null,
          pn_tier: null,
          rating_method: "UNRATED",
          rating_confidence: unrated[0],
          cpu_v3_note: unrated[2],
          last_verified: overlay.auditDate
        });
        return held;
      }
      return item;
    }

    const updated = Object.assign({}, item, {
      model,
      overall: rating[0],
      pn_score: rating[0],
      gaming: rating[1],
      workstation: rating[2],
      rating_method: overlay.version,
      rating_confidence: rating[3],
      last_verified: overlay.auditDate,
      cpu_v3: true
    });

    updated.pn_tier = cpuGearTier(updated);
    return updated;
  };

  loadHardwareCatalog = async function loadHardwareCatalogCpuV3() {
    const catalog = await baseLoadHardwareCatalog();

    try {
      const response = await fetch(OVERLAY_URL);
      if (!response.ok) throw new Error("CPU V3 overlay HTTP " + response.status);
      const overlay = await response.json();

      const legacyCpuPlatforms = new Set(
        (overlay.moveFromGpu || []).map(v => String(v).toUpperCase())
      );

      const movedCpus = [];
      const realGpus = [];

      (HardwareCatalog.gpus || []).forEach(item => {
        const platform = String(item.platform || "").toUpperCase();
        if (legacyCpuPlatforms.has(platform)) movedCpus.push(item);
        else realGpus.push(item);
      });

      const seen = new Set();
      const rebuiltCpus = [];

      [...(HardwareCatalog.cpus || []), ...movedCpus].forEach(item => {
        const corrected = applyCpuV3(item, overlay);
        if (!corrected) return;

        const key = pnNorm((corrected.brand || "") + " " + corrected.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuiltCpus.push(corrected);
      });

      HardwareCatalog.cpus = rebuiltCpus;
      HardwareCatalog.gpus = realGpus;
      HardwareCatalog.cpuRatingsVersion = overlay.version;
      HardwareCatalog.cpuRatingsAuditDate = overlay.auditDate;
      HardwareCatalog.cpuRatingsFormula = overlay.formula;
      HardwareCatalog.cpuV3MovedFromGpu = movedCpus.length;

      globalThis.__PN_CPU_V3 = {
        version: overlay.version,
        auditDate: overlay.auditDate,
        cpuCount: rebuiltCpus.length,
        movedFromGpu: movedCpus.length,
        gpuCount: realGpus.length
      };

      console.info(
        "[PROFITNODE] CPU V3 active:",
        rebuiltCpus.length + " CPUs,",
        movedCpus.length + " legacy CPU records rescued from GPU catalog."
      );
    } catch (error) {
      console.error("[PROFITNODE] CPU V3 overlay failed; base catalog preserved.", error);
    }

    return HardwareCatalog;
  };
})();
