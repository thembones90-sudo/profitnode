"use strict";

/*
  PROFITNODE Project Build Acquisition Panel v1

  Fixes the unified Project Build component picker so selecting a registry part
  does not immediately save a zero-cost PLANNED slot.

  Flow:
    REGISTRY result -> confirmation panel -> PLANNED or PURCHASED
    VAULT result    -> confirmation panel -> FROM PARTS VAULT

  PURCHASED uses Actions.addInventory(), so treasury_flow_extension performs the
  canonical one-time acquisition deduction. The newly created inventory item is
  then assigned to the project slot; assignment itself does not deduct money.
*/

if (typeof PBUI !== "undefined"){
  PBUI.acquisitionHit = null;
  PBUI.acquisitionMode = null;
  PBUI.acquisitionPrice = "";
  PBUI.acquisitionSource = "OTHER";
  PBUI.acquisitionSourceDetail = "";
  PBUI.acquisitionNote = "";
}

function pbaResetSelection(){
  if (typeof PBUI === "undefined") return;
  PBUI.acquisitionHit = null;
  PBUI.acquisitionMode = null;
  PBUI.acquisitionPrice = "";
  PBUI.acquisitionSource = "OTHER";
  PBUI.acquisitionSourceDetail = "";
  PBUI.acquisitionNote = "";
}

function pbaSourceOptions(selected){
  const options = [
    ["KP","KP"],
    ["FLEA_MARKET","FLEA MARKET"],
    ["FACEBOOK_MARKETPLACE","FACEBOOK MARKETPLACE"],
    ["FRIEND","FRIEND / LOCAL DEAL"],
    ["SHOP","SHOP"],
    ["PARTS_LOT","PARTS LOT"],
    ["OTHER","OTHER"]
  ];
  return options.map(function(row){
    return '<option value="'+row[0]+'"'+(row[0]===selected?' selected':'')+'>'+row[1]+'</option>';
  }).join("");
}

function pbaRegistryRating(slotKey,item){
  if (!item) return "";
  if (slotKey === "PSU"){
    let ten = Number(item.pn_rating_10);
    if (!Number.isFinite(ten) || ten <= 0){
      const q = Number(item.quality_score);
      if (Number.isFinite(q) && q > 0) ten = q > 10 ? q/10 : q;
    }
    const tier = item.pn_tier || item.quality_tier || "";
    const warn = String(item.warning_level || item.warningLevel || "").toUpperCase();
    if (Number.isFinite(ten) && ten > 0){
      return '<div class="pn-pba-rating"><b>'+escHtml(ten.toFixed(1).replace(/\.0$/,""))+
        ' / 10</b>'+(tier?' · '+escHtml(tier):'')+
        (warn && warn!=="NONE"?' · <span class="pn-pba-warning">'+escHtml(warn)+'</span>':'')+'</div>';
    }
  }
  if (typeof catalogTier === "function" && typeof pnTier === "function"){
    try{
      const t = pnTier(catalogTier(slotKey,item));
      if (t) return '<div class="pn-pba-rating">'+escHtml(t)+'</div>';
    }catch(_){}
  }
  return "";
}

