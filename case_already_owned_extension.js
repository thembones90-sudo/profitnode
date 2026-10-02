"use strict";

/*
  PROFITNODE — "Already owned" path for generic CASE parts.

  The CASE slot picker (pbCaseEditorHtml) only offers two paths: assign a
  PLANNED placeholder (cost tracked, but never becomes a real Parts Vault
  item — "PLANNED — NOT YET OWNED"), or pick an existing CASE item already
  in the vault. There was no way to say "I already own this, here's its
  name/cost, put it in the vault and use it" for a case you didn't buy
  through a catalog entry — exactly the generic spare cases sitting around
  the shop. Every other component category gets this for free because its
  picker searches the vault/registry and a vault hit assigns directly;
  CASE never had an equivalent "register as owned" action.

  This adds one button next to "ASSIGN PLANNED CASE" — same CASE SIZE /
  CUSTOM NAME / COST fields — that creates a real inventory item
  (Actions.addInventory, so it behaves identically to any other vault
  addition: shows up in Parts Vault, subject to the normal Realized Profit
  rule if a cost is entered) and assigns it to the slot immediately.
*/
(function installCaseAlreadyOwnedV1(){
  if (typeof pbCaseEditorHtml !== "function" || pbCaseEditorHtml.__pnAlreadyOwnedV1) return;

  const base = pbCaseEditorHtml;
  const wrapped = function(project){
    const html = base(project);
    return html.replace(
      '<button type="button" class="btn btn-primary" data-pb-save-case>ASSIGN PLANNED CASE</button>',
      '<button type="button" class="btn btn-primary" data-pb-save-case>ASSIGN PLANNED CASE</button>'
      + '<button type="button" class="btn btn-sm" data-pb-save-case-owned style="margin-top:6px">ALREADY OWNED — ADD TO VAULT</button>'
    );
  };
  wrapped.__pnAlreadyOwnedV1 = true;
  pbCaseEditorHtml = wrapped;

  document.addEventListener("click", function(e){
    const btn = e.target.closest("[data-pb-save-case-owned]");
    if (!btn) return;

    const p = pbProject();
    const d = PBUI.caseDraft || {};
    const size = pbBuildCaseSize(d.caseSizeId);
    if (!p) return;
    if (!size) { pbSetNotice("err", "Select a standard case size."); render(); return; }

    const custom = String(d.customName || "").trim();
    const cost = Math.max(0, Math.round(Number(d.cost) || 0));
    const label = custom || size.label;

    const item = Actions.addInventory({
      category: "CASE",
      manufacturer: "",
      model: label,
      condition: "WORKING",
      status: "IN_STORAGE",
      purchasePrice: cost,
      currency: p.currency || "RSD",
      purchaseDate: typeof todayISO === "function" ? todayISO() : "",
      source: "OTHER",
      sourceDetail: "",
      notes: "Already-owned generic case, added from the build picker (" + size.label + ")."
    });

    const res = Actions.setProjectSlot(p.id, "CASE", "INVENTORY", { inventoryItemId: item.id });
    if (res.ok) { PBUI.slotKey = null; PBUI.caseDraft = null; }
    pbSetNotice(res.ok ? "ok" : "err", res.ok ? "Case added to vault and assigned." : res.error);
    render();
  }, true);

  console.info("[PROFITNODE] CASE already-owned path active.");
})();
