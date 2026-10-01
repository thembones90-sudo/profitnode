"use strict";

const fs=require("fs"),path=require("path"),vm=require("vm"),env=require("./pn_test_env.js");
const DIR=__dirname,PRIMARY="profitnode_ledger_v1",LEGACY="shadezy_ledger_v1";
let pass=0,fail=0;
function check(name,ok,detail){console.log((ok?"PASS":"FAIL")+" - "+name+(detail?" :: "+detail:""));ok?pass++:fail++}
function fixture(options={}){
  const zero=!!options.zero,meta=Object.assign({seeded:true,displayCurrency:"RSD",schemaVersion:4,giftLifecycleV5RepairedAt:"2026-09-30T00:00:00.000Z",marker:options.marker||"fixture"},options.meta||{});
  return {
    meta,
    inventory:[
      {id:"sold-gpu",category:"GPU",manufacturer:"Fixture",model:"Sold GPU",purchaseDate:"2026-08-01",purchasePrice:10000,currency:"RSD",estimatedMarketValue:15000,source:"OTHER",condition:"WORKING",status:"SOLD",createdAt:"2026-08-01T00:00:00.000Z"},
      {id:"active-cpu",category:"CPU",manufacturer:"Fixture",model:"Active CPU",purchaseDate:"2026-09-29",purchasePrice:30000,currency:"RSD",estimatedMarketValue:35000,source:"OTHER",condition:"WORKING",status:"IN_STORAGE",createdAt:"2026-09-29T00:00:00.000Z"}
    ],
    projects:[{id:"gift-project",name:"Fixture Gift",purpose:"FAMILY_GIFT",status:"GIFTED",startDate:"2026-08-01",completionDate:"2026-09-01",currency:"RSD",componentIds:[],slots:{},extras:[],buildLocked:true,additionalCosts:0}],
    deals:[],repairs:[],rigs:[],plans:[],timeline:[],mail:[],myRig:null,
    sales:[{id:"sale-1",inventoryItemId:"sold-gpu",itemName:"Fixture Sold GPU",saleDate:"2026-09-15",buyerPrice:zero?10000:40000,originalInvestment:10000,additionalCosts:0,currency:"RSD",saleType:"COMPONENT",saleState:"COMPLETED"}],
    roadTo:[{id:"road-1",name:"Fixture Goal",target:100000,balance:20000,currency:"RSD",status:"ACTIVE",history:[]}],
    treasury:{settings:{baseCurrency:"EUR",usdToEur:.92,rsdToEur:.00851,fortressFloor:500},balances:[
      {id:"cash-rsd",sourceKey:"CASH_RSD",label:"Cash (RSD)",amount:50000,currency:"RSD",include:true},
      {id:"cash-eur",sourceKey:"CASH_EUR",label:"Cash (EUR)",amount:250,currency:"EUR",include:true},
      {id:"payoneer",sourceKey:"PAYONEER",label:"Payoneer",amount:100,currency:"USD",include:true}
    ],obligations:[],pendingAssets:[],incomes:[],snapshots:[],flows:[]}
  };
}
function bootAll(primary,legacy){const sb=env.createSandbox();if(primary!==undefined)sb.localStorage.setItem(PRIMARY,primary);if(legacy!==undefined)sb.localStorage.setItem(LEGACY,legacy);env.loadAll(sb,DIR);return sb}
function bootCore(primary,legacy){const sb=env.createSandbox();if(primary!==undefined)sb.localStorage.setItem(PRIMARY,primary);if(legacy!==undefined)sb.localStorage.setItem(LEGACY,legacy);vm.runInContext(fs.readFileSync(path.join(DIR,"app_core.js"),"utf8"),sb,{filename:"app_core.js"});return sb}
function run(sb,code){return env.run(sb,code)}

