"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"cloud_sync_extension.js"),"utf8");
const LEDGER="profitnode_ledger_v1",QUEUE="profitnode_cloud_queue_v1";
const clone=x=>JSON.parse(JSON.stringify(x));
const base={projects:[{id:"p1",name:"existing"}],inventory:[{id:"item1",status:"IN_STORAGE"}],sales:[],timeline:[],rigs:[],roadTo:[],treasury:{balances:[{id:"cash",amount:5000}]}};
let checks=0;const check=(condition,text)=>{assert.ok(condition,text);checks++};
const sleep=t=>new Promise(r=>setTimeout(r,t));
function fakeBrowser(db,initial={},options={}){
 const data={...initial},dom=new Map();let ready=null;
 function element(id){
  return {id,style:{},hidden:false,textContent:"",children:{},set innerHTML(html){this.html=html;
    for(const m of html.matchAll(/id="([^"]+)"/g)){if(!dom.has(m[1]))dom.set(m[1],element(m[1]));this.children[m[1]]=dom.get(m[1]);}
   },get innerHTML(){return this.html||"";},querySelector(s){return this.children[s.slice(1)]||null;},appendChild(el){if(el.id)dom.set(el.id,el);},remove(){dom.delete(id);},click(){},setAttribute(k,v){this[k]=v;}};
 }
 const document={readyState:"loading",visibilityState:"visible",documentElement:{setAttribute(k,v){document[k]=v;}},
   head:{appendChild(){}},body:{appendChild(el){if(el.id)dom.set(el.id,el);}},
   createElement(tag){return element("");},getElementById(id){return dom.get(id)||null;},
   addEventListener(name,fn){if(name==="DOMContentLoaded")ready=fn;}};
 function builder(table){
  const q={filter:{},value:null,method:"select",
    select(){if(this.method!=="update")this.method="select";return this;},
    eq(key,value){this.filter[key]=value;return this;},
    order(){return this;},limit(){return this;},
    update(value){this.method="update";this.value=value;return this;},
    maybeSingle:async function(){
      if(table!=="profitnode_ledger")return {data:null,error:{message:"unknown table"}};
      if(this.method==="update"){
        if(this.filter.revision!==db.row.revision)return {data:null,error:null};
        db.row={...db.row,...clone(this.value)};return {data:clone(db.row),error:null};
      }
      return {data:clone(db.row),error:null};
    },
    insert:async function(record){
      if(table==="profitnode_recovery"){
        if(options.failArchive)return {error:{code:"NETWORK",message:"archive unavailable"}};
        if(!db.recovery.some(x=>x.owner_id===record.owner_id&&x.snapshot_key===record.snapshot_key))db.recovery.push(clone(record));
        return {error:null};
      }
      return {error:{code:"NOT_ALLOWED"}};
    }
  };return q;
 }
 const user={id:"test-account"};
 const client={auth:{getUser:async()=>({data:{user}}),onAuthStateChange(){}},from:builder};
 const win={supabase:{createClient(){return client}},URL:{createObjectURL(){return "blob:test"},revokeObjectURL(){}}};
 const store={persist(){return true},load(){return JSON.parse(data[LEDGER]||"null")},_data:null};
 const sandbox={window:win,document,Store:store,localStorage:{
 getItem:key=>Object.hasOwn(data,key)?data[key]:null,setItem:(key,value)=>{data[key]=String(value)},
 removeItem:key=>{delete data[key]},key:index=>Object.keys(data)[index],get length(){return Object.keys(data).length}
 },navigator:{userAgent:options.device||"test-device",onLine:true},
 console:{warn(){},error(){},info(){},log(){}},setTimeout,clearTimeout,
 addEventListener(){},render(){},location:{origin:"https://profitnode.vercel.app"},
 Blob:function(){}};
 vm.runInNewContext(source,sandbox,{filename:"cloud_sync_extension.js"});
 async function boot(){ready();await sleep(30);}
 return {boot,data,dom,db,sandbox,api:win.__PN_CLOUD_SYNC_TEST__};
}
(async()=>{
 let db={row:{id:"primary",revision:2488,ledger:clone(base)},recovery:[]};
 let diverged=clone(base);diverged.rigs=[{id:"wraith",family:"WRAITH I"}];diverged.projects[0].name="locally edited";
 let a=fakeBrowser(db,{[LEDGER]:JSON.stringify(diverged)},{device:"LEVIATHAN"});
 await a.boot();
 check(!a.dom.has("pn-cloud-gate"),"signed-in refresh never opens full-screen sync gate");
 check(db.row.revision===2488&&db.row.ledger.rigs.length===0,"old browser cache did not overwrite canonical cloud");
 check(db.recovery.length===1&&db.recovery[0].ledger.rigs[0].family==="WRAITH I","unsynced WRAITH copied into protected server recovery");
 check(JSON.parse(a.data[LEDGER]).rigs.length===0,"browser reopened canonical cloud after recovery");
 check(a.dom.has("pn-cloud-badge"),"sync status badge available");
 check(!!a.dom.get("pn-cloud-recovery")&&!a.dom.get("pn-cloud-recovery").hidden,"recovery action available");
 await fakeBrowser(db,a.data,{device:"LEVIATHAN"}).boot();
 check(db.recovery.length===1,"same cache reload does not produce duplicate backups");
 let b=fakeBrowser(db,{},{device:"HOMELANDER"});
 await b.boot();check(JSON.parse(b.data[LEDGER]).projects[0].id==="p1","another device opens the SAME cloud row");
 let db2={row:{id:"primary",revision:2488,ledger:clone(base)},recovery:[]};
 let qled=clone(base);qled.inventory.push({id:"new-gpu"});
 let q={baseRevision:2400,ledger:qled};
 let c=fakeBrowser(db2,{[LEDGER]:JSON.stringify(qled),[QUEUE]:JSON.stringify(q)},{device:"DEADSPIN"});
 await c.boot();
 check(db2.recovery.some(x=>x.source_device==="DEADSPIN"&&x.ledger.inventory.length===2),"stale queued edits archived");
 check(db2.row.revision===2488,"stale queue never overwrites newer cloud");
 check(c.data[QUEUE]===undefined,"queue cleared only after recovery confirmed");
 let db3={row:{id:"primary",revision:2488,ledger:clone(base)},recovery:[]};
 let d=fakeBrowser(db3,{[LEDGER]:JSON.stringify(diverged)},{failArchive:true,device:"LEVIATHAN"});
 await d.boot();
 check(JSON.parse(d.data[LEDGER]).rigs.some(x=>x.id==="wraith"),"recovery failure preserves browser-only rig");
 check(db3.recovery.length===0&&db3.row.revision===2488,"failure does not write cloud or fake successful backup");
 check(!d.dom.has("pn-cloud-gate"),"archive failure does not block startup with modal");
 let db4={row:{id:"primary",revision:2488,ledger:clone(base)},recovery:[]};
 let synced=clone(base);synced.sales.push({id:"new-sale"});
 let e=fakeBrowser(db4,{[LEDGER]:JSON.stringify(synced),[QUEUE]:JSON.stringify({baseRevision:2488,ledger:synced})},{device:"LEVIATHAN"});
 await e.boot();
 check(db4.row.revision===2489&&db4.row.ledger.sales.length===1,"valid same-revision queue saves with optimistic lock");
 check(JSON.parse(e.data[LEDGER]).sales.length===1&&!e.data[QUEUE],"saved queue synced and cleared");
 check(db4.recovery.length===0,"normal save needs no recovery archive");
 check(e.api.meaningful({rigs:[{id:"r"}]}),"rig-only cache must be recognized as meaningful");
 let db5={row:{id:"primary",revision:2488,ledger:clone(base)},recovery:[]};
 let additive=clone(base);additive.rigs=[{id:"new-rig",family:"WRAITH I"}];
 let f=fakeBrowser(db5,{[LEDGER]:JSON.stringify(additive)},{device:"LEVIATHAN"});
 await f.boot();
 check(db5.row.revision===2489&&db5.row.ledger.rigs.length===1,"safe strictly additive rig is promoted to central database");
 check(db5.recovery.length===0,"safe additive promotion needs no conflicting recovery entry");
 console.log("CLOUD SINGLE AUTHORITY E2E: "+checks+" assertions passed");
})().catch(error=>{console.error(error);process.exitCode=1});
