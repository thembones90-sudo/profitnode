"use strict";

/*
  PROFITNODE Treasury Fund Flow v1

  Bridges the shop-side ledgers (inventory, deals, sales, mail) to the
  personal treasury cash pool so every acquisition deducts exactly once
  and every completed sale credits the full revenue.

  Canonical money rules:
  - inventory.purchasePrice is the single acquisition amount. A deal is a
    signal, not a second deduction: when a deal links to an inventory item,
    the deal's acquisition flow is retired (reversed) and the inventory flow
    remains.
  - Shipping always spends from the pool (inbound and outbound alike).
  - Only COMPLETED sales credit revenue; PENDING sales create no flow.
  - Edits are delta-based: each flow stores its own signed delta, so
    changing a price adjusts the pool by the exact difference and a
    back-to-back edit round-trips without drift.
  - Legacy/imported records carry no flows, so they never double-spend.
  - Backup/restore walks the full treasury snapshot (normalizeTreasury keeps
    flows), so replacing the ledger never replays deductions.
*/

function treasuryFlowPool(treasury, currency){
  const t = treasury || {balances:[]};
  const cur = String(currency || "RSD").toUpperCase();
  const byKey = k => b => !!(b && b.sourceKey === "CASH_" + k);
  const byLabel = k => b => !!(b && b.label && String(b.label).toLowerCase() === "cash (" + k.toLowerCase() + ")");
  return t.balances.find(byKey(cur)) || t.balances.find(byKey("RSD")) || t.balances.find(byLabel(cur)) || null;
}

function applyPoolDelta(treasury, currency, signedDelta){
  if (!signedDelta) return 0;
  const pool = treasuryFlowPool(treasury, currency);
  if (!pool) return 0;
  pool.amount = (Number(pool.amount) || 0) + signedDelta;
  return signedDelta;
}

function findTreasuryFlow(treasury, refType, refId, kind){
  const t = treasury || {flows:[]};
  return t.flows.find(f => f.refType === refType && f.refId === refId && f.kind === kind) || null;
}

function applyTreasuryChange(treasury, refType, refId, kind, amount, currency, note){
  const t = treasury || {flows:[]};
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return 0;
  const cur = currency || "RSD";
  const signed = (kind === "SALE" ? 1 : -1) * amt;
  const existing = findTreasuryFlow(t, refType, refId, kind);
  const delta = signed - (existing ? (existing.signedDelta || 0) : 0);
  if (existing){
    existing.amount = amt;
    existing.signedDelta = signed;
    existing.currency = cur;
    if (note) existing.note = note;
    existing.updatedAt = nowISO();
  } else {
    t.flows.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      refType: refType,
      refId: refId,
      kind: kind,
      amount: amt,
      currency: cur,
      signedDelta: signed,
      note: note || "",
      createdAt: nowISO()
    });
  }
  return applyPoolDelta(t, cur, delta);
}

function removeTreasuryFlow(treasury, refType, refId, kind){
  const t = treasury || {flows:[]};
  const i = t.flows.findIndex(f => f.refType === refType && f.refId === refId && f.kind === kind);
  if (i === -1) return 0;
  const f = t.flows[i];
  t.flows.splice(i, 1);
  applyPoolDelta(t, f.currency || "RSD", -(f.signedDelta || 0));
  return 1;
}

function reconcileSaleFlow(oldSale, newSale){
  const treasury = Store.load().treasury;
  const oldState = oldSale ? saleStateResolved(oldSale) : "COMPLETED";
  const newState = saleStateResolved(newSale);
  const amount = Number(newSale.buyerPrice) || 0;
  const cur = newSale.currency || "RSD";
  if (newState === "PENDING"){
    removeTreasuryFlow(treasury, "sale", newSale.id, "SALE");
    Store.persist();
    return;
  }
  if (oldState === "PENDING" || !oldSale){
    applyTreasuryChange(treasury, "sale", newSale.id, "SALE", amount, cur, "Sale revenue");
    Store.persist();
    return;
  }
  if ((Number(oldSale.buyerPrice) || 0) !== amount){
    applyTreasuryChange(treasury, "sale", newSale.id, "SALE", amount, cur, "Sale revenue");
    Store.persist();
  }
}

const PNStoreInsertTreasuryFlow = Store.insert.bind(Store);
Store.insert = function(collection, data){
  const result = PNStoreInsertTreasuryFlow(collection, data);
  if (collection === "sales" && result && saleStateResolved(result) === "COMPLETED"){
    applyTreasuryChange(Store.load().treasury, "sale", result.id, "SALE", result.buyerPrice, result.currency, "Sale revenue");
    Store.persist();
  }
  return result;
};

const PNStoreUpdateTreasuryFlow = Store.update.bind(Store);
Store.update = function(collection, id, payload){
  const oldItem = Store.get(collection, id);
  const result = PNStoreUpdateTreasuryFlow(collection, id, payload);
  if (collection === "sales" && result) reconcileSaleFlow(oldItem, result);
  return result;
};

