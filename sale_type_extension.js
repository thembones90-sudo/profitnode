"use strict";

/*
  PROFITNODE Sales Ledger v1

  Sales is the permanent commercial ledger:
  - what was sold
  - what it cost
  - what it earned
  - how efficiently the flip performed

  Item type and workflow provenance are intentionally separate concepts.
*/

const PN_SALE_TYPES = ["RIG","COMPONENT","OTHER"];
const PN_SALE_STATES = ["PENDING","COMPLETED"];

function saleStateResolved(sale){
  return String((sale && sale.saleState) || "COMPLETED").toUpperCase() === "PENDING"
    ? "PENDING"
    : "COMPLETED";
}

function saleIsCompleted(sale){
  return saleStateResolved(sale) === "COMPLETED";
}

function saleTypeResolved(sale){
  const explicit = String((sale && sale.saleType) || "").toUpperCase();
  if (PN_SALE_TYPES.includes(explicit)) return explicit;

  if (sale && sale.inventoryItemId) return "COMPONENT";
  if (sale && sale.projectId) return "RIG";
  if (sale && sale.rigId) return "RIG";
  if (sale && /SOLD FROM RIG BUILD/i.test(String(sale.notes || ""))) return "RIG";

  // Legacy unlinked PROFITNODE sales were completed whole-PC flips.
  return "RIG";
}

function saleSourceResolved(sale){
  const explicit = String((sale && sale.saleSource) || "").toUpperCase();
  if (explicit) return explicit;
  if (sale && (sale.rigId || /SOLD FROM RIG BUILD/i.test(String(sale.notes || "")))) return "RIG BUILD";
  if (sale && sale.projectId) return "PROJECT";
  return "MANUAL";
}

function saleTypeChipClass(type){
  if (type === "RIG") return "pn-sale-type-rig";
  if (type === "COMPONENT") return "pn-sale-type-component";
  return "pn-sale-type-other";
}

function saleHeldSinceResolved(sale){
  if (!sale) return null;
  if (sale.referenceStartDate) return sale.referenceStartDate;

  if (sale.projectId){
    const project = Store.get("projects", sale.projectId);
    if (project && project.startDate) return project.startDate;
  }

  if (sale.rigId){
    const rig = Store.get("rigs", sale.rigId);
    if (rig && rig.createdAt) return String(rig.createdAt).slice(0,10);
  }

  // Best-effort legacy RIG BUILD link by exact stored rig name.
  const label = String(sale.itemName || "").trim().toUpperCase();
  if (label){
    const rig = Store.all("rigs").find(r=>{
      const full = String((r.family || "")+" / "+(r.variantName || "")).trim().toUpperCase();
      return full === label && r.createdAt;
    });
    if (rig) return String(rig.createdAt).slice(0,10);
  }

  return null;
}

function saleDaysHeldResolved(sale){
  const start = saleHeldSinceResolved(sale);
  return start ? Calc.daysHeld(start, sale.saleDate) : null;
}

function saleSummary(currency){
  const sales = Store.all("sales").filter(saleIsCompleted);
  let revenue = 0;
  let profit = 0;
  let cost = 0;
  let rigs = 0;
  let components = 0;

  sales.forEach(sale=>{
    const d = saleDerived(sale);
    revenue += convert(sale.buyerPrice || 0, sale.currency, currency);
    profit += convert(d.profit || 0, sale.currency, currency);
    cost += convert(d.totalCost || 0, sale.currency, currency);

    const type = saleTypeResolved(sale);
    if (type === "RIG") rigs++;
    if (type === "COMPONENT") components++;
  });

  return {
    rigs,
    components,
    revenue,
    profit,
    roi: Calc.roi(profit, cost)
  };
}

function saleFilterButton(label,value,current){
  return '<button type="button" class="pn-sales-filter'+(current===value?" active":"")+'" data-sale-type-filter="'+value+'">'+label+'</button>';
}

