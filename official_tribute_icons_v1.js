"use strict";

(function(){
  if (window.__PN_OFFICIAL_TRIBUTE_ICONS_V1__) return;
  window.__PN_OFFICIAL_TRIBUTE_ICONS_V1__ = true;

  const BRANDS = [
    {
      key: 'SUNO',
      match: /^SUNO$/i,
      label: 'Suno',
      src: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://suno.com',
      fallback: 'S'
    },
    {
      key: 'SPOTIFY',
      match: /^SPOTIFY$/i,
      label: 'Spotify',
      src: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://spotify.com',
      fallback: 'S'
    },
    {
      key: 'NETFLIX',
      match: /^NETFLIX$/i,
      label: 'Netflix',
      src: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://netflix.com',
      fallback: 'N'
    },
    {
      key: 'GPT',
      match: /^GPT$/i,
      label: 'ChatGPT',
      src: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://chatgpt.com',
      fallback: 'GPT'
    },
    {
      key: 'SBB_INTERNET',
      match: /^SBB\s+INTERNET$/i,
      label: 'SBB',
      src: 'https://www.google.com/s2/favicons?sz=64&domain_url=https://sbb.rs',
      fallback: 'SBB'
    }
  ];

  const STYLE_ID = 'pn-official-tribute-icons-v1-style';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark {
        width: 60px;
        height: 60px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius: 0;
        border: 1px solid rgba(202,91,138,.45);
        background: linear-gradient(180deg, rgba(31,16,34,.92), rgba(19,10,25,.98));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.025), 0 0 16px rgba(173,73,143,.10);
        overflow: hidden;
      }
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark img.pn-tribute-official-logo {
        width: 26px;
        height: 26px;
        object-fit: contain;
        image-rendering: -webkit-optimize-contrast;
        filter: drop-shadow(0 0 6px rgba(255,255,255,.06));
      }
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-mark .pn-tribute-logo-fallback {
        display:none;
        min-width: 26px;
        min-height: 26px;
        align-items:center;
        justify-content:center;
        color: #f08cbc;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .08em;
      }
      .pn-tribute-row[data-official-brand="1"] .pn-tribute-name {
        letter-spacing: .06em;
      }
      .pn-tribute-row[data-brand-key="SPOTIFY"] .pn-tribute-mark { box-shadow: inset 0 0 0 1px rgba(29,185,84,.18), 0 0 18px rgba(29,185,84,.12); }
      .pn-tribute-row[data-brand-key="NETFLIX"] .pn-tribute-mark { box-shadow: inset 0 0 0 1px rgba(229,9,20,.18), 0 0 18px rgba(229,9,20,.12); }
      .pn-tribute-row[data-brand-key="GPT"] .pn-tribute-mark { box-shadow: inset 0 0 0 1px rgba(116,204,183,.16), 0 0 18px rgba(116,204,183,.12); }
      .pn-tribute-row[data-brand-key="SUNO"] .pn-tribute-mark { box-shadow: inset 0 0 0 1px rgba(244,164,96,.16), 0 0 18px rgba(244,164,96,.11); }
      .pn-tribute-row[data-brand-key="SBB_INTERNET"] .pn-tribute-mark { box-shadow: inset 0 0 0 1px rgba(255,207,75,.18), 0 0 18px rgba(255,207,75,.11); }
    `;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function resolveBrand(name){
    const n = String(name || '').trim();
    return BRANDS.find(b => b.match.test(n)) || null;
  }

  function officialMarkHtml(brand){
    const safeLabel = String(brand.label || 'Brand').replace(/"/g,'&quot;');
    const safeSrc = String(brand.src || '');
    const safeFallback = String(brand.fallback || '?').replace(/[<>]/g,'');
    return ''
      + '<img class="pn-tribute-official-logo" alt="'+safeLabel+' icon" src="'+safeSrc+'" referrerpolicy="no-referrer" loading="eager" decoding="async" '
      + 'onload="var f=this.nextElementSibling;if(f)f.style.display=\'none\';" '
      + 'onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.style.display=\'flex\';">'
      + '<span class="pn-tribute-logo-fallback" aria-hidden="true">'+safeFallback+'</span>';
  }

  function patchRows(scope){
    injectStyle();
    const root = scope && scope.querySelectorAll ? scope : document;
    const rows = root.querySelectorAll('.pn-tribute-row');
    rows.forEach(row => {
      const nameEl = row.querySelector('.pn-tribute-name');
      const mark = row.querySelector('.pn-tribute-mark');
      if (!nameEl || !mark) return;
      const brand = resolveBrand(nameEl.textContent);
      if (!brand) return;
      if (row.dataset.brandKey === brand.key && mark.querySelector('.pn-tribute-official-logo')) return;
      row.dataset.officialBrand = '1';
      row.dataset.brandKey = brand.key;
      mark.innerHTML = officialMarkHtml(brand);
      mark.setAttribute('title', brand.label);
      mark.setAttribute('aria-label', brand.label + ' icon');
    });
  }

  function boot(){
    patchRows(document);
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        if (m.addedNodes && m.addedNodes.length) {
          patchRows(document);
          break;
        }
      }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    console.info('[PROFITNODE] OFFICIAL TRIBUTE ICONS V1 active · official app marks applied to Monthly Tribute.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