const PNCoreRemoveSaleTreasuryFlow = Actions.removeSale.bind(Actions);
Actions.removeSale = function(id){
  const ledger = Store.load();
  removeTreasuryFlow(ledger.treasury, "sale", id, "SALE");
  Store.persist();
  return PNCoreRemoveSaleTreasuryFlow(id);
};

const PNCoreAddInventoryTreasuryFlow = Actions.addInventory;
Actions.addInventory = function(data){
  const result = PNCoreAddInventoryTreasuryFlow.call(this, data);
  applyTreasuryChange(Store.load().treasury, "inventory", result.id, "ACQUISITION", result.purchasePrice, result.currency, "Inventory purchase");
  Store.persist();
  return result;
};

const PNCoreUpdateInventoryTreasuryFlow = Actions.updateInventory;
Actions.updateInventory = function(id, data){
  const oldItem = Store.get("inventory", id);
  const result = PNCoreUpdateInventoryTreasuryFlow.call(this, id, data);
  if (oldItem && result){
    applyTreasuryChange(Store.load().treasury, "inventory", id, "ACQUISITION", Number(result.purchasePrice) || 0, result.currency, "Inventory purchase");
    Store.persist();
  }
  return result;
};

const PNCoreRemoveInventoryTreasuryFlow = Actions.removeInventory;
Actions.removeInventory = function(id){
  const item = Store.get("inventory", id);
  const ledger = Store.load();
  if (item) removeTreasuryFlow(ledger.treasury, "inventory", item.id, "ACQUISITION");
  Store.persist();
  return PNCoreRemoveInventoryTreasuryFlow.call(this, id);
};

const PNCoreAddDealTreasuryFlow = Actions.addDeal;
Actions.addDeal = function(data){
  const result = PNCoreAddDealTreasuryFlow.call(this, data);
  applyTreasuryChange(Store.load().treasury, "deal", result.id, "ACQUISITION", result.purchasePrice, result.currency, "Deal purchase");
  Store.persist();
  return result;
};

const PNCoreUpdateDealTreasuryFlow = Actions.updateDeal;
Actions.updateDeal = function(id, data){
  const oldDeal = Store.get("deals", id);
  const result = PNCoreUpdateDealTreasuryFlow.call(this, id, data);
  if (!result) return result;
  const treasury = Store.load().treasury;
  const newlyLinked = result.inventoryItemId && oldDeal && !oldDeal.inventoryItemId;
  if (newlyLinked && findTreasuryFlow(treasury, "deal", id, "ACQUISITION") && findTreasuryFlow(treasury, "inventory", result.inventoryItemId, "ACQUISITION")){
    removeTreasuryFlow(treasury, "deal", id, "ACQUISITION");
  } else {
    applyTreasuryChange(treasury, "deal", id, "ACQUISITION", Number(result.purchasePrice) || 0, result.currency, "Deal purchase");
  }
  Store.persist();
  return result;
};

const PNCoreRemoveDealTreasuryFlow = Actions.removeDeal;
Actions.removeDeal = function(id){
  const deal = Store.get("deals", id);
  const ledger = Store.load();
  if (deal) removeTreasuryFlow(ledger.treasury, "deal", deal.id, "ACQUISITION");
  Store.persist();
  return PNCoreRemoveDealTreasuryFlow.call(this, id);
};

const PNCoreAddMailTreasuryFlow = Actions.addMail;
Actions.addMail = function(data){
  const result = PNCoreAddMailTreasuryFlow.call(this, data);
  if (result && (Number(result.shippingCost) || 0)){
    const kind = result.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT";
    applyTreasuryChange(Store.load().treasury, "mail", result.id, kind, result.shippingCost, result.currency, result.direction === "incoming" ? "Incoming shipping" : "Outgoing shipping");
    Store.persist();
  }
  return result;
};

const PNCoreUpdateMailTreasuryFlow = Actions.updateMail;
Actions.updateMail = function(id, data){
  const before = Store.get("mail", id);
  const result = PNCoreUpdateMailTreasuryFlow.call(this, id, data);
  if (result && before){
    const treasury = Store.load().treasury;
    const kind = result.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT";
    const amt = Number(result.shippingCost) || 0;
    if (amt > 0 || findTreasuryFlow(treasury, "mail", id, kind)){
      applyTreasuryChange(treasury, "mail", id, kind, amt, result.currency, result.direction === "incoming" ? "Incoming shipping" : "Outgoing shipping");
      Store.persist();
    }
  }
  return result;
};

const PNCoreRemoveMailTreasuryFlow = Actions.removeMail;
Actions.removeMail = function(id){
  const mail = Store.get("mail", id);
  const ledger = Store.load();
  if (mail) removeTreasuryFlow(ledger.treasury, "mail", mail.id, mail.direction === "incoming" ? "SHIPPING_IN" : "SHIPPING_OUT");
  Store.persist();
  return PNCoreRemoveMailTreasuryFlow.call(this, id);
};