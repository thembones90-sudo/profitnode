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
  const sales = Store.all("sales");
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

  const rows = sales.length ? sales.map(sale=>{
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
  }).join("") : '<tr class="empty-row"><td colspan="8">No sales match this filter.</td></tr>';

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
    sales.length+" of "+Store.all("sales").length+" completed sales",
    '<button class="btn btn-primary" data-open-form="sale">+ NEW SALE</button>'
  )+
  '<div class="content">'+
    summaryHtml+
    controls+
    '<div class="panel"><div class="table-scroll"><table><thead><tr>'+
      '<th>Sale Item</th>'+
      '<th>Sale Date</th>'+
      '<th class="num">Sale Price</th>'+
      '<th class="num">Total Cost</th>'+
      '<th class="num">Profit</th>'+
      '<th class="num">Margin</th>'+
      '<th class="num">ROI</th>'+
      '<th class="num">Days Held</th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div></div>'+
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
  const sales = Store.all("sales");
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

    const buyerField = schema.fields.find(f=>f.key==="buyerPrice");
    if (buyerField) buyerField.label = "Sale Price";

    if (!schema.fields.some(f=>f.key==="saleType")){
      schema.fields.splice(1,0,{
        key:"saleType",
        label:"Sale Type",
        type:"select",
        options:PN_SALE_TYPES,
        required:true,
        default:entity ? saleTypeResolved(entity) : "RIG",
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
          rigSnapshot:snapshot
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
        componentSnapshots:componentSnapshots
      });
    }

    return result;
  };
}

/* New manual sales explicitly carry MANUAL provenance. */
if (Actions && Actions.addSale){
  const PNCoreAddSaleLedger = Actions.addSale.bind(Actions);

  Actions.addSale = function(data){
    const payload = Object.assign({},data,{
      saleSource:data.saleSource || "MANUAL"
    });
    return PNCoreAddSaleLedger(payload);
  };
}

/* Type filter click handling. */
document.addEventListener("click",function(event){
  const btn = event.target.closest("[data-sale-type-filter]");
  if (!btn) return;

  state.filters.sales.type = btn.dataset.saleTypeFilter || "ALL";
  render();
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