function renderSales(){
  const filters = state.filters.sales;
  const currentType = filters.type || "ALL";
  const currency = displayCurrency();
  const summary = saleSummary(currency);

  let sales = Store.all("sales").slice().sort((a,b)=>b.saleDate.localeCompare(a.saleDate));
  sales = filterRows(sales, filters.q, ["itemName","notes","saleType","saleSource"]);

  if (currentType !== "ALL"){
    sales = sales.filter(sale=>saleTypeResolved(sale) === currentType);
  }

  const completed = sales.filter(saleIsCompleted);
  const pending = sales.filter(sale=>!saleIsCompleted(sale));
  const completedRows = completed.length ? completed.map(sale=>{
    const d = saleDerived(sale);
    const type = saleTypeResolved(sale);
    const source = saleSourceResolved(sale);
    const held = saleDaysHeldResolved(sale);

    return '<tr class="clickable" data-open-entity="sale" data-id="'+sale.id+'">'+
      '<td>'+
        '<div class="pn-sale-item">'+
          '<div class="sale-item-with-type">'+
            '<b>'+escHtml(sale.itemName)+'</b>'+
            '<span class="chip '+saleTypeChipClass(type)+'">'+escHtml(type)+'</span>'+
          '</div>'+
          '<div class="pn-sale-origin">'+escHtml(source)+'</div>'+
        '</div>'+
      '</td>'+
      '<td class="mono">'+fmtDate(sale.saleDate)+'</td>'+
      '<td class="num">'+money(sale.buyerPrice,sale.currency)+'</td>'+
      '<td class="num">'+money(d.totalCost,sale.currency)+'</td>'+
      '<td class="num pn-sale-profit" style="color:'+(d.profit>=0?"var(--green)":"var(--red)")+'">'+money(d.profit,sale.currency)+'</td>'+
      '<td class="num">'+pct(d.margin)+'</td>'+
      '<td class="num" style="color:'+(d.roi>=0?"var(--green)":"var(--red)")+'">'+pct(d.roi)+'</td>'+
      '<td class="num">'+(held!=null?held:"\u2014")+'</td>'+
    '</tr>';
  }).join("") : '<tr class="empty-row"><td colspan="8">No completed sales match this filter.</td></tr>';

  const pendingRows = pending.length ? pending.map(sale=>{
    const d = saleDerived(sale);
    const type = saleTypeResolved(sale);
    const source = saleSourceResolved(sale);
    return '<tr class="clickable pn-pending-sale-row" data-open-entity="sale" data-id="'+sale.id+'">'+
      '<td><div class="pn-sale-item"><div class="sale-item-with-type"><b>'+escHtml(sale.itemName)+'</b><span class="chip '+saleTypeChipClass(type)+'">'+escHtml(type)+'</span><span class="chip pn-sale-state-pending">PENDING</span></div><div class="pn-sale-origin">'+escHtml(source)+'</div></div></td>'+
      '<td class="mono">'+fmtDate(sale.saleDate)+'</td>'+
      '<td class="num">'+money(sale.buyerPrice,sale.currency)+'</td>'+
      '<td class="num">'+money(d.totalCost,sale.currency)+'</td>'+
      '<td class="num pn-potential-profit" style="color:'+(d.profit>=0?"var(--green)":"var(--red)")+'">'+money(d.profit,sale.currency)+'</td>'+
      '<td class="num">'+pct(d.margin)+'</td>'+
      '<td class="num">'+pct(d.roi)+'</td>'+
      '<td class="num"><button type="button" class="btn btn-sm pn-complete-sale" data-complete-pending-sale="'+sale.id+'">COMPLETE SALE</button></td>'+
    '</tr>';
  }).join("") : '<tr class="empty-row"><td colspan="8">No pending sales match this filter.</td></tr>';

  const pendingAsking = pending.reduce((sum,sale)=>sum+convert(sale.buyerPrice||0,sale.currency,currency),0);

  const summaryHtml =
    '<div class="pn-sales-summary">'+
      '<div class="pn-sales-summary-cell"><span>RIGS SOLD</span><b>'+summary.rigs+'</b></div>'+
      '<div class="pn-sales-summary-cell"><span>COMPONENTS</span><b>'+summary.components+'</b></div>'+
      '<div class="pn-sales-summary-cell"><span>REVENUE</span><b>'+money(summary.revenue,currency)+'</b></div>'+
      '<div class="pn-sales-summary-cell"><span>PROFIT</span><b class="'+(summary.profit>=0?"pos":"neg")+'">'+money(summary.profit,currency)+'</b></div>'+
      '<div class="pn-sales-summary-cell"><span>PORTFOLIO ROI</span><b class="'+(summary.roi>=0?"pos":"neg")+'">'+pct(summary.roi)+'</b></div>'+
    '</div>';

  const controls =
    '<div class="pn-sales-controls">'+
      '<div class="pn-sales-type-filters">'+
        saleFilterButton("ALL","ALL",currentType)+
        saleFilterButton("RIGS","RIG",currentType)+
        saleFilterButton("COMPONENTS","COMPONENT",currentType)+
      '</div>'+
      '<input type="text" placeholder="Search sales\u2026" data-filter="sales.q" value="'+escAttr(filters.q)+'">'+
    '</div>';

  return pageHeader(
    "Sales",
    pending.length+" pending · "+completed.length+" completed",
    '<button class="btn btn-primary" data-open-form="sale">+ NEW SALE</button>'
  )+
  '<div class="content">'+
    summaryHtml+
    controls+
    '<div class="panel pn-pending-sales-panel"><div class="panel-head"><h2>PENDING SALES</h2><span class="badge-count">'+pending.length+' LISTED · '+money(pendingAsking,currency)+' ASKING</span></div><div class="table-scroll"><table><thead><tr>'+
      '<th>Sale Item</th><th>Listed</th><th class="num">Asking Price</th><th class="num">Total Cost</th><th class="num">Potential Profit</th><th class="num">Margin</th><th class="num">ROI</th><th class="num">Action</th>'+
    '</tr></thead><tbody>'+pendingRows+'</tbody></table></div></div>'+
    '<div class="panel pn-completed-sales-panel"><div class="panel-head"><h2>COMPLETED SALES</h2><span class="badge-count">'+completed.length+' REALIZED</span></div><div class="table-scroll"><table><thead><tr>'+
      '<th>Sale Item</th>'+
      '<th>Sale Date</th>'+
      '<th class="num">Sale Price</th>'+
      '<th class="num">Total Cost</th>'+
      '<th class="num">Profit</th>'+
      '<th class="num">Margin</th>'+
      '<th class="num">ROI</th>'+
      '<th class="num">Days Held</th>'+
    '</tr></thead><tbody>'+completedRows+'</tbody></table></div></div>'+
  '</div>';
}

