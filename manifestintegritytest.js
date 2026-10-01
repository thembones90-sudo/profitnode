"use strict";
const fs=require("fs"),cp=require("child_process"),path=require("path");
const tracked=cp.execFileSync("git",["ls-files","*.js"],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const manifest=fs.readFileSync("pn_scripts.js","utf8"),index=fs.readFileSync("index.html","utf8");
const config=JSON.parse(fs.readFileSync("runtime_manifest_exclusions.json","utf8"));
const excluded=new Set(Object.keys(config.excluded||{}));
const dev=new Set(["app.js","pn_scripts.js","auditintegritytest.js","browsertest.js","costintegritytest.js","financialrecoverytest.js","storagerecoverytest.js","hardwaretest.js","mail_fixtures.js","mailparsertest.js","mailworkflowtest.js","pn_test_env.js","rendertest.js","smoketest.js","manifestintegritytest.js"]);
const loaded=new Set();
for(const src of [manifest,index]) for(const m of src.matchAll(/["']([^"'?]+\.js)(?:\?[^"']*)?["']/g)) loaded.add(path.basename(m[1]));
const candidates=tracked.filter(f=>!f.includes("/")&&!dev.has(f));
const missing=candidates.filter(f=>!loaded.has(f)&&!excluded.has(f));
const staleExcluded=[...excluded].filter(f=>!tracked.includes(f));
const loadedExcluded=[...excluded].filter(f=>loaded.has(f));
if(missing.length||staleExcluded.length||loadedExcluded.length){
  console.error("MANIFEST INTEGRITY FAILED");
  if(missing.length) console.error("Unclassified runtime JS:",missing.join(", "));
  if(staleExcluded.length) console.error("Stale exclusions:",staleExcluded.join(", "));
  if(loadedExcluded.length) console.error("Excluded files are loaded:",loadedExcluded.join(", "));
  process.exit(1);
}
console.log("PASS - runtime JS manifest is complete or explicitly classified ("+candidates.length+" candidates, "+excluded.size+" exclusions)");
