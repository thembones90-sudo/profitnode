"use strict";
(function(){
  if(window.__PN_CLOUD_SYNC_V2__)return;window.__PN_CLOUD_SYNC_V2__=true;
  const URL="https://emnroovdtopxfzwoyhhp.supabase.co";
  const KEY="sb_publishable__tkOfCLkhpkz4BtvSXNQTg_FAmNF3CO";
  const LEDGER_KEY="profitnode_ledger_v1",ROW_ID="primary",SYNC_KEY="profitnode_cloud_sync_v2";
  let client=null,user=null,cloudRevision=0,saveTimer=null,wrapped=false,syncActive=false;
  function localLedger(){try{return JSON.parse(localStorage.getItem(LEDGER_KEY)||"null")}catch(_){return null}}
  function meaningful(x){return !!(x&&((x.projects&&x.projects.length)||(x.inventory&&x.inventory.length)||(x.sales&&x.sales.length)||(x.treasury&&x.treasury.flows&&x.treasury.flows.length)))}
  function fingerprint(x){try{return JSON.stringify(x)}catch(_){return ""}}
  function syncMeta(){try{return JSON.parse(localStorage.getItem(SYNC_KEY)||"null")}catch(_){return null}}
  function setMeta(revision,ledger){localStorage.setItem(SYNC_KEY,JSON.stringify({revision:Number(revision)||0,fingerprint:fingerprint(ledger),syncedAt:new Date().toISOString()}))}
  function backupLocal(tag){const raw=localStorage.getItem(LEDGER_KEY);if(!raw)return;const k="profitnode_cloud_backup_"+tag+"_"+new Date().toISOString().replace(/[:.]/g,"-");localStorage.setItem(k,raw)}
  function reconcileDecision(local,meta,remote){
    if(!remote||!remote.ledger)return "REMOTE_EMPTY";
    if(!meaningful(local))return "PULL";
    const localFp=fingerprint(local),remoteFp=fingerprint(remote.ledger);
    if(localFp===remoteFp)return "CURRENT";
    if(meta&&meta.fingerprint===localFp&&Number(remote.revision)>=Number(meta.revision||0))return "PULL";
    return "CONFLICT";
  }
  function shell(){let el=document.getElementById("pn-cloud-gate");if(el)return el;el=document.createElement("div");el.id="pn-cloud-gate";el.innerHTML='<div class="pn-cloud-card"><div class="pn-cloud-kicker">PROFITNODE CLOUD</div><h2>SYNC ACCESS</h2><p id="pn-cloud-msg">Sign in to connect this device to the current ledger.</p><input id="pn-cloud-email" type="email" placeholder="Email"><input id="pn-cloud-pass" type="password" placeholder="Password"><div class="pn-cloud-actions"><button id="pn-cloud-signin">SIGN IN</button><button id="pn-cloud-signup">CREATE ACCOUNT</button></div><button id="pn-cloud-local">USE LOCAL ONLY</button></div>';document.body.appendChild(el);return el}
  function message(t,bad){const m=document.getElementById("pn-cloud-msg");if(m){m.textContent=t;m.style.color=bad?"#ff6972":"#c6bbd3"}}
  function closeGate(){const e=document.getElementById("pn-cloud-gate");if(e)e.remove()}
  function syncBadge(){let el=document.getElementById("pn-cloud-badge");if(el)return el;el=document.createElement("div");el.id="pn-cloud-badge";el.innerHTML='<span id="pn-cloud-badge-text">CLOUD: checking</span><button id="pn-cloud-pull">PULL</button><button id="pn-cloud-push">PUSH</button><button id="pn-cloud-signout">SIGN OUT</button>';document.body.appendChild(el);return el}
  function badgeMsg(t,bad){const b=document.getElementById("pn-cloud-badge-text");if(b){b.textContent=t;b.style.color=bad?"#ff6972":"#8ef0a0"}}
  async function fetchCloud(){const r=await client.from("profitnode_ledger").select("ledger,revision,updated_at,owner_id").eq("id",ROW_ID).eq("owner_id",user.id).maybeSingle();if(r.error)throw r.error;return r.data}
  async function seedCloud(ledger){const r=await client.from("profitnode_ledger").insert({id:ROW_ID,owner_id:user.id,ledger,revision:1,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).select().single();if(r.error)throw r.error;cloudRevision=1;setMeta(1,ledger);return r.data}
  function applyRemote(remote,tag){
    const previous=localLedger();
    if(fingerprint(previous)!==fingerprint(remote.ledger))backupLocal(tag||"pre-cloud-load");
    localStorage.setItem(LEDGER_KEY,JSON.stringify(remote.ledger));
    if(typeof Store!=="undefined"){Store._data=remote.ledger;Store.error=null;Store._writeLocked=false}
    cloudRevision=Number(remote.revision)||0;setMeta(cloudRevision,remote.ledger);syncActive=true;wrapPersist();closeGate();
    if(typeof render==="function")render();
    badgeMsg("CLOUD r"+cloudRevision+" · CURRENT");
  }
  async function saveCloud(){
    if(!syncActive||!user||typeof Store==="undefined"||!Store.load)return;
    const ledger=Store.load();if(!meaningful(ledger))return;
    const remote=await fetchCloud();if(!remote){syncActive=false;throw new Error("Cloud row missing. Sync stopped.")}
    const actual=Number(remote.revision)||0;
    if(actual!==cloudRevision){syncActive=false;badgeMsg("CLOUD r"+actual+" · CONFLICT — PULL REQUIRED",true);throw new Error("Cloud changed since last sync (expected revision "+cloudRevision+", found "+actual+"). Nothing was overwritten.")}
    const next=actual+1;
    const r=await client.from("profitnode_ledger").update({ledger,revision:next,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).eq("id",ROW_ID).eq("owner_id",user.id).eq("revision",actual).select("revision").maybeSingle();
    if(r.error)throw r.error;if(!r.data){syncActive=false;throw new Error("Cloud save conflict. Nothing was overwritten.")}
    cloudRevision=Number(r.data.revision);setMeta(cloudRevision,ledger);badgeMsg("CLOUD r"+cloudRevision+" · SAVED");
  }
  function scheduleSave(){if(!syncActive)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveCloud().catch(e=>console.error("PROFITNODE CLOUD SAVE STOPPED",e)),500)}
  function wrapPersist(){if(wrapped||typeof Store==="undefined")return;wrapped=true;const old=Store.persist.bind(Store);Store.persist=function(){const ok=old();if(ok)scheduleSave();return ok}}
  async function reconcileOnBoot(){
    const remote=await fetchCloud(),local=localLedger(),decision=reconcileDecision(local,syncMeta(),remote);
    if(decision==="REMOTE_EMPTY"){syncActive=false;badgeMsg("CLOUD EMPTY · LOCAL PRESERVED",true);return decision}
    if(decision==="PULL"){applyRemote(remote,"safe-auto-pull");return decision}
    if(decision==="CURRENT"){cloudRevision=Number(remote.revision)||0;setMeta(cloudRevision,remote.ledger);syncActive=true;wrapPersist();badgeMsg("CLOUD r"+cloudRevision+" · CURRENT");return decision}
    syncActive=false;badgeMsg("CLOUD r"+Number(remote.revision||0)+" · LOCAL CHANGES PRESERVED — PULL TO REPLACE",true);return decision;
  }
  async function pullFromCloud(force){
    const remote=await fetchCloud();if(!remote){badgeMsg("Cloud is empty. Local data preserved.",true);return {ok:false,reason:"empty-cloud"}}
    const decision=reconcileDecision(localLedger(),syncMeta(),remote);
    if(decision==="CONFLICT"&&!force){if(!confirm("This browser has local changes that are not known to cloud. Replace them with cloud revision "+remote.revision+"? A local backup will be created first."))return {ok:false,conflict:true}}
    applyRemote(remote,"manual-pull");return {ok:true,revision:cloudRevision};
  }
  async function pushToCloud(){
    if(typeof Store==="undefined"||!Store.load)return {ok:false,reason:"no-store"};
    const ledger=Store.load();if(!meaningful(ledger)){badgeMsg("Local ledger looks empty — push refused.",true);return {ok:false,reason:"empty-local"}}
    const remote=await fetchCloud();
    if(!remote){if(!confirm("Cloud is empty. Initialize it from this local ledger?"))return {ok:false};await seedCloud(ledger);syncActive=true;wrapPersist();badgeMsg("CLOUD r1 · INITIALIZED");return {ok:true,revision:1}}
    const meta=syncMeta(),local=localLedger();
    if(!meta||meta.fingerprint!==fingerprint(local)||Number(meta.revision)!==Number(remote.revision)){syncActive=false;badgeMsg("PUSH REFUSED · PULL/RECONCILE FIRST",true);return {ok:false,conflict:true,remoteRevision:Number(remote.revision)||0}}
    cloudRevision=Number(remote.revision)||0;syncActive=true;await saveCloud();wrapPersist();return {ok:true,revision:cloudRevision};
  }
  function wireAuthenticated(){
    closeGate();syncBadge();
    document.getElementById("pn-cloud-pull").onclick=()=>pullFromCloud(false).catch(e=>badgeMsg(e.message||String(e),true));
    document.getElementById("pn-cloud-push").onclick=()=>pushToCloud().catch(e=>badgeMsg(e.message||String(e),true));
    document.getElementById("pn-cloud-signout").onclick=async()=>{await client.auth.signOut();user=null;cloudRevision=0;syncActive=false;const b=document.getElementById("pn-cloud-badge");if(b)b.remove()};
  }
  async function signIn(){const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Signing in...");const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;user=r.data.user;wireAuthenticated();await reconcileOnBoot()}
  async function signUp(){const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Creating account...");const r=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});if(r.error)throw r.error;if(r.data.session){user=r.data.user;wireAuthenticated();await reconcileOnBoot()}else message("Account created. Confirm the email, then return here and sign in.")}
  function wireGate(){shell();document.getElementById("pn-cloud-signin").onclick=()=>signIn().catch(e=>message(e.message||String(e),true));document.getElementById("pn-cloud-signup").onclick=()=>signUp().catch(e=>message(e.message||String(e),true));document.getElementById("pn-cloud-local").onclick=()=>{syncActive=false;closeGate();sessionStorage.setItem("pn_cloud_local_only","1")}}
  async function boot(){
    if(!window.supabase||!window.supabase.createClient){console.error("PROFITNODE CLOUD: Supabase client missing");return}
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const r=await client.auth.getUser();
    if(r.data&&r.data.user){user=r.data.user;wireAuthenticated();await reconcileOnBoot()}
    else if(!sessionStorage.getItem("pn_cloud_local_only"))wireGate();
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){user=null;cloudRevision=0;syncActive=false;const b=document.getElementById("pn-cloud-badge");if(b)b.remove()}
      else if(session&&session.user&&!user){user=session.user;wireAuthenticated();reconcileOnBoot().catch(e=>badgeMsg(e.message||String(e),true))}
    });
  }
  window.__PN_CLOUD_SYNC_TEST__={reconcileDecision,fingerprint,meaningful};
  const style=document.createElement("style");style.textContent='#pn-cloud-gate{position:fixed;inset:0;z-index:9999;background:rgba(5,3,9,.9);display:grid;place-items:center;padding:20px}.pn-cloud-card{width:min(430px,100%);background:#15111c;border:1px solid #7e22ce;box-shadow:0 0 40px rgba(168,85,247,.25);padding:24px;font-family:IBM Plex Mono,monospace}.pn-cloud-kicker{font-size:10px;letter-spacing:.16em;color:#a855f7}.pn-cloud-card h2{margin:6px 0 8px;font:700 24px Oswald,sans-serif}.pn-cloud-card p{color:#c6bbd3;min-height:34px}.pn-cloud-card input{margin:5px 0}.pn-cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.pn-cloud-card button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:9px;cursor:pointer;font:600 11px Oswald,sans-serif;letter-spacing:.05em}.pn-cloud-card button:hover{border-color:#a855f7}.pn-cloud-card #pn-cloud-local{width:100%;margin-top:8px;color:#a89faf}#pn-cloud-badge{position:fixed;right:14px;bottom:14px;z-index:9998;background:#15111c;border:1px solid #4a3760;padding:8px 10px;font:600 10px IBM Plex Mono,monospace;display:flex;gap:8px;align-items:center;color:#c6bbd3}#pn-cloud-badge button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:4px 8px;cursor:pointer;font:600 10px Oswald,sans-serif}#pn-cloud-badge button:hover{border-color:#a855f7}';document.head.appendChild(style);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>boot().catch(console.error));else boot().catch(console.error);
})();