/* ROUTES captures render functions during app_core initialization. Rebind Sales. */
if (typeof ROUTES !== "undefined"){
  const pnSalesRoute = ROUTES.find(route=>route.key==="sales");
  if (pnSalesRoute) pnSalesRoute.render = renderSales;
}

/* Dashboard counts must use item type, not workflow source. */
const PNCoreDashboardStatsSaleTypes = dashboardStats;
dashboardStats = function(currency){
  const out = PNCoreDashboardStatsSaleTypes(currency);
  const sales = Store.all("sales").filter(saleIsCompleted);
  out.pcsSold = sales.filter(s=>saleTypeResolved(s)==="RIG").length;
  out.componentsSold = sales.filter(s=>saleTypeResolved(s)==="COMPONENT").length;
  return out;
};

/* CSV exports use the same semantic model and include workflow provenance. */
if (typeof CSV_EXPORTS !== "undefined" && CSV_EXPORTS.sales){
  const cols = CSV_EXPORTS.sales.columns;
  const typeCol = cols.find(c=>c.label==="Type");
  if (typeCol) typeCol.get = saleTypeResolved;

  if (!cols.some(c=>c.label==="Workflow Source")){
    const typeIndex = cols.findIndex(c=>c.label==="Type");
    cols.splice(typeIndex+1,0,{label:"Workflow Source",get:saleSourceResolved});
  }

  if (!cols.some(c=>c.label==="State")){
    const typeIndex = cols.findIndex(c=>c.label==="Type");
    cols.splice(typeIndex+1,0,{label:"State",get:saleStateResolved});
  }

  const heldCol = cols.find(c=>c.label==="Days Held");
  if (heldCol) heldCol.get = saleDaysHeldResolved;
}

/* Manual editor uses commercial language and explicit item type. */
if (typeof FORM_SCHEMAS !== "undefined" && FORM_SCHEMAS.sale){
  const PNCoreSaleFormSchema = FORM_SCHEMAS.sale;

  FORM_SCHEMAS.sale = function(entity){
    const schema = PNCoreSaleFormSchema(entity);

    schema.title = entity ? "EDIT SALE RECORD" : "NEW SALE";
    schema.fields[0].label = "Item / Rig Name";
    schema.fields[0].type = "componentSearch";

    const buyerField = schema.fields.find(f=>f.key==="buyerPrice");
    if (buyerField) buyerField.label = "Sale Price";

    const saleDateField = schema.fields.find(f=>f.key==="saleDate");
    if (saleDateField) saleDateField.label = "Listing / Sale Date";

    if (!schema.fields.some(f=>f.key==="saleState")){
      schema.fields.splice(1,0,{
        key:"saleState",
        label:"Sale State",
        type:"select",
        options:PN_SALE_STATES,
        required:true,
        default:entity ? saleStateResolved(entity) : "PENDING",
        half:true
      });
    }

    if (!schema.fields.some(f=>f.key==="saleType")){
      schema.fields.splice(2,0,{
        key:"saleType",
        label:"Sale Type",
        type:"select",
        options:PN_SALE_TYPES,
        required:true,
        default:entity ? saleTypeResolved(entity) : "RIG",
        half:true
      });
    }

    if (!schema.fields.some(f=>f.key==="category")){
      const saleTypeIndex = schema.fields.findIndex(f=>f.key==="saleType");
      schema.fields.splice(saleTypeIndex+1,0,{
        key:"category",
        label:"Category",
        type:"select",
        options:CATEGORIES,
        required:true,
        default:"OTHER",
        half:true
      });
    }

    return schema;
  };
}

