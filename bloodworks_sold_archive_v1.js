"use strict";
/*
  BLOODWORKS is the ACTIVE workshop. Sold rigs remain immutable historic
  records in Sales and Hall of Legends. No Store writes in this extension.
*/
(function installBloodworksSoldArchiveV1(){
  if(typeof ROUTES==="undefined"||typeof rigFamilies!=="function")return;
  const route=ROUTES.find(r=>r&&r.key==="rigbuild");
  if(!route||route.__pnSoldArchiveV1)return;
  const baseFamilies=rigFamilies;
  rigFamilies=function(){
    return baseFamilies().map(f=>Object.assign({},f,{
      variants:f.variants.filter(r=>r.status!=="SOLD")
    })).filter(f=>f.variants.length>0);
  };
  const baseRender=route.render;
  route.render=function(){
    const draft=state.rigDraft;
    if(draft&&draft.id){
      const current=Store.get("rigs",draft.id);
      if(current&&current.status==="SOLD"){
        state.rigDraft=null;
        state.rigFamilyView=null;
        state.rigNotice={tone:"ok",text:current.family+" is SOLD. Its completed transaction and component history remain in Sales."};
      }
    }
    if(state.rigFamilyView&&!rigFamilies().some(f=>f.family===state.rigFamilyView)){
      state.rigFamilyView=null;
    }
    let html=String(baseRender.apply(this,arguments));
    if(!state.rigDraft&&!state.rigFamilyView){
      const sold=Store.all("rigs").filter(r=>r.status==="SOLD");
      if(sold.length){
        const note='<div class="pn-bloodworks-sold-archive" role="status" style="margin:8px 0 14px;padding:12px 14px;border:1px solid rgba(62,224,122,.22);border-left:3px solid #3ee07a;background:rgba(62,224,122,.04);font-size:12px;color:#bdb3c3;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between"><span><strong style="color:#3ee07a">'+sold.length+' SOLD RIG'+(sold.length===1?'':'S')+'</strong> moved out of the active workshop. Completed sales are preserved in the ledger.</span><button type="button" class="btn btn-sm" data-route="sales">VIEW SALES LEDGER</button></div>';
        html=html.replace('<div class="info-note">',note+'<div class="info-note">');
      }
    }
    return html;
  };
  route.__pnSoldArchiveV1=true;
})();
