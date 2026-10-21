"use strict";
/* Hall of Legends v3: compact campaign and progressive-chain presentation. Financial evaluation remains in PN_HALL. */
(function(){
  if(typeof PN_HALL==="undefined"||typeof ROUTES==="undefined")return;
  const route=ROUTES.find(r=>r.key==="hall");
  if(!route||route._visualV3)return;
  route._visualV3=true;
  const ui={category:"ALL",status:"all",sort:"closest",view:"campaign",lastFocus:null};
  const categories=["ALL","RIG FLIPPING","PART FLIPPING","THE EMPIRE","THE MARKET","THE FORGE","THE SHADOW VAULT","THE NECROPOLIS","THE ARMORY","THE HUNT"];
  const rarityOrder={BRONZE:1,SILVER:2,GOLD:3,EPIC:4,LEGENDARY:5};
  const unit=(value,type)=>{
    const num=Number(value)||0;
    if(type==="EUR")return "€"+num.toLocaleString("en-IE",{minimumFractionDigits:2,maximumFractionDigits:2});
    if(type==="percent")return num.toLocaleString("en-IE",{minimumFractionDigits:0,maximumFractionDigits:1})+"%";
    return Math.round(num).toLocaleString("en-IE");
  };
  const safe=v=>escHtml(String(v==null?"":v));
  const escAttr=v=>safe(v).replace(/"/g,"&quot;").replace(/\x27/g,"&#39;");
  const progress=a=>Math.max(0,Math.min(100,(Number(a.current)||0)/Math.max(1,a.goal)*100));
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
  function read(){const result=PN_HALL.evaluate(Store.load(),convert);return {...result,rank:PN_HALL.level(result.xp)}}
  function stat(label,value,ico){return '<div class="hl-stat"><span class="hl-stat-icon">'+icon(ico)+'</span><div><span class="hl-stat-label">'+safe(label)+'</span><strong class="hl-stat-value">'+safe(value)+'</strong></div></div>'}
  function heading(label,note){return '<div class="hl-section-head"><span class="hl-section-glyph">✧</span><h3>'+safe(label)+'</h3><span class="hl-head-line"></span><span class="hl-section-note">'+safe(note||"")+'</span></div>'}
  function remaining(a){const left=Math.max(0,a.goal-(Number(a.current)||0));return unit(left,a.unit)+" remaining"}
  function sortAchievements(rows){
    const copy=rows.slice();
    if(ui.sort==="tier")return copy.sort((a,b)=>(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0)||a.name.localeCompare(b.name));
    if(ui.sort==="unlocked")return copy.sort((a,b)=>String(b.unlockedAt||"").localeCompare(String(a.unlockedAt||""))||Number(b.unlocked)-Number(a.unlocked));
    return copy.sort((a,b)=>Number(a.unlocked)-Number(b.unlocked)||progress(b)-progress(a)||a.goal-b.goal);
  }
  function oneCard(a,extra){
    const pct=progress(a),secret=a.secret&&!a.unlocked,label=secret?"SECRET ACHIEVEMENT":a.name,description=secret?"Requirement revealed once unlocked.":a.description;
    return '<button type="button" class="pn-hall-card '+a.rarity.toLowerCase()+(a.unlocked?' earned':'')+(extra?' '+extra:'')+'" data-hol-detail="'+escAttr(a.id)+'" aria-label="'+escAttr(label+(a.unlocked?", unlocked":", locked"))+'">'+
      '<span class="hl-card-head"><span class="hl-medal">'+(a.unlocked?'◆':'◇')+'</span><span class="hl-rarity">'+safe(a.rarity)+' · '+a.xp+' XP'+(a.prestige?' · '+a.prestige+' PRESTIGE':'')+'</span></span>'+
      '<h4>'+safe(label)+'</h4><p>'+safe(description)+'</p><span class="hl-card-base"><span class="hl-bar"><i style="width:'+(secret?0:pct).toFixed(2)+'%"></i></span>'+
      '<span class="hl-card-current">'+(secret?'???':safe(unit(a.current,a.unit)+' / '+unit(a.goal,a.unit)))+'</span>'+
      '<span class="hl-card-state"><span class="hl-status-icon">'+icon(a.unlocked?"trophy":"lock")+'</span>'+(a.unlocked?(a.unlockedAt?'UNLOCKED · '+safe(a.unlockedAt):'UNLOCKED'):'NEXT · '+safe(remaining(a)))+'</span></span></button>';
  }
  function chainGroups(data){
    return PN_HALL.chains.map(chain=>{
      const stages=data.achievements.filter(a=>a.chainKey===chain.key),earned=stages.filter(a=>a.unlocked),next=stages.find(a=>!a.unlocked)||stages[stages.length-1];
      return {key:chain.key,name:chain.name,category:chain.category,stages,earned:earned.length,next,complete:earned.length===stages.length,latest:earned.slice().sort((a,b)=>String(b.unlockedAt).localeCompare(String(a.unlockedAt)))[0]||null};
    });
  }
  function oneChain(chain){
    const a=chain.next,pct=chain.complete?100:progress(a),markers=chain.stages.map(s=>'<i class="'+s.rarity.toLowerCase()+(s.unlocked?' earned':'')+'" title="'+escAttr(s.name)+'"></i>').join("");
    return '<button type="button" class="hl-chain-card '+a.rarity.toLowerCase()+(chain.complete?' complete':'')+'" data-hol-chain="'+escAttr(chain.key)+'" aria-label="'+escAttr(chain.name+', '+chain.earned+' of 5 milestones unlocked')+'">'+
      '<span class="hl-chain-head"><span><small>'+safe(chain.category)+'</small><strong>'+safe(chain.name)+'</strong></span><b>'+chain.earned+' / 5</b></span><span class="hl-chain-markers">'+markers+'</span>'+
      '<span class="hl-chain-next">'+(chain.complete?'LEGENDARY CHAIN COMPLETE':'NEXT · '+safe(a.name)+' · '+safe(remaining(a)))+'</span><span class="hl-bar"><i style="width:'+pct.toFixed(2)+'%"></i></span></button>';
  }
  function campaignRows(data){
    const unlocked=data.achievements.filter(a=>a.unlocked).sort((a,b)=>String(b.unlockedAt||"").localeCompare(String(a.unlockedAt||""))).slice(0,4);
    const closest=data.achievements.filter(a=>!a.unlocked&&!a.secret).sort((a,b)=>progress(b)-progress(a)||a.goal-b.goal).slice(0,5);
    const major=data.achievements.filter(a=>!a.unlocked&&["EPIC","LEGENDARY"].includes(a.rarity)).sort((a,b)=>progress(b)-progress(a))[0];
    const map=new Map();[...closest,...unlocked,...(major?[major]:[])].forEach(a=>map.set(a.id,a));return [...map.values()].slice(0,10);
  }
  function categorySummary(data){
    const rows=data.achievements.filter(a=>ui.category==="ALL"||a.category===ui.category),earned=rows.filter(a=>a.unlocked);
    return '<div class="hl-category-summary"><span><b>'+safe(ui.category==="ALL"?'ALL LEGACIES':ui.category)+'</b><small>'+earned.length+' / '+rows.length+' unlocked</small></span><span><b>'+earned.reduce((n,a)=>n+a.xp,0).toLocaleString("en-IE")+' XP</b><small>'+earned.reduce((n,a)=>n+a.prestige,0)+' prestige</small></span></div>';
  }
  function nextStrip(data){
    const next=data.achievements.filter(a=>!a.unlocked&&!a.secret).sort((a,b)=>progress(b)-progress(a)||a.goal-b.goal).slice(0,3);
    return '<section class="hl-next" aria-label="Next unlocks"><span class="hl-next-title">NEXT UNLOCKS</span>'+next.map((a,i)=>'<button type="button" data-hol-detail="'+escAttr(a.id)+'"><b>'+(i+1)+'</b><span><strong>'+safe(a.name)+'</strong><small>'+safe(remaining(a))+'</small></span></button>').join("")+'</section>';
  }
  function chronicle(data){
    const groups=new Map();data.achievements.filter(a=>a.unlocked&&a.unlockedAt).forEach(a=>{const list=groups.get(a.unlockedAt)||[];list.push(a);groups.set(a.unlockedAt,list)});
    const unlocks=[...groups].map(([date,rows])=>({date,type:"trophy",name:rows.length+" TROPH"+(rows.length===1?"Y":"IES")+" UNLOCKED",detail:rows.slice(0,3).map(a=>a.name).join(" · ")+(rows.length>3?" +"+(rows.length-3)+" more":"")}));
    const sales=data.evidence.filter(e=>e.verified).map(e=>({date:e.date,type:"sale",name:e.name,detail:unit(e.profit,"EUR")+" profit"}));
    return [...unlocks,...sales].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10).map(e=>'<div class="hl-event '+e.type+'"><b title="'+escAttr(e.name)+'">'+safe(e.name)+'</b><span>'+safe(e.date||"Date unknown")+' · '+safe(e.detail)+'</span></div>').join("")||'<p class="hl-empty">No verified legacy events yet.</p>';
  }
  function renderHall(){
    const data=read(),m=data.metrics,rank=data.rank,trophyCount=data.achievements.filter(a=>a.unlocked).length,total=data.achievements.length,completion=Math.round(100*trophyCount/Math.max(1,total));
    if(!categories.includes(ui.category))ui.category="ALL";
    const tabs=categories.map(c=>{const rows=data.achievements.filter(a=>c==="ALL"||a.category===c),earned=rows.filter(a=>a.unlocked).length;return '<button type="button" class="hl-filter'+(ui.category===c?' selected':'')+'" data-hol-category="'+escAttr(c)+'" aria-pressed="'+(ui.category===c)+'"><span>'+safe(c)+'</span><small>'+earned+'/'+rows.length+'</small></button>'}).join("");
    const states=[["all","All trophies"],["unlocked","Unlocked"],["locked","Locked"]].map(([id,label])=>'<button type="button" class="hl-toggle'+(ui.status===id?' selected':'')+'" data-hol-status="'+id+'" aria-pressed="'+(ui.status===id)+'">'+label+'</button>').join("");
    const sorts=[["closest","Closest"],["tier","Tier"],["unlocked","Unlock date"]].map(([id,label])=>'<button type="button" class="hl-sort'+(ui.sort===id?' selected':'')+'" data-hol-sort="'+id+'" aria-pressed="'+(ui.sort===id)+'">'+label+'</button>').join("");
    const mode='<div class="hl-mode" role="group" aria-label="Hall view"><button type="button" data-hol-view="campaign" class="'+(ui.view==="campaign"?'selected':'')+'">CURRENT CAMPAIGN</button><button type="button" data-hol-view="collection" class="'+(ui.view==="collection"?'selected':'')+'">ALL TROPHIES</button></div>';
    let body="",shown=0;
    if(ui.view==="campaign"){
      const rows=campaignRows(data).filter(a=>(ui.category==="ALL"||a.category===ui.category)&&(ui.status==="all"||(ui.status==="unlocked"?a.unlocked:!a.unlocked)));shown=rows.length;
      body=heading("CURRENT CAMPAIGN","RECENT WINS · CLOSEST TARGETS · MAJOR OBJECTIVE")+'<section class="hl-grid campaign" aria-label="Current campaign">'+sortAchievements(rows).map(a=>oneCard(a,a.rarity==="LEGENDARY"?"major":"")).join("")+'</section><button type="button" class="hl-view-all" data-hol-view="collection">VIEW ALL '+total+' TROPHIES →</button>';
    }else{
      let chains=chainGroups(data).filter(c=>ui.category==="ALL"||c.category===ui.category).filter(c=>ui.status==="all"||(ui.status==="unlocked"?c.earned>0:!c.complete));
      if(ui.sort==="closest")chains.sort((a,b)=>Number(a.complete)-Number(b.complete)||progress(b.next)-progress(a.next));
      if(ui.sort==="tier")chains.sort((a,b)=>(rarityOrder[b.next.rarity]||0)-(rarityOrder[a.next.rarity]||0));
      if(ui.sort==="unlocked")chains.sort((a,b)=>String(b.latest&&b.latest.unlockedAt||"").localeCompare(String(a.latest&&a.latest.unlockedAt||"")));
      let specials=data.achievements.filter(a=>!a.chainKey&&(ui.category==="ALL"||a.category===ui.category)&&(ui.status==="all"||(ui.status==="unlocked"?a.unlocked:!a.unlocked)));specials=sortAchievements(specials);shown=chains.length+specials.length;
      body=heading("PROGRESSION CHAINS","FIVE METALLIC STAGES · 90 TOTAL MILESTONES")+'<section class="hl-chain-grid" aria-label="Progression chains">'+chains.map(oneChain).join("")+'</section>'+(specials.length?heading("SPECIAL TROPHIES","ONE-OFF LEGACY MARKS")+'<section class="hl-grid specials" aria-label="Special trophies">'+specials.map(oneCard).join("")+'</section>':'');
    }
    const note=data.unverified.length?'<div class="hl-info-note" role="note">'+data.unverified.length+' sale record(s) cannot yet certify profit. They are excluded from profit milestones until their costs or currency can be verified. Independently verified revenue still counts toward sales-volume milestones.</div>':"";
    const records=[["BEST RIG FLIP",m.bestRig?unit(m.bestRig.profit,"EUR"):"UNVERIFIED"],["BEST PART FLIP",m.bestPart?unit(m.bestPart.profit,"EUR"):"UNVERIFIED"],["HIGHEST VERIFIED ROI",m.bestROI?unit(m.bestROI.roi,"percent"):"UNVERIFIED"]].map(r=>'<div class="hl-record"><span>'+r[0]+'</span><strong>'+r[1]+'</strong></div>').join("");
    return pageHeader("Hall of Legends","Your hardware legacy, earned from actual shop history.","")+'<div class="content pn-hall pn-legends-v2">'+
      '<section class="hl-hero pn-hall-hero" aria-label="Hall of Legends introduction"><div class="hl-hero-copy"><div class="hl-overline">PROFITNODE / LEGACY SYSTEM</div><h2>HALL OF LEGENDS</h2><p class="hl-hero-sub">Earned in silicon. Forged in commerce.</p><div class="hl-hero-trophies"><span class="hl-symbol">'+icon("trophy")+'</span><span>'+trophyCount+' / '+total+' TROPHIES</span><span class="hl-sep">·</span><span>'+completion+'% COMPLETE</span><span class="hl-sep">·</span><span>'+data.xp.toLocaleString("en-IE")+' XP</span><span class="hl-sep">·</span><span>'+data.prestige+' PRESTIGE</span></div></div></section>'+
      '<section class="hl-level pn-hall-level" aria-label="Founder level progress"><div class="hl-level-head"><strong class="hl-level-title">LEVEL '+rank.level+': '+safe(rank.title)+'</strong><span class="hl-xp-caption">'+rank.into+' / '+rank.needed+' XP TO NEXT LEVEL</span></div><div class="hl-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="'+rank.needed+'" aria-valuenow="'+rank.into+'"><i style="width:'+Math.max(0,Math.min(100,rank.progress)).toFixed(2)+'%"></i></div><div class="hl-level-foot"><small>Existing records automatically count toward your starting rank.</small><button type="button" class="hl-founder-btn" data-hol-founder>✦ FOUNDER\'S RECKONING ↗</button></div></section>'+
      nextStrip(data)+'<section class="hl-stats" aria-label="Profit and revenue highlights">'+stat("RIG NET PROFIT",unit(m.rigProfit,"EUR"),"rig")+stat("PART NET PROFIT",unit(m.partProfit,"EUR"),"part")+stat("LIFETIME REALIZED PROFIT",unit(m.allProfit,"EUR"),"combined")+stat("SALES REVENUE",unit(m.revenue,"EUR"),"revenue")+'</section>'+
      mode+heading("ACHIEVEMENTS","TRACK YOUR PROGRESS · UNLOCK YOUR LEGACY")+'<nav class="hl-filters pn-hall-tabs" aria-label="Achievement categories">'+tabs+'</nav>'+categorySummary(data)+'<div class="hl-controls"><small>Showing '+shown+' progress path'+(shown===1?'':'s')+' · '+total+' milestones remain in the ledger</small><div class="hl-control-groups"><div class="hl-toggle-set" role="group" aria-label="Achievement status">'+states+'</div><div class="hl-sort-set" role="group" aria-label="Achievement sorting">'+sorts+'</div></div></div>'+note+body+
      '<section class="hl-secondary"><div class="hl-panel">'+heading("PROFIT RECORD BOARD","")+records+'</div><div class="hl-panel">'+heading("THE CHRONICLE","TROPHIES · RECORDS · SALES")+chronicle(data)+'</div></section><div class="hl-overlay" data-hol-overlay hidden></div></div>';
  }
  function detail(a,founder){
    const root=document.querySelector(".pn-legends-v2");if(!root)return;const data=read(),overlay=root.querySelector("[data-hol-overlay]");if(!overlay)return;ui.lastFocus=document.activeElement;
    const hidden=a.secret&&!a.unlocked,name=hidden?"SECRET ACHIEVEMENT":a.name,desc=hidden?"Earn this hidden achievement to reveal its requirement.":a.description,current=hidden?"???":unit(a.current,a.unit),goal=hidden?"???":unit(a.goal,a.unit),pct=hidden?0:progress(a),proven=data.evidence.filter(e=>e.verified).length;
    const evidence=founder?'<p>Your '+data.achievements.filter(v=>v.unlocked).length+' earned trophies are calculated from the current ledger. '+proven+' verified completed sales contribute to tracked financial progress. Missing evidence never creates imaginary profit.</p>':'<p>'+safe(desc)+'</p>'+(a.unlocked?'<div class="hl-proof"><b>UNLOCKED '+safe(a.unlockedAt||"FROM HISTORICAL RECORDS")+'</b><span>'+safe(a.unlockEvidence||"Verified ledger evidence")+'</span></div>':'');
    overlay.innerHTML='<div class="hl-dialog" role="dialog" aria-modal="true" aria-labelledby="hl-dialog-title"><button type="button" class="hl-close" data-hol-close aria-label="Close achievement details">×</button><div class="hl-dialog-medal">'+(a.unlocked?'◆':'◇')+'</div><div class="hl-dialog-rarity">'+safe(a.rarity)+' ACHIEVEMENT · '+a.xp+' XP'+(a.prestige?' · '+a.prestige+' PRESTIGE':'')+'</div><h3 id="hl-dialog-title">'+safe(name)+'</h3>'+evidence+'<div class="hl-dialog-metrics"><span>'+safe(current)+'</span><span>'+safe(goal)+'</span></div><div class="hl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct.toFixed(0)+'"><i style="width:'+pct.toFixed(2)+'%"></i></div><div class="hl-dialog-state">'+(a.unlocked?'✦ UNLOCKED · Verified shop history recognized':'◇ LOCKED · '+safe(remaining(a)))+'</div><button type="button" class="hl-dialog-back" data-hol-close>RETURN TO THE HALL</button></div>';
    overlay.hidden=false;overlay.querySelector(".hl-close").focus();
  }
  function detailChain(key){
    const data=read(),stages=data.achievements.filter(a=>a.chainKey===key),overlay=document.querySelector(".pn-legends-v2 [data-hol-overlay]");if(!stages.length||!overlay)return;ui.lastFocus=document.activeElement;
    overlay.innerHTML='<div class="hl-dialog hl-chain-dialog" role="dialog" aria-modal="true" aria-labelledby="hl-dialog-title"><button type="button" class="hl-close" data-hol-close aria-label="Close achievement details">×</button><div class="hl-dialog-rarity">PROGRESSION CHAIN · '+stages.filter(a=>a.unlocked).length+' / 5 UNLOCKED</div><h3 id="hl-dialog-title">'+safe(stages[0].chainName)+'</h3><div class="hl-stage-list">'+stages.map(a=>'<button type="button" data-hol-detail="'+escAttr(a.id)+'" class="'+a.rarity.toLowerCase()+(a.unlocked?' earned':'')+'"><span>'+(a.unlocked?'◆':'◇')+'</span><b>'+safe(a.name)+'</b><small>'+safe(a.unlocked?(a.unlockedAt||"UNLOCKED"):remaining(a))+'</small></button>').join("")+'</div><button type="button" class="hl-dialog-back" data-hol-close>RETURN TO THE HALL</button></div>';overlay.hidden=false;overlay.querySelector(".hl-close").focus();
  }
  function close(){const overlay=document.querySelector(".pn-legends-v2 [data-hol-overlay]");if(!overlay||overlay.hidden)return;overlay.hidden=true;overlay.innerHTML="";if(ui.lastFocus&&ui.lastFocus.isConnected)ui.lastFocus.focus();ui.lastFocus=null}
  function founder(){const data=read(),rank=data.rank,earned=data.achievements.filter(a=>a.unlocked).length;detail({rarity:"GOLD",xp:data.xp,prestige:data.prestige,name:"Founder's Reckoning",description:"Your existing shop history has earned "+earned+" trophies, "+data.xp+" XP and "+data.prestige+" prestige, placing you at Level "+rank.level+": "+rank.title+".",current:data.xp,goal:rank.earned+(rank.needed-rank.into),unit:"count",unlocked:true},true)}
  route.render=renderHall;
  if(typeof document!=="undefined"&&document.addEventListener){
    document.addEventListener("click",event=>{const target=event.target&&event.target.closest?event.target:null;if(!target)return;const overlay=target.closest("[data-hol-overlay]");if(target.closest("[data-hol-close]")){event.preventDefault();close();return}if(overlay&&target===overlay){close();return}const root=target.closest(".pn-legends-v2");if(!root)return;const cat=target.closest("[data-hol-category]");if(cat&&categories.includes(cat.dataset.holCategory)){ui.category=cat.dataset.holCategory;render();return}const status=target.closest("[data-hol-status]");if(status&&["all","unlocked","locked"].includes(status.dataset.holStatus)){ui.status=status.dataset.holStatus;render();return}const sort=target.closest("[data-hol-sort]");if(sort&&["closest","tier","unlocked"].includes(sort.dataset.holSort)){ui.sort=sort.dataset.holSort;render();return}const view=target.closest("[data-hol-view]");if(view&&["campaign","collection"].includes(view.dataset.holView)){ui.view=view.dataset.holView;render();return}if(target.closest("[data-hol-founder]")){founder();return}const chain=target.closest("[data-hol-chain]");if(chain){detailChain(chain.dataset.holChain);return}const card=target.closest("[data-hol-detail]");if(card){const achievement=read().achievements.find(a=>a.id===card.dataset.holDetail);if(achievement)detail(achievement,false)}});
    document.addEventListener("keydown",event=>{const dialog=document.querySelector(".pn-legends-v2 .hl-overlay:not([hidden]) .hl-dialog");if(!dialog)return;if(event.key==="Escape"){event.preventDefault();close();return}if(event.key==="Tab"){const items=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
  }
  globalThis.PN_HALL.visualV2={render:renderHall,ui};
})();
