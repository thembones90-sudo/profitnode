"use strict";

(function installBloodworksPremiumVisualV2(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksPremiumV2) return;

  const style = document.createElement("style");
  style.id = "pn-bloodworks-premium-v2";
  style.textContent = `
    .pn-rig-cmd-top{position:relative;isolation:isolate;border-bottom-color:rgba(255,35,73,.58)!important;background:
      linear-gradient(90deg,rgba(255,35,73,.13),transparent 24%,transparent 76%,rgba(255,35,73,.06)),
      repeating-linear-gradient(90deg,transparent 0 79px,rgba(255,255,255,.018) 80px),#100d16!important;box-shadow:0 10px 30px rgba(0,0,0,.42),inset 0 -1px rgba(255,84,111,.18)}
    .pn-rig-cmd-top:after{content:"";position:absolute;z-index:-1;inset:auto 0 0;height:1px;background:linear-gradient(90deg,transparent,#ff2349 14%,#ff6b83 50%,#ff2349 86%,transparent);opacity:.68;box-shadow:0 0 14px rgba(255,35,73,.65)}
    .pn-rig-cmd-top h1{letter-spacing:.055em;text-shadow:0 0 22px rgba(255,255,255,.08)}
    .pn-rig-cmd-top .sub{color:#b9afc1;letter-spacing:.04em}
    .pn-rig-cmd[data-bloodworks-premium="v1"]{--bw-red:#ff2349;--bw-red-soft:#ff5a74;--bw-line:rgba(255,62,94,.28);--bw-carbon:#100d16;--bw-panel:rgba(20,16,28,.94);counter-reset:bw-bay;background:
      radial-gradient(circle at 72% 0,rgba(255,35,73,.055),transparent 27%),
      linear-gradient(180deg,rgba(12,9,17,.08),rgba(12,9,17,.35))}
    .pn-bloodworks-bus{min-height:34px;margin:0 0 9px;display:flex;align-items:center;gap:18px;padding:0 13px;border:1px solid rgba(255,35,73,.24);border-left:3px solid var(--bw-red);background:linear-gradient(90deg,rgba(255,35,73,.09),rgba(16,13,22,.9) 22%,rgba(16,13,22,.78));clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);box-shadow:inset 0 1px rgba(255,255,255,.025),0 8px 22px rgba(0,0,0,.24);font:700 10px/1 var(--font-mono);letter-spacing:.16em;color:#817787}
    .pn-bloodworks-bus b{color:#f6eff7;font-size:11px;letter-spacing:.12em}
    .pn-bloodworks-bus .is-live{color:#49df87;display:flex;align-items:center;gap:7px}
    .pn-bloodworks-bus .is-live i{width:6px;height:6px;border-radius:50%;background:#49df87;box-shadow:0 0 8px #49df87}
    .pn-bloodworks-bus .pn-bw-rule{height:12px;width:1px;background:rgba(255,255,255,.09)}
    .pn-rig-cmd .panel,.pn-rig-cmd .pn-rig-fold,.pn-rig-cmd .pn-rig-budget,.pn-rig-cmd .pn-rig-how{border-color:var(--bw-line)!important;background:
      linear-gradient(135deg,rgba(255,255,255,.018),transparent 28%),
      linear-gradient(180deg,rgba(25,20,33,.96),rgba(15,12,21,.96))!important;box-shadow:inset 0 1px rgba(255,255,255,.025),0 11px 28px rgba(0,0,0,.22)}
    .pn-rig-cmd .panel-title,.pn-rig-cmd .pn-rig-fold>summary,.pn-rig-cmd .pn-rig-how>summary{border-bottom-color:rgba(255,35,73,.19)!important;background:linear-gradient(90deg,rgba(255,35,73,.075),transparent 38%)!important}
    .pn-rig-cmd .panel-title:before,.pn-rig-cmd .pn-rig-fold>summary:before{background:var(--bw-red)!important;box-shadow:0 0 10px rgba(255,35,73,.58)}
    .pn-rig-cmd .pn-rig-fold>summary b,.pn-rig-cmd .pn-rig-how>summary,.pn-rig-cmd .pn-rig-fold>summary i{color:#f1eaf3!important}
    .pn-rig-cmd .pn-rig-fold>summary span{color:#ab9fb0!important}
    .pn-rig-cmd .pn-rig-fold[open]>summary i,.pn-rig-cmd .pn-rig-how[open]>summary{color:var(--bw-red-soft)!important}
    .pn-rig-cmd .rig-slot-row{counter-increment:bw-bay;position:relative;transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease;box-shadow:inset 0 1px rgba(255,255,255,.016)}
    .pn-rig-cmd .rig-slot-row:after{content:"BAY " counter(bw-bay,decimal-leading-zero);position:absolute;top:6px;right:8px;color:rgba(220,210,224,.28);font:700 8px/1 var(--font-mono);letter-spacing:.14em;pointer-events:none}
    .pn-rig-cmd .rig-slot-row:hover{background-color:rgba(255,255,255,.022);border-color:color-mix(in srgb,var(--cat,#8d8295) 58%,transparent);box-shadow:inset 0 1px rgba(255,255,255,.025),0 0 20px rgba(0,0,0,.16)}
    .pn-rig-cmd .rig-slot-label{letter-spacing:.075em;text-shadow:0 0 13px color-mix(in srgb,var(--cat,#fff) 32%,transparent)}
    .pn-rig-cmd input,.pn-rig-cmd select,.pn-rig-cmd textarea{border-color:rgba(138,119,151,.38);background:#0e0b13;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
    .pn-rig-cmd input:focus,.pn-rig-cmd select:focus,.pn-rig-cmd textarea:focus{border-color:rgba(255,67,98,.72);background:#120e18;box-shadow:0 0 0 2px rgba(255,35,73,.11),0 0 18px rgba(255,35,73,.08);outline:0}
    .pn-rig-cmd .btn.primary{background:linear-gradient(180deg,#ff4765,#c91438);border-color:#ff6078;box-shadow:inset 0 1px rgba(255,255,255,.22),0 5px 16px rgba(188,10,45,.25)}
    .pn-rig-cmd .btn.primary:hover{filter:brightness(1.08);box-shadow:inset 0 1px rgba(255,255,255,.26),0 6px 20px rgba(255,35,73,.32)}
    .pn-rig-cmd .pn-rig-budget{position:relative;overflow:hidden}
    .pn-rig-cmd .pn-rig-budget:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--bw-red);box-shadow:0 0 13px rgba(255,35,73,.55)}
    .pn-rig-cmd .pn-rig-budget-meter{background:#09070d!important;border-color:rgba(255,255,255,.08)!important}
    .pn-rig-cmd .pn-build-check{position:relative;overflow:hidden}
    .pn-rig-cmd .pn-build-check:after{content:"VERIFICATION MATRIX";position:absolute;right:13px;top:10px;color:rgba(255,255,255,.17);font:700 8px/1 var(--font-mono);letter-spacing:.16em;pointer-events:none}
    .pn-rig-cmd .pn-bc-tile{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008));border-color:rgba(255,255,255,.075)!important;box-shadow:inset 0 1px rgba(255,255,255,.02)}
    .pn-rig-cmd .pn-pb-rating{background:
      radial-gradient(circle at 92% 10%,rgba(255,35,73,.08),transparent 25%),
      linear-gradient(135deg,rgba(255,255,255,.018),transparent 28%),linear-gradient(180deg,rgba(25,20,33,.96),rgba(15,12,21,.96))!important}
    .pn-rig-cmd .pn-shop-read{border-color:rgba(255,35,73,.24)!important;background:linear-gradient(90deg,rgba(255,35,73,.065),rgba(15,12,21,.9) 38%)!important}
    .pn-rig-cmd[data-rig-view="editor"]>*{width:min(1680px,100%);margin-left:auto!important;margin-right:auto!important;box-sizing:border-box}
    .pn-rig-cmd[data-rig-view="editor"]{padding-left:max(18px,calc((100% - 1740px)/2))!important;padding-right:max(18px,calc((100% - 1740px)/2))!important}
    .pn-rig-cmd .pn-bw-loadout{overflow:hidden;border-color:rgba(255,35,73,.38)!important;background:linear-gradient(180deg,rgba(27,21,35,.98),rgba(10,8,15,.98))!important;box-shadow:0 18px 50px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.035)}
    .pn-rig-cmd .pn-bw-loadout-head{min-height:62px!important;padding:11px 17px!important;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,rgba(255,35,73,.12),rgba(255,35,73,.025) 42%,transparent)!important}
    .pn-rig-cmd .pn-bw-loadout-head h2{margin:2px 0 0!important;font-size:18px!important;letter-spacing:.18em!important;color:#fff!important;text-shadow:0 0 20px rgba(255,35,73,.18)}
    .pn-rig-cmd .pn-bw-kicker{display:block;font:700 8px/1 var(--font-mono);letter-spacing:.24em;color:var(--bw-red-soft)}
    .pn-rig-cmd .pn-bw-baycount{padding:6px 10px;border:1px solid rgba(255,35,73,.3);background:rgba(255,35,73,.055);font:700 9px/1 var(--font-mono);letter-spacing:.18em;color:#cabfcf}
    .pn-rig-cmd .pn-bw-loadout>.panel-body{padding:10px 14px 14px!important}
    .pn-rig-cmd .pn-bw-column-head{grid-template-columns:138px minmax(0,1fr) 118px 118px 88px!important;margin:0 0 5px;padding:0 12px 7px!important;border-bottom:1px solid rgba(255,35,73,.24)!important;color:#766d7e!important}
    .pn-rig-cmd .pn-bw-column-head span{font-size:8px!important;letter-spacing:.18em!important}
    .pn-rig-cmd .rig-slot-row{grid-template-columns:138px minmax(0,1fr) 118px 118px 88px!important;gap:12px!important;min-height:67px;margin:5px 0!important;padding:10px 12px 10px 17px!important;align-items:center!important;border:1px solid color-mix(in srgb,var(--rc) 25%,rgba(255,255,255,.035))!important;border-left:3px solid var(--rc)!important;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 12%,#11101a) 0,rgba(17,14,24,.97) 24%,rgba(10,8,15,.97) 72%)!important;clip-path:polygon(0 0,calc(100% - 11px) 0,100% 11px,100% 100%,0 100%);box-shadow:inset 0 1px rgba(255,255,255,.025),inset 11px 0 30px -26px var(--rc)!important}
    .pn-rig-cmd .rig-slot-row:before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:2px;background:var(--rc);box-shadow:0 0 12px var(--rc);opacity:.72}
    .pn-rig-cmd .rig-slot-row:after{top:8px;right:12px;color:color-mix(in srgb,var(--rc) 24%,#665f6d);font-size:7px}
    .pn-rig-cmd .rig-slot-row:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--rc) 52%,transparent)!important;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 17%,#11101a),rgba(17,14,24,.99) 28%,rgba(10,8,15,.99) 72%)!important;box-shadow:inset 0 1px rgba(255,255,255,.04),0 10px 25px rgba(0,0,0,.3),0 0 18px color-mix(in srgb,var(--rc) 10%,transparent)!important}
    .pn-rig-cmd .rig-slot-label{position:relative;padding:0 0 0 9px!important;font-size:16px!important;line-height:1.15!important}
    .pn-rig-cmd .rig-slot-label:after{content:"COMPONENT";display:block;margin-top:6px;font:700 7px/1 var(--font-mono);letter-spacing:.2em;color:rgba(218,209,223,.28);text-shadow:none}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="CPU"]) .rig-slot-label:after{content:"PROCESSOR CORE"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="GPU"]) .rig-slot-label:after{content:"GRAPHICS CORE"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="RAM"]) .rig-slot-label:after{content:"MEMORY ARRAY"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="MOBO"]) .rig-slot-label:after{content:"SYSTEM BOARD"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="PSU"]) .rig-slot-label:after{content:"POWER CORE"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="CASE"]) .rig-slot-label:after{content:"CHASSIS"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode="COOLER"]) .rig-slot-label:after{content:"THERMAL SYSTEM"}
    .pn-rig-cmd .rig-slot-row:has([data-rig-slot-mode^="STORAGE"]) .rig-slot-label:after{content:"DATA VAULT"}
    .pn-rig-cmd .rig-slot-control{min-width:0;display:grid;grid-template-columns:190px minmax(0,1fr);gap:10px;align-items:start}
    .pn-rig-cmd .rig-slot-control>.rig-slot-detail{min-width:0;margin:0!important}
    .pn-rig-cmd .rig-slot-control>select{width:100%;min-width:0}
    .pn-rig-cmd .rig-slot-detail>input,.pn-rig-cmd .rig-slot-detail>select{width:100%;min-width:0}
    .pn-rig-cmd .rig-slot-row input,.pn-rig-cmd .rig-slot-row select{min-height:38px!important;border-color:rgba(255,35,73,.22)!important;background:linear-gradient(180deg,rgba(18,14,25,.96),rgba(8,7,13,.96))!important;font-size:13px!important}
    .pn-rig-cmd .rig-slot-price{align-self:stretch;display:flex;align-items:center}
    .pn-rig-cmd .rig-slot-price input{text-align:right;font:700 14px/1 var(--font-mono)!important}
    .pn-rig-cmd .rig-slot-actions{align-self:center}
    .pn-rig-cmd .rig-slot-actions .btn{min-width:76px;color:#d8cedc!important;border-color:color-mix(in srgb,var(--rc) 40%,transparent)!important;background:color-mix(in srgb,var(--rc) 8%,#0d0b12)!important}
    .pn-rig-cmd .rig-catalog-meta,.pn-rig-cmd .rig-catalog-help{grid-column:1/-1;margin:5px 0 0!important;color:#8e8495!important}
    .pn-rig-cmd .pn-rig-results-primary{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:9px!important;margin-top:10px!important}
    .pn-rig-cmd[data-rig-view="editor"][data-bloodworks-premium="v2"] .pn-rig-results-primary{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    .pn-rig-cmd .pn-rig-results-primary>.kpi{min-height:96px!important;padding:13px 15px 12px 18px!important;background:linear-gradient(145deg,color-mix(in srgb,var(--k) 8%,#17121e),#0b0910 68%)!important;border-color:color-mix(in srgb,var(--k) 28%,transparent)!important;clip-path:polygon(0 0,calc(100% - 13px) 0,100% 13px,100% 100%,0 100%)}
    .pn-rig-cmd .pn-rig-results-primary>.kpi:after{content:"";position:absolute;right:9px;top:9px;width:16px;height:1px;background:var(--k);opacity:.5}
    .pn-rig-cmd .pn-rig-results-primary .kpi-label{font-size:10px!important;letter-spacing:.17em!important}
    .pn-rig-cmd .pn-rig-results-primary .kpi-value,.pn-rig-cmd .pn-rig-results-primary .planner-kpi-input{font-size:25px!important}
    .pn-rig-cmd .pn-rig-results-primary .kpi-sub{font-size:10px!important;margin-top:5px!important}
    .pn-rig-cmd .pn-rig-fold{min-height:48px!important;margin-top:9px!important;border-left:3px solid rgba(255,35,73,.55)!important;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)}
    .pn-rig-cmd .pn-rig-fold>summary{min-height:48px!important;padding:9px 14px!important}
    .pn-rig-cmd .pn-shop-read{min-height:48px;display:grid!important;grid-template-columns:auto auto 1fr;gap:13px!important;align-items:center;padding:10px 15px!important;border-left:3px solid var(--bw-red)!important}
    .pn-rig-cmd .pn-shop-read>span:last-child{color:#b8aebd!important}
    @media (max-width:1350px){.pn-rig-cmd .rig-slot-control{grid-template-columns:160px minmax(0,1fr)}.pn-rig-cmd .rig-slot-row,.pn-rig-cmd .pn-bw-column-head{grid-template-columns:120px minmax(0,1fr) 105px 105px 80px!important}}
    @media (max-width:1180px){.pn-rig-cmd .rig-slot-row{grid-template-columns:1fr 1fr!important}.pn-rig-cmd .pn-bw-column-head{display:none!important}.pn-rig-cmd .rig-slot-control{grid-column:1/-1;grid-template-columns:180px minmax(0,1fr)}.pn-rig-cmd .rig-slot-label{grid-column:1/-1}.pn-rig-cmd .rig-slot-price{display:block}.pn-rig-cmd .rig-slot-actions{position:absolute;right:12px;top:29px}}
    @media (max-width:900px){.pn-bloodworks-bus{gap:10px;overflow:hidden}.pn-bloodworks-bus span:not(.is-live),.pn-bloodworks-bus .pn-bw-rule{display:none}.pn-rig-cmd[data-rig-view="editor"][data-bloodworks-premium="v2"] .pn-rig-results-primary{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media (max-width:620px){.pn-rig-cmd[data-rig-view="editor"]{padding-left:10px!important;padding-right:10px!important}.pn-rig-cmd .rig-slot-control{grid-template-columns:1fr}.pn-rig-cmd .rig-slot-row{grid-template-columns:1fr!important}.pn-rig-cmd .rig-slot-price,.pn-rig-cmd .rig-slot-actions{position:static;display:block}.pn-rig-cmd[data-rig-view="editor"][data-bloodworks-premium="v2"] .pn-rig-results-primary{grid-template-columns:1fr!important}.pn-rig-cmd .pn-shop-read{grid-template-columns:1fr!important}}
    @media (prefers-reduced-motion:reduce){.pn-rig-cmd *{transition:none!important}.pn-bloodworks-bus .is-live i{box-shadow:none}}
  `;
  document.head.appendChild(style);

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    const match = html.match(/<div data-rig-view="([^"]+)" class="pn-rig-cmd content([^"]*)">/);
    if (!match) return html;
    const view = match[1] === "editor" ? "CONFIGURATION BAY" : match[1] === "family" ? "BUILD LINE" : "FORGE CONTROL";
    const bus = '<div class="pn-bloodworks-bus" data-bloodworks-bus aria-label="BLOODWORKS systems status"><span class="is-live"><i></i>FORGE LINK · ACTIVE</span><span class="pn-bw-rule"></span><b>'+view+'</b><span>LIVE COST BASIS</span><span>COMPATIBILITY CORE</span></div>';
    html = html.replace(match[0], match[0].replace('>', ' data-bloodworks-premium="v2">') + bus);
    if (match[1] === "editor") {
      const bayCount = (html.match(/class="rig-slot-row/g) || []).length;
      html = html.replace('<div class="panel"><div class="panel-head"><h2>Slots</h2>', '<div class="panel pn-bw-loadout"><div class="panel-head pn-bw-loadout-head"><div><span class="pn-bw-kicker">HARDWARE MATRIX</span><h2>COMPONENT LOADOUT</h2></div><span class="pn-bw-baycount">'+bayCount+' BAYS ONLINE</span>');
      html = html.replace('<div class="rig-slot-columns">', '<div class="rig-slot-columns pn-bw-column-head">');
    }
    return html;
  };
  route.__pnBloodworksPremiumV2 = true;
})();
