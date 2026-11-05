"use strict";

/*
  PROFITNODE — BLOODWORKS header polish.

  Two fixes to the topbar, both confirmed by measuring the live layout
  rather than guessing:

  1. Spacing bug: .pn-rig-cmd-top:before (the glowing red accent rail,
     from rig_assembly_command_extension.js) sits at a fixed left:18px.
     bloodworks_premium_visual_v1.js only widens the topbar's own
     left padding at >=1181px (where it and the rail's left offset
     share the same max(Npx, centered) formula, by design keeping a
     steady 7px gap between rail and text). Below that breakpoint the
     topbar falls back to the app's generic .topbar padding, which
     was never raised to account for the rail - measured at 1100px
     wide, the rail's right edge sits just 1px from the title text,
     with its 12px-blur glow bleeding straight across it. This is the
     literal cause of the text looking jammed against the line.
     Fixed by giving the topbar the same deliberate 7px clearance at
     every width, not just >=1181px.

  2. "BLOODWORKS // FORGE" / "// CONFIGURATION BAY" / "// VARIANT
     ARCHIVE": a bare double-slash divider baked into the h1::before
     CSS content in rig_assembly_command_extension.js - the generic
     sci-fi-HUD "MODULE // SUBMODULE" trope, and "FORGE" alone doesn't
     say what the all-rigs list actually is. Replaces it with real
     markup: the brand name muted and small, the actual view name in
     the accent color, joined by the same small glowing square this
     design already uses as its marker everywhere else (panel titles,
     COMPARE VARIANTS, COMPONENT BAYS) instead of a punctuation crutch.

  Both are display-only: this only edits the topbar HTML the rigbuild
  route already produces (chains onto whatever .render the earlier
  BLOODWORKS passes left in place) and adds CSS. No rig/slot data,
  no other route.
*/
(function installBloodworksHeaderPolishV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksHeaderPolishV1) return;

  const VIEW_LABEL = { editor: "CONFIGURATION BAY", family: "VARIANT ARCHIVE", list: "ALL RIGS" };

  const style = document.createElement("style");
  style.id = "pn-bloodworks-header-polish-v1";
  style.textContent = `
    .pn-rig-cmd-top{padding-left:28px!important}
    .pn-rig-cmd-top[data-bw-eyebrow] h1:before{content:none!important}
    .pn-rig-cmd-top .pn-bw-crumb{display:flex!important;align-items:center;gap:9px;margin-bottom:6px;font:600 11px/1 var(--stamp);letter-spacing:.16em;word-spacing:.08em}
    .pn-rig-cmd-top .pn-bw-crumb-dot{flex:0 0 auto;width:5px;height:5px;background:#ff2349;box-shadow:0 0 8px rgba(255,35,73,.4)}
    .pn-rig-cmd-top .pn-bw-crumb-brand{color:#8d8494}
    .pn-rig-cmd-top .pn-bw-crumb-view{color:#ff4968}
    @media(min-width:1181px){.pn-rig-cmd-top{padding-left:max(24px,calc((100% - 1780px)/2))!important}}
  `;
  document.head.appendChild(style);

  function crumbHtml(view){
    const label = VIEW_LABEL[view] || view;
    return '<div class="pn-bw-crumb"><span class="pn-bw-crumb-brand">BLOODWORKS</span><span class="pn-bw-crumb-dot" aria-hidden="true"></span><span class="pn-bw-crumb-view">' + label + '</span></div>';
  }

  function polishHeader(html, view){
    const openTag = '<div class="topbar pn-rig-cmd-top" data-rig-view="' + view + '">';
    const idx = html.indexOf(openTag);
    if (idx < 0) return html;
    // Always mark the topbar so the old "BLOODWORKS // X" ::before
    // content (rig_assembly_command_extension.js) is suppressed - that
    // generic double-slash is exactly what's being replaced here.
    const withAttr = html.replace(openTag, '<div class="topbar pn-rig-cmd-top" data-rig-view="' + view + '" data-bw-eyebrow="1">');
    // The list view's own <h1> is already renamed to "BLOODWORKS"
    // (terminal_naming_extension.js), so a "BLOODWORKS · ..." crumb
    // above it would just repeat the brand name back at itself - leave
    // it with no eyebrow at all there. Editor/family carry a real
    // part/family name as their <h1>, where the crumb adds information
    // the heading doesn't already have.
    if (view === "list") return withAttr;
    const h1Idx = withAttr.indexOf('<h1>', idx);
    if (h1Idx < 0) return withAttr;
    return withAttr.slice(0, h1Idx) + crumbHtml(view) + withAttr.slice(h1Idx);
  }

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    const match = html.match(/data-rig-view="(editor|family|list)"/);
    if (match) html = polishHeader(html, match[1]);
    return html;
  };
  route.__pnBloodworksHeaderPolishV1 = true;
})();
