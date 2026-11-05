"use strict";

/*
  PROFITNODE — BLOODWORKS header polish v2.

  Three fixes to the topbar, all confirmed by measuring/screenshotting
  the live layout rather than guessing:

  1. Spacing bug: .pn-rig-cmd-top:before (the glowing red accent rail,
     from rig_assembly_command_extension.js) sits at a fixed left:18px.
     bloodworks_premium_visual_v1.js only widens the topbar's own
     left padding at >=1181px (where it and the rail's left offset
     share the same max(Npx, centered) formula, by design keeping a
     steady 7px gap between rail and text). Below that breakpoint the
     topbar falls back to the app's generic .topbar padding, which
     was never raised to account for the rail - measured at 1100px
     wide, the rail's right edge sits just 1px from the title text,
     with its 12px-blur glow bleeding straight across it. Fixed by
     giving the topbar the same deliberate 7px clearance at every
     width, not just >=1181px.

  2. "BLOODWORKS // FORGE" / "// CONFIGURATION BAY" / "// VARIANT
     ARCHIVE": a bare double-slash divider baked into h1::before
     content in rig_assembly_command_extension.js - the generic
     sci-fi-HUD "MODULE // SUBMODULE" trope. Replaced with real
     markup, now sized and weighted to actually read as a header
     element rather than a caption: the brand name muted, the actual
     view name in the accent color, joined by a glowing diamond (not
     a dot - the same 45deg rotated-square marker this design already
     uses everywhere else: panel-head h2::before, COMPONENT BAYS,
     every bay row label) instead of a punctuation crutch. The list
     view's <h1> is already renamed to literally "BLOODWORKS"
     (terminal_naming_extension.js), so it keeps the old eyebrow
     suppressed but gets no crumb of its own - a crumb there would
     just repeat the heading back at itself (caught by screenshot).

  3. The rail itself was a single flat line with no start/end and the
     topbar's top edge was a plain gradient with no texture - v1 of
     this file fixed the spacing and swapped the words but left the
     bar looking exactly like it did before at normal desktop widths,
     which is not what "upgrade the eyebrow" was asking for. Adds:
     diamond caps top and bottom of the rail (same marker as the new
     crumb, so the rail visually terminates in the same shape the
     text crumb starts with - ties the two together as one piece
     instead of "a line" and "some text" sitting next to each other),
     and a faint tick-mark rule along the top edge of the topbar
     (instrument-panel texture, matching the forge/command-console
     language already used in the panels below). None of this adds
     height - the goal is denser/sharper, not bigger, per "needs to
     be compact".

  All display-only: this only edits the topbar HTML the rigbuild
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

    .pn-rig-cmd-top::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;pointer-events:none;
      background:linear-gradient(90deg,transparent,rgba(255,53,85,.5) 12%,rgba(255,53,85,.5) 88%,transparent),
                 repeating-linear-gradient(90deg,rgba(255,255,255,.4) 0 1px,transparent 1px 34px);
      background-blend-mode:screen;opacity:.5}

    .pn-rig-cmd-top .pn-bw-rail-cap{position:absolute;left:15.5px;width:8px;height:8px;background:#ff2349;
      transform:rotate(45deg);box-shadow:0 0 10px rgba(255,35,73,.65),0 0 2px #fff;pointer-events:none}
    .pn-rig-cmd-top .pn-bw-rail-cap-top{top:12px}
    .pn-rig-cmd-top .pn-bw-rail-cap-bottom{bottom:12px}

    .pn-rig-cmd-top[data-bw-eyebrow] h1:before{content:none!important}
    .pn-rig-cmd-top .pn-bw-crumb{display:flex!important;align-items:center;gap:10px;margin-bottom:7px;
      font:700 13px/1 var(--stamp);letter-spacing:.2em;word-spacing:.1em}
    .pn-rig-cmd-top .pn-bw-crumb-dot{flex:0 0 auto;width:7px;height:7px;background:#ff2349;transform:rotate(45deg);
      box-shadow:0 0 10px rgba(255,35,73,.65),0 0 2px #fff}
    .pn-rig-cmd-top .pn-bw-crumb-brand{color:#9a90a3}
    .pn-rig-cmd-top .pn-bw-crumb-view{color:#ff4968;text-shadow:0 0 14px rgba(255,35,73,.35)}

    @media(min-width:1181px){
      .pn-rig-cmd-top{padding-left:max(24px,calc((100% - 1780px)/2))!important}
      .pn-rig-cmd-top .pn-bw-rail-cap{left:calc(max(14px,calc((100% - 1780px)/2)) - 2.5px)}
    }
    @media(max-width:760px){.pn-rig-cmd-top .pn-bw-rail-cap{left:5.5px}}
  `;
  document.head.appendChild(style);

  const RAIL_CAPS = '<span class="pn-bw-rail-cap pn-bw-rail-cap-top" aria-hidden="true"></span><span class="pn-bw-rail-cap pn-bw-rail-cap-bottom" aria-hidden="true"></span>';

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
    // generic double-slash is exactly what's being replaced here -
    // and always give the rail its diamond caps, on every view.
    const newOpen = '<div class="topbar pn-rig-cmd-top" data-rig-view="' + view + '" data-bw-eyebrow="1">' + RAIL_CAPS;
    const withAttr = html.replace(openTag, newOpen);
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
