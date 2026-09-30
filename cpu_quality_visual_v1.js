"use strict";

/* PROFITNODE CPU QUALITY VISUAL V1
   Parts Vault CPU color/tier/rating must come from the canonical live CPU catalog.
   Purchase price, resale value and deal quality are deliberately excluded. */
(() => {
  const basePartNameTier = globalThis.pnPartNameTier;
  const baseInventoryItemTierKey = globalThis.inventoryItemTierKey;

  function liveCpuQuality(item) {
    if (!item || String(item.category || "").toUpperCase() !== "CPU") return null;
    const resolution = typeof pnPartCatalogResolution === "function" ? pnPartCatalogResolution(item) : null;
    const cpu = resolution && resolution.item;
    if (!cpu) return null;
    const score = Number(cpu.overall != null ? cpu.overall : cpu.pn_score);
    if (!Number.isFinite(score)) return null;
    const tierIndex = typeof cpuGearTier === "function" ? cpuGearTier(cpu) : null;
    if (!Number.isFinite(tierIndex)) return null;
    return {
      cpu,
      score: Math.max(0, Math.min(100, Math.round(score))),
      tierIndex,
      visualTier: tierIndex + 1,
      resolution
    };
  }

  globalThis.pnCpuNameTier = function pnCpuNameTierCanonical(text, catalog) {
    const score = catalog && Number(catalog.overall != null ? catalog.overall : catalog.pn_score);
    if (Number.isFinite(score)) return Math.max(1, Math.min(7, cpuGearTier(catalog) + 1));
    return typeof pnPartTierFromScore === "function"
      ? (pnPartTierFromScore(score, PN_PART_NAME_RULES.CPU.scores) || 2)
      : 2;
  };

  globalThis.pnPartNameTier = function pnPartNameTierCanonicalCpu(item) {
    const live = liveCpuQuality(item);
    if (!live) return basePartNameTier(item);
    const tier = Math.max(1, Math.min(7, live.visualTier));
    return Object.assign({
      tier,
      rating: live.score,
      source: "catalog",
      category: "CPU",
      matchConfidence: live.resolution.confidence,
      reason: "Canonical CPU quality score · " + live.resolution.reason
    }, PN_PART_NAME_TIERS[tier]);
  };

  globalThis.inventoryItemTierKey = function inventoryItemTierKeyCanonicalCpu(item) {
    const live = liveCpuQuality(item);
    return live ? {tier: live.tierIndex, score: live.score} : baseInventoryItemTierKey(item);
  };

  globalThis.__PN_CPU_QUALITY_VISUAL_V1 = {
    version: "cpu-quality-visual-v1-20260930",
    doctrine: "CPU visual rating = canonical intrinsic CPU quality; finance excluded"
  };
  console.info("[PROFITNODE] CPU QUALITY VISUAL V1 active · Parts Vault CPU tiers now use canonical live scores.");
})();
