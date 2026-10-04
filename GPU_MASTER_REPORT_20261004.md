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
