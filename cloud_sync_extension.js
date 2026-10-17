"use strict";
(function(){
  if(window.__PN_CLOUD_SYNC_V3__)return;window.__PN_CLOUD_SYNC_V3__=true;
  const URL="https://emnroovdtopxfzwoyhhp.supabase.co";
  const KEY="sb_publishable__tkOfCLkhpkz4BtvSXNQTg_FAmNF3CO";
  const LEDGER_KEY="profitnode_ledger_v1",ROW_ID="primary",SYNC_KEY="profitnode_cloud_sync_v3",QUEUE_KEY="profitnode_cloud_queue_v1";
  const COLLECTIONS=["projects","inventory","deals","sales","timeline","plans","repairs","rigs","roadTo","mail"];
  let client=null,user=null,cloudRevision=0,saveTimer=null,wrapped=false,phase="BOOTING",channel=null,checking=false,lastCloudFingerprint="",hydrated=false;

  function parse(raw){try{return JSON.parse(raw||"null")}catch(_){return null}}
  function localLedger(){return parse(localStorage.getItem(LEDGER_KEY))}
  function syncMeta(){return parse(localStorage.getItem(SYNC_KEY))}
  function pendingQueue(){return parse(localStorage.getItem(QUEUE_KEY))}
  function digest(text){
    let a=2166136261,b=2654435769,c=2246822519;
    for(let i=0;i<text.length;i++){
      const n=text.charCodeAt(i);
      a=Math.imul(a^n,16777619);
      b=Math.imul(b+n,2246822519)^(b>>>13);
      c=Math.imul(c^n,3266489917);
    }
    return "pn3:"+text.length+":"+[a,b,c].map(n=>(n>>>0).toString(16).padStart(8,"0")).join("");
  }
  function fingerprint(value){return digest(signature(value)||"")}
  function compactLegacyMeta(){
    const meta=syncMeta();
    if(!meta||typeof meta.fingerprint!=="string"||meta.fingerprint.length<256)return;
    const old=parse(meta.fingerprint);
    if(!old)return;
    try{localStorage.setItem(SYNC_KEY,JSON.stringify({...meta,fingerprint:fingerprint(old)}))}
    catch(error){console.warn("PROFITNODE: old sync metadata could not be compacted",error)}
  }
  function meaningful(x){return !!(x&&((x.projects&&x.projects.length)||(x.inventory&&x.inventory.length)||(x.sales&&x.sales.length)||(x.timeline&&x.timeline.length)||(x.treasury&&x.treasury.balances&&x.treasury.balances.length)))}
  function countOf(x,key){return x&&Array.isArray(x[key])?x[key].length:0}
  function canonical(value){
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==="object"){
      const ordered={};Object.keys(value).sort().forEach(key=>{ordered[key]=canonical(value[key])});return ordered;
    }
    return value;
  }
  function signature(value){try{return JSON.stringify(canonical(value))}catch(_){return ""}}
  function itemKey(x){return x&&x.id?"id:"+x.id:"json:"+signature(x)}
  function collectionContains(remote,local,key){
    const r=remote&&Array.isArray(remote[key])?remote[key]:[],l=local&&Array.isArray(local[key])?local[key]:[];
    const byKey=new Map(l.map(x=>[itemKey(x),signature(x)]));
    return r.every(x=>byKey.has(itemKey(x))&&byKey.get(itemKey(x))===signature(x));
  }
  function strictLocalDescendant(local,remote){
    if(!meaningful(local)||!meaningful(remote))return false;
    if(!COLLECTIONS.every(key=>collectionContains(remote,local,key)))return false;
    const otherKeys=new Set([...Object.keys(local),...Object.keys(remote)].filter(key=>!COLLECTIONS.includes(key)));
    if([...otherKeys].some(key=>signature(local[key])!==signature(remote[key])))return false;
    const grew=COLLECTIONS.some(key=>countOf(local,key)>countOf(remote,key));
    return grew&&COLLECTIONS.every(key=>countOf(local,key)>=countOf(remote,key));
  }
  function authorityDecision(local,meta,remote,queue){
    if(!remote||!remote.ledger)return "REMOTE_EMPTY";
    if(queue&&queue.ledger){
      if(fingerprint(queue.ledger)===fingerprint(remote.ledger))
        return !meaningful(local)||fingerprint(local)===fingerprint(remote.ledger)?"CURRENT":"CONFLICT";
      return Number(queue.baseRevision)===Number(remote.revision)?"RESUME_QUEUE":"CONFLICT";
    }
    if(!meaningful(local))return "APPLY_REMOTE";
    const localFp=fingerprint(local),remoteFp=fingerprint(remote.ledger);
    if(localFp===remoteFp)return "CURRENT";
    if(meta&&meta.fingerprint===localFp&&Number(remote.revision)>=Number(meta.revision||0))return "APPLY_REMOTE";
    if(strictLocalDescendant(local,remote.ledger))return "PROMOTE_LOCAL";
    return "CONFLICT";
  }
  function setMeta(revision,ledger){localStorage.setItem(SYNC_KEY,JSON.stringify({revision:Number(revision)||0,fingerprint:fingerprint(ledger),syncedAt:new Date().toISOString()}))}
  function backupLocal(tag){
    const raw=localStorage.getItem(LEDGER_KEY);if(!raw)return null;
    const key="profitnode_cloud_backup_"+tag+"_"+new Date().toISOString().replace(/[:.]/g,"-");
    try{localStorage.setItem(key,raw);return key}
    catch(error){console.warn("PROFITNODE: local backup quota reached; preserving the active browser ledger",error);return null}
  }
  function cacheLedger(ledger){
    if(fingerprint(ledger)!==fingerprint(localLedger()))localStorage.setItem(LEDGER_KEY,JSON.stringify(ledger));
    if(typeof Store!=="undefined"){Store._data=ledger;Store.error=null;Store._writeLocked=false}
  }
  function setPhase(next){phase=next;document.documentElement.setAttribute("data-pn-cloud",String(next).toLowerCase())}
  function shell(){
    let el=document.getElementById("pn-cloud-gate");if(el)return el;
    el=document.createElement("div");el.id="pn-cloud-gate";
    el.innerHTML='<div class="pn-cloud-card"><div class="pn-cloud-kicker">PROFITNODE CLOUD</div><h2>SYNC ACCESS</h2><p id="pn-cloud-msg">Sign in to open the authoritative ledger.</p><input id="pn-cloud-email" type="email" placeholder="Email"><input id="pn-cloud-pass" type="password" placeholder="Password"><div class="pn-cloud-actions"><button id="pn-cloud-signin">SIGN IN</button><button id="pn-cloud-signup">CREATE ACCOUNT</button></div></div>';
    document.body.appendChild(el);return el;
  }
  function closeGate(){const el=document.getElementById("pn-cloud-gate");if(el)el.remove()}
  function message(text,bad){const el=document.getElementById("pn-cloud-msg");if(el){el.textContent=text;el.style.color=bad?"#ff6972":"#c6bbd3"}}
  function syncBadge(){
    let el=document.getElementById("pn-cloud-badge");if(el)return el;
    el=document.createElement("div");el.id="pn-cloud-badge";
    el.innerHTML='<span id="pn-cloud-badge-text">CLOUD · CONNECTING</span><button id="pn-cloud-retry" hidden>RETRY</button><button id="pn-cloud-signout">SIGN OUT</button>';
    document.body.appendChild(el);
    el.querySelector("#pn-cloud-retry").onclick=()=>reconcileOnBoot().catch(handleOffline);
    el.querySelector("#pn-cloud-signout").onclick=async()=>{await client.auth.signOut();user=null;hydrated=false;cloudRevision=0;setPhase("SIGNED_OUT");el.remove();wireGate()};
    return el;
  }
  function badgeMsg(text,tone){
    syncBadge();const label=document.getElementById("pn-cloud-badge-text"),retry=document.getElementById("pn-cloud-retry");
    if(label){label.textContent=text;label.style.color=tone==="bad"?"#ff6972":tone==="warn"?"#f6c453":"#8ef0a0"}
    if(retry)retry.hidden=tone!=="bad";
  }
  function exportRecoverySnapshot(){
    const saved={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key===LEDGER_KEY||key===QUEUE_KEY||key===SYNC_KEY||key.startsWith("profitnode_cloud_backup_"))saved[key]=localStorage.getItem(key);
    }
    if(!saved[LEDGER_KEY]){alert("The browser ledger is missing; do not replace any data.");return}
    const payload={kind:"PROFITNODE_BROWSER_RECOVERY",capturedAt:new Date().toISOString(),origin:location.origin,saved};
    const url=window.URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const link=document.createElement("a");link.href=url;link.download="profitnode-browser-recovery-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>window.URL.revokeObjectURL(url),5000);
  }
  const RECOVERY_COMPARE_KEYS=["inventory","projects","sales","timeline","treasury","rigs","roadTo","mail","plans","repairs","deals"];
  const RECOVERY_ACCEPTED_CACHE="pn3:70713:f88e1115fd0e7b211ce0c06b";
  const RECOVERY_ACCEPTED_QUEUE="pn3:69616:b53715db1cb7943225ceaff9";
  function recoveryCoreFingerprint(ledger){
    if(!ledger)return "";
    const core={};
    RECOVERY_COMPARE_KEYS.forEach(key=>{core[key]=ledger[key]});
    return fingerprint(core);
  }
  function isAuditedRecovery(remote){
    const ledger=remote&&remote.ledger,m=ledger&&ledger.meta&&ledger.meta.cloudRecovery20261017;
    if(!ledger||Number(remote.revision)!==100||!m||Number(m.sourceRevision)!==99||!m.financialBalancesPreserved||!m.duplicateRevenantSaleExcluded)return false;
    if(countOf(ledger,"inventory")!==48||countOf(ledger,"sales")!==6||countOf(ledger,"timeline")!==82)return false;
    if(!ledger.inventory.some(x=>x&&x.id==="1f2d304c-f1a0-4f38-844a-6854389f7849"))return false;
    if(!ledger.sales.some(x=>x&&x.id==="00de8529-7e59-4f67-a3df-3e951788a114"))return false;
    if(!ledger.sales.some(x=>x&&x.id==="15e534da-7d65-49f3-ae52-797808147c7d"))return false;
    if(ledger.sales.filter(x=>x&&String(x.itemName||"").includes("REVENANT III")&&x.saleState!=="CANCELLED").length!==1)return false;
    const local=localLedger(),queue=pendingQueue();
    return recoveryCoreFingerprint(local)===RECOVERY_ACCEPTED_CACHE&&recoveryCoreFingerprint(queue&&queue.ledger)===RECOVERY_ACCEPTED_QUEUE;
  }
  async function acceptAuditedRecovery(){
    const fresh=await fetchCloud();
    if(!isAuditedRecovery(fresh)){conflictGate(fresh);return}
    if(!confirm("Apply the verified cloud recovery r100? Your full browser histories are already exported and preserved in the PROFITNODE recovery vault. This replaces this browser cache, not the cloud."))return;
    exportRecoverySnapshot();
    const redundant=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.startsWith("profitnode_cloud_backup_pre-cloud-queue_saved_2026-10-17T19-30-"))redundant.push(key);
    }
    redundant.forEach(key=>localStorage.removeItem(key));
    applyRemote(fresh,"VERIFIED_RECOVERY",true);
  }
  let deviceRecoveryExported=false;
  async function useCloudOnDevice(){
    if(!deviceRecoveryExported){
      alert("First export this browser backup and save the downloaded file. Then choose USE CLOUD ON THIS DEVICE again.");
      return;
    }
    if(!user||checking)return;
    const before=localLedger();
    const queued=pendingQueue();
    if(!before){
      alert("Cannot inspect this browser ledger. No data was replaced.");
      return;
    }
    const current=await fetchCloud();
    if(!current||!current.ledger){
      alert("Cannot verify the current cloud ledger. No data was replaced.");
      return;
    }
    if(!confirm("Use the current Supabase cloud ledger on THIS device? This will replace the phone's existing local ledger and pending edits. You must have SAVED the browser backup download first. The cloud database itself will NOT be overwritten."))return;
    if(!backupLocal("before-explicit-device-cloud-load")){
      alert("This browser could not preserve a local recovery copy (storage quota). Nothing was replaced. Keep the exported backup and do not clear browser data.");
      return;
    }
    applyRemote(current,"EXPLICIT_DEVICE_CLOUD_LOAD");
  }
  function conflictGate(remote){
    setPhase("CONFLICT");shell();const card=document.querySelector(".pn-cloud-card");if(!card)return;
    const audited=isAuditedRecovery(remote);
    card.innerHTML='<div class="pn-cloud-kicker">PROFITNODE CLOUD</div><h2>'+(audited?"RECOVERY VERIFIED":"SYNC PAUSED")+'</h2><p>'+(audited?"The browser and cloud histories were reconciled and backed up. Cloud revision 100 contains the verified 48 inventory items and 6 sales.":"Both ledgers must be preserved before reconciliation. Export this browser and compare its history with the cloud. Nothing will be replaced automatically.")+'</p><div class="pn-cloud-actions"><button id="pn-conflict-backup">EXPORT BROWSER BACKUP</button><button id="pn-conflict-retry">RECHECK</button>'+(audited?'<button id="pn-verified-recovery" style="grid-column:1/-1">APPLY VERIFIED RECOVERY r100</button>':"")+'<button id="pn-device-use-cloud" style="grid-column:1/-1">USE CLOUD ON THIS DEVICE</button></div>';
    card.querySelector("#pn-conflict-backup").onclick=()=>{exportRecoverySnapshot();deviceRecoveryExported=true};
    card.querySelector("#pn-device-use-cloud").onclick=()=>useCloudOnDevice().catch(handleOffline);
    card.querySelector("#pn-conflict-retry").onclick=()=>reconcileOnBoot().catch(handleOffline);
    const recover=card.querySelector("#pn-verified-recovery");if(recover)recover.onclick=()=>acceptAuditedRecovery().catch(handleOffline);
    badgeMsg("CLOUD r"+Number(remote&&remote.revision||0)+(audited?" · RECOVERY READY":" · SYNC PAUSED"),audited?"warn":"bad");
  }
  async function fetchCloud(){
    const result=await client.from("profitnode_ledger").select("ledger,revision,updated_at,owner_id").eq("id",ROW_ID).eq("owner_id",user.id).maybeSingle();
    if(result.error)throw result.error;return result.data;
  }
  async function seedCloud(ledger){
    const result=await client.from("profitnode_ledger").insert({id:ROW_ID,owner_id:user.id,ledger,revision:1,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).select("ledger,revision,updated_at,owner_id").single();
    if(result.error)throw result.error;return result.data;
  }
  async function casWrite(ledger,baseRevision){
    const next=Number(baseRevision)+1;
    const result=await client.from("profitnode_ledger").update({ledger,revision:next,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).eq("id",ROW_ID).eq("owner_id",user.id).eq("revision",Number(baseRevision)).select("ledger,revision,updated_at,owner_id").maybeSingle();
    if(result.error)throw result.error;return result.data;
  }
  function announce(){try{if(channel)channel.postMessage({revision:cloudRevision})}catch(_){}}
  function applyRemote(remote,reason,alreadyExported){
    const before=localLedger();
    if(!alreadyExported&&meaningful(before)&&fingerprint(before)!==fingerprint(remote.ledger)){
      const backup=backupLocal("pre-cloud-"+String(reason||"load").toLowerCase());
      if(!backup){conflictGate(remote);return}
    }
    cacheLedger(remote.ledger);localStorage.removeItem(QUEUE_KEY);cloudRevision=Number(remote.revision)||0;lastCloudFingerprint=fingerprint(remote.ledger);hydrated=true;setMeta(cloudRevision,remote.ledger);setPhase("SYNCED");wrapPersist();closeGate();
    if(typeof render==="function")render();badgeMsg("CLOUD r"+cloudRevision+" · SYNCED","ok");announce();
  }
  function queueLedger(ledger){
    const existing=pendingQueue();
    if(existing&&fingerprint(existing.ledger)===fingerprint(ledger))return false;
    if(!existing&&fingerprint(ledger)===lastCloudFingerprint)return false;
    localStorage.setItem(QUEUE_KEY,JSON.stringify({baseRevision:existing?Number(existing.baseRevision):cloudRevision,ledger,queuedAt:new Date().toISOString()}));
    setPhase(navigator.onLine===false?"OFFLINE":"SAVING");badgeMsg(navigator.onLine===false?"OFFLINE · 1 CHANGE QUEUED":"CLOUD r"+cloudRevision+" · SAVING","warn");
    return true;
  }
  async function flushQueue(){
    if(!user||checking)return;const queued=pendingQueue();if(!queued||!queued.ledger)return;checking=true;
    try{
      const remote=await fetchCloud();if(!remote)throw new Error("Authoritative ledger row is missing.");
      if(fingerprint(remote.ledger)===fingerprint(queued.ledger)){finalizeSave(remote,queued,"QUEUE_ALREADY_APPLIED");return}
      if(Number(remote.revision)!==Number(queued.baseRevision)){conflictGate(remote);return}
      const saved=await casWrite(queued.ledger,queued.baseRevision);if(!saved){conflictGate(await fetchCloud());return}
      finalizeSave(saved,queued,"QUEUE_SAVED");
    }finally{checking=false}
  }
  function finalizeSave(saved,snapshot,reason){
    const newer=pendingQueue();
    if(newer&&fingerprint(newer.ledger)!==fingerprint(snapshot.ledger)){
      cloudRevision=Number(saved.revision)||0;
      lastCloudFingerprint=fingerprint(saved.ledger);
      localStorage.setItem(QUEUE_KEY,JSON.stringify({...newer,baseRevision:cloudRevision}));
      setMeta(cloudRevision,saved.ledger);
      scheduleSave();
      return;
    }
    applyRemote(saved,reason);
  }
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>flushQueue().catch(handleOffline),450)}
  function wrapPersist(){
    if(wrapped||typeof Store==="undefined")return;wrapped=true;const old=Store.persist.bind(Store);
    Store.persist=function(){const ok=old();if(ok&&user&&hydrated&&phase!=="CONFLICT"&&queueLedger(Store.load()))scheduleSave();return ok};
  }
  function handleOffline(error){
    const detail=String(error&&error.message||error||"Unknown synchronization error").slice(0,300);
    const isOffline=navigator.onLine===false||/failed to fetch|network|offline/i.test(detail);
    setPhase(isOffline?"OFFLINE":"ERROR");
    badgeMsg(isOffline?"OFFLINE · CHANGES QUEUED":"SYNC ERROR · RETRY","bad");
    const gate=document.getElementById("pn-cloud-gate");
    if(gate){
      const p=gate.querySelector(".pn-cloud-card p");
      if(p)p.textContent="Cloud reconciliation stopped: "+detail+". Your browser ledger has not been replaced.";
    }
    console.warn("PROFITNODE CLOUD: sync interrupted",error);
  }
  async function promoteLocal(local,remote){
    backupLocal("pre-authority-migration");const saved=await casWrite(local,remote.revision);
    if(!saved){conflictGate(await fetchCloud());return}applyRemote(saved,"LOCAL_DESCENDANT_PROMOTED");
  }
  async function reconcileOnBoot(){
    if(!user||checking)return;checking=true;if(!hydrated)setPhase("BOOTING");badgeMsg("CLOUD · RECONCILING","warn");
    try{
      let remote=await fetchCloud();const local=localLedger(),queue=pendingQueue();
      if(!remote){remote=await seedCloud(local||((typeof Store!=="undefined"&&Store.load)?Store.load():{}));applyRemote(remote,"INITIALIZED");return}
      const decision=authorityDecision(local,syncMeta(),remote,queue);
      if(decision==="CURRENT"){applyRemote(remote,"CURRENT");return}
      if(decision==="APPLY_REMOTE"){applyRemote(remote,"AUTHORITATIVE_LOAD");return}
      if(decision==="RESUME_QUEUE"){checking=false;await flushQueue();return}
      if(decision==="PROMOTE_LOCAL"){await promoteLocal(local,remote);return}
      conflictGate(remote);
    }finally{checking=false}
  }
  function wireAuthenticated(){const el=shell();el.querySelector(".pn-cloud-card").innerHTML='<div class="pn-cloud-kicker">PROFITNODE CLOUD</div><h2>RECONCILING</h2><p>Opening the authoritative ledger. Browser changes remain protected until synchronization finishes.</p>';syncBadge();wrapPersist()}
  async function signIn(){
    const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Signing in...");
    const result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;user=result.data.user;wireAuthenticated();await reconcileOnBoot();
  }
  async function signUp(){
    const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Creating account...");
    const result=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});if(result.error)throw result.error;
    if(result.data.session){user=result.data.user;wireAuthenticated();await reconcileOnBoot()}else message("Account created. Confirm the email, then return here and sign in.");
  }
  function wireGate(){
    shell();const signin=document.getElementById("pn-cloud-signin"),signup=document.getElementById("pn-cloud-signup");
    if(signin)signin.onclick=()=>signIn().catch(error=>message(error.message||String(error),true));
    if(signup)signup.onclick=()=>signUp().catch(error=>message(error.message||String(error),true));
  }
  function wireCrossTab(){
    if(typeof BroadcastChannel==="function"){
      channel=new BroadcastChannel("profitnode-cloud-ledger");
      channel.onmessage=event=>{
        const revision=Number(event&&event.data&&event.data.revision);
        if(!user||!Number.isSafeInteger(revision)||revision<=cloudRevision)return;
        reconcileOnBoot().catch(handleOffline);
      };
    }
    addEventListener("online",()=>{if(user)reconcileOnBoot().catch(handleOffline)});
    addEventListener("visibilitychange",()=>{if(user&&document.visibilityState==="visible"&&!pendingQueue())reconcileOnBoot().catch(handleOffline)});
  }
  function patchBackupCopy(){
    if(typeof renderBackup!=="function"||renderBackup.__pnCloudCopy)return;
    const original=renderBackup;
    renderBackup=function(){
      return original()
        .replace("Everything here lives only in this browser — back it up so a cleared cache can’t take it with it","Supabase is the authoritative ledger; this browser keeps a recovery cache")
        .replace("PROFITNODE is local-first: everything is stored in this browser’s local storage on this device, nothing is sent anywhere. That means a cleared cache, a private window, or opening the shop on another device starts from zero — export a backup after any real session, and before clearing browser data. Restoring a backup replaces the current ledger entirely.","Supabase is PROFITNODE’s single authoritative ledger. This browser keeps a recovery cache and a temporary offline save queue; queued changes are revision-checked and committed automatically when connected. A full JSON export remains the independent safety backup.");
    };
    renderBackup.__pnCloudCopy=true;
  }
  async function boot(){
    if(!window.supabase||!window.supabase.createClient){console.error("PROFITNODE CLOUD: Supabase client missing");return}
    setPhase("BOOTING");compactLegacyMeta();patchBackupCopy();client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});wireCrossTab();
    const result=await client.auth.getUser();
    if(result.data&&result.data.user){user=result.data.user;wireAuthenticated();await reconcileOnBoot()}else{setPhase("SIGNED_OUT");wireGate()}
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){user=null;hydrated=false;cloudRevision=0;setPhase("SIGNED_OUT");const badge=document.getElementById("pn-cloud-badge");if(badge)badge.remove();wireGate()}
      else if(session&&session.user&&!user){user=session.user;wireAuthenticated();reconcileOnBoot().catch(handleOffline)}
    });
  }
  window.__PN_CLOUD_SYNC_TEST__={authorityDecision,strictLocalDescendant,fingerprint,meaningful,recoveryCoreFingerprint,isAuditedRecovery};
  const style=document.createElement("style");style.textContent='#pn-cloud-gate{position:fixed;inset:0;z-index:9999;background:rgba(5,3,9,.92);display:grid;place-items:center;padding:20px}.pn-cloud-card{width:min(470px,100%);background:#15111c;border:1px solid #7e22ce;box-shadow:0 0 40px rgba(168,85,247,.25);padding:24px;font-family:IBM Plex Mono,monospace}.pn-cloud-kicker{font-size:10px;letter-spacing:.16em;color:#a855f7}.pn-cloud-card h2{margin:6px 0 8px;font:700 24px Oswald,sans-serif}.pn-cloud-card p{color:#c6bbd3;min-height:34px}.pn-cloud-card input{margin:5px 0}.pn-cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.pn-cloud-card button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:9px;cursor:pointer;font:600 11px Oswald,sans-serif;letter-spacing:.05em}.pn-cloud-card button:hover{border-color:#a855f7}#pn-cloud-badge{position:fixed;right:14px;bottom:14px;z-index:9998;background:#15111c;border:1px solid #4a3760;padding:8px 10px;font:600 10px IBM Plex Mono,monospace;display:flex;gap:8px;align-items:center;color:#c6bbd3}#pn-cloud-badge button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:4px 8px;cursor:pointer;font:600 10px Oswald,sans-serif}#pn-cloud-badge button:hover{border-color:#a855f7}';document.head.appendChild(style);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>boot().catch(handleOffline));else boot().catch(handleOffline);
})();

