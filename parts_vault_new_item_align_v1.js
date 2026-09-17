"use strict";

/* PROFITNODE — PARTS VAULT NEW ITEM ALIGN V1
   Presentation-only fix for the inventory toolbar CTA.
   The core stylesheet absolutely centers .search-bar-cta, which makes + NEW ITEM
   float over the filters. This restores the CTA to normal flex flow and pins it
   to the right edge without touching inventory/accounting behavior. */
(function(){
  if(window.__pnPartsVaultNewItemAlignV1) return;
  window.__pnPartsVaultNewItemAlignV1 = true;

  const style=document.createElement("style");
  style.id="pn-parts-vault-new-item-align-v1-style";
  style.textContent=`
    /* Inventory toolbar CTA must never overlay filter controls. */
    .search-bar > .search-bar-cta[data-open-form="inventory"]{
      position:static!important;
      left:auto!important;
      top:auto!important;
      right:auto!important;
      bottom:auto!important;
      transform:none!important;
      margin:0 0 0 auto!important;
      flex:0 0 auto!important;
      align-self:center!important;
      z-index:auto!important;
    }

    /* Keep the inventory counters compact so the CTA has a clean landing zone. */
    .search-bar > .pn-inventory-counts{
      display:flex!important;
      align-items:center!important;
      gap:6px!important;
      flex:0 1 auto!important;
      min-width:0!important;
      flex-wrap:wrap!important;
    }

    /* On narrower layouts the CTA is allowed to wrap, but remains right-aligned. */
    @media (max-width:1180px){
      .search-bar > .search-bar-cta[data-open-form="inventory"]{
        margin-left:auto!important;
      }
    }

    @media (max-width:760px){
      .search-bar > .search-bar-cta[data-open-form="inventory"]{
        width:100%!important;
        margin-left:0!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
