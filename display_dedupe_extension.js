"use strict";

/*
  PROFITNODE Display Dedupe v1

  Pure presentation cleanup:
  - The top Project Build KPI strip is the canonical financial summary.
  - The lower cost panel contains itemized details only, not the same
    ACTUAL / PLANNED / ESTIMATED FINAL totals for a second time.
  - Planned/catalog RAM labels no longer append DDR generation when the
    family label already contains it.
  - Single-kit RAM's small inline line shows only TOTAL capacity because
    module layout/speed/timings are already present in the resolved model
    label. Mixed RAM keeps the full group breakdown.

  No persisted project/inventory/treasury data is modified.
*/

function pnDisplayCollapseAdjacentDuplicates(text){
  let out = String(text || "").replace(/\s+/g," ").trim();
  let prev;
  do {
    prev = out;
    out = out.replace(/\b([A-Za-z0-9.+_-]+)(?:\s+\1\b)+/gi, "$1");
  } while (out !== prev);
  return out;
}

function pnDisplayHasDescriptor(base, descriptor){
  const hay = typeof pnNorm === "function" ? pnNorm(base) : String(base||"").toUpperCase();
  const needle = typeof pnNorm === "function" ? pnNorm(descriptor) : String(descriptor||"").toUpperCase();
  if (!needle) return false;
  if (hay === needle) return true;
  const padded = " " + hay + " ";
  return padded.includes(" " + needle + " ");
}

/* Clean only planned/catalog RAM display labels. Inventory identity stays as-is. */
if (typeof rigSlotResolved === "function"){
  const PNCoreRigSlotResolvedDisplayDedupe = rigSlotResolved;
  rigSlotResolved = function(slot, currency, slotKey){
    const resolved = PNCoreRigSlotResolvedDisplayDedupe.apply(this, arguments);
    if (!resolved || !slot) return resolved;

    const inferred = slotKey || (currency !== "RSD" && currency !== "EUR" ? currency : null);
    const type = slot.catalogType || inferred;

    if ((slot.kind === "PLANNED" || slot.kind === "CATALOG") && type === "RAM" && slot.ram){
      const ram = slot.ram || {};
      const base = String(slot.label || "(select RAM family)").trim();
      let tech = String(ram.technology || "").toUpperCase();

      if (!tech && typeof catalogFind === "function"){
        try {
          const row = catalogFind("RAM", base);
          tech = String(row && row.technology || "").toUpperCase();
        } catch (_) {}
      }

      const pieces = [base];

      if (tech && !pnDisplayHasDescriptor(base, tech)) pieces.push(tech);

      if (!ram.mixed && ram.moduleCount && ram.perModuleCapacity){
        const config = ram.moduleCount + "×" + ram.perModuleCapacity + "GB";
        if (!pnDisplayHasDescriptor(base, config)) pieces.push(config);
      }

      if (ram.speed){
        const speed = String(ram.speed);
        if (!pnDisplayHasDescriptor(base, speed)) pieces.push(speed);
      }

      if (ram.casLatency){
        const cl = "CL" + ram.casLatency;
        if (!pnDisplayHasDescriptor(base, cl)) pieces.push(cl);
      }

      resolved.label = pnDisplayCollapseAdjacentDuplicates(pieces.join(" "));
    } else if (resolved.label) {
      // Harmless adjacent-token cleanup for display-only accidents such as
      // "600W 600W". Does not remove non-adjacent model identifiers.
      resolved.label = pnDisplayCollapseAdjacentDuplicates(resolved.label);
    }

    return resolved;
  };
}

/*
  The resolved RAM label already shows 2×8GB / speed / CL for a normal
  single-group kit. Repeating "2 x 8GB" beside it adds noise, so the inline
  companion becomes just the total. Mixed sticks still need the breakdown.
*/
if (typeof pbRamConfigLine === "function"){
  const PNCorePbRamConfigLineDisplayDedupe = pbRamConfigLine;
  pbRamConfigLine = function(slot){
    const ram = slot && slot.ram;
    if (!ram) return "";

    const groups = Array.isArray(ram.groups) && ram.groups.length
      ? ram.groups
      : (ram.moduleCount && ram.perModuleCapacity
          ? [{moduleCount:ram.moduleCount,perModuleCapacity:ram.perModuleCapacity}]
          : []);

    if (groups.length === 1 && !ram.mixed){
      const total = (Number(groups[0].moduleCount)||0) * (Number(groups[0].perModuleCapacity)||0);
      return total ? total + "GB TOTAL" : PNCorePbRamConfigLineDisplayDedupe(slot);
    }

    return PNCorePbRamConfigLineDisplayDedupe(slot);
  };
}

/*
  The hero KPI strip already owns ACTUAL SPENT / PLANNED COST /
  ESTIMATED FINAL COST. This lower panel is detail-only.
*/
if (typeof pbCostBreakdownHtml === "function"){
  pbCostBreakdownHtml = function(project){
    const data = pbBuildCostRows(project);
    const owned = data.owned || [];
    const planned = data.planned || [];

    const rowsHtml = function(rows){
      return rows.length
        ? rows.map(function(r){
            return '<div class="pn-pb-cost-row"><span>'+escHtml(r.label)+'</span><span>'+money(r.amount,project.currency)+'</span></div>';
          }).join("")
        : '<p class="hint">None yet.</p>';
    };

    const count = owned.length + planned.length;
    const itemized =
      '<details class="pn-pb-cost-details">'+
        '<summary>ITEMIZED COMPONENT COSTS'+(count ? ' · '+count+' ENTRIES' : '')+'</summary>'+
        '<div class="pn-pb-cost-cols">'+
          '<div class="pn-pb-cost-group"><h3>OWNED / PAID</h3>'+rowsHtml(owned)+'</div>'+
          '<div class="pn-pb-cost-group"><h3>PLANNED / NOT YET PURCHASED</h3>'+rowsHtml(planned)+'</div>'+
        '</div>'+
      '</details>';

    return '<div class="panel pn-pb-cost-detail-only" data-pb-cost-breakdown style="margin-top:8px">'+
      '<div class="panel-head"><h2>COST DETAILS</h2></div>'+
      '<div class="panel-body">'+itemized+'</div>'+
    '</div>';
  };
}

const pnDisplayDedupeStyle = document.createElement("style");
pnDisplayDedupeStyle.textContent = `
.pn-pb-cost-detail-only .panel-body{padding-top:10px}
.pn-pb-cost-detail-only .pn-pb-cost-details{margin:0}
.pn-pb-cost-detail-only .pn-pb-cost-details>summary{margin:0}
`;
document.head.appendChild(pnDisplayDedupeStyle);
