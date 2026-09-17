/* PROFITNODE WAR CHEST VISUAL POLISH V1
   Visual-only enhancer for WAR CHEST page. No logic changes. */
(function(){
  "use strict";

  function txt(n){return (n&&n.textContent||"").replace(/\s+/g," ").trim();}
  function lower(s){return (s||"").toLowerCase();}
  function hasText(n,needle){return lower(txt(n))===lower(needle);} 
  function queryAll(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function first(sel,root){return (root||document).querySelector(sel);} 
  function nearestPanel(el){return el && (el.closest('.panel,[class*="panel"],section,article,div') || el.parentElement);}
  function findByExactText(text, root){
    root=root||document;
    const nodes=queryAll('h1,h2,h3,h4,h5,h6,div,span,b,strong',root);
    return nodes.find(n=>hasText(n,text))||null;
  }
  function findByIncludes(text, root){
    root=root||document;
    const nodes=queryAll('div,span,b,strong,small,p',root);
    const t=lower(text);
    return nodes.find(n=>lower(txt(n)).includes(t))||null;
  }
  function currencyLooks(s){return /[€$]|\bRSD\b|\bEUR\b/.test(s||"");}
  function numberish(s){return /\d/.test(s||"");}
  function decorateValueCard(card){
    if(!card || card.dataset.pnWcValueDecorated) return;
    const bits=queryAll('div,span,strong,b,small',card).filter(n=>txt(n));
    const main=bits.find(n=>currencyLooks(txt(n)) && numberish(txt(n)));
    if(main) main.classList.add('pn-wc-v1-card-value');
    const labels=bits.filter(n=>n!==main);
    if(labels[0]) labels[0].classList.add('pn-wc-v1-card-label');
    if(labels.length>1){
      const tail=labels.find(n=>currencyLooks(txt(n)) && n!==main) || labels[1];
      if(tail && tail!==labels[0]) tail.classList.add('pn-wc-v1-card-subvalue');
    }
    card.dataset.pnWcValueDecorated='1';
  }
  function findSectionPanels(){
    return {
      hero: nearestPanel(findByExactText('FORTRESS RESERVE')),
      reserves: nearestPanel(findByExactText('RESERVES')),
      forecast: nearestPanel(findByExactText('FORECAST')),
      ledger: nearestPanel(findByExactText('WAR CHEST LEDGER')),
      chronicle: nearestPanel(findByExactText('CHRONICLE OF THE HOARD')),
      surplus: nearestPanel(findByIncludes('SURPLUS ', document.body))
    };
  }
  function decorateHero(hero){
    if(!hero || hero.dataset.pnWcStyled) return;
    hero.classList.add('pn-wc-v1-hero','pn-wc-v1-section');
    const amount=queryAll('div,span,strong,b',hero).find(n=>/^€\s?\d|^€\d|^\$\d/.test(txt(n)));
    if(amount) amount.classList.add('pn-wc-v1-hero-amount');
    const status=findByIncludes('FORTRESS SECURED',hero);
    if(status) status.classList.add('pn-wc-v1-hero-status');

    const protectedNode=findByIncludes('PROTECTED',hero);
    const deployableNode=findByIncludes('DEPLOYABLE',hero);
    [protectedNode,deployableNode].forEach(n=>{
      if(n){
        const row=n.parentElement;
        if(row && !row.classList.contains('pn-wc-v1-metric')){
          row.classList.add('pn-wc-v1-metric');
          const kids=queryAll('div,span,strong,b,small',row).filter(x=>txt(x));
          if(kids[0]) kids[0].classList.add('pn-wc-v1-metric-value');
          if(kids[1]) kids[1].classList.add('pn-wc-v1-metric-label');
        }
      }
    });
    hero.dataset.pnWcStyled='1';
  }
  function decorateSection(section){
    if(!section) return;
    section.classList.add('pn-wc-v1-section');
    const title=queryAll('div,span,strong,b,h2,h3,h4',section).find(n=>['RESERVES','FORECAST','WAR CHEST LEDGER','CHRONICLE OF THE HOARD','FORTRESS RESERVE'].includes(txt(n)));
    if(title) title.classList.add('pn-wc-v1-section-title');
  }
  function decorateReserves(panel){
    if(!panel || panel.dataset.pnWcReservesStyled) return;
    decorateSection(panel);
    const labels=['PAYONEER','PREPLY','FIVERR','CASH (RSD)','CASH (EUR)'];
    labels.forEach(label=>{
      const node=findByExactText(label,panel);
      if(!node) return;
      const card=nearestPanel(node);
      if(!card) return;
      card.classList.add('pn-wc-v1-reserve-card');
      const s=txt(card);
      if(/€0\.00|\$0\.00|\b0 RSD\b/.test(s)) card.classList.add('is-zero'); else card.classList.add('is-funded');
      if(label==='PAYONEER' || label==='PREPLY') card.classList.add('is-major');
      decorateValueCard(card);
    });
    panel.dataset.pnWcReservesStyled='1';
  }
  function decorateForecast(panel){
    if(!panel || panel.dataset.pnWcForecastStyled) return;
    decorateSection(panel);
    const labels=[
      ['OBLIGATIONS',''],
      ['PENDING CONVERSION',''],
      ['INCOMING TRIBUTE','is-highlight'],
      ['PROJECTED HOARD','is-future']
    ];
    labels.forEach(([label,extra])=>{
      const node=findByExactText(label,panel);
      if(!node) return;
      const card=nearestPanel(node);
      if(!card) return;
      card.classList.add('pn-wc-v1-forecast-card');
      if(extra) card.classList.add(extra);
      decorateValueCard(card);
    });
    panel.dataset.pnWcForecastStyled='1';
  }
  function decorateSurplus(panel){
    if(!panel || panel.dataset.pnWcSurplusStyled) return;
    panel.classList.add('pn-wc-v1-surplus');
    const main=findByIncludes('SURPLUS',panel);
    if(main) main.classList.add('pn-wc-v1-surplus-main');
    if(!first('.pn-wc-v1-allocation',panel)){
      const rail=document.createElement('div');
      rail.className='pn-wc-v1-allocation';
      rail.innerHTML='<i class="pn-wc-v1-road"></i><i class="pn-wc-v1-hardware"></i><i class="pn-wc-v1-free"></i>';
      panel.appendChild(rail);
    }
    panel.dataset.pnWcSurplusStyled='1';
  }
  function decorateLedger(panel){
    if(!panel || panel.dataset.pnWcLedgerStyled) return;
    decorateSection(panel);
    panel.classList.add('pn-wc-v1-ledger');
    const rows=queryAll('div,li,tr,article',panel).filter(n=>/\+|\-/.test(txt(n)) && /(RSD|EUR|€|\$)/.test(txt(n)));
    rows.forEach(r=>{
      if(r.classList.contains('pn-wc-v1-ledger-row')) return;
      r.classList.add('pn-wc-v1-ledger-row');
      const amount=queryAll('div,span,strong,b',r).find(n=>/(\+|\-)\s*\d/.test(txt(n)) || /(\+|\-)\s*\d[\d\.,]*\s*(RSD|EUR|€|\$)/.test(txt(n)));
      const income = /\+/.test(txt(amount||r));
      r.classList.add(income?'is-income':'is-expense');
      if(amount) amount.classList.add('pn-wc-v1-ledger-amount', income?'is-income':'is-expense');
    });
    panel.dataset.pnWcLedgerStyled='1';
  }
  function decorateChronicle(panel){
    if(!panel || panel.dataset.pnWcChronicleStyled) return;
    decorateSection(panel);
    panel.classList.add('pn-wc-v1-chronicle');
    const gain=findByIncludes('GAIN',panel);
    if(gain) gain.classList.add('pn-wc-v1-chronicle-gain');
    panel.dataset.pnWcChronicleStyled='1';
  }
  function decorateButton(){
    const btn=queryAll('button,a').find(n=>lower(txt(n)).includes('recount the hoard'));
    if(btn) btn.classList.add('pn-wc-v1-recount');
  }
  function decoratePage(){
    const title=findByExactText('WAR CHEST');
    if(!title) return;
    const page=nearestPanel(title) || document.body;
    document.body.classList.add('pn-wc-v1-page');
    const parts=findSectionPanels();
    decorateButton();
    decorateHero(parts.hero);
    decorateReserves(parts.reserves);
    decorateForecast(parts.forecast);
    decorateSurplus(parts.surplus);
    decorateLedger(parts.ledger);
    decorateChronicle(parts.chronicle);
  }

  function boot(){
    decoratePage();
    let ticks=0;
    const id=setInterval(function(){
      decoratePage();
      ticks++;
      if(ticks>120) clearInterval(id);
    },1000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
