"use strict";

/* PROFITNODE — PROFIT BLUEPRINTS RARE V3
   Adds the RARE AM4 honor-rank roster to THE MUSTER.
   Keeps canonical V1.1 UNCOMMON blueprints and deploy behavior intact.
   Does not touch SHOP FUND, accounting, or the locked Build Workspace renderer. */
(function(){
  if (window.__pnProfitBlueprintsRareV3Installed) return;
  window.__pnProfitBlueprintsRareV3Installed = true;

  const api = window.__pnProfitBlueprintsV1;
  if (!api || !Array.isArray(api.blueprints)) {
    console.warn("[PROFITNODE] RARE V3 skipped: PROFIT BLUEPRINTS V1.1 not found.");
    return;
  }

  const UNCOMMON_CAP = Number(api.hardCapRsd) || 23500;
  const RARE_CAP = 40000;
  const esc = v => typeof escHtml === "function" ? escHtml(v) : String(v ?? "");
  const rsd = n => (Number(n)||0).toLocaleString("de-DE") + " RSD";

  const RARE_BLUEPRINTS = [
    {
      id:"stone-guard",
      name:"STONE GUARD",
      subtitle:"HORDE RANK VI",
      tier:"RARE",
      platform:"AM4",
      role:"Entry RARE honor-rank deployment",
      targetMin:35000,
      targetMax:39000,
      targetTotal:37000,
      accent:"steel",
      code:"PN-BP-R06",
      warning:"",
      doctrine:"First honor guard. RTX 2060 Super 8GB and Ryzen 5 3600 form a clean, recognizable gaming flip with enough margin to justify the promotion.",
      parts:[
        {slot:"CPU",label:"AMD Ryzen 5 3600",cost:6500,note:"Six-core RARE baseline. Buy the CPU, not the seller's nostalgia."},
        {slot:"MOBO",label:"AM4 B450 motherboard",cost:4000,note:"Functional B450. No premium-board vanity tax."},
        {slot:"RAM",label:"16GB DDR4",cost:3500,note:"Prefer 2x8GB DDR4-3000/3200.",ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU",label:"NVIDIA GeForce RTX 2060 Super 8GB",cost:16500,note:"8GB model. Canonical entry RARE GPU."},
        {slot:"STORAGE",label:"256GB SSD",cost:2500,note:"256GB baseline; upgrade to 512GB only when economics permit."},
        {slot:"PSU",label:"Quality 500–600W PSU",cost:2200,note:"Tested reputable family with healthy 12V delivery."},
        {slot:"CASE",label:"Clean gaming ATX / mATX case",cost:1800,note:"Presentable shell; spend stays on the core hardware.",genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER",label:"AMD stock AM4 cooler",cost:0,note:"Wraith Stealth/Spire or equivalent."}
      ]
    },
    {
      id:"blood-guard",
      name:"BLOOD GUARD",
      subtitle:"HORDE RANK VII",
      tier:"RARE",
      platform:"AM4",
      role:"Heavy RARE Nvidia deployment",
      targetMin:37500,
      targetMax:40000,
      targetTotal:38500,
      accent:"blood",
      code:"PN-BP-R07",
      warning:"DISCIPLINE REQUIRED",
      doctrine:"The preferred heavy RARE deployment. RTX 2070 8GB carries familiar branding and resale confidence, but the GPU price must obey the build rather than consume it.",
      parts:[
        {slot:"CPU",label:"AMD Ryzen 5 3600 / 5500",cost:7000,note:"Use whichever lands cheaper in a tested platform deal."},
        {slot:"MOBO",label:"AM4 B450 motherboard",cost:3500,note:"Budget B450. Keep the board from stealing GPU money."},
        {slot:"RAM",label:"16GB DDR4",cost:3500,note:"Prefer 2x8GB DDR4-3000/3200.",ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU",label:"NVIDIA GeForce RTX 2070 8GB",cost:17500,note:"Target around 17–18k RSD. Around 20k+ means walk unless savings elsewhere are exceptional."},
        {slot:"STORAGE",label:"256GB SSD",cost:2500,note:"256GB baseline; 512GB if sourced without breaking margin."},
        {slot:"PSU",label:"Quality 550–650W PSU",cost:2500,note:"Tested unit with adequate PCIe power and 12V capacity."},
        {slot:"CASE",label:"Clean gaming ATX / mATX case",cost:2000,note:"Clean, desirable, not extravagant.",genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER",label:"AMD stock AM4 cooler",cost:0,note:"Wraith Stealth/Spire or equivalent."}
      ]
    },
    {
      id:"legionnaire",
      name:"LEGIONNAIRE",
      subtitle:"HORDE RANK VIII",
      tier:"RARE",
      platform:"AM4",
      role:"Modern RARE hunter",
      targetMin:38000,
      targetMax:40000,
      targetTotal:39000,
      accent:"legion",
      code:"PN-BP-R08",
      warning:"HUNT SOURCING REQUIRED",
      doctrine:"The modern hunter. RX 6600 8GB brings efficiency and stronger 2026 buyer appeal. Ryzen 5 5600 is allowed only when it falls into the same CPU budget through a bargain or bundle.",
      parts:[
        {slot:"CPU",label:"AMD Ryzen 5 5500 / bargain 5600",cost:7500,note:"5500 baseline. 5600 only if effectively the same money through a bargain or bundle."},
        {slot:"MOBO",label:"AM4 B450 / bargain B550",cost:3500,note:"B450 baseline; B550 only when it costs no meaningful premium."},
        {slot:"RAM",label:"16GB DDR4",cost:3500,note:"Prefer 2x8GB DDR4-3200.",ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU",label:"AMD Radeon RX 6600 8GB",cost:18000,note:"8GB mandatory. This allocation already assumes negotiation or a good listing."},
        {slot:"STORAGE",label:"256GB SSD",cost:2500,note:"256GB baseline; 512GB only if the hunt produces room."},
        {slot:"PSU",label:"Quality 500–600W PSU",cost:2200,note:"Tested reputable unit; efficiency is an advantage here."},
        {slot:"CASE",label:"Clean gaming ATX / mATX case",cost:1800,note:"Clean budget presentation; do not sacrifice core hardware.",genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER",label:"AMD stock AM4 cooler",cost:0,note:"Wraith Stealth/Spire or equivalent."}
      ]
    }
  ];

  const uncommonMeta = {
    grunt:{subtitle:"LINE INFANTRY",accent:"green",code:"PN-BP-001",warning:"",note:"Entry conscript. Cheap, clear, reliable, and safely away from Polaris mining-era traps."},
    raider:{subtitle:"HEAVY CONSCRIPT",accent:"blue",code:"PN-BP-002",warning:"",note:"Balanced striker. 8GB VRAM, respected brand value, strong resale confidence."},
    berserker:{subtitle:"ASSAULT CONSCRIPT",accent:"violet",code:"PN-BP-003",warning:"BARGAIN SOURCING REQUIRED",note:"Shock troop. Strict 8GB+ VRAM doctrine, strongest GPU allowed before the budget line breaks."}
  };

  function uniqueProjectName(base){
    const names = new Set(Store.all("projects").map(p=>String(p.name||"").toUpperCase()));
    if (!names.has(base.toUpperCase())) return base;
    let i=2;
    while(names.has((base+" "+i).toUpperCase())) i++;
    return base+" "+i;
  }

  function deployRare(bp){
    const project = Actions.addProject({
      name:uniqueProjectName(bp.name),
      startDate:todayISO(),
      completionDate:null,
      status:"PLANNING",
      purpose:"FLIP",
      currency:"RSD",
      componentIds:[],
      additionalCosts:0,
      estimatedMarketValue:0,
      listingPrice:null,
      salePrice:null,
      notes:"Deployed from PROFIT BLUEPRINT "+bp.name+" · RARE · AM4 · hard cap "+RARE_CAP+" RSD. "+bp.doctrine
    });

    bp.parts.forEach(part=>{
      const payload={label:part.label,cost:part.cost,currency:"RSD",notes:part.note||""};
      if(part.ram) payload.ram=Object.assign({},part.ram);
      if(part.genericCaseSizeId) payload.genericCaseSizeId=part.genericCaseSizeId;
      Actions.setProjectSlot(project.id,part.slot,"PLANNED",payload);
    });

    Timeline.log(
      "PROJECT_BLUEPRINT",
      bp.name+" blueprint deployed",
      "RARE AM4 build · planned target "+rsd(bp.targetTotal)+" · hard cap "+rsd(RARE_CAP),
      todayISO(),
      "project",
      project.id
    );

    state.profitBlueprintView="ACTIVE";
    state.pbId=project.id;
    state.route="projectbuild";
    render();
  }

  function tabs(){
    return '<div class="pn-rv3-tabs">'+
      '<button type="button" data-pn-bp-view="ACTIVE">ACTIVE BUILDS</button>'+
      '<button type="button" data-pn-bp-view="BLUEPRINTS" class="active">PROFIT BLUEPRINTS</button>'+
    '</div>';
  }

  function tierTabs(active){
    return '<div class="pn-rv3-tier-tabs">'+
      '<button type="button" data-pn-bp-tier="UNCOMMON" class="'+(active==="UNCOMMON"?"active uncommon":"")+'"><span>UNCOMMON</span><b>CONSCRIPTS</b></button>'+
      '<button type="button" data-pn-bp-tier="RARE" class="'+(active==="RARE"?"active rare":"")+'"><span>RARE</span><b>HONOR GUARD</b></button>'+
    '</div>';
  }

  function getPart(bp,slot){return (bp.parts||[]).find(p=>p.slot===slot)||null;}
  function row(part,label){
    if(!part) return "";
    return '<div class="pn-rv3-row"><span>'+esc(label||part.slot)+'</span><b>'+esc(part.label)+'</b><strong>'+rsd(part.cost)+'</strong></div>';
  }

  function budget(bp,cap){
    const reserve=Math.max(0,cap-Number(bp.targetTotal||0));
    const pct=Math.max(0,Math.min(100,Math.round((Number(bp.targetTotal||0)/cap)*100)));
    const sat=reserve===0;
    return '<div class="pn-rv3-budget">'+
      '<div><span>TARGET</span><b>'+rsd(bp.targetTotal)+'</b></div>'+
      '<div><span>RANGE</span><b>'+rsd(bp.targetMin)+'–'+rsd(bp.targetMax)+'</b></div>'+
      '<div class="reserve '+(sat?'sat':'')+'"><span>'+(sat?'STATUS':'RESERVE')+'</span><b>'+(sat?'BUDGET SATURATED':rsd(reserve))+'</b></div>'+
      '<div class="pn-rv3-meter"><i style="width:'+pct+'%"></i></div>'+
    '</div>';
  }

  function uncommonCard(bp){
    const m=uncommonMeta[bp.id]||{subtitle:"INFANTRY",accent:"blue",code:"PN-BP",warning:"",note:bp.doctrine||""};
    return buildCard(bp,m,UNCOMMON_CAP,"UNCOMMON","data-pn-bp-deploy");
  }

  function rareCard(bp){
    const m={subtitle:bp.subtitle,accent:bp.accent,code:bp.code,warning:bp.warning,note:bp.doctrine};
    return buildCard(bp,m,RARE_CAP,"RARE","data-pn-rare-deploy");
  }

  function buildCard(bp,m,cap,tier,deployAttr){
    const cpu=getPart(bp,"CPU"),gpu=getPart(bp,"GPU"),ram=getPart(bp,"RAM");
    const support=["MOBO","STORAGE","PSU","CASE","COOLER"].map(s=>row(getPart(bp,s),s)).join("");
    const warning=m.warning?'<span class="pn-rv3-warning">'+esc(m.warning)+'</span>':"";
    return '<article class="pn-rv3-card is-'+esc(m.accent)+' tier-'+tier.toLowerCase()+'">'+
      '<header class="pn-rv3-card-head"><div><span class="pn-rv3-class">'+esc(m.subtitle)+'</span><h2>'+esc(bp.name)+'</h2><p>'+esc(bp.role)+'</p></div><div class="pn-rv3-tags"><span>'+tier+'</span></div></header>'+
      budget(bp,cap)+
      '<section class="pn-rv3-section"><h3>◎ COMBAT CORE</h3>'+row(cpu,"CPU")+row(gpu,"GPU")+row(ram,"RAM")+'</section>'+
      '<section class="pn-rv3-section"><h3>⚒ SUPPORT LOADOUT</h3>'+support+'</section>'+
      '<div class="pn-rv3-note">'+warning+'<p>'+esc(m.note)+'</p></div>'+
      '<button type="button" class="btn btn-primary pn-rv3-deploy" '+deployAttr+'="'+esc(bp.id)+'">MUSTER BUILD <span>→</span></button>'+
      '<footer><span>'+esc(bp.name)+' // '+tier+' // AM4</span><span>'+esc(m.code)+'</span></footer>'+
    '</article>';
  }

  function uncommonView(){
    return {
      subtitle:"AM4 profit infantry · UNCOMMON doctrine",
      heroKicker:"PROFIT BLUEPRINTS // UNCOMMON CONSCRIPTS",
      heroTitle:"THE MUSTER",
      heroTag:"THREE PATHS. ONE BUDGET. MORE VICTORIES.",
      laws:[
        ["HARD LIMIT","≤ "+rsd(UNCOMMON_CAP),"danger"],
        ["PLATFORM","AM4 ONLY",""],
        ["CPU CORE","R5 2600 / 2600X",""],
        ["MEMORY","16GB DDR4",""],
        ["VRAM LAW","GRUNT 6GB · RAIDER+ 8GB+","good"]
      ],
      cards:api.blueprints.map(uncommonCard).join(""),
      procurement:'<b>PROCUREMENT LAW:</b> 23.500 RSD is the kill-switch, not a target. GRUNT alone may run 6GB VRAM. RAIDER and BERSERKER require 8GB+. Polaris mining-era cards remain excluded.'
    };
  }

  function rareView(){
    return {
      subtitle:"AM4 honor ranks · RARE doctrine",
      heroKicker:"PROFIT BLUEPRINTS // RARE HONOR RANKS",
      heroTitle:"THE HONOR GUARD",
      heroTag:"PROVEN SOLDIERS. BETTER ARMS. HARDER MARGINS.",
      laws:[
        ["HARD LIMIT","≤ "+rsd(RARE_CAP),"danger"],
        ["PLATFORM","AM4 ONLY",""],
        ["CPU CORE","R5 3600 / 5500 / 5600 HUNT",""],
        ["MEMORY","16GB DDR4",""],
        ["VRAM LAW","8GB MINIMUM · NO EXCEPTIONS","good"]
      ],
      cards:RARE_BLUEPRINTS.map(rareCard).join(""),
      procurement:'<b>PROCUREMENT LAW:</b> 40.000 RSD is the kill-switch. Preferred deployment zone is 35.000–39.500 RSD. RARE has no VRAM exemption: 8GB minimum. Polaris mining-era cards remain excluded. Ryzen 5 5600 deploys only at bargain or bundle money.'
    };
  }

  function renderBlueprints(){
    const tier=state.profitBlueprintTier==="RARE"?"RARE":"UNCOMMON";
    const v=tier==="RARE"?rareView():uncommonView();
    return pageHeader("BUILDS",v.subtitle,"")+
      '<div class="content pn-rv3-page '+(tier==="RARE"?'is-rare':'is-uncommon')+'">'+
      tabs()+tierTabs(tier)+
      '<section class="pn-rv3-hero"><div><span>'+v.heroKicker+'</span><h1>'+v.heroTitle+'</h1><small>'+v.heroTag+'</small></div><p><b>Planning doctrine only.</b><br>Blueprints do not touch SHOP FUND until real parts are acquired.</p></section>'+
      '<section class="pn-rv3-laws">'+v.laws.map(x=>'<div class="'+x[2]+'"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join("")+'</section>'+
      '<section class="pn-rv3-grid">'+v.cards+'</section>'+
      '<div class="pn-rv3-procurement">'+v.procurement+'</div>'+
      '</div>';
  }

  state.profitBlueprintTier = state.profitBlueprintTier==="RARE" ? "RARE" : "UNCOMMON";

  if(typeof ROUTES!=="undefined"){
    const route=ROUTES.find(r=>r.key==="projects");
    if(route && !route.__pnRareV3Wrapped){
      const previous=route.render;
      route.__pnRareV3Wrapped=true;
      route.render=function(){
        if(state.profitBlueprintView==="BLUEPRINTS") return renderBlueprints();
        return previous.apply(this,arguments);
      };
    }
  }

  document.addEventListener("click",function(event){
    const tierButton=event.target.closest("[data-pn-bp-tier]");
    if(tierButton){
      state.profitBlueprintTier=tierButton.dataset.pnBpTier==="RARE"?"RARE":"UNCOMMON";
      render();
      return;
    }
    const rareDeploy=event.target.closest("[data-pn-rare-deploy]");
    if(rareDeploy){
      const bp=RARE_BLUEPRINTS.find(x=>x.id===rareDeploy.dataset.pnRareDeploy);
      if(bp) deployRare(bp);
    }
  });

  const style=document.createElement("style");
  style.id="pn-profit-blueprints-rare-v3-style";
  style.textContent=`
  .pn-rv3-page{--rv-green:#42df78;--rv-blue:#53b9ff;--rv-violet:#bd5cff;--rv-red:#ff6075;--rv-rare:#4ba6ff}
  .pn-rv3-tabs{display:flex;border-bottom:1px solid rgba(100,170,210,.2);margin-bottom:9px}.pn-rv3-tabs button{min-width:180px;padding:12px 18px;border:1px solid rgba(100,170,210,.28);border-bottom:0;background:rgba(5,8,12,.78);color:#8194a1;font:900 11px var(--mono);letter-spacing:.1em;cursor:pointer}.pn-rv3-tabs button+button{border-left:0}.pn-rv3-tabs .active{color:#bde5ff;background:rgba(41,110,151,.13);box-shadow:inset 0 -2px 0 #5ec5ff}
  .pn-rv3-tier-tabs{display:flex;gap:8px;margin:0 0 12px}.pn-rv3-tier-tabs button{display:flex;align-items:baseline;gap:9px;padding:8px 13px;border:1px solid rgba(104,143,164,.22);background:rgba(5,8,11,.72);color:#64727b;cursor:pointer}.pn-rv3-tier-tabs span{font:900 9px var(--mono);letter-spacing:.11em}.pn-rv3-tier-tabs b{font:800 8px var(--mono);letter-spacing:.08em}.pn-rv3-tier-tabs .active.uncommon{border-color:rgba(66,223,120,.46);color:#78e99d;box-shadow:inset 0 -2px 0 var(--rv-green)}.pn-rv3-tier-tabs .active.rare{border-color:rgba(75,166,255,.58);color:#8dcbff;box-shadow:inset 0 -2px 0 var(--rv-rare)}
  .pn-rv3-hero{display:grid;grid-template-columns:1.35fr .65fr;gap:30px;align-items:center;padding:19px 22px;margin-bottom:12px;border-left:2px solid #55b6e8;border-top:1px solid rgba(103,166,204,.18);border-bottom:1px solid rgba(103,166,204,.18);background:linear-gradient(90deg,rgba(18,52,73,.35),rgba(22,13,25,.23)),radial-gradient(circle at 72% 45%,rgba(182,36,62,.14),transparent 32%)}.pn-rv3-page.is-rare .pn-rv3-hero{border-left-color:var(--rv-rare);background:linear-gradient(90deg,rgba(18,54,88,.42),rgba(15,18,31,.27)),radial-gradient(circle at 72% 45%,rgba(52,107,193,.2),transparent 35%)}.pn-rv3-hero span{color:#6db8dc;font:900 9px var(--mono);letter-spacing:.14em}.pn-rv3-page.is-rare .pn-rv3-hero span{color:#77bdff}.pn-rv3-hero h1{margin:5px 0 3px;font-size:33px;line-height:1;letter-spacing:.05em}.pn-rv3-hero small{color:#8998a0;font:800 9px var(--mono);letter-spacing:.15em}.pn-rv3-hero p{margin:0;padding-left:16px;border-left:2px solid rgba(238,62,83,.65);color:#a7abb0;font-size:12px;line-height:1.5}.pn-rv3-page.is-rare .pn-rv3-hero p{border-left-color:rgba(75,166,255,.72)}.pn-rv3-hero p b{color:#e6eaed}
  .pn-rv3-laws{display:grid;grid-template-columns:repeat(5,1fr);margin-bottom:14px;border:1px solid rgba(96,151,184,.25);background:rgba(5,8,11,.86)}.pn-rv3-laws>div{min-height:68px;padding:11px 14px;display:flex;flex-direction:column;justify-content:center;gap:6px;border-right:1px solid rgba(96,151,184,.16)}.pn-rv3-laws>div:last-child{border-right:0}.pn-rv3-laws span{color:#6f7f89;font:900 8px var(--mono);letter-spacing:.11em}.pn-rv3-laws b{color:#ccecff;font:900 14px var(--mono);line-height:1.15}.pn-rv3-laws .danger b{color:var(--rv-red)}.pn-rv3-laws .good b{color:var(--rv-green)}.pn-rv3-page.is-rare .pn-rv3-laws .good b{color:#75c1ff}
  .pn-rv3-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pn-rv3-card{--accent:var(--rv-blue);position:relative;display:flex;flex-direction:column;min-width:0;border:1px solid color-mix(in srgb,var(--accent) 58%,#22313a);background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 4%,#070b0e) 0%,#080b0e 30%,#080a0d 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.018)}.pn-rv3-card.is-green{--accent:var(--rv-green)}.pn-rv3-card.is-blue{--accent:var(--rv-blue)}.pn-rv3-card.is-violet{--accent:var(--rv-violet)}.pn-rv3-card.is-steel{--accent:#78aecd}.pn-rv3-card.is-blood{--accent:#698fd4}.pn-rv3-card.is-legion{--accent:#4ba6ff}.pn-rv3-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 82% 8%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 26%)}
  .pn-rv3-card-head{position:relative;min-height:106px;padding:17px 18px 14px;border-bottom:1px solid rgba(130,170,195,.15);display:flex;justify-content:space-between;gap:12px}.pn-rv3-class{color:var(--accent);font:900 8px var(--mono);letter-spacing:.15em}.pn-rv3-card h2{margin:6px 0 5px;color:#e3f4ff;font-size:31px;line-height:1;letter-spacing:.045em}.pn-rv3-card-head p{margin:0;color:#8b9aa3;font-size:11px}.pn-rv3-tags span{display:inline-block;padding:4px 7px;font:900 8px var(--mono);letter-spacing:.07em}.tier-uncommon .pn-rv3-tags span{border:1px solid #19a934;color:#34ef59;background:rgba(26,155,54,.08)}.tier-rare .pn-rv3-tags span{border:1px solid rgba(75,166,255,.72);color:#8dcbff;background:rgba(75,166,255,.08);box-shadow:0 0 10px rgba(75,166,255,.08)}
  .pn-rv3-budget{display:grid;grid-template-columns:1fr 1.15fr 1.1fr;position:relative;margin:10px 10px 0;border:1px solid color-mix(in srgb,var(--accent) 25%,#25343d);background:rgba(7,13,17,.68)}.pn-rv3-budget>div:not(.pn-rv3-meter){padding:10px 11px;border-right:1px solid rgba(120,155,175,.12)}.pn-rv3-budget>div:nth-child(3){border-right:0}.pn-rv3-budget span{display:block;color:#6f7b82;font:900 7px var(--mono);letter-spacing:.1em}.pn-rv3-budget b{display:block;margin-top:5px;color:#e0e8ec;font:900 12px var(--mono);line-height:1.18}.pn-rv3-budget .reserve b{color:var(--rv-green)}.tier-rare .pn-rv3-budget .reserve b{color:#79c4ff}.pn-rv3-budget .sat b{color:#ffb85c;font-size:10px}.pn-rv3-meter{grid-column:1/-1;height:3px;background:#10171b}.pn-rv3-meter i{display:block;height:100%;background:var(--accent);box-shadow:0 0 8px color-mix(in srgb,var(--accent) 60%,transparent)}
  .pn-rv3-section{padding:12px 14px 0}.pn-rv3-section h3{margin:0 0 4px;padding-bottom:8px;border-bottom:1px solid color-mix(in srgb,var(--accent) 38%,transparent);color:var(--accent);font:900 10px var(--mono);letter-spacing:.14em}.pn-rv3-row{min-height:36px;display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.045)}.pn-rv3-row span{color:#6d99b2;font:900 7.5px var(--mono);letter-spacing:.08em}.pn-rv3-row b{color:#c9ced1;font-size:10.5px;line-height:1.2;overflow-wrap:anywhere}.pn-rv3-row strong{color:#9eb8c7;font:900 8.5px var(--mono);white-space:nowrap}
  .pn-rv3-note{margin:12px 14px 10px;padding:10px 12px;border-left:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 6%,#0b1014)}.pn-rv3-note p{margin:0;color:#8f9ba2;font-size:10.5px;line-height:1.45}.pn-rv3-warning{display:inline-block;margin-bottom:7px;padding:3px 6px;border:1px solid rgba(255,184,92,.4);color:#ffbf69;background:rgba(255,184,92,.06);font:900 7px var(--mono);letter-spacing:.09em}
  .pn-rv3-deploy{margin:0 14px 10px;min-height:38px;font-size:10px!important;letter-spacing:.08em}.pn-rv3-deploy span{font-size:15px;margin-left:7px}.pn-rv3-card footer{display:flex;justify-content:space-between;gap:10px;margin-top:auto;padding:0 14px 12px;color:#526875;font:800 6.5px var(--mono);letter-spacing:.08em}.pn-rv3-procurement{margin-top:14px;padding:12px 14px;border-top:1px dashed rgba(143,91,156,.45);color:#a79eab;font:10.5px/1.45 var(--mono)}.pn-rv3-page.is-rare .pn-rv3-procurement{border-top-color:rgba(75,166,255,.45)}.pn-rv3-procurement b{color:#ece8ee}
  @media(max-width:1180px){.pn-rv3-grid{grid-template-columns:1fr 1fr}.pn-rv3-laws{grid-template-columns:repeat(3,1fr)}.pn-rv3-laws>div:nth-child(3){border-right:0}.pn-rv3-laws>div:nth-child(n+4){border-top:1px solid rgba(96,151,184,.16)}}
  @media(max-width:820px){.pn-rv3-hero{grid-template-columns:1fr}.pn-rv3-grid{grid-template-columns:1fr}.pn-rv3-laws{grid-template-columns:1fr 1fr}.pn-rv3-laws>div:nth-child(odd){border-right:1px solid rgba(96,151,184,.16)}.pn-rv3-laws>div:nth-child(even){border-right:0}.pn-rv3-card h2{font-size:29px}}
  @media(max-width:520px){.pn-rv3-tabs button{min-width:0;flex:1}.pn-rv3-tier-tabs{display:grid;grid-template-columns:1fr}.pn-rv3-laws{grid-template-columns:1fr}.pn-rv3-laws>div{border-right:0!important;border-top:1px solid rgba(96,151,184,.16)}.pn-rv3-budget{grid-template-columns:1fr}.pn-rv3-budget>div:not(.pn-rv3-meter){border-right:0;border-bottom:1px solid rgba(120,155,175,.12)}.pn-rv3-row{grid-template-columns:54px minmax(0,1fr)}.pn-rv3-row strong{grid-column:2;padding-bottom:5px}}
  `;
  document.head.appendChild(style);

  window.__pnProfitBlueprintsRareV3={rareBlueprints:RARE_BLUEPRINTS,rareHardCapRsd:RARE_CAP,render:renderBlueprints,deploy:deployRare};
  console.info("[PROFITNODE] PROFIT BLUEPRINTS RARE V3 ACTIVE — STONE GUARD / BLOOD GUARD / LEGIONNAIRE");
})();
