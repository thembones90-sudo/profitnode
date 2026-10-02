"use strict";

/*
  PROFITNODE — adds "NEW" as a real inventory condition.

  Previously CONDITIONS only had WORKING/UNTESTED/FAULTY/REPAIRED/DEAD,
  with no way to say "this part was never used" as distinct from
  "working, used, functions fine" — exactly the distinction that came
  up for the Jonsbo CR-1000 MAX cooler (bought new, still sealed).
  Adds NEW to the dropdown and its own chip, solid green — a notch
  above WORKING's green outline, same ranking logic the app already
  uses elsewhere (outline = functional, solid = the stronger claim).

  Must load BEFORE inventory_enum_safety_extension.js in the manifest:
  that extension's heal-on-load pass snaps any condition it doesn't
  recognize back to WORKING, and NEW has to already be a recognized
  value by the time that pass runs, or a genuinely-new item would get
  silently downgraded on every load.
*/
(function installInventoryNewConditionV1(){
  if (typeof CONDITIONS === "undefined" || typeof CONDITION_META === "undefined") return;
  if (!CONDITIONS.includes("NEW")) CONDITIONS.unshift("NEW");
  if (!CONDITION_META.NEW) CONDITION_META.NEW = { chip: "chip-green" };
  console.info("[PROFITNODE] Inventory condition NEW active.");
})();
