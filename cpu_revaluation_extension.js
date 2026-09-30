"use strict";

/*
  PROFITNODE CPU quality revaluation
  Revamp: 2026-09-30
  Doctrine:
    - CPU score is intrinsic component quality/capability, never acquisition cost
    - purchase price/value remains a separate financial stat
    - keep legacy CPU cleanup/migration behavior from V3
*/
(() => {
  const VERSION = "cpu-quality-v4-20260930";
  const OVERLAY_URL = "profitnode_cpu_ratings_v3.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;
  const CPU_QUALITY_OVERRIDES = {
  "Ryzen 3 1200": 31,
  "Ryzen 3 1300X": 33,
  "Ryzen 5 1400": 35,
  "Ryzen 5 1500X": 38,
  "Ryzen 5 1600": 43,
  "Ryzen 5 1600X": 44,
  "Ryzen 7 1700": 46,
  "Ryzen 7 1700X": 47,
  "Ryzen 7 1800X": 48,
  "Ryzen 3 2200G": 34,
  "Ryzen 5 2400G": 40,
  "Ryzen 5 2600": 50,
  "Ryzen 5 2600X": 52,
  "Ryzen 7 2700": 54,
  "Ryzen 7 2700X": 56,
  "Ryzen 3 3100": 49,
  "Ryzen 3 3200G": 38,
  "Ryzen 3 3300X": 54,
  "Ryzen 5 3400G": 44,
  "Ryzen 5 3500": 55,
  "Ryzen 5 3500X": 56,
  "Ryzen 5 3600": 61,
  "Ryzen 5 3600X": 62,
  "Ryzen 5 3600XT": 63,
  "Ryzen 7 3700X": 66,
  "Ryzen 7 3800X": 67,
  "Ryzen 7 3800XT": 68,
  "Ryzen 9 3900X": 72,
  "Ryzen 9 3950X": 77,
  "Ryzen 3 4100": 49,
  "Ryzen 5 4500": 54,
  "Ryzen 5 4600G": 57,
  "Ryzen 5 PRO 4650G": 58,
  "Ryzen 7 4700G": 64,
  "Ryzen 7 PRO 4750G": 65,
  "Ryzen 3 5100": 53,
  "Ryzen 5 5500": 64,
  "Ryzen 5 5600G": 65,
  "Ryzen 5 5600": 69,
  "Ryzen 5 5600X": 70,
  "Ryzen 7 5700": 71,
  "Ryzen 7 5700G": 70,
  "Ryzen 7 5700X": 75,
  "Ryzen 7 5700X3D": 84,
  "Ryzen 7 5800X": 77,
  "Ryzen 7 5800X3D": 86,
  "Ryzen 9 5900X": 82,
  "Ryzen 9 5950X": 87,
  "Core i3-6100": 29,
  "Core i3-6300": 31,
  "Core i5-6400": 37,
  "Core i5-6500": 39,
  "Core i5-6600": 41,
  "Core i5-6600K": 43,
  "Core i7-6700": 48,
  "Core i7-6700K": 50,
  "Core i3-7100": 31,
  "Core i3-7300": 33,
  "Core i5-7400": 40,
  "Core i5-7500": 42,
  "Core i5-7600": 44,
  "Core i5-7600K": 46,
  "Core i7-7700": 50,
  "Core i7-7700K": 52,
  "Core i3-8100": 39,
  "Core i3-8350K": 43,
  "Core i5-8400": 51,
  "Core i5-8500": 52,
  "Core i5-8600": 53,
  "Core i5-8600K": 55,
  "Core i7-8700": 59,
  "Core i7-8700K": 61,
  "Core i3-9100": 42,
  "Core i3-9100F": 42,
  "Core i5-9400": 53,
  "Core i5-9400F": 53,
  "Core i5-9500": 54,
  "Core i5-9600K": 57,
  "Core i5-9600KF": 57,
  "Core i7-9700": 62,
  "Core i7-9700K": 64,
  "Core i7-9700KF": 64,
  "Core i9-9900": 67,
  "Core i9-9900K": 69,
  "Core i9-9900KF": 69,
  "Core i3-10100": 52,
  "Core i3-10100F": 52,
  "Core i3-10300": 54,
  "Core i5-10400": 59,
  "Core i5-10400F": 59,
  "Core i5-10500": 60,
  "Core i5-10600K": 63,
  "Core i5-10600KF": 63,
  "Core i7-10700": 66,
  "Core i7-10700F": 66,
  "Core i7-10700K": 68,
  "Core i7-10700KF": 68,
  "Core i9-10900": 70,
  "Core i9-10900K": 72,
  "Core i3-11100": 54,
  "Core i3-11100F": 54,
  "Core i5-11400": 62,
  "Core i5-11400F": 62,
  "Core i5-11500": 63,
  "Core i5-11600K": 66,
  "Core i5-11600KF": 66,
  "Core i7-11700": 68,
  "Core i7-11700F": 68,
  "Core i7-11700K": 69,
  "Core i9-11900": 69,
  "Core i9-11900K": 70,
  "Core i3-12100": 61,
  "Core i3-12100F": 61,
  "Core i5-12400": 70,
  "Core i5-12400F": 70,
  "Core i5-12500": 71,
  "Core i5-12600K": 76,
  "Core i5-12600KF": 76,
  "Core i7-12700": 79,
  "Core i7-12700F": 79,
  "Core i7-12700K": 81,
  "Core i9-12900K": 86,
  "Core i3-13100": 63,
  "Core i3-13100F": 63,
  "Core i5-13400": 74,
  "Core i5-13400F": 74,
  "Core i5-13500": 78,
  "Core i5-13600K": 82,
  "Core i5-13600KF": 82,
  "Core i7-13700": 85,
  "Core i7-13700K": 87,
  "Core i9-13900K": 91,
  "Core i3-14100": 64,
  "Core i3-14100F": 64,
  "Core i5-14400": 75,
  "Core i5-14400F": 75,
  "Core i5-14500": 79,
  "Core i5-14600K": 83,
  "Core i7-14700K": 89,
  "Core i9-14900K": 93
};

  const canonicalModel = (model, overlay) => {
    const raw = String(model || "").trim();
    return (overlay.aliases && overlay.aliases[raw]) || raw;
  };

  const applyCpuQuality = (item, overlay) => {
    const model = canonicalModel(item.model, overlay);
    const unrated = overlay.unrated && overlay.unrated[model];
    const legacyRating = overlay.ratings && overlay.ratings[model];
    const quality = CPU_QUALITY_OVERRIDES[model];

    if (model === "Phenom II X4 900" && unrated) return null;

    if (!legacyRating && quality === undefined) {
      if (unrated) {
        return Object.assign({}, item, {
          model,
          overall: null,
          pn_score: null,
          pn_tier: null,
          rating_method: "UNRATED",
          rating_confidence: unrated[0],
          cpu_v3_note: unrated[2],
          last_verified: overlay.auditDate
        });
      }
      return item;
    }

    const overall = quality !== undefined ? quality : legacyRating[0];
    const updated = Object.assign({}, item, {
      model,
      overall,
      pn_score: overall,
      gaming: legacyRating ? legacyRating[1] : item.gaming,
      workstation: legacyRating ? legacyRating[2] : item.workstation,
      rating_method: quality !== undefined ? VERSION : overlay.version,
      rating_confidence: quality !== undefined ? "CURATED QUALITY SCORE" : legacyRating[3],
      last_verified: "2026-09-30",
      cpu_v3: true,
      cpu_quality_v4: quality !== undefined
    });

    updated.pn_tier = cpuGearTier(updated);
    return updated;
  };

  loadHardwareCatalog = async function loadHardwareCatalogCpuQualityV4() {
    const catalog = await baseLoadHardwareCatalog();

    try {
      const response = await fetch(OVERLAY_URL);
      if (!response.ok) throw new Error("CPU overlay HTTP " + response.status);
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
        const corrected = applyCpuQuality(item, overlay);
        if (!corrected) return;

        const key = pnNorm((corrected.brand || "") + " " + corrected.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuiltCpus.push(corrected);
      });

      HardwareCatalog.cpus = rebuiltCpus;
      HardwareCatalog.gpus = realGpus;
      HardwareCatalog.cpuRatingsVersion = VERSION;
      HardwareCatalog.cpuRatingsAuditDate = "2026-09-30";
      HardwareCatalog.cpuRatingsFormula = {
        doctrine: "intrinsic component quality/capability only",
        excludes: ["purchase price", "deal quality", "profit margin", "resale spread"],
        factors: ["gaming performance", "general CPU performance", "architecture", "core/thread adequacy", "platform relevance"]
      };
      HardwareCatalog.cpuV3MovedFromGpu = movedCpus.length;

      globalThis.__PN_CPU_V4 = {
        version: VERSION,
        auditDate: "2026-09-30",
        curatedCount: Object.keys(CPU_QUALITY_OVERRIDES).length,
        cpuCount: rebuiltCpus.length,
        movedFromGpu: movedCpus.length,
        gpuCount: realGpus.length
      };

      console.info(
        "[PROFITNODE] CPU QUALITY V4 active:",
        Object.keys(CPU_QUALITY_OVERRIDES).length + " curated CPU scores,",
        rebuiltCpus.length + " CPUs total."
      );
    } catch (error) {
      console.error("[PROFITNODE] CPU quality overlay failed; base catalog preserved.", error);
    }

    return HardwareCatalog;
  };
})();
