"use strict";

/*
  PROFITNODE RIG BENCH navigation refinement.

  A rig family with exactly one variant opens that variant directly.
  The variant-selection / compare screen remains only when it is actually
  useful: two or more variants.
*/

(function installRigBenchDirectOpen(){
  document.addEventListener("click",function(event){
    const familyRow = event.target.closest("[data-open-rig-family]");
    if (!familyRow) return;

    const family = familyRow.dataset.openRigFamily;
    if (!family) return;

    const variants = Store.all("rigs").filter(rig=>rig.family===family);

    if (variants.length !== 1) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    state.rigFamilyView = null;
    state.rigCompareIds = [];
    state.rigNotice = null;
    state.rigDraft = JSON.parse(JSON.stringify(variants[0]));

    render();
  },true);
})();