{
  const source=fixture(),sb=bootAll(JSON.stringify(source));
  const out=JSON.parse(run(sb,`JSON.stringify({stats:dashboardStats("RSD"),counts:{inventory:Store.all("inventory").length,projects:Store.all("projects").length,sales:Store.all("sales").length,roadTo:Store.all("roadTo").length},treasury:Store.load().treasury.balances.map(x=>x.amount),marker:Store.load().meta.marker})`));
  check("populated ledger survives boot with authoritative non-zero finance",out.stats.realizedProfit===30000&&out.stats.totalRevenue===40000&&out.counts.inventory===2&&out.counts.projects===1&&out.counts.sales===1&&out.counts.roadTo===1&&out.marker==="fixture",JSON.stringify(out));
  check("Treasury balances are not zeroed by any extension",out.treasury.join(",")==="50000,250,100",JSON.stringify(out.treasury));
}

{
  const prior={version:2,openedAt:"2026-09-30T00:00:00.000Z",openingBalanceRsd:12345,balanceRsd:12345,events:{}},data=fixture({meta:{realizedProfitLedgerV2:prior}}),sb=bootAll(JSON.stringify(data));
  const out=JSON.parse(run(sb,`JSON.stringify({prior:Store.load().meta.realizedProfitLedgerV2,recovery:Store.load().meta.financialRecoveryV1||null,profit:dashboardStats("RSD").realizedProfit})`));
  check("existing non-zero V2 metadata is preserved byte-for-byte",JSON.stringify(out.prior)===JSON.stringify(prior)&&out.recovery===null&&out.profit===30000,JSON.stringify(out));
}

{
  const broken={version:2,openedAt:"2026-09-30T00:00:00.000Z",openingBalanceRsd:30000,balanceRsd:0,events:{"PURCHASE:active-cpu":{kind:"PURCHASE",refId:"active-cpu",amountRsd:-30000,migration:true}},seededPurchaseId:"active-cpu"},data=fixture({meta:{realizedProfitLedgerV2:broken}}),first=bootAll(JSON.stringify(data));
  const one=JSON.parse(run(first,`JSON.stringify({profit:dashboardStats("RSD").realizedProfit,original:Store.load().meta.realizedProfitLedgerV2,recovery:Store.load().meta.financialRecoveryV1,raw:localStorage.getItem(STORAGE_KEY)})`));
  const second=bootAll(one.raw),two=JSON.parse(run(second,`JSON.stringify({profit:dashboardStats("RSD").realizedProfit,original:Store.load().meta.realizedProfitLedgerV2,recovery:Store.load().meta.financialRecoveryV1,treasury:Store.load().treasury.balances.map(x=>x.amount)})`));
  check("broken zero-shadow metadata is backed up and ignored safely",one.profit===30000&&JSON.stringify(one.original)===JSON.stringify(broken)&&JSON.stringify(one.recovery.realizedProfitLedgerV2Backup)===JSON.stringify(broken)&&one.recovery.authoritativeRealizedProfitRsd===30000,JSON.stringify(one.recovery));
  check("financial recovery is idempotent across reload",two.profit===30000&&JSON.stringify(two.original)===JSON.stringify(broken)&&two.recovery.recoveredAt===one.recovery.recoveredAt&&JSON.stringify(two.treasury)==="[50000,250,100]",JSON.stringify(two));
}

{
  const broken={version:2,openingBalanceRsd:0,balanceRsd:0,events:{}},sb=bootAll(JSON.stringify(fixture({zero:true,meta:{realizedProfitLedgerV2:broken}})));
  const out=JSON.parse(run(sb,`JSON.stringify({profit:dashboardStats("RSD").realizedProfit,recovery:Store.load().meta.financialRecoveryV1||null,original:Store.load().meta.realizedProfitLedgerV2})`));
  check("legitimate zero realized profit remains zero",out.profit===0&&out.recovery===null&&JSON.stringify(out.original)===JSON.stringify(broken),JSON.stringify(out));
}

