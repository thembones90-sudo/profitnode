"use strict";

/*
  PROFITNODE — BLOODWORKS list/family premium visual pass.

  bloodworks_premium_visual_v1.js (the "v5" command-deck skin) only
  restyles the rig EDITOR view (.pn-rig-cmd[data-rig-view=editor]).
  The ALL RIGS list and the per-family VARIANT ARCHIVE view still wear
  the original rig_assembly_command_extension.js "chamfered gold forge"
  skin underneath it — same dark panel background (that rule isn't
  view-scoped) but still the old double-chamfer corners, gold angled
  chips and dense grid texture on tables/badges/rec banners. The result
  is a visibly half-migrated page: open a build and it's the quiet,
  premium command deck; back out to the rig list or a family's variant
  table and it jumps back a design generation.

  Display only, same pattern as the v5 file: wraps the rigbuild route's
  already-decorated .render, scoped strictly to the list/family views
  so the editor (already handled by v5) is untouched.
*/
(function installBloodworksListPremiumV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksListPremiumV1) return;

  // :is(...) keeps this one compound selector, so appending " .foo" or
  // ".foo" below scopes to BOTH views at once - string-concatenating a
  // bare comma-separated list here would silently split on that comma
  // and leave the first alternative as an unscoped top-level selector.
  const L = ":is(.pn-rig-cmd[data-rig-view=list],.pn-rig-cmd[data-rig-view=family])";
  const style = document.createElement("style");
  style.id = "pn-bloodworks-list-premium-v1";
  style.textContent = `
    ${L}.pn-rig-cmd{padding:10px max(14px,calc((100% - 1780px)/2)) 28px!important;max-width:none!important}

    ${L} .panel{clip-path:none!important;overflow:visible}
    ${L} .panel:before{content:"";position:absolute;left:18%;right:18%;top:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);pointer-events:none}
    ${L} .panel{position:relative}
    ${L} .panel:after{content:"";position:absolute;right:-1px;top:-1px;width:14px;height:14px;background:linear-gradient(225deg,#0d0b12 0 9px,rgba(255,92,120,.5) 9px 10px,transparent 10px);pointer-events:none}
    ${L} .panel-head{min-height:44px;padding:8px 14px!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:linear-gradient(90deg,rgba(255,35,73,.08),transparent 40%)!important}
    ${L} .panel-head h2{font-size:16px!important;letter-spacing:.12em!important;word-spacing:.4em!important;color:#f2edf4!important}

    ${L} table{border-collapse:collapse!important;border-spacing:0!important;background-image:none!important}
    ${L} thead th{padding:7px 12px!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:transparent!important;
      color:#8d8494!important;font:600 9.5px/1.2 var(--stamp)!important;letter-spacing:.09em!important;word-spacing:.4em!important;text-transform:uppercase}
    ${L} tbody tr{background:none!important;transition:background-color .15s ease}
    ${L} tbody tr.clickable:hover,${L} tbody tr.pn-variant-row:hover{background:linear-gradient(90deg,rgba(255,35,73,.055),rgba(255,255,255,.012) 55%,transparent)!important;cursor:pointer}
    ${L} tbody td{border-top:1px solid rgba(255,255,255,.055)!important;border-bottom:1px solid rgba(255,255,255,.055)!important;padding:11px 12px!important;background:transparent!important;font-size:13px;vertical-align:middle}
    ${L} tbody td:first-child{border-left:3px solid transparent!important;box-shadow:none!important}
    ${L} tbody tr.clickable:hover td:first-child,${L} tbody tr.pn-variant-row:hover td:first-child{border-left-color:#ff2349!important}
    ${L} tbody tr.pn-variant-row.is-active td:first-child{border-left-color:#39c6f4!important}
    ${L} tbody tr.pn-variant-row.is-recommended td:first-child{border-left-color:#3ee07a!important}
    ${L} tbody tr:last-of-type td{border-bottom-color:transparent!important}
    ${L} tbody td b{font:700 15px/1.2 var(--stamp)!important;letter-spacing:.04em!important;color:#f2edf4}
    ${L} tbody td.num{font:600 13px var(--mono)!important;font-variant-numeric:tabular-nums}
    ${L} tbody td.mono{font:500 12.5px var(--mono)!important;color:#cfc6d4}
    ${L} .empty-row td{padding:28px 12px!important;color:#6f6876;font-size:13px;text-align:center}

    ${L} .pn-rank-chip,${L} .pn-var-read,${L} .chip{display:inline-block;padding:2px 8px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.03)!important;
      clip-path:none!important;border-radius:0!important;color:#cfc6d4!important;font:600 9px/1.5 var(--stamp)!important;letter-spacing:.07em!important;word-spacing:.25em;white-space:nowrap}
    ${L} .pn-rank-chip.is-active{border-color:rgba(57,198,244,.4)!important;background:rgba(57,198,244,.08)!important;color:#39c6f4!important}
    ${L} .pn-rank-chip.is-margin,${L} .pn-rank-chip.is-cheapest{border-color:rgba(62,224,122,.4)!important;background:rgba(62,224,122,.08)!important;color:#3ee07a!important}
    ${L} .pn-rank-chip.is-fastest{border-color:rgba(178,92,255,.4)!important;background:rgba(178,92,255,.08)!important;color:#c39bff!important}
    ${L} .pn-var-read.is-ready{border-color:rgba(62,224,122,.4)!important;color:#3ee07a!important}
    ${L} .pn-var-read.is-review,${L} .pn-var-read.is-verify{border-color:rgba(242,201,76,.4)!important;color:#f2c94c!important}
    ${L} .pn-var-read.is-hold{border-color:rgba(255,74,74,.4)!important;color:#ff6b6b!important}
    ${L} .pn-var-read.is-closed{border-color:rgba(141,132,148,.35)!important;color:#8d8494!important}
    ${L} .pn-variant-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
    ${L} .pn-family-rec-mini{margin-top:3px;color:#8d8494;font:500 11px var(--mono);letter-spacing:0}
    ${L} .pn-family-rec-mini b{color:#cfc6d4;font-weight:600}

    ${L} .pn-family-rec{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin-bottom:12px;padding:10px 16px!important;
      border:1px solid rgba(255,255,255,.08)!important;border-left-width:3px!important;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)!important;
      background:linear-gradient(180deg,rgba(22,18,29,.97),rgba(14,11,20,.97))!important;box-shadow:inset 0 1px rgba(255,255,255,.07),0 10px 26px rgba(0,0,0,.2)}
    ${L} .pn-family-rec.is-ready{border-left-color:#3ee07a!important}
    ${L} .pn-family-rec.is-none{border-left-color:#f2c94c!important}
    ${L} .pn-family-rec-label{font:600 10px/1.2 var(--stamp)!important;letter-spacing:.1em!important;word-spacing:.4em!important;color:#a99fb0!important}
    ${L} .pn-family-rec b{font:700 15px var(--stamp)!important;letter-spacing:.03em;color:#f2edf4}
    ${L} .pn-family-rec>span.mono{color:#8d8494;font:500 12px var(--mono)}
    ${L} .pn-family-rec .pn-rec-chip{margin-left:auto;padding:2px 9px;border:1px solid rgba(62,224,122,.4);background:rgba(62,224,122,.08);color:#3ee07a;font:600 9.5px/1.4 var(--stamp);letter-spacing:.08em}
    ${L} .pn-rec-dot{margin-left:5px;color:#3ee07a;font-size:11px}

    ${L} .info-note{position:relative;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)!important;border:1px solid rgba(255,255,255,.08)!important;
      border-left:3px solid #ff2349!important;background:linear-gradient(180deg,rgba(22,18,29,.9),rgba(14,11,20,.9))!important;padding:13px 16px!important;font-size:12.5px;line-height:1.65;color:#bdb3c3}
    ${L} .info-note b{font:600 11px var(--stamp)!important;letter-spacing:.12em!important;color:#ff6b80!important}

    ${L} .hbar-track{position:relative;height:6px!important;background:#09070d!important;border:1px solid rgba(255,255,255,.08)!important;overflow:hidden}
    ${L} .hbar-zero{position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.18)}
    ${L} .hbar-fill{position:absolute;top:0;bottom:0;box-shadow:none!important}

    ${L} .pn-variant-col.is-recommended{box-shadow:inset 0 0 0 1px rgba(62,224,122,.3)!important}
    ${L} .pn-performance-text{color:#39c6f4;font:600 13px var(--mono)}
    ${L} .pn-tier-text{font:600 12px var(--stamp);letter-spacing:.06em}

    ${L} .btn{font-family:var(--stamp)!important;letter-spacing:.1em!important;clip-path:none!important;border-radius:0!important}
    ${L} .btn-primary{border-color:#ff5874!important;background:linear-gradient(180deg,#ff3f60,#ca1038)!important;box-shadow:inset 0 1px rgba(255,255,255,.22),0 6px 18px rgba(184,8,42,.24)!important}

    @media(max-width:1000px){${L} table{font-size:12px}${L} tbody td{padding:9px 9px!important}}
    @media(max-width:760px){${L}.pn-rig-cmd{padding-inline:8px!important}${L} .pn-family-rec{padding:9px 12px!important}}
    @media(prefers-reduced-motion:reduce){${L} *{transition:none!important}}
  `;
  document.head.appendChild(style);
  route.__pnBloodworksListPremiumV1 = true;
})();
