"use strict";

/*
  PROFITNODE — Inventory enum safety guard.

  Root cause of the "Parts Vault won't open" crash (2026-10-02): one
  item (a Jonsbo CR-1000 MAX cooler) had condition:"NEW" — not a value
  the app's own form can ever produce (CONDITIONS has no "NEW"), so it
  arrived through a non-UI write that bypassed the dropdown's
  constraint — a direct DB write or a script-based insert, the same
  class of write already implicated in today's cloud-sync incident.

  That one bad value crashed the ENTIRE Parts Vault list (and the
  Repair Bay, which shares the same lookup) for every item, not just
  its own row, because CONDITION_META[item.condition].chip and
  INVENTORY_STATUS_META[item.status].chip throw on an unknown key
  inside a .map() over the whole list — one row's bad data takes down
  every row.

  Two layers:
  1. Heal on load: any inventory item already in the store with a
     condition/status the app doesn't recognize gets snapped to a safe
     default (WORKING / IN_STORAGE), every page load, so this can't
     silently recur and keep crashing the vault.
  2. Guard future local writes: Actions.addInventory/updateInventory
     sanitize condition/status before they ever reach Store, so a
     script-based insert run from this browser can't introduce the bug
     again. (This does NOT protect against a direct database write from
     outside the browser entirely — only the "heal on load" layer
     catches that, on next page load.)
*/
(function installInventoryEnumSafetyV1(){
  if (typeof CONDITION_META === "undefined" || typeof INVENTORY_STATUS_META === "undefined" || typeof Store === "undefined") return;

  // 1. Heal existing data.
  let healed = 0;
  Store.all("inventory").forEach(item => {
    const patch = {};
    if (!CONDITION_META[item.condition]) patch.condition = "WORKING";
    if (!INVENTORY_STATUS_META[item.status]) patch.status = "IN_STORAGE";
    if (Object.keys(patch).length){
      Store.update("inventory", item.id, patch);
      healed++;
    }
  });
  if (healed) console.warn("[PROFITNODE] Healed " + healed + " inventory item(s) with an unrecognized condition/status.");

  // 2. Guard future local writes. Loads late in the manifest so it wraps
  // as the OUTERMOST layer — it sanitizes before any inner extension
  // (e.g. the Realized Profit ledger) ever sees the data.
  if (Actions && typeof Actions.addInventory === "function" && !Actions.addInventory.__pnEnumGuardV1){
    const base = Actions.addInventory.bind(Actions);
    const fn = function(data){
      data = Object.assign({}, data);
      if (!CONDITION_META[data.condition]) data.condition = "WORKING";
      if (!INVENTORY_STATUS_META[data.status]) data.status = "IN_STORAGE";
      return base(data);
    };
    fn.__pnEnumGuardV1 = true;
    Actions.addInventory = fn;
  }
  if (Actions && typeof Actions.updateInventory === "function" && !Actions.updateInventory.__pnEnumGuardV1){
    const base = Actions.updateInventory.bind(Actions);
    const fn = function(id, data){
      data = Object.assign({}, data);
      if ("condition" in data && !CONDITION_META[data.condition]) data.condition = "WORKING";
      if ("status" in data && !INVENTORY_STATUS_META[data.status]) data.status = "IN_STORAGE";
      return base(id, data);
    };
    fn.__pnEnumGuardV1 = true;
    Actions.updateInventory = fn;
  }

  console.info("[PROFITNODE] Inventory enum safety guard active.");
})();
