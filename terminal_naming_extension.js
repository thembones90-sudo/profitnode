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
  .mainnav .navlink[data-route="rigbuild"]{
    position:relative;
    color:transparent !important;
    text-shadow:none !important;
  }

  .mainnav .navlink[data-route="rigbuild"]:before{
    content:"RIG ASSEMBLY";
    position:absolute;
    left:18px;
    top:50%;
    color:#e7bc4e;
    background:none;
    -webkit-text-fill-color:#e7bc4e;
    filter:drop-shadow(0 0 3px rgba(231,188,78,.5)) drop-shadow(0 0 8px rgba(231,188,78,.2));
    pointer-events:none;
    transform:translateY(-50%);
    animation:pnRigAssemblyChrome 4.4s infinite steps(1,end);
  }

  .mainnav .navlink[data-route="rigbuild"]:after{
    content:"";
    position:absolute;
    left:16px;
    top:calc(50% + 10px);
    width:108px;
    height:3px;
    opacity:0;
    pointer-events:none;
    background:#e7bc4e;
    clip-path:polygon(0 48%,18% 40%,24% 0,31% 84%,47% 35%,54% 100%,64% 24%,72% 64%,100% 50%,72% 82%,62% 45%,54% 100%,46% 58%,29% 92%,22% 22%,16% 68%,0 55%);
    filter:drop-shadow(0 0 2px rgba(231,188,78,.9)) drop-shadow(0 0 7px rgba(231,188,78,.62));
    transform-origin:left center;
    animation:pnRigAssemblyLightning 4.4s infinite steps(1,end);
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
