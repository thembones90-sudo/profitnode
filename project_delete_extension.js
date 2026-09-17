"use strict";

/* PROFITNODE BUILD DELETE v1
   Adds a deliberate, typed-confirmation DELETE BUILD flow to Build Workspace.
   Uses canonical Actions.removeProject(), which detaches real inventory from the
   project and returns non-sold items to IN_STORAGE before removing the project.
   Planned-only slots/extras disappear with the project record. Accounting/sales
   history is intentionally untouched.
*/

const PNDeleteUI={projectId:null,typed:""};

function pnDeleteProjectCounts(project){
  const slots=(typeof PROJECT_BUILD_SLOTS!=="undefined"?PROJECT_BUILD_SLOTS:[])
    .map(k=>project&&project.slots?project.slots[k]:null).filter(Boolean);
  const extras=Array.isArray(project&&project.extras)?project.extras:[];
  const owned=slots.filter(s=>s&&s.kind==="INVENTORY").length+extras.filter(x=>x&&x.inventoryItemId).length;
  const planned=slots.filter(s=>s&&s.kind==="PLANNED").length+extras.filter(x=>x&&!x.inventoryItemId).length;
  return{owned,planned,total:owned+planned};
}

function pnDeleteProjectModal(project){
  if(!project||PNDeleteUI.projectId!==project.id)return"";
  const c=pnDeleteProjectCounts(project);
  const historical=["COMPLETED","LISTED","SOLD"].includes(project.status);
  return '<div class="pn-delete-backdrop" data-pn-delete-backdrop>'+
    '<section class="pn-delete-modal" role="dialog" aria-modal="true" aria-labelledby="pn-delete-title">'+
      '<div class="pn-delete-kicker">DANGER // BUILD PURGE</div>'+
      '<h2 id="pn-delete-title">DELETE BUILD</h2>'+
      '<p class="pn-delete-lead">You are about to purge <b>'+escHtml(project.name)+'</b> from the build roster.</p>'+
      '<div class="pn-delete-facts">'+
        '<div><span>STATUS</span><b>'+escHtml(typeof STATUS_LABEL==="function"?STATUS_LABEL(project.status):project.status)+'</b></div>'+
        '<div><span>OWNED / VAULT-LINKED</span><b>'+c.owned+'</b></div>'+
        '<div><span>PLANNED ONLY</span><b>'+c.planned+'</b></div>'+
      '</div>'+
      '<div class="pn-delete-rules">'+
        '<p><b>OWNED PARTS SURVIVE.</b> Real inventory is detached from this build and returned to PARTS VAULT / storage unless it is already SOLD.</p>'+
        '<p><b>PLANNED PARTS ARE PURGED.</b> Anything not yet owned exists only inside this build and disappears with it.</p>'+
        (historical?'<p class="is-history"><b>HISTORICAL WARNING.</b> Existing sales, treasury effects and timeline history are not erased. Only the build record is removed.</p>':'')+
      '</div>'+
      '<label class="pn-delete-confirm-field"><span>TYPE <b>'+escHtml(project.name)+'</b> TO CONFIRM</span><input type="text" autocomplete="off" spellcheck="false" data-pn-delete-confirm-name value="'+escAttr(PNDeleteUI.typed||"")+'"></label>'+
      '<div class="pn-delete-actions">'+
        '<button type="button" class="btn" data-pn-delete-cancel>ABORT</button>'+
        '<button type="button" class="btn btn-danger pn-delete-confirm" data-pn-delete-confirm disabled>PURGE BUILD</button>'+
      '</div>'+
    '</section>'+
  '</div>';
}

if(typeof renderProjectBuild==="function"){
  const PNCoreRenderProjectBuildDeleteV1=renderProjectBuild;
  renderProjectBuild=function(){
    let html=PNCoreRenderProjectBuildDeleteV1.apply(this,arguments);
    let project=null;
    try{project=typeof pbProject==="function"?pbProject():null}catch(_){project=null}
    if(!project)return html;
    const button='<button type="button" class="btn btn-sm btn-danger pn-delete-build-btn" data-pn-delete-project="'+project.id+'">DELETE BUILD</button>';
    if(!String(html).includes('data-pn-delete-project=')){
      html=String(html).replace('</div></div><!--PN_DELETE_ANCHOR-->',button+'</div></div>');
      if(!String(html).includes('data-pn-delete-project=')){
        html=String(html).replace(/(<div class="pn-pb-hero-actions">[\s\S]*?)(<\/div><\/div>)/,function(_,a,b){return a+button+b});
      }
    }
    return String(html)+pnDeleteProjectModal(project);
  };
}