{
  const raw="{not valid json",sb=bootCore(raw),out=JSON.parse(run(sb,`(()=>{const loaded=Store.load(),before=localStorage.getItem(STORAGE_KEY),saved=Store.persist(),after=localStorage.getItem(STORAGE_KEY);return JSON.stringify({before,after,saved,corrupt:PN_STORE_HEALTH.corrupt,backup:localStorage.getItem(PN_STORE_HEALTH.backupKey),inventory:loaded.inventory.length})})()`));
  check("parse failure preserves raw data and blocks empty-ledger persistence",out.before===raw&&out.after===raw&&out.backup===raw&&out.saved===false&&out.corrupt&&out.inventory===0,JSON.stringify(out));
}

{
  const primary=fixture({marker:"primary"}),legacy=fixture({marker:"legacy"}),sb=bootCore(JSON.stringify(primary),JSON.stringify(legacy));
  const out=JSON.parse(run(sb,`JSON.stringify({marker:Store.load().meta.marker,source:Store._sourceKey})`));
  check("primary storage key wins when both keys exist",out.marker==="primary"&&out.source===PRIMARY,JSON.stringify(out));
}

{
  const legacy=fixture({marker:"legacy-only"}),sb=bootCore(undefined,JSON.stringify(legacy));
  const out=JSON.parse(run(sb,`JSON.stringify({marker:Store.load().meta.marker,source:Store._sourceKey})`));
  check("legacy storage is used only when primary is genuinely absent",out.marker==="legacy-only"&&out.source===LEGACY,JSON.stringify(out));
}

{
  const legacy=fixture({marker:"must-not-fallback"}),sb=bootCore("",JSON.stringify(legacy));
  const out=JSON.parse(run(sb,`JSON.stringify({marker:Store.load().meta.marker||null,source:Store._sourceKey,corrupt:PN_STORE_HEALTH.corrupt,primary:localStorage.getItem(STORAGE_KEY),legacy:localStorage.getItem(LEGACY_STORAGE_KEY),saved:Store.persist()})`));
  check("present but empty primary blocks instead of falling through to legacy",out.marker===null&&out.source===PRIMARY&&out.corrupt&&out.primary===""&&out.legacy.length>0&&out.saved===false,JSON.stringify(out));
}

{
  const raw=JSON.stringify(fixture()),sb=bootCore(raw),before=run(sb,`localStorage.getItem(STORAGE_KEY)`),diagnostic=JSON.parse(run(sb,`JSON.stringify(pnStorageDiagnostic(false))`)),after=run(sb,`localStorage.getItem(STORAGE_KEY)`);
  check("storage diagnostic is read-only and reports source, schema, counts and balances",before===after&&diagnostic.selectedKey===PRIMARY&&diagnostic.keys[0].parseOk&&diagnostic.keys[0].recognizedLedger&&diagnostic.keys[0].schemaVersion===4&&diagnostic.keys[0].counts.inventory===2&&diagnostic.keys[0].treasuryBalances.length===3,JSON.stringify(diagnostic));
}

{
  const sb=bootAll(JSON.stringify(fixture())),before=JSON.parse(run(sb,`JSON.stringify({profit:dashboardStats("RSD").realizedProfit,treasury:Store.load().treasury.balances.map(x=>x.amount),road:Store.all("roadTo")[0].balance})`));
  const after=JSON.parse(run(sb,`JSON.stringify({profit:dashboardStats("RSD").realizedProfit,treasury:Store.load().treasury.balances.map(x=>x.amount),road:Store.all("roadTo")[0].balance,gifts:Store.all("sales").filter(x=>x.disposition==="GIFT").length})`));
  check("gift lifecycle leaves unrelated finance, Treasury and ROAD TO stable",JSON.stringify(before)===JSON.stringify({profit:after.profit,treasury:after.treasury,road:after.road}),JSON.stringify({before,after}));
}

console.log("\n"+pass+" PASSED, "+fail+" FAILED");
if(fail)process.exit(1);