function pbaSelectedPanelHtml(project,slotKey,hit){
  const isVault = hit && hit.source === "VAULT";
  const mode = isVault ? "VAULT" : (PBUI.acquisitionMode || "PLANNED");
  const price = isVault
    ? Number(hit.item && hit.item.purchasePrice || 0)
    : Math.max(0, Number(PBUI.acquisitionPrice) || 0);
  const rating = !isVault ? pbaRegistryRating(slotKey,hit.item) : "";
  const paidText = isVault
    ? '<div class="pn-pba-vault-price">Already paid: <b>'+money(hit.item.purchasePrice,hit.item.currency)+'</b></div>'
    : "";
  const modeButtons = isVault ? (
      '<div class="pn-pba-mode-row">'+
        '<button type="button" class="pn-pba-mode is-active" disabled>FROM PARTS VAULT</button>'+
      '</div>'
    ) : (
      '<div class="pn-pba-mode-row">'+
        '<button type="button" class="pn-pba-mode'+(mode==="PLANNED"?' is-active':'')+'" data-pb-acq-mode="PLANNED">PLANNED</button>'+
        '<button type="button" class="pn-pba-mode'+(mode==="PURCHASED"?' is-active':'')+'" data-pb-acq-mode="PURCHASED">PURCHASED</button>'+
      '</div>'
    );

  let moneyFields = "";
  if (!isVault){
    moneyFields =
      '<div class="pn-pba-grid">'+
        '<label class="field"><span>'+(mode==="PURCHASED"?'PAID PRICE':'PLANNED COST')+' ('+escHtml(project.currency)+')</span>'+
          '<input type="number" min="0" step="1" data-pb-acq-price value="'+escAttr(PBUI.acquisitionPrice===""?"":PBUI.acquisitionPrice)+'" placeholder="0">'+
        '</label>'+
        (mode==="PURCHASED"
          ? '<label class="field"><span>SOURCE</span><select data-pb-acq-source>'+pbaSourceOptions(PBUI.acquisitionSource||"OTHER")+'</select></label>'
          : '')+
      '</div>';

    if (mode==="PURCHASED"){
      moneyFields +=
        '<label class="field"><span>SOURCE DETAIL · OPTIONAL</span>'+
          '<input type="text" data-pb-acq-source-detail value="'+escAttr(PBUI.acquisitionSourceDetail||"")+'" placeholder="Seller, shop, local deal...">'+
        '</label>';
    }

    moneyFields +=
      '<label class="field"><span>NOTE · OPTIONAL</span>'+
        '<input type="text" data-pb-acq-note value="'+escAttr(PBUI.acquisitionNote||"")+'" placeholder="Anything worth remembering...">'+
      '</label>';
  }

  const confirmText = isVault ? "USE VAULT COMPONENT" : mode==="PURCHASED" ? "PURCHASE + ASSIGN" : "ASSIGN PLANNED COMPONENT";

  return '<div class="pn-pba-confirm">'+
    '<div class="pn-pba-selected-head">'+
      '<div><span class="pn-pba-kicker">SELECTED COMPONENT</span>'+
      '<div class="pn-pba-name">'+escHtml(hit.label)+'</div>'+rating+paidText+'</div>'+
      '<button type="button" class="btn btn-sm btn-ghost" data-pb-acq-back>CHANGE</button>'+
    '</div>'+
    modeButtons+
    moneyFields+
    '<div class="pn-pba-actions">'+
      '<button type="button" class="btn btn-primary" data-pb-acq-confirm>'+confirmText+'</button>'+
      '<button type="button" class="btn btn-sm" data-pb-cancel-slot>CANCEL</button>'+
    '</div>'+
  '</div>';
}

if (typeof pbUnifiedSlotEditorHtml === "function"){
  const PNCorePbUnifiedSlotEditorHtml = pbUnifiedSlotEditorHtml;
  pbUnifiedSlotEditorHtml = function(project){
    const k = PBUI.slotKey;
    const hit = PBUI.acquisitionHit;
    if (!k || !hit) return PNCorePbUnifiedSlotEditorHtml(project);

    const current = project.slots && project.slots[k];
    return '<div class="panel pn-pb-picker pn-pba-picker" data-pb-picker="'+k+'">'+
      '<div class="panel-head"><h2>'+(current?'SWAP ':'ADD ')+RIG_SLOT_LABELS[k].toUpperCase()+'</h2></div>'+
      '<div class="panel-body">'+pbaSelectedPanelHtml(project,k,hit)+'</div>'+
    '</div>';
  };
}

