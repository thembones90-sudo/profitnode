"use strict";
const fs=require('fs'),path=require('path'),env=require('./pn_test_env.js');
(async()=>{
 const DIR=__dirname,s=env.createSandbox(),v3=JSON.parse(fs.readFileSync(path.join(DIR,'profitnode_gpu_ratings_v3.json'),'utf8')),aliases=JSON.parse(fs.readFileSync(path.join(DIR,'profitnode_gpu_aliases_v4.json'),'utf8'));
 s.fetch=(url)=>{const file=String(url).split('?')[0]; const p=path.join(DIR,file); if(!fs.existsSync(p)) return Promise.resolve({ok:false,status:404,json:async()=>({}),text:async()=>''}); const raw=fs.readFileSync(p,'utf8'); return Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(raw),text:async()=>raw});};
 env.loadAll(s,DIR);
 await env.run(s,'loadHardwareCatalog()');
 const out=env.run(s,`(()=>{
   const v3=${JSON.stringify(v3.ratings)},aliases=${JSON.stringify(aliases.aliases)};
   const cheap=rigSlotResolved({kind:'PLANNED',catalogType:'GPU',label:'RTX 3060 12GB',cost:1,originalPrice:2},'RSD','GPU');
   const expensive=rigSlotResolved({kind:'PLANNED',catalogType:'GPU',label:'RTX 3060 12GB',cost:999999,originalPrice:888888},'RSD','GPU');
   const aliasFailures=Object.entries(aliases).filter(([alias,canonical])=>{const hit=catalogFind('GPU',alias);return !hit||hit.model!==canonical});
   const v3Changed=Object.entries(v3).filter(([model,rating])=>{const hit=HardwareCatalog.gpus.find(g=>g.model===model);return !hit||hit.overall!==rating.score||hit.pn_score!==rating.score||hit.pn_tier_name!==rating.tier});
   const tierMismatch=HardwareCatalog.gpus.filter(g=>g.pn_tier_name!==pnTier(gpuGearTier(g)));
   const psuResolution=HardwareCatalog.gpus.map(g=>{const req=gpuPsuRequirement({label:g.brand+' '+g.model,pn:{data:g}});return {model:g.model,requirement:req&&req.model||null}});
   const psuWrong=psuResolution.filter(x=>x.requirement&&x.requirement!==x.model),psuMissing=psuResolution.filter(x=>!x.requirement);
   return {count:HardwareCatalog.gpus.length,version:HardwareCatalog.gpuRatingsVersion,gt640:catalogFind('GPU','NVIDIA GT 640 2GB GDDR5'),b580:catalogFind('GPU','Intel Arc B580'),a770:catalogFind('GPU','Intel Arc A770 16GB'),gtx1070:catalogFind('GPU','GTX 1070 8GB'),rtx3060:catalogFind('GPU','RTX 3060 12GB'),rdna2:catalogFind('GPU','RX 6800 XT 16GB'),ambiguous3060:catalogFind('GPU','NVIDIA GeForce RTX 3060'),ambiguous580:catalogFind('GPU','AMD Radeon RX 580'),ambiguousA770:catalogFind('GPU','Intel Arc A770'),mobile:catalogFind('GPU','NVIDIA GeForce RTX 3060 Laptop GPU'),maxq:catalogFind('GPU','NVIDIA GeForce RTX 3070 Max-Q'),workstation:catalogFind('GPU','NVIDIA Quadro RTX 5000'),aliasFailures,v3Changed,tierMismatch,psuWrong,psuMissing:psuMissing.map(x=>x.model),priceStable:cheap&&expensive&&cheap.pn&&expensive.pn&&['performance','tierIndex','tier'].every(k=>cheap.pn[k]===expensive.pn[k])&&cheap.pn.data.raster===expensive.pn.data.raster&&cheap.pn.data.ray_tracing===expensive.pn.data.ray_tracing&&cheap.pn.data.vram_state===expensive.pn.data.vram_state,meta:globalThis.__PN_GPU_V4};
 })()`);
 console.log(JSON.stringify(out,null,2));
 const checks=[
  ['runtime count is exactly 193',out.count===193],
  ['runtime version is GPU MASTER V4',out.version==='PN_GPU_MASTER_V4_20261004'],
  ['V3 count 129 / expansion 64 / runtime 193',out.meta&&out.meta.v3Count===129&&out.meta.appended===64&&out.meta.gpuCount===193],
  ['GT 640 GDDR5 canonical resolution works',out.gt640&&out.gt640.overall===2],
  ['Arc B580 retains direct score and unknown numeric RT',out.b580&&out.b580.overall===36&&out.b580.ray_tracing===null],
  ['Arc A770 16GB resolves explicitly and keeps RT unknown',out.a770&&out.a770.overall===31&&out.a770.ray_tracing===null],
  ['GTX 1070 retains V3 raster score',out.gtx1070&&out.gtx1070.overall===14&&out.gtx1070.ray_tracing===0],
  ['RTX keeps a populated RT score',out.rtx3060&&Number.isFinite(out.rtx3060.ray_tracing)&&out.rtx3060.ray_tracing>0],
  ['RDNA2 keeps a populated RT score',out.rdna2&&Number.isFinite(out.rdna2.ray_tracing)&&out.rdna2.ray_tracing>0],
  ['every deterministic alias resolves to its canonical model',out.aliasFailures.length===0],
  ['generic RTX 3060 does not auto-pick a VRAM variant',out.ambiguous3060===null],
  ['generic RX 580 does not auto-pick a VRAM/SP variant',out.ambiguous580===null],
  ['generic Arc A770 does not auto-pick a VRAM variant',out.ambiguousA770===null],
  ['mobile GPU cannot resolve as desktop',out.mobile===null],
  ['Max-Q GPU cannot resolve as desktop',out.maxq===null],
  ['workstation GPU cannot resolve as desktop',out.workstation===null],
  ['all 129 V3 runtime scores and tiers remain unchanged',out.v3Changed.length===0],
  ['all 193 runtime tiers match the numeric GPU thresholds',out.tierMismatch.length===0],
  ['PSU lookup never substitutes a different GPU identity',out.psuWrong.length===0],
  ['70 missing PSU mappings remain explicit unknowns',out.psuMissing.length===70],
  ['purchase price changes no GPU capability field',out.priceStable]
 ];
 let pass=0,fail=0; checks.forEach(([name,ok])=>{console.log((ok?'PASS':'FAIL')+' - '+name);ok?pass++:fail++});
 console.log(`\n${pass} passed, ${fail} failed`); if(fail)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
