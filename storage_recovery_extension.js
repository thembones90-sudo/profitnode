"use strict";

/* Read-only discovery plus an explicit, two-step restore path for dormant
   PROFITNODE ledgers. Candidate payloads are never rendered or modified. */
(function(){
  const MATCH_KEY=/profitnode|shadezy/i;
  let armedKey=null;

  function counts(data){
    const list=name=>Array.isArray(data&&data[name])?data[name].length:0;
    const treasury=data&&data.treasury&&typeof data.treasury==="object"?data.treasury:{};
    const result={
      projects:list("projects"),inventory:list("inventory"),deals:list("deals"),sales:list("sales"),
      timeline:list("timeline"),plans:list("plans"),repairs:list("repairs"),rigs:list("rigs"),
      roadTo:list("roadTo"),mail:list("mail"),myRig:data&&data.myRig?1:0,
      treasuryBalances:Array.isArray(treasury.balances)?treasury.balances.length:0,
      treasuryFlows:Array.isArray(treasury.flows)?treasury.flows.length:0,
      treasurySnapshots:Array.isArray(treasury.snapshots)?treasury.snapshots.length:0
    };
    result.total=Object.keys(result).reduce((sum,key)=>sum+(key==="total"?0:result[key]),0);
    return result;
  }

  function storageKeys(){
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key!=null)keys.push(String(key));
    }
    return Array.from(new Set(keys)).sort();
  }

  function scan(){
    return storageKeys().filter(key=>MATCH_KEY.test(key)).map(key=>{
      const activeKey=Store&&Store._sourceKey?Store._sourceKey:STORAGE_KEY;
      const raw=localStorage.getItem(key),entry={key,rawLength:raw==null?0:raw.length,parseOk:false,recognized:false,schemaVersion:0,counts:null,evidence:0,current:key===activeKey};
      try{
        const data=JSON.parse(raw);
        entry.parseOk=true;
        entry.recognized=pnRecognizedLedgerRoot(data);
        entry.schemaVersion=Number(data&&data.meta&&data.meta.schemaVersion)||0;
        if(entry.recognized){entry.counts=counts(data);entry.evidence=entry.counts.total;}
      }catch(_){ }
      return entry;
    }).sort((a,b)=>b.evidence-a.evidence||b.rawLength-a.rawLength||a.key.localeCompare(b.key));
  }

  function restore(key){
    const raw=localStorage.getItem(key);
    if(raw==null)throw new Error("Recovery source no longer exists");
    let data;
    try{data=JSON.parse(raw);}catch(_){throw new Error("Recovery source is not valid JSON");}
    const c=pnRecognizedLedgerRoot(data)?counts(data):null;
    if(!c||c.total<1)throw new Error("Recovery source contains no ledger records");
    const prior=localStorage.getItem(STORAGE_KEY);
    let backupKey=null;
    if(prior!==null){
      backupKey=STORAGE_KEY+"_pre_restore_backup_"+Date.now();
      localStorage.setItem(backupKey,prior);
    }
    localStorage.setItem(STORAGE_KEY,raw);
    if(typeof PN_STORE_HEALTH!=="undefined"){
      PN_STORE_HEALTH.corrupt=false;PN_STORE_HEALTH.externalChange=false;PN_STORE_HEALTH.backupKey=null;PN_STORE_HEALTH.message=null;PN_STORE_HEALTH.persistError=null;
    }
    Store._data=null;Store._sourceKey=null;
    return {sourceKey:key,backupKey,counts:c};
  }

  function summary(c){
    return [c.inventory+" inventory",c.projects+" projects",c.sales+" sales",c.rigs+" rigs",c.roadTo+" goals",c.mail+" mail",c.treasuryBalances+" balances"].join(" · ");
  }

  function renderPanel(){
    const entries=scan(),candidates=entries.filter(x=>x.recognized&&x.evidence>0&&!x.current);
    const broken=entries.filter(x=>!x.parseOk||!x.recognized);
    let body;
    if(!candidates.length){
      body='<div class="hint">No dormant populated PROFITNODE ledger was found on this browser origin. '+entries.length+' related storage key'+(entries.length===1?' was':'s were')+' inspected without changing anything.</div>';
    }else{
      body='<div class="hint" style="margin-bottom:12px">Found '+candidates.length+' populated dormant ledger candidate'+(candidates.length===1?'':'s')+'. Review the record counts; restoration copies the selected source into the active ledger and preserves the current ledger first.</div><div class="rank-list">'+candidates.map(x=>'<div class="rank-row"><div class="rank-body"><div class="rank-name">'+escHtml(x.key)+'</div><div class="rank-sub">SCHEMA '+x.schemaVersion+' · '+escHtml(summary(x.counts))+' · '+x.rawLength+' bytes</div></div><div class="rank-val"><button type="button" class="btn btn-sm '+(armedKey===x.key?'btn-danger':'')+'" data-storage-recovery-key="'+escAttr(x.key)+'">'+(armedKey===x.key?'CONFIRM RESTORE':'REVIEW RESTORE')+'</button></div></div>').join('')+'</div>';
    }
    if(broken.length)body+='<div class="hint" style="margin-top:12px">'+broken.length+' related key'+(broken.length===1?' is':'s are')+' not a recognized ledger and '+(broken.length===1?'was':'were')+' left untouched.</div>';
    return '<div class="panel" style="margin-top:16px;border-color:var(--amber-dim)"><div class="panel-head"><h2>Browser Ledger Recovery</h2><span>READ-ONLY SCAN</span></div><div class="panel-body">'+body+'</div></div>';
  }

  window.PNStorageRecovery={scan,restore,counts,renderPanel};
  window.renderStorageRecoveryPanel=renderPanel;

  document.addEventListener("click",function(event){
    const button=event.target&&event.target.closest&&event.target.closest("[data-storage-recovery-key]");
    if(!button)return;
    const key=button.dataset.storageRecoveryKey;
    if(armedKey!==key){armedKey=key;render();return;}
    try{
      const result=restore(key);
      armedKey=null;
      state.backupNotice={tone:"ok",text:"RESTORED "+result.counts.total+" ledger records from "+key+(result.backupKey?". Previous active ledger preserved as "+result.backupKey+".":".")};
      render();
    }catch(err){
      armedKey=null;
      state.backupNotice={tone:"error",text:"RESTORE BLOCKED: "+(err&&err.message?err.message:"Unknown recovery error")};
      render();
    }
  });
})();

/* Keep the helpers reachable from the classic-script global scope used by
   app_core.js and by the deterministic test harness. */
var PNStorageRecovery=window.PNStorageRecovery;
var renderStorageRecoveryPanel=window.renderStorageRecoveryPanel;
