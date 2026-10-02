"use strict";
(function(){
  if(window.__PN_CLOUD_SYNC_V2__)return;window.__PN_CLOUD_SYNC_V2__=true;
  const URL="https://emnroovdtopxfzwoyhhp.supabase.co";
  const KEY="sb_publishable__tkOfCLkhpkz4BtvSXNQTg_FAmNF3CO";
  const LEDGER_KEY="profitnode_ledger_v1";
  const ROW_ID="primary";
  const REV_KEY="profitnode_last_synced_revision_v1";
  const FP_KEY="profitnode_last_synced_fingerprint_v1";
  let client=null,user=null,wrapped=false;

  function localLedgerRaw(){return localStorage.getItem(LEDGER_KEY)}
  function localLedger(){try{return JSON.parse(localLedgerRaw()||"null")}catch(_){return null}}
  function meaningful(x){return !!(x&&((x.projects&&x.projects.length)||(x.inventory&&x.inventory.length)||(x.sales&&x.sales.length)))}
  function backupLocal(tag){const raw=localLedgerRaw();if(!raw)return;const k="profitnode_cloud_backup_"+tag+"_"+new Date().toISOString().replace(/[:.]/g,"-");localStorage.setItem(k,raw)}

  // djb2 string hash — cheap fingerprint, not cryptographic, just "did this change"
  function fingerprint(str){let h=5381;for(let i=0;i<str.length;i++){h=((h<<5)+h+str.charCodeAt(i))|0}return String(h)}
  function getLastSynced(){return {revision:Number(localStorage.getItem(REV_KEY))||0, fingerprint:localStorage.getItem(FP_KEY)||null}}
  function setLastSynced(revision,ledgerRaw){try{localStorage.setItem(REV_KEY,String(revision));localStorage.setItem(FP_KEY,fingerprint(ledgerRaw))}catch(_){ }}
  function localChangedSinceLastSync(){const last=getLastSynced();if(!last.fingerprint)return meaningful(localLedger());const raw=localLedgerRaw();if(!raw)return false;return fingerprint(raw)!==last.fingerprint}

  function shell(){let el=document.getElementById("pn-cloud-gate");if(el)return el;el=document.createElement("div");el.id="pn-cloud-gate";el.innerHTML='<div class="pn-cloud-card"><div class="pn-cloud-kicker">PROFITNODE CLOUD</div><h2>SYNC ACCESS</h2><p id="pn-cloud-msg">Sign in to connect cloud sync on this device.</p><input id="pn-cloud-email" type="email" placeholder="Email"><input id="pn-cloud-pass" type="password" placeholder="Password"><div class="pn-cloud-actions"><button id="pn-cloud-signin">SIGN IN</button><button id="pn-cloud-signup">CREATE ACCOUNT</button></div><button id="pn-cloud-local">USE LOCAL ONLY</button></div>';document.body.appendChild(el);return el}
  function message(t,bad){const m=document.getElementById("pn-cloud-msg");if(m){m.textContent=t;m.style.color=bad?"#ff6972":"#c6bbd3"}}
  function closeGate(){const e=document.getElementById("pn-cloud-gate");if(e)e.remove()}

  // Small persistent control, shown once signed in, instead of ever auto-syncing.
  function syncBadge(){let el=document.getElementById("pn-cloud-badge");if(el)return el;el=document.createElement("div");el.id="pn-cloud-badge";el.innerHTML='<span id="pn-cloud-badge-text">CLOUD: connected</span><button id="pn-cloud-pull">PULL</button><button id="pn-cloud-push">PUSH</button><button id="pn-cloud-signout">SIGN OUT</button>';document.body.appendChild(el);return el}
  function badgeMsg(t,bad){const b=document.getElementById("pn-cloud-badge-text");if(b){b.textContent=t;b.style.color=bad?"#ff6972":"#8ef0a0"}}

  async function fetchCloudRow(){
    // Scoped by id AND owner_id — never read a row that isn't this authenticated user's.
    const r=await client.from("profitnode_ledger").select("ledger,revision,updated_at,owner_id").eq("id",ROW_ID).eq("owner_id",user.id).maybeSingle();
    if(r.error)throw r.error;
    return r.data;
  }

  async function pullFromCloud(force){
    const remote=await fetchCloudRow();
    if(!remote){badgeMsg("No cloud data for this account yet. Push to create it.");return}
    if(!force && localChangedSinceLastSync()){
      badgeMsg("Local has unsynced changes — pull refused. Push first, or confirm overwrite.",true);
      return {conflict:true,remote:remote};
    }
    backupLocal("pre-cloud-pull");
    localStorage.setItem(LEDGER_KEY,JSON.stringify(remote.ledger));
    setLastSynced(remote.revision,JSON.stringify(remote.ledger));
    if(typeof Store!=="undefined"){Store._data=remote.ledger;Store.error=null;Store._writeLocked=false}
    if(typeof render==="function")render();
    badgeMsg("Pulled cloud revision "+remote.revision+".");
    return {ok:true,revision:remote.revision};
  }

  async function pushToCloud(){
    if(typeof Store==="undefined"||!Store.load)return{ok:false,reason:"no-store"};
    const ledger=Store.load();
    if(!meaningful(ledger)){badgeMsg("Local ledger looks empty — refusing to push.",true);return{ok:false,reason:"empty-local"}}
    const raw=JSON.stringify(ledger);
    const last=getLastSynced();

    const existing=await fetchCloudRow();
    if(!existing){
      // First push for this account — create the row.
      const r=await client.from("profitnode_ledger").insert({id:ROW_ID,owner_id:user.id,ledger,revision:1,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).select().single();
      if(r.error){badgeMsg("Push failed: "+r.error.message,true);return{ok:false,error:r.error}}
      setLastSynced(1,raw);
      badgeMsg("Pushed. Cloud initialized at revision 1.");
      return{ok:true,revision:1};
    }

    // Optimistic lock: only succeed if cloud's revision still matches what we last synced.
    // If someone else (or a direct DB write) moved it since, abort rather than overwrite.
    const expected=last.revision||existing.revision;
    if(existing.revision!==expected && last.revision!==0){
      badgeMsg("Cloud moved to revision "+existing.revision+" since last sync (expected "+expected+"). Push refused — pull first or resolve manually.",true);
      return{ok:false,conflict:true,remoteRevision:existing.revision};
    }
    const nextRevision=existing.revision+1;
    const r=await client.from("profitnode_ledger").update({ledger,revision:nextRevision,source_device:navigator.userAgent,updated_at:new Date().toISOString()}).eq("id",ROW_ID).eq("owner_id",user.id).eq("revision",existing.revision).select("revision").single();
    if(r.error||!r.data){
      badgeMsg("Push refused — cloud revision changed mid-write. Re-check and retry.",true);
      return{ok:false,conflict:true};
    }
    setLastSynced(r.data.revision,raw);
    badgeMsg("Pushed. Cloud now at revision "+r.data.revision+".");
    return{ok:true,revision:r.data.revision};
  }

  function wirePersistTracking(){
    if(wrapped||typeof Store==="undefined")return;wrapped=true;
    const old=Store.persist.bind(Store);
    Store.persist=function(){
      const ok=old();
      // No auto-push. Persisting locally never touches the network by itself —
      // sync only happens when PUSH is clicked.
      return ok;
    };
  }

  async function signIn(){const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Signing in...");const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;user=r.data.user;closeGate();onAuthenticated()}
  async function signUp(){const email=document.getElementById("pn-cloud-email").value.trim(),password=document.getElementById("pn-cloud-pass").value;message("Creating account...");const r=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});if(r.error)throw r.error;if(r.data.session){user=r.data.user;closeGate();onAuthenticated()}else message("Account created. Confirm the email, then return here and sign in.")}
  function wireGate(){shell();document.getElementById("pn-cloud-signin").onclick=()=>signIn().catch(e=>message(e.message||String(e),true));document.getElementById("pn-cloud-signup").onclick=()=>signUp().catch(e=>message(e.message||String(e),true));document.getElementById("pn-cloud-local").onclick=()=>{closeGate();sessionStorage.setItem("pn_cloud_local_only","1")}}

  function onAuthenticated(){
    wirePersistTracking();
    const badge=syncBadge();
    document.getElementById("pn-cloud-pull").onclick=()=>pullFromCloud(false).catch(e=>badgeMsg(e.message||String(e),true));
    document.getElementById("pn-cloud-push").onclick=()=>pushToCloud().catch(e=>badgeMsg(e.message||String(e),true));
    document.getElementById("pn-cloud-signout").onclick=async()=>{await client.auth.signOut();user=null;badge.remove();badgeMsg("")};
    badgeMsg("Connected as "+user.email+". No auto-sync — use PULL / PUSH.");
  }

  async function boot(){
    if(!window.supabase||!window.supabase.createClient){console.error("PROFITNODE CLOUD: Supabase client missing");return}
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const r=await client.auth.getUser();
    if(r.data&&r.data.user){
      // KEY FIX: an existing session NEVER auto-pulls or auto-overwrites anything.
      // It just surfaces manual PULL/PUSH controls.
      user=r.data.user;
      onAuthenticated();
    } else if(!sessionStorage.getItem("pn_cloud_local_only")){
      wireGate();
    }
    client.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){user=null;const b=document.getElementById("pn-cloud-badge");if(b)b.remove()}
      else if(session&&session.user&&!user){user=session.user;const g=document.getElementById("pn-cloud-gate");if(g)g.remove();onAuthenticated()}
    });
  }

  const style=document.createElement("style");
  style.textContent='#pn-cloud-gate{position:fixed;inset:0;z-index:9999;background:rgba(5,3,9,.9);display:grid;place-items:center;padding:20px}.pn-cloud-card{width:min(430px,100%);background:#15111c;border:1px solid #7e22ce;box-shadow:0 0 40px rgba(168,85,247,.25);padding:24px;font-family:IBM Plex Mono,monospace}.pn-cloud-kicker{font-size:10px;letter-spacing:.16em;color:#a855f7}.pn-cloud-card h2{margin:6px 0 8px;font:700 24px Oswald,sans-serif}.pn-cloud-card p{color:#c6bbd3;min-height:34px}.pn-cloud-card input{margin:5px 0}.pn-cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.pn-cloud-card button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:9px;cursor:pointer;font:600 11px Oswald,sans-serif;letter-spacing:.05em}.pn-cloud-card button:hover{border-color:#a855f7}.pn-cloud-card #pn-cloud-local{width:100%;margin-top:8px;color:#a89faf}'
    +'#pn-cloud-badge{position:fixed;right:14px;bottom:14px;z-index:9998;background:#15111c;border:1px solid #4a3760;padding:8px 10px;font:600 10px IBM Plex Mono,monospace;display:flex;gap:8px;align-items:center;color:#c6bbd3}#pn-cloud-badge button{background:#261e32;color:#fff;border:1px solid #4a3760;padding:4px 8px;cursor:pointer;font:600 10px Oswald,sans-serif}#pn-cloud-badge button:hover{border-color:#a855f7}';
  document.head.appendChild(style);

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>boot().catch(console.error));else boot().catch(console.error);
})();
