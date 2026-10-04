"use strict";

/*
  PROFITNODE CPU quality revaluation
  PassMark-backed V5: 2026-10-04

  Doctrine:
    - CPU quality is intrinsic component capability, never acquisition cost.
    - PassMark-derived V3 ratings are the single authoritative CPU score source.
    - No hand-curated score overrides are allowed in this layer.
    - Gaming/workstation dimensions remain available for build-balance logic.
*/
(() => {
  const VERSION = "cpu-passmark-v5-20261004";
  const OVERLAY_URL = "profitnode_cpu_ratings_v3.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;

  const canonicalModel = (model, overlay) => {
    const raw = String(model || "").trim();
    return (overlay.aliases && overlay.aliases[raw]) || raw;
  };

  const unratedCpu = (item, model, overlay, state, confidence, note) => Object.assign({}, item, {
    model,
    overall: null,
    pn_score: null,
    pn_tier: null,
    gaming: null,
    workstation: null,
    rating_method: "UNRATED",
    rating_confidence: confidence,
    cpu_rating_state: state,
    cpu_rating_note: note,
    last_verified: overlay.auditDate || "2026-10-04",
    cpu_v3: true,
    cpu_passmark_v5: true
  });

  const applyCpuPassMarkRating = (item, overlay) => {
    const model = canonicalModel(item.model, overlay);
    const unrated = overlay.unrated && overlay.unrated[model];
    const rating = overlay.ratings && overlay.ratings[model];

    if (model === "Phenom II X4 900" && unrated) return null;

    if (!rating) return unratedCpu(
      item,
      model,
      overlay,
      unrated ? "INTENTIONALLY_UNRATED" : "MISSING_OVERLAY",
      unrated ? unrated[0] : "MISSING OVERLAY",
      unrated ? unrated[2] : "No authoritative PassMark V3 rating exists for this catalog CPU."
    );

    const validRating = Array.isArray(rating) && rating.length >= 4 &&
      rating.slice(0, 3).every(value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100);
    if (!validRating) return unratedCpu(
      item,
      model,
      overlay,
      "INVALID_OVERLAY",
      "INVALID OVERLAY",
      "The authoritative PassMark V3 row is malformed; legacy scores were suppressed."
    );

    const overall = Number(rating[0]);
    const gaming = Number(rating[1]);
    const workstation = Number(rating[2]);
    const confidence = rating[3] || "UNKNOWN";

    const updated = Object.assign({}, item, {
      model,
      overall,
      pn_score: overall,
      gaming,
      workstation,
      rating_method: VERSION,
      rating_confidence: confidence,
      cpu_rating_state: "RATED",
      last_verified: overlay.auditDate || "2026-10-04",
      cpu_v3: true,
      cpu_passmark_v5: true
    });

    updated.pn_tier = cpuGearTier(updated);
    return updated;
  };

  loadHardwareCatalog = async function loadHardwareCatalogCpuPassMarkV5() {
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
      let ratedApplied = 0;
      let intentionallyUnratedApplied = 0;
      let missingOverlay = 0;
      let invalidOverlay = 0;

      [...(HardwareCatalog.cpus || []), ...movedCpus].forEach(item => {
        const corrected = applyCpuPassMarkRating(item, overlay);
        if (!corrected) return;

        const key = pnNorm((corrected.brand || "") + " " + corrected.model);
        if (seen.has(key)) return;
        seen.add(key);
        rebuiltCpus.push(corrected);
        if (corrected.cpu_rating_state === "RATED") ratedApplied++;
        else if (corrected.cpu_rating_state === "INTENTIONALLY_UNRATED") intentionallyUnratedApplied++;
        else if (corrected.cpu_rating_state === "MISSING_OVERLAY") missingOverlay++;
        else if (corrected.cpu_rating_state === "INVALID_OVERLAY") invalidOverlay++;
      });

      HardwareCatalog.cpus = rebuiltCpus;
      HardwareCatalog.gpus = realGpus;
      HardwareCatalog.cpuRatingsVersion = VERSION;
      HardwareCatalog.cpuRatingsStatus = "ready";
      HardwareCatalog.cpuRatingsAuditDate = overlay.auditDate || "2026-10-04";
      HardwareCatalog.cpuRatingsFormula = Object.assign({}, overlay.formula || {}, {
        doctrine: "PassMark-derived intrinsic CPU capability only",
        source: "PassMark CPU Mark + Thread Mark",
        excludes: ["purchase price", "deal quality", "profit margin", "resale spread", "manual quality overrides"]
      });
      HardwareCatalog.cpuV3MovedFromGpu = movedCpus.length;

      globalThis.__PN_CPU_V5 = {
        version: VERSION,
        auditDate: overlay.auditDate || "2026-10-04",
        ratedCount: Object.keys(overlay.ratings || {}).length,
        unratedCount: Object.keys(overlay.unrated || {}).length,
        ratedApplied,
        intentionallyUnratedApplied,
        missingOverlay,
        invalidOverlay,
        cpuCount: rebuiltCpus.length,
        movedFromGpu: movedCpus.length,
        gpuCount: realGpus.length
      };

      console.info(
        "[PROFITNODE] CPU PASSMARK V5 active:",
        Object.keys(overlay.ratings || {}).length + " benchmark-derived ratings,",
        rebuiltCpus.length + " CPUs total."
      );
    } catch (error) {
      HardwareCatalog.cpus = (HardwareCatalog.cpus || []).map(item => unratedCpu(
        item,
        String(item.model || "").trim(),
        { auditDate: "2026-10-04" },
        "OVERLAY_UNAVAILABLE",
        "OVERLAY UNAVAILABLE",
        "The authoritative PassMark V3 dataset could not be loaded; legacy scores were suppressed."
      ));
      HardwareCatalog.cpuRatingsVersion = VERSION;
      HardwareCatalog.cpuRatingsStatus = "error";
      console.error("[PROFITNODE] CPU PassMark overlay failed; CPU scores were disabled.", error);
    }

    return HardwareCatalog;
  };
})();
