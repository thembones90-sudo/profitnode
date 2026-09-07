"use strict";

/*
  PROFITNODE Sales Type Fix
  "RIG" describes the thing sold.
  PROJECT and RIG BUILD are workflow sources, not sale item types.
*/

const PN_SALE_TYPES = ["RIG","COMPONENT","OTHER"];

function saleTypeResolved(sale){
  const explicit = String((sale && sale.saleType) || "").toUpperCase();
  if (PN_SALE_TYPES.includes(explicit)) return explicit;

  // A linked inventory item is a component sale.
  if (sale && sale.inventoryItemId) return "COMPONENT";

  // A sold project is a whole PC rig, not a "PROJECT" product type.
  if (sale && sale.projectId) return "RIG";

  // RIG BUILD already marks these in notes.
  if (sale && /SOLD FROM RIG BUILD/i.test(String(sale.notes || ""))) return "RIG";

  // Legacy manual sales had no type field and no link support.
  // In PROFITNODE's historical data these are completed PC flips.
  return "RIG";
}

function saleTypeChip(type){
  if(type === "RIG") return "chip-amber";
  if(type === "COMPONENT") return "chip-muted";
  return "chip-blue-outline";
}

/* Sales table: show what was actually sold. */
renderSales = function(){
  const filters = state.filters.sales;
  let sales = Store.all("sales").slice().sort((a,b)=>b.saleDate.localeCompare(a.saleDate));
  sales = filterRows(sales, filters.q, ["itemName","notes","saleType"]);

  const rows = sales.length ? sales.map(sale=>{
    const d = saleDerived(sale);
    const type = saleTypeResolved(sale);
    return '<tr class="clickable" data-open-entity="sale" data-id="'+sale.id+'">'+
      '<td><b>'+escHtml(sale.itemName)+'</b> <span class="chip '+saleTypeChip(type)+'">'+escHtml(type)+'</span></td>'+
      '<td class="mono">'+fmtDate(sale.saleDate)+'</td>'+
      '<td class="num">'+money(sale.buyerPrice,sale.currency)+'</td>'+
      '<td class="num">'+money(d.totalCost,sale.currency)+'</td>'+
      '<td class="num" style="color:'+(d.profit>=0?"var(--green)":"var(--red)")+'">'+money(d.profit,sale.currency)+'</td>'+
      '<td class="num">'+pct(d.margin)+'</td>'+
      '<td class="num" style="color:'+(d.roi>=0?"var(--green)":"var(--red)")+'">'+pct(d.roi)+'</td>'+
      '<td class="num">'+(d.daysHeld!=null?d.daysHeld:"â€”")+'</td>'+
      '</tr>';
  }).join("") : '<tr class="empty-row"><td colspan="8">No sales match this filter.</td></tr>';

  return pageHeader(
    "Sales",
    sales.length+" of "+Store.all("sales").length+" completed sales",
    '<button class="btn btn-primary" data-open-form="sale">+ NEW SALE</button>'
  )+
  '<div class="content"><div class="search-bar">'+
  '<input type="text" placeholder="Search salesâ€¦" data-filter="sales.q" value="'+escAttr(filters.q)+'">'+
  '</div><div class="panel"><div class="table-scroll"><table><thead><tr>'+
  '<th>Sale Item</th><th>Sale Date</th><th class="num">Sale Price</th><th class="num">Total Cost</th>'+
  '<th class="num">Profit</th><th class="num">Margin</th><th class="num">ROI</th><th class="num">Days Held</th>'+
  '</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
};

/* Dashboard counts: projects and RIG BUILD sales are PCs sold, not components. */
const PNCoreDashboardStatsSaleTypes = dashboardStats;
dashboardStats = function(currency){
  const out = PNCoreDashboardStatsSaleTypes(currency);
  const sales = Store.all("sales");
  out.pcsSold = sales.filter(s=>saleTypeResolved(s)==="RIG").length;
  out.componentsSold = sales.filter(s=>saleTypeResolved(s)==="COMPONENT").length;
  return out;
};

/* CSV export should use the same semantic type. */
if (typeof CSV_EXPORTS !== "undefined" && CSV_EXPORTS.sales) {
  const typeCol = CSV_EXPORTS.sales.columns.find(c=>c.label==="Type");
  if (typeCol) typeCol.get = saleTypeResolved;
}

/* Manual sale form gets an explicit type so future data is not ambiguous. */
if (typeof FORM_SCHEMAS !== "undefined" && FORM_SCHEMAS.sale) {
  const PNCoreSaleFormSchema = FORM_SCHEMAS.sale;
  FORM_SCHEMAS.sale = function(entity){
    const schema = PNCoreSaleFormSchema(entity);
    schema.fields[0].label = "Item / Rig Name";
    schema.fields.splice(1,0,{
      key:"saleType",
      label:"Sale Type",
      type:"select",
      options:PN_SALE_TYPES,
      required:true,
      default:entity ? saleTypeResolved(entity) : "RIG",
      half:true
    });
    return schema;
  };
}

/* Future RIG BUILD sales get explicit provenance instead of relying on notes. */
if (Actions && Actions.markRigSold) {
  const PNCoreMarkRigSoldSaleType = Actions.markRigSold.bind(Actions);
  Actions.markRigSold = function(rigId){
    const before = new Set(Store.all("sales").map(s=>s.id));
    const result = PNCoreMarkRigSoldSaleType(rigId);

    if(result && result.ok){
      const created = Store.all("sales").find(s=>!before.has(s.id));
      if(created) Store.update("sales", created.id, {saleType:"RIG", rigId:rigId});
    }
    return result;
  };
}
