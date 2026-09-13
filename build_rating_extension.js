"use strict";
const PB_BUILD_SCORE_TIERS=[
  {key:"POOR",min:0,label:"POOR"},
  {key:"COMMON",min:25,label:"COMMON"},
  {key:"UNCOMMON",min:40,label:"UNCOMMON"},
  {key:"RARE",min:55,label:"RARE"},
  {key:"EPIC",min:70,label:"EPIC"},
  {key:"LEGENDARY",min:83,label:"LEGENDARY"},
  {key:"ARTIFACT",min:93,label:"ARTIFACT"}
];
const PB_BUILD_CATEGORIES=["PERFORMANCE","BALANCE","COMPONENT_QUALITY","RELIABILITY","VALUE","UPGRADE_PATH"];
const PB_CAT_LABELS={PERFORMANCE:"PERFORMANCE",BALANCE:"BALANCE",COMPONENT_QUALITY:"COMPONENT QUALITY",RELIABILITY:"RELIABILITY",VALUE:"VALUE",UPGRADE_PATH:"UPGRADE PATH"};
const PB_UNIVERSAL_WEIGHTS={PERFORMANCE:30,BALANCE:20,COMPONENT_QUALITY:15,RELIABILITY:15,VALUE:15,UPGRADE_PATH:5};
const PB_BUILD_PURPOSES=["FLIP","PERSONAL","FAMILY_GIFT","CLIENT","TEST_BENCH"];
const PB_ENGINE_VERSION="build-rating-v2";
const PB_PERF_SLOT_WEIGHTS={CPU:.35,GPU:.35,RAM:.15,STORAGE:.10,MOBO:.05};
const PB_CQ_SLOT_WEIGHTS={CPU:.11,GPU:.11,RAM:.10,MOBO:.16,STORAGE:.14,PSU:.20,CASE:.05,COOLER:.08};
const PB_EXTRA_DRIVE_WEIGHT=.02;
const PB_CONF_ORDER={UNRATED:0,UNVERIFIED:1,ESTIMATED:2,VERIFIED:3};
const PB_CONF_LABEL={VERIFIED:"VERIFIED",ESTIMATED:"ESTIMATED",UNVERIFIED:"UNVERIFIED — no data",UNRATED:"UNRATED — excluded"};
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
function pbRatingHardwareInvestment(source,keys){
  const cur=(source&&source.currency)||"RSD";
  let total=0;
  (keys||[]).forEach(k=>{
    const slot=source&&source.slots&&source.slots[k];
    if(!slot)return;
    const r=typeof rigSlotResolved==="function"?rigSlotResolved(slot,cur,k):null;
    if(r&&!r.missing)total+=(Number(r.cost)||0);
  });
  (Array.isArray(source&&source.extras)?source.extras:[]).forEach(e=>{total+=convert(Number(e.cost)||0,e.currency||cur,cur)});
  return Math.round(total);
}
function pbPerformanceScore(by){
  const w=PB_PERF_SLOT_WEIGHTS;
  const cpu=pbPerfOf(by.CPU);
  let gpuPerf=pbPerfOf(by.GPU);
  if(gpuPerf===null&&!by.GPU&&cpu!==null&&by.CPU&&by.CPU.label){
    const ig=typeof cpuLikelyHasIGPU==="function"?cpuLikelyHasIGPU(String(by.CPU.label).toUpperCase()):null;
    if(ig===false)gpuPerf=0;
    else gpuPerf=Math.round(cpu*.8);
  }
  const ramP=pbPerfOf(by.RAM),storP=pbPerfOf(by.STORAGE),moboP=pbPerfOf(by.MOBO);
  const fits=[["CPU",cpu,w.CPU],["GPU",gpuPerf,w.GPU],["RAM",ramP,w.RAM],["STORAGE",storP,w.STORAGE],["MOBO",moboP,w.MOBO]];
  let num=0,den=0;
  fits.forEach(f=>{if(f[1]!==null&&f[1]!==undefined){num+=f[1]*f[2];den+=f[2]}});
  return den?Math.round(num/den):null;
}
function pbBalanceScore(by){
  const ct=pbTierIndexOf(by.CPU),gt=pbTierIndexOf(by.GPU),mt=pbTierIndexOf(by.MOBO);
  let s=100;
  if(ct!==null&&gt!==null){
    const d=ct-gt;
    if(d>=2)s-=Math.min(8*d,30);
    else if(d<=-2)s-=Math.min(15*(-d),35);
  }
  if(ct!==null&&mt!==null&&mt<ct-1)s-=Math.min(6*(ct-mt-1),12);
  if(ct!==null&&!by.GPU&&by.CPU&&by.CPU.label&&typeof cpuLikelyHasIGPU==="function"&&cpuLikelyHasIGPU(String(by.CPU.label).toUpperCase())===false)s-=10;
  const ram=by.RAM&&by.RAM.pn&&by.RAM.pn.ram;
  if(ct!==null&&gt!==null&&ram){
    if(Number(ram.totalCapacity)>0&&Number(ram.totalCapacity)<16)s-=4;
    if(Number(ram.moduleCount)===1)s-=5;
  }
  return clamp(Math.round(s),0,100);
}
function pbCqOf(resolved){
  const p=pbPerfOf(resolved);
  if(p!==null)return p;
  const t=pbTierIndexOf(resolved);
  if(t!==null)return Math.round(t*100/6);
  return null;
}
function pbComponentQualityScore(by){
  let num=0,den=0;
  RIG_SLOTS.forEach(k=>{
    const slotW="STORAGE"===k?PB_CQ_SLOT_WEIGHTS.STORAGE:typeof isStorageSlot==="function"&&isStorageSlot(k)?PB_EXTRA_DRIVE_WEIGHT:(PB_CQ_SLOT_WEIGHTS[k]||0);
    const r=by[k];
    if(!slotW||!r||r.missing||!r.label)return;
    const q=pbCqOf(r);
    if(q!==null){num+=q*slotW;den+=slotW}
  });
  return den?Math.round(num/den):null;
}
function pbReliabilityScore(by,source){
  let s=100;
  RIG_SLOTS.forEach(k=>{
    const r=by[k];
    if(!r)return;
    const c=r.condition||(r.item&&r.item.condition);
    if(c==="FAULTY")s-=20;
    else if(c==="DEAD")s-=30;
    else if(c==="REPAIRED")s-=8;
  });
  const stor=by.STORAGE;
  if(stor&&stor.label&&/HDD/.test(stor.label)&&!/SSD|NVME/.test(stor.label))s-=6;
  const ram=by.RAM&&by.RAM.pn&&by.RAM.pn.ram;
  if(ram){
    if(Number(ram.totalCapacity)>0&&Number(ram.totalCapacity)<16)s-=4;
    if(Number(ram.moduleCount)===1)s-=5;
  }
  if(typeof psuMatchProfile==="function"){
    const slots=source&&source.slots||emptyRigSlots(),cur=(source&&source.currency)||"RSD",p=psuMatchProfile({slots:slots,currency:cur});
    if(p&&p.selected){
      const q=Number(p.qualityScore);
      if(isFinite(q)&&q<60)s-=8;
      if(p.wattageStatus==="BELOW MINIMUM")s-=10;
      else if(p.wattageStatus==="MINIMUM RANGE")s-=4;
      if(p.safety==="REJECT")s-=12;
      else if(p.safety==="CAUTION")s-=6;
      if(p.connectorStatus&&p.connectorStatus.status==="MISMATCH")s-=6;
    }
  }
  if(typeof buildCheckModel==="function"){
    const slots=source&&source.slots||emptyRigSlots(),cur=(source&&source.currency)||"RSD";
    const check=buildCheckModel({id:source&&source.id,currency:cur,slots:slots});
    const nFail=(check&&check.findings||[]).filter(f=>f.status==="FAIL").length;
    s-=Math.min(nFail,3)*10;
  }
  return clamp(Math.round(s),0,100);
}
function pbValueRating(perf,inv,marketValue,cur){
  const val=Number(marketValue)||0;
  if(!(inv>0))return null;
  let eff=null;
  if(val>0)eff=Math.round(100/(1+Math.exp(-3.2*((val/inv)-1))));
  let p2c=null;
  if(perf!==null) {const ref=convert(150+10*perf,"EUR",cur||"RSD");p2c=Math.round(100*ref/(ref+inv))}
  if(eff===null&&p2c===null)return null;
  if(eff===null)return p2c;
  if(p2c===null)return eff;
  return Math.round(.5*eff+.5*p2c);
}
function pbPlatformScore(cpuResolved,moboResolved){
  let sock=null;
  if(typeof detectCpuSocket==="function"&&cpuResolved&&cpuResolved.label)sock=detectCpuSocket(String(cpuResolved.label).toUpperCase());
  if(!sock&&typeof detectMoboSocket==="function"&&moboResolved&&moboResolved.label)sock=detectMoboSocket(String(moboResolved.label).toUpperCase());
  return sock&&PB_SOCKET_PATH_SCORE[sock]!==undefined?PB_SOCKET_PATH_SCORE[sock]:30;
}
function pbUpgradePathScore(by,source){
  const platform=pbPlatformScore(by.CPU,by.MOBO);
  const mt=pbTierIndexOf(by.MOBO);
  const mobo=mt!==null?clamp(Math.round(mt*16),0,100):40;
  let psu=40;
  if(typeof psuMatchProfile==="function"){
    const slots=source&&source.slots||emptyRigSlots(),cur=(source&&source.currency)||"RSD",p=psuMatchProfile({slots:slots,currency:cur});
    if(p&&p.selected){if(p.headroom==="GOOD"||p.headroom==="HIGH")psu=90;else if(p.headroom==="LOW")psu=50;else psu=40}
  }
  let ram=30;
  const r=by.RAM&&by.RAM.pn&&by.RAM.pn.ram,cap=Number(r&&r.totalCapacity)||0;
  if(cap>=32)ram=100;else if(cap>=16)ram=80;else if(cap>=8)ram=55;
  return clamp(Math.round(platform*.5+mobo*.25+psu*.15+ram*.1),0,100);
}
function pbFactorConfidence(r){
  if(!r||r.missing)return null;
  if(r.pn&&r.pn.data)return"VERIFIED";
  if(r.pn)return"ESTIMATED";
  if(r.planned||r.item)return"UNVERIFIED";
  return null;
}
function pbWeakest(confs){
  const list=(confs||[]).filter(Boolean);
  if(!list.length)return null;
  let out=list[0];
  list.forEach(c=>{if(PB_CONF_ORDER[c]<PB_CONF_ORDER[out])out=c});
  return out;
}
function pbRatingConfidences(categories,by,perf,val){
  const out={};
  out.PERFORMANCE=categories.PERFORMANCE===null?"UNRATED":(pbWeakest([by.CPU,by.GPU,by.RAM,by.STORAGE,by.MOBO].filter(r=>pbPerfOf(r)!==null).map(r=>pbFactorConfidence(r)))||"UNVERIFIED");
  const tC=pbTierIndexOf(by.CPU),tG=pbTierIndexOf(by.GPU),tM=pbTierIndexOf(by.MOBO);
  out.BALANCE=tC!==null&&tG!==null&&tM!==null?"VERIFIED":(tC!==null||tG!==null||tM!==null?"ESTIMATED":"UNVERIFIED");
  out.COMPONENT_QUALITY=categories.COMPONENT_QUALITY===null?"UNRATED":(pbWeakest(RIG_SLOTS.map(k=>pbFactorConfidence(by[k])))||"UNVERIFIED");
  out.RELIABILITY=RIG_SLOTS.some(k=>{const r=by[k];return r&&(r.item!==undefined||r.pn)})?"VERIFIED":"UNVERIFIED";
  out.VALUE=categories.VALUE===null?"UNRATED":(perf!==null&&val>0?"VERIFIED":(perf!==null||val>0?"ESTIMATED":"UNVERIFIED"));
  out.UPGRADE_PATH=(tC!==null||tM!==null)?"VERIFIED":((by.PSU&&(by.PSU.catalog||by.PSU.pn))||(by.RAM&&by.RAM.pn)?"ESTIMATED":"UNVERIFIED");
  return out;
}
function pbBuildVerdict(model){
  const c=model.categories,words=PB_VERDICT_WORDS[model.quality]||"Scored build",bits=[];
  const slice=(v,hi,lo)=>v===null||v===undefined?null:(v>=hi?1:(v<lo?-1:0));
  if(slice(c.BALANCE,70,55)===1)bits.push("components are well balanced");
  else if(slice(c.BALANCE,70,55)===-1)bits.push("CPU/GPU pairing looks imbalanced");
  if(slice(c.COMPONENT_QUALITY,75,50)===1)bits.push("the parts list is made of solid, verified components");
  else if(slice(c.COMPONENT_QUALITY,75,50)===-1)bits.push("several parts are low-grade or cannot be rated");
  if(slice(c.RELIABILITY,80,60)===1)bits.push("power delivery looks dependable");
  else if(slice(c.RELIABILITY,80,60)===-1)bits.push("reliability needs attention before handover");
  if(slice(c.UPGRADE_PATH,70,45)===1)bits.push("the platform still has headroom to grow");
  else if(slice(c.UPGRADE_PATH,70,45)===-1)bits.push("this build is near the end of its upgrade path");
  if(slice(c.VALUE,50,50)===-1)bits.push("the current value target is thin for resale");
  const intro=(slice(c.BALANCE,50,50)===-1||slice(c.RELIABILITY,60,60)===-1)?"concerns first":"no blockers";
  return words+" — "+intro+(bits.length?" · "+bits.slice(0,3).join("; "):"");
}
function pbRatingCore(by,source,keys){
  const cur=(source&&source.currency)||"RSD";
  const perf=pbPerformanceScore(by);
  const inv=pbRatingHardwareInvestment(source,keys);
  const val=Number(source&&source.estimatedMarketValue)||0;
  const categories={
    PERFORMANCE:perf,
    BALANCE:pbBalanceScore(by),
    COMPONENT_QUALITY:pbComponentQualityScore(by),
    RELIABILITY:pbReliabilityScore(by,source),
    VALUE:pbValueRating(perf,inv,val,cur),
    UPGRADE_PATH:pbUpgradePathScore(by,source)
  };
  const confidences=pbRatingConfidences(categories,by,perf,val);
  let num=0,den=0;
  PB_BUILD_CATEGORIES.forEach(k=>{
    const s=categories[k];
    if(s!==null&&Number.isFinite(s)){num+=s*PB_UNIVERSAL_WEIGHTS[k];den+=PB_UNIVERSAL_WEIGHTS[k]}
  });
  const finalScore=den?clamp(Math.round(num/den),0,100):0;
  const quality=pbScoreToTier(finalScore).key;
  return{purpose:pbPurposeOf(source),engine:PB_ENGINE_VERSION,finalScore:finalScore,quality:quality,categories:categories,confidences:confidences,investment:inv,estimatedMarketValue:val,verdict:pbBuildVerdict({quality:quality,categories:categories})};
}
function pbConfFromCategories(categories){
  const out={};
  PB_BUILD_CATEGORIES.forEach(k=>out[k]=(categories&&categories[k])==null?"UNRATED":"VERIFIED");
  return out;
}
function buildRatingModel(project){
  return pbRatingCore(pbBuildResolved(project),project,PROJECT_BUILD_SLOTS);
}
function buildRatingSnapshot(project){
  const m=buildRatingModel(project),slots=project&&project.slots||emptyRigSlots(),cur=project&&project.currency||"RSD";
  return{mode:"FINAL",engine:m.engine,generatedAt:nowISO(),finalScore:m.finalScore,quality:m.quality,verdict:m.verdict,categories:m.categories,confidences:m.confidences,purpose:m.purpose,investment:m.investment,estimatedMarketValue:m.estimatedMarketValue,components:PROJECT_BUILD_SLOTS.map(k=>{const r=rigSlotResolved(slots[k],cur,k);return{slotKey:k,label:r&&r.label||null,kind:slots[k]&&slots[k].kind||null,perf:pbPerfOf(r),tier:r&&r.pn&&r.pn.tier||null}})};
}
function buildRatingModelDisplayed(project){
  const locked="COMPLETED"===project.status,snap=locked&&project.buildRating&&Number.isFinite(project.buildRating.finalScore)?project.buildRating:null;
  const m=snap?Object.assign({},snap,{engine:snap.engine||"build-rating-v1",purpose:snap.purpose||pbPurposeOf(project),confidences:snap.confidences||pbConfFromCategories(snap.categories)}):buildRatingModel(project);
  return{locked:locked,snap:!!snap,m:m};
}
function pbRatingChipHtml(score){
  const t=pbScoreToTier(score);
  return'<span class="chip pn-pb-score-chip '+(typeof pnTierClass==="function"?pnTierClass(t.key):"")+'" data-pb-build-score="'+score+'" data-pb-build-quality="'+t.key+'">'+t.key+" · "+score+"</span>";
}
function pbRatingRowHtml(k,hooks,label,score,conf){
  const rated=score!==null&&score!==undefined&&Number.isFinite(Number(score));
  const tier=rated?pbScoreToTier(score):null;
  const tierKey=tier?tier.key:"UNRATED";
  const cls=typeof pnTierClass==="function"?pnTierClass(tierKey):"";
  const confKey=PB_CONF_ORDER[conf]!==undefined?conf:"UNVERIFIED";
  const bar=rated?score:0;
  const num=rated?score+"/100 · "+tier.key:"UNRATED";
  return'<div class="pn-pb-rating-item"><div class="pn-pb-rating-row '+cls+'" data-pb-cat-conf="'+confKey+'" data-pb-cat-score="'+k+'" data-pb-cat-value="'+(rated?score:"n/a")+'" data-pb-cat-tier="'+tierKey+'"'+hooks+'><span>'+label+'</span><span class="pn-pb-rating-bar"><i style="width:'+bar+'%"></i></span><b>'+num+'</b></div><div class="pn-pb-rating-conf '+confKey.toLowerCase()+'">'+escHtml(PB_CONF_LABEL[confKey])+"</div></div>";
}
function buildRatingPanelHtml(project){
  const d=buildRatingModelDisplayed(project),label=d.locked?(d.snap?"FINAL":"FINAL · LIVE"):"PROJECTED";
  const overallTier=pbScoreToTier(d.m.finalScore),overallClass=typeof pnTierClass==="function"?pnTierClass(overallTier.key):"";
  const rows=PB_BUILD_CATEGORIES.map(k=>pbRatingRowHtml(k,"",PB_CAT_LABELS[k],d.m.categories[k],d.m.confidences&&d.m.confidences[k])).join("");
  return'<div class="panel pn-pb-rating" data-pb-rating-engine="'+(d.m.engine||"build-rating-v1")+'" style="margin-top:8px"><div class="panel-head"><h2>BUILD RATING</h2><span class="chip chip-muted">'+label+'</span></div><div class="panel-body"><div class="pn-pb-rating-overall '+overallClass+'" data-pb-overall-tier="'+overallTier.key+'"><div class="pn-pb-rating-score">'+pbRatingChipHtml(d.m.finalScore)+'</div><p class="pn-pb-rating-verdict">'+escHtml(d.m.verdict)+'</p></div><div class="pn-pb-rating-cats">'+rows+"</div></div></div>";
}
function pbRatingCells(project){
  const completion=typeof Actions!=="undefined"&&Actions.projectBuildStats?Actions.projectBuildStats(project).completionPct:0;
  const d=buildRatingModelDisplayed(project);
  return'<td class="num" data-pb-completion-pct="'+completion+'">'+completion+'%</td><td class="num"><b data-pb-build-score="'+d.m.finalScore+'">'+d.m.finalScore+'</b></td><td><span class="chip '+(typeof pnTierClass==="function"?pnTierClass(d.m.quality):"")+'" data-pb-build-quality="'+d.m.quality+'">'+d.m.quality+"</span></td>";
}
if(typeof document!=="undefined"&&document.createElement){
  const s=document.createElement("style");
  s.textContent=".pn-pb-rating-overall{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.pn-pb-rating-verdict{font:11px var(--mono);color:var(--text-dim);margin:0;max-width:640px;border-left:2px solid var(--tier-color,var(--border-strong));padding-left:10px}.pn-pb-score-chip{font-size:13px;padding:6px 14px;letter-spacing:.1em;box-shadow:0 0 16px var(--tier-wash)}.pn-pb-rating-cats{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin-top:12px}.pn-pb-rating-item{min-width:0}.pn-pb-rating-row{display:grid;grid-template-columns:150px 1fr 132px;gap:10px;align-items:center;border-left:2px solid var(--tier-color,transparent);padding-left:8px}.pn-pb-rating-row>span,.pn-pb-rating-row>b{font:9px var(--mono);letter-spacing:.08em;color:var(--muted);white-space:nowrap}.pn-pb-rating-row>b{text-align:right;font-weight:700;color:var(--tier-color,var(--text-dim))}.pn-pb-rating-bar{height:9px;border-radius:4px;background:var(--tier-wash,var(--bg-alt));overflow:hidden}.pn-pb-rating-bar i{display:block;height:100%;background:var(--tier-color,var(--performance));border-radius:4px;transition:width .2s ease;box-shadow:0 0 10px var(--tier-wash)}.pn-pb-rating-conf{font:9px var(--mono);letter-spacing:.08em;color:var(--text-dim);opacity:.8;margin:2px 0 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right}.pn-pb-rating-conf.verified{color:var(--green,var(--text-dim))}@media(max-width:820px){.pn-pb-rating-cats{grid-template-columns:1fr}.pn-pb-rating-row{grid-template-columns:110px 1fr 112px}}";
  document.head.appendChild(s);
}