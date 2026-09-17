"use strict";

/* PROFITNODE COOLER CANONICAL INVENTORY FIX V1
   Fixes two integration seams:
   1) catalogSearchAll exposes cooler results to Inventory as COOLING, not the rig-only COOLER slot key.
   2) canonical COOLING entries use their real pn_score/qualityScore and cooler thresholds instead of
      the generic tier-band midpoint used for heuristic-only inventory items.
*/

(function(){
  const COOLER_THRESHOLDS = [
    {tier:"POOR",max:27},
    {tier:"COMMON",max:41},
    {tier:"UNCOMMON",max:56},
    {tier:"RARE",max:74},
    {tier:"EPIC",max:87},
    {tier:"LEGENDARY",max:96},
    {tier:"ARTIFACT",max:100}
  ];

  function coolerTierNumber(score){
    const n=Number(score);
    if(!Number.isFinite(n)) return null;
    for(let i=0;i<COOLER_THRESHOLDS.length;i++){
      if(n<=COOLER_THRESHOLDS[i].max) return i+1;
    }
    return 7;
  }

  const previousCatalogSearchAll = catalogSearchAll;
  catalogSearchAll = function(query){
    const out = previousCatalogSearchAll(query) || [];
    return out.map(hit => {
      if(hit && hit.cat === "COOLER") return Object.assign({}, hit, {cat:"COOLING"});
      return hit;
    });
  };

  const previousPnPartNameTier = pnPartNameTier;
  pnPartNameTier = function(item){
    const category = pnPartTierCategory(item && item.category);
    if(category !== "COOLING") return previousPnPartNameTier(item);

    const resolution = pnPartCatalogResolution(item || {});
    const catalog = resolution && resolution.item;
    if(!catalog) return previousPnPartNameTier(item);

    const rawScore =
      catalog.pn_score !== null && catalog.pn_score !== undefined ? Number(catalog.pn_score) :
      catalog.qualityScore !== null && catalog.qualityScore !== undefined ? Number(catalog.qualityScore) :
      catalog.overall !== null && catalog.overall !== undefined ? Number(catalog.overall) : NaN;

    if(!Number.isFinite(rawScore)) return previousPnPartNameTier(item);

    const rating = Math.max(1,Math.min(100,Math.round(rawScore)));
    const tier = coolerTierNumber(rating);
    const meta = PN_PART_NAME_TIERS[tier];

    return Object.assign({
      tier,
      rating,
      source:"catalog",
      category:"COOLING",
      matchConfidence:resolution.confidence,
      reason:"Canonical cooling evidence · "+resolution.reason
    },meta);
  };

  globalThis.PN_COOLER_CANONICAL_INVENTORY_FIX_V1 = true;
  console.log("[PROFITNODE] COOLER CANONICAL INVENTORY FIX V1 ACTIVE");
})();
