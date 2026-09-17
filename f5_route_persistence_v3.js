"use strict";
(function(){
  if(window.__PN_F5_ROUTE_V3__)return;window.__PN_F5_ROUTE_V3__=true;
  const KEY="profitnode_ui_resume_v3";
  function save(){try{if(typeof state==="undefined")return;localStorage.setItem(KEY,JSON.stringify({route:state.route||"dashboard",pbId:state.pbId||null,savedAt:Date.now()}))}catch(_){ }}
  function restore(){try{if(typeof state==="undefined"||typeof ROUTES==="undefined"||typeof render!=="function")return;const saved=JSON.parse(localStorage.getItem(KEY)||"null");if(!saved)return;let route=String(saved.route||"dashboard");if(route==="projectbuild"){const project=saved.pbId&&typeof Store!=="undefined"?Store.get("projects",saved.pbId):null;if(project)state.pbId=saved.pbId;else{route="projects";state.pbId=null}}if(!ROUTES.some(r=>r&&r.key===route))route="dashboard";state.route=route;render()}catch(err){console.warn("[PROFITNODE] F5 route restore skipped:",err)}}
  document.addEventListener("click",function(){setTimeout(save,0)},false);window.addEventListener("pagehide",save);window.addEventListener("beforeunload",save);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(restore,0)},{once:true});else setTimeout(restore,0);
  window.pnF5RouteV3={save,restore,clear:function(){try{localStorage.removeItem(KEY)}catch(_){}}};
  console.info("[PROFITNODE] F5 ROUTE PERSISTENCE V3 ACTIVE");
})();
