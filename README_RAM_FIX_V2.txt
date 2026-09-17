PROFITNODE RAM FIX V2
=====================

Flat patch package. Copy THESE FILES directly into A:\PROFITNODE and overwrite:
- app_core.js
- profitnode_intelligence_extension.js
- pn_scripts.js
- hardwaretest.js
- index.html

Fixes:
- structured RAM rating uses RAM fields instead of name-only heuristic
- 16GB + 2 modules derives and visibly shows 8GB per module
- RAM speed uses MT/s terminology and ramSpeedMTs canonical field
- legacy ramSpeedMHz remains compatible
- known SKU KF426C16BBK2/16 resolves the Kingston Fury Beast 2x8GB 2666 CL16 kit
- index.html cache token bumped so the new script manifest is fetched

After overwrite, Ctrl+Shift+R once.
