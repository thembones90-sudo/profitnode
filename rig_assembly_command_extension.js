"use strict";

/*
  PROFITNODE — RIG ASSEMBLY command-console skin.

  Same visual language as the Build Workspace console (chamfered panels,
  grid backgrounds, glowing edge strips, Oswald readouts, angled controls),
  in RIG ASSEMBLY's forge-gold accent. Each slot row in the editor takes its
  part's gauge colour (PN_SLOT_GAUGE_COLORS), matched by its slot-mode
  select so every slot, PSU and extra storage drives included, is coloured.

  Display only. The rigbuild ROUTES entry captured renderRigBuild at load
  time, so this chains through that entry's .render (not the bare global)
  and only adds a scoping class and a view attribute to the returned HTML.
*/
(function installRigAssemblyCommandV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnRigCmdV1) return;

  const prevRender = route.render;
  route.render = function(){
    const html = String(prevRender.apply(this, arguments));
    const view = typeof state !== "undefined" && state.rigDraft ? "editor" : typeof state !== "undefined" && state.rigFamilyView ? "family" : "list";
    return html
      .replace('<div class="topbar">', '<div class="topbar pn-rig-cmd-top" data-rig-view="' + view + '">')
      .replace('<div class="content', '<div data-rig-view="' + view + '" class="pn-rig-cmd content');
  };
  route.__pnRigCmdV1 = true;

  const C = ".pn-rig-cmd";
  const T = ".pn-rig-cmd-top";
  const GOLD = "#e7bc4e";
  const GRID = "linear-gradient(90deg,rgba(231,188,78,.045) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(0deg,rgba(231,188,78,.035) 1px,transparent 1px) 0 0/26px 26px";
  const CHAMFER = "clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,16px 100%,0 calc(100% - 16px));";
  const ANGLE = "clip-path:polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%);border-radius:0;";
  const palette = Object.assign({ CPU: "#39C6F4", GPU: "#B25CFF", MOBO: "#F2C94C", RAM: "#2FE0A8", STORAGE: "#4F6BFF", PSU: "#FF8A3D", COOLER: "#FF5FB0", CASE: "#B9C3D0" }, globalThis.PN_SLOT_GAUGE_COLORS || {});
  const slotColors = Object.keys(palette).map(k => C + " .rig-slot-row:has([data-rig-slot-mode=\"" + k + "\"]){--rc:" + palette[k] + "}").join("");

  const style = document.createElement("style");
  style.textContent = ""
    + T + "{position:relative;border-bottom:1px solid rgba(231,188,78,.35) !important;background:" + GRID + ",linear-gradient(110deg,rgba(231,188,78,.12),rgba(178,92,255,.05) 50%,transparent) !important}"
    + T + " h1{font:700 34px/1.05 var(--stamp) !important;letter-spacing:.06em !important;text-transform:uppercase;color:#fff;text-shadow:0 0 22px rgba(231,188,78,.4)}"
    + T + " h1::before{content:'RIG ASSEMBLY // FORGE';display:flex;align-items:center;gap:8px;font:600 12px var(--stamp);letter-spacing:.3em;color:" + GOLD + ";text-shadow:none;margin-bottom:4px}"
    + T + "[data-rig-view=editor] h1::before{content:'RIG ASSEMBLY // CONFIGURATION BAY'}"
    + T + "[data-rig-view=family] h1::before{content:'RIG ASSEMBLY // VARIANT ARCHIVE'}"
    + T + " .sub{font:500 13px var(--mono) !important;color:var(--text-muted) !important;letter-spacing:.03em}"
    + T + " .topbar-actions .btn{font:600 13px var(--stamp) !important;letter-spacing:.16em !important;padding:8px 18px !important;" + ANGLE + "border-color:rgba(231,188,78,.5);background:rgba(231,188,78,.07)}"
    + T + " .topbar-actions .btn:hover{background:rgba(231,188,78,.2);border-color:" + GOLD + "}"
    + T + " .topbar-actions .btn-primary{background:linear-gradient(90deg,#b25cff,#8a3df0) !important;border-color:#c792ff !important;color:#fff !important;box-shadow:0 0 16px -4px #b25cff}"
    + T + " .topbar-actions .btn-danger{border-color:rgba(255,70,70,.6) !important;background:rgba(255,70,70,.08) !important;color:#ff8f8f !important}"

    + C + " .panel{position:relative;border:1px solid rgba(231,188,78,.3);border-radius:0;" + CHAMFER + "background:" + GRID + ",linear-gradient(160deg,rgba(231,188,78,.06),rgba(12,10,22,.55) 55%)}"
    + C + " .panel>.panel-head{border-bottom:1px solid rgba(231,188,78,.25)}"
    + C + " .panel>.panel-head h2{display:flex;align-items:center;gap:9px;font:600 15px var(--stamp) !important;letter-spacing:.22em !important;text-transform:uppercase;color:#fff}"
    + C + " .panel>.panel-head h2::before{content:'';width:8px;height:8px;background:" + GOLD + ";transform:rotate(45deg);box-shadow:0 0 8px " + GOLD + "}"
    + C + " .btn{font-family:var(--stamp);letter-spacing:.14em;" + ANGLE + "}"
    + C + " input:not([type=checkbox]),.pn-rig-cmd select,.pn-rig-cmd textarea{border-radius:0 !important;font-size:14px !important;border-color:rgba(231,188,78,.25) !important;background:rgba(8,8,18,.6) !important}"
    + C + " input:not([type=checkbox]):focus,.pn-rig-cmd select:focus,.pn-rig-cmd textarea:focus{border-color:" + GOLD + " !important;box-shadow:0 0 0 1px " + GOLD + ",0 0 14px -4px " + GOLD + " !important;outline:none}"
    + C + " .field>span{font:600 12px var(--stamp) !important;letter-spacing:.2em !important;color:color-mix(in srgb," + GOLD + " 70%,#fff)}"

    + C + " table{border-collapse:separate;border-spacing:0 6px}"
    + C + " thead th{font:600 12px var(--stamp) !important;letter-spacing:.2em !important;color:" + GOLD + " !important;border:0 !important;background:transparent !important}"
    + C + " tbody tr{background:linear-gradient(90deg,rgba(231,188,78,.1),rgba(12,10,22,.4) 55%)}"
    + C + " tbody tr>td{border-top:1px solid rgba(231,188,78,.2) !important;border-bottom:1px solid rgba(231,188,78,.2) !important;font-size:14px;padding-top:12px !important;padding-bottom:12px !important}"
    + C + " tbody tr>td:first-child{border-left:4px solid " + GOLD + " !important;box-shadow:-2px 0 12px -4px " + GOLD + "}"
    + C + " tbody tr>td{background:transparent !important;vertical-align:middle}"
    + C + " tbody td.row-actions{display:table-cell !important;white-space:nowrap;text-align:right;border-right:1px solid rgba(231,188,78,.2) !important}"
    + C + " tbody td.row-actions .btn{margin-left:6px}"
    + C + " .pn-variant-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}"
    + C + " tbody tr:hover{background:linear-gradient(90deg,rgba(231,188,78,.2),rgba(12,10,22,.4) 70%)}"
    + C + " tbody td b{font:700 18px var(--stamp);letter-spacing:.08em}"
    + C + " tbody td.num{font:600 15px var(--mono)}"
    + C + " .pn-variant-row.is-active>td:first-child{border-left-color:#b25cff !important;box-shadow:-2px 0 12px -4px #b25cff}"
    + C + " .pn-rank-chip,.pn-var-read,tbody .chip{font:600 10.5px var(--stamp) !important;letter-spacing:.14em !important;" + ANGLE + "padding:2px 9px !important}"
    + C + " .pn-family-rec{border-radius:0;border:1px solid rgba(231,188,78,.4);border-left:4px solid " + GOLD + ";" + "clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);background:linear-gradient(90deg,rgba(231,188,78,.12),transparent 70%);padding:12px 16px;font:500 14px var(--sans)}"
    + C + " .pn-family-rec-label{font:600 12px var(--stamp) !important;letter-spacing:.22em !important;color:" + GOLD + " !important}"
    + C + " .info-note{border:1px dashed rgba(231,188,78,.3);border-left:4px solid rgba(231,188,78,.6);padding:14px 16px;font-size:13px;line-height:1.6;background:rgba(231,188,78,.04)}"
    + C + " .info-note b{font:600 13px var(--stamp);letter-spacing:.18em;color:" + GOLD + "}"

    + slotColors
    + C + " .rig-slot-columns{font:600 12px var(--stamp) !important;letter-spacing:.2em !important;color:" + GOLD + " !important;border-bottom-color:rgba(231,188,78,.3) !important}"
    + C + " .rig-slot-row{--rc:#9fb4c8;position:relative;margin:6px 0;padding:10px 10px 10px 14px !important;border:1px solid color-mix(in srgb,var(--rc) 30%,transparent) !important;"
      + "clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 14%,transparent),rgba(12,10,22,.35) 40%) !important;box-shadow:inset 4px 0 0 var(--rc)}"
    + C + " .rig-slot-row:hover{box-shadow:inset 4px 0 0 var(--rc),inset 0 0 30px -12px var(--rc)}"
    + "@media(min-width:1181px){" + C + " .rig-slot-row,.pn-rig-cmd .rig-slot-columns{grid-template-columns:150px minmax(420px,760px) 110px 110px auto}}"
    + C + " .rig-slot-label{font:600 15px var(--stamp) !important;letter-spacing:.14em !important;color:var(--rc) !important;text-shadow:0 0 12px color-mix(in srgb,var(--rc) 50%,transparent);border-left:0 !important;background:none !important;padding-left:4px !important}"
    + C + " .rig-slot-price input{font:600 15px var(--mono) !important;text-align:right}"
    + C + " .rig-slot-price.is-secondary input{color:var(--text-muted)}"
    + C + " .rig-slot-actions .btn{border-color:color-mix(in srgb,var(--rc) 45%,transparent);background:color-mix(in srgb,var(--rc) 8%,transparent)}"
    + C + " .rig-catalog-meta,.pn-rig-cmd .rig-catalog-help{font-size:12.5px}"
    + C + " .pn-cap-details>summary{font:600 11px var(--stamp);letter-spacing:.18em}"

    + C + " .pn-build-check .pn-bc-chip,.pn-rig-cmd .pn-bc-status{font:600 11px var(--stamp) !important;letter-spacing:.14em !important;" + ANGLE + "padding:3px 10px !important}"
    + C + " .pn-bc-tile{border-radius:0 !important;border-color:rgba(231,188,78,.25) !important;background:linear-gradient(160deg,rgba(231,188,78,.07),transparent 70%) !important}"
    + C + " .pn-bc-tile-label{font:600 12px var(--stamp) !important;letter-spacing:.18em !important}"
    + C + " .pn-shop-read{border-radius:0;border-left-width:4px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);padding:12px 16px;font-size:14px}"
    + C + " .pn-shop-read-label{font:600 12px var(--stamp) !important;letter-spacing:.22em !important}"

    + C + " .pn-rig-results-primary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;background:transparent !important;border:0 !important}"
    + C + " .pn-rig-results-primary>.kpi{--k:" + GOLD + ";position:relative;border:1px solid color-mix(in srgb,var(--k) 40%,transparent) !important;border-radius:0;padding:12px 14px 12px 18px !important;"
      + "clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);background:linear-gradient(150deg,color-mix(in srgb,var(--k) 13%,transparent),rgba(12,10,22,.55) 70%) !important;box-shadow:inset 0 0 30px -14px var(--k)}"
    + C + " .pn-rig-results-primary>.kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--k);box-shadow:0 0 10px var(--k)}"
    + C + " .pn-rig-results-primary>.kpi.is-profit{--k:#3ee07a}" + C + " .pn-rig-results-primary>.kpi.is-margin{--k:#39c6f4}"
    + C + " .pn-rig-results-primary>.kpi:has(.neg){--k:#ff4a4a}"
    + C + " .pn-rig-results-primary .kpi-label{font:600 12px var(--stamp) !important;letter-spacing:.18em !important;color:color-mix(in srgb,var(--k) 70%,#fff) !important}"
    + C + " .pn-rig-results-primary .kpi-value,.pn-rig-cmd .pn-rig-results-primary .planner-kpi-input{font:700 28px/1.15 var(--stamp) !important;letter-spacing:.04em}"
    + C + " .pn-rig-results-primary .kpi-sub{font:500 12.5px var(--mono) !important}"
    + C + " details.pn-rig-secondary>summary{font:600 12px var(--stamp);letter-spacing:.2em;color:" + GOLD + "}"

    + "@media(max-width:1100px){" + C + " .pn-rig-results-primary{grid-template-columns:repeat(2,minmax(0,1fr))}}"
    + "@media(max-width:760px){" + T + " h1{font-size:26px !important}" + C + " .pn-rig-results-primary{grid-template-columns:1fr}" + C + " tbody td b{font-size:16px}" + C + " .rig-slot-row{padding:10px 8px 10px 12px !important}}"
    + "@media(prefers-reduced-motion:reduce){" + C + " *{transition:none !important}}";
  document.head.appendChild(style);
})();