function pbaPurchasedInventoryData(project,slotKey,hit){
  const item = hit.item || {};
  const category = RIG_SLOT_CATEGORY[slotKey];
  const brand = String(item.brand || item.manufacturer || "").trim();
  const model = String(item.model || item.series || hit.label || "").trim();
  const price = Math.max(0, Math.round(Number(PBUI.acquisitionPrice)||0));
  const source = PBUI.acquisitionSource || "OTHER";
  const sourceDetail = String(PBUI.acquisitionSourceDetail || "").trim();
  const note = String(PBUI.acquisitionNote || "").trim();

  const data = {
    category: category,
    manufacturer: brand || "Unknown",
    model: model || hit.label,
    condition: "WORKING",
    status: "IN_STORAGE",
    purchasePrice: price,
    originalPrice: 0,
    currency: project.currency || "RSD",
    purchaseDate: typeof todayISO === "function" ? todayISO() : new Date().toISOString().slice(0,10),
    source: source,
    sourceDetail: sourceDetail,
    notes: note,
    acquisitionProjectId: project.id,
    ownershipSource: "PURCHASED_NOW",
    assignedProjectId: null
  };

  if (slotKey === "PSU" && item){
    if (item.wattage_w) data.wattage = Number(item.wattage_w);
  }

  return data;
}

function pbaConfirm(){
  const project = typeof pbProject === "function" ? pbProject() : null;
  const k = PBUI.slotKey;
  const hit = PBUI.acquisitionHit;
  if (!project || !k || !hit) return;

  if (hit.source === "VAULT"){
    const res = Actions.setProjectSlot(project.id,k,"INVENTORY",{inventoryItemId:hit.inventoryItemId});
    if (res.ok){
      pbaResetSelection();
      PBUI.slotKey = null;
      PBUI.query = "";
      PBUI.results = [];
    }
    pbSetNotice(res.ok?"ok":"err",res.ok?"Vault component assigned.":res.error);
    render();
    return;
  }

  const mode = PBUI.acquisitionMode || "PLANNED";
  const price = Math.max(0,Math.round(Number(PBUI.acquisitionPrice)||0));

  if (mode === "PURCHASED"){
    const inv = Actions.addInventory(pbaPurchasedInventoryData(project,k,hit));
    if (!inv){
      pbSetNotice("err","Could not create the purchased inventory item.");
      render();
      return;
    }

    const res = Actions.setProjectSlot(project.id,k,"INVENTORY",{inventoryItemId:inv.id});
    if (!res.ok){
      if (Actions.removeInventory) Actions.removeInventory(inv.id);
      pbSetNotice("err",res.error || "Purchase created but assignment failed; the purchase was rolled back.");
      render();
      return;
    }

    pbaResetSelection();
    PBUI.slotKey = null;
    PBUI.query = "";
    PBUI.results = [];
    pbSetNotice("ok","Purchased component added to Parts Vault, charged to Treasury, and assigned to the build.");
    render();
    return;
  }

  const data = pbRegistrySlot(project,k,hit.item);
  data.cost = price;
  data.notes = String(PBUI.acquisitionNote||"").trim();
  const res = Actions.setProjectSlot(project.id,k,"PLANNED",data);
  if (res.ok){
    pbaResetSelection();
    PBUI.slotKey = null;
    PBUI.query = "";
    PBUI.results = [];
  }
  pbSetNotice(res.ok?"ok":"err",res.ok?"Planned component assigned with planned cost.":res.error);
  render();
}