/*
  Preserve future sold-rig history.
  The snapshot is stored on the sale record so later inventory edits cannot rewrite it.
*/
if (Actions && Actions.markRigSold){
  const PNCoreMarkRigSoldLedger = Actions.markRigSold.bind(Actions);

  Actions.markRigSold = function(rigId){
    const rigBefore = Store.get("rigs",rigId);
    const snapshot = rigBefore ? JSON.parse(JSON.stringify(rigBefore)) : null;
    const before = new Set(Store.all("sales").map(s=>s.id));

    const result = PNCoreMarkRigSoldLedger(rigId);

    if (result && result.ok){
      const created = Store.all("sales").find(s=>!before.has(s.id));
      if (created){
        Store.update("sales",created.id,{
          saleType:"RIG",
          saleSource:"RIG BUILD",
          rigId:rigId,
          rigSnapshot:snapshot,
          saleState:"COMPLETED"
        });
      }
    }

    return result;
  };
}

/* Preserve future project-sale history too. */
if (Actions && Actions.finalizeProjectSale){
  const PNCoreFinalizeProjectSaleLedger = Actions.finalizeProjectSale.bind(Actions);

  Actions.finalizeProjectSale = function(project){
    const projectSnapshot = project ? JSON.parse(JSON.stringify(project)) : null;
    const componentSnapshots = project ?
      Store.all("inventory")
        .filter(item=>item.assignedProjectId===project.id)
        .map(item=>JSON.parse(JSON.stringify(item))) : [];

    const result = PNCoreFinalizeProjectSaleLedger(project);
    const sale = project && Store.all("sales").find(s=>s.projectId===project.id);

    if (sale){
      Store.update("sales",sale.id,{
        saleType:"RIG",
        saleSource:"PROJECT",
        projectSnapshot:projectSnapshot,
        componentSnapshots:componentSnapshots,
        saleState:"COMPLETED"
      });
    }

    return result;
  };
}

/* New manual sales explicitly carry MANUAL provenance. Linked parts get a
   status snapshot so the retirement can be revoked by edits or deletes. */
if (Actions && Actions.addSale){
  const PNCoreAddSaleLedger = Actions.addSale.bind(Actions);

  Actions.addSale = function(data){
    const payload = Object.assign({},data,{
      saleSource:data.saleSource || "MANUAL",
      saleState:saleStateResolved(data)
    });
    if (data && data.inventoryItemId){
      const item = Store.get("inventory", data.inventoryItemId);
      payload.inventorySnapshot = {
        id: data.inventoryItemId,
        priorStatus: item ? item.status : null,
        priorAssignedRigId: item ? item.assignedRigId || null : null
      };
    }
    if (payload.saleState === "PENDING"){
      const pending = Store.insert("sales",payload);
      if (pending.inventoryItemId){
        Store.update("inventory",pending.inventoryItemId,{status:"LISTED"});
      }
      Timeline.log("LISTED",pending.itemName+" LISTED","Asking "+money(pending.buyerPrice,pending.currency),pending.saleDate,"sale",pending.id);
      return pending;
    }
    return PNCoreAddSaleLedger(payload);
  };
}

/* Restore a part when the sale that retired it is deleted. The part is
   only revived if it is still SOLD — if it was manually re-purposed since
   the sale, that re-purpose wins and is left untouched. */
if (Actions && Actions.removeSale){
  const PNCoreRemoveSaleLedger = Actions.removeSale.bind(Actions);

  Actions.removeSale = function(id){
    const sale = Store.get("sales", id);
    const result = PNCoreRemoveSaleLedger(id);
    if (sale && sale.inventoryItemId && sale.inventorySnapshot){
      const part = Store.get("inventory", sale.inventoryItemId);
      const expectedStatus = saleIsCompleted(sale) ? "SOLD" : "LISTED";
      if (part && part.status === expectedStatus){
        Store.update("inventory", part.id, {
          status: sale.inventorySnapshot.priorStatus || "IN_STORAGE",
          assignedRigId: sale.inventorySnapshot.priorAssignedRigId || null
        });
      }
    }
    return result;
  };
}

