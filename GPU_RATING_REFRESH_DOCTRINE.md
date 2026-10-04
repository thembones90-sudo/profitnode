# PROFITNODE GPU Rating Refresh Doctrine

Audit date: 2026-10-04

## Authority order
1. Tom's Hardware current native-resolution GPU hierarchy: primary gaming evidence.
2. TechPowerUp-style canonical identity/spec data: model/variant authority.
3. Tom's legacy measured hierarchy: historical gaming evidence.
4. PassMark G3D: broad historical fallback and sanity check.
5. Technical City: secondary validation and obscure-model cross-check.

## Hard rules
- Native raster performance drives the main GPU score and Gear Tier.
- Ray tracing is stored separately and never silently folded into raster.
- DLSS/FSR/XeSS/frame generation/MFG never count as raw hardware performance.
- Purchase price, resale value, deal quality, profit margin and efficiency never alter performance score.
- VRAM is structured capability metadata, not a free performance bonus.
- Material variants stay separate: VRAM cuts, bus cuts, OEM cuts, 2048SP, memory-type changes, Ti/SUPER/XT/XTX, restricted regional models.
- Desktop, mobile, workstation and datacenter identities never auto-collapse into one record.
- If evidence is weak, lower confidence or UNRATED is preferred over fabricated precision.

## Confidence
HIGH = current directly comparable benchmark evidence.
MEDIUM-HIGH = measured older hierarchy calibrated against overlapping current cards.
MEDIUM = multiple historical/synthetic sources agree.
LOW-MEDIUM = sparse legacy evidence with plausible cross-checks.
LOW = theoretical/dual-GPU/driver-sensitive legacy evidence.

## Refresh cadence
- Current-generation hierarchy: audit when Tom's publishes a materially revised hierarchy or new retail GPU generation.
- PassMark G3D: snapshot only when adding/auditing legacy models; daily drift is not a reason to rewrite PN scores.
- Historical calibrated scores: frozen unless stronger measured evidence appears.
- Aliases/spec identity: update whenever a newly encountered physical card proves a materially distinct variant.

## Change discipline
Any score/formula change must show before/after anchors across NVIDIA, AMD and Intel and must pass GPU registry + hardware + smoke tests. Never mass-stage unrelated files.
