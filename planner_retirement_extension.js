"use strict";

/*
  PROFITNODE Build Planner retirement.

  RIG BUILD is the single rig planning / simulation / assembly workspace.
  Legacy plan records remain in local storage and backups only so old
  PROFITNODE data can still be restored safely. They are no longer an
  active product feature.
*/

(function retireBuildPlanner(){
  if (typeof ROUTES !== "undefined"){
    for (let i = ROUTES.length - 1; i >= 0; i--){
      if (ROUTES[i].key === "planner") ROUTES.splice(i,1);
    }

    ROUTES.forEach((route,index)=>{
      route.nix = String(index + 1).padStart(2,"0");
    });
  }

  if (typeof state !== "undefined"){
    if (state.route === "planner") state.route = "rigbuild";
    state.plannerDraft = null;
    state.plannerPickerOpen = false;
  }

  /*
    Keep legacy plans out of ordinary spreadsheet exports.
    JSON backups still preserve them for backward compatibility.
  */
  if (typeof CSV_EXPORTS !== "undefined" && CSV_EXPORTS.plans){
    delete CSV_EXPORTS.plans;
  }

  /*
    Remove accidental navigation into the retired route from stale DOM,
    bookmarks, or future code that tries to set it.
  */
  document.addEventListener("click",function(event){
    const target = event.target.closest('[data-route="planner"]');
    if (!target) return;

    event.preventDefault();
    state.route = "rigbuild";
    render();
  },true);
})();