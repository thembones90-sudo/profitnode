"use strict";
/*
  PROFITNODE SOLD-as-transaction v1

  Core rule: SOLD is a financial event, not a free status edit.
  - Direct status="SOLD" via Actions.updateInventory is rejected.
  - Status dropdown in the inventory edit form no longer contains SOLD.
  - MARK AS SOLD opens a modal requiring final sale price, currency, date, channel, etc.
  - Confirming credits Treasury the FULL sale price once (idempotent via saleTransactionId).
  - Legacy items with status=SOLD but no saleTransactionId show "SALE DATA INCOMPLETE"
    and can be completed once.
*/

(function(){
  const SALE_CHANNELS = ["KP","Facebook Marketplace","Viber","Flea Market","Direct","Other"];

  function inventorySaleTransactionId(item){
    return item && (item.saleTransactionId || item.sale_transaction_id || null);
  }

  function inventoryIsSold(item){
    return item && item.status === "SOLD";
  }

  function inventorySaleIncomplete(item){
    return inventoryIsSold(item) && !inventorySaleTransactionId(item);
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

  function applyInventorySaleFlow(treasury, itemId, amount, currency, note){
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return 0;
    const cur = String(currency || "RSD").toUpperCase();
    const existing = findInventorySaleFlow(treasury, itemId);
    const signed = amt;
    if (existing){
      const poolOld = ensureCashPool(existing.currency);
      poolOld.amount = (Number(poolOld.amount) || 0) - (existing.signedDelta || 0);
      existing.amount = amt;
      existing.signedDelta = signed;
      existing.currency = cur;
      existing.note = note || existing.note || "";
      existing.updatedAt = nowISO();
      const poolNew = ensureCashPool(cur);
      poolNew.amount = (Number(poolNew.amount) || 0) + signed;
    } else {
      treasury.flows.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        refType: "inventory",
        refId: itemId,
        kind: "SALE",
        amount: amt,
        currency: cur,
        signedDelta: signed,
        note: note || "",
        createdAt: nowISO(),
        updatedAt: nowISO()
      });
      const pool = ensureCashPool(cur);
      pool.amount = (Number(pool.amount) || 0) + signed;
    }
    return signed;
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

    const existingTxId = inventorySaleTransactionId(item);
    if (existingTxId){
      // idempotent metadata update only
      Store.update("inventory", id, {
        salePrice: price,
        saleCurrency: currency,
        saleDate: date,
        saleChannel: channel,
        saleDetail: detail,
        saleNotes: notes
      });
      applyInventorySaleFlow(ensureTreasury(), id, price, currency, "Sold " + item.manufacturer + " " + item.model);
      Store.persist();
      Timeline.log("SOLD", item.manufacturer + " " + item.model + " SOLD", "Updated sale: " + money(price, currency), date, "sale", id);
      return {ok:!0, id, transactionId: existingTxId, message:"Sale updated."};
    }

    const txId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    applyInventorySaleFlow(ensureTreasury(), id, price, currency, "Sold " + item.manufacturer + " " + item.model);
    Store.update("inventory", id, {
      status: "SOLD",
      salePrice: price,
      saleCurrency: currency,
      saleDate: date,
      saleChannel: channel,
      saleDetail: detail,
      saleNotes: notes,
      saleTransactionId: txId
    });
    Store.persist();
    Timeline.log("SOLD", item.manufacturer + " " + item.model + " SOLD", "Sale: " + money(price, currency), date, "sale", id);
    return {ok:!0, id, transactionId: txId};
  };

  // ---- block direct status=SOLD through generic update ----
  const origUpdateInventory = Actions.updateInventory;
  Actions.updateInventory = function(id, data){
    const item = Store.get("inventory", id);
    if (item && data && data.status === "SOLD" && item.status !== "SOLD"){
      console.warn("Blocked direct status=SOLD on " + id + "; use Actions.markInventorySold()");
      return item;
    }
    return origUpdateInventory.call(this, id, data);
  };

  // ---- remove SOLD from the inventory edit form status dropdown ----
  if (typeof FORM_SCHEMAS !== "undefined" && FORM_SCHEMAS.inventory){
    const origInventorySchema = FORM_SCHEMAS.inventory;
    FORM_SCHEMAS.inventory = function(rec){
      const schema = origInventorySchema(rec);
      const statusField = schema.fields.find(f => f.key === "status");
      if (statusField && Array.isArray(statusField.options)){
        statusField.options = statusField.options.filter(s => s !== "SOLD");
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
      '</div></div><div class="modal-foot"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-close-sale-modal>CANCEL</button><button type="submit" class="btn btn-primary">COMPLETE SALE</button></span></div></form></div></div>';

    const wrap = document.createElement("div");
    wrap.id = "pn-inventory-sale-modal";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const form = wrap.querySelector("[data-inventory-sale-form]");
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
        closeInventorySaleModal();
        if (state.modal && state.modal.entityType === "inventory") closeModal();
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
        const profit = Calc.profit(item.salePrice, item.purchasePrice);
        extra = '<div style="flex:1 1 100%;padding:8px 0;font-size:12px">' +
          (incomplete ? '<span class="chip chip-red-outline">SALE DATA INCOMPLETE</span> ' : "") +
          (item.salePrice ? '<b>SOLD FOR: ' + money(item.salePrice, item.saleCurrency || item.currency) + '</b> · ' + escHtml(item.saleDate || "") : "") +
          (item.saleChannel ? ' · ' + escHtml(item.saleChannel) : "") +
          (incomplete ? '' : ' · Realized profit: ' + money(profit, item.saleCurrency || item.currency)) +
          '</div>';
        if (incomplete){
          extra += '<button type="button" class="btn btn-primary" data-complete-sale-data="' + escAttr(id) + '">COMPLETE SALE DATA</button>';
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

  // ---- global click handlers for sale modal buttons ----
  document.addEventListener("click", function(e){
    const close = e.target.closest("[data-close-sale-modal]");
    if (close && e.target === close){ closeInventorySaleModal(); return; }
    const mark = e.target.closest("[data-mark-inventory-sold]");
    if (mark){ openInventorySaleModal(mark.dataset.markInventorySold); return; }
    const complete = e.target.closest("[data-complete-sale-data]");
    if (complete){ openInventorySaleModal(complete.dataset.completeSaleData); return; }
  });

  // ---- expose helpers ----
  window.__pnInventorySaleChannels = function(){ return SALE_CHANNELS.slice(); };
  window.__pnInventorySaleIncomplete = inventorySaleIncomplete;
})();
