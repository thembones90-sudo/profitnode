"use strict";
const PB_BUILD_SCORE_TIERS=[
  {key:"POOR",min:0,label:"POOR"},
  {key:"COMMON",min:30,label:"COMMON"},
  {key:"UNCOMMON",min:45,label:"UNCOMMON"},
  {key:"RARE",min:60,label:"RARE"},
  {key:"EPIC",min:80,label:"EPIC"},
  {key:"LEGENDARY",min:90,label:"LEGENDARY"},
  {key:"ARTIFACT",min:95,label:"ARTIFACT"}
];
const PB_BUILD_CATEGORIES=["PERFORMANCE","BALANCE","COMPONENT_QUALITY","RELIABILITY","VALUE","UPGRADE_PATH"];
const PB_CAT_LABELS={PERFORMANCE:"PERFORMANCE",BALANCE:"BALANCE",COMPONENT_QUALITY:"COMPONENT QUALITY",RELIABILITY:"RELIABILITY",VALUE:"VALUE",UPGRADE_PATH:"UPGRADE PATH"};
const PB_PURPOSE_WEIGHTS={
  FLIP:{PERFORMANCE:25,BALANCE:25,COMPONENT_QUALITY:20,RELIABILITY:10,VALUE:15,UPGRADE_PATH:5},
  PERSONAL:{PERFORMANCE:30,BALANCE:20,COMPONENT_QUALITY:25,RELIABILITY:15,VALUE:5,UPGRADE_PATH:5},
  FAMILY_GIFT:{PERFORMANCE:20,BALANCE:15,COMPONENT_QUALITY:20,RELIABILITY:30,VALUE:10,UPGRADE_PATH:5},
  CLIENT:{PERFORMANCE:20,BALANCE:20,COMPONENT_QUALITY:20,RELIABILITY:25,VALUE:10,UPGRADE_PATH:5},
  TEST_BENCH:{PERFORMANCE:15,BALANCE:15,COMPONENT_QUALITY:15,RELIABILITY:25,VALUE:5,UPGRADE_PATH:25}
};
const PB_BUILD_PURPOSES=Object.keys(PB_PURPOSE_WEIGHTS);
const PB_PERF_SLOT_WEIGHTS={
  FLIP:{CPU:.30,GPU:.35,RAM:.10,MOBO:.15,STORAGE:.10},
  PERSONAL:{CPU:.32,GPU:.38,RAM:.10,MOBO:.12,STORAGE:.08},
  FAMILY_GIFT:{CPU:.30,GPU:.15,RAM:.25,MOBO:.15,STORAGE:.15},
  CLIENT:{CPU:.35,GPU:.10,RAM:.20,MOBO:.15,STORAGE:.20},
  TEST_BENCH:{CPU:.35,GPU:.25,RAM:.15,MOBO:.15,STORAGE:.10}
};
const PB_CQ_SLOT_WEIGHTS={CPU:.28,GPU:.30,RAM:.12,MOBO:.15,STORAGE:.08,PSU:.04,CASE:.02,COOLER:.01};
const PB_VERDICT_WORDS={
  POOR:"Not worth assembling",
  COMMON:"Functional but underwhelming",
  UNCOMMON:"A reasonable all-rounder",
  RARE:"A solid, collectible build",
  EPIC:"A high-end, desirable build",
  LEGENDARY:"A flagship-grade build",
  ARTIFACT:"A once-in-a-cycle showpiece"
};
const PB_SOCKET_PATH_SCORE={AM5:100,LGA1700:75,AM4:70,LGA1200:55,LGA1151:45};

