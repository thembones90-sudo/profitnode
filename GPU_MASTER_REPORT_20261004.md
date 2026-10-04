# PROFITNODE GPU Master Registry V4 Report

Audit date: 2026-10-04

## Result
- Previous audited live GPU universe: 129 discrete desktop GPUs.
- Added in V4 expansion: 64.
- New live master universe: 193.
- Vendor split: NVIDIA 96 / AMD 89 / Intel 8.
- No duplicate canonical model names.

## Tier distribution
POOR 39
COMMON 36
UNCOMMON 40
RARE 42
EPIC 25
LEGENDARY 10
ARTIFACT 1

## Confidence distribution
HIGH 50
MEDIUM-HIGH 47
MEDIUM 66
LOW-MEDIUM 26
LOW 4

## What V4 adds
- NVIDIA Kepler/Maxwell used-market coverage including GT 640/730/740, GTX 600/700/900 and TITAN-era cards.
- AMD Radeon HD 5000/6000/7000 high-end anchors plus R9 200/300/Fury used-market cards.
- Intel Arc A310/A380/A580/A750/A770 and B570/B580.
- Canonical alias map for common vendor-prefixed names.
- Explicit ambiguity protection for VRAM/memory-bus-sensitive families.
- Explicit mobile/workstation exclusion patterns.
- Confidence and benchmark provenance on every expansion entry.

## Rating doctrine
Current Tom's Hardware native raster hierarchy remains primary for comparable modern GPUs. Tom's older measured hierarchy is calibrated against overlapping PN V3 cards. PassMark G3D and Technical City are historical fallback/cross-check evidence, never sole unquestioned truth. TechPowerUp-style identity rules govern model separation. Price/value never affects performance. RT is separate. Upscaling and frame generation are excluded from raw score.

## Direct modern additions
Arc B580 12GB: 36 / RARE / HIGH, derived from 2026 Tom's raster 35.1% 1080p, 30.3% 1440p, 24.9% 4K through the existing PN native composite transform.
Arc B570 10GB: 31 / RARE / HIGH, derived from 31.1% / 26.5% / 17.7% respectively.

## Calibrated Intel Alchemist
Arc A380 6GB: 9 / COMMON
Arc A580 8GB: 25 / RARE
Arc A750 8GB: 28 / RARE
Arc A770 8GB: 30 / RARE
Arc A770 16GB: 31 / RARE
These are based on Tom's measured 2022-2024 hierarchy and calibrated to existing PN V3 overlapping cards; confidence MEDIUM-HIGH.

## Legacy caveat
Pre-Pascal/pre-Polaris scores intentionally carry lower confidence. They are useful for the used-PC/flea-market workflow, but they are not presented as equivalent evidence to a 2026 directly retested GPU. Dual-GPU cards (GTX 690, TITAN Z) are LOW confidence because modern software scaling is exceptionally workload-dependent.

## Validation
- gpu_registry_test.js: 43 passed / 0 failed.
- GPU MASTER V4 direct runtime probe: PASS, 193 GPUs loaded; 129 existing ratings preserved + 64 appended.
- hardwaretest.js: 360 / 360 passed.
- smoketest.js: 461 / 462 passed; the single failure is the pre-existing unrelated FINAL UNRATED snapshot rendering test.

## Files
- profitnode_gpu_master_registry_v4.json
- profitnode_gpu_aliases_v4.json
- gpu_revaluation_extension.js
- gpu_registry_test.js
- GPU_RATING_REFRESH_DOCTRINE.md
- GPU_SOURCE_AUDIT_20261004.md
- GPU_MASTER_REPORT_20261004.md

## Remaining manual-review targets
- Ancient dual-GPU cards.
- Rare OEM/region-specific pre-Pascal variants not yet observed in SHADEZY inventory.
- Any future Arc Battlemage gaming SKU beyond B570/B580.
- New retail GPU generations or materially revised Tom's hierarchy data.

## Hardening audit - 2026-10-05

### Registry integrity
- All 193 scores are numeric and inside 0-100.
- All 193 stored tiers match the GPU-specific thresholds.
- All 129 V3 scores and tiers remain unchanged under V4.
- Canonical identities remain unique after normalized `brand + model` comparison.
- No mobile, Max-Q, workstation, or datacenter identity is present in the master registry.
- Vendor, tier, confidence, V3, and expansion distributions match the published counts above.

### Identity corrections
The score registry required no model or benchmark correction. The alias layer did require hardening: generic RTX 2060, RTX 3060, RTX 3080, RX 570, RX 580, and Arc A770 labels could select a specific VRAM/SP variant. Those aliases were removed, the identities remain searchable by exact variant, and the runtime now enforces both `do_not_auto_alias` and mobile/workstation exclusion policy. Generic ambiguous labels fail closed instead of silently selecting a card.

### PSU mapping gaps
The PSU requirement catalog has exact structured records for 123 of 193 GPU identities. The 70 exact gaps are the full 64-card V4 legacy/Intel expansion plus six earlier variants: RX 460 2GB/4GB, RX 550 2GB/4GB, and RX 560 2GB/4GB. These remain explicitly unverified; no PSU wattage or connector requirement was fabricated. They are safe unknowns, but completing verified PSU mappings is the highest-priority data follow-up.

### Low-confidence review set
Thirty records remain deliberately below MEDIUM confidence: 26 LOW-MEDIUM and 4 LOW. The four LOW records are GTX 690 4GB, GTX TITAN Z 12GB, Radeon HD 5870 1GB, and Radeon HD 6970 2GB. The remaining LOW-MEDIUM set is concentrated in Kepler-era entry cards, OEM variants, early Radeon HD/R9 models, R9 Nano, and Arc A310. No confidence was promoted merely because a score looked plausible.

### Regression protection
- Registry suite expanded from 43 to 60 assertions.
- Runtime suite expanded from one aggregate assertion to 21 named assertions.
- New coverage freezes all V3 ratings, all tier mappings and distributions, alias target integrity, ambiguity protection, mobile/workstation exclusion, RT null semantics, and purchase-price independence.