/* Pending links reserve inventory as LISTED; completed links retire it SOLD. */
if (Actions && Actions.updateSale){
  const PNCoreUpdateSaleLedger = Actions.updateSale.bind(Actions);

  Actions.updateSale = function(id, data){
    const sale = Store.get("sales", id);
    if (!sale) return PNCoreUpdateSaleLedger(id,data);
    const payload = Object.assign({},sale,data,{saleState:saleStateResolved(Object.assign({},sale,data))});
    const next = String(payload.inventoryItemId || "");
    const previousLink = String(sale.inventoryItemId || "");
    const stateChanged = saleStateResolved(sale) !== payload.saleState;
    if (previousLink && (next !== previousLink || stateChanged)){
      const part = Store.get("inventory", sale.inventoryItemId);
      if (part && ["SOLD","LISTED"].includes(part.status) && sale.inventorySnapshot){
        Store.update("inventory", part.id, {
          status: sale.inventorySnapshot.priorStatus || "IN_STORAGE",
          assignedRigId: sale.inventorySnapshot.priorAssignedRigId || null
        });
      }
    }
    if (next){
      const item = Store.get("inventory", next);
      if (!payload.inventorySnapshot){
        const same = next === previousLink;
        payload.inventorySnapshot = same && sale.inventorySnapshot || {
          id: next,
          priorStatus: item ? item.status : null,
          priorAssignedRigId: item ? item.assignedRigId || null : null
        };
      }
      if (item) Store.update("inventory", item.id, {status:payload.saleState === "COMPLETED" ? "SOLD" : "LISTED"});
    }
    const result = PNCoreUpdateSaleLedger(id, payload);
    if (stateChanged){
      if (payload.saleState === "COMPLETED"){
        const d = saleDerived(result);
        Timeline.log("SOLD",result.itemName+" SOLD","Sale: "+money(result.buyerPrice,result.currency)+" · Profit: "+money(d.profit,result.currency),result.saleDate,"sale",result.id);
      } else {
        Timeline.log("LISTED",result.itemName+" RETURNED TO PENDING","Asking "+money(result.buyerPrice,result.currency),result.saleDate,"sale",result.id);
      }
    }
    return result;
  };
}

/* Type filter click handling. */
document.addEventListener("click",function(event){
  const complete = event.target.closest("[data-complete-pending-sale]");
  if (complete){
    event.preventDefault();
    event.stopPropagation();
    const sale = Store.get("sales",complete.dataset.completePendingSale);
    if (!sale) return;
    state.modal = {entityType:"sale",id:sale.id,prefill:null,live:Object.assign({},sale,{saleState:"COMPLETED"})};
    render();
    return;
  }
  const btn = event.target.closest("[data-sale-type-filter]");
  if (!btn) return;

  state.filters.sales.type = btn.dataset.saleTypeFilter || "ALL";
  render();
});

/* ------------------------------------------------------------------
   LEDGER → NEW SALE → COMPONENT autocomplete.
   Inventory-first ranked search with a manual free-text fallback.
   Picking a part pre-fills held-since, cost basis, currency and links
   the sale to the physical part (which retires it as SOLD). Every
   surface keeps the canonical per-category colors.
------------------------------------------------------------------ */

function saleComponentKey(cat){
  return CATEGORIES.indexOf(cat) > -1 ? cat : "OTHER";
}

