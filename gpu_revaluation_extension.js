"use strict";

/*
  PROFITNODE GPU V3 runtime migration
  Audit: 2026-09-12

  - Applies PN_GPU_V3_2026 scores to all 129 audited desktop gaming GPUs.
  - Preserves original raster and ray_tracing fields.
  - Uses V3 overall/pn_score for PROFITNODE tiering.
  - Keeps variant-specific ratings for VRAM/OEM/regional models.
  - Defensively removes any legacy AM3/AM3+ CPU contamination from GPU catalog.
*/
(() => {
  const VERSION = "gpu-v3-20260912";
  const OVERLAY_URL = "profitnode_gpu_ratings_v3.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;

  const modelKey = value => String(value || "").trim();

  loadHardwareCatalog = async function loadHardwareCatalogGpuV3() {
    const catalog = await baseLoadHardwareCatalog();

    try {
      const response = await fetch(OVERLAY_URL);
      if (!response.ok) throw new Error("GPU V3 overlay HTTP " + response.status);
      const overlay = await response.json();

      let applied = 0;
      let removedLegacyCpuContamination = 0;
      const seen = new Set();
      const rebuilt = [];

      (HardwareCatalog.gpus || []).forEach(item => {
        const platform = String(item.platform || "").toUpperCase();

        // Safety net. CPU V3 already does this, but GPU V3 must not depend on luck.
        if (platform === "AM3" || platform === "AM3+") {
          removedLegacyCpuContamination++;
          return;
        }

        const model = modelKey(item.model);
        const rating = overlay.ratings && overlay.ratings[model];

        let updated = item;
        if (rating) {
          updated = Object.assign({}, item, {
            legacy_overall: Number(item.overall),
            overall: rating.score,
            pn_score: rating.score,
            rating_method: overlay.version,
            rating_confidence: rating.confidence,
            gpu_v3: true,
            gpu_v3_old_score: rating.old_score,
            gpu_v3_old_tier: rating.old_tier,
            gpu_v3_delta: rating.delta,
            vram_gb: rating.vram_gb,
            vram_state: rating.vram_state,
            benchmark_basis: rating.source_basis,
            last_verified: overlay.auditDate
          });

          updated.pn_tier = gpuGearTier(updated);
          updated.pn_tier_name = pnTier(updated.pn_tier);
          applied++;
        }

        const key = pnNorm((updated.brand || "") + " " + updated.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuilt.push(updated);
      });

      HardwareCatalog.gpus = rebuilt;
      HardwareCatalog.gpuRatingsVersion = overlay.version;
      HardwareCatalog.gpuRatingsAuditDate = overlay.auditDate;
      HardwareCatalog.gpuRatingsMethod = overlay.method;
      HardwareCatalog.gpuRatingsDistribution = overlay.distribution;

      globalThis.__PN_GPU_V3 = {
        version: overlay.version,
        auditDate: overlay.auditDate,
        expected: overlay.recordCount,
        applied,
        gpuCount: rebuilt.length,
        removedLegacyCpuContamination,
        distribution: overlay.distribution
      };

      if (applied !== overlay.recordCount) {
        console.warn(
          "[PROFITNODE] GPU V3 loaded, but rating count differs:",
          "expected", overlay.recordCount, "applied", applied
        );
      } else {
        console.info(
          "[PROFITNODE] GPU V3 active:",
          applied + "/" + overlay.recordCount + " audited GPUs applied."
        );
      }
    } catch (error) {
      console.error(
        "[PROFITNODE] GPU V3 overlay failed; previous GPU catalog preserved.",
        error
      );
    }

    return HardwareCatalog;
  };
})();
