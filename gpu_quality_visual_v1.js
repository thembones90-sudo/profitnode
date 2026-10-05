"use strict";

/* PROFITNODE GPU QUALITY VISUAL V1
   Parts Vault GPU color/tier/rating must come from the canonical live GPU
   catalog. A tier-band midpoint is never a GPU score. Ambiguous variants are
   UNRATED until the exact card is identified. Purchase price is irrelevant. */
(() => {
  const basePartNameTier = globalThis.pnPartNameTier;
  const baseInventoryItemTierKey = globalThis.inventoryItemTierKey;

  function gt630FamilyFloor(item, resolution) {
    const text = pnNorm(((item && item.manufacturer) || "") + " " + ((item && item.model) || ""));
    if (!/\bGT\s*630\b/.test(text)) return null;
    return {
      gpu: null,
      score: 1,
      tierIndex: 0,
      resolution: resolution || { confidence: "FAMILY", reason: "GT 630 family floor" },
      familyFloor: true
    };
  }

  function liveGpuQuality(item) {
    if (!item || String(item.category || "").toUpperCase() !== "GPU") return null;
    const resolution = typeof pnPartCatalogResolution === "function" ? pnPartCatalogResolution(item) : null;
    const gpu = resolution && resolution.item;
    if (!gpu) {
      const floor = gt630FamilyFloor(item, resolution);
      return floor || { gpu: null, score: null, tierIndex: null, resolution, unrated: true };
    }
    const rawScore = gpu.overall != null ? gpu.overall : gpu.pn_score;
    const score = rawScore == null || rawScore === "" ? NaN : Number(rawScore);
    if (!Number.isFinite(score)) return { gpu, score: null, tierIndex: null, resolution, unrated: true };
    const tierIndex = typeof gpuGearTier === "function" ? gpuGearTier(gpu) : null;
    if (!Number.isFinite(tierIndex)) return { gpu, score: null, tierIndex: null, resolution, unrated: true };
    return { gpu, score: Math.max(0, Math.min(100, Math.round(score))), tierIndex, resolution };
  }

  globalThis.pnPartNameTier = function pnPartNameTierCanonicalGpu(item) {
    const live = liveGpuQuality(item);
    if (!live) return basePartNameTier(item);
    if (live.unrated) return {
      tier: null,
      rating: "—",
      source: "unrated",
      category: "GPU",
      matchConfidence: live.resolution ? live.resolution.confidence : "NONE",
      reason: live.resolution && live.resolution.confidence === "AMBIGUOUS"
        ? live.resolution.reason
        : "No authoritative canonical GPU match; exact model and VRAM variant required",
      key: "UNRATED",
      label: "Unrated",
      className: "pn-part-name-unrated"
    };
    if (live.familyFloor) return Object.assign({
      tier: live.tierIndex + 1,
      rating: live.score,
      source: "family-floor",
      category: "GPU",
      matchConfidence: "FAMILY",
      reason: "Conservative GT 630 family floor; exact memory variant not recorded"
    }, PN_PART_NAME_TIERS[live.tierIndex + 1]);
    const tier = Math.max(1, Math.min(7, live.tierIndex + 1));
    return Object.assign({
      tier,
      rating: live.score,
      source: "catalog",
      category: "GPU",
      matchConfidence: live.resolution.confidence,
      reason: "Canonical GPU raster-performance score · " + live.resolution.reason
    }, PN_PART_NAME_TIERS[tier]);
  };

  globalThis.inventoryItemTierKey = function inventoryItemTierKeyCanonicalGpu(item) {
    const live = liveGpuQuality(item);
    return live ? { tier: live.unrated ? null : live.tierIndex, score: live.unrated ? null : live.score } : baseInventoryItemTierKey(item);
  };

  globalThis.__PN_GPU_QUALITY_VISUAL_V1 = {
    version: "gpu-quality-visual-v1-20261005",
    doctrine: "GPU visual rating = canonical native-raster score; ambiguity is UNRATED; finance excluded"
  };
  console.info("[PROFITNODE] GPU QUALITY VISUAL V1 active · Parts Vault GPU ratings now use canonical live scores only.");
})();
