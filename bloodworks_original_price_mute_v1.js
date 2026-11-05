"use strict";

/*
  PROFITNODE — BLOODWORKS original-price mute.

  A rig slot's ORIGINAL PRICE column is Inventory.estimatedMarketValue
  for a Vault-sourced part (see rigSlotResolved() in app_core.js) - a
  real, meaningful figure, just one that is frequently never set on the
  underlying inventory item, where it silently defaults to 0. On that
  read-only Vault-sourced slot the column renders as a bare "0", which
  reads as "worth nothing" rather than "not recorded" - everywhere else
  in BLOODWORKS an unset number is shown muted/blank, not as a literal
  0 (see the KPI tiles' :placeholder-shown treatment in
  bloodworks_premium_visual_v1.js).

  Display only: swaps value="0" for an empty value plus an em-dash
  placeholder on the READ-ONLY (Vault-sourced) original-price input
  only. The editable Planned-part original-price field is left exactly
  as it was - it's an active input the operator is meant to type a
  number into, so a starting "0" there is normal, not noise. Nothing
  here touches the stored rig draft/slot data or any calculation.
*/
(function installBloodworksOriginalPriceMuteV1(){
  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(r => r && r.key === "rigbuild");
  if (!route || route.__pnBloodworksOriginalPriceMuteV1) return;

  const style = document.createElement("style");
  style.id = "pn-bloodworks-original-price-mute-v1";
  style.textContent = `
    .pn-rig-cmd[data-rig-view=editor] .rig-slot-price.is-secondary input.pn-bw-unset-original::placeholder{color:#5c5563;opacity:1;font-weight:500}
  `;
  document.head.appendChild(style);

  const UNSET_RE = /<input class="rig-price-input" type="number" step="0\.01" min="0" aria-label="Original price for ([^"]*)" readonly title="Managed from Inventory" value="0">/g;

  function muteUnsetOriginalPrice(html){
    return html.replace(UNSET_RE, (m, slotLabel) =>
      '<input class="rig-price-input pn-bw-unset-original" type="number" step="0.01" min="0" aria-label="Original price for ' + slotLabel + ' (not recorded on this part)" readonly title="Not recorded on this Vault part — set it from the part’s Inventory record to show it here." placeholder="—" value="">'
    );
  }

  const prevRender = route.render;
  route.render = function(){
    let html = String(prevRender.apply(this, arguments));
    if (html.indexOf('data-rig-view="editor"') >= 0) html = muteUnsetOriginalPrice(html);
    return html;
  };
  route.__pnBloodworksOriginalPriceMuteV1 = true;
})();
