"use strict";

/* PROFITNODE — PROFIT BLUEPRINTS: THE MUSTER V2
   Visual/narrative overhaul only. Uses canonical V1.1 blueprint data + deploy action.
   Does not touch Build Workspace, Store, treasury, accounting, or blueprint costs. */
(function(){
  if (window.__pnProfitBlueprintsMusterV2Installed) return;
  window.__pnProfitBlueprintsMusterV2Installed = true;

  const api = window.__pnProfitBlueprintsV1;
  if (!api || !Array.isArray(api.blueprints)) {
    console.warn("[PROFITNODE] MUSTER V2 skipped: PROFIT BLUEPRINTS V1.1 not found.");
    return;
  }

  const moneyRsd = n => (Number(n)||0).toLocaleString("de-DE") + " RSD";
  const esc = v => typeof escHtml === "function" ? escHtml(v) : String(v ?? "");
  const blueprints = api.blueprints;
  const hardCap = Number(api.hardCapRsd)||23500;

  const meta = {
    grunt:{klass:"LINE INFANTRY", accent:"green", code:"PN-BP-001", note:"Entry conscript. Cheap, clear, reliable, and safely away from Polaris mining-era traps."},
    raider:{klass:"HEAVY CONSCRIPT", accent:"blue", code:"PN-BP-002", note:"Balanced striker. 8GB VRAM, respected brand value, strong resale confidence."},
    berserker:{klass:"ASSAULT CONSCRIPT", accent:"violet", code:"PN-BP-003", note:"Shock troop. Strict 8GB+ VRAM doctrine, strongest GPU allowed before the budget line breaks."}
  };

  function tabs(active){
    return '<div class="pn-muster-tabs">'+
      '<button type="button" data-pn-bp-view="ACTIVE" class="'+(active==="ACTIVE"?"active":"")+'">ACTIVE BUILDS</button>'+
      '<button type="button" data-pn-bp-view="BLUEPRINTS" class="'+(active==="BLUEPRINTS"?"active":"")+'">PROFIT BLUEPRINTS</button>'+
    '</div>';
  }

  function part(bp, slot){ return (bp.parts||[]).find(p=>p.slot===slot)||null; }
  function row(p, label){
    if(!p) return "";
    return '<div class="pn-muster-row"><span>'+esc(label||p.slot)+'</span><b>'+esc(p.label)+'</b><strong>'+moneyRsd(p.cost)+'</strong></div>';
  }

  function budget(bp){
    const reserve = Math.max(0, hardCap-Number(bp.targetTotal||0));
    const pct = Math.max(0, Math.min(100, Math.round((Number(bp.targetTotal||0)/hardCap)*100)));
    const saturated = reserve===0;
    return '<div class="pn-muster-budget">'+
      '<div><span>TARGET</span><b>'+moneyRsd(bp.targetTotal)+'</b></div>'+
      '<div><span>RANGE</span><b>'+moneyRsd(bp.targetMin)+'–'+moneyRsd(bp.targetMax)+'</b></div>'+
      '<div class="reserve '+(saturated?'sat':'')+'"><span>'+(saturated?'STATUS':'RESERVE')+'</span><b>'+(saturated?'BUDGET SATURATED':moneyRsd(reserve))+'</b></div>'+
      '<div class="pn-muster-meter" aria-label="'+pct+' percent of hard budget"><i style="width:'+pct+'%"></i></div>'+
    '</div>';
  }

  function card(bp){
    const m = meta[bp.id] || {klass:"INFANTRY",accent:"blue",code:"PN-BP",note:bp.doctrine||""};
    const cpu=part(bp,"CPU"), gpu=part(bp,"GPU"), ram=part(bp,"RAM");
    const support=["MOBO","STORAGE","PSU","CASE","COOLER"].map(s=>row(part(bp,s),s)).join("");
    const bargain = bp.id==="berserker" ? '<span class="pn-muster-warning">BARGAIN SOURCING REQUIRED</span>' : '';
    return '<article class="pn-muster-card is-'+m.accent+'">'+
      '<header class="pn-muster-card-head"><div><span class="pn-muster-class">'+m.klass+'</span><h2>'+esc(bp.name)+'</h2><p>'+esc(bp.role)+'</p></div><div class="pn-muster-tags"><span>UNCOMMON</span></div></header>'+
      budget(bp)+
      '<section class="pn-muster-section"><h3>◎ COMBAT CORE</h3>'+row(cpu,"CPU")+row(gpu,"GPU")+row(ram,"RAM")+'</section>'+
      '<section class="pn-muster-section"><h3>⚒ SUPPORT LOADOUT</h3>'+support+'</section>'+
      '<div class="pn-muster-note">'+bargain+'<p>'+esc(m.note)+'</p></div>'+
      '<button type="button" class="btn btn-primary pn-muster-deploy" data-pn-bp-deploy="'+esc(bp.id)+'">MUSTER BUILD <span>→</span></button>'+
      '<footer><span>'+esc(bp.name)+' // UNCOMMON // AM4</span><span>'+m.code+'</span></footer>'+
    '</article>';
  }

  function renderMuster(){
    return pageHeader("BUILDS","AM4 profit infantry · UNCOMMON doctrine","")+
      '<div class="content pn-muster-page">'+tabs("BLUEPRINTS")+
      '<section class="pn-muster-hero"><div><span>PROFIT BLUEPRINTS // UNCOMMON CONSCRIPTS</span><h1>THE MUSTER</h1><small>THREE PATHS. ONE BUDGET. MORE VICTORIES.</small></div><p><b>Planning doctrine only.</b><br>Blueprints do not touch SHOP FUND until real parts are acquired.</p></section>'+
      '<section class="pn-muster-laws">'+
        '<div><span>HARD LIMIT</span><b>≤ '+moneyRsd(hardCap)+'</b></div>'+
        '<div><span>PLATFORM</span><b>AM4 ONLY</b></div>'+
        '<div><span>CPU CORE</span><b>R5 2600 / 2600X</b></div>'+
        '<div><span>MEMORY</span><b>16GB DDR4</b></div>'+
        '<div><span>VRAM LAW</span><b>GRUNT 6GB · RAIDER+ 8GB+</b></div>'+
      '</section>'+
      '<section class="pn-muster-grid">'+blueprints.map(card).join("")+'</section>'+
      '<div class="pn-muster-procurement"><b>PROCUREMENT LAW:</b> 23.500 RSD is the kill-switch, not a target. GRUNT alone may run 6GB VRAM. RAIDER and BERSERKER require 8GB+. Polaris mining-era cards remain excluded.</div>'+
      '</div>';
  }

  if (typeof ROUTES !== "undefined") {
    const route = ROUTES.find(r=>r.key==="projects");
    if(route && !route.__pnMusterV2Wrapped){
      const previous = route.render;
      route.__pnMusterV2Wrapped = true;
      route.render = function(){
        if (state.profitBlueprintView === "BLUEPRINTS") return renderMuster();
        return previous.apply(this,arguments);
      };
    }
  }

  const style=document.createElement("style");
  style.id="pn-profit-blueprints-muster-v2-style";
  style.textContent=`
  .pn-muster-page{--m-green:#42df78;--m-blue:#4eb8ff;--m-violet:#bd5cff;--m-red:#ff5c70}
  .pn-muster-tabs{display:flex;border-bottom:1px solid rgba(100,170,210,.2);margin-bottom:12px}.pn-muster-tabs button{min-width:180px;padding:12px 18px;border:1px solid rgba(100,170,210,.28);border-bottom:0;background:rgba(5,8,12,.78);color:#8194a1;font:900 11px var(--mono);letter-spacing:.1em;cursor:pointer}.pn-muster-tabs button+button{border-left:0}.pn-muster-tabs .active{color:#bde5ff;background:rgba(41,110,151,.13);box-shadow:inset 0 -2px 0 #5ec5ff}
  .pn-muster-hero{display:grid;grid-template-columns:1.35fr .65fr;gap:30px;align-items:center;padding:19px 22px;margin-bottom:12px;border-left:2px solid #55b6e8;border-top:1px solid rgba(103,166,204,.18);border-bottom:1px solid rgba(103,166,204,.18);background:linear-gradient(90deg,rgba(18,52,73,.35),rgba(22,13,25,.23)),radial-gradient(circle at 72% 45%,rgba(182,36,62,.14),transparent 32%)}.pn-muster-hero span{color:#6db8dc;font:900 9px var(--mono);letter-spacing:.14em}.pn-muster-hero h1{margin:5px 0 3px;font-size:33px;line-height:1;letter-spacing:.05em}.pn-muster-hero small{color:#8998a0;font:800 9px var(--mono);letter-spacing:.15em}.pn-muster-hero p{margin:0;padding-left:16px;border-left:2px solid rgba(238,62,83,.65);color:#a7abb0;font-size:12px;line-height:1.5}.pn-muster-hero p b{color:#e6eaed}
  .pn-muster-laws{display:grid;grid-template-columns:repeat(5,1fr);margin-bottom:14px;border:1px solid rgba(96,151,184,.25);background:rgba(5,8,11,.86)}.pn-muster-laws>div{min-height:68px;padding:11px 14px;display:flex;flex-direction:column;justify-content:center;gap:6px;border-right:1px solid rgba(96,151,184,.16)}.pn-muster-laws>div:last-child{border-right:0}.pn-muster-laws span{color:#6f7f89;font:900 8px var(--mono);letter-spacing:.11em}.pn-muster-laws b{color:#ccecff;font:900 14px var(--mono)}.pn-muster-laws>div:first-child b{color:var(--m-red)}.pn-muster-laws>div:last-child b{color:var(--m-green)}
  .pn-muster-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pn-muster-card{--accent:var(--m-blue);position:relative;display:flex;flex-direction:column;min-width:0;border:1px solid color-mix(in srgb,var(--accent) 60%,#22313a);background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 4%,#070b0e) 0%,#080b0e 30%,#080a0d 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.018)}.pn-muster-card.is-green{--accent:var(--m-green)}.pn-muster-card.is-blue{--accent:var(--m-blue)}.pn-muster-card.is-violet{--accent:var(--m-violet)}.pn-muster-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 82% 8%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 26%)}
  .pn-muster-card-head{position:relative;min-height:106px;padding:17px 18px 14px;border-bottom:1px solid rgba(130,170,195,.15);display:flex;justify-content:space-between;gap:12px}.pn-muster-class{color:var(--accent);font:900 8px var(--mono);letter-spacing:.15em}.pn-muster-card h2{margin:6px 0 5px;color:#e3f4ff;font-size:31px;line-height:1;letter-spacing:.045em}.pn-muster-card-head p{margin:0;color:#8b9aa3;font-size:11px}.pn-muster-tags span{display:inline-block;padding:4px 7px;border:1px solid #19a934;color:#34ef59;background:rgba(26,155,54,.08);font:900 8px var(--mono);letter-spacing:.07em}
  .pn-muster-budget{display:grid;grid-template-columns:1fr 1.15fr 1.1fr;position:relative;margin:10px 10px 0;border:1px solid color-mix(in srgb,var(--accent) 25%,#25343d);background:rgba(7,13,17,.68)}.pn-muster-budget>div:not(.pn-muster-meter){padding:10px 11px;border-right:1px solid rgba(120,155,175,.12)}.pn-muster-budget>div:nth-child(3){border-right:0}.pn-muster-budget span{display:block;color:#6f7b82;font:900 7px var(--mono);letter-spacing:.1em}.pn-muster-budget b{display:block;margin-top:5px;color:#e0e8ec;font:900 12px var(--mono);line-height:1.18}.pn-muster-budget .reserve b{color:var(--m-green)}.pn-muster-budget .sat b{color:#ffb85c;font-size:10px}.pn-muster-meter{grid-column:1/-1;height:3px;background:#10171b}.pn-muster-meter i{display:block;height:100%;background:var(--accent);box-shadow:0 0 8px color-mix(in srgb,var(--accent) 60%,transparent)}
  .pn-muster-section{padding:12px 14px 0}.pn-muster-section h3{margin:0 0 4px;padding-bottom:8px;border-bottom:1px solid color-mix(in srgb,var(--accent) 38%,transparent);color:var(--accent);font:900 10px var(--mono);letter-spacing:.14em}.pn-muster-row{min-height:36px;display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.045)}.pn-muster-row span{color:#6d99b2;font:900 7.5px var(--mono);letter-spacing:.08em}.pn-muster-row b{color:#c9ced1;font-size:10.5px;line-height:1.2;overflow-wrap:anywhere}.pn-muster-row strong{color:#9eb8c7;font:900 8.5px var(--mono);white-space:nowrap}
  .pn-muster-note{margin:12px 14px 10px;padding:10px 12px;border-left:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 6%,#0b1014)}.pn-muster-note p{margin:0;color:#8f9ba2;font-size:10.5px;line-height:1.45}.pn-muster-warning{display:inline-block;margin-bottom:7px;padding:3px 6px;border:1px solid rgba(255,184,92,.4);color:#ffbf69;background:rgba(255,184,92,.06);font:900 7px var(--mono);letter-spacing:.09em}
  .pn-muster-deploy{margin:0 14px 10px;min-height:38px;font-size:10px!important;letter-spacing:.08em}.pn-muster-deploy span{font-size:15px;margin-left:7px}.pn-muster-card footer{display:flex;justify-content:space-between;gap:10px;margin-top:auto;padding:0 14px 12px;color:#526875;font:800 6.5px var(--mono);letter-spacing:.08em}
  .pn-muster-procurement{margin-top:14px;padding:12px 14px;border-top:1px dashed rgba(143,91,156,.45);color:#a79eab;font:10.5px/1.45 var(--mono)}.pn-muster-procurement b{color:#ece8ee}
  @media(max-width:1180px){.pn-muster-grid{grid-template-columns:1fr 1fr}.pn-muster-laws{grid-template-columns:repeat(3,1fr)}.pn-muster-laws>div:nth-child(3){border-right:0}.pn-muster-laws>div:nth-child(n+4){border-top:1px solid rgba(96,151,184,.16)}}
  @media(max-width:820px){.pn-muster-hero{grid-template-columns:1fr}.pn-muster-grid{grid-template-columns:1fr}.pn-muster-laws{grid-template-columns:1fr 1fr}.pn-muster-laws>div:nth-child(odd){border-right:1px solid rgba(96,151,184,.16)}.pn-muster-laws>div:nth-child(even){border-right:0}.pn-muster-card h2{font-size:29px}}
  @media(max-width:520px){.pn-muster-tabs button{min-width:0;flex:1}.pn-muster-laws{grid-template-columns:1fr}.pn-muster-laws>div{border-right:0!important;border-top:1px solid rgba(96,151,184,.16)}.pn-muster-budget{grid-template-columns:1fr}.pn-muster-budget>div:not(.pn-muster-meter){border-right:0;border-bottom:1px solid rgba(120,155,175,.12)}.pn-muster-row{grid-template-columns:54px minmax(0,1fr)}.pn-muster-row strong{grid-column:2;padding-bottom:5px}}
  `;
  document.head.appendChild(style);
  window.__pnProfitBlueprintsMusterV2={render:renderMuster};
  console.info("[PROFITNODE] THE MUSTER V2 ACTIVE");
})();
