"use strict";

/*
  PROFITNODE — enter Build Workspace prices in RSD or EUR.

  Price inputs in the Build Workspace used to take only the build's own
  currency. Each one now gets an RSD/EUR selector. Switching it converts the
  number already in the box at the fixed rate, and the amount is stored as
  typed in the chosen currency (planned slots, extras and Parts Vault items
  already carry their own currency and are converted for totals).

  - Part picker / case picker / extras: the chosen currency lives on the
    draft (PBUI.slot / PBUI.caseDraft / PBUI.extraDraft .currency) so it
    survives the picker's re-renders. Extras already save d.currency; slot
    saves hardcode the project currency, so Actions.setProjectSlot is
    wrapped to apply the draft currency during a SAVE click.
  - EDIT PRICE: saved here. An owned part's Parts Vault row gets the typed
    price in the chosen currency (previously a project-currency number was
    written into the item's own currency field), a planned part its cost.
  Allocations and RAM sticks have their own selectors (loadout_command /
  ram_sticks extensions) and use pnEntryCurrencySelect from here.
*/
(function installCurrencyEntryV1(){
  if (typeof renderProjectBuild !== "function" || typeof Actions === "undefined" || renderProjectBuild.__pnCurrencyEntryV1) return;
  const LIST = typeof CURRENCIES !== "undefined" && Array.isArray(CURRENCIES) ? CURRENCIES : ["RSD", "EUR"];

  const roundFor = (v, cur) => cur === "RSD" ? Math.round(v) : Math.round(v * 100) / 100;
  globalThis.pnEntryCurrencySelect = (attr, current) => '<select class="pn-entry-cur" ' + attr + ' data-prev="' + current + '" aria-label="Currency">'
    + LIST.map(c => '<option value="' + c + '"' + (c === current ? " selected" : "") + ">" + c + "</option>").join("") + "</select>";

  const ui = () => typeof PBUI !== "undefined" ? PBUI : null;
  const draftFor = key => {
    const s = ui();
    if (!s) return null;
    return key === "slot" ? s.slot : key === "case" ? s.caseDraft : key === "extra" ? s.extraDraft : key === "quick" ? s.quickPrice : null;
  };
  const ensureDefaults = p => {
    const s = ui();
    if (!s || !p) return;
    const existing = s.slotKey && p.slots ? p.slots[s.slotKey] : null;
    const slotCur = existing && existing.kind === "PLANNED" && existing.currency ? existing.currency : p.currency;
    if (s.slot && !s.slot.currency) s.slot.currency = slotCur;
    if (s.caseDraft && !s.caseDraft.currency) s.caseDraft.currency = slotCur;
    if (s.extraDraft && !s.extraDraft.currency) s.extraDraft.currency = p.currency;
    if (s.quickPrice && !s.quickPrice.currency) s.quickPrice.currency = p.currency;
  };

  const baseRender = renderProjectBuild;
  const wrappedRender = function(){
    const p = typeof pbProject === "function" ? pbProject() : null;
    ensureDefaults(p);
    let html = String(baseRender.apply(this, arguments));
    if (!p) return html;
    const s = ui() || {};
    html = html.replace(/<input[^>]*(data-pb-field="cost"|data-pb-case-cost|data-pb-extra-field="cost"|data-pb-quick-price-input="[^"]*")[^>]*>/g, (tag, which) => {
      if (/readonly/.test(tag)) return tag;
      const key = which.indexOf("quick") > -1 ? "quick" : which.indexOf("extra") > -1 ? "extra" : which.indexOf("case-cost") > -1 || (s.slotKey === "CASE" && s.caseDraft) ? "case" : "slot";
      const d = draftFor(key);
      return tag + pnEntryCurrencySelect('data-pn-entry-cur="' + key + '"', (d && d.currency) || p.currency);
    });
    return html.replace(/((?:ESTIMATED |PLANNED )?COST) \((?:RSD|EUR)\)/g, "$1");
  };
  wrappedRender.__pnCurrencyEntryV1 = true;
  renderProjectBuild = wrappedRender;

  // Slot saves pass the project currency; use the draft's chosen currency.
  let pendingCurrency = null;
  const baseSet = Actions.setProjectSlot;
  Actions.setProjectSlot = function(projectId, slotKey, kind, data){
    if (pendingCurrency && kind === "PLANNED" && data) data = Object.assign({}, data, { currency: pendingCurrency });
    return baseSet.call(this, projectId, slotKey, kind, data);
  };
  document.addEventListener("click", e => {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("[data-pb-save-slot],[data-pb-save-case]")){
      const s = ui(), d = s && (t.closest("[data-pb-save-case]") ? s.caseDraft : s.slot);
      pendingCurrency = d && d.currency || null;
      setTimeout(() => { pendingCurrency = null; }, 0);
      return;
    }
    const qs = t.closest("[data-pb-quick-price-save]");
    if (!qs) return;
    const p = typeof pbProject === "function" ? pbProject() : null, s = ui();
    const k = qs.dataset.pbQuickPriceSave, slot = p && p.slots ? p.slots[k] : null;
    const input = document.querySelector('[data-pb-quick-price-input="' + k + '"]');
    if (!p || !slot || !input || !s) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const cur = (s.quickPrice && s.quickPrice.currency) || p.currency;
    const val = Math.max(0, roundFor(Number(String(input.value).replace(",", ".")) || 0, cur));
    if (slot.kind === "INVENTORY" && slot.inventoryItemId) Actions.updateInventory(slot.inventoryItemId, { purchasePrice: val, currency: cur });
    else Actions.setProjectSlot(p.id, k, "PLANNED", Object.assign({}, slot, { cost: val, currency: cur }));
    s.quickPrice = null;
    if (typeof pbSetNotice === "function") pbSetNotice("ok", "Price updated.");
    render();
  }, true);

  // Switching currency converts the number already typed, then records the
  // choice on the matching draft.
  document.addEventListener("change", e => {
    const sel = e.target && e.target.closest ? e.target.closest("select.pn-entry-cur") : null;
    if (!sel) return;
    const prev = sel.dataset.prev, next = sel.value;
    sel.dataset.prev = next;
    const box = sel.closest(".field,.pn-pb-price-edit,.pn-lo-alloc-edit,.pn-lo-stick-editor,.pn-lo-alloc") || sel.parentElement;
    const input = box && box.querySelector('input[type="number"]');
    if (input && input.value !== "" && prev && prev !== next && typeof convert === "function"){
      input.value = roundFor(convert(Number(String(input.value).replace(",", ".")) || 0, prev, next), next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const key = sel.dataset.pnEntryCur, d = key ? draftFor(key) : null;
    if (d){
      d.currency = next;
      if (input && key === "quick") d.value = input.value;
    }
  });

  const style = document.createElement("style");
  style.textContent = ".pn-pb-page .field:has(>select.pn-entry-cur){display:grid;grid-template-columns:minmax(0,1fr) 84px;column-gap:6px;align-items:end}"
    + ".pn-pb-page .field:has(>select.pn-entry-cur)>span{grid-column:1/-1}"
    + ".pn-pb-page select.pn-entry-cur{width:auto;min-width:72px;font:600 12px var(--stamp);letter-spacing:.12em;padding:5px 6px;border-radius:0;border-color:rgba(242,201,76,.45);color:#f2c94c;background:rgba(8,8,18,.6)}";
  document.head.appendChild(style);
})();
