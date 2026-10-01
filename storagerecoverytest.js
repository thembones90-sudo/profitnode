"use strict";

const fs=require("fs"),path=require("path"),vm=require("vm"),env=require("./pn_test_env.js");
const DIR=__dirname,PRIMARY="profitnode_ledger_v1";
let pass=0,fail=0;
function check(name,ok,detail){console.log((ok?"PASS":"FAIL")+" - "+name+(detail?" :: "+detail:""));ok?pass++:fail++}
function ledger(marker,n){return {meta:{schemaVersion:4,marker},projects:Array.from({length:n},(_,i)=>({id:"p"+i})),inventory:[{id:"i1"}],deals:[],sales:[{id:"s1"}],timeline:[],plans:[],repairs:[],rigs:[],roadTo:[],myRig:null,mail:[],treasury:{balances:[],flows:[],snapshots:[]}}}
function boot(){const sb=env.createSandbox();vm.runInContext(fs.readFileSync(path.join(DIR,"app_core.js"),"utf8"),sb,{filename:"app_core.js"});vm.runInContext(fs.readFileSync(path.join(DIR,"storage_recovery_extension.js"),"utf8"),sb,{filename:"storage_recovery_extension.js"});return sb}
function run(sb,code){return env.run(sb,code)}

{
  const sb=boot(),source=JSON.stringify(ledger("dormant",2));
  sb.localStorage.setItem(PRIMARY,JSON.stringify(ledger("active",0)));
  sb.localStorage.setItem("profitnode_ledger_v1_pre_restore_backup_1",source);
  sb.localStorage.setItem("profitnode_bad_backup","{bad");
  const before=sb.localStorage.getItem("profitnode_ledger_v1_pre_restore_backup_1");
  const scan=JSON.parse(run(sb,"JSON.stringify(PNStorageRecovery.scan())"));
  const after=sb.localStorage.getItem("profitnode_ledger_v1_pre_restore_backup_1");
  const candidate=scan.find(x=>x.key==="profitnode_ledger_v1_pre_restore_backup_1"),bad=scan.find(x=>x.key==="profitnode_bad_backup");
  check("scan is read-only and reports populated candidate counts",before===after&&candidate.evidence===4&&candidate.counts.projects===2&&candidate.counts.inventory===1&&candidate.counts.sales===1,JSON.stringify(candidate));
  check("invalid related JSON is flagged without being changed",bad.parseOk===false&&sb.localStorage.getItem("profitnode_bad_backup")==="{bad",JSON.stringify(bad));
}

{
  const sb=boot(),active=JSON.stringify(ledger("active",0)),candidate=JSON.stringify(ledger("recovered",3));
  sb.localStorage.setItem(PRIMARY,active);sb.localStorage.setItem("shadezy_ledger_v1_backup",candidate);
  const result=JSON.parse(run(sb,"JSON.stringify(PNStorageRecovery.restore('shadezy_ledger_v1_backup'))"));
  const restored=JSON.parse(sb.localStorage.getItem(PRIMARY));
  check("restore preserves current primary before replacement",!!result.backupKey&&sb.localStorage.getItem(result.backupKey)===active,result.backupKey);
  check("restore leaves candidate untouched and activates exact recovered ledger",sb.localStorage.getItem("shadezy_ledger_v1_backup")===candidate&&restored.meta.marker==="recovered"&&restored.projects.length===3,restored.meta.marker);
}

{
  const sb=boot();let blocked=false;
  try{run(sb,"PNStorageRecovery.restore('missing_key')")}catch(_){blocked=true}
  check("missing candidate is blocked without creating primary",blocked&&sb.localStorage.getItem(PRIMARY)===null);
}

{
  const sb=boot();sb.localStorage.setItem(PRIMARY,JSON.stringify(ledger("empty",0)));
  const html=run(sb,"renderBackup()");
  check("BLACKBOX renders the read-only recovery console",html.includes("Browser Ledger Recovery")&&html.includes("READ-ONLY SCAN"));
}

console.log("\n"+pass+" passed, "+fail+" failed");
if(fail)process.exit(1);
