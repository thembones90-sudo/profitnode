"use strict";

(function installPartsVaultRetirementV1(){
  const RETIRED_STATUSES = new Set(["SOLD","GIFTED","SOLD_IN_TRANSIT"]);

  if (typeof renderInventory !== "function") return;

  renderInventory = function renderInventoryRetirementAware(){
    const e=state.filters.inventory,l=Store.all("inventory"),o=l.filter(item=>!RETIRED_STATUSES.has(item.status)).length,i=l.length-o;
    let t=l.slice().sort((a,b)=>(b.purchaseDate||"").localeCompare(a.purchaseDate||""));
    if("ALL"!==e.category)t=t.filter(item=>item.category===e.category);
    if("ACTIVE"===e.status)t=t.filter(item=>!RETIRED_STATUSES.has(item.status));
    else if("ALL"!==e.status)t=t.filter(item=>item.status===e.status);
    t=filterRows(t,e.q,["manufacturer","model","source","notes"]);

    const a='<option value="ALL">ALL CATEGORIES</option>'+CATEGORIES.map(v=>'<option value="'+v+'"'+(e.category===v?' selected':'')+'>'+v+'</option>').join('');
    const r='<option value="ACTIVE"'+("ACTIVE"===e.status?' selected':'')+'>ACTIVE INVENTORY</option><option value="ALL"'+("ALL"===e.status?' selected':'')+'>ALL STATUSES</option>'+INVENTORY_STATUSES.map(v=>'<option value="'+v+'"'+(e.status===v?' selected':'')+'>'+STATUS_LABEL(v)+'</option>').join('');
    const n={};
    Store.all("projects").forEach(p=>n[p.id]=p.name);
    const s=renderInventoryGroups(t,n);

    return pageHeader("Inventory",t.length+" of "+l.length+" components on record","")+
      '<div class="content"><div class="search-bar"><input type="text" placeholder="Search inventory…" data-filter="inventory.q" value="'+escAttr(e.q)+'"><select data-filter="inventory.category">'+a+'</select><select data-filter="inventory.status">'+r+'</select><select data-filter="inventory.sort" aria-label="Sort Inventory">'+[["QUALITY","QUALITY"],["PURCHASED","DATE"],["PRICE","PRICE"],["EST","EST. VALUE"],["PROFIT","PROFIT"],["HELD","DAYS HELD"]].map(v=>'<option value="'+v[0]+'"'+((e.sort||"QUALITY")===v[0]?' selected':'')+'>'+v[1]+'</option>').join('')+'</select><span class="pn-inventory-counts" aria-label="Inventory counts"><span class="chip chip-blue-outline" data-inventory-count="ACTIVE">ACTIVE <b>'+o+'</b></span><span class="chip chip-muted" data-inventory-count="RETIRED">RETIRED <b>'+i+'</b></span><span class="chip chip-muted" data-inventory-count="TOTAL">TOTAL <b>'+l.length+'</b></span></span><button class="btn btn-primary search-bar-cta" data-open-form="inventory">+ NEW ITEM</button></div><div class="panel"><div class="table-scroll"><table><thead><tr><th>Category</th><th>Item</th><th>Purchased</th><th class="num">Price</th><th class="num">Est. Value</th><th class="num">Profit</th><th class="num">Held</th><th>Condition</th><th>Status</th><th>Source</th><th>Project</th><th class="num">Repairs</th></tr></thead>'+s+'</table></div></div></div>';
  };

  console.info("[PROFITNODE] Parts Vault retirement V1 active · SOLD/GIFTED/SOLD_IN_TRANSIT excluded from ACTIVE INVENTORY.");
})();
