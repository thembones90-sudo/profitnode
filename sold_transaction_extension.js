"use strict";
/*
  PROFITNODE SOLD-as-transaction v2

  Core rule: SOLD is a financial event, not a free status edit.
  - Direct status="SOLD"/"SOLD_IN_TRANSIT" via Actions.updateInventory is rejected.
  - Status dropdown in the inventory edit form no longer contains SOLD or SOLD_IN_TRANSIT.
  - MARK AS SOLD opens a modal requiring final sale price, currency, date, channel, etc.
  - Confirming creates one completed Sales Ledger row and credits Treasury once, and sets
    the item's status to SOLD_IN_TRANSIT — the money has moved, but the part is still
    physically with the seller, awaiting shipment to the buyer.
  - MARK AS DELIVERED flips SOLD_IN_TRANSIT -> SOLD once the part has shipped/arrived.
    This is a pure status change: no second financial event, no re-credit.
  - Legacy SOLD items without a completed Sales Ledger row show "SALE DATA INCOMPLETE"
    and can be completed or migrated once.
*/

(function(){
  const SALE_CHANNELS = ["KP","Facebook Marketplace","Viber","Flea Market","Direct","Other"];

  // ---- register the new interim status ----
  if (typeof INVENTORY_STATUSES !== "undefined" && INVENTORY_STATUSES.indexOf("SOLD_IN_TRANSIT") === -1){
    INVENTORY_STATUSES.push("SOLD_IN_TRANSIT");
  }
  if (typeof INVENTORY_STATUS_META !== "undefined" && !INVENTORY_STATUS_META.SOLD_IN_TRANSIT){
    INVENTORY_STATUS_META.SOLD_IN_TRANSIT = {chip:"chip-amber-outline"};
  }

  function inventorySaleTransactionId(item){
    return item && (item.saleTransactionId || item.sale_transaction_id || null);
  }

  function inventoryIsSold(item){
    return item && (item.status === "SOLD" || item.status === "SOLD_IN_TRANSIT");
  }

  function inventoryAwaitingDelivery(item){
    return item && item.status === "SOLD_IN_TRANSIT";
  }

  function inventorySaleIncomplete(item){
    return inventoryIsSold(item) && !inventorySaleRecord(item);
  }

  function ensureTreasury(){
    const ledger = Store.load();
    if (!ledger.treasury) ledger.treasury = {balances:[], flows:[], snapshots:[]};
    if (!ledger.treasury.balances) ledger.treasury.balances = [];
    if (!ledger.treasury.flows) ledger.treasury.flows = [];
    return ledger.treasury;
  }

  function ensureCashPool(currency){
    const treasury = ensureTreasury();
    const cur = String(currency || "RSD").toUpperCase();
    const key = "CASH_" + cur;
    let pool = treasury.balances.find(b => b && b.sourceKey === key);
    if (!pool){
      pool = {sourceKey:key, label:"CASH ("+cur+")", amount:0, currency:cur};
      treasury.balances.push(pool);
    }
    return pool;
  }

  function findInventorySaleFlow(treasury, itemId){
    return (treasury.flows || []).find(f => f && f.refType === "inventory" && f.refId === itemId && f.kind === "SALE") || null;
  }

  function removeInventorySaleFlow(treasury, itemId){
    const flow = findInventorySaleFlow(treasury, itemId);
    if (!flow) return;
    const pool = ensureCashPool(flow.currency);
    pool.amount = (Number(pool.amount) || 0) - (Number(flow.signedDelta) || Number(flow.amount) || 0);
    treasury.flows = treasury.flows.filter(f => f !== flow);
  }

  function inventorySaleRecord(item){
    const transactionId = inventorySaleTransactionId(item);
    return (transactionId && Store.get("sales", transactionId)) ||
      Store.all("sales").find(sale => sale.inventoryItemId === item.id) || null;
  }

  function setInventorySaleNotice(sale, updated){
    const derived = saleDerived(sale);
    state.inventorySaleNotice = {
      saleId:sale.id,
      title:updated ? "SALE UPDATED" : "SALE COMPLETED",
      revenue:sale.buyerPrice,
      profit:derived.profit,
      currency:sale.currency
    };
  }

  function inventorySaleNoticeHtml(){
    const notice = state.inventorySaleNotice;
    if (!notice || !Store.get("sales", notice.saleId)) return "";
    return '<div class="pn-inventory-sale-notice" role="status" data-inventory-sale-notice="'+escAttr(notice.saleId)+'">'+
      '<div class="pn-inventory-sale-notice-copy"><b>'+escHtml(notice.title)+'</b><span>Revenue '+money(notice.revenue,notice.currency)+' · Realized profit <strong class="'+(notice.profit>=0?"pos":"neg")+'">'+money(notice.profit,notice.currency)+'</strong></span></div>'+
      '<div class="pn-inventory-sale-notice-actions"><button type="button" class="btn btn-sm btn-primary" data-view-inventory-sale="'+escAttr(notice.saleId)+'">VIEW IN LEDGER</button><button type="button" class="btn btn-sm" data-dismiss-inventory-sale-notice>DISMISS</button></div>'+
    '</div>';
  }

  function openInventorySaleInLedger(saleId){
    if (!Store.get("sales", saleId)) return;
    state.inventorySaleNotice = null;
    state.route = "sales";
    state.filters.sales.q = "";
    state.filters.sales.type = "ALL";
    openForm("sale", saleId);
  }

  function syncInventorySaleWarning(form, item){
    const warning = form.querySelector("[data-inventory-sale-loss-warning]");
    if (!warning) return;
    const price = Number(form.elements.salePrice.value);
    const currency = String(form.elements.saleCurrency.value || item.currency || "RSD").toUpperCase();
    const cost = inventoryAcquisitionCost(item, currency);
    const loss = cost - price;
    warning.hidden = !(price > 0 && loss > 0);
    warning.innerHTML = warning.hidden ? "" : '<b>LOSS WARNING</b><span>Acquisition cost is '+money(cost,currency)+' · this sale realizes a '+money(loss,currency)+' loss. You can still complete it.</span>';
  }

  // ---- public action: mark inventory item as sold ----
  Actions.markInventorySold = function(id, saleData){
    const item = Store.get("inventory", id);
    if (!item) return {ok:!1, error:"Item not found."};
    const price = Number(saleData && saleData.salePrice);
    if (!price || price <= 0) return {ok:!1, error:"Final sale price is required."};
    const currency = String(saleData.saleCurrency || item.currency || "RSD").toUpperCase();
    const date = String(saleData.saleDate || todayISO()).trim();
    const channel = (saleData.saleChannel || "").toString().trim();
    const detail = (saleData.saleDetail || "").toString().trim();
    const notes = (saleData.saleNotes || "").toString().trim();

    const existingSale = inventorySaleRecord(item);
    const payload = {
      projectId: null,
      inventoryItemId: id,
      itemName: ((item.manufacturer || "") + " " + (item.model || "")).trim(),
      saleDate: date,
      buyerPrice: price,
      originalInvestment: inventoryAcquisitionCost(item, currency),
      additionalCosts: existingSale ? Number(existingSale.additionalCosts) || 0 : 0,
      currency: currency,
      referenceStartDate: item.purchaseDate || date,
      buyerName: detail,
      saleChannel: channel,
      saleDetail: detail,
      notes: notes,
      saleType: "COMPONENT",
      category: item.category || "OTHER",
      saleSource: "INVENTORY",
      saleState: "COMPLETED"
    };

    ensureCashPool(currency);
    const sale = existingSale ? Actions.updateSale(existingSale.id, payload) : Actions.addSale(payload);
    if (!sale) return {ok:!1, error:"Sale could not be recorded."};
    removeInventorySaleFlow(ensureTreasury(), id);
    Store.update("inventory", id, {
      status: item.status === "SOLD" ? "SOLD" : "SOLD_IN_TRANSIT",
      salePrice: price,
      saleCurrency: currency,
      saleDate: date,
      saleChannel: channel,
      saleDetail: detail,
      saleNotes: notes,
      saleTransactionId: sale.id
    });
    Store.persist();
    return {ok:!0, id, transactionId: sale.id, saleId: sale.id, message:existingSale?"Sale updated.":"Sale completed."};
  };

  // ---- public action: the sold part has shipped/arrived; close it out ----
  Actions.markInventoryDelivered = function(id){
    const item = Store.get("inventory", id);
    if (!item) return {ok:!1, error:"Item not found."};
    if (item.status !== "SOLD_IN_TRANSIT") return {ok:!1, error:"Item is not awaiting delivery."};
    Store.update("inventory", id, {status:"SOLD"});
    Store.persist();
    return {ok:!0, id};
  };

  Store.all("inventory").filter(item =>
    inventoryIsSold(item) && inventorySaleTransactionId(item) &&
    !inventorySaleRecord(item) && Number(item.salePrice) > 0
  ).forEach(item => {
    const result = Actions.markInventorySold(item.id, {
      salePrice: item.salePrice,
      saleCurrency: item.saleCurrency || item.currency,
      saleDate: item.saleDate || todayISO(),
      saleChannel: item.saleChannel || "",
      saleDetail: item.saleDetail || "",
      saleNotes: item.saleNotes || ""
    });
    if (result.ok){
      Timeline.log("SALE_MIGRATED", ((item.manufacturer || "")+" "+(item.model || "")).trim()+" SALE RECORD MIGRATED", "Linked the confirmed legacy sale to the Sales Ledger; Treasury cash was preserved.", todayISO(), "sale", result.saleId);
    }
  });

  // ---- block direct status=SOLD/SOLD_IN_TRANSIT through generic update ----
  const origUpdateInventory = Actions.updateInventory;
  Actions.updateInventory = function(id, data){
    const item = Store.get("inventory", id);
    if (item && data && (data.status === "SOLD" || data.status === "SOLD_IN_TRANSIT") && item.status !== data.status){
      console.warn("Blocked direct status=" + data.status + " on " + id + "; use Actions.markInventorySold()/markInventoryDelivered()");
      return item;
    }
    if (item && data && data.status && inventoryIsSold(item) && data.status !== item.status && data.status !== "SOLD" && data.status !== "SOLD_IN_TRANSIT"){
      console.warn("Kept " + item.status + " on " + id + "; delete its sale in the Ledger to undo a sale");
      data = Object.assign({}, data);
      delete data.status;
    }
    return origUpdateInventory.call(this, id, data);
  };

  // ---- remove SOLD/SOLD_IN_TRANSIT from the inventory edit form status dropdown ----
  if (typeof FORM_SCHEMAS !== "undefined" && FORM_SCHEMAS.inventory){
    const origInventorySchema = FORM_SCHEMAS.inventory;
    FORM_SCHEMAS.inventory = function(rec){
      const schema = origInventorySchema(rec);
      const statusField = schema.fields.find(f => f.key === "status");
      if (statusField && Array.isArray(statusField.options)){
        statusField.options = rec && inventoryIsSold(rec)
          ? [rec.status]
          : statusField.options.filter(s => s !== "SOLD" && s !== "SOLD_IN_TRANSIT");
      }
      return schema;
    };
  }

  // ---- sale modal ----
  function openInventorySaleModal(itemId){
    const item = Store.get("inventory", itemId);
    if (!item) return;
    const isLegacy = inventorySaleIncomplete(item);
    const price = item.salePrice || "";
    const currency = item.saleCurrency || item.currency || "RSD";
    const date = item.saleDate || todayISO();
    const channel = item.saleChannel || "";
    const detail = item.saleDetail || "";
    const notes = item.saleNotes || "";
    const title = isLegacy ? "COMPLETE SALE DATA" : "MARK AS SOLD";

    const html = '<div class="modal-backdrop" data-close-sale-modal><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>' + escHtml(title) + '</h3><button class="modal-close" data-close-sale-modal aria-label="Close">✕</button></div><form data-inventory-sale-form data-id="' + escAttr(itemId) + '"><div class="modal-body"><div class="field-row-wrap" style="display:flex;flex-wrap:wrap;gap:0 14px">' +
      '<label class="field half"><span class="req">Final Sale Price</span><input type="number" name="salePrice" step="0.01" min="0" value="' + escAttr(price) + '" required></label>' +
      '<label class="field half"><span class="req">Currency</span><select name="saleCurrency">' + CURRENCIES.map(c => '<option value="' + escAttr(c) + '"' + (c === currency ? " selected" : "") + '>' + escHtml(c) + "</option>").join("") + "</select></label>" +
      '<label class="field half"><span class="req">Sale Date</span><input type="date" name="saleDate" value="' + escAttr(date) + '" required></label>' +
      '<label class="field half"><span>Sale Channel</span><select name="saleChannel"><option value="">—</option>' + SALE_CHANNELS.map(c => '<option value="' + escAttr(c) + '"' + (c === channel ? " selected" : "") + '>' + escHtml(c) + "</option>").join("") + "</select></label>" +
      '<label class="field half"><span>Buyer / Detail</span><input type="text" name="saleDetail" value="' + escAttr(detail) + '"></label>' +
      '<label class="field half"><span>Sale Notes</span><input type="text" name="saleNotes" value="' + escAttr(notes) + '"></label>' +
      '</div><div class="pn-sale-loss-warning" data-inventory-sale-loss-warning role="alert" hidden></div></div><div class="modal-foot"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-close-sale-modal>CANCEL</button><button type="submit" class="btn btn-primary">COMPLETE SALE</button></span></div></form></div></div>';

    const wrap = document.createElement("div");
    wrap.id = "pn-inventory-sale-modal";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const form = wrap.querySelector("[data-inventory-sale-form]");
    const syncWarning = function(){ syncInventorySaleWarning(form, item); };
    form.addEventListener("input", syncWarning);
    form.addEventListener("change", syncWarning);
    syncWarning();
    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      const fd = new FormData(form);
      const result = Actions.markInventorySold(itemId, {
        salePrice: fd.get("salePrice"),
        saleCurrency: fd.get("saleCurrency"),
        saleDate: fd.get("saleDate"),
        saleChannel: fd.get("saleChannel"),
        saleDetail: fd.get("saleDetail"),
        saleNotes: fd.get("saleNotes")
      });
      if (result.ok){
        const sale = Store.get("sales", result.saleId);
        if (sale) setInventorySaleNotice(sale, result.message === "Sale updated.");
        closeInventorySaleModal();
        if (state.modal && state.modal.entityType === "inventory") state.modal = null;
        render();
      } else {
        alert(result.error || "Sale failed");
      }
    });
  }

  function closeInventorySaleModal(){
    const el = document.getElementById("pn-inventory-sale-modal");
    if (el) el.remove();
  }

  // ---- customize inventory edit modal footer ----
  if (typeof renderModal === "function"){
    const origRenderModal = renderModal;
    renderModal = function(){
      const html = origRenderModal();
      if (!state.modal || state.modal.entityType !== "inventory") return html;
      const id = state.modal.id;
      if (!id) return html; // new item
      const item = Store.get("inventory", id);
      if (!item) return html;

      let extra = "";
      if (inventoryIsSold(item)){
        const incomplete = inventorySaleIncomplete(item);
        const awaitingDelivery = inventoryAwaitingDelivery(item);
        const sale = inventorySaleRecord(item);
        const profit = sale ? saleDerived(sale).profit : Calc.profit(item.salePrice, item.purchasePrice);
        extra = '<div style="flex:1 1 100%;padding:8px 0;font-size:12px">' +
          (incomplete ? '<span class="chip chip-red-outline">SALE DATA INCOMPLETE</span> ' : "") +
          (awaitingDelivery ? '<span class="chip chip-amber-outline">AWAITING DELIVERY</span> ' : "") +
          (item.salePrice ? '<b>SOLD FOR: ' + money(item.salePrice, item.saleCurrency || item.currency) + '</b> · ' + escHtml(item.saleDate || "") : "") +
          (item.saleChannel ? ' · ' + escHtml(item.saleChannel) : "") +
          (incomplete ? '' : ' · Realized profit: ' + money(profit, item.saleCurrency || item.currency)) +
          '</div>';
        if (incomplete){
          extra += '<button type="button" class="btn btn-primary" data-complete-sale-data="' + escAttr(id) + '">COMPLETE SALE DATA</button>';
        } else if (sale){
          extra += '<button type="button" class="btn" data-view-inventory-sale="' + escAttr(sale.id) + '">VIEW SALE</button>';
        }
        if (awaitingDelivery){
          extra += '<button type="button" class="btn btn-primary" data-mark-inventory-delivered="' + escAttr(id) + '">MARK AS DELIVERED</button>';
        }
      } else {
        extra = '<button type="button" class="btn btn-primary" data-mark-inventory-sold="' + escAttr(id) + '">MARK AS SOLD</button>';
      }

      // ---- grouped 3-cluster footer: LEFT=DELETE / CENTER=sale status+action / RIGHT=CANCEL+SAVE ----
      const footOpen = '<div class="modal-foot">';
      const footIdx = html.indexOf(footOpen);
      if (footIdx === -1) return html;
      const flexOpen = '<span style="display:flex;gap:8px">';
      const flexIdx = html.indexOf(flexOpen, footIdx);
      if (flexIdx === -1) return html;
      const leftCluster = html.slice(footIdx + footOpen.length, flexIdx).trim();
      const flexCloseIdx = html.indexOf('</span>', flexIdx + flexOpen.length);
      if (flexCloseIdx === -1) return html;
      const rightCluster = html.slice(flexIdx, flexCloseIdx + '</span>'.length);
      const restIdx = flexCloseIdx + '</span>'.length + '</div>'.length;

      const grouped = '<div class="modal-foot" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">' +
        '<span class="pn-foot-cluster pn-foot-left" style="display:inline-flex;gap:8px;align-items:center">' + leftCluster + '</span>' +
        (extra ? '<span class="pn-foot-cluster pn-foot-sale" style="display:inline-flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center">' + extra + '</span>' : "") +
        '<span class="pn-foot-cluster pn-foot-right" style="display:inline-flex;gap:8px;align-items:center">' + rightCluster + '</span>' +
        '</div>';

      return html.slice(0, footIdx) + grouped + html.slice(restIdx);
    };
  }

  if (typeof ROUTES !== "undefined"){
    const inventoryRoute = ROUTES.find(route => route.key === "inventory");
    if (inventoryRoute && typeof inventoryRoute.render === "function"){
      const previousInventoryRender = inventoryRoute.render;
      inventoryRoute.render = function(){
        const html = previousInventoryRender.apply(this, arguments);
        const notice = inventorySaleNoticeHtml();
        return notice ? html.replace('<div class="content">', '<div class="content">'+notice) : html;
      };
    }
  }

  // ---- global click handlers for sale modal buttons ----
  document.addEventListener("click", function(e){
    const view = e.target.closest("[data-view-inventory-sale]");
    if (view){
      e.preventDefault();
      e.stopPropagation();
      openInventorySaleInLedger(view.dataset.viewInventorySale);
      return;
    }
    if (e.target.closest("[data-dismiss-inventory-sale-notice]")){
      state.inventorySaleNotice = null;
      render();
      return;
    }
    const close = e.target.closest("[data-close-sale-modal]");
    if (close && e.target === close){ closeInventorySaleModal(); return; }
    const mark = e.target.closest("[data-mark-inventory-sold]");
    if (mark){ openInventorySaleModal(mark.dataset.markInventorySold); return; }
    const complete = e.target.closest("[data-complete-sale-data]");
    if (complete){ openInventorySaleModal(complete.dataset.completeSaleData); return; }
    const delivered = e.target.closest("[data-mark-inventory-delivered]");
    if (delivered){
      e.preventDefault();
      e.stopPropagation();
      const result = Actions.markInventoryDelivered(delivered.dataset.markInventoryDelivered);
      if (result.ok){
        if (state.modal && state.modal.entityType === "inventory") state.modal = null;
        render();
      } else {
        alert(result.error || "Could not mark as delivered");
      }
      return;
    }
  });

  const style = document.createElement("style");
  style.textContent = ".pn-inventory-sale-notice{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:11px 13px;border:1px solid var(--green-dim);border-radius:var(--radius);background:var(--green-wash);box-shadow:inset 3px 0 0 var(--green)}.pn-inventory-sale-notice-copy{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;min-width:0}.pn-inventory-sale-notice-copy>b{font:800 10px var(--mono);letter-spacing:.14em;color:var(--green)}.pn-inventory-sale-notice-copy>span{font:11px var(--mono);color:var(--text-dim)}.pn-inventory-sale-notice-actions{display:flex;gap:7px;flex:0 0 auto}.pn-sale-loss-warning{display:flex;align-items:flex-start;gap:10px;margin-top:4px;padding:10px 12px;border:1px solid var(--red-dim);border-radius:var(--radius);background:var(--red-wash);color:var(--red);font:11px var(--mono);line-height:1.45}.pn-sale-loss-warning>b{letter-spacing:.12em;white-space:nowrap}.pn-sale-loss-warning[hidden]{display:none}.pn-inventory-counts{display:inline-flex;align-items:center;gap:6px;margin-left:auto}.pn-inventory-counts .chip b{margin-left:4px;color:var(--text)}@media(max-width:1180px){.pn-inventory-counts{order:3;width:100%;margin-left:0}}@media(max-width:760px){.pn-inventory-sale-notice{align-items:flex-start;flex-direction:column}.pn-inventory-sale-notice-actions{width:100%;flex-wrap:wrap}}";
  document.head.appendChild(style);

  // ---- keep SOLD_IN_TRANSIT items out of new builds/rigs, same as SOLD ----
  function soldInTransitBlock(item){
    return item && item.status === "SOLD_IN_TRANSIT" ?
      {ok:!1, error:(item.manufacturer||"")+" "+(item.model||"")+" is already marked SOLD (awaiting delivery)."} : null;
  }

  if (typeof Actions.setProjectSlot === "function"){
    const origSetProjectSlot = Actions.setProjectSlot.bind(Actions);
    Actions.setProjectSlot = function(projectId, slotKey, kind, data){
      if (kind === "INVENTORY" && data && data.inventoryItemId){
        const blocked = soldInTransitBlock(Store.get("inventory", data.inventoryItemId));
        if (blocked) return blocked;
      }
      return origSetProjectSlot(projectId, slotKey, kind, data);
    };
  }

  if (typeof Actions.addProjectExtra === "function"){
    const origAddProjectExtra = Actions.addProjectExtra.bind(Actions);
    Actions.addProjectExtra = function(projectId, extra){
      if (extra && extra.inventoryItemId){
        const blocked = soldInTransitBlock(Store.get("inventory", extra.inventoryItemId));
        if (blocked) return blocked;
      }
      return origAddProjectExtra(projectId, extra);
    };
  }

  if (typeof Actions.assembleRig === "function"){
    const origAssembleRig = Actions.assembleRig.bind(Actions);
    Actions.assembleRig = function(rigId){
      const rig = Store.get("rigs", rigId);
      if (rig){
        for (const slotKey of RIG_SLOTS){
          const slot = rig.slots && rig.slots[slotKey];
          if (slot && slot.kind === "INVENTORY"){
            const blocked = soldInTransitBlock(Store.get("inventory", slot.inventoryItemId));
            if (blocked) return blocked;
          }
        }
      }
      return origAssembleRig(rigId);
    };
  }

  // ---- expose helpers ----
  window.__pnInventorySaleChannels = function(){ return SALE_CHANNELS.slice(); };
  window.__pnInventorySaleIncomplete = inventorySaleIncomplete;
  window.__pnInventoryAwaitingDelivery = inventoryAwaitingDelivery;
})();
