"use strict";

/*
  PROFITNODE — Build Workspace command-console skin (header, BUILD RATING,
  cost tiles and COMPONENT LOADOUT).

  Restyles the Build Workspace loadout cards as console "module bays" to
  match the FISCAL OPS budget telemetry in COST DETAILS: each bay takes its
  slot's gauge colour (PN_SLOT_GAUGE_COLORS from project_budget_extension.js,
  so a card and its gauge segment are the same colour), gets a bay number,
  a 7-pip quality signal for its PROFITNODE tier, and its share of the
  planned budget. Empty slots render as offline bays.

  Display only: it wraps pbSlotCardHtml / renderProjectBuild output and adds
  markup and attributes beside the existing ones, never removing or renaming
  anything the rest of the app or the tests key on.
*/
(function installLoadoutCommandV1(){
  if (typeof pbSlotCardHtml !== "function" || pbSlotCardHtml.__pnLoadoutCmdV1) return;

  const TIER_LEVEL = { POOR: 1, COMMON: 2, UNCOMMON: 3, RARE: 4, EPIC: 5, LEGENDARY: 6, ARTIFACT: 7 };
  const colorFor = key => {
    const palette = globalThis.PN_SLOT_GAUGE_COLORS || {};
    if (palette[key]) return palette[key];
    const meta = typeof CATEGORY_META !== "undefined" && typeof RIG_SLOT_CATEGORY !== "undefined" ? CATEGORY_META[RIG_SLOT_CATEGORY[key]] : null;
    return meta ? meta[0] : "#9fb4c8";
  };
  const bayCode = key => {
    const idx = (typeof PROJECT_BUILD_SLOTS !== "undefined" ? PROJECT_BUILD_SLOTS.indexOf(key) : -1) + 1;
    return idx > 0 ? (idx < 10 ? "0" : "") + idx : "--";
  };

  // Inline editor state for reserving budget on an empty bay (one at a time).
  const ALLOC_UI = { slotKey: null };
  const allocFor = (project, slotKey) => {
    const a = project && project.allocations && project.allocations[slotKey];
    return a && Number(a.amount) > 0 ? Number(a.amount) : 0;
  };
  const allocHtml = (project, slotKey, locked) => {
    const amount = allocFor(project, slotKey);
    if (!locked && ALLOC_UI.slotKey === slotKey){
      return '<div class="pn-lo-alloc is-editing"><span class="pn-lo-alloc-k">RESERVE BUDGET (' + escHtml(project.currency) + ')</span>'
        + '<span class="pn-lo-alloc-edit"><input type="number" min="0" step="1" data-pb-alloc-input="' + slotKey + '" value="' + (amount || "") + '" placeholder="0">'
        + '<button type="button" class="btn btn-sm btn-primary" data-pb-alloc-save="' + slotKey + '">SAVE</button>'
        + '<button type="button" class="btn btn-sm btn-ghost" data-pb-alloc-cancel>×</button></span></div>';
    }
    if (amount > 0){
      const budget = Number(project.budget);
      return '<div class="pn-lo-alloc" data-lo-allocated="' + amount + '"><span class="pn-lo-alloc-k">ALLOCATED</span><b>' + money(amount, project.currency) + '</b>'
        + (budget > 0 ? '<span class="pn-lo-alloc-share">' + (Math.round(amount / budget * 1000) / 10) + '% OF BUDGET</span>' : "")
        + (locked ? "" : '<span class="pn-lo-alloc-actions"><button type="button" class="btn btn-sm pn-lo-price-btn" data-pb-alloc-open="' + slotKey + '">EDIT ALLOCATION</button>'
          + '<button type="button" class="btn btn-sm btn-ghost" data-pb-alloc-clear="' + slotKey + '">CLEAR</button></span>') + '</div>';
    }
    return locked ? "" : '<button type="button" class="btn btn-sm pn-lo-price-btn" data-pb-alloc-open="' + slotKey + '" title="Reserve part of the budget for this part before choosing it">ALLOCATE BUDGET</button>';
  };

  globalThis.pnLoadoutAllocHtml = allocHtml;

  const baseCard = pbSlotCardHtml;
  const wrappedCard = function(project, slotKey, locked){
    const html = String(baseCard.apply(this, arguments));
    const end = html.indexOf(">");
    if (end < 0) return html;
    const slot = project && project.slots ? project.slots[slotKey] : null;
    const kind = !slot ? "empty" : slot.kind === "INVENTORY" ? "owned" : "planned";
    const color = colorFor(slotKey);

    let opening = html.slice(0, end);
    if (/style="/.test(opening)) opening = opening.replace(/style="([^"]*)"/, (m, css) => 'style="' + css + (css && !/;\s*$/.test(css) ? ";" : "") + "--lo-c:" + color + '"');
    else opening += ' style="--lo-c:' + color + '"';
    opening = opening.replace(" data-pb-slot=", ' data-lo-kind="' + kind + '"' + (!slot && allocFor(project, slotKey) ? ' data-lo-alloc="1"' : "") + ' data-pb-slot=');

    let strip;
    if (!slot){
      strip = '<span class="pn-lo-bay">BAY ' + bayCode(slotKey) + '</span>';
    } else {
      const q = (html.match(/data-pb-quality="([A-Z]+)"/) || [])[1] || "UNRATED";
      const level = TIER_LEVEL[q] || 0;
      const pips = Array.from({ length: 7 }, (_, i) => '<i' + (i < level ? ' class="on"' : "") + "></i>").join("");
      const budget = Number(project.budget);
      const paid = typeof pbPaidAmount === "function" ? Number(pbPaidAmount(project, slot)) || 0 : 0;
      const share = budget > 0 ? '<span class="pn-lo-share" data-lo-share="' + slotKey + '">' + (Math.round(paid / budget * 1000) / 10) + "% OF BUDGET</span>" : "";
      strip = '<div class="pn-lo-strip"><span class="pn-lo-bay">BAY ' + bayCode(slotKey) + "</span>"
        + '<span class="pn-lo-signal pn-tier-' + q.toLowerCase() + '" title="PROFITNODE quality signal: ' + q + (level ? " (" + level + "/7)" : "") + '">' + pips + "</span>"
        + share + "</div>";
    }
    let body = html.slice(end + 1).replace("<b>PAID ", '<b><small>PAID</small> ').replace("<b>PLANNED COST ", '<b><small>PLANNED COST</small> ');
    if (body.indexOf('data-pb-quick-price="' + slotKey + '"') > -1){
      const headBtn = new RegExp('(<button[^>]*data-pb-edit-slot="' + slotKey + '"[^>]*>[^<]*</button>)');
      body = body.replace(headBtn, '<span class="pn-lo-head-actions">$1<button type="button" class="btn btn-sm pn-lo-price-btn" data-pb-quick-price="' + slotKey + '" title="Edit the price recorded for this part">EDIT PRICE</button></span>');
    }
    if (!slot){
      const close = body.lastIndexOf("</div>");
      if (close > -1) body = body.slice(0, close) + allocHtml(project, slotKey, locked) + body.slice(close);
    }
    return opening + ">" + strip + body;
  };
  wrappedCard.__pnLoadoutCmdV1 = true;
  pbSlotCardHtml = wrappedCard;

  if (typeof renderProjectBuild === "function" && !renderProjectBuild.__pnLoadoutCmdV1){
    const baseRender = renderProjectBuild;
    const wrappedRender = function(){
      const html = String(baseRender.apply(this, arguments));
      const p = typeof pbProject === "function" ? pbProject() : null;
      if (!p || typeof Actions === "undefined" || !Actions.projectBuildStats) return html;
      const st = Actions.projectBuildStats(p);
      const planned = Math.max(0, (st.slotsFilled || 0) - (st.slotsOwned || 0));
      const offline = Math.max(0, (st.slotsTotal || 0) - (st.slotsFilled || 0));
      const allocatedBays = typeof pnBudgetAllocations === "function" ? pnBudgetAllocations(p).length : 0;
      const readout = '<span class="pn-lo-readout" data-lo-readout><b>' + (st.slotsFilled || 0) + "/" + (st.slotsTotal || 0) + "</b> BAYS ONLINE"
        + "<em>" + (st.slotsOwned || 0) + " OWNED</em><em class=\"is-planned\">" + planned + " PLANNED</em>" + (offline ? '<em class="is-offline">' + offline + " OFFLINE</em>" : "") + (allocatedBays ? '<em class="is-alloc">' + allocatedBays + " ALLOCATED</em>" : "") + "</span>";
      return html.replace("<h2>COMPONENT LOADOUT</h2>", "<h2>COMPONENT LOADOUT</h2>" + readout);
    };
    wrappedRender.__pnLoadoutCmdV1 = true;
    renderProjectBuild = wrappedRender;
  }

  const saveAllocation = slotKey => {
    const p = typeof pbProject === "function" ? pbProject() : null;
    const input = document.querySelector('[data-pb-alloc-input="' + slotKey + '"]');
    if (!p || !input) return;
    const amount = Math.max(0, Number(String(input.value).replace(",", ".")) || 0);
    const next = Object.assign({}, p.allocations || {});
    if (amount > 0) next[slotKey] = { amount }; else delete next[slotKey];
    Store.update("projects", p.id, { allocations: next });
    ALLOC_UI.slotKey = null;
    render();
  };
  document.addEventListener("click", e => {
    const t = e.target;
    if (!t || !t.closest) return;
    const open = t.closest("[data-pb-alloc-open]");
    if (open){
      ALLOC_UI.slotKey = open.dataset.pbAllocOpen;
      render();
      const input = document.querySelector('[data-pb-alloc-input="' + ALLOC_UI.slotKey + '"]');
      if (input){ input.focus(); input.select(); }
      return;
    }
    const save = t.closest("[data-pb-alloc-save]");
    if (save) return saveAllocation(save.dataset.pbAllocSave);
    if (t.closest("[data-pb-alloc-cancel]")){ ALLOC_UI.slotKey = null; render(); return; }
    const clear = t.closest("[data-pb-alloc-clear]");
    if (clear){
      const p = typeof pbProject === "function" ? pbProject() : null;
      if (!p) return;
      const next = Object.assign({}, p.allocations || {});
      delete next[clear.dataset.pbAllocClear];
      Store.update("projects", p.id, { allocations: next });
      render();
    }
  });
  document.addEventListener("keydown", e => {
    const input = e.target && e.target.closest ? e.target.closest("[data-pb-alloc-input]") : null;
    if (!input) return;
    if (e.key === "Enter"){ e.preventDefault(); saveAllocation(input.dataset.pbAllocInput); }
    else if (e.key === "Escape"){ ALLOC_UI.slotKey = null; render(); }
  });

  const L = "[data-pb-loadout]";
  const style = document.createElement("style");
  style.textContent = ""
    + L + ">.panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid rgba(88,174,232,.25)}"
    + ".pn-lo-readout{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font:600 12px var(--stamp);letter-spacing:.18em;color:#58aee8}"
    + ".pn-lo-readout b{font-size:15px;color:#fff;margin-right:-4px}.pn-lo-readout em{font-style:normal;padding:2px 9px;border:1px solid rgba(80,255,120,.5);color:var(--green);clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)}"
    + ".pn-lo-readout em.is-planned{border-color:rgba(116,199,255,.6);color:#74c7ff}.pn-lo-readout em.is-offline{border-color:rgba(198,187,211,.4);color:var(--text-muted)}"
    + L + " .pn-pb-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}"
    + L + " .pn-pb-slot{position:relative;--lo-c:#9fb4c8;border:1px solid color-mix(in srgb,var(--lo-c) 45%,transparent);border-left:1px solid color-mix(in srgb,var(--lo-c) 45%,transparent);border-radius:0;padding:12px 14px 12px 18px;gap:8px;min-height:236px;"
      + "clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,14px 100%,0 calc(100% - 14px));"
      + "background:linear-gradient(90deg,color-mix(in srgb,var(--lo-c) 6%,transparent) 1px,transparent 1px) 0 0/22px 22px,linear-gradient(0deg,color-mix(in srgb,var(--lo-c) 5%,transparent) 1px,transparent 1px) 0 0/22px 22px,"
      + "linear-gradient(160deg,color-mix(in srgb,var(--lo-c) 16%,transparent),rgba(12,10,22,.55) 55%);box-shadow:inset 0 0 34px -14px var(--lo-c);transition:box-shadow .2s,border-color .2s}"
    + L + " .pn-pb-slot::before{content:'';position:absolute;left:0;top:0;bottom:14px;width:4px;background:var(--lo-c);box-shadow:0 0 12px var(--lo-c)}"
    + L + " .pn-pb-slot::after{content:'';position:absolute;right:0;top:0;width:22px;height:22px;background:linear-gradient(225deg,var(--lo-c) 0 30%,transparent 30%);opacity:.9}"
    + L + " .pn-pb-slot:hover{border-color:var(--lo-c);box-shadow:inset 0 0 44px -10px var(--lo-c)}"
    + L + " .pn-pb-slot.pn-tier-card{border-color:color-mix(in srgb,var(--lo-c) 45%,transparent)}"
    + L + " .pn-lo-strip{display:flex;align-items:center;gap:10px;margin:-2px 14px 2px 0;padding-bottom:7px;border-bottom:1px solid color-mix(in srgb,var(--lo-c) 30%,transparent)}"
    + L + " .pn-lo-bay{font:600 11px var(--stamp);letter-spacing:.24em;color:color-mix(in srgb,var(--lo-c) 75%,#fff)}"
    + L + " .pn-lo-signal{display:inline-flex;gap:3px;align-items:flex-end;height:14px}"
    + L + " .pn-lo-signal i{width:5px;background:rgba(160,180,200,.18)}"
    + L + " .pn-lo-signal i:nth-child(1){height:4px}" + L + " .pn-lo-signal i:nth-child(2){height:5.5px}" + L + " .pn-lo-signal i:nth-child(3){height:7px}" + L + " .pn-lo-signal i:nth-child(4){height:8.5px}" + L + " .pn-lo-signal i:nth-child(5){height:10px}" + L + " .pn-lo-signal i:nth-child(6){height:12px}" + L + " .pn-lo-signal i:nth-child(7){height:14px}"
    + L + " .pn-lo-signal i.on{background:var(--tier-color,#c6bbd3);box-shadow:0 0 6px var(--tier-color,#c6bbd3)}"
    + L + " .pn-lo-share{margin-left:auto;font:600 11px var(--stamp);letter-spacing:.14em;color:var(--text-muted)}"
    + L + " .pn-pb-slot-head{gap:6px 8px;flex-wrap:wrap;margin-right:6px}"
    + L + " .pn-pb-slot .pn-cat-label{color:var(--lo-c) !important;text-shadow:0 0 14px color-mix(in srgb,var(--lo-c) 55%,transparent);font-family:var(--stamp);letter-spacing:.12em}"
    + L + " .pn-pb-slot-model-line{gap:8px;align-items:center}"
    + L + " .pn-pb-slot-model{font:600 17px/1.25 var(--sans) !important;color:#fff !important;text-shadow:none}"
    + L + " .pn-pb-quality{font:600 10px var(--stamp) !important;letter-spacing:.16em !important;padding:2px 8px !important;border-radius:0 !important;clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%);box-shadow:0 0 10px -2px var(--tier-color)}"
    + L + " .pn-pb-slot-spec{font:500 13px var(--mono);color:var(--text-muted)}"
    + L + " .pn-pb-ram-config{font-size:12px}"
    + L + " .pn-pb-slot-foot{margin-top:auto;gap:8px 10px;align-items:center;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--lo-c) 30%,transparent);min-height:0}"
    + L + " .pn-pb-price{font-size:12px;gap:8px;width:100%}"
    + L + " .pn-pb-price b{font:600 22px var(--stamp);letter-spacing:.04em;color:#fff;white-space:nowrap}"
    + L + " .pn-pb-price b small{display:block;font:600 10px var(--stamp);letter-spacing:.22em;color:var(--text-muted);margin-bottom:1px}"
    + L + " .pn-pb-vault-link{white-space:nowrap}"
    + L + " .pn-pb-price-edit-btn,.pn-pb-vault-link{font:600 10px var(--stamp) !important;letter-spacing:.16em !important;border-radius:0 !important;padding:2px 8px !important;clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}"
    + L + " .pn-pb-slot-foot .chip{font:600 11px var(--stamp);letter-spacing:.14em;border-radius:0;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);padding:3px 12px}"
    + L + " .pn-pb-slot .btn{font-family:var(--stamp);letter-spacing:.16em;border-radius:0;clip-path:polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%);padding:5px 16px;border-color:color-mix(in srgb,var(--lo-c) 55%,transparent);background:color-mix(in srgb,var(--lo-c) 10%,transparent)}"
    + L + " .pn-pb-slot .btn:hover{background:color-mix(in srgb,var(--lo-c) 24%,transparent);border-color:var(--lo-c)}"
    + L + " .pn-lo-head-actions{display:flex;gap:6px;margin-left:auto;flex:none}" + L + " .pn-lo-head-actions .btn{margin-left:0 !important}"
    + L + " .pn-pb-slot .pn-lo-price-btn{border-color:rgba(242,201,76,.55);background:rgba(242,201,76,.1);color:#f2c94c}"
    + L + " .pn-pb-slot .pn-lo-price-btn:hover{background:rgba(242,201,76,.24);border-color:#f2c94c;color:#fff}"
    + L + " .pn-pb-price .pn-pb-price-edit-btn{display:none}"
    + L + " .pn-pb-slot [data-pb-remove-slot]{align-self:flex-start;margin-top:2px !important;background:transparent;border-color:rgba(255,90,90,.35);color:#ff8f8f}"
    + L + " .pn-pb-slot [data-pb-remove-slot]:hover{background:rgba(255,70,70,.14);border-color:var(--red);color:#fff}"
    + L + " .pn-pb-slot[data-lo-kind=planned]{border-style:dashed}"
    + L + " .pn-pb-slot[data-lo-kind=planned] .pn-pb-price b{color:#74c7ff}"
    + L + " .pn-pb-slot.is-empty{opacity:1;align-self:stretch;min-height:236px;flex-direction:column;align-items:flex-start;justify-content:center;gap:10px;border-style:dashed;"
      + "background:repeating-linear-gradient(-45deg,color-mix(in srgb,var(--lo-c) 7%,transparent) 0 10px,transparent 10px 20px);box-shadow:none}"
    + L + " .pn-pb-slot.is-empty::before{opacity:.35;box-shadow:none}" + L + " .pn-pb-slot.is-empty::after{opacity:.35}"
    + L + " .pn-pb-slot.is-empty .pn-cat-label{opacity:.85}"
    + L + " .pn-pb-slot.is-empty .pn-pb-slot-empty-hint{margin:0;font:600 13px var(--stamp);letter-spacing:.24em;color:var(--text-muted)}"
    + L + " .pn-pb-slot.is-empty .pn-pb-slot-empty-hint::after{content:' · BAY OFFLINE';color:color-mix(in srgb,var(--lo-c) 60%,var(--text-muted))}"
    + L + " .pn-pb-slot.is-empty .btn{margin-top:4px}"
    + L + " .pn-pb-slot.is-empty[data-lo-alloc] .pn-pb-slot-empty-hint::after{content:' · BUDGET RESERVED';color:#f2c94c}"
    + L + " .pn-pb-slot.is-empty[data-lo-alloc]{border-color:rgba(242,201,76,.55)}"
    + L + " .pn-lo-alloc{display:flex;flex-direction:column;gap:4px;width:100%;padding-top:8px;border-top:1px dashed rgba(242,201,76,.35)}"
    + L + " .pn-lo-alloc-k{font:600 10px var(--stamp);letter-spacing:.22em;color:var(--text-muted)}"
    + L + " .pn-lo-alloc>b{font:600 22px var(--stamp);letter-spacing:.04em;color:#f2c94c}"
    + L + " .pn-lo-alloc-share{font:600 11px var(--stamp);letter-spacing:.14em;color:var(--text-muted)}"
    + L + " .pn-lo-alloc-actions,.pn-lo-alloc-edit{display:flex;gap:6px;flex-wrap:wrap;align-items:center}"
    + L + " .pn-lo-alloc-edit input{width:110px;font-size:14px}"
    + ".pn-lo-readout em.is-alloc{border-color:rgba(242,201,76,.6);color:#f2c94c}"
    + "@media(max-width:760px){" + L + " .pn-pb-grid{grid-template-columns:1fr}" + L + " .pn-pb-slot{min-height:0}" + L + " .pn-pb-slot.is-empty{min-height:0}" + L + " .pn-pb-slot.is-empty{padding:14px 14px 14px 18px}}";
  document.head.appendChild(style);

  const P = ".pn-pb-page";
  const R = ":is(.pn-pb-page,.pn-rig-cmd)";
  const CHAMFER = "clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,16px 100%,0 calc(100% - 16px));";
  const GRID_BG = "linear-gradient(90deg,rgba(88,174,232,.045) 1px,transparent 1px) 0 0/26px 26px,linear-gradient(0deg,rgba(88,174,232,.04) 1px,transparent 1px) 0 0/26px 26px";
  const ANGLE = "clip-path:polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%);border-radius:0;";
  const top = document.createElement("style");
  top.textContent = ""
    + P + " .pn-pb-hero{position:relative;border:1px solid rgba(88,174,232,.45);border-radius:0;padding:18px 22px 16px;" + CHAMFER
      + "background:" + GRID_BG + ",linear-gradient(120deg,rgba(88,174,232,.16),rgba(178,92,255,.08) 45%,rgba(12,10,22,.6));box-shadow:inset 0 0 50px -18px rgba(88,174,232,.45)}"
    + P + " .pn-pb-hero::after{content:'';position:absolute;right:0;top:0;width:26px;height:26px;background:linear-gradient(225deg,#58aee8 0 30%,transparent 30%)}"
    + P + " .pn-pb-hero::before{content:'';position:absolute;left:0;top:18px;bottom:30px;width:4px;background:#58aee8;box-shadow:0 0 14px #58aee8}"
    + P + " .pn-pb-eyebrow{display:flex;align-items:center;gap:9px;font:600 13px var(--stamp);letter-spacing:.3em;color:#58aee8;margin-bottom:6px}"
    + P + " .pn-pb-eyebrow::before{content:'';width:9px;height:9px;background:#58aee8;transform:rotate(45deg);box-shadow:0 0 8px #58aee8}"
    + P + " .pn-pb-eyebrow::after{content:'// OPERATION FILE';color:var(--text-muted);letter-spacing:.24em;font-size:11px}"
    + P + " .pn-pb-name{font:700 38px/1.05 var(--stamp);letter-spacing:.06em;text-transform:uppercase;color:#fff;text-shadow:0 0 22px rgba(88,174,232,.45);margin:0 0 10px}"
    + P + " .pn-pb-hero .pn-myrig-meta .chip{font:600 12px var(--stamp);letter-spacing:.18em;padding:4px 14px;" + ANGLE + "}"
    + P + " .pn-pb-hero-actions{margin-top:14px;gap:10px;padding-top:12px;border-top:1px solid rgba(88,174,232,.22)}"
    + P + " .pn-pb-hero-actions .btn,.pn-pb-hero-actions>.chip{font:600 13px var(--stamp);letter-spacing:.16em;padding:7px 18px;" + ANGLE + "border-color:rgba(88,174,232,.55);background:rgba(88,174,232,.08)}"
    + P + " .pn-pb-hero-actions .btn:hover{background:rgba(88,174,232,.22);border-color:#58aee8}"
    + P + " .pn-pb-hero-actions>.chip{color:#74c7ff;border-style:dashed}"
    + P + " .pn-pb-hero-actions .btn-danger{border-color:rgba(255,70,70,.6);background:rgba(255,70,70,.08);color:#ff8f8f}"
    + P + " .pn-pb-hero-actions .btn-danger:hover{background:rgba(255,70,70,.22);color:#fff}"

    + R + " .pn-pb-rating{position:relative;border:1px solid rgba(88,174,232,.35);border-radius:0;" + CHAMFER + "background:" + GRID_BG + ",linear-gradient(160deg,rgba(178,92,255,.08),rgba(12,10,22,.5) 60%)}"
    + R + " .pn-pb-rating>.panel-head{border-bottom:1px solid rgba(88,174,232,.25);gap:10px}"
    + R + " .pn-pb-rating>.panel-head h2::before{content:'';display:inline-block;width:8px;height:8px;margin-right:9px;background:#b25cff;transform:rotate(45deg) translateY(-2px);box-shadow:0 0 8px #b25cff}"
    + R + " .pn-pb-rating>.panel-head .chip{font:600 11px var(--stamp);letter-spacing:.18em;" + ANGLE + "padding:3px 12px}"
    + R + " .pn-pb-rating-coverage{font:600 12px var(--stamp) !important;letter-spacing:.2em !important;color:#58aee8 !important}"
    + R + " .pn-pb-rating>.panel-body{padding:14px 18px 16px}"
    + R + " .pn-pb-score-chip{font:700 20px var(--stamp) !important;letter-spacing:.2em !important;padding:8px 22px !important;border-radius:0 !important;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}"
    + R + " .pn-pb-rating-verdict{font:500 15px var(--sans) !important;color:#e6def0 !important;border-left-width:3px !important}"
    + R + " .pn-pb-rating-cats{gap:12px 28px !important;margin-top:16px !important}"
    + R + " .pn-pb-rating-row{grid-template-columns:200px minmax(0,1fr) auto !important;gap:14px !important;border-left-width:3px !important;padding-left:10px !important}"
    + R + " .pn-pb-rating-row>span{font:600 13px var(--stamp) !important;letter-spacing:.14em !important;color:#d9d0e4 !important}"
    + R + " .pn-pb-rating-row>b{font:600 14px var(--stamp) !important;letter-spacing:.06em !important;min-width:150px}"
    + R + " .pn-pb-rating-bar{height:14px !important;border-radius:0 !important;background:rgba(160,180,200,.08) !important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--tier-color,#888) 35%,transparent);"
      + "-webkit-mask:repeating-linear-gradient(90deg,#000 0 9px,transparent 9px 12px);mask:repeating-linear-gradient(90deg,#000 0 9px,transparent 9px 12px)}"
    + R + " .pn-pb-rating-bar i{border-radius:0 !important;box-shadow:0 0 12px var(--tier-color) !important}"
    + R + " .pn-pb-rating-conf{font:600 11px var(--stamp) !important;letter-spacing:.18em !important;margin-top:4px !important}"

    + P + " .pn-pb-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;background:transparent !important;border:0 !important;padding:0}"
    + P + " .pn-pb-stats>.kpi{--k:#58aee8;position:relative;border:1px solid color-mix(in srgb,var(--k) 40%,transparent) !important;border-radius:0;padding:12px 14px 12px 18px !important;"
      + "clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%);background:linear-gradient(150deg,color-mix(in srgb,var(--k) 13%,transparent),rgba(12,10,22,.55) 70%) !important;box-shadow:inset 0 0 30px -14px var(--k)}"
    + P + " .pn-pb-stats>.kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--k);box-shadow:0 0 10px var(--k)}"
    + P + " .pn-pb-stats>.kpi::after{content:'';position:absolute;right:0;top:0;width:18px;height:18px;background:linear-gradient(225deg,var(--k) 0 30%,transparent 30%)}"
    + P + " .pn-pb-stats>[data-pb-cost=cash]{--k:#3ee07a}" + P + " .pn-pb-stats>[data-pb-cost=reused]{--k:#c39bff}" + P + " .pn-pb-stats>[data-pb-cost=basis]{--k:#58aee8}"
    + P + " .pn-pb-stats>[data-pb-cost=planned]{--k:#74c7ff}" + P + " .pn-pb-stats>.kpi:not([data-pb-cost]):not([data-pb-budget]):not([data-pb-lifecycle]){--k:#f2c94c}"
    + P + " .pn-pb-stats>[data-pb-budget]{--k:#3ee07a}" + P + " .pn-pb-stats>[data-pb-budget]:has(.kpi-value[style*='--red']){--k:#ff4a4a}" + P + " .pn-pb-stats>[data-pb-lifecycle]{--k:#39c6f4}"
    + P + " .pn-pb-stats>[data-pb-budget]{grid-column:span 2}" + P + " .pn-pb-stats>[data-pb-lifecycle]{grid-column:span 5}" + P + " .pn-pb-stats:has(>[data-pb-budget])>[data-pb-lifecycle]{grid-column:span 3}"
    + P + " .pn-pb-stats .kpi-label{font:600 12px var(--stamp) !important;letter-spacing:.2em !important;color:color-mix(in srgb,var(--k) 70%,#fff) !important}"
    + P + " .pn-pb-stats .kpi-value{font:700 28px/1.15 var(--stamp) !important;letter-spacing:.04em;color:#fff;margin:4px 0 2px}"
    + P + " .pn-pb-stats .kpi-sub{font:500 12.5px var(--mono) !important;color:var(--text-muted) !important;line-height:1.45}"
    + "@media(max-width:1100px){" + P + " .pn-pb-stats{grid-template-columns:repeat(2,minmax(0,1fr))}" + P + " .pn-pb-stats>.kpi{grid-column:auto !important}" + P + " .pn-pb-stats>[data-pb-lifecycle]{grid-column:1/-1 !important}}"
    + "@media(max-width:820px){" + R + " .pn-pb-rating-row{grid-template-columns:150px minmax(0,1fr) auto !important}" + P + " .pn-pb-name{font-size:30px}" + P + " .pn-pb-eyebrow::after{display:none}}"
    + "@media(max-width:560px){" + P + " .pn-pb-stats{grid-template-columns:1fr}" + R + " .pn-pb-rating-row{grid-template-columns:1fr !important;row-gap:5px !important}" + R + " .pn-pb-rating-row>b{text-align:left !important;min-width:0}" + R + " .pn-pb-rating-conf{text-align:left !important}}";
  document.head.appendChild(top);
})();
