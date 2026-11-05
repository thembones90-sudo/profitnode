"use strict";

(function installBloodworksPremiumVisualV3(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksPremiumV3) return;

  const style = document.createElement("style");
  style.id = "pn-bloodworks-premium-v3";
  style.textContent = `
    .pn-rig-cmd-top{
      position:relative;isolation:isolate;min-height:104px;padding-top:18px!important;padding-bottom:18px!important;
      border-bottom:1px solid rgba(255,48,82,.58)!important;
      background:
        linear-gradient(90deg,rgba(255,31,69,.13),transparent 20%,transparent 78%,rgba(255,31,69,.035)),
        repeating-linear-gradient(90deg,transparent 0 95px,rgba(255,255,255,.014) 96px),
        linear-gradient(180deg,#120e18,#0d0b12)!important;
      box-shadow:0 12px 34px rgba(0,0,0,.42),inset 0 -1px rgba(255,99,124,.18)}
    .pn-rig-cmd-top:before{content:"";position:absolute;left:18px;top:18px;bottom:18px;width:3px;background:linear-gradient(#ff5c78,#c90d35);box-shadow:0 0 18px rgba(255,35,73,.48)}
    .pn-rig-cmd-top:after{content:"";position:absolute;z-index:-1;right:17%;top:0;width:24%;height:100%;opacity:.32;background:linear-gradient(120deg,transparent 40%,rgba(255,255,255,.035) 40.2%,transparent 40.6%,transparent 58%,rgba(255,35,73,.06) 58.2%,transparent 58.7%)}
    .pn-rig-cmd-top h1{font-size:38px!important;letter-spacing:.065em!important;text-shadow:0 0 24px rgba(255,255,255,.08)}
    .pn-rig-cmd-top h1:before{margin-bottom:7px!important;font-size:11px!important;letter-spacing:.34em!important;color:#ff4968!important}
    .pn-rig-cmd-top .sub{font-size:13px!important;color:#bdb3c3!important;letter-spacing:.035em}
    .pn-rig-cmd-top .topbar-actions{gap:9px}
    .pn-rig-cmd-top .topbar-actions .btn{min-height:40px!important;padding:9px 20px!important;border-color:rgba(255,77,107,.34)!important;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,35,73,.045))!important;box-shadow:inset 0 1px rgba(255,255,255,.05)}
    .pn-rig-cmd-top .topbar-actions .btn-primary{border-color:#ff5874!important;background:linear-gradient(180deg,#ff3f60,#ca1038)!important;box-shadow:inset 0 1px rgba(255,255,255,.22),0 8px 22px rgba(184,8,42,.28)!important}

    .pn-rig-cmd[data-bloodworks-premium="v3"]{
      --bw-red:#ff2349;--bw-red-hi:#ff5f79;--bw-line:rgba(255,69,101,.25);--bw-edge:rgba(255,255,255,.075);
      counter-reset:bw-bay;background:radial-gradient(circle at 70% 0,rgba(255,35,73,.045),transparent 28%),linear-gradient(180deg,rgba(10,8,14,.16),rgba(10,8,14,.4))}
    .pn-rig-cmd[data-rig-view=editor]{padding:16px clamp(14px,1.6vw,34px) 38px!important;max-width:none!important}

    .pn-rig-cmd .panel,.pn-rig-cmd .pn-rig-fold,.pn-rig-cmd .pn-rig-budget,.pn-rig-cmd .pn-rig-how{
      border-color:var(--bw-line)!important;background:linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),linear-gradient(180deg,rgba(24,19,31,.97),rgba(14,11,20,.97))!important;
      box-shadow:inset 0 1px rgba(255,255,255,.035),0 14px 34px rgba(0,0,0,.2)}
    .pn-rig-cmd .panel-title,.pn-rig-cmd .pn-rig-fold>summary,.pn-rig-cmd .pn-rig-how>summary{
      border-bottom-color:rgba(255,64,97,.17)!important;background:linear-gradient(90deg,rgba(255,35,73,.07),transparent 32%)!important}
    .pn-rig-cmd .panel-title:before,.pn-rig-cmd .pn-rig-fold>summary:before{background:var(--bw-red)!important;box-shadow:0 0 11px rgba(255,35,73,.5)}
    .pn-rig-cmd .pn-rig-fold>summary b,.pn-rig-cmd .pn-rig-how>summary,.pn-rig-cmd .pn-rig-fold>summary i{color:#f2edf4!important}
    .pn-rig-cmd .pn-rig-fold>summary span{color:#a99fab!important}
    .pn-rig-cmd .pn-rig-fold[open]>summary i,.pn-rig-cmd .pn-rig-how[open]>summary{color:var(--bw-red-hi)!important}

    .pn-rig-cmd .pn-rig-budget{margin-bottom:14px!important;border-left-width:3px!important;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)!important}
    .pn-rig-cmd .pn-rig-budget:after{content:"";position:absolute;right:0;top:0;width:140px;height:1px;background:linear-gradient(90deg,transparent,var(--budget-tone));opacity:.75}
    .pn-rig-cmd .pn-rig-budget-meter{height:9px!important;background:#09070d!important;border-color:rgba(255,255,255,.08)!important}

    .pn-rig-cmd .pn-bw-bay-count{margin-left:auto;padding:4px 9px;border:1px solid rgba(255,255,255,.09);color:#bcb3c2;background:rgba(7,6,10,.42);font:700 9px/1 var(--font-mono);letter-spacing:.14em;white-space:nowrap}
    .pn-rig-cmd .pn-bw-bay-count b{color:#fff;font-size:11px}
    .pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type{overflow:visible;clip-path:none!important;border:1px solid rgba(255,48,82,.3)!important;background:linear-gradient(180deg,rgba(26,20,34,.97),rgba(13,11,18,.97))!important}
    .pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type>.panel-head{min-height:49px;padding:10px 15px!important;border-bottom:1px solid rgba(255,56,90,.22)!important;background:linear-gradient(90deg,rgba(255,35,73,.1),transparent 42%)!important}
    .pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type>.panel-head h2{font-size:17px!important;letter-spacing:.24em!important}
    .pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type>.panel-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:10px!important;background:repeating-linear-gradient(90deg,rgba(255,255,255,.012) 0 1px,transparent 1px 48px)}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-columns{display:none!important}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row{
      --rc:#9fb4c8;counter-increment:bw-bay;position:relative;display:grid!important;
      grid-template-columns:minmax(0,1fr) 94px 94px auto!important;grid-template-areas:"label label label label" "control control control control" ". paid original actions";
      gap:7px 10px!important;align-content:start;min-width:0;min-height:110px;margin:0!important;padding:11px 14px 10px 16px!important;
      border:1px solid color-mix(in srgb,var(--rc) 28%,rgba(255,255,255,.025))!important;border-left:3px solid var(--rc)!important;clip-path:polygon(0 0,calc(100% - 13px) 0,100% 13px,100% 100%,0 100%)!important;
      background:linear-gradient(105deg,color-mix(in srgb,var(--rc) 9%,transparent),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.018),rgba(6,5,10,.3))!important;
      box-shadow:inset 0 1px rgba(255,255,255,.025),0 8px 22px rgba(0,0,0,.16)!important;transition:border-color .17s ease,background .17s ease,transform .17s ease,box-shadow .17s ease}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:before{content:"";position:absolute;left:0;top:0;width:35%;height:1px;background:linear-gradient(90deg,var(--rc),transparent);opacity:.72}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:after{content:"BAY " counter(bw-bay,decimal-leading-zero);position:absolute;right:13px;top:14px;color:rgba(224,215,228,.34);font:700 8px/1 var(--font-mono);letter-spacing:.18em;pointer-events:none}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--rc) 48%,rgba(255,255,255,.05))!important;background:linear-gradient(105deg,color-mix(in srgb,var(--rc) 13%,transparent),transparent 38%),linear-gradient(180deg,rgba(255,255,255,.025),rgba(6,5,10,.3))!important;box-shadow:inset 0 1px rgba(255,255,255,.035),0 12px 28px rgba(0,0,0,.23)!important}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:has(.ram-config-grid),
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:has(.pn-cap-details){grid-column:1/-1}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:has(.rig-empty-slot){min-height:92px}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-label{grid-area:label;padding:0 74px 3px 0!important;font-size:15px!important;letter-spacing:.15em!important;color:var(--rc)!important;text-shadow:0 0 13px color-mix(in srgb,var(--rc) 32%,transparent)}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-control{grid-area:control;display:grid;grid-template-columns:minmax(138px,175px) minmax(0,1fr);gap:9px;min-width:0}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-control>select{width:100%;min-width:0}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-detail{min-width:0}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-price{grid-area:paid;position:relative;padding-top:15px}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-price.is-secondary{grid-area:original}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-price:before{content:attr(data-label);position:absolute;left:2px;top:1px;color:#786f7e;font:700 7px/1 var(--font-mono);letter-spacing:.12em;white-space:nowrap}
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-actions{grid-area:actions;align-self:end;padding:15px 0 0}
    .pn-rig-cmd[data-rig-view=editor] .rig-empty-slot{min-width:0;width:auto}
    .pn-rig-cmd[data-rig-view=editor] .rig-add-storage{grid-column:1/-1;justify-self:start;margin:3px 0 0!important}

    .pn-rig-cmd input,.pn-rig-cmd select,.pn-rig-cmd textarea{border-color:rgba(131,113,143,.4)!important;background:rgba(7,6,11,.72)!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
    .pn-rig-cmd input:focus,.pn-rig-cmd select:focus,.pn-rig-cmd textarea:focus{border-color:rgba(255,75,106,.76)!important;background:#110d17!important;box-shadow:0 0 0 2px rgba(255,35,73,.1),0 0 18px rgba(255,35,73,.075)!important;outline:0}
    .pn-rig-cmd .btn.primary{background:linear-gradient(180deg,#ff4664,#c81037);border-color:#ff6078;box-shadow:inset 0 1px rgba(255,255,255,.22),0 5px 16px rgba(188,10,45,.24)}

    .pn-rig-cmd .pn-build-check{position:relative;overflow:hidden}
    .pn-rig-cmd .pn-bc-tile{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008));border-color:rgba(255,255,255,.075)!important;box-shadow:inset 0 1px rgba(255,255,255,.02)}
    .pn-rig-cmd .pn-pb-rating{background:radial-gradient(circle at 92% 10%,rgba(255,35,73,.07),transparent 25%),linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),linear-gradient(180deg,rgba(24,19,31,.97),rgba(14,11,20,.97))!important}
    .pn-rig-cmd .pn-shop-read{border-color:rgba(255,35,73,.23)!important;background:linear-gradient(90deg,rgba(255,35,73,.06),rgba(14,11,20,.92) 36%)!important}
    .pn-rig-cmd .pn-rig-results-primary{gap:8px!important}
    .pn-rig-cmd .pn-rig-results-primary>.kpi{border-color:color-mix(in srgb,var(--k) 30%,transparent)!important;background:linear-gradient(150deg,color-mix(in srgb,var(--k) 9%,transparent),rgba(10,8,15,.72) 68%)!important;box-shadow:inset 0 1px rgba(255,255,255,.025),0 10px 24px rgba(0,0,0,.17)!important}

    @media(max-width:1550px){
      .pn-rig-cmd[data-rig-view=editor]>.panel:first-of-type>.panel-body{grid-template-columns:minmax(0,1fr)}
      .pn-rig-cmd[data-rig-view=editor] .rig-slot-row:has(.ram-config-grid),.pn-rig-cmd[data-rig-view=editor] .rig-slot-row:has(.pn-cap-details){grid-column:auto}
    }
    @media(max-width:760px){
      .pn-rig-cmd-top:before{left:8px}.pn-rig-cmd-top h1{font-size:29px!important}.pn-rig-cmd[data-rig-view=editor]{padding-inline:8px!important}
      .pn-rig-cmd[data-rig-view=editor] .rig-slot-row{grid-template-columns:1fr 1fr!important;grid-template-areas:"label label" "control control" "paid original" "actions actions";min-height:0}
      .pn-rig-cmd[data-rig-view=editor] .rig-slot-control{grid-template-columns:minmax(0,1fr)}
      .pn-rig-cmd .pn-bw-bay-count{display:none}
    }
    @media(prefers-reduced-motion:reduce){.pn-rig-cmd *{transition:none!important}.pn-rig-cmd[data-rig-view=editor] .rig-slot-row:hover{transform:none}}
  `;
  document.head.appendChild(style);

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    const match = html.match(/<div data-rig-view="([^"]+)" class="pn-rig-cmd content([^"]*)">/);
    if (!match) return html;
    html = html.replace(match[0], match[0].replace('>', ' data-bloodworks-premium="v3">'));
    if (match[1] === "editor") {
      const total = (html.match(/class="rig-slot-row/g) || []).length;
      const empty = (html.match(/class="rig-empty-slot/g) || []).length;
      const configured = Math.max(0, total - empty);
      html = html.replace('<div class="panel-head"><h2>Slots</h2></div>', '<div class="panel-head"><h2>Component Bays</h2><span class="pn-bw-bay-count"><b>' + configured + '</b> / ' + total + ' CONFIGURED</span></div>');
    }
    return html;
  };
  route.__pnBloodworksPremiumV3 = true;
})();
