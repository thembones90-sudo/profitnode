"use strict";
const fs=require('fs'),path=require('path'),env=require('./pn_test_env.js');
(async()=>{
 const DIR=__dirname,s=env.createSandbox();
 s.fetch=(url)=>{const file=String(url).split('?')[0]; const p=path.join(DIR,file); if(!fs.existsSync(p)) return Promise.resolve({ok:false,status:404,json:async()=>({}),text:async()=>''}); const raw=fs.readFileSync(p,'utf8'); return Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(raw),text:async()=>raw});};
 env.loadAll(s,DIR);
 await env.run(s,'loadHardwareCatalog()');
 const out=env.run(s,`(()=>({count:HardwareCatalog.gpus.length,version:HardwareCatalog.gpuRatingsVersion,gt640:catalogFind('GPU','NVIDIA GT 640 2GB GDDR5'),b580:catalogFind('GPU','Intel Arc B580'),a770:catalogFind('GPU','Intel Arc A770 16GB'),gtx1070:catalogFind('GPU','GTX 1070 8GB'),meta:globalThis.__PN_GPU_V4}))()`);
 console.log(JSON.stringify(out,null,2));
 const ok=out.count===193&&out.version==='PN_GPU_MASTER_V4_20261004'&&out.gt640&&out.gt640.overall===2&&out.b580&&out.b580.overall===36&&out.b580.ray_tracing===null&&out.a770&&out.a770.overall===31&&out.gtx1070&&out.gtx1070.overall===14&&out.meta&&out.meta.appended===64;
 console.log(ok?'PASS - GPU MASTER V4 runtime merge':'FAIL - GPU MASTER V4 runtime merge'); if(!ok)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
