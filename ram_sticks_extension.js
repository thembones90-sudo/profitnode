"use strict";

/*
  PROFITNODE — RAM as two sticks in the Build Workspace, with a PAIRED view.

  Real builds often run two different sticks, so by default the RAM bay is
  shown as STICK A and STICK B, each picked independently (a Parts Vault
  stick or a planned stick with its own price). PAIRED collapses them into a
  single combined RAM bay; the original single-kit RAM bay (and its full
  picker) is what PAIRED shows when no sticks were set.

  Data: the per-stick choices live on the RAM slot as slots.RAM.sticks
  ([A, B], each null | {kind:"INVENTORY", inventoryItemId} |
  {kind:"PLANNED", label, cost, currency}); project.ramPaired holds the view.
  After every stick change the canonical RAM slot is rebuilt so everything
  else (stats, rating, Build Check, cost rows) keeps reading one RAM slot:
  all-planned sticks -> one PLANNED slot with the summed cost; owned sticks
  -> an INVENTORY slot (two owned use the RAM HYBRID ramVaultItemIds shape).
  A planned stick next to an owned one is added to planned cost and to the
  cost rows here, since one slot can't be both owned and planned.
*/
(function installRamSticksV1(){
  if (typeof pbSlotCardHtml !== "function" || typeof Store === "undefined" || typeof Actions === "undefined" || pbSlotCardHtml.__pnRamSticksV1) return;

  const STICK_NAMES = ["A", "B"];
  const COLOR = (globalThis.PN_SLOT_GAUGE_COLORS || {}).RAM || "#2FE0A8";
  const UI = { idx: null, mode: "VAULT", price: false };

  const slotOf = p => p && p.slots ? p.slots.RAM || null : null;
  const isPaired = p => {
    if (!p) return false;
    if (p.ramPaired === true) return true;
    if (p.ramPaired === false) return false;
    const slot = slotOf(p);
    return !!(slot && !Array.isArray(slot.sticks));
  };
  // Sticks shown in the split view; a legacy single RAM slot shows as stick A.
  const sticksOf = p => {
    const slot = slotOf(p);
    if (!slot) return [null, null];
    if (Array.isArray(slot.sticks)) return [slot.sticks[0] || null, slot.sticks[1] || null];
    const ids = Actions.projectSlotInventoryIds(slot);
    if (ids.length) return [{ kind: "INVENTORY", inventoryItemId: ids[0] }, ids[1] ? { kind: "INVENTORY", inventoryItemId: ids[1] } : null];
    if (slot.kind === "PLANNED") return [{ kind: "PLANNED", label: slot.label || "Planned RAM", cost: Number(slot.cost) || 0, currency: slot.currency || p.currency }, null];
    return [null, null];
  };
  const stickLabel = st => {
    if (!st) return "";
    if (st.kind === "INVENTORY"){ const it = Store.get("inventory", st.inventoryItemId); return it ? pbPartLabel(it) : "(missing Vault item)"; }
    return st.label || "Planned stick";
  };
  const stickAmount = (p, st) => {
    if (!st) return 0;
    if (st.kind === "INVENTORY"){ const it = Store.get("inventory", st.inventoryItemId); return it ? inventoryAcquisitionCost(it, p.currency) : 0; }
    return convert(Number(st.cost) || 0, st.currency || p.currency, p.currency);
  };
  const mixedPlanned = p => {
    const slot = slotOf(p);
    if (!slot || slot.kind !== "INVENTORY" || !Array.isArray(slot.sticks)) return [];
    return slot.sticks.filter(st => st && st.kind === "PLANNED");
  };

  const ramGroup = item => {
    let d = null;
    try { d = typeof inventoryRamDetails === "function" ? inventoryRamDetails(item) : null; } catch (_){}
    if (!d) return null;
    const moduleCount = Number(d.moduleCount) || 1, per = Number(d.moduleCapacity || d.perModuleCapacity) || (Number(d.totalCapacity) ? Number(d.totalCapacity) / moduleCount : 0);
    if (!per) return null;
    return { inventoryItemId: item.id, moduleCount, perModuleCapacity: per, totalCapacity: Number(d.totalCapacity) || per * moduleCount, technology: String(d.ramType || d.technology || "DDR4").toUpperCase(), speed: Number(d.ramSpeedMTs || d.speed) || 0, casLatency: Number(d.casLatency) || 0, label: pbPartLabel(item) };
  };

  const applySticks = (p, sticks) => {
    if (p.buildLocked) return { ok: false, error: "Completed build is locked." };
    const oldIds = Actions.projectSlotInventoryIds(slotOf(p));
    const ownedIds = sticks.filter(st => st && st.kind === "INVENTORY").map(st => st.inventoryItemId);
    const planned = sticks.filter(st => st && st.kind === "PLANNED");
    oldIds.filter(id => !ownedIds.includes(id)).forEach(id => {
      const it = Store.get("inventory", id);
      if (it && it.assignedProjectId === p.id) Store.update("inventory", id, { assignedProjectId: null, status: it.status === "SOLD" ? it.status : "IN_STORAGE" });
    });
    ownedIds.forEach(id => {
      const it = Store.get("inventory", id);
      if (it && it.assignedProjectId !== p.id) Store.update("inventory", id, { assignedProjectId: p.id, status: "IN_BUILD" });
    });
    const stored = sticks.map(st => st ? Object.assign({}, st) : null);
    let slot = null;
    if (ownedIds.length || planned.length){
      const label = sticks.filter(Boolean).map(stickLabel).join(" + ");
      if (!ownedIds.length){
        slot = { kind: "PLANNED", catalogType: "RAM", label, cost: Math.round(planned.reduce((sum, st) => sum + stickAmount(p, st), 0) * 100) / 100, currency: p.currency, sticks: stored };
      } else {
        slot = { kind: "INVENTORY", inventoryItemId: ownedIds[0], label, sticks: stored };
        if (ownedIds.length > 1){
          slot.ramVaultItemIds = ownedIds.slice();
          slot.hybridOwned = true;
          const groups = ownedIds.map(id => Store.get("inventory", id)).filter(Boolean).map(ramGroup);
          if (groups.length && groups.every(Boolean) && typeof pbRamAggregate === "function"){
            const ram = pbRamAggregate(groups);
            if (ram){ ram.groups = groups; ram.mixed = true; slot.ram = ram; }
          }
        }
      }
    }
    const slots = Object.assign({}, p.slots || {});
    if (slot) slots.RAM = slot; else delete slots.RAM;
    const ownedChanged = oldIds.join("|") !== ownedIds.join("|");
    const invalidated = ownedChanged && !!(p.assembledAt || p.buildVerification);
    if (invalidated) Store.all("inventory").filter(x => x.assignedProjectId === p.id && x.status === "INSTALLED").forEach(x => Store.update("inventory", x.id, { status: "IN_BUILD" }));
    const componentIds = Store.all("inventory").filter(x => x.assignedProjectId === p.id).map(x => x.id);
    Store.update("projects", p.id, Object.assign({ slots, componentIds, ramPaired: false }, invalidated ? { assembledAt: null, verifiedAt: null, buildVerification: null, status: "BUILDING" } : {}));
    return { ok: true };
  };

  // Planned stick next to an owned stick: count it as planned spend.
  const basePlanned = Actions.projectPlannedCost;
  Actions.projectPlannedCost = function(p){
    const base = basePlanned.apply(this, arguments);
    return base + mixedPlanned(p).reduce((sum, st) => sum + stickAmount(p, st), 0);
  };
  if (typeof pbBuildCostRows === "function"){
    const baseRows = pbBuildCostRows;
    pbBuildCostRows = function(p){
      const rows = baseRows.apply(this, arguments);
      mixedPlanned(p).forEach(st => rows.planned.push({ label: RIG_SLOT_LABELS.RAM + " — " + stickLabel(st), amount: stickAmount(p, st) }));
      return rows;
    };
  }

  const availableSticks = (p, idx) => {
    const other = sticksOf(p)[1 - idx];
    const otherId = other && other.kind === "INVENTORY" ? other.inventoryItemId : null;
    return pbAvailableVaultItems(p, "RAM").filter(v => v.id !== otherId && !(v.assignedProjectId && v.assignedProjectId !== p.id));
  };
  const share = (p, amount) => Number(p.budget) > 0 ? '<span class="pn-lo-share">' + (Math.round(amount / Number(p.budget) * 1000) / 10) + "% OF BUDGET</span>" : "";

  const editorHtml = (p, idx, st) => {
    if (UI.price && st){
      return '<div class="pn-lo-stick-editor"><span class="pn-lo-alloc-k">' + (st.kind === "INVENTORY" ? "PAID" : "PLANNED COST") + '</span>'
        + '<span class="pn-lo-alloc-edit"><input type="number" min="0" step="1" data-pb-stick-price-input="' + idx + '" value="' + Math.round(stickAmount(p, st) * 100) / 100 + '">' + (typeof pnEntryCurrencySelect === "function" ? pnEntryCurrencySelect('data-pb-stick-cur="' + idx + '"', p.currency) : "")
        + '<button type="button" class="btn btn-sm btn-primary" data-pb-stick-save="' + idx + '">SAVE</button><button type="button" class="btn btn-sm btn-ghost" data-pb-stick-cancel>×</button></span></div>';
    }
    const vault = availableSticks(p, idx);
    const modeSel = '<select data-pb-stick-mode="' + idx + '"><option value="VAULT"' + (UI.mode === "VAULT" ? " selected" : "") + '>FROM PARTS VAULT</option><option value="PLANNED"' + (UI.mode === "PLANNED" ? " selected" : "") + ">PLANNED STICK</option></select>";
    let fields;
    if (UI.mode === "VAULT"){
      fields = vault.length
        ? '<select data-pb-stick-item="' + idx + '">' + vault.map(v => {
            let hint = ""; try { hint = typeof pbVaultRamHint === "function" ? pbVaultRamHint(v) : ""; } catch (_){}
            const sel = st && st.kind === "INVENTORY" && st.inventoryItemId === v.id ? " selected" : "";
            return '<option value="' + escAttr(v.id) + '"' + sel + ">" + escHtml(pbPartLabel(v) + (hint ? " · " + hint : "") + " · " + money(inventoryAcquisitionCost(v, p.currency), p.currency)) + "</option>";
          }).join("") + "</select>"
        : '<p class="hint" style="margin:0">No free RAM in Parts Vault. Add it there, or plan the stick instead.</p>';
    } else {
      const lab = st && st.kind === "PLANNED" ? st.label : "", cost = st && st.kind === "PLANNED" ? Math.round(stickAmount(p, st) * 100) / 100 : "";
      fields = '<input type="text" data-pb-stick-label="' + idx + '" placeholder="e.g. Kingston Fury 8GB DDR4 3200" value="' + escAttr(lab || "") + '">'
        + '<span class="pn-lo-alloc-edit"><input type="number" min="0" step="1" data-pb-stick-cost="' + idx + '" placeholder="Cost" value="' + cost + '">' + (typeof pnEntryCurrencySelect === "function" ? pnEntryCurrencySelect('data-pb-stick-cur="' + idx + '"', p.currency) : "") + "</span>";
    }
    return '<div class="pn-lo-stick-editor">' + modeSel + fields
      + '<span class="pn-lo-alloc-edit"><button type="button" class="btn btn-sm btn-primary" data-pb-stick-save="' + idx + '">SAVE</button><button type="button" class="btn btn-sm btn-ghost" data-pb-stick-cancel>×</button></span></div>';
  };

  const pairBtn = paired => '<button type="button" class="btn btn-sm pn-lo-pair' + (paired ? " is-on" : "") + '" data-pb-ram-pair="' + (paired ? "off" : "on") + '" title="' + (paired ? "Split RAM into two separate sticks" : "Treat both sticks as one matched pair") + '">' + (paired ? "PAIRED ✓" : "PAIRED") + "</button>";

  const stickCard = (p, idx, locked) => {
    const st = sticksOf(p)[idx], name = STICK_NAMES[idx], editing = !locked && UI.idx === idx;
    const kind = !st ? "empty" : st.kind === "INVENTORY" ? "owned" : "planned";
    const label = idx === 0 ? '<span class="pn-cat-label pn-cat-RAM">RAM</span>' : '<span class="pn-lo-stick-cat">RAM</span>';
    const attrs = ' style="--pb-acc:#32C6A6;--lo-c:' + COLOR + '" data-lo-kind="' + kind + '" data-lo-stick="' + idx + '"' + (idx === 0 ? ' data-pb-slot="RAM"' : "");
    const strip = '<div class="pn-lo-strip"><span class="pn-lo-bay">BAY 03' + name + "</span>" + (st ? share(p, stickAmount(p, st)) : "") + (locked ? "" : pairBtn(false)) + "</div>";
    if (!st){
      const bothEmpty = !slotOf(p);
      return '<div class="pn-pb-slot is-empty"' + attrs + ">" + strip + '<div class="pn-pb-slot-head">' + label + '<span class="pn-lo-stick-tag">STICK ' + name + '</span></div>'
        + '<span class="pn-pb-slot-empty-hint">EMPTY</span>'
        + (editing ? editorHtml(p, idx, null) : locked ? "" : '<button type="button" class="btn btn-sm" data-pb-stick-open="' + idx + '">+ ADD STICK ' + name + "</button>")
        + (idx === 0 && bothEmpty && !editing && typeof pnLoadoutAllocHtml === "function" ? pnLoadoutAllocHtml(p, "RAM", locked) : "")
        + "</div>";
    }
    const amount = stickAmount(p, st), owned = st.kind === "INVENTORY";
    let hint = "";
    if (owned){ const it = Store.get("inventory", st.inventoryItemId); try { hint = it && typeof pbVaultRamHint === "function" ? pbVaultRamHint(it) : ""; } catch (_){} }
    const actions = locked ? "" : '<span class="pn-lo-head-actions"><button type="button" class="btn btn-sm" data-pb-stick-open="' + idx + '">SWAP</button><button type="button" class="btn btn-sm pn-lo-price-btn" data-pb-stick-price="' + idx + '">EDIT PRICE</button></span>';
    const chip = owned ? '<span class="chip chip-amber">VAULT · IN BUILD</span>' : '<span class="chip chip-blue-outline">PLANNED — NOT YET OWNED</span>';
    return '<div class="pn-pb-slot"' + attrs + ">" + strip
      + '<div class="pn-pb-slot-head">' + label + '<span class="pn-lo-stick-tag">STICK ' + name + "</span>" + actions + "</div>"
      + '<div class="pn-pb-slot-model-line"><div class="pn-pb-slot-model">' + escHtml(stickLabel(st)) + "</div></div>"
      + (hint ? '<div class="pn-pb-ram-config">' + escHtml(hint) + "</div>" : "")
      + (editing ? editorHtml(p, idx, st) : '<div class="pn-pb-slot-foot"><span class="pn-pb-price"><b><small>' + (owned ? "PAID" : "PLANNED COST") + "</small> " + money(amount, p.currency) + "</b></span>" + chip + "</div>")
      + (locked ? "" : '<button type="button" class="btn btn-sm btn-ghost" style="margin-top:6px" data-pb-stick-remove="' + idx + '">REMOVE</button>')
      + "</div>";
  };

  const basePaired = pbSlotCardHtml;
  const wrappedCard = function(p, slotKey, locked){
    if (slotKey !== "RAM" || !p) return basePaired.apply(this, arguments);
    if (!isPaired(p)) return stickCard(p, 0, locked) + stickCard(p, 1, locked);
    const html = String(basePaired.apply(this, arguments));
    const slot = slotOf(p);
    let out = html;
    if (slot && Array.isArray(slot.sticks) && slot.sticks.filter(Boolean).length > 1){
      const total = slot.sticks.filter(Boolean).reduce((sum, st) => sum + stickAmount(p, st), 0);
      out = out.replace(/(<div class="pn-pb-slot-model-line">)/, '<div class="pn-lo-pair-note">PAIRED KIT · ' + slot.sticks.filter(Boolean).length + " STICKS · " + money(total, p.currency) + " TOTAL</div>$1");
      out = out.replace(/(<div class="pn-pb-slot-model[^"]*">)[^<]*(<\/div>)/, "$1" + escHtml(slot.sticks.filter(Boolean).map(stickLabel).join(" + ")) + "$2");
      out = out.replace(/<b><small>(?:PAID|PLANNED COST)<\/small> [^<]*<\/b>/, "<b><small>PAIRED TOTAL</small> " + money(total, p.currency) + "</b>");
      out = out.replace(/<button[^>]*class="btn btn-sm pn-lo-price-btn"[^>]*data-pb-quick-price="RAM"[^>]*>EDIT PRICE<\/button>/, "");
    }
    if (!locked) out = out.replace(/(<div class="pn-lo-strip">[\s\S]*?)(<\/div>)/, "$1" + pairBtn(true) + "$2");
    if (!locked && !/class="pn-lo-strip"/.test(out)) out = out.replace(/(<span class="pn-lo-bay">BAY [0-9-]+<\/span>)/, "$1" + pairBtn(true));
    return out;
  };
  wrappedCard.__pnRamSticksV1 = true;
  pbSlotCardHtml = wrappedCard;

  const project = () => typeof pbProject === "function" ? pbProject() : null;
  const close = () => { UI.idx = null; UI.price = false; };
  const saveStick = idx => {
    const p = project();
    if (!p) return;
    const sticks = sticksOf(p), cur = sticks[idx];
    let next;
    const curSel = document.querySelector('[data-pb-stick-cur="' + idx + '"]');
    const entryCur = (curSel && curSel.value) || p.currency;
    const num = v => { const n = Math.max(0, Number(String(v || "0").replace(",", ".")) || 0); return entryCur === "RSD" ? Math.round(n) : Math.round(n * 100) / 100; };
    if (UI.price && cur){
      const val = num((document.querySelector('[data-pb-stick-price-input="' + idx + '"]') || {}).value);
      if (cur.kind === "INVENTORY"){ Actions.updateInventory(cur.inventoryItemId, { purchasePrice: val, currency: entryCur }); next = cur; }
      else next = Object.assign({}, cur, { cost: val, currency: entryCur });
    } else if (UI.mode === "VAULT"){
      const sel = document.querySelector('[data-pb-stick-item="' + idx + '"]'), id = sel && sel.value;
      const item = id && Store.get("inventory", id);
      if (!item){ pbSetNotice("err", "Choose a RAM stick from Parts Vault."); return render(); }
      if (item.assignedProjectId && item.assignedProjectId !== p.id){ pbSetNotice("err", pbPartLabel(item) + " is already used in another build."); return render(); }
      next = { kind: "INVENTORY", inventoryItemId: item.id };
    } else {
      const label = String((document.querySelector('[data-pb-stick-label="' + idx + '"]') || {}).value || "").trim();
      const cost = num((document.querySelector('[data-pb-stick-cost="' + idx + '"]') || {}).value);
      if (!label){ pbSetNotice("err", "Give the planned stick a name."); return render(); }
      next = { kind: "PLANNED", label, cost, currency: entryCur };
    }
    sticks[idx] = next;
    const res = applySticks(p, sticks);
    if (!res.ok) pbSetNotice("err", res.error);
    close();
    render();
  };

  document.addEventListener("click", e => {
    const t = e.target;
    if (!t || !t.closest) return;
    const open = t.closest("[data-pb-stick-open]");
    if (open){
      const p = project(), idx = Number(open.dataset.pbStickOpen), st = p ? sticksOf(p)[idx] : null;
      UI.idx = idx; UI.price = false; UI.mode = st && st.kind === "PLANNED" ? "PLANNED" : "VAULT";
      return render();
    }
    const price = t.closest("[data-pb-stick-price]");
    if (price){
      UI.idx = Number(price.dataset.pbStickPrice); UI.price = true;
      render();
      const input = document.querySelector('[data-pb-stick-price-input="' + UI.idx + '"]');
      if (input){ input.focus(); input.select(); }
      return;
    }
    const save = t.closest("[data-pb-stick-save]");
    if (save) return saveStick(Number(save.dataset.pbStickSave));
    if (t.closest("[data-pb-stick-cancel]")){ close(); return render(); }
    const remove = t.closest("[data-pb-stick-remove]");
    if (remove){
      const p = project();
      if (!p) return;
      const sticks = sticksOf(p);
      sticks[Number(remove.dataset.pbStickRemove)] = null;
      const res = applySticks(p, sticks);
      if (!res.ok) pbSetNotice("err", res.error);
      close();
      return render();
    }
    const pair = t.closest("[data-pb-ram-pair]");
    if (pair){
      const p = project();
      if (!p) return;
      Store.update("projects", p.id, { ramPaired: pair.dataset.pbRamPair === "on" });
      close();
      if (typeof PBUI !== "undefined" && PBUI.slotKey === "RAM"){ PBUI.slotKey = null; PBUI.slot = null; }
      return render();
    }
  });
  document.addEventListener("change", e => {
    const mode = e.target && e.target.closest ? e.target.closest("[data-pb-stick-mode]") : null;
    if (!mode) return;
    UI.mode = mode.value === "PLANNED" ? "PLANNED" : "VAULT";
    render();
  });
  document.addEventListener("keydown", e => {
    const input = e.target && e.target.closest ? e.target.closest("[data-pb-stick-price-input],[data-pb-stick-label],[data-pb-stick-cost]") : null;
    if (!input || UI.idx === null) return;
    if (e.key === "Enter"){ e.preventDefault(); saveStick(UI.idx); }
    else if (e.key === "Escape"){ close(); render(); }
  });

  const L = "[data-pb-loadout]";
  const style = document.createElement("style");
  style.textContent = ""
    + L + " .pn-lo-stick-cat{font:600 15.625px var(--stamp);letter-spacing:.12em;font-weight:700;text-transform:uppercase;color:var(--lo-c);text-shadow:0 0 14px color-mix(in srgb,var(--lo-c) 55%,transparent)}"
    + L + " .pn-lo-stick-tag{font:600 11px var(--stamp);letter-spacing:.2em;color:var(--text-muted);border:1px solid color-mix(in srgb,var(--lo-c) 40%,transparent);padding:1px 7px;clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}"
    + L + " .pn-lo-pair{margin-left:8px !important;padding:2px 10px !important;font-size:10px !important;border-color:rgba(47,224,168,.5) !important;background:transparent !important;color:#2fe0a8}"
    + L + " .pn-lo-pair.is-on{background:rgba(47,224,168,.16) !important;color:#fff;border-color:#2fe0a8 !important}"
    + L + " .pn-lo-pair-note{font:600 11px var(--stamp);letter-spacing:.18em;color:#2fe0a8}"
    + L + " .pn-pb-slot [data-pb-stick-remove]{align-self:flex-start;margin-top:2px !important;background:transparent;border-color:rgba(255,90,90,.35);color:#ff8f8f}"
    + L + " .pn-pb-slot [data-pb-stick-remove]:hover{background:rgba(255,70,70,.14);border-color:var(--red);color:#fff}"
    + L + " .pn-lo-strip .pn-lo-bay," + L + " .pn-lo-strip .pn-lo-share{white-space:nowrap}"
    + L + " .pn-lo-stick-editor{display:flex;flex-direction:column;gap:6px;width:100%;margin-top:4px}"
    + L + " .pn-lo-stick-editor select,.pn-lo-stick-editor input{width:100%;font-size:14px}"
    + L + " .pn-lo-stick-editor .pn-lo-alloc-edit input{width:120px}";
  document.head.appendChild(style);
})();