function pbPurposeOf(project){
  return PB_BUILD_PURPOSES.includes(project&&project.purpose)?project.purpose:"FLIP";
}
function pbScoreToTier(score){
  for(let i=PB_BUILD_SCORE_TIERS.length-1;i>=0;i--)if((Number(score)||0)>=PB_BUILD_SCORE_TIERS[i].min)return PB_BUILD_SCORE_TIERS[i];
  return PB_BUILD_SCORE_TIERS[0];
}
function pbBuildResolved(project){
  const cur=project&&project.currency||"RSD",slots=project&&project.slots||emptyRigSlots(),by={};
  PROJECT_BUILD_SLOTS.forEach(k=>{by[k]=rigSlotResolved(slots[k],cur,k)});
  return by;
}
function pbPerfOf(resolved){
  if(!resolved||!resolved.pn)return null;
  const v=Number(resolved.pn.performance);
  return isFinite(v)?clamp(Math.round(v),0,100):null;
}
function pbTierIndexOf(resolved){
  return resolved&&resolved.pn&&isFinite(resolved.pn.tierIndex)?resolved.pn.tierIndex:null;
}
function pbPerformanceScore(by,purpose){
  const w=PB_PERF_SLOT_WEIGHTS[purpose]||PB_PERF_SLOT_WEIGHTS.FLIP;
  let num=0,den=0;
  ["CPU","GPU","RAM","MOBO","STORAGE"].forEach(k=>{
    const p=pbPerfOf(by[k]);
    if(p!==null){num+=p*w[k];den+=w[k]}
  });
  return den?Math.round(num/den):0;
}
function pbBalanceScore(by,purpose){
  const ct=pbTierIndexOf(by.CPU),gt=pbTierIndexOf(by.GPU),mt=pbTierIndexOf(by.MOBO);
  let s=100;
  if(ct!==null&&gt!==null){
    const d=Math.abs(ct-gt);
    if(d>=2){let p=d*5;if(purpose==="FAMILY_GIFT")p=Math.round(p*0.5);s-=p}
    if(gt>ct&&(purpose==="FLIP"||purpose==="PERSONAL"||purpose==="CLIENT"))s-=(gt-ct)*3;
  }
  if(ct!==null&&mt!==null&&mt<ct)s-=(ct-mt)*3;
  const ramP=pbPerfOf(by.RAM);
  if(ct!==null&&ct>=3&&ramP!==null&&ramP<45)s-=2;
  if((!by.GPU||by.GPU.missing)&&(purpose==="FLIP"||purpose==="PERSONAL"))s-=8;
  return clamp(Math.round(s),0,100);
}
function pbCqOf(resolved){
  const p=pbPerfOf(resolved);
  if(p!==null)return p;
  const t=pbTierIndexOf(resolved);
  if(t!==null)return Math.round(t*100/6);
  return 0;
}
function pbComponentQualityScore(by){
  let num=0,den=0;
  PROJECT_BUILD_SLOTS.forEach(k=>{
    const w=PB_CQ_SLOT_WEIGHTS[k]||0,r=by[k];
    if(w&&r&&!r.missing&&(r.pn||r.label)){num+=pbCqOf(r)*w;den+=w}
  });
  return den?Math.round(num/den):0;
}
function pbReliabilityScore(by,project){
  const slots=project&&project.slots||emptyRigSlots(),cur=project&&project.currency||"RSD";
  let s=100;
  const psu=typeof psuMatchProfile==="function"?psuMatchProfile({slots:slots,currency:cur}):null;
  if(psu&&psu.selected){
    const q=Number(psu.qualityScore);
    if(!isFinite(q)||!q)s-=6;
    else if(q<60)s-=12;
    else if(q<80)s-=5;
    if(psu.wattageStatus==="BELOW MINIMUM")s-=10;
    else if(psu.wattageStatus==="MINIMUM RANGE")s-=5;
    if(psu.safety==="REJECT")s-=15;
    else if(psu.safety==="CAUTION")s-=8;
    if(psu.connectorStatus&&psu.connectorStatus.status==="MISMATCH")s-=8;
  }else if(psu)s-=12;
  if(typeof buildCheckModel==="function"){
    const check=buildCheckModel({id:project&&project.id,currency:cur,slots:slots}),fail=[],warn=[];
    check.findings.forEach(f=>{if(f.status==="FAIL")fail.push(f);else if(f.status==="WARN")warn.push(f)});
    s-=Math.min(fail.length,3)*8;
    s-=Math.min(warn.length,4)*4;
  }
  const stor=by.STORAGE;
  if(stor&&stor.label&&/HDD/.test(stor.label)&&!/SSD|NVME/.test(stor.label))s-=6;
  const ram=slots.RAM&&slots.RAM.ram?slots.RAM.ram:by.RAM&&by.RAM.pn&&by.RAM.pn.ram||null;
  if(ram){
    if(Number(ram.totalCapacity)>0&&Number(ram.totalCapacity)<16)s-=4;
    if(Number(ram.moduleCount)>0&&Number(ram.moduleCount)<2)s-=5;
  }
  PROJECT_BUILD_SLOTS.forEach(k=>{const r=by[k];if(r&&r.condition&&r.condition!=="WORKING")s-=4});
  return clamp(Math.round(s),0,100);
}
function pbValueScore(project){
  const inv=typeof Actions!=="undefined"&&Actions.projectTotalInvestment?Actions.projectTotalInvestment(project):0;
  const val=Number(project&&project.estimatedMarketValue)||0;
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
function pbPlatformScore(cpuResolved,moboResolved){
  let sock=null;
  if(typeof detectCpuSocket==="function"&&cpuResolved&&cpuResolved.label)sock=detectCpuSocket(String(cpuResolved.label).toUpperCase());
  if(!sock&&typeof detectMoboSocket==="function"&&moboResolved&&moboResolved.label)sock=detectMoboSocket(String(moboResolved.label).toUpperCase());
  return sock&&PB_SOCKET_PATH_SCORE[sock]!==undefined?PB_SOCKET_PATH_SCORE[sock]:30;
}
function pbUpgradePathScore(by,project){
  const platform=pbPlatformScore(by.CPU,by.MOBO);
  const mt=pbTierIndexOf(by.MOBO);
  const mobo=mt!==null?clamp(Math.round(mt*16),0,100):40;
  let psu=40;
  if(typeof psuMatchProfile==="function"){
    const slots=project&&project.slots||emptyRigSlots(),cur=project&&project.currency||"RSD",p=psuMatchProfile({slots:slots,currency:cur});
    if(p&&p.selected){if(p.headroom==="GOOD"||p.headroom==="HIGH")psu=90;else if(p.headroom==="LOW")psu=50;else psu=40}
    else psu=20;
  }
  let ram=30;
  const r=project&&project.slots&&project.slots.RAM&&project.slots.RAM.ram||by.RAM&&by.RAM.pn&&by.RAM.pn.ram,cap=Number(r&&r.totalCapacity)||0;
  if(cap>=32)ram=100;else if(cap>=16)ram=80;else if(cap>=8)ram=55;
  return clamp(Math.round(platform*.5+mobo*.25+psu*.15+ram*.1),0,100);
}
function pbBuildVerdict(model,purpose){
  const c=model.categories,words=PB_VERDICT_WORDS[model.quality]||"Scored build",bits=[];
  if(c.BALANCE>=70)bits.push("components are well balanced");
  else if(c.BALANCE<55)bits.push("CPU/GPU pairing looks imbalanced");
  if(c.COMPONENT_QUALITY>=75)bits.push("the parts list is made of solid, verified components");
  else if(c.COMPONENT_QUALITY<50)bits.push("several parts are low-grade or cannot be rated");
  if(c.RELIABILITY>=80)bits.push("power delivery looks dependable");
  else if(c.RELIABILITY<60)bits.push("reliability needs attention before handover");
  if(c.UPGRADE_PATH>=70)bits.push("the platform still has headroom to grow");
  else if(c.UPGRADE_PATH<45)bits.push("this build is near the end of its upgrade path");
  if(purpose==="FAMILY_GIFT"&&c.PERFORMANCE<55)bits.push("daily-duties performance may feel sluggish");
  if(purpose==="FLIP"&&c.VALUE<50)bits.push("the current value target is thin for resale");
  const intro=c.BALANCE<50||c.RELIABILITY<60?"concerns first":"no blockers";
  return words+" — "+intro+(bits.length?" · "+bits.slice(0,3).join("; "):"");
}
function buildRatingModel(project){
  const purpose=pbPurposeOf(project),by=pbBuildResolved(project),categories={};
  PB_BUILD_CATEGORIES.forEach(k=>categories[k]={
    PERFORMANCE:pbPerformanceScore(by,purpose),
    BALANCE:pbBalanceScore(by,purpose),
    COMPONENT_QUALITY:pbComponentQualityScore(by),
    RELIABILITY:pbReliabilityScore(by,project),
    VALUE:pbValueScore(project),
    UPGRADE_PATH:pbUpgradePathScore(by,project)
  }[k]);
  const w=PB_PURPOSE_WEIGHTS[purpose];
  let total=0;
  PB_BUILD_CATEGORIES.forEach(k=>total+=categories[k]*w[k]);
  const finalScore=clamp(Math.round(total/100),0,100),quality=pbScoreToTier(finalScore).key;
  return{purpose:purpose,finalScore:finalScore,quality:quality,categories:categories,verdict:pbBuildVerdict({quality:quality,categories:categories},purpose)};
}
function buildRatingSnapshot(project){
  const m=buildRatingModel(project),slots=project&&project.slots||emptyRigSlots(),cur=project&&project.currency||"RSD";
  return{mode:"FINAL",generatedAt:nowISO(),finalScore:m.finalScore,quality:m.quality,verdict:m.verdict,categories:m.categories,purpose:m.purpose,components:PROJECT_BUILD_SLOTS.map(k=>{const r=rigSlotResolved(slots[k],cur,k);return{slotKey:k,label:r&&r.label||null,kind:slots[k]&&slots[k].kind||null,perf:pbPerfOf(r),tier:r&&r.pn&&r.pn.tier||null}})};
}
function buildRatingModelDisplayed(project){
  const locked="COMPLETED"===project.status,snap=locked&&project.buildRating&&Number.isFinite(project.buildRating.finalScore)?project.buildRating:null;
  const m=snap?{finalScore:snap.finalScore,quality:snap.quality,categories:snap.categories,verdict:snap.verdict,purpose:snap.purpose||pbPurposeOf(project)}:buildRatingModel(project);
  return{locked:locked,snap:!!snap,m:m};
}
function pbRatingChipHtml(score){
  const t=pbScoreToTier(score);
  return'<span class="chip '+(typeof pnTierClass==="function"?pnTierClass(t.key):"")+'" data-pb-build-score="'+score+'" data-pb-build-quality="'+t.key+'">'+t.key+" · "+score+"</span>";
}
function buildRatingPanelHtml(project){
  const d=buildRatingModelDisplayed(project),label=d.locked?(d.snap?"FINAL":"FINAL · LIVE"):"PROJECTED";
  const rows=PB_BUILD_CATEGORIES.map(k=>'<div class="pn-pb-rating-row" data-pb-cat-score="'+k+'"><span>'+PB_CAT_LABELS[k]+'</span><span class="pn-pb-rating-bar"><i style="width:'+d.m.categories[k]+'%"></i></span><b>'+d.m.categories[k]+"</b></div>").join("");
  return'<div class="panel pn-pb-rating" style="margin-top:8px"><div class="panel-head"><h2>BUILD RATING</h2><span class="chip chip-muted">'+label+'</span></div><div class="panel-body"><div class="pn-pb-rating-overall"><div class="pn-pb-rating-score">'+pbRatingChipHtml(d.m.finalScore)+'</div><p class="pn-pb-rating-verdict">'+escHtml(d.m.verdict)+'</p></div><div class="pn-pb-rating-cats">'+rows+"</div></div></div>";
}
function pbRatingCells(project){
  const completion=typeof Actions!=="undefined"&&Actions.projectBuildStats?Actions.projectBuildStats(project).completionPct:0;
  const d=buildRatingModelDisplayed(project);
  return'<td class="num" data-pb-completion-pct="'+completion+'">'+completion+'%</td><td class="num"><b data-pb-build-score="'+d.m.finalScore+'">'+d.m.finalScore+'</b></td><td><span class="chip '+(typeof pnTierClass==="function"?pnTierClass(d.m.quality):"")+'" data-pb-build-quality="'+d.m.quality+'">'+d.m.quality+"</span></td>";
}
if(typeof document!=="undefined"&&document.createElement){
  const s=document.createElement("style");
  s.textContent=".pn-pb-rating-overall{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.pn-pb-rating-verdict{font:11px var(--mono);color:var(--text-dim);margin:0;max-width:640px}.pn-pb-rating-cats{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-top:12px}.pn-pb-rating-row{display:grid;grid-template-columns:150px 1fr 28px;gap:10px;align-items:center}.pn-pb-rating-row>span,.pn-pb-rating-row>b{font:9px var(--mono);letter-spacing:.08em;color:var(--muted)}.pn-pb-rating-row>b{text-align:right;color:var(--text-dim)}.pn-pb-rating-bar{height:6px;border-radius:3px;background:var(--bg-alt);overflow:hidden}.pn-pb-rating-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--performance));border-radius:3px}@media(max-width:820px){.pn-pb-rating-cats{grid-template-columns:1fr}.pn-pb-rating-row{grid-template-columns:110px 1fr 30px}}";
  document.head.appendChild(s);
}