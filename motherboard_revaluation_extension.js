"use strict";

/*
  PROFITNODE MOTHERBOARD V3
  Audit: 2026-09-12

  Scores EVERY board currently loaded by the motherboard catalog on one global
  2026 ruler instead of mixing era-relative "upgrade headroom" scales.

  Formula:
    35% board-specific power delivery / VRM quality
    25% board-specific feature richness
    40% 2026 platform capability + lifecycle

  Price and brand prestige are intentionally excluded.
*/
(() => {
  const VERSION = "motherboard-v3-20260912";
  const POLICY_URL = "profitnode_motherboard_v3_policy.json?v=" + VERSION;
  const baseLoadHardwareCatalog = loadHardwareCatalog;

  const finite = value => Number.isFinite(Number(value));
  const clamp100 = value => Math.max(0, Math.min(100, Number(value) || 0));
  const canon = value => String(value || "").trim().toUpperCase();

  function tierNameFromBoard(board) {
    const idx = motherboardGearTier(board);
    return null == idx ? null : pnTier(idx);
  }

  function platformScore(board, policy) {
    const chipset = canon(board.chipset).replace(/^AMD\s+|^INTEL\s+/, "");
    if (finite(policy.platformScores[chipset])) {
      return {
        score: Number(policy.platformScores[chipset]),
        key: chipset,
        exact: true
      };
    }

    const socket = canon(board.socket || board.platform);
    const fallback =
      policy.fallbackPlatformScores[socket] ??
      (socket.includes("LGA1151") ? policy.fallbackPlatformScores["LGA1151"] : null) ??
      policy.fallbackPlatformScores["DEFAULT"];

    return {
      score: Number(fallback),
      key: chipset || socket || "UNKNOWN",
      exact: false
    };
  }

  function fallbackRichFeatureScore(board) {
    let s = 30;

    const memorySlots = Number(board.memory_slots) || 0;
    if (canon(board.memory_type) === "DDR5") s += 5;
    if (memorySlots >= 4) s += 3;
    else if (memorySlots >= 2) s += 1;

    const pcieGen = Number(board.primary_pcie_generation) || 0;
    if (pcieGen >= 5) s += 9;
    else if (pcieGen >= 4) s += 6;
    else if (pcieGen >= 3) s += 3;

    const m2 = Number(board.m2_slots) || 0;
    s += Math.min(9, m2 * 3);
    if (/GEN\s*5|PCIE\s*5/i.test(String(board.m2_details || ""))) s += 4;

    const sata = Number(board.sata_ports) || 0;
    s += Math.min(3, Math.floor(sata / 2));

    const eth = canon(board.ethernet_speed);
    if (eth.includes("10G")) s += 8;
    else if (eth.includes("5G")) s += 6;
    else if (eth.includes("2.5G")) s += 4;
    else if (eth.includes("1G")) s += 2;

    if (board.wifi === true) s += 4;
    if (/WI-?FI\s*7/i.test(String(board.wifi_standard || ""))) s += 2;
    else if (/WI-?FI\s*6E/i.test(String(board.wifi_standard || ""))) s += 1;

    if (board.usb4 === true) s += 5;
    if (board.rear_usb_c === true || /TYPE.?C|USB.?C/i.test(String(board.rear_usb_c || ""))) s += 2;
    if (board.front_usb_c_header === true || /TYPE.?C|USB.?C/i.test(String(board.front_usb_c_header || ""))) s += 2;

    if (board.bios_flashback === true) s += 4;
    if (board.clear_cmos === true) s += 1;
    if (board.debug_led === true) s += 2;
    if (board.post_code === true) s += 4;
    if (board.onboard_buttons === true) s += 2;

    if (board.vrm_heatsink === true) s += 2;
    if (board.m2_heatsinks === true) s += 2;

    const layers = Number(board.pcb_layers);
    if (layers >= 8) s += 3;
    else if (layers >= 6) s += 2;

    return clamp100(s);
  }

  function featureScore(board) {
    if (finite(board.feature_score_v3)) {
      return clamp100(board.feature_score_v3);
    }

    // Legacy AM4/LGA1151 schema stores a numeric feature score directly.
    if (finite(board.features)) {
      return clamp100(board.features);
    }

    /*
      AM5 V2 replaced the numeric "features" field with display text while
      retaining overall, vrm_power and upgrade_headroom. Recover its prior
      board-specific feature signal from the documented legacy structure:
        oldOverall = .45*VRM + .25*features + .30*headroom
    */
    if (finite(board.overall) && finite(board.vrm_power) && finite(board.upgrade_headroom)) {
      const recovered =
        (Number(board.overall) -
          0.45 * Number(board.vrm_power) -
          0.30 * Number(board.upgrade_headroom)) / 0.25;

      if (Number.isFinite(recovered) && recovered >= 0 && recovered <= 100) {
        return clamp100(recovered);
      }
    }

    return fallbackRichFeatureScore(board);
  }

  function vrmScore(board) {
    if (finite(board.vrm_power)) return clamp100(board.vrm_power);

    const phases = Number(board.vrm_phases) || 0;
    const stage = Number(board.power_stage_rating) || 0;
    let score = 30 + Math.min(40, phases * 4) + Math.min(20, stage * 0.25);
    if (board.vrm_heatsink === true) score += 5;
    return clamp100(score);
  }

  function addVerifiedBoards(policy) {
    let added = 0;
    const existing = new Set(
      (HardwareCatalog.boards || []).map(
        b => pnNorm((b.brand || b.manufacturer || "") + " " + b.model)
      )
    );

    (policy.verifiedAdditions || []).forEach(board => {
      const key = pnNorm((board.brand || board.manufacturer || "") + " " + board.model);
      if (existing.has(key)) return;

      HardwareCatalog.boards.push(Object.assign({}, board));
      existing.add(key);
      added++;
    });

    return added;
  }

  loadHardwareCatalog = async function loadHardwareCatalogMotherboardV3() {
    const catalog = await baseLoadHardwareCatalog();

    try {
      const response = await fetch(POLICY_URL);
      if (!response.ok) throw new Error("Motherboard V3 policy HTTP " + response.status);
      const policy = await response.json();

      const sourceBoardCount = (HardwareCatalog.boards || []).length;
      const addedBoards = addVerifiedBoards(policy);

      const seen = new Set();
      const rebuilt = [];
      const audit = [];
      const distribution = {};
      const bySocket = {};
      const byChipset = {};
      const unknownChipsets = {};
      let tierChanges = 0;

      (HardwareCatalog.boards || []).forEach(board => {
        const key = pnNorm((board.brand || board.manufacturer || "") + " " + board.model);
        if (!key || seen.has(key)) return;
        seen.add(key);

        const oldScore = finite(board.overall)
          ? Number(board.overall)
          : finite(board.pn_score)
            ? Number(board.pn_score)
            : null;

        const oldTierName = oldScore == null
          ? null
          : tierNameFromBoard(Object.assign({}, board, {overall: oldScore, pn_score: oldScore}));

        const vrm = vrmScore(board);
        const features = featureScore(board);
        const platform = platformScore(board, policy);

        const score = Math.round(
          policy.method.vrmWeight * vrm +
          policy.method.featureWeight * features +
          policy.method.platformWeight * platform.score
        );

        const updated = Object.assign({}, board, {
          legacy_overall: oldScore,
          legacy_pn_score: board.pn_score ?? null,
          legacy_pn_tier: board.pn_tier ?? null,

          vrm_score_v3: Math.round(vrm),
          feature_score_v3: Math.round(features),
          platform_score_v3: Math.round(platform.score),
          platform_key_v3: platform.key,
          platform_exact_v3: platform.exact,

          overall: score,
          pn_score: score,
          rating_method: policy.version,
          motherboard_v3: true,
          motherboard_v3_delta: oldScore == null ? null : score - oldScore,
          last_verified_v3: policy.auditDate
        });

        updated.pn_tier = motherboardGearTier(updated);
        updated.pn_tier_name = pnTier(updated.pn_tier);

        const confidence =
          String(board.rating_confidence || board.confidence || "MEDIUM").toUpperCase();

        updated.rating_confidence_v3 = platform.exact ? confidence : "LOW";

        if (oldTierName && oldTierName !== updated.pn_tier_name) tierChanges++;

        distribution[updated.pn_tier_name] =
          (distribution[updated.pn_tier_name] || 0) + 1;

        const socket = String(updated.socket || updated.platform || "UNKNOWN");
        bySocket[socket] = (bySocket[socket] || 0) + 1;

        const chipset = String(updated.chipset || "UNKNOWN");
        byChipset[chipset] = (byChipset[chipset] || 0) + 1;

        if (!platform.exact) {
          unknownChipsets[platform.key] = (unknownChipsets[platform.key] || 0) + 1;
        }

        audit.push({
          brand: updated.brand || updated.manufacturer || "",
          model: updated.model,
          socket,
          chipset,
          oldScore,
          oldTier: oldTierName,
          v3Score: score,
          v3Tier: updated.pn_tier_name,
          delta: oldScore == null ? null : score - oldScore,
          vrm: Math.round(vrm),
          features: Math.round(features),
          platform: Math.round(platform.score),
          confidence: updated.rating_confidence_v3,
          platformExact: platform.exact
        });

        rebuilt.push(updated);
      });

      HardwareCatalog.boards = rebuilt;
      HardwareCatalog.motherboardRatingsVersion = policy.version;
      HardwareCatalog.motherboardRatingsAuditDate = policy.auditDate;
      HardwareCatalog.motherboardRatingsMethod = policy.method;

      globalThis.__PN_MOTHERBOARD_V3_AUDIT = audit;
      globalThis.__PN_MOTHERBOARD_V3 = {
        version: policy.version,
        auditDate: policy.auditDate,
        expectedExistingBoards: policy.expectedExistingBoards,
        sourceBoardCount,
        addedBoards,
        boardCount: rebuilt.length,
        applied: rebuilt.length,
        tierChanges,
        distribution,
        bySocket,
        byChipset,
        unknownChipsets,
        formula: policy.method.formula
      };

      if (
        policy.expectedExistingBoards &&
        sourceBoardCount !== policy.expectedExistingBoards
      ) {
        console.warn(
          "[PROFITNODE] Motherboard V3 source count changed:",
          "expected", policy.expectedExistingBoards,
          "found", sourceBoardCount
        );
      }

      console.info(
        "[PROFITNODE] Motherboard V3 active:",
        rebuilt.length + " boards scored;",
        addedBoards + " verified missing board(s) added;",
        tierChanges + " tier changes."
      );
    } catch (error) {
      console.error(
        "[PROFITNODE] Motherboard V3 failed; previous motherboard catalog preserved.",
        error
      );
    }

    return HardwareCatalog;
  };
})();
