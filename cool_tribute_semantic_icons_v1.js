"use strict";

(function(){
  if (window.__PN_COOL_TRIBUTE_SEMANTIC_ICONS_V1__) return;
  window.__PN_COOL_TRIBUTE_SEMANTIC_ICONS_V1__ = true;

  const ICONS = [
    {
      key: 'RENT',
      match: /^RENT$/i,
      label: 'Rent',
      glow: 'rgba(255,110,150,.22)',
      border: 'rgba(255,110,150,.38)',
      svg: `
        <svg viewBox="0 0 64 64" class="pn-cool-tribute-svg" aria-hidden="true">
          <path d="M13 31.5L32 16l19 15.5" fill="none" stroke="#f26d98" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19 29v18h9V37h8v10h9V29" fill="none" stroke="#ff8eb4" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    {
      key: 'BILLS_UTILITIES',
      match: /^BILLS\s*\/\s*UTILITIES$/i,
      label: 'Bills / Utilities',
      glow: 'rgba(255,150,70,.20)',
      border: 'rgba(255,150,70,.34)',
      svg: `
        <svg viewBox="0 0 64 64" class="pn-cool-tribute-svg" aria-hidden="true">
          <path d="M27 12v16" fill="none" stroke="#ff8b57" stroke-width="4.2" stroke-linecap="round"/>
          <path d="M37 12v16" fill="none" stroke="#ff8b57" stroke-width="4.2" stroke-linecap="round"/>
          <path d="M32 28v10c0 5-2 8-7 11" fill="none" stroke="#ffb26b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M25 49c7-1 14-6 14-15V22h6" fill="none" stroke="#f26d98" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    {
      key: 'PHONE_BILL',
      match: /^PHONE\s+BILL$/i,
      label: 'Phone Bill',
      glow: 'rgba(111,243,158,.18)',
      border: 'rgba(111,243,158,.34)',
      svg: `
        <svg viewBox="0 0 64 64" class="pn-cool-tribute-svg" aria-hidden="true">
          <rect x="21" y="11" width="22" height="42" rx="4.5" fill="none" stroke="#72ef9f" stroke-width="4.2"/>
          <line x1="27" y1="18" x2="37" y2="18" stroke="#aaf7c5" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="32" cy="45" r="2.8" fill="#72ef9f"/>
        </svg>`
    },
    {
      key: 'BIG_PICKLE',
      match: /^BIG\s+PICKLE$/i,
      label: 'Big Pickle',
      glow: 'rgba(236,108,175,.20)',
      border: 'rgba(236,108,175,.34)',
      svg: `
        <svg viewBox="0 0 64 64" class="pn-cool-tribute-svg" aria-hidden="true">
          <path d="M24 18L14 32l10 14" fill="none" stroke="#ff7db0" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M40 18l10 14-10 14" fill="none" stroke="#ff7db0" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M35 15L29 49" fill="none" stroke="#ffb0cf" stroke-width="3.8" stroke-linecap="round"/>
        </svg>`
    }
  ];

  const STYLE_ID = 'pn-cool-tribute-semantic-icons-v1-style';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .pn-tribute-row[data-cool-semantic="1"] .pn-tribute-mark {
        width: 60px;
        height: 60px;
        display:flex;
        align-items:center;
        justify-content:center;
        border: 1px solid var(--pn-cool-border, rgba(220,90,140,.34));
        background: radial-gradient(circle at 50% 38%, rgba(255,255,255,.035), transparent 52%), linear-gradient(180deg, rgba(33,16,39,.96), rgba(19,10,26,.98));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.025), 0 0 18px var(--pn-cool-glow, rgba(220,90,140,.16));
        overflow: hidden;
      }
      .pn-tribute-row[data-cool-semantic="1"] .pn-cool-tribute-svg {
        width: 28px;
        height: 28px;
        display:block;
        filter: drop-shadow(0 0 6px rgba(255,255,255,.05));
      }
      .pn-tribute-row[data-cool-semantic="1"] .pn-tribute-name {
        letter-spacing: .065em;
      }
      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="PHONE_BILL"] .pn-cool-tribute-svg {
        width: 26px; height: 26px;
      }
      .pn-tribute-row[data-cool-semantic="1"][data-brand-key="RENT"] .pn-cool-tribute-svg {
        width: 29px; height: 29px;
      }
      .pn-tribute-row[data-cool-semantic="1"] .pn-tribute-mark::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(135deg, rgba(255,255,255,.06), transparent 44%, transparent 100%);
        mix-blend-mode: screen;
      }
    `;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function resolve(name){
    const n = String(name || '').trim();
    return ICONS.find(x => x.match.test(n)) || null;
  }

  function patchRows(scope){
    injectStyle();
    const root = scope && scope.querySelectorAll ? scope : document;
    const rows = root.querySelectorAll('.pn-tribute-row');
    rows.forEach(row => {
      const nameEl = row.querySelector('.pn-tribute-name');
      const mark = row.querySelector('.pn-tribute-mark');
      if (!nameEl || !mark) return;
      const cfg = resolve(nameEl.textContent);
      if (!cfg) return;
      if (row.dataset.brandKey === cfg.key && row.dataset.coolSemantic === '1') return;
      row.dataset.brandKey = cfg.key;
      row.dataset.coolSemantic = '1';
      mark.innerHTML = cfg.svg;
      mark.setAttribute('title', cfg.label);
      mark.setAttribute('aria-label', cfg.label + ' icon');
      mark.style.setProperty('--pn-cool-glow', cfg.glow);
      mark.style.setProperty('--pn-cool-border', cfg.border);
      mark.style.position = 'relative';
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
    console.info('[PROFITNODE] COOL TRIBUTE SEMANTIC ICONS V1 active · Rent / Utilities / Phone / Big Pickle icons upgraded.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
