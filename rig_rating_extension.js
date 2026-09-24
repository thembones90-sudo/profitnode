"use strict";
function rigRatingResolved(rig){
  const cur=rig&&rig.currency||"RSD",slots=rig&&rig.slots||emptyRigSlots(),by={};
  RIG_SLOTS.forEach(k=>{by[k]=rigSlotResolved(slots[k],cur,k)});
  return by;
}
function rigRatingModel(rig){
  return pbRatingCore(rigRatingResolved(rig),rig,RIG_SLOTS);
}
function rigRatingSnapshot(rig){
  const m=rigRatingModel(rig),slots=rig&&rig.slots||emptyRigSlots(),cur=rig&&rig.currency||"RSD";
  return{mode:"FINAL",engine:m.engine,generatedAt:nowISO(),finalScore:m.finalScore,quality:m.quality,verdict:m.verdict,categories:m.categories,confidences:m.confidences,confidenceDetails:m.confidenceDetails,coverage:m.coverage,purpose:m.purpose,investment:m.investment,estimatedMarketValue:m.estimatedMarketValue,components:RIG_SLOTS.map(k=>{const r=rigSlotResolved(slots[k],cur,k);return{slotKey:k,label:r&&r.label||null,kind:slots[k]&&slots[k].kind||null,perf:pbPerfOf(r),tier:r&&r.pn&&r.pn.tier||null}})};
}
function rigRatingModelDisplayed(rig){
  const locked="ASSEMBLED"===rig.status||"SOLD"===rig.status,snap=locked&&rig.rigRating&&rig.rigRating.mode==="FINAL"?rig.rigRating:null;
  const m=snap?Object.assign({},snap,{engine:snap.engine||"build-rating-v1",purpose:snap.purpose||pbPurposeOf(rig),confidences:snap.confidences||pbConfFromCategories(snap.categories),confidenceDetails:snap.confidenceDetails||{},coverage:snap.coverage||pbRatingCoreCoverage(rigRatingResolved(rig),snap.categories,snap.confidences||pbConfFromCategories(snap.categories))}):rigRatingModel(rig);
  return{locked:locked,snap:!!snap,m:m};
}
function rigRatingChipHtml(score){
  if(score===null||score===undefined||!Number.isFinite(Number(score)))return'<span class="chip pn-pb-score-chip '+(typeof pnTierClass==="function"?pnTierClass("UNRATED"):"")+'" data-rig-rating-score="n/a" data-rig-rating-quality="UNRATED">UNRATED</span>';
  const t=pbScoreToTier(score);
  return'<span class="chip pn-pb-score-chip '+(typeof pnTierClass==="function"?pnTierClass(t.key):"")+'" data-rig-rating-score="'+score+'" data-rig-rating-quality="'+t.key+'">'+t.key+" · "+score+"</span>";
}
function rigRatingPanelHtml(rig){
  const d=rigRatingModelDisplayed(rig),label=d.locked?(d.snap?"FINAL":"FINAL · LIVE"):"PROJECTED";
  const overallRated=d.m.finalScore!==null&&d.m.finalScore!==undefined&&Number.isFinite(Number(d.m.finalScore)),overallTier=overallRated?pbScoreToTier(d.m.finalScore):null,overallClass=typeof pnTierClass==="function"?pnTierClass(overallTier?overallTier.key:"UNRATED"):"";
  const rows=PB_BUILD_CATEGORIES.map(k=>pbRatingRowHtml(k,' data-rig-rating-cat="'+k+'"',PB_CAT_LABELS[k],d.m.categories[k],d.m.confidences&&d.m.confidences[k],d.m.confidenceDetails&&d.m.confidenceDetails[k])).join(""),coverage=d.m.coverage?'<span class="pn-pb-rating-coverage">'+d.m.coverage.corePresent+'/'+d.m.coverage.coreTotal+' CORE · '+d.m.coverage.ratedCategories+'/'+d.m.coverage.totalCategories+' CATEGORIES</span>':"";
  return'<div class="panel pn-pb-rating" data-pb-rating-engine="'+(d.m.engine||"build-rating-v1")+'" style="margin-top:8px"><div class="panel-head"><h2>BUILD RATING</h2><span class="chip chip-muted">'+label+'</span>'+coverage+'</div><div class="panel-body"><div class="pn-pb-rating-overall '+overallClass+'" data-rig-rating-tier="'+(overallTier?overallTier.key:"UNRATED")+'"><div class="pn-pb-rating-score">'+rigRatingChipHtml(d.m.finalScore)+'</div><p class="pn-pb-rating-verdict">'+escHtml(d.m.verdict)+'</p></div><div class="pn-pb-rating-cats">'+rows+"</div></div></div>";
}
function rigRatingCells(rig){
  const d=rigRatingModelDisplayed(rig),rated=d.m.finalScore!==null&&d.m.finalScore!==undefined&&Number.isFinite(Number(d.m.finalScore)),score=rated?d.m.finalScore:"—";
  return'<td class="num"><b data-rig-rating-score="'+(rated?d.m.finalScore:"n/a")+'">'+score+'</b></td><td><span class="chip '+(typeof pnTierClass==="function"?pnTierClass(d.m.quality):"")+'" data-rig-rating-quality="'+d.m.quality+'">'+d.m.quality+"</span></td>";
}
function rigPurposeFieldHtml(rig,locked){
  const pur=PROJECT_PURPOSES.includes(rig&&rig.purpose)?rig.purpose:"FLIP";
  if(locked)return'<label class="field"><span>Build Purpose</span><div class="hint" style="margin:4px 0 0"><span class="chip chip-muted">'+PROJECT_PURPOSE_LABEL[pur]+"</span></div></label>";
  return'<label class="field"><span>Build Purpose</span><select data-rig-field="purpose">'+PROJECT_PURPOSES.map(p=>'<option value="'+p+'"'+(p===pur?" selected":"")+">"+PROJECT_PURPOSE_LABEL[p]+"</option>").join("")+"</select></label>";
}