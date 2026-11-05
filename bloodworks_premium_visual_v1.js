"use strict";

(function installBloodworksPremiumVisualV5(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksPremiumV5) return;

  const E = ".pn-rig-cmd[data-rig-view=editor]";
  const style = document.createElement("style");
  style.id = "pn-bloodworks-premium-v5";
  style.textContent = `
    .pn-rig-cmd-top{
      position:relative;isolation:isolate;min-height:88px;padding-top:14px!important;padding-bottom:14px!important;
      border-bottom:1px solid rgba(255,48,82,.42)!important;
      background:
        linear-gradient(90deg,rgba(255,31,69,.1),transparent 22%,transparent 80%,rgba(255,31,69,.03)),
        repeating-linear-gradient(90deg,transparent 0 95px,rgba(255,255,255,.012) 96px),
        linear-gradient(180deg,#120e18,#0d0b12)!important;
      box-shadow:0 10px 28px rgba(0,0,0,.38),inset 0 -1px rgba(255,99,124,.14)}
    .pn-rig-cmd-top:before{content:"";position:absolute;left:18px;top:16px;bottom:16px;width:3px;background:linear-gradient(#ff5c78,#c90d35);box-shadow:0 0 12px rgba(255,35,73,.38)}
    .pn-rig-cmd-top h1{font-size:34px!important;letter-spacing:.05em!important;word-spacing:.18em!important;text-shadow:0 0 22px rgba(255,255,255,.06)}
    .pn-rig-cmd-top h1:before{margin-bottom:6px!important;font-size:11px!important;letter-spacing:.16em!important;word-spacing:.5em!important;color:#ff4968!important}
    .pn-rig-cmd-top .sub{font-size:13px!important;color:#bdb3c3!important;letter-spacing:.02em}
    .pn-rig-cmd-top .topbar-actions{gap:8px}
    .pn-rig-cmd-top .topbar-actions .btn{min-height:38px!important;padding:8px 18px!important;border-color:rgba(255,255,255,.12)!important;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))!important;box-shadow:inset 0 1px rgba(255,255,255,.06);word-spacing:.3em}
    .pn-rig-cmd-top .topbar-actions .btn-primary{border-color:#ff5874!important;background:linear-gradient(180deg,#ff3f60,#ca1038)!important;box-shadow:inset 0 1px rgba(255,255,255,.22),0 6px 18px rgba(184,8,42,.24)!important}

    .pn-rig-cmd[data-bloodworks-premium="v5"]{
      --bw-red:#ff2349;--bw-red-hi:#ff5f79;--bw-line:rgba(255,255,255,.075);--bw-metal:rgba(255,255,255,.07);--bw-mute:#8d8494;--bw-bg:#0d0b12;
      counter-reset:bw-bay;background:radial-gradient(circle at 70% 0,rgba(255,35,73,.035),transparent 28%),linear-gradient(180deg,rgba(10,8,14,.16),rgba(10,8,14,.4))}
    ${E}{padding:10px max(14px,calc((100% - 1780px)/2)) 28px!important;max-width:none!important}

    .pn-rig-cmd .panel,.pn-rig-cmd .pn-rig-fold,.pn-rig-cmd .pn-rig-budget,.pn-rig-cmd .pn-rig-how{
      border-color:var(--bw-line)!important;background:linear-gradient(180deg,rgba(255,255,255,.022),transparent 40px),linear-gradient(180deg,rgba(22,18,29,.97),rgba(14,11,20,.97))!important;
      box-shadow:inset 0 1px var(--bw-metal),0 10px 26px rgba(0,0,0,.2)}
    .pn-rig-cmd .panel-title,.pn-rig-cmd .pn-rig-fold>summary,.pn-rig-cmd .pn-rig-how>summary{border-bottom-color:rgba(255,255,255,.06)!important;background:linear-gradient(90deg,rgba(255,35,73,.055),transparent 30%)!important}
    .pn-rig-cmd .panel-title:before{background:var(--bw-red)!important;box-shadow:0 0 8px rgba(255,35,73,.4)}

    .pn-rig-cmd .pn-rig-budget{margin-bottom:10px!important;padding:9px 14px 8px!important;border-left-width:3px!important;border-left-color:var(--budget-tone)!important;gap:6px 18px!important;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)!important}
    .pn-rig-cmd .pn-rig-budget:after{content:"";position:absolute;right:0;top:0;width:140px;height:1px;background:linear-gradient(90deg,transparent,var(--budget-tone));opacity:.6}
    .pn-rig-cmd .pn-rig-budget-k,.pn-rig-cmd .pn-rig-budget-stat>span,.pn-rig-cmd .pn-rig-budget-mode>span{font-size:10px!important;letter-spacing:.1em!important;word-spacing:.4em!important;margin-bottom:3px!important;color:#a99fb0!important}
    .pn-rig-cmd .pn-rig-budget-stat b{font-size:18px!important}
    .pn-rig-cmd .pn-rig-budget-stat small{display:none!important}
    .pn-rig-cmd .pn-rig-budget-stat.has-unpriced small{display:block!important}
    .pn-rig-cmd .pn-rig-budget-mode small{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    .pn-rig-cmd .pn-rig-budget.is-required .pn-rig-budget-mode small{position:static!important;width:auto;height:auto;clip:auto;white-space:normal}
    .pn-rig-cmd .pn-rig-budget-chip{letter-spacing:.08em!important;word-spacing:.3em}
    .pn-rig-cmd .pn-rig-budget-meter{height:6px!important;background:#09070d!important;border-color:rgba(255,255,255,.08)!important}
    .pn-rig-cmd .pn-rig-budget-meter>.seg-planned{box-shadow:none!important}
    .pn-rig-cmd .pn-rig-budget-foot{font-size:10.5px!important}
    .pn-rig-cmd .pn-rig-budget-more>summary b{letter-spacing:.1em!important;word-spacing:.4em!important}

    .pn-rig-cmd .pn-bw-bay-count{margin-left:auto;padding:4px 9px;border:1px solid rgba(255,255,255,.09);color:#bcb3c2;background:rgba(7,6,10,.42);font:600 10px/1 var(--font-mono,var(--mono));letter-spacing:.06em;word-spacing:.25em;white-space:nowrap}
    .pn-rig-cmd .pn-bw-bay-count b{color:#fff;font-size:11px}
    ${E}>.panel:first-of-type{position:relative;overflow:visible;clip-path:none!important;border:1px solid rgba(255,255,255,.085)!important;background:linear-gradient(180deg,rgba(24,19,31,.97),rgba(13,11,18,.97))!important}
    ${E}>.panel:first-of-type:before{content:"";position:absolute;left:18%;right:18%;top:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);pointer-events:none}
    ${E}>.panel:first-of-type:after{content:"";position:absolute;right:-1px;top:-1px;width:14px;height:14px;background:linear-gradient(225deg,var(--bw-bg) 0 9px,rgba(255,92,120,.55) 9px 10px,transparent 10px);pointer-events:none}
    ${E}>.panel:first-of-type>.panel-head{min-height:44px;padding:8px 14px!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:linear-gradient(90deg,rgba(255,35,73,.08),transparent 40%)!important}
    ${E}>.panel:first-of-type>.panel-head h2{font-size:16px!important;letter-spacing:.12em!important;word-spacing:.4em!important}
    ${E}>.panel:first-of-type>.panel-body{display:block!important;padding:4px 8px 8px!important;
      background-image:linear-gradient(rgba(255,255,255,.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.011) 1px,transparent 1px)!important;background-size:24px 24px!important;background-color:transparent!important}

    ${E} .rig-slot-columns{display:none!important}
    ${E} .rig-slot-row{
      counter-increment:bw-bay;position:relative;display:grid!important;align-items:start;min-width:0;min-height:0!important;margin:0!important;
      border:0!important;border-bottom:1px solid rgba(255,255,255,.05)!important;border-left:3px solid color-mix(in srgb,var(--rc) 62%,transparent)!important;
      clip-path:none!important;background:transparent!important;box-shadow:none!important;transform:none!important;transition:background-color .15s ease,border-color .15s ease}
    ${E} .rig-slot-row:last-of-type{border-bottom-color:transparent!important}
    ${E} .rig-slot-row:before{display:none!important}
    ${E} .rig-slot-row:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 7%,transparent),rgba(255,255,255,.012) 45%,transparent)!important;border-left-color:var(--rc)!important;transform:none!important}
    ${E} .rig-slot-row:focus-within{z-index:5;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 10%,transparent),rgba(255,255,255,.016) 50%,transparent)!important;border-left-color:var(--rc)!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="CPU"]){--rc:#39c6f4!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="GPU"]){--rc:#b25cff!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="RAM"]){--rc:#2fe0a8!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="MOBO"]){--rc:#f2c94c!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="PSU"]){--rc:#ff8a3d!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="CASE"]){--rc:#b9c3d0!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode="COOLER"]){--rc:#ff5fb0!important}
    ${E} .rig-slot-row:has([data-rig-slot-mode^="STORAGE"]){--rc:#4f6bff!important}
    ${E} .rig-slot-row:after{content:"BAY " counter(bw-bay,decimal-leading-zero);position:absolute;right:10px;bottom:6px;top:auto;color:color-mix(in srgb,var(--rc) 40%,#6f6876);font:600 8px/1 var(--font-mono,var(--mono));letter-spacing:.1em;word-spacing:.2em;pointer-events:none}

    ${E} .rig-slot-label{grid-area:label;display:flex!important;align-items:center;gap:8px;min-width:0;min-height:34px;margin:0!important;padding:0!important;border:0!important;background:none!important;
      font:600 13px/1.1 var(--stamp)!important;letter-spacing:.07em!important;word-spacing:.4em!important;color:var(--rc)!important;text-shadow:none!important;white-space:nowrap}
    ${E} .rig-slot-label:before{content:"";flex:0 0 auto;width:6px;height:6px;background:var(--rc);box-shadow:0 0 6px color-mix(in srgb,var(--rc) 55%,transparent);clip-path:polygon(0 0,100% 0,100% 60%,60% 100%,0 100%)}
    ${E} .rig-slot-control{display:contents!important}
    ${E} .rig-slot-control>select{grid-area:source;width:100%;min-width:0;height:34px;color:#b8afbf!important;font-size:12px!important;letter-spacing:.01em!important;border-color:rgba(255,255,255,.08)!important;background:rgba(5,4,8,.55)!important}
    ${E} .rig-slot-detail{grid-area:part;min-width:0}
    ${E} .rig-slot-detail .rig-catalog-fields{max-width:none!important}
    ${E} .rig-slot-detail input[type=text],${E} .rig-slot-detail>select,${E} .rig-slot-detail .rig-catalog-fields select{width:100%;max-width:none!important}
    ${E} .rig-slot-detail input[type=text]{color:#f5f1f7;font-size:14px!important;letter-spacing:0!important;word-spacing:normal!important}
    ${E} .rig-catalog-meta{margin-top:4px!important}
    ${E} .pn-meta-detail{white-space:normal!important;overflow-wrap:anywhere}
    ${E} .ram-config-grid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))!important;max-width:760px!important}
    ${E} .ram-config-grid label>span{font-size:9px!important;letter-spacing:.06em!important;word-spacing:.3em!important}
    ${E} .rig-slot-price{grid-area:paid;position:relative;min-width:0;padding:0!important}
    ${E} .rig-slot-price.is-secondary{grid-area:orig}
    ${E} .rig-slot-price:before{display:none}
    ${E} .rig-slot-price input{width:100%;height:34px;text-align:right;font:600 14px var(--mono)!important;letter-spacing:0!important;font-variant-numeric:tabular-nums}
    ${E} .rig-slot-price.is-secondary input{color:#8f8697!important;font-weight:500!important}
    ${E} .rig-slot-actions{grid-area:actions;display:flex;justify-content:flex-end;align-self:start;min-width:0;padding:3px 0 0!important}
    ${E} .rig-slot-actions .btn{height:28px;min-height:0!important;padding:0 9px!important;border:1px solid rgba(255,255,255,.1)!important;background:rgba(255,255,255,.02)!important;color:#cfc6d4!important;font:600 10px/1 var(--stamp)!important;letter-spacing:.08em!important;word-spacing:.2em;box-shadow:none!important;white-space:nowrap}
    ${E} .rig-slot-actions .btn:hover,${E} .rig-slot-actions .btn:focus-visible{border-color:var(--rc)!important;color:#fff!important;background:color-mix(in srgb,var(--rc) 10%,transparent)!important}
    ${E} .rig-empty-slot{display:flex;align-items:center;min-height:34px;min-width:0;width:auto;color:var(--bw-mute)}
    ${E} .rig-add-storage{display:inline-flex;margin:7px 0 2px!important;word-spacing:.3em}

    .pn-rig-cmd input,.pn-rig-cmd select,.pn-rig-cmd textarea{border-color:rgba(131,113,143,.36)!important;background:rgba(7,6,11,.72)!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
    .pn-rig-cmd input:focus,.pn-rig-cmd select:focus,.pn-rig-cmd textarea:focus{border-color:rgba(255,75,106,.8)!important;background:#110d17!important;box-shadow:0 0 0 2px rgba(255,35,73,.16)!important;outline:0}
    ${E} .rig-slot-row input:focus,${E} .rig-slot-row select:focus{border-color:var(--rc)!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--rc) 22%,transparent)!important}
    .pn-rig-cmd .btn.primary{background:linear-gradient(180deg,#ff4664,#c81037);border-color:#ff6078;box-shadow:inset 0 1px rgba(255,255,255,.22),0 5px 16px rgba(188,10,45,.24)}

    ${E} .pn-rig-fold{margin-top:6px!important;border:1px solid var(--bw-line)!important;border-left:2px solid rgba(255,35,73,.55)!important;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)!important}
    ${E} .pn-rig-fold>summary{min-height:38px!important;padding:6px 12px!important}
    ${E} .pn-rig-fold>summary b{font-size:12px!important;letter-spacing:.1em!important;word-spacing:.45em!important;color:#f2edf4!important}
    ${E} .pn-rig-fold>summary span{font-size:11px!important;color:#a99fab!important;letter-spacing:.02em}
    ${E} .pn-rig-fold>summary span em{font-style:normal;font-weight:700}
    ${E} .pn-rig-fold>summary i{color:var(--bw-mute)!important;letter-spacing:.1em!important}
    ${E} .pn-rig-fold[open]{border-color:rgba(255,255,255,.11)!important;border-left-color:var(--bw-red)!important}
    ${E} .pn-rig-fold[open]>summary i{color:var(--bw-red-hi)!important}
    ${E} .pn-rig-fold>summary:focus-visible{outline:2px solid var(--bw-red-hi);outline-offset:-2px}
    ${E} .pn-bw-score{color:#39c6f4}
    ${E} .pn-bw-verdict{display:inline-block;padding:2px 7px;border:1px solid color-mix(in srgb,currentColor 45%,transparent);background:color-mix(in srgb,currentColor 12%,transparent);font-size:10px;line-height:1.2;letter-spacing:.06em}
    ${E} .pn-bw-verdict.is-pass{color:#3ee07a}${E} .pn-bw-verdict.is-unverified{color:#a99fb0}${E} .pn-bw-verdict.is-warning{color:#f2c94c}${E} .pn-bw-verdict.is-fail{color:#ff4a4a}

    .pn-rig-cmd .pn-build-check{position:relative;overflow:hidden}
    .pn-rig-cmd .pn-bc-tile{background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008));border-color:rgba(255,255,255,.075)!important;box-shadow:inset 0 1px rgba(255,255,255,.02)}
    .pn-rig-cmd .pn-pb-rating{background:linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),linear-gradient(180deg,rgba(24,19,31,.97),rgba(14,11,20,.97))!important}
    .pn-rig-cmd .pn-shop-read{border-color:rgba(255,255,255,.08)!important;background:linear-gradient(90deg,rgba(255,35,73,.045),rgba(14,11,20,.92) 36%)!important}
    .pn-rig-cmd .pn-shop-read-label{word-spacing:.4em!important;letter-spacing:.1em!important}

    ${E} .pn-rig-results-primary{gap:6px!important}
    ${E} .pn-rig-results-primary>.kpi{--k:#8d8494;min-height:68px!important;padding:8px 10px 8px 13px!important;border:1px solid rgba(255,255,255,.075)!important;
      background:linear-gradient(150deg,color-mix(in srgb,var(--k) 6%,transparent),rgba(10,8,15,.72) 60%)!important;box-shadow:inset 0 1px rgba(255,255,255,.035)!important}
    ${E} .pn-rig-results-primary>.kpi::before{width:2px!important;background:color-mix(in srgb,var(--k) 75%,transparent)!important;box-shadow:none!important}
    ${E} .pn-rig-results-primary .kpi-label{font-size:9.5px!important;letter-spacing:.08em!important;word-spacing:.4em!important;color:#a99fb0!important}
    ${E} .pn-rig-results-primary .kpi-value{color:#f2edf4}
    ${E} .pn-rig-results-primary .kpi-sub{color:#8d8494!important}
    ${E} .pn-rig-results-primary .score-row-fill{background:#b9c3d0!important;opacity:.55}
    ${E} .pn-rig-results-primary>[data-bw-kpi=profitnode-rig-performance]{--k:#39c6f4}
    ${E} .pn-rig-results-primary>[data-bw-kpi=profitnode-rig-performance] .kpi-value{color:#39c6f4!important}
    ${E} .pn-rig-results-primary>[data-bw-kpi=total-paid]{--k:#b9c3d0}
    ${E} .pn-rig-results-primary>.kpi:has(.pn-tier-poor){--k:#9D9D9D}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-common){--k:#FFFFFF}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-uncommon){--k:#1EFF00}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-rare){--k:#0070DD}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-epic){--k:#A335EE}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-legendary){--k:#FF8000}${E} .pn-rig-results-primary>.kpi:has(.pn-tier-artifact){--k:#E6CC80}
    ${E} .pn-rig-results-primary>.kpi:has(.kpi-value.pos){--k:#3ee07a}
    ${E} .pn-rig-results-primary>.kpi:has(.kpi-value.pos) .kpi-value{color:#5fe090!important}
    ${E} .pn-rig-results-primary>.kpi:has(.kpi-value.neg){--k:#ff4a4a}
    ${E} .pn-rig-results-primary>.kpi:has(.kpi-value.neg) .kpi-value{color:#ff6b6b!important}
    ${E} .pn-rig-results-primary>.kpi:has(input:placeholder-shown),${E} .pn-rig-results-primary[data-bw-sale=unset]>[data-bw-kpi=expected-sale-price]{--k:#5c5563}
    ${E} .pn-rig-results-primary[data-bw-sale=unset]>:is([data-bw-kpi=expected-profit],[data-bw-kpi=roi],[data-bw-kpi=margin]){--k:#5c5563!important}
    ${E} .pn-rig-results-primary[data-bw-sale=unset]>.kpi.kpi:is([data-bw-kpi=expected-profit],[data-bw-kpi=roi],[data-bw-kpi=margin]) .kpi-value.kpi-value{color:#6f6876!important;text-shadow:none!important}
    ${E} .pn-rig-results-primary[data-bw-sale=unset]>[data-bw-kpi=expected-sale-price] input{color:#8d8494!important}
    ${E} .pn-rig-results-primary .planner-kpi-input{letter-spacing:0!important}

    @media(min-width:1181px){
      .pn-rig-cmd-top{padding:12px max(24px,calc((100% - 1780px)/2))!important}
      .pn-rig-cmd-top:before{left:max(14px,calc((100% - 1780px)/2))}
      ${E}{--bw-c1:clamp(118px,7.6vw,138px);--bw-cols:var(--bw-c1) clamp(122px,8.2vw,156px) minmax(0,1fr) clamp(98px,6.2vw,112px) clamp(98px,6.2vw,112px) 88px}
      ${E} .rig-slot-columns{display:grid!important;grid-template-columns:var(--bw-cols)!important;gap:0 10px!important;margin:0!important;padding:6px 10px 5px 12px!important;border:0!important;border-left:3px solid transparent!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:none!important}
      ${E} .rig-slot-columns>span{font:600 9.5px/1.2 var(--stamp)!important;letter-spacing:.09em!important;word-spacing:.4em!important;color:#8d8494!important;white-space:nowrap}
      ${E} .rig-slot-columns>.is-num{text-align:right;padding-right:10px}
      ${E} .rig-slot-columns>.is-act{text-align:right}
      ${E} .rig-slot-row{grid-template-columns:var(--bw-cols)!important;grid-template-areas:"label source part paid orig actions"!important;gap:0 10px!important;padding:7px 10px 7px 12px!important}
      ${E} .rig-add-storage{margin-left:calc(var(--bw-c1) + 13px)!important}
    }
    @media(min-width:1001px){
      .pn-rig-cmd .pn-rig-results-primary>[data-bw-kpi=profitnode-gear-tier],.pn-rig-cmd .pn-rig-results-primary>[data-bw-kpi=margin]{margin-left:-5px;border-left-color:rgba(255,255,255,.035)!important}
    }
    @media(min-width:1001px) and (max-width:1180px){
      ${E} .rig-slot-row{grid-template-columns:128px minmax(0,1fr) 96px 96px 84px!important;grid-template-areas:"label part paid orig actions" "source part . . ."!important;gap:5px 10px!important;padding:7px 10px 7px 12px!important}
      ${E} .rig-slot-label{min-height:22px}
      ${E} .rig-slot-row:has(.ram-config-grid){grid-template-areas:"label source paid orig actions" "part part part part part"!important;grid-template-columns:128px minmax(0,1fr) 96px 96px 84px!important}
      ${E} .rig-slot-row:has(.ram-config-grid) .rig-slot-control>select{max-width:220px}
      ${E} .rig-slot-row:has(.ram-config-grid) .rig-slot-price:before{top:auto;bottom:-12px}
      ${E} .rig-slot-row:has(.ram-config-grid) .rig-slot-detail{margin-top:10px}
      ${E} .rig-slot-price:before{display:block;content:"TRUE COST";position:absolute;right:2px;top:39px;color:#6f6876;font:600 8px/1 var(--stamp);letter-spacing:.08em;word-spacing:.3em;white-space:nowrap}
      ${E} .rig-slot-price.is-secondary:before{content:"ORIGINAL"}
    }
    @media(max-width:1000px){
      ${E} .rig-slot-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto!important;grid-template-areas:"label source source" "part part part" "paid orig actions"!important;gap:6px 8px!important;padding:8px 9px 8px 11px!important}
      ${E} .rig-slot-row:after{display:none}
      ${E} .rig-slot-label:after{content:"BAY " counter(bw-bay,decimal-leading-zero);color:#6f6876;font:600 8px/1 var(--font-mono,var(--mono));letter-spacing:.08em;word-spacing:.2em}
      ${E} .rig-slot-price{padding-top:13px!important}
      ${E} .rig-slot-price:before{display:block;content:"TRUE COST";position:absolute;left:1px;top:0;color:#6f6876;font:600 8.5px/1 var(--stamp);letter-spacing:.08em;word-spacing:.3em;white-space:nowrap}
      ${E} .rig-slot-price.is-secondary:before{content:"ORIGINAL PRICE"}
      ${E} .rig-slot-actions{align-self:end;padding:0!important}
      ${E} .rig-slot-actions .btn{height:34px}
      ${E} .rig-add-storage{margin-left:0!important}
    }
    @media(max-width:760px){
      .pn-rig-cmd-top:before{left:8px}.pn-rig-cmd-top h1{font-size:28px!important}
      ${E}{padding-inline:8px!important}
      ${E}>.panel:first-of-type>.panel-body{padding:2px 4px 6px!important}
      .pn-rig-cmd .pn-bw-bay-count{display:none}
    }
    @media(max-width:620px){
      ${E} .pn-rig-results-primary{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      ${E} .pn-rig-results-primary .kpi-value,${E} .pn-rig-results-primary .planner-kpi-input{font-size:18px!important}
    }
    @media(prefers-reduced-motion:reduce){.pn-rig-cmd *{transition:none!important}}

    ${E} .pn-rig-fold-check .pn-bc-chips{display:none!important}
    ${E} [data-bw-verified=hidden] [data-bc-level=PASS]{display:none!important}
    ${E} .pn-bw-verified-toggle{display:block;width:100%;margin:0;padding:7px 12px;border:0;border-top:1px dashed rgba(255,255,255,.08);background:transparent;color:#8d8494;font:600 10px/1.2 var(--stamp);letter-spacing:.08em;word-spacing:.35em;text-align:left;cursor:pointer}
    ${E} .pn-bw-verified-toggle:hover,${E} .pn-bw-verified-toggle:focus-visible{color:#3ee07a;outline:0;background:rgba(62,224,122,.04)}

    ${E} .pn-rig-results-primary[data-bw-sale=unset]>.kpi:is([data-bw-kpi=expected-profit],[data-bw-kpi=roi],[data-bw-kpi=margin]){display:none!important}
    ${E} .pn-rig-results-primary>.pn-bw-sale-prompt{--k:#8d8494;grid-column:span 3;display:flex;flex-direction:column;justify-content:center;gap:4px;margin:0;text-align:left;cursor:pointer;border-style:dashed!important;color:inherit;font:inherit}
    ${E} .pn-bw-sale-prompt .kpi-label{color:#cfc6d4!important}
    ${E} .pn-bw-sale-prompt .kpi-value{font:600 14px/1.25 var(--mono)!important;letter-spacing:0!important;color:#8d8494!important}
    ${E} .pn-bw-sale-prompt .kpi-value b{color:#f2edf4;font-weight:700}
    ${E} .pn-bw-sale-prompt:hover,${E} .pn-bw-sale-prompt:focus-visible{--k:#ff5f79;outline:0;border-color:rgba(255,95,121,.45)!important}
    @media(max-width:1000px){${E} .pn-rig-results-primary>.pn-bw-sale-prompt{grid-column:span 2}}

    ${E} .pn-bw-ram-adv{max-width:760px;margin-top:6px;border:1px solid rgba(255,255,255,.07);background:rgba(5,4,8,.3)}
    ${E} .pn-bw-ram-adv>summary{display:flex;align-items:center;gap:10px;min-height:26px;padding:4px 9px;cursor:pointer;list-style:none;color:#8d8494;font:600 9.5px/1.2 var(--stamp);letter-spacing:.08em;word-spacing:.35em}
    ${E} .pn-bw-ram-adv>summary::-webkit-details-marker{display:none}
    ${E} .pn-bw-ram-adv>summary:before{content:"+";width:10px;color:var(--rc)}
    ${E} .pn-bw-ram-adv[open]>summary:before{content:"\\2212"}
    ${E} .pn-bw-ram-adv>summary span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 10.5px var(--mono);letter-spacing:0;word-spacing:normal;color:#6f6876}
    ${E} .pn-bw-ram-adv>summary:focus-visible{outline:2px solid var(--rc);outline-offset:-2px}
    ${E} .pn-bw-ram-adv>.ram-config-grid{margin:0;padding:2px 8px 8px}
  `;
  document.head.appendChild(style);

  const COLUMN_HEADER = '<div class="rig-slot-columns" aria-hidden="true"><span>COMPONENT</span><span>SOURCE</span><span>SELECTED PART</span><span class="is-num">TRUE COST</span><span class="is-num">ORIGINAL PRICE</span><span class="is-act">FAMILY</span></div>';
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const VERDICTS = {PASS:"is-pass", UNVERIFIED:"is-unverified", WARNING:"is-warning", FAIL:"is-fail"};

  const RAM_ADVANCED = ["voltage","partNumber","matchedKit","rgb","xmp","expo","notes"];

  function budgetModel(rig){
    try { return globalThis.PN_BUDGET && rig ? PN_BUDGET.rigModel(rig) : null; } catch (_err) { return null; }
  }
  function rigMoney(value, currency){
    const shown = currency === "EUR" && typeof rsdToEur === "function" ? rsdToEur(value) : value;
    return (value < 0 ? "−" : "") + money(Math.abs(shown), currency);
  }

  function tagResults(html){
    const rig = state.rigDraft;
    const saleSet = !!rig && (Number(rig.expectedSalePrice) > 0 || Number(rig.salePrice) > 0);
    html = html.replace('<div class="kpi-grid pn-rig-results-primary">', '<div class="kpi-grid pn-rig-results-primary" data-bw-sale="' + (saleSet ? "set" : "unset") + '">');
    html = html.replace(/<div class="kpi is-primary([^"]*)"><div class="kpi-label">([^<]+)<\/div>/g, (m, cls, label) => '<div class="kpi is-primary' + cls + '" data-bw-kpi="' + slug(label) + '"><div class="kpi-label">' + label + '</div>');
    const m = budgetModel(rig);
    if (!saleSet) {
      const hint = m && m.suggested != null
        ? 'At ' + (Math.round(m.suggestedMarginPct * 10) / 10) + '% target margin, list at <b>' + rigMoney(m.suggested, m.currency) + '</b>'
        : 'Unlocks profit · ROI · margin';
      html = html.replace(/(data-bw-kpi="expected-sale-price">[\s\S]*?<\/div><\/div>)/, '$1<button type="button" class="kpi pn-bw-sale-prompt" data-bw-focus-sale><span class="kpi-label">Set expected sale price</span><span class="kpi-value" data-bw-sale-hint>' + hint + '</span></button>');
    } else if (m && m.resale) {
      html = html.replace(/(data-bw-kpi="expected-profit"><div class="kpi-label">[^<]*<\/div><div class="kpi-value[^"]*">[^<]*<\/div>)/, '$1<div class="kpi-sub" data-bw-cash-back>cash back ' + rigMoney(m.resale.cashRecovery, m.currency) + ' after new spend</div>');
    }
    return html;
  }

  function slimBuildCheck(html){
    const start = html.indexOf('<div class="pn-integrity-list pn-bc-details-list">');
    if (start < 0) return html;
    const end = html.indexOf("</details>", start);
    if (end < 0) return html;
    const verified = (html.slice(start, end).match(/data-bc-level="PASS"/g) || []).length;
    if (!verified) return html;
    const panels = state.rigCompactPanels || {};
    const shown = !!panels["check-verified"];
    const list = html.slice(start, end).replace('<div class="pn-integrity-list pn-bc-details-list">', '<div class="pn-integrity-list pn-bc-details-list" data-bw-verified="' + (shown ? "shown" : "hidden") + '">');
    const toggle = '<button type="button" class="pn-bw-verified-toggle" data-bw-show-verified aria-expanded="' + shown + '">' + (shown ? "HIDE " : "SHOW ") + verified + ' VERIFIED CHECK' + (verified === 1 ? "" : "S") + '</button>';
    return html.slice(0, start) + list + toggle + html.slice(end);
  }

  function foldRam(html){
    const OPEN = '<div class="ram-config-grid">';
    const start = html.indexOf(OPEN);
    if (start < 0) return html;
    const tags = /<div\b|<\/div>/g;
    tags.lastIndex = start + OPEN.length;
    let depth = 1, end = -1, tag;
    while ((tag = tags.exec(html))) {
      depth += tag[0] === "</div>" ? -1 : 1;
      if (!depth) { end = tag.index; break; }
    }
    if (end < 0) return html;
    const core = [], advanced = [], extras = [];
    let vol = "";
    html.slice(start + OPEN.length, end).split(/(?=<label\b)/).forEach(chunk => {
      if (!chunk.startsWith("<label")) { if (chunk.trim()) extras.push(chunk); return; }
      const cut = chunk.lastIndexOf("</label>");
      const field = cut < 0 ? chunk : chunk.slice(0, cut + 8);
      const rest = cut < 0 ? "" : chunk.slice(cut + 8);
      if (rest.trim()) extras.push(rest);
      const key = (field.match(/data-rig-ram-field="([^"]+)"/) || [])[1];
      if (key === "voltage") vol = (field.match(/<option value="([^"]+)" selected/) || [])[1] || "";
      (RAM_ADVANCED.includes(key) ? advanced : core).push(field);
    });
    if (!advanced.length || !core.length) return html;
    const open = !!(state.rigCompactPanels || {})["ram-advanced"];
    const summary = (vol ? vol + " · " : "") + "part no. · kit · RGB · XMP · EXPO · notes";
    const folded = OPEN + core.join("") + extras.join("") + '</div><details class="pn-bw-ram-adv" data-rig-fold="ram-advanced"' + (open ? " open" : "") + '><summary>RAM DETAILS / ADVANCED<span>' + summary + '</span></summary>' + OPEN + advanced.join("") + '</div></details>';
    return html.slice(0, start) + folded + html.slice(end + 6);
  }

  document.addEventListener("click", e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t || !state.rigDraft) return;
    if (t.closest("[data-bw-show-verified]")) {
      const map = state.rigCompactPanels || (state.rigCompactPanels = {});
      map["check-verified"] = !map["check-verified"];
      render();
      return;
    }
    if (t.closest("[data-bw-focus-sale]")) {
      const input = document.querySelector('[data-rig-field="expectedSalePrice"]');
      if (input) { input.focus(); if (input.select) input.select(); }
    }
  });

  function tagFolds(html){
    html = html.replace(/(<details class="pn-rig-fold pn-rig-fold-check"[^>]*><summary><b>[^<]*<\/b><span>)([A-Z]+)( · )/, (m, head, verdict, sep) => head + '<em class="pn-bw-verdict ' + (VERDICTS[verdict] || "is-unverified") + '">' + verdict + '</em>' + sep);
    return html.replace(/(<details class="pn-rig-fold pn-rig-fold-rating"[^>]*><summary><b>[^<]*<\/b><span>)(\d+(?:\.\d+)?)( PERFORMANCE · )([A-Z]+)/, (m, head, score, mid, tier) => head + '<em class="pn-bw-score">' + score + '</em>' + mid + '<em class="pn-tier-text pn-tier-' + tier.toLowerCase() + '">' + tier + '</em>');
  }

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    const match = html.match(/<div data-rig-view="([^"]+)" class="pn-rig-cmd content([^"]*)">/);
    if (!match) return html;
    html = html.replace(match[0], match[0].replace('>', ' data-bloodworks-premium="v5">'));
    if (match[1] === "editor") {
      const total = (html.match(/class="rig-slot-row/g) || []).length;
      const empty = (html.match(/class="rig-empty-slot/g) || []).length;
      const configured = Math.max(0, total - empty);
      html = html.replace('<div class="panel-head"><h2>Slots</h2></div>', '<div class="panel-head"><h2>Component Bays</h2><span class="pn-bw-bay-count"><b>' + configured + '</b> / ' + total + ' CONFIGURED</span></div>');
      html = html.replace(/<div class="rig-slot-columns">[\s\S]*?<\/div>/, COLUMN_HEADER);
      html = tagResults(slimBuildCheck(foldRam(tagFolds(html))));
    }
    return html;
  };
  route.__pnBloodworksPremiumV5 = true;
})();
