"use strict";

/*
  PROFITNODE — PROFIT BLUEPRINTS V1.1

  Adds a PROFIT BLUEPRINTS mode to BUILDS / projects.
  Does NOT modify the locked Build Workspace renderer.

  V1 doctrine:
    - AM4 only
    - UNCOMMON = <= 23,500 RSD / ~200 EUR total planned spend
    - 16GB DDR4 minimum
    - SSD required
    - tested/reputable PSU
    - no RX 470 / 480 / 570 / 580 / 590 Polaris mining-risk cards
    - GPU VRAM floor is 8GB for every blueprint except GRUNT
    - GRUNT alone may use 6GB VRAM
    - Ryzen 5 2600 / 2600X are the default UNCOMMON value CPUs
    - Ryzen 5 3600 is opportunistic, not required

  Canonical first three:
    GRUNT      — R5 2600 + GTX 1060 6GB
    RAIDER     — R5 2600/2600X + GTX 1070 8GB
    BERSERKER  — R5 2600 + GTX 1070 Ti 8GB
*/
(function installProfitBlueprintsV1(){
  if (window.__pnProfitBlueprintsV1Installed) return;
  window.__pnProfitBlueprintsV1Installed = true;

  const HARD_CAP_RSD = 23500;
  const MIN_VRAM_GB = 8;
  const VRAM_EXCEPTION_BLUEPRINT = "grunt";
  const FORBIDDEN_GPU_FAMILY = ["RX 470","RX 480","RX 570","RX 580","RX 590"];

  const BLUEPRINTS = [
    {
      id:"grunt",
      name:"GRUNT",
      subtitle:"LINE INFANTRY",
      tier:"UNCOMMON",
      platform:"AM4",
      role:"Cheapest dependable 1080p flip",
      doctrine:"The basic conscript. Cheap, understandable and easy to source without touching Polaris.",
      targetMin:20000,
      targetMax:22500,
      targetTotal:21500,
      parts:[
        {slot:"CPU", label:"AMD Ryzen 5 2600", cost:3500, note:"R5 2600 baseline. 2600X only if near-identical money."},
        {slot:"MOBO", label:"AM4 B350 / B450 motherboard", cost:3500, note:"Working B350/B450. Do not overspend on board prestige."},
        {slot:"RAM", label:"16GB DDR4", cost:3000, note:"Prefer 2x8GB. DDR4-3000/3200 ideal.", ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU", label:"NVIDIA GeForce GTX 1060 6GB", cost:5000, note:"6GB model only. Never substitute GTX 1060 3GB."},
        {slot:"STORAGE", label:"256GB SSD", cost:2500, note:"240–256GB SSD minimum. SATA or NVMe."},
        {slot:"PSU", label:"Quality 450–550W PSU", cost:2000, note:"Tested unit from a reputable family."},
        {slot:"CASE", label:"Clean ATX / mATX case", cost:2000, note:"Presentation matters; luxury does not.", genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER", label:"AMD stock AM4 cooler", cost:0, note:"Wraith Stealth/Spire or equivalent stock cooler."}
      ]
    },
    {
      id:"raider",
      name:"RAIDER",
      subtitle:"HEAVY CONSCRIPT",
      tier:"UNCOMMON",
      platform:"AM4",
      role:"Preferred upper-UNCOMMON Nvidia flip",
      doctrine:"The strongest general-purpose conscript. 8GB VRAM, familiar branding, hard budget discipline.",
      targetMin:22000,
      targetMax:23500,
      targetTotal:23000,
      parts:[
        {slot:"CPU", label:"AMD Ryzen 5 2600", cost:4000, note:"Ryzen 5 2600 baseline. 2600X accepted only at negligible premium."},
        {slot:"MOBO", label:"AM4 B350 / B450 motherboard", cost:3500, note:"Budget B350/B450. Walk away if the board eats GPU money."},
        {slot:"RAM", label:"16GB DDR4", cost:3000, note:"Prefer 2x8GB. DDR4-3000/3200 ideal.", ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU", label:"NVIDIA GeForce GTX 1070 8GB", cost:6500, note:"Target 6,000–7,000 RSD. Above that requires savings elsewhere."},
        {slot:"STORAGE", label:"256GB SSD", cost:2000, note:"240–256GB SSD minimum."},
        {slot:"PSU", label:"Quality 500–600W PSU", cost:2200, note:"Tested, reputable, adequate 12V delivery."},
        {slot:"CASE", label:"Clean ATX / mATX case", cost:1800, note:"Cheap, clean and presentable.", genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER", label:"AMD stock AM4 cooler", cost:0, note:"Wraith Stealth/Spire or equivalent."}
      ]
    },
    {
      id:"berserker",
      name:"BERSERKER",
      subtitle:"ASSAULT CONSCRIPT",
      tier:"UNCOMMON",
      platform:"AM4",
      role:"Hardest-hitting UNCOMMON conscript",
      doctrine:"8GB VRAM minimum. GTX 1070 Ti is the canonical target; GTX 1080 8GB is an approved substitute only when the total build still stays under the hard cap.",
      targetMin:22500,
      targetMax:23500,
      targetTotal:23500,
      parts:[
        {slot:"CPU", label:"AMD Ryzen 5 2600", cost:3000, note:"This blueprint needs a cheap CPU or CPU/board bundle."},
        {slot:"MOBO", label:"AM4 B350 / budget B450 motherboard", cost:3000, note:"Functional B350/B450. No premium-board vanity tax."},
        {slot:"RAM", label:"16GB DDR4", cost:3000, note:"Prefer 2x8GB. DDR4-3000/3200 ideal.", ram:{technology:"DDR4",moduleCount:2,perModuleCapacity:8,totalCapacity:16,speed:3200,casLatency:16}},
        {slot:"GPU", label:"NVIDIA GeForce GTX 1070 Ti 8GB", cost:9000, note:"8GB VRAM mandatory. Target about 9,000 RSD. GTX 1080 8GB may substitute only if the complete build remains <=23,500 RSD."},
        {slot:"STORAGE", label:"256GB SSD", cost:2000, note:"240–256GB SSD minimum."},
        {slot:"PSU", label:"Quality 500–600W PSU", cost:2000, note:"Tested unit. Avoid mystery PSUs."},
        {slot:"CASE", label:"Clean budget ATX / mATX case", cost:1500, note:"Spend the money on the GPU, not glass architecture.", genericCaseSizeId:"atx-mid-tower"},
        {slot:"COOLER", label:"AMD stock AM4 cooler", cost:0, note:"Wraith Stealth/Spire or equivalent."}
      ]
    }
  ];

  function bpMoney(value){
    try { return money(Number(value)||0,"RSD"); }
    catch (_) { return (Number(value)||0).toLocaleString("en-US")+" RSD"; }
  }

  function bpEsc(value){
    return typeof escHtml === "function" ? escHtml(value) : String(value||"");
  }

  function bpTabs(active){
    return '<div class="pn-bp-tabs" role="tablist" aria-label="Build modes">'+
      '<button type="button" class="'+(active==="ACTIVE"?"active":"")+'" data-pn-bp-view="ACTIVE">ACTIVE BUILDS</button>'+
      '<button type="button" class="'+(active==="BLUEPRINTS"?"active":"")+'" data-pn-bp-view="BLUEPRINTS">PROFIT BLUEPRINTS</button>'+
    '</div>';
  }

  function bpInjectTabsIntoActive(html){
    const tabs = bpTabs("ACTIVE");
    const needle = '<div class="content">';
    if (String(html).includes(needle)){
      return String(html).replace(needle,needle+tabs);
    }
    return String(html);
  }

  function bpPartRow(part){
    return '<div class="pn-bp-part">'+
      '<span class="pn-bp-slot">'+bpEsc(part.slot)+'</span>'+
      '<b>'+bpEsc(part.label)+'</b>'+
      '<strong>'+bpMoney(part.cost)+'</strong>'+
    '</div>';
  }

  function bpCard(bp){
    const headroom = HARD_CAP_RSD - bp.targetTotal;
    return '<article class="pn-bp-card pn-tier-card pn-tier-uncommon">'+
      '<div class="pn-bp-card-head">'+
        '<div>'+
          '<span class="pn-bp-unit">'+bpEsc(bp.subtitle)+'</span>'+
          '<h2>'+bpEsc(bp.name)+'</h2>'+
          '<p>'+bpEsc(bp.role)+'</p>'+
        '</div>'+
        '<div class="pn-bp-badges">'+
          '<span class="chip pn-tier-uncommon">UNCOMMON</span>'+
          '<span class="chip chip-blue-outline">AM4</span>'+
        '</div>'+
      '</div>'+
      '<div class="pn-bp-cost-strip">'+
        '<div><span>IDEAL TARGET</span><b>'+bpMoney(bp.targetTotal)+'</b></div>'+
        '<div><span>WORKING RANGE</span><b>'+bpMoney(bp.targetMin)+'–'+bpMoney(bp.targetMax)+'</b></div>'+
        '<div><span>HARD CAP</span><b>'+bpMoney(HARD_CAP_RSD)+'</b></div>'+
        '<div class="'+(headroom>=0?"ok":"bad")+'"><span>HEADROOM</span><b>'+bpMoney(headroom)+'</b></div>'+
      '</div>'+
      '<div class="pn-bp-parts">'+bp.parts.map(bpPartRow).join("")+'</div>'+
      '<div class="pn-bp-doctrine">'+bpEsc(bp.doctrine)+'</div>'+
      '<div class="pn-bp-card-foot">'+
        '<span>RESEARCHED 15 SEP 2026 · AM4 UNCOMMON DOCTRINE V1</span>'+
        '<button type="button" class="btn btn-primary" data-pn-bp-deploy="'+bp.id+'">DEPLOY BLUEPRINT</button>'+
      '</div>'+
    '</article>';
  }

  function renderBlueprintLibrary(){
    return pageHeader(
      "BUILDS",
      "AM4 profit infantry · UNCOMMON doctrine",
      ""
    )+
    '<div class="content pn-bp-content">'+
      bpTabs("BLUEPRINTS")+
      '<section class="pn-bp-doctrine-banner">'+
        '<div><span>UNCOMMON HARD LIMIT</span><b>≤ '+bpMoney(HARD_CAP_RSD)+'</b></div>'+
        '<div><span>PLATFORM</span><b>AM4 ONLY</b></div>'+
        '<div><span>CPU DOCTRINE</span><b>R5 2600 / 2600X</b></div>'+
        '<div><span>MEMORY</span><b>16GB DDR4 MINIMUM</b></div>'+
        '<div><span>GPU VRAM FLOOR</span><b>8GB+ · GRUNT = 6GB EXCEPTION</b></div>'+
        '<div class="danger"><span>POLARIS EXCLUSION</span><b>RX 470 / 480 / 570 / 580 / 590</b></div>'+
      '</section>'+
      '<div class="pn-bp-intro">'+
        '<div><span>PROFIT BLUEPRINTS // UNCOMMON CONSCRIPTS</span><h2>THE FIRST INFANTRY</h2></div>'+
        '<p>Blueprints are planning doctrine, not inventory. They do not touch SHOP FUND until real parts are acquired. Deploying one creates a normal PLANNING build with planned component costs.</p>'+
      '</div>'+
      '<div class="pn-bp-grid">'+BLUEPRINTS.map(bpCard).join("")+'</div>'+
      '<div class="info-note pn-bp-note"><b>PROCUREMENT RULE</b> — '+bpEsc(
        "23,500 RSD is a kill switch, not a target to exceed. GRUNT is the only blueprint allowed below 8GB VRAM. Every RAIDER-tier and higher blueprint requires 8GB+ VRAM. Stronger GPU means a cheaper platform. Ryzen 5 3600 may substitute only when found at bargain money. Polaris mining-era cards remain outside the canonical blueprint pool."
      )+'</div>'+
    '</div>';
  }

  function uniqueProjectName(base){
    const names = new Set(Store.all("projects").map(p=>String(p.name||"").toUpperCase()));
    if (!names.has(base.toUpperCase())) return base;
    let i = 2;
    while (names.has((base+" "+i).toUpperCase())) i++;
    return base+" "+i;
  }

  function deployBlueprint(bp){
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
      notes:"Deployed from PROFIT BLUEPRINT "+bp.name+" · "+bp.tier+" · AM4 · hard cap "+HARD_CAP_RSD+" RSD. "+bp.doctrine
    });

    bp.parts.forEach(part=>{
      const payload = {
        label:part.label,
        cost:part.cost,
        currency:"RSD",
        notes:part.note||""
      };
      if (part.ram) payload.ram = Object.assign({},part.ram);
      if (part.genericCaseSizeId) payload.genericCaseSizeId = part.genericCaseSizeId;
      Actions.setProjectSlot(project.id,part.slot,"PLANNED",payload);
    });

    Timeline.log(
      "PROJECT_BLUEPRINT",
      bp.name+" blueprint deployed",
      bp.tier+" AM4 build · planned target "+bpMoney(bp.targetTotal)+" · hard cap "+bpMoney(HARD_CAP_RSD),
      todayISO(),
      "project",
      project.id
    );

    state.profitBlueprintView = "ACTIVE";
    state.pbId = project.id;
    state.route = "projectbuild";
    render();
  }

  state.profitBlueprintView = state.profitBlueprintView==="BLUEPRINTS" ? "BLUEPRINTS" : "ACTIVE";

  if (typeof ROUTES !== "undefined"){
    const route = ROUTES.find(row=>row.key==="projects");
    if (route && !route.__pnProfitBlueprintsWrapped){
      const originalRender = route.render;
      route.__pnProfitBlueprintsWrapped = true;
      route.__pnProfitBlueprintsOriginalRender = originalRender;
      route.render = function(){
        if (state.profitBlueprintView==="BLUEPRINTS"){
          return renderBlueprintLibrary();
        }
        return bpInjectTabsIntoActive(originalRender.apply(this,arguments));
      };
    }
  }

  document.addEventListener("click",function(event){
    const view = event.target.closest("[data-pn-bp-view]");
    if (view){
      state.profitBlueprintView = view.dataset.pnBpView==="BLUEPRINTS" ? "BLUEPRINTS" : "ACTIVE";
      render();
      return;
    }

    const deploy = event.target.closest("[data-pn-bp-deploy]");
    if (deploy){
      const bp = BLUEPRINTS.find(row=>row.id===deploy.dataset.pnBpDeploy);
      if (bp) deployBlueprint(bp);
    }
  });

  const style = document.createElement("style");
  style.id = "pn-profit-blueprints-v1-style";
  style.textContent = `
    .pn-bp-tabs{
      display:flex;
      gap:0;
      margin:0 0 14px;
      border-bottom:1px solid rgba(104,190,255,.18);
    }
    .pn-bp-tabs button{
      min-width:170px;
      padding:10px 15px;
      border:1px solid rgba(91,158,205,.28);
      border-bottom:0;
      background:rgba(8,12,16,.72);
      color:var(--text-muted);
      font:900 9px/1 var(--mono);
      letter-spacing:.11em;
      cursor:pointer;
    }
    .pn-bp-tabs button+button{border-left:0}
    .pn-bp-tabs button.active{
      color:#b8e0ff;
      background:rgba(47,115,160,.13);
      box-shadow:inset 0 -2px 0 #5ab4ef;
    }

    .pn-bp-content{position:relative}
    .pn-bp-doctrine-banner{
      display:grid;
      grid-template-columns:repeat(6,minmax(0,1fr));
      margin-bottom:14px;
      border:1px solid rgba(91,158,205,.26);
      background:rgba(7,10,14,.82);
    }
    .pn-bp-doctrine-banner>div{
      min-height:72px;
      padding:12px 14px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:7px;
      border-right:1px solid rgba(91,158,205,.18);
    }
    .pn-bp-doctrine-banner>div:last-child{border-right:0}
    .pn-bp-doctrine-banner span{
      color:var(--text-muted);
      font:800 7px/1.2 var(--mono);
      letter-spacing:.12em;
    }
    .pn-bp-doctrine-banner b{
      color:#b8d9ef;
      font:900 12px/1.2 var(--mono);
    }
    .pn-bp-doctrine-banner .danger b{color:#df6e7b}

    .pn-bp-intro{
      display:grid;
      grid-template-columns:minmax(260px,.8fr) minmax(340px,1.2fr);
      gap:22px;
      align-items:end;
      margin:0 0 16px;
      padding:15px 17px;
      border-left:2px solid #55aedd;
      background:linear-gradient(90deg,rgba(32,91,128,.11),transparent);
    }
    .pn-bp-intro span{
      color:#73afd2;
      font:800 8px/1 var(--mono);
      letter-spacing:.14em;
    }
    .pn-bp-intro h2{
      margin:5px 0 0;
      font-size:19px;
      letter-spacing:.05em;
    }
    .pn-bp-intro p{
      margin:0;
      color:var(--text-muted);
      font-size:11px;
      line-height:1.55;
    }

    .pn-bp-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:14px;
    }
    .pn-bp-card{
      min-width:0;
      display:flex;
      flex-direction:column;
      border:1px solid rgba(81,183,220,.32);
      background:
        linear-gradient(145deg,rgba(27,78,103,.11),transparent 42%),
        rgba(9,11,14,.90);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
    }
    .pn-bp-card-head{
      padding:15px 16px 13px;
      display:flex;
      justify-content:space-between;
      gap:14px;
      border-bottom:1px solid rgba(88,169,205,.17);
    }
    .pn-bp-unit{
      color:#6e9bb5;
      font:800 7px/1 var(--mono);
      letter-spacing:.15em;
    }
    .pn-bp-card h2{
      margin:5px 0 4px;
      color:#d7f1ff;
      font-size:24px;
      line-height:1;
      letter-spacing:.06em;
    }
    .pn-bp-card-head p{
      margin:0;
      color:#8e9ca4;
      font-size:9px;
      line-height:1.35;
    }
    .pn-bp-badges{
      display:flex;
      flex-direction:column;
      gap:5px;
      align-items:flex-end;
    }

    .pn-bp-cost-strip{
      display:grid;
      grid-template-columns:1fr 1fr;
      border-bottom:1px solid rgba(88,169,205,.17);
    }
    .pn-bp-cost-strip>div{
      padding:10px 12px;
      display:grid;
      gap:4px;
      border-right:1px solid rgba(88,169,205,.12);
      border-bottom:1px solid rgba(88,169,205,.12);
    }
    .pn-bp-cost-strip>div:nth-child(2n){border-right:0}
    .pn-bp-cost-strip>div:nth-child(n+3){border-bottom:0}
    .pn-bp-cost-strip span{
      color:#6d7b84;
      font:800 6.5px/1 var(--mono);
      letter-spacing:.10em;
    }
    .pn-bp-cost-strip b{
      color:#dceaf2;
      font:900 12px/1.15 var(--mono);
    }
    .pn-bp-cost-strip .ok b{color:#55d59a}
    .pn-bp-cost-strip .bad b{color:#ee6572}

    .pn-bp-parts{
      display:flex;
      flex-direction:column;
      padding:8px 12px;
    }
    .pn-bp-part{
      min-height:34px;
      display:grid;
      grid-template-columns:60px minmax(0,1fr) auto;
      gap:9px;
      align-items:center;
      border-bottom:1px solid rgba(255,255,255,.045);
    }
    .pn-bp-part:last-child{border-bottom:0}
    .pn-bp-slot{
      color:#63889e;
      font:900 7px/1 var(--mono);
      letter-spacing:.09em;
    }
    .pn-bp-part b{
      min-width:0;
      color:#bbbfc2;
      font-size:9px;
      overflow-wrap:anywhere;
    }
    .pn-bp-part strong{
      color:#9fb6c4;
      font:900 8px/1 var(--mono);
      white-space:nowrap;
    }

    .pn-bp-doctrine{
      margin:4px 12px 12px;
      padding:10px 11px;
      border-left:2px solid rgba(85,174,221,.48);
      background:rgba(35,82,108,.08);
      color:#85939a;
      font-size:9px;
      line-height:1.45;
    }

    .pn-bp-card-foot{
      margin-top:auto;
      padding:11px 12px 12px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      border-top:1px solid rgba(88,169,205,.14);
    }
    .pn-bp-card-foot>span{
      color:#5f6b72;
      font:700 6px/1.25 var(--mono);
      letter-spacing:.07em;
    }
    .pn-bp-card-foot .btn{
      flex:0 0 auto;
      min-width:132px;
    }
    .pn-bp-note{margin-top:14px}

    @media(max-width:1180px){
      .pn-bp-grid{grid-template-columns:1fr 1fr}
      .pn-bp-doctrine-banner{grid-template-columns:repeat(3,1fr)}
      .pn-bp-doctrine-banner>div:nth-child(3n){border-right:0}
      .pn-bp-doctrine-banner>div:nth-child(n+4){border-top:1px solid rgba(91,158,205,.18)}
    }
    @media(max-width:820px){
      .pn-bp-grid{grid-template-columns:1fr}
      .pn-bp-intro{grid-template-columns:1fr}
      .pn-bp-doctrine-banner{grid-template-columns:1fr 1fr}
      .pn-bp-doctrine-banner>div{border-top:1px solid rgba(91,158,205,.14)}
      .pn-bp-doctrine-banner>div:nth-child(odd){border-right:1px solid rgba(91,158,205,.18)}
      .pn-bp-doctrine-banner>div:nth-child(even){border-right:0}
      .pn-bp-doctrine-banner>div:first-child,.pn-bp-doctrine-banner>div:nth-child(2){border-top:0}
      .pn-bp-doctrine-banner>div:last-child{grid-column:1/3}
      .pn-bp-tabs button{flex:1;min-width:0}
    }
    @media(max-width:520px){
      .pn-bp-doctrine-banner{grid-template-columns:1fr}
      .pn-bp-doctrine-banner>div,.pn-bp-doctrine-banner>div:nth-child(odd){
        border-right:0;
        border-top:1px solid rgba(91,158,205,.14);
      }
      .pn-bp-doctrine-banner>div:first-child{border-top:0}
      .pn-bp-doctrine-banner>div:last-child{grid-column:auto}
      .pn-bp-card-head{align-items:flex-start}
      .pn-bp-badges{display:none}
      .pn-bp-card-foot{align-items:stretch;flex-direction:column}
      .pn-bp-card-foot .btn{width:100%}
      .pn-bp-part{grid-template-columns:50px minmax(0,1fr)}
      .pn-bp-part strong{grid-column:2}
    }
  `;
  document.head.appendChild(style);

  window.__pnProfitBlueprintsV1 = {
    blueprints:BLUEPRINTS,
    hardCapRsd:HARD_CAP_RSD,
    forbiddenGpuFamily:FORBIDDEN_GPU_FAMILY.slice(),
    minVramGb:MIN_VRAM_GB,
    vramExceptionBlueprint:VRAM_EXCEPTION_BLUEPRINT,
    render:renderBlueprintLibrary,
    deploy:deployBlueprint
  };

  console.info("[PROFITNODE] PROFIT BLUEPRINTS V1.1 ACTIVE — VRAM DOCTRINE LOCKED");
})();
