# PROFITNODE GPU Source Audit — 2026-10-04

## Authoritative source hierarchy

1. TechPowerUp GPU Database — identity/spec authority.
2. Tom's Hardware GPU Hierarchy 2026 — primary native-resolution gaming authority.
3. PassMark VideoCardBenchmark — broad historical and obscure-model fallback.
4. Technical City desktop GPU rating — secondary cross-check and gap validation.

## Verified source facts

### Tom's Hardware 2026 hierarchy
- 48 GPUs in the current 2026 suite.
- 19 separate tests.
- Native-resolution testing only for the primary hierarchy.
- No DLSS/FSR/XeSS upscaling or frame generation in the base performance tables.
- Separate rasterization and ray-tracing hierarchies.
- Raster tests span 1080p, 1440p, and 4K.
- Current rankings are performance-only and do not factor price, efficiency, or feature value.
- RTX 5090 is the 100% raster anchor.

### PassMark VideoCardBenchmark
- Over 1,000,000 video cards benchmarked.
- Alphabetical list exposes GPU name, G3D Mark, rank, value, and price where available.
- Useful for historical coverage and obscure variants.
- Should be treated as fallback/cross-check, not direct PN score authority.

### Technical City
- Desktop GPU ranking averages benchmark and gaming results.
- Useful for cross-vendor and historical sanity checks.
- Should not be copied directly as PN score authority.

## Current PROFITNODE GPU system

### Runtime catalog
Approximately 208 canonical GPU records in `profitnode_hardware_ratings_v1.json` / live HardwareCatalog.

### Audited overlay
`profitnode_gpu_ratings_v3.json`
- version: PN_GPU_V3_2026
- audit date: 2026-09-12
- audited records: 129

### Existing formula
Primary metric: native raster gaming composite, RTX 5090 = 100.

Native composite:
`0.50*1080p_ultra + 0.35*1440p_ultra + 0.15*4k_ultra`

PN transform:
`round(100 * (native_composite/100)^0.90)`

### Current GPU tiers
- POOR: 0-5
- COMMON: 6-10
- UNCOMMON: 11-24
- RARE: 25-44
- EPIC: 45-69
- LEGENDARY: 70-94
- ARTIFACT: 95-100

### Existing doctrine worth preserving
- Raster performance drives the primary tier.
- Ray tracing remains a separate capability score.
- Frame generation/upscaling must not inflate raw hardware performance.
- VRAM is structured metadata and variant evidence, not free performance points.
- Materially different VRAM/OEM/regional/power-limited variants may receive separate ratings.

## Immediate expansion target

The current audited overlay covers only 129 of roughly 208 runtime GPUs. The next concrete task is to generate an exact missing-model report and rate those models using this source priority:

1. Direct Tom's 2026/native or legacy hierarchy result where available.
2. Tom's legacy calibrated against overlapping current anchors.
3. PassMark G3D relationship calibrated through overlapping rated cards.
4. Technical City cross-check.
5. TechPowerUp identity/spec confirmation.
6. If evidence remains weak, assign lower confidence or UNRATED rather than invent precision.

## Non-negotiable rules

- No subjective hand-curated "feels right" scores.
- No purchase price or resale value in performance rating.
- No frame-generation benchmark inflation.
- No forced RT weighting into raster tier.
- No silent collapse of materially different variants.
- No fabricated benchmark fields.

## Coverage correction discovered during audit

The apparent 208-vs-129 GPU coverage gap was not real. `profitnode_hardware_ratings_v1.json` contains 208 rows under `gpus`, but 79 of those are legacy AM3/AM3+ CPU records (55 AM3 + 24 AM3+) that are stripped at runtime. The effective live GPU catalog is therefore 129 GPUs, and all 129 currently have V3 overlay ratings.

Current exact counts:
- base `gpus` rows: 208
- AM3 CPU contamination: 55
- AM3+ CPU contamination: 24
- effective live GPUs: 129
- V3 rated GPUs: 129
- current live coverage: 129/129 (100%)

The expansion task is therefore not filling missing live rows. It is growing the canonical GPU universe beyond the current 129-card curated set.

## External desktop-universe checkpoint

Technical City's October 2026 desktop ranking currently extends to 490 ranked desktop graphics entries. This includes discrete gaming cards, workstation/OEM oddities, integrated graphics, and very old hardware, so PROFITNODE should not blindly import all 490. It does, however, provide a useful outer universe for model discovery and historical cross-checking.

PassMark remains the broader synthetic fallback source and currently reports more than 1,000,000 submitted video-card benchmark results across its GPU list.