function salesComponentMatches(query){
  const q = pnNorm(query);
  const matches = [];
  if (q.length < 2) return matches;
  const seen = new Set();
  const currentSaleId = state.modal && state.modal.entityType === "sale" ? state.modal.id : null;
  const reservedIds = new Set(Store.all("sales")
    .filter(sale=>!saleIsCompleted(sale) && sale.id !== currentSaleId && sale.inventoryItemId)
    .map(sale=>sale.inventoryItemId));

  Store.all("inventory").forEach(item=>{
    if (item.status === "SOLD" || reservedIds.has(item.id)) return;
    const label = ((item.manufacturer || "")+" "+(item.model || "")).trim();
    const combined = pnNorm(label);
    const model = pnNorm(item.model || "");
    const mfr = pnNorm(item.manufacturer || "");
    const cat = pnNorm(item.category || "");
    let score = 0;
    if (combined === q) score += 200;
    else if (combined.indexOf(q) === 0) score += 110;
    if (model.indexOf(q) === 0) score += 60;
    if (mfr.indexOf(q) === 0) score += 40;
    if (cat.indexOf(q) === 0) score += 8;
    if (combined.indexOf(q) > 0) score += 18;
    if (model.indexOf(q) > 0) score += 12;
    if (!score) return;
    const group = (item.status==="IN_STORAGE"||item.status==="PERSONAL") ? 0 : item.status==="LISTED" ? 1 : 2;
    if (seen.has(item.id)) return;
    seen.add(item.id);
    matches.push({
      kind:"inventory",
      item:item,
      cat:saleComponentKey(item.category),
      label:label,
      status:item.status,
      price:item.purchasePrice || 0,
      cur:item.currency || "RSD",
      score:score,
      group:group
    });
  });

  matches.sort((a,b)=>
    b.score-a.score ||
    a.group-b.group ||
    (b.item.purchaseDate||"").localeCompare(a.item.purchaseDate||""));

  const out = matches.slice(0,7);
  matches.forEach(m=>seen.add(m.cat+":"+pnNorm(m.label)));
  catalogSearchAll(query).forEach(m=>{
    if (out.length >= 10) return;
    const key = m.cat+":"+pnNorm((m.item.brand||"")+" "+(m.item.model||""));
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind:"catalog",
      cat:saleComponentKey(m.cat),
      label:((m.item.brand||"")+" "+(m.item.model||"")).trim(),
      score:0,
      group:3
    });
  });
  return out;
}

/* Render a pre-computed match array. The input handler computes the
   matches once per keystroke; arrow-key navigation re-renders from the
   cache instead of re-running the search every press. */
function renderSaleComponentOptions(matches, query, active){
  if (!matches || !matches.length){
    return '<div class="rig-catalog-help pn-sale-empty">'+(pnNorm(query||"").length < 2
      ? "Type at least 2 characters to search inventory and the catalog…"
      : "No match — keep typing to record this component manually.")+'</div>';
  }
  return matches.map((m,i)=>
    '<button type="button" id="pn-sale-opt-'+i+'" role="option" aria-selected="'+(i===active ? "true" : "false")+'" class="rig-catalog-option'+(i===active ? " pn-active" : "")+'" data-sale-component-pick="'+i+'">'+
      '<span class="rig-option-name">'+escHtml(m.label)+'</span>'+
      '<span class="pn-result-badges">'+
        '<span class="pn-result-rating pn-cat-label '+categoryColorClass(m.cat)+'">'+escHtml(m.cat)+'</span>'+
        (m.kind==="inventory"
          ? '<span class="pn-result-rating pn-sale-match-state">'+escHtml(STATUS_LABEL(m.status))+" · "+money(m.price,m.cur)+'</span>'
          : '<span class="pn-result-rating pn-sale-match-state">CATALOG</span>')+
      '</span>'+
    '</button>'
  ).join("");
}

function renderSaleComponentResults(query, active){
  return renderSaleComponentOptions(salesComponentMatches(query), query, active);
}

function renderSaleItemField(field, record){
  if (saleTypeResolved(record || {}) !== "COMPONENT"){
    return renderFieldHtml(field, record);
  }
  return '<label class="field" style="flex:1 1 100%;position:relative">'+
    '<span class="req">Item / Component Name</span>'+
    '<input type="text" name="itemName" class="part-search-input" data-sale-component-search autocomplete="off" placeholder="Type a component name — owned inventory first, catalog fallback…" value="'+escAttr(record && record.itemName || "")+'" required>'+
    '<div class="rig-catalog-results" data-sale-component-results role="listbox" aria-live="polite" style="display:none"></div>'+
    '<input type="hidden" name="inventoryItemId" value="'+escAttr(record && record.inventoryItemId || "")+'">'+
    '<p class="hint" style="margin:4px 0 0">Type to search. Picking a part pre-fills held-since, cost basis, currency and links the sale to the physical part. Any manual name still submits as a free-text component.</p>'+
  '</label>';
}