/*
  Capture phase is intentional. project_build_extension's original picker
  click handler lives in bubble phase and immediately saves a registry part
  at cost 0. We intercept the click before that legacy path runs.
*/
document.addEventListener("click",function(e){
  const pick = e.target.closest("[data-pb-picker-pick]");
  if (pick && PBUI.slotKey){
    e.preventDefault();
    e.stopImmediatePropagation();
    const hit = (PBUI.results||[])[Number(pick.dataset.pbPickerPick)];
    if (!hit) return;
    PBUI.acquisitionHit = hit;
    PBUI.acquisitionMode = hit.source==="VAULT" ? "VAULT" : "PLANNED";
    PBUI.acquisitionPrice = hit.source==="VAULT" ? String(Number(hit.item&&hit.item.purchasePrice||0)) : "";
    PBUI.acquisitionSource = "OTHER";
    PBUI.acquisitionSourceDetail = "";
    PBUI.acquisitionNote = "";
    render();
    return;
  }

  const mode = e.target.closest("[data-pb-acq-mode]");
  if (mode && PBUI.acquisitionHit){
    e.preventDefault();
    e.stopImmediatePropagation();
    PBUI.acquisitionMode = mode.dataset.pbAcqMode;
    render();
    return;
  }

  const back = e.target.closest("[data-pb-acq-back]");
  if (back){
    e.preventDefault();
    e.stopImmediatePropagation();
    pbaResetSelection();
    render();
    requestAnimationFrame(function(){
      if (typeof pbFocusSlotField === "function") pbFocusSlotField(PBUI.slotKey);
    });
    return;
  }

  const confirm = e.target.closest("[data-pb-acq-confirm]");
  if (confirm){
    e.preventDefault();
    e.stopImmediatePropagation();
    pbaConfirm();
    return;
  }

  if (e.target.closest("[data-pb-edit-slot]") || e.target.closest("[data-pb-cancel-slot]")){
    pbaResetSelection();
  }
},true);

document.addEventListener("input",function(e){
  if (e.target.matches("[data-pb-acq-price]")){
    PBUI.acquisitionPrice = e.target.value;
  }else if (e.target.matches("[data-pb-acq-source-detail]")){
    PBUI.acquisitionSourceDetail = e.target.value;
  }else if (e.target.matches("[data-pb-acq-note]")){
    PBUI.acquisitionNote = e.target.value;
  }
},true);

document.addEventListener("change",function(e){
  if (e.target.matches("[data-pb-acq-source]")){
    PBUI.acquisitionSource = e.target.value || "OTHER";
  }
},true);

const pbaStyle = document.createElement("style");
pbaStyle.textContent = `
.pn-pba-confirm{display:grid;gap:14px;max-width:900px}
.pn-pba-selected-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid var(--border);background:rgba(255,255,255,.025);border-radius:var(--radius)}
.pn-pba-kicker{display:block;font-family:var(--stamp);font-size:10px;letter-spacing:.08em;color:var(--text-mute);margin-bottom:5px}
.pn-pba-name{font-family:var(--display);font-size:18px;line-height:1.2;color:var(--text)}
.pn-pba-rating{margin-top:5px;font-size:12px;color:var(--text-mute)}
.pn-pba-warning{color:var(--red);font-weight:800}
.pn-pba-vault-price{margin-top:6px;color:var(--green)}
.pn-pba-mode-row{display:flex;gap:8px;flex-wrap:wrap}
.pn-pba-mode{appearance:none;border:1px solid var(--border);background:var(--panel-2);color:var(--text-mute);padding:9px 14px;border-radius:var(--radius);font-family:var(--stamp);font-weight:800;letter-spacing:.05em;cursor:pointer}
.pn-pba-mode:hover{border-color:var(--amber-dim);color:var(--text)}
.pn-pba-mode.is-active{border-color:var(--amber);background:var(--amber-wash);color:var(--amber)}
.pn-pba-mode:disabled{cursor:default;opacity:1}
.pn-pba-grid{display:grid;grid-template-columns:minmax(180px,1fr) minmax(220px,1fr);gap:12px}
.pn-pba-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-top:2px}
@media(max-width:760px){.pn-pba-grid{grid-template-columns:1fr}.pn-pba-selected-head{align-items:stretch}.pn-pba-name{font-size:16px}}
`;
document.head.appendChild(pbaStyle);
