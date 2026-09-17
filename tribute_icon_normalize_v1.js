"use strict";

(function(){
  if (window.__PN_TRIBUTE_ICON_NORMALIZE_V1__) return;
  window.__PN_TRIBUTE_ICON_NORMALIZE_V1__ = true;

  const STYLE_ID = 'pn-tribute-icon-normalize-v1-style';

  function inject(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      /* One canonical icon card for every Monthly Tribute row. */
      .pn-tribute-row .pn-tribute-mark,
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark,
      .pn-tribute-row[data-cool-semantic="1"] .pn-tribute-mark {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        min-height: 46px !important;
        max-width: 46px !important;
        max-height: 46px !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 46px !important;
        overflow: hidden !important;
      }

      /* Canonical semantic glyph scale. */
      .pn-tribute-row[data-cool-semantic="1"] .pn-cool-tribute-svg {
        width: 23px !important;
        height: 23px !important;
        max-width: 23px !important;
        max-height: 23px !important;
      }

      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="RENT"] .pn-cool-tribute-svg {
        width: 24px !important;
        height: 24px !important;
      }
      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="BILLS_UTILITIES"] .pn-cool-tribute-svg {
        width: 23px !important;
        height: 23px !important;
      }
      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="PHONE_BILL"] .pn-cool-tribute-svg {
        width: 21px !important;
        height: 21px !important;
      }
      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="BIG_PICKLE"] .pn-cool-tribute-svg {
        width: 23px !important;
        height: 23px !important;
      }

      /* Keep official app marks within the same card. */
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark img.pn-tribute-official-logo {
        object-fit: contain !important;
      }

      /* Prevent icon treatment from inflating the row geometry. */
      .pn-tribute-row {
        min-height: 72px !important;
      }
    `;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
    console.info('[PROFITNODE] TRIBUTE ICON NORMALIZE V1 active · all tribute icon cards normalized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once:true });
  } else {
    inject();
  }
})();