document.addEventListener("input",function(event){
  const input = event.target.closest("input[data-sale-component-search]");
  if (!input) return;
  const wrap = input.closest(".part-search-field") || input.closest(".field");
  const res = wrap && wrap.querySelector("[data-sale-component-results]");
  const hidden = wrap && wrap.querySelector('[name="inventoryItemId"]');
  if (!res) return;
  if (input.value.trim() !== (window.__pnSaleComponentPickedLabel || "")){
    if (hidden && hidden.value) hidden.value = "";
    if (state.modal && state.modal.live) delete state.modal.live.inventoryItemId;
  }
  const q = input.value;
  if (pnNorm(q).length < 2){
    window.__pnSaleComponentMatches = null;
    window.__pnSaleComponentActive = 0;
    input.setAttribute("aria-expanded","false");
    input.setAttribute("aria-activedescendant","");
    res.style.display = "none";
    res.innerHTML = "";
    return;
  }
  clearTimeout(window.__pnSaleSearchTimer);
  window.__pnSaleSearchTimer = setTimeout(function(){
    if (input.value !== q || !res) return;
    /* Debounce race guard: never write results into a closed modal. */
    if (!(state.modal && state.modal.entityType === "sale")) return;
    const matches = salesComponentMatches(q);
    window.__pnSaleComponentMatches = matches;
    window.__pnSaleComponentActive = 0;
    res.style.display = "";
    res.innerHTML = renderSaleComponentOptions(matches, q, 0);
    if (matches.length){
      input.setAttribute("aria-expanded","true");
      input.setAttribute("aria-activedescendant","pn-sale-opt-0");
    } else {
      input.setAttribute("aria-expanded","false");
      input.setAttribute("aria-activedescendant","");
    }
  }, 120);
});

document.addEventListener("change",function(event){
  const sel = event.target;
  if (!sel || sel.name !== "saleType") return;
  const form = sel.closest("form[data-entity-form='sale']");
  if (!form || !state.modal) return;
  const live = {};
  new FormData(form).forEach((v,k)=>{ live[k]=v; });
  if (String(sel.value).toUpperCase() !== "COMPONENT") delete live.inventoryItemId;
  state.modal.live = live;
  render();
});

/* One shared picker for mouse clicks and keyboard (Enter) — owns the
   form-fill rules, the retirement link, and the live-state sync. */
function pnSaleComponentPick(matchIdx){
  if (!state.modal || state.modal.entityType !== "sale") return false;
  const match = (window.__pnSaleComponentMatches || [])[matchIdx];
  if (!match) return false;
  const form = document.querySelector("form[data-entity-form='sale']");
  if (!form) return false;
  const set = (name, value)=>{
    const el = form.querySelector('[name="'+name+'"]');
    if (el) el.value = value;
  };
  set("itemName", match.label);
  set("category", match.cat);
  if (match.kind === "inventory"){
    set("referenceStartDate", match.item.purchaseDate || "");
    set("currency", match.cur);
    set("originalInvestment", String(match.price || 0));
    set("additionalCosts", String(repairCostForItem(match.item.id, match.cur) || 0));
    set("inventoryItemId", match.item.id);
    const notes = form.querySelector('[name="notes"]');
    if (notes && !String(notes.value||"").trim()){
      notes.value = "Sold from inventory · source: "+(match.item.source ? STATUS_LABEL(match.item.source) : "OTHER");
    }
  } else {
    set("inventoryItemId", "");
  }
  const res = form.querySelector("[data-sale-component-results]");
  if (res){ res.style.display="none"; res.innerHTML=""; }
  window.__pnSaleComponentMatches = null;
  window.__pnSaleComponentActive = 0;
  window.__pnSaleComponentPickedLabel = match.label;
  const live = Object.assign({}, state.modal.live || {});
  live.itemName = match.label;
  live.category = match.cat;
  if (match.kind === "inventory"){
    live.referenceStartDate = match.item.purchaseDate || "";
    live.currency = match.cur;
    live.originalInvestment = String(match.price || 0);
    live.additionalCosts = String(repairCostForItem(match.item.id, match.cur) || 0);
    live.inventoryItemId = match.item.id;
  } else {
    delete live.inventoryItemId;
  }
  state.modal.live = live;
  const price = form.querySelector('[name="buyerPrice"]');
  if (price) price.focus();
  return true;
}

document.addEventListener("click",function(event){
  const pick = event.target.closest("[data-sale-component-pick]");
  if (!pick) return;
  pnSaleComponentPick(Number(pick.dataset.saleComponentPick));
});

