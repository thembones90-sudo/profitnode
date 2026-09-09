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
    deals: "THE HUNT",
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
    "DEALS": {
      title: "THE HUNT",
      subtitle: "Acquisitions \u00B7 offers \u00B7 Deal Score"
    },
    "SALES": {
      title: "LEDGER",
      subtitle: "Completed sales and realized profit"
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
  [data-route="rigbuild"]{
    position:relative;
    color:#d3d7df !important;
    text-shadow:0 0 7px rgba(218,223,232,.13),0 0 13px rgba(168,174,186,.08);
    animation:pnRigAssemblySilver 6.2s infinite steps(1,end);
  }

  [data-route="rigbuild"]:before,
  [data-route="rigbuild"]:after{
    content:"RIG ASSEMBLY";
    position:absolute;
    left:18px;
    top:50%;
    color:#eef1f5;
    opacity:0;
    pointer-events:none;
    transform:translateY(-50%);
  }

  [data-route="rigbuild"]:before{
    text-shadow:-1px 0 rgba(188,197,212,.72);
    animation:pnRigAssemblyGlitchA 6.2s infinite steps(1,end);
  }

  [data-route="rigbuild"]:after{
    text-shadow:1px 0 rgba(168,85,247,.42);
    animation:pnRigAssemblyGlitchB 6.2s infinite steps(1,end);
  }

  @keyframes pnRigAssemblySilver{
    0%,72%,75%,100%{color:#d3d7df;text-shadow:0 0 7px rgba(218,223,232,.13),0 0 13px rgba(168,174,186,.08)}
    73%{color:#f3f5f8;text-shadow:-1px 0 #aeb6c4,1px 0 rgba(168,85,247,.38)}
    74%{color:#bfc5cf;text-shadow:1px 0 #f1f3f6,-1px 0 rgba(168,85,247,.3)}
  }

  @keyframes pnRigAssemblyGlitchA{
    0%,72%,75%,100%{opacity:0;clip-path:inset(0 0 0 0);transform:translateY(-50%)}
    73%{opacity:.58;clip-path:inset(10% 0 64% 0);transform:translate(-2px,calc(-50% - 1px))}
    74%{opacity:.36;clip-path:inset(58% 0 12% 0);transform:translate(1px,calc(-50% + 1px))}
  }

  @keyframes pnRigAssemblyGlitchB{
    0%,73%,76%,100%{opacity:0;clip-path:inset(0 0 0 0);transform:translateY(-50%)}
    74%{opacity:.42;clip-path:inset(34% 0 38% 0);transform:translate(2px,calc(-50% + 1px))}
    75%{opacity:.28;clip-path:inset(76% 0 5% 0);transform:translate(-1px,calc(-50% - 1px))}
  }

  @media (prefers-reduced-motion:reduce){
    [data-route="rigbuild"]{animation:none}
    [data-route="rigbuild"]:before,
    [data-route="rigbuild"]:after{display:none;animation:none}
  }
  `;
  document.head.appendChild(style);
})();
