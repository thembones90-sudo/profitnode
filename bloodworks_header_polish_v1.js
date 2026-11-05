"use strict";

/*
  PROFITNODE — BLOODWORKS header polish v4 ("stripped back").

  History, because this took a few swings to land:

  v1 fixed two real bugs: the topbar text crowding against the old
  glowing accent rail below 1181px wide (the rail's left offset and
  the topbar's own padding used different, unsynced formulas), and
  replaced the generic "BLOODWORKS // FORGE"-style double-slash
  eyebrow text with real markup.

  v2 tried to make that markup visually read as upgraded (not just
  technically fixed) by adding diamond caps to the rail and a bigger
  crumb. v3 fixed a real overlap in that version (diamond sitting on
  top of the text at certain widths) by deriving both positions from
  one shared value instead of two hand-tuned numbers.

  None of that was the actual problem. Shown side by side against two
  other directions, the verdict was that a glowing vertical bar with
  rotated-square "diamond" caps reads as RGB-gaming-peripheral, not a
  premium command terminal - no amount of pixel-perfect alignment
  fixes a shape that's wrong. This version removes the bar and the
  diamonds entirely: the old rail (.pn-rig-cmd-top:before, from
  bloodworks_premium_visual_v1.js) is hidden outright, nothing from
  this file replaces it. The eyebrow is now pure typography - a muted
  "BLOODWORKS / <VIEW>" label with a hairline underline beneath only
  the active (accent-colored) word - closer to how Linear/Stripe/
  Vercel dashboards handle a breadcrumb than a sci-fi HUD divider.
  Because there's no rail left to crowd against, the topbar's padding
  no longer needs a special override either - it now falls through to
  whatever rig_assembly_command_extension.js / bloodworks_premium_
  visual_v1.js already set (22px base / centered-in-1780px at
  >=1181px), which also means the original "text jammed against the
  line" complaint from v1 is now moot by construction, not by careful
  spacing: there's nothing left for the text to be jammed against.

  The faint tick-mark rule along the topbar's top edge (texture, not
  a "shape" - no fill, no glow, barely-there opacity) is kept; it
  wasn't part of what got flagged.

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
    .pn-rig-cmd-top:before{display:none!important}

    .pn-rig-cmd-top::after{content:"";position:absolute;top:0;left:0;right:0;height:2px;pointer-events:none;
      background:linear-gradient(90deg,transparent,rgba(255,53,85,.5) 12%,rgba(255,53,85,.5) 88%,transparent),
                 repeating-linear-gradient(90deg,rgba(255,255,255,.4) 0 1px,transparent 1px 34px);
      background-blend-mode:screen;opacity:.5}

    .pn-rig-cmd-top[data-bw-eyebrow] h1:before{content:none!important}
    .pn-rig-cmd-top .pn-bw-crumb{display:flex!important;align-items:baseline;gap:8px;margin-bottom:7px;
      font:600 11px/1 var(--mono);letter-spacing:.14em}
    .pn-rig-cmd-top .pn-bw-crumb-brand{color:#6f6876}
    .pn-rig-cmd-top .pn-bw-crumb-sep{color:#423c49}
    .pn-rig-cmd-top .pn-bw-crumb-view{position:relative;padding-bottom:4px;color:#ff4968}
    .pn-rig-cmd-top .pn-bw-crumb-view::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:#ff4968}
  `;
  document.head.appendChild(style);

  function crumbHtml(view){
    const label = VIEW_LABEL[view] || view;
    return '<div class="pn-bw-crumb"><span class="pn-bw-crumb-brand">BLOODWORKS</span><span class="pn-bw-crumb-sep" aria-hidden="true">/</span><span class="pn-bw-crumb-view">' + label + '</span></div>';
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
    // (terminal_naming_extension.js), so a "BLOODWORKS / ..." crumb
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