document.addEventListener("keydown",function(event){
  const input = event.target.closest("input[data-sale-component-search]");
  if (!input) return;
  const wrap = input.closest(".part-search-field") || input.closest(".field");
  const res = wrap && wrap.querySelector("[data-sale-component-results]");
  const open = res && res.style.display !== "none";
  const matches = window.__pnSaleComponentMatches || [];
  if (event.key === "ArrowDown" || event.key === "ArrowUp"){
    if (!open || !matches.length) return;
    event.preventDefault();
    const active = window.__pnSaleComponentActive || 0;
    window.__pnSaleComponentActive = (active + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
    res.innerHTML = renderSaleComponentOptions(matches, input.value, window.__pnSaleComponentActive);
    input.setAttribute("aria-activedescendant", "pn-sale-opt-"+window.__pnSaleComponentActive);
    const btn = res.querySelector('[data-sale-component-pick="'+window.__pnSaleComponentActive+'"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: "nearest" });
    return;
  }
  if (event.key === "Enter" && open && matches.length){
    event.preventDefault();
    pnSaleComponentPick(window.__pnSaleComponentActive || 0);
    return;
  }
  if (event.key === "Escape" && res){
    res.style.display = "none";
    res.innerHTML = "";
    window.__pnSaleComponentMatches = null;
    window.__pnSaleComponentActive = 0;
    input.setAttribute("aria-expanded","false");
    input.setAttribute("aria-activedescendant","");
  }
});

/* Sales ledger visual language. */
const pnSalesLedgerStyle = document.createElement("style");
pnSalesLedgerStyle.textContent = `
.pn-sales-summary{
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  border:1px solid var(--border);
  background:var(--panel);
  margin-bottom:12px;
  overflow:hidden;
}
.pn-sales-summary-cell{
  min-height:66px;
  padding:12px 14px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:5px;
  border-right:1px solid var(--border);
}
.pn-sales-summary-cell:last-child{border-right:0}
.pn-sales-summary-cell span{
  font-size:10px;
  letter-spacing:.08em;
  color:var(--muted);
  font-weight:700;
}
.pn-sales-summary-cell b{
  font-size:17px;
  line-height:1.1;
}
.pn-sales-summary-cell b.pos{color:var(--green)}
.pn-sales-summary-cell b.neg{color:var(--red)}

.pn-sales-controls{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
.pn-sales-controls input{
  width:min(420px,100%);
}
.pn-sales-type-filters{
  display:inline-flex;
  align-items:center;
  border:1px solid var(--border);
  background:var(--panel);
}
.pn-sales-filter{
  border:0;
  border-right:1px solid var(--border);
  background:transparent;
  color:var(--muted);
  padding:9px 14px;
  font:inherit;
  font-size:11px;
  font-weight:800;
  letter-spacing:.06em;
  cursor:pointer;
}
.pn-sales-filter:last-child{border-right:0}
.pn-sales-filter:hover{color:var(--text)}
.pn-sales-filter.active{
  color:#c866ff;
  background:rgba(168,85,247,.12);
  box-shadow:inset 0 -2px 0 #a855f7;
}

.pn-sale-item{
  display:flex;
  flex-direction:column;
  gap:5px;
}
.sale-item-with-type{
  display:inline-flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}
.pn-sale-origin{
  color:var(--muted);
  font-size:9px;
  letter-spacing:.08em;
  font-weight:700;
}
.pn-sale-profit{
  font-weight:900;
  font-size:1.05em;
}
.pn-pending-sales-panel{margin-bottom:12px;border-color:rgba(201,156,70,.32)}
.pn-pending-sales-panel .panel-head{background:linear-gradient(90deg,rgba(201,156,70,.08),transparent 48%)}
.pn-sale-state-pending{
  color:#e1b95f !important;
  border-color:#8b6829 !important;
  background:rgba(201,156,70,.10) !important;
}
.pn-potential-profit{font-weight:800}
.pn-complete-sale{
  color:#e8ca82;
  border-color:#7d6028;
  white-space:nowrap;
}
.pn-complete-sale:hover{background:rgba(201,156,70,.12);border-color:#c99c46}
.pn-sale-type-rig{
  color:#c866ff !important;
  border-color:#8b2bd1 !important;
  background:rgba(168,85,247,.12) !important;
}
.pn-sale-type-component{
  color:#a8a4b3 !important;
  border-color:#4e4959 !important;
  background:rgba(120,116,132,.10) !important;
}
.pn-sale-type-other{
  color:var(--amber) !important;
  border-color:var(--amber-dim) !important;
  background:var(--amber-wash) !important;
}
.pn-result-rating.pn-sale-match-state{
  color:var(--text-mute);
  border-color:var(--border-strong);
  background:var(--panel-2);
}
.rig-catalog-option.pn-active{
  outline:1px solid var(--accent);
  outline-offset:-1px;
  background:var(--panel-2);
}
.pn-sale-empty{
  padding:9px 11px;
  font-family:var(--mono);
  font-size:10px;
  color:var(--text-mute);
}

@media(max-width:1100px){
  .pn-sales-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pn-sales-summary-cell:nth-child(2n){border-right:0}
}
@media(max-width:720px){
  .pn-sales-controls{align-items:stretch;flex-direction:column}
  .pn-sales-controls input{width:100%}
  .pn-sales-type-filters{width:100%}
  .pn-sales-filter{flex:1}
}
`;
document.head.appendChild(pnSalesLedgerStyle);
