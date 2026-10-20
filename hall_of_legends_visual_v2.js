"use strict";
/* Hall of Legends v2: presentation-only LIM implementation. Financial evaluation remains in PN_HALL. */
(function(){
  if(typeof PN_HALL==="undefined"||typeof ROUTES==="undefined")return;
  const route=ROUTES.find(r=>r.key==="hall");
  if(!route||route._visualV2)return;
  route._visualV2=true;
  const ui={category:"ALL",status:"all",lastFocus:null};
  const categories=["ALL","RIG FLIPPING","PART FLIPPING","THE TREASURY","THE MARKET","THE FORGE","THE SHADOW VAULT","THE NECROPOLIS","THE ARMORY","THE HUNT"];
  const unit=(value,type)=>{
    const num=Number(value)||0;
    if(type==="EUR")return "€"+num.toLocaleString("en-IE",{minimumFractionDigits:2,maximumFractionDigits:2});
    if(type==="percent")return num.toLocaleString("en-IE",{minimumFractionDigits:0,maximumFractionDigits:1})+"%";
    return Math.round(num).toLocaleString("en-IE");
  };
  const safe=v=>escHtml(String(v==null?"":v));
  const icon=(which)=>{
    const paths={
      rig:'<path d="M3 8h18M5 8v11h14V8M8 5h8M12 11v5M9 13h6"/>',
      part:'<rect x="3" y="3" width="18" height="18" rx="4"/><rect x="8" y="8" width="8" height="8" rx="1"/><path d="M8 1v2m8-2v2M8 21v2m8-2v2M1 8h2M1 16h2m18-8h2m-2 8h2"/>',
      combined:'<circle cx="12" cy="4" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="M11 6 5 17M13 6l6 11M6 19h12"/>',
      revenue:'<path d="M4 20h16M6 16v4m4-10v10m4-14v14m4-9v9" stroke-width="3"/>',
      trophy:'<path d="M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H4v4a4 4 0 0 0 4 4m9-8h3v4a4 4 0 0 1-4 4M12 15v5m-5 1h10"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
    };
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[which]||paths.trophy)+'</svg>';
  };
  const escAttr=v=>safe(v).replace(/"/g,"&quot;").replace(/\x27/g,"&#39;");
  function read(){const result=PN_HALL.evaluate(Store.load(),convert);return {...result,rank:PN_HALL.level(result.xp)}}
  function stat(label,value,ico){
    return '<div class="hl-stat"><span class="hl-stat-icon">'+icon(ico)+'</span><div><span class="hl-stat-label">'+safe(label)+'</span><strong class="hl-stat-value">'+safe(value)+'</strong></div></div>';
  }
  function heading(label,note){
    return '<div class="hl-section-head"><span class="hl-section-glyph">✧</span><h3>'+safe(label)+'</h3><span class="hl-head-line"></span><span class="hl-section-note">'+safe(note||"")+'</span></div>';
  }
  function oneCard(a){
    const pct=Math.max(0,Math.min(100,(Number(a.current)||0)/a.goal*100));
    const secret=a.secret&&!a.unlocked;
    const label=secret?"SECRET ACHIEVEMENT":a.name;
    const description=secret?"Requirement revealed once unlocked.":a.description;
    return '<button type="button" class="pn-hall-card '+a.rarity.toLowerCase()+(a.unlocked?' earned':'')+'" data-hol-detail="'+escAttr(a.id)+'" aria-label="'+escAttr(label+(a.unlocked?", unlocked":", locked"))+'">'+
      '<span class="hl-card-head"><span class="hl-medal">'+(a.unlocked?'◆':'◇')+'</span><span class="hl-rarity">'+safe(a.rarity)+' · '+a.xp+' XP</span></span>'+
      '<h4>'+safe(label)+'</h4><p>'+safe(description)+'</p>'+
      '<span class="hl-card-base"><span class="hl-bar"><i style="width:'+(secret?0:pct).toFixed(2)+'%"></i></span>'+
      '<span class="hl-card-current">'+(secret?'???':safe(unit(a.current,a.unit)+' / '+unit(a.goal,a.unit)))+'</span>'+
      '<span class="hl-card-state"><span class="hl-status-icon">'+icon(a.unlocked?"trophy":"lock")+'</span>'+(a.unlocked?'UNLOCKED':'LOCKED')+'</span></span></button>';
  }
  function renderHall(){
    const data=read(),m=data.metrics,rank=data.rank;
    const trophyCount=data.achievements.filter(a=>a.unlocked).length;
    const total=data.achievements.length;
    if(!categories.includes(ui.category))ui.category="ALL";
    const filtered=data.achievements.filter(a=>(ui.category==="ALL"||a.category===ui.category)&&(ui.status==="all"||(ui.status==="unlocked"?a.unlocked:!a.unlocked)));
    const tabs=categories.map(c=>'<button type="button" class="hl-filter'+(ui.category===c?' selected':'')+'" data-hol-category="'+escAttr(c)+'" aria-pressed="'+(ui.category===c)+'">'+safe(c)+'</button>').join("");
    const states=[["all","All"],["unlocked","Unlocked"],["locked","Locked"]].map(([id,label])=>'<button type="button" class="hl-toggle'+(ui.status===id?' selected':'')+'" data-hol-status="'+id+'" aria-pressed="'+(ui.status===id)+'">'+label+'</button>').join("");
    const note=data.unverified.length?'<div class="hl-info-note" role="note">'+data.unverified.length+' sale record(s) cannot yet certify profit. They are excluded from profit milestones until their costs or currency can be verified.</div>':"";
    const records=[
      ["BEST RIG FLIP",m.bestRig?unit(m.bestRig.profit,"EUR"):"UNVERIFIED"],
      ["BEST PART FLIP",m.bestPart?unit(m.bestPart.profit,"EUR"):"UNVERIFIED"],
      ["HIGHEST VERIFIED ROI",m.bestROI?unit(m.bestROI.roi,"percent"):"UNVERIFIED"]
    ].map(r=>'<div class="hl-record"><span>'+r[0]+'</span><strong>'+r[1]+'</strong></div>').join("");
    const chronicle=data.evidence.filter(e=>e.verified).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8).map(e=>'<div class="hl-event"><b title="'+escAttr(e.name)+'">'+safe(e.name)+'</b><span>'+safe(e.date||"Date unknown")+' · '+safe(unit(e.profit,"EUR"))+' profit</span></div>').join("")||'<p class="hl-empty">No verified historical sales yet.</p>';
    return pageHeader("Hall of Legends","Your hardware legacy, earned from actual shop history.","")+
      '<div class="content pn-hall pn-legends-v2">'+
        '<section class="hl-hero pn-hall-hero" aria-label="Hall of Legends introduction"><div class="hl-hero-copy">'+
          '<div class="hl-overline">PROFITNODE / LEGACY SYSTEM</div>'+
          '<h2>HALL OF LEGENDS</h2><p class="hl-hero-sub">Earned in silicon. Forged in commerce.</p>'+
          '<div class="hl-hero-trophies"><span class="hl-symbol">'+icon("trophy")+'</span><span>'+trophyCount+' / '+total+' TROPHIES</span><span class="hl-sep">·</span><span>'+data.xp.toLocaleString("en-IE")+' XP</span></div>'+
        '</div></section>'+
        '<section class="hl-level pn-hall-level" aria-label="Founder level progress"><div class="hl-level-head"><strong class="hl-level-title">LEVEL '+rank.level+': '+safe(rank.title)+'</strong><span class="hl-xp-caption">'+rank.into+' / '+rank.needed+' XP TO NEXT LEVEL</span></div>'+
        '<div class="hl-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="'+rank.needed+'" aria-valuenow="'+rank.into+'"><i style="width:'+Math.max(0,Math.min(100,rank.progress)).toFixed(2)+'%"></i></div>'+
        '<div class="hl-level-foot"><small>Existing records automatically count toward your starting rank.</small><button type="button" class="hl-founder-btn" data-hol-founder>✦ FOUNDER\'S RECKONING ↗</button></div></section>'+
        '<section class="hl-stats" aria-label="Profit and revenue highlights">'+stat("RIG NET PROFIT",unit(m.rigProfit,"EUR"),"rig")+stat("PART NET PROFIT",unit(m.partProfit,"EUR"),"part")+stat("COMBINED NET PROFIT",unit(m.allProfit,"EUR"),"combined")+stat("SALES REVENUE",unit(m.revenue,"EUR"),"revenue")+'</section>'+
        heading("ACHIEVEMENTS","TRACK YOUR PROGRESS · UNLOCK YOUR LEGACY")+
        '<nav class="hl-filters pn-hall-tabs" aria-label="Achievement categories">'+tabs+'</nav>'+
        '<div class="hl-controls"><small>Showing '+filtered.length+' of '+total+' achievements</small><div class="hl-toggle-set" role="group" aria-label="Achievement status">'+states+'</div></div>'+
        note+'<section class="hl-grid pn-hall-grid" aria-label="Achievements">'+filtered.map(oneCard).join("")+'</section>'+
        '<section class="hl-secondary"><div class="hl-panel">'+heading("PROFIT RECORD BOARD","") + records+'</div><div class="hl-panel">'+heading("THE CHRONICLE","") +chronicle+'</div></section>'+
        '<div class="hl-overlay" data-hol-overlay hidden></div>'+
      '</div>';
  }
  function detail(a,founder){
    const root=document.querySelector(".pn-legends-v2");if(!root)return;
    const data=read(),overlay=root.querySelector("[data-hol-overlay]");if(!overlay)return;
    ui.lastFocus=document.activeElement;
    const hidden=a.secret&&!a.unlocked;
    const name=hidden?"SECRET ACHIEVEMENT":a.name;
    const desc=hidden?"Earn this hidden achievement to reveal its requirement.":a.description;
    const current=hidden?"???":unit(a.current,a.unit),goal=hidden?"???":unit(a.goal,a.unit);
    const pct=hidden?0:Math.max(0,Math.min(100,100*a.current/a.goal));
    const proven=data.evidence.filter(e=>e.verified).length;
    const evidence=founder?'<p>Your '+data.achievements.filter(v=>v.unlocked).length+' earned trophies are calculated from the current ledger. '+proven+' verified completed sales contribute to tracked financial progress. Missing evidence never creates imaginary profit.</p>':
      '<p>'+safe(desc)+'</p>';
    overlay.innerHTML='<div class="hl-dialog" role="dialog" aria-modal="true" aria-labelledby="hl-dialog-title">'+
      '<button type="button" class="hl-close" data-hol-close aria-label="Close achievement details">×</button>'+
      '<div class="hl-dialog-medal">'+(a.unlocked?'◆':'◇')+'</div>'+
      '<div class="hl-dialog-rarity">'+safe(a.rarity)+' ACHIEVEMENT · '+a.xp+' XP</div>'+
      '<h3 id="hl-dialog-title">'+safe(name)+'</h3>'+evidence+
      '<div class="hl-dialog-metrics"><span>'+safe(current)+'</span><span>'+safe(goal)+'</span></div>'+
      '<div class="hl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct.toFixed(0)+'"><i style="width:'+pct.toFixed(2)+'%"></i></div>'+
      '<div class="hl-dialog-state">'+(a.unlocked?'✦ UNLOCKED · Verified shop history recognized':'◇ LOCKED · Keep progressing')+'</div>'+
      '<button type="button" class="hl-dialog-back" data-hol-close>RETURN TO THE HALL</button></div>';
    overlay.hidden=false;
    overlay.querySelector(".hl-close").focus();
  }
  function close(){
    const overlay=document.querySelector(".pn-legends-v2 [data-hol-overlay]");
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;overlay.innerHTML="";
    if(ui.lastFocus&&ui.lastFocus.isConnected)ui.lastFocus.focus();
    ui.lastFocus=null;
  }
  function founder(){
    const data=read(),rank=data.rank,earned=data.achievements.filter(a=>a.unlocked).length;
    detail({rarity:"GOLD",xp:data.xp,name:"Founder's Reckoning",description:"Your existing shop history has earned "+earned+" trophies and "+data.xp+" XP, placing you at Level "+rank.level+": "+rank.title+".",current:data.xp,goal:rank.earned+(rank.needed-rank.into),unit:"count",unlocked:true},true);
  }
  route.render=renderHall;
  if(typeof document!=="undefined"&&document.addEventListener){
    document.addEventListener("click",event=>{
      const target=event.target&&event.target.closest?event.target:null;
      if(!target)return;
      const overlay=target.closest("[data-hol-overlay]");
      if(target.closest("[data-hol-close]")){event.preventDefault();close();return}
      if(overlay&&target===overlay){close();return}
      const root=target.closest(".pn-legends-v2");if(!root)return;
      const cat=target.closest("[data-hol-category]");
      if(cat&&categories.includes(cat.dataset.holCategory)){ui.category=cat.dataset.holCategory;render();return}
      const status=target.closest("[data-hol-status]");
      if(status&&["all","unlocked","locked"].includes(status.dataset.holStatus)){ui.status=status.dataset.holStatus;render();return}
      if(target.closest("[data-hol-founder]")){founder();return}
      const card=target.closest("[data-hol-detail]");
      if(card){const achievement=read().achievements.find(a=>a.id===card.dataset.holDetail);if(achievement)detail(achievement,false)}
    });
    document.addEventListener("keydown",event=>{const dialog=document.querySelector(".pn-legends-v2 .hl-overlay:not([hidden]) .hl-dialog");if(!dialog)return;
      if(event.key==="Escape"){event.preventDefault();close();return}
      if(event.key==="Tab"){const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
    });
  }
  globalThis.PN_HALL.visualV2={render:renderHall,ui};
})();
