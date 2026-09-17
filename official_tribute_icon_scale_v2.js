"use strict";
(function(){
  if (window.__PN_OFFICIAL_TRIBUTE_ICON_SCALE_V2__) return;
  window.__PN_OFFICIAL_TRIBUTE_ICON_SCALE_V2__ = true;

  const STYLE_ID = 'pn-official-tribute-icon-scale-v2-style';
  function inject(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        min-height: 46px !important;
        margin-right: 4px;
        padding: 0 !important;
      }
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 20px !important;
        height: 20px !important;
        max-width: 20px !important;
        max-height: 20px !important;
      }
      .pn-tribute-row[data-brand-key="GPT"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 18px !important;
        height: 18px !important;
        max-width: 18px !important;
        max-height: 18px !important;
      }
      .pn-tribute-row[data-brand-key="NETFLIX"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 18px !important;
        height: 24px !important;
        max-width: 18px !important;
        max-height: 24px !important;
      }
      .pn-tribute-row[data-brand-key="SBB_INTERNET"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 30px !important;
        height: 18px !important;
        max-width: 30px !important;
        max-height: 18px !important;
      }
      .pn-tribute-row[data-brand-key="SUNO"] .pn-tribute-mark img.pn-tribute-official-logo,
      .pn-tribute-row[data-brand-key="SPOTIFY"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 22px !important;
        height: 22px !important;
        max-width: 22px !important;
        max-height: 22px !important;
      }
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark .pn-tribute-logo-fallback {
        min-width: 20px !important;
        min-height: 20px !important;
        font-size: 11px !important;
      }
    `;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=css;
    document.head.appendChild(s);
    console.info('[PROFITNODE] OFFICIAL TRIBUTE ICON SCALE V2 active · tribute brand marks normalized.');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject, {once:true});
  else inject();
})();
