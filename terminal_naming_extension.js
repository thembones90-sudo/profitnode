"use strict";

/*
  PROFITNODE Terminal Naming v3
  Visible language only. Internal route keys and data contracts stay unchanged.
*/

(function applyProfitnodeTerminalLanguage(){
  const routeNames = {
    dashboard: "COMMAND",
    analytics: "INTEL",
    rigbuild: "RIG ASSEMBLY",
    projects: "BUILDS",
    inventory: "PARTS VAULT",
    repairs: "REPAIR BAY",
    sales: "LEDGER",
    history: "ARCHIVE",
    backup: "BLACKBOX"
  };

  if (typeof ROUTES !== "undefined"){
    ROUTES.forEach(route=>{
      if (routeNames[route.key]) route.label = routeNames[route.key];
    });
  }

  const pageLanguage = {
    "DASHBOARD": {
      title: "COMMAND",
      subtitle: "Shop status and lifetime performance"
    },
    "ANALYTICS": {
      title: "INTEL",
      subtitle: "Profit, turnover and acquisition analysis"
    },
    "RIG BUILD": {
      title: "RIG ASSEMBLY",
      subtitle: "Plan \u00B7 simulate \u00B7 assemble \u00B7 test"
    },
    "PROJECTS": {
      title: "BUILDS",
      subtitle: "Active machines and project lifecycle"
    },
    "INVENTORY": {
      title: "PARTS VAULT",
      subtitle: "Component stock and assigned hardware"
    },
    "REPAIRS": {
      title: "REPAIR BAY",
      subtitle: "Diagnostics \u00B7 repair costs \u00B7 outcomes"
    },
    "SALES": {
      title: "LEDGER",
      subtitle: "Pending listings, completed sales and realized profit"
    },
    "HISTORY": {
      title: "ARCHIVE",
      subtitle: "Permanent shop activity record"
    },
    "BACKUP": {
      title: "BLACKBOX",
      subtitle: "Backup \u00B7 restore \u00B7 recovery"
    }
  };

  if (typeof pageHeader === "function"){
    const PNCorePageHeaderTerminalLanguage = pageHeader;

    pageHeader = function(title,subtitle,actionHtml){
      const key = String(title || "").trim().toUpperCase();
      const mapped = pageLanguage[key];

      if (mapped){
        title = mapped.title;
        subtitle = mapped.subtitle;
      }

      return PNCorePageHeaderTerminalLanguage(title,subtitle,actionHtml);
    };
  }

  const style = document.createElement("style");
  style.textContent = `
  nav.mainnav{
    padding:10px 0 12px;
  }

  .mainnav .navlink{
    --pn-nav-color:#c5cbd2;
    --pn-nav-hover:#f1f3f5;
    --pn-nav-accent:#aeb7c1;
    --pn-nav-rgb:174,183,193;
    position:relative;
    min-height:56px;
    padding:0 18px 0 28px;
    gap:0;
    border-left:3px solid transparent;
    color:var(--pn-nav-color) !important;
    background:transparent;
    font-family:var(--stamp);
    font-size:14px;
    font-weight:700;
    line-height:1;
    letter-spacing:.105em;
    text-transform:uppercase;
    text-shadow:none;
    transition:padding-left .15s ease,color .15s ease,background .15s ease,border-color .15s ease,box-shadow .15s ease;
  }

  .mainnav .navlink:hover{
    padding-left:31px;
    border-left-color:rgba(198,205,214,.42);
    color:var(--pn-nav-hover) !important;
    background:linear-gradient(90deg,rgba(205,212,220,.075),rgba(205,212,220,.025) 62%,transparent);
  }

  .mainnav .navlink.active,
  .mainnav .navlink.is-powered{
    border-left-color:var(--pn-nav-accent);
    color:var(--pn-nav-accent) !important;
    background:linear-gradient(90deg,rgba(var(--pn-nav-rgb),.15),rgba(var(--pn-nav-rgb),.045) 62%,transparent);
    box-shadow:inset 3px 0 10px rgba(var(--pn-nav-rgb),.2),inset 0 1px rgba(255,255,255,.025);
    text-shadow:0 0 8px rgba(var(--pn-nav-rgb),.22);
  }

  .mainnav .navlink.active:hover,
  .mainnav .navlink.is-powered:hover{
    color:var(--pn-nav-hover) !important;
    background:linear-gradient(90deg,rgba(var(--pn-nav-rgb),.18),rgba(var(--pn-nav-rgb),.055) 64%,transparent);
  }

  .mainnav .navlink:focus-visible{
    outline:1px solid var(--pn-nav-accent);
    outline-offset:-3px;
  }

  .mainnav .navlink[data-route="rigbuild"]{
    --pn-nav-hover:#f0ca69;
    --pn-nav-accent:#e7bc4e;
    --pn-nav-rgb:231,188,78;
  }

  .mainnav .navlink[data-route="mail"]{
    --pn-nav-color:#b94b58;
    --pn-nav-hover:#e57d87;
    --pn-nav-accent:#d45a67;
    --pn-nav-rgb:212,90,103;
  }

  .mainnav .navlink[data-route="roulette"]{
    --pn-nav-color:#a874c5;
    --pn-nav-hover:#d4a6eb;
    --pn-nav-accent:#bd85dc;
    --pn-nav-rgb:189,133,220;
  }

  .mainnav .navlink[data-route="backup"]{
    --pn-nav-color:#7d8792;
    --pn-nav-hover:#b8c1ca;
    --pn-nav-accent:#9aa5b1;
    --pn-nav-rgb:154,165,177;
  }

  .mainnav .navlink[data-route="analytics"],
  .mainnav .navlink[data-route="roadto"],
  .mainnav .navlink[data-route="history"]{
    margin-bottom:13px;
  }

  .mainnav .navlink[data-route="analytics"]:after,
  .mainnav .navlink[data-route="roadto"]:after,
  .mainnav .navlink[data-route="history"]:after{
    content:"";
    position:absolute;
    left:28px;
    right:18px;
    bottom:-7px;
    height:1px;
    background:rgba(181,189,198,.14);
    pointer-events:none;
  }

  .mainnav .navlink[data-route="rigbuild"],
  .mainnav .navlink[data-route="rigbuild"]:hover{
    color:transparent !important;
    text-shadow:none !important;
  }

  .mainnav .navlink[data-route="rigbuild"]:before{
    content:"RIG ASSEMBLY";
    position:absolute;
    left:28px;
    top:50%;
    color:#e7bc4e;
    background:none;
    -webkit-text-fill-color:#e7bc4e;
    filter:drop-shadow(0 0 3px rgba(231,188,78,.5)) drop-shadow(0 0 8px rgba(231,188,78,.2));
    pointer-events:none;
    transform:translateY(-50%);
    transition:left .15s ease,filter .15s ease;
    animation:pnRigAssemblyChrome 4.4s infinite steps(1,end);
  }

  .mainnav .navlink[data-route="rigbuild"]:after{
    content:"";
    position:absolute;
    left:26px;
    top:calc(50% + 11px);
    width:108px;
    height:3px;
    opacity:0;
    pointer-events:none;
    background:#e7bc4e;
    clip-path:polygon(0 48%,18% 40%,24% 0,31% 84%,47% 35%,54% 100%,64% 24%,72% 64%,100% 50%,72% 82%,62% 45%,54% 100%,46% 58%,29% 92%,22% 22%,16% 68%,0 55%);
    filter:drop-shadow(0 0 2px rgba(231,188,78,.9)) drop-shadow(0 0 7px rgba(231,188,78,.62));
    transform-origin:left center;
    transition:left .15s ease,filter .15s ease;
    animation:pnRigAssemblyLightning 4.4s infinite steps(1,end);
  }

  .mainnav .navlink[data-route="rigbuild"]:hover:before{
    left:31px;
  }

  .mainnav .navlink[data-route="rigbuild"]:hover:after{
    left:29px;
  }

  .mainnav .navlink[data-route="rigbuild"]:hover:before,
  .mainnav .navlink[data-route="rigbuild"].active:before{
    filter:drop-shadow(0 0 4px rgba(231,188,78,.72)) drop-shadow(0 0 11px rgba(231,188,78,.4));
  }

  @keyframes pnRigAssemblyChrome{
    0%,61%,68%,100%{opacity:1;transform:translateY(-50%);filter:drop-shadow(0 0 3px rgba(231,188,78,.5)) drop-shadow(0 0 8px rgba(231,188,78,.2))}
    62%{opacity:.42;transform:translate(1px,-50%);filter:drop-shadow(0 0 13px rgba(231,188,78,.86))}
    63%{opacity:1;transform:translate(-1px,-50%);filter:drop-shadow(0 0 16px rgba(231,188,78,.92))}
    64%{opacity:.68;transform:translateY(-50%);filter:drop-shadow(0 0 18px rgba(231,188,78,.95))}
    65%{opacity:1;transform:translateY(-50%);filter:drop-shadow(0 0 15px rgba(231,188,78,.78))}
    66%{opacity:.54;transform:translate(1px,-50%)}
    67%{opacity:1;transform:translateY(-50%);filter:drop-shadow(0 0 11px rgba(231,188,78,.68))}
  }

  @keyframes pnRigAssemblyLightning{
    0%,60%,68%,100%{opacity:0;transform:scaleX(.04) translateX(-8px)}
    61%{opacity:.22;transform:scaleX(.18) translateX(-3px)}
    62%{opacity:1;transform:scaleX(.48) translateX(0)}
    63%{opacity:.35;transform:scaleX(.72) translateX(0)}
    64%{opacity:1;transform:scaleX(1) translateX(0)}
    65%{opacity:.16;transform:scaleX(1) translateX(0)}
    66%{opacity:.92;transform:scaleX(1) translateX(0)}
    67%{opacity:0;transform:scaleX(1) translateX(4px)}
  }

  @media (prefers-reduced-motion:reduce){
    .mainnav .navlink[data-route="rigbuild"]:before{animation:none}
    .mainnav .navlink[data-route="rigbuild"]:after{display:none;animation:none}
  }
  `;
  document.head.appendChild(style);
})();
