"use strict";

(function installBloodworksPremiumVisualV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksPremiumV1) return;

  const style = document.createElement("style");
  style.id = "pn-bloodworks-premium-v1";
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
    @media (max-width:900px){.pn-bloodworks-bus{gap:10px;overflow:hidden}.pn-bloodworks-bus span:not(.is-live),.pn-bloodworks-bus .pn-bw-rule{display:none}}
    @media (prefers-reduced-motion:reduce){.pn-rig-cmd *{transition:none!important}.pn-bloodworks-bus .is-live i{box-shadow:none}}
  `;
  document.head.appendChild(style);

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    const match = html.match(/<div data-rig-view="([^"]+)" class="pn-rig-cmd content([^"]*)">/);
    if (!match) return html;
    const view = match[1] === "editor" ? "CONFIGURATION BAY" : match[1] === "family" ? "BUILD LINE" : "FORGE CONTROL";
    const bus = '<div class="pn-bloodworks-bus" data-bloodworks-bus aria-label="BLOODWORKS systems status"><span class="is-live"><i></i>FORGE LINK</span><span class="pn-bw-rule"></span><b>'+view+'</b><span>LIVE COST BASIS</span><span>COMPATIBILITY CORE</span></div>';
    html = html.replace(match[0], match[0].replace('>', ' data-bloodworks-premium="v1">') + bus);
    return html;
  };
  route.__pnBloodworksPremiumV1 = true;
})();