/* RIG ASSEMBLY already has canonical delete logic. Make the action explicit. */
if(typeof renderRigEditor==="function"){
  const PNCoreRenderRigEditorDeleteV1=renderRigEditor;
  renderRigEditor=function(){
    let html=PNCoreRenderRigEditorDeleteV1.apply(this,arguments);
    html=String(html).replace(/(<button[^>]*data-confirm-delete="rig:[^"]+"[^>]*>)DELETE(<\/button>)/g,"$1DELETE RIG$2");
    return html;
  };
}

function pnDeleteReset(){PNDeleteUI.projectId=null;PNDeleteUI.typed=""}
function pnDeleteReturnToProjects(){
  pnDeleteReset();
  if(typeof PBUI!=="undefined"){
    PBUI.slotKey=null;PBUI.slot=null;PBUI.query="";PBUI.results=[];PBUI.caseDraft=null;PBUI.extraDraft=null;PBUI.quickPrice=null;PBUI.notice=null;
  }
  if(typeof state!=="undefined"){state.pbId=null;state.route="projects"}
  if(typeof render==="function")render();
}

if(typeof document!=="undefined"&&document.addEventListener){
  document.addEventListener("click",function(e){
    const open=e.target&&e.target.closest?e.target.closest("[data-pn-delete-project]"):null;
    if(open){
      e.preventDefault();e.stopPropagation();
      const id=open.dataset.pnDeleteProject;
      const p=typeof Store!=="undefined"?Store.get("projects",id):null;
      if(!p)return;
      PNDeleteUI.projectId=id;PNDeleteUI.typed="";
      if(typeof render==="function")render();
      setTimeout(function(){const el=document.querySelector("[data-pn-delete-confirm-name]");if(el)el.focus()},0);
      return;
    }
    if(e.target&&e.target.closest&&e.target.closest("[data-pn-delete-cancel]")){
      e.preventDefault();pnDeleteReset();if(typeof render==="function")render();return;
    }
    if(e.target&&e.target.matches&&e.target.matches("[data-pn-delete-backdrop]")){
      pnDeleteReset();if(typeof render==="function")render();return;
    }
    const confirm=e.target&&e.target.closest?e.target.closest("[data-pn-delete-confirm]"):null;
    if(confirm){
      e.preventDefault();e.stopPropagation();
      const p=PNDeleteUI.projectId&&typeof Store!=="undefined"?Store.get("projects",PNDeleteUI.projectId):null;
      if(!p)return pnDeleteReturnToProjects();
      if(String(PNDeleteUI.typed||"").trim()!==String(p.name||"").trim())return;
      if(typeof Actions!=="undefined"&&typeof Actions.removeProject==="function")Actions.removeProject(p.id);
      if(typeof PB_COMPAT_STATE!=="undefined"&&PB_COMPAT_STATE[p.id])delete PB_COMPAT_STATE[p.id];
      pnDeleteReturnToProjects();
    }
  },true);

  document.addEventListener("input",function(e){
    const input=e.target&&e.target.matches&&e.target.matches("[data-pn-delete-confirm-name]")?e.target:null;
    if(!input)return;
    PNDeleteUI.typed=input.value;
    const p=PNDeleteUI.projectId&&typeof Store!=="undefined"?Store.get("projects",PNDeleteUI.projectId):null;
    const ok=!!p&&String(input.value||"").trim()===String(p.name||"").trim();
    const btn=document.querySelector("[data-pn-delete-confirm]");
    if(btn)btn.disabled=!ok;
  });

  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&PNDeleteUI.projectId){pnDeleteReset();if(typeof render==="function")render()}
  });

  const style=document.createElement("style");
  style.id="pn-project-delete-v1";
  style.textContent=`
.pn-delete-build-btn{margin-left:auto;border-color:rgba(255,76,96,.62)!important;color:#ff7182!important;background:rgba(255,58,80,.07)!important}
.pn-delete-build-btn:hover{border-color:#ff4c60!important;background:rgba(255,58,80,.15)!important;color:#ffd8dd!important}
.pn-delete-backdrop{position:fixed;inset:0;z-index:99990;display:grid;place-items:center;padding:22px;background:rgba(4,3,8,.82);backdrop-filter:blur(7px)}
.pn-delete-modal{width:min(620px,calc(100vw - 28px));border:1px solid rgba(255,77,96,.55);border-top:2px solid #ff4d60;border-radius:6px;padding:20px;background:linear-gradient(145deg,rgba(31,18,31,.98),rgba(13,10,18,.99));box-shadow:0 24px 80px rgba(0,0,0,.65),0 0 34px rgba(255,50,74,.08)}
.pn-delete-kicker{font:800 9px var(--mono);letter-spacing:.22em;color:#ff7182;margin-bottom:7px}.pn-delete-modal h2{font-size:28px;line-height:1;margin:0 0 12px;color:#fff}.pn-delete-lead{margin:0 0 14px;color:var(--text-muted);font-size:12px;line-height:1.55}
.pn-delete-facts{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border);margin:0 0 14px;background:rgba(255,255,255,.018)}.pn-delete-facts>div{padding:10px 11px;border-right:1px solid var(--border)}.pn-delete-facts>div:last-child{border-right:0}.pn-delete-facts span{display:block;font:700 7.5px var(--mono);letter-spacing:.11em;color:var(--text-muted);margin-bottom:4px}.pn-delete-facts b{font:900 13px var(--mono);color:var(--text)}
.pn-delete-rules{border-left:2px solid rgba(255,77,96,.7);padding:2px 0 2px 12px;margin:0 0 14px}.pn-delete-rules p{margin:0 0 7px;font-size:11px;line-height:1.45;color:var(--text-muted)}.pn-delete-rules p:last-child{margin-bottom:0}.pn-delete-rules b{color:#fff}.pn-delete-rules .is-history{color:#e6b66b}
.pn-delete-confirm-field{display:block}.pn-delete-confirm-field>span{display:block;font:700 8px var(--mono);letter-spacing:.1em;color:var(--text-muted);margin-bottom:6px}.pn-delete-confirm-field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,77,96,.38);background:#0b0910;color:#fff;padding:10px 11px;font:800 12px var(--mono);outline:none}.pn-delete-confirm-field input:focus{border-color:#ff5b70;box-shadow:0 0 0 2px rgba(255,77,96,.08)}
.pn-delete-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.pn-delete-confirm:disabled{opacity:.32;cursor:not-allowed;filter:saturate(.45)}
@media(max-width:640px){.pn-delete-facts{grid-template-columns:1fr}.pn-delete-facts>div{border-right:0;border-bottom:1px solid var(--border)}.pn-delete-facts>div:last-child{border-bottom:0}.pn-delete-build-btn{margin-left:0}.pn-delete-actions{display:grid;grid-template-columns:1fr 1fr}.pn-delete-actions .btn{width:100%}}
`;
  document.head.appendChild(style);
}
