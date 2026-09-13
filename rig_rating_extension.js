"use strict";
function rigRatingResolved(rig){
  const cur=rig&&rig.currency||"RSD",slots=rig&&rig.slots||emptyRigSlots(),by={};
  RIG_SLOTS.forEach(k=>{by[k]=rigSlotResolved(slots[k],cur,k)});
  return by;
}
function rigValueScore(rig){
  const inv=typeof rigDerived==="function"?rigDerived(rig).totalCost:0,val=Number(rig&&rig.estimatedMarketValue)||0;
  if(!inv||inv<=0)return 40;
  const r=val/inv;
  if(r>=1.5)return 100;
  if(r>=1.4)return 95;
  if(r>=1.3)return 88;
  if(r>=1.2)return 80;
  if(r>=1.1)return 70;
  if(r>=1)return 62;
  if(r>=0.9)return 50;
  if(r>=0.8)return 38;
  return 20;
}
function rigRatingModel(rig){
  const purpose=pbPurposeOf(rig),by=rigRatingResolved(rig),categories={};
  PB_BUILD_CATEGORIES.forEach(k=>categories[k]={
    PERFORMANCE:pbPerformanceScore(by,purpose),
    BALANCE:pbBalanceScore(by,purpose),
    COMPONENT_QUALITY:pbComponentQualityScore(by),
    RELIABILITY:pbReliabilityScore(by,rig),
    VALUE:rigValueScore(rig),
    UPGRADE_PATH:pbUpgradePathScore(by,rig)
  }[k]);
  const w=PB_PURPOSE_WEIGHTS[purpose];
  let total=0;
  PB_BUILD_CATEGORIES.forEach(k=>total+=categories[k]*w[k]);
  const finalScore=clamp(Math.round(total/100),0,100),quality=pbScoreToTier(finalScore).key;
  return{purpose:purpose,finalScore:finalScore,quality:quality,categories:categories,verdict:pbBuildVerdict({quality:quality,categories:categories},purpose)};
}
function rigRatingSnapshot(rig){
  const m=rigRatingModel(rig),slots=rig&&rig.slots||emptyRigSlots(),cur=rig&&rig.currency||"RSD";
  return{mode:"FINAL",generatedAt:nowISO(),finalScore:m.finalScore,quality:m.quality,verdict:m.verdict,categories:m.categories,purpose:m.purpose,components:RIG_SLOTS.map(k=>{const r=rigSlotResolved(slots[k],cur,k);return{slotKey:k,label:r&&r.label||null,kind:slots[k]&&slots[k].kind||null,perf:pbPerfOf(r),tier:r&&r.pn&&r.pn.tier||null}})};
}
function rigRatingModelDisplayed(rig){
  const locked="ASSEMBLED"===rig.status||"SOLD"===rig.status,snap=locked&&rig.rigRating&&Number.isFinite(rig.rigRating.finalScore)?rig.rigRating:null;
  const m=snap?{finalScore:snap.finalScore,quality:snap.quality,categories:snap.categories,verdict:snap.verdict,purpose:snap.purpose||pbPurposeOf(rig)}:rigRatingModel(rig);
  return{locked:locked,snap:!!snap,m:m};
}
function rigRatingChipHtml(score){
  const t=pbScoreToTier(score);
  return'<span class="chip '+(typeof pnTierClass==="function"?pnTierClass(t.key):"")+'" data-rig-rating-score="'+score+'" data-rig-rating-quality="'+t.key+'">'+t.key+" · "+score+"</span>";
}
function rigRatingPanelHtml(rig){
  const d=rigRatingModelDisplayed(rig),label=d.locked?(d.snap?"FINAL":"FINAL · LIVE"):"PROJECTED";
  const rows=PB_BUILD_CATEGORIES.map(k=>'<div class="pn-pb-rating-row" data-rig-rating-cat="'+k+'"><span>'+PB_CAT_LABELS[k]+'</span><span class="pn-pb-rating-bar"><i style="width:'+d.m.categories[k]+'%"></i></span><b>'+d.m.categories[k]+"</b></div>").join("");
  return'<div class="panel pn-pb-rating" style="margin-top:8px"><div class="panel-head"><h2>BUILD RATING</h2><span class="chip chip-muted">'+label+'</span></div><div class="panel-body"><div class="pn-pb-rating-overall"><div class="pn-pb-rating-score">'+rigRatingChipHtml(d.m.finalScore)+'</div><p class="pn-pb-rating-verdict">'+escHtml(d.m.verdict)+'</p></div><div class="pn-pb-rating-cats">'+rows+"</div></div></div>";
}
function rigRatingCells(rig){
  const d=rigRatingModelDisplayed(rig);
  return'<td class="num"><b data-rig-rating-score="'+d.m.finalScore+'">'+d.m.finalScore+'</b></td><td><span class="chip '+(typeof pnTierClass==="function"?pnTierClass(d.m.quality):"")+'" data-rig-rating-quality="'+d.m.quality+'">'+d.m.quality+"</span></td>";
}
function rigPurposeFieldHtml(rig,locked){
  const pur=PROJECT_PURPOSES.includes(rig&&rig.purpose)?rig.purpose:"FLIP";
  if(locked)return'<label class="field"><span>Build Purpose</span><div class="hint" style="margin:4px 0 0"><span class="chip chip-muted">'+PROJECT_PURPOSE_LABEL[pur]+"</span></div></label>";
  return'<label class="field"><span>Build Purpose</span><select data-rig-field="purpose">'+PROJECT_PURPOSES.map(p=>'<option value="'+p+'"'+(p===pur?" selected":"")+">"+PROJECT_PURPOSE_LABEL[p]+"</option>").join("")+"</select></label>";
}