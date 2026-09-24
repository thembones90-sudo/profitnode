"use strict";

(function installGiftProjectLifecycleV2(){
  const GIFT_STATUS = "GIFTED";
  const GIFT_DISPOSITION = "GIFT";

  if (typeof PROJECT_STATUSES !== "undefined" && !PROJECT_STATUSES.includes(GIFT_STATUS)) {
    PROJECT_STATUSES.push(GIFT_STATUS);
  }
  if (typeof PROJECT_STATUS_META !== "undefined") {
    PROJECT_STATUS_META[GIFT_STATUS] = {chip:"chip-green-outline"};
  }

  function isGiftProject(project){
    return !!project && project.purpose === "FAMILY_GIFT";
  }

  function giftSaleForProject(projectId){
    return Store.all("sales").find(s =>
      s && s.projectId === projectId &&
      String(s.disposition || "").toUpperCase() === GIFT_DISPOSITION
    ) || null;
  }

  function ensureGiftLedgerEntry(project){
    if (!project || !isGiftProject(project)) return null;
    const existing = giftSaleForProject(project.id);
    const total = Number(Actions.projectTotalInvestment(project)) || 0;
    const additional = Number(project.additionalCosts) || 0;
    const row = {
      projectId: project.id,
      inventoryItemId: null,
      itemName: project.name,
      saleDate: project.completionDate || todayISO(),
      buyerPrice: 0,
      originalInvestment: Math.max(0,total - additional),
      additionalCosts: additional,
      currency: project.currency || "RSD",
      referenceStartDate: project.startDate || null,
      saleType: "RIG",
      saleState: "COMPLETED",
      saleSource: "GIFT",
      disposition: GIFT_DISPOSITION,
      reason: "FAMILY_GIFT",
      notes: "Finished rig gifted. Zero revenue; full build cost realized as shop expense."
    };
    if (existing) return Store.update("sales",existing.id,row);
    const created = Store.insert("sales",row);
    Timeline.log(
      "PROJECT_GIFTED",
      project.name+" GIFTED",
      "Ledgered at zero revenue · realized expense "+money(total,project.currency || "RSD"),
      row.saleDate,
      "sale",
      created.id
    );
    return created;
  }

  if (typeof projectDerived === "function" && !projectDerived.__pnGiftAwareV2) {
    const baseProjectDerived = projectDerived;
    const wrappedProjectDerived = function(project){
      const out = baseProjectDerived(project);
      if (isGiftProject(project) && project.status === GIFT_STATUS) {
        const cost = Number(Actions.projectTotalInvestment(project)) || 0;
        out.totalInvestment = cost;
        out.profit = -cost;
        out.roi = cost > 0 ? -100 : 0;
        out.daysHeld = Calc.daysHeld(project.startDate,project.completionDate || todayISO());
      }
      return out;
    };
    wrappedProjectDerived.__pnGiftAwareV2 = true;
    projectDerived = wrappedProjectDerived;
  }

  if (Actions && typeof Actions.markProjectBuildComplete === "function" && !Actions.markProjectBuildComplete.__pnGiftAwareV2) {
    const baseComplete = Actions.markProjectBuildComplete.bind(Actions);
    const wrappedComplete = function(projectId){
      const before = Store.get("projects",projectId);
      const result = baseComplete(projectId);
      if (!result || !result.ok || !isGiftProject(before)) return result;

      const completed = Store.get("projects",projectId);
      const giftedAt = completed.completedAt || nowISO();
      const gifted = Store.update("projects",projectId,{
        status:GIFT_STATUS,
        giftedAt:giftedAt,
        completionDate:completed.completionDate || giftedAt.slice(0,10),
        buildLocked:true
      });
      ensureGiftLedgerEntry(gifted);
      return {ok:true,project:gifted};
    };
    wrappedComplete.__pnGiftAwareV2 = true;
    Actions.markProjectBuildComplete = wrappedComplete;
  }

  let repaired = 0;
  Store.all("projects").forEach(project => {
    if (!isGiftProject(project) || !project.completionDate) return;
    const looksFinished = project.buildLocked || ["BUILDING","TESTING","COMPLETED","GIFTED"].includes(project.status);
    if (!looksFinished) return;

    let current = project;
    if (project.status !== GIFT_STATUS) {
      current = Store.update("projects",project.id,{
        status:GIFT_STATUS,
        giftedAt:project.giftedAt || String(project.completionDate)+"T00:00:00.000Z",
        buildLocked:true
      });
      repaired++;
    }
    if (!giftSaleForProject(current.id)) {
      ensureGiftLedgerEntry(current);
      repaired++;
    }
  });

  if (repaired) Store.persist();
  console.info("[PROFITNODE] GIFT PROJECT LIFECYCLE V2 active · repaired",repaired,"gift lifecycle/ledger item(s).");
})();