"use strict";

/*
  PROFITNODE Terminal Naming v2
  Visible language only. Internal route keys and data contracts stay unchanged.
*/

(function applyProfitnodeTerminalLanguage(){
  const routeNames = {
    dashboard: "COMMAND",
    analytics: "INTEL",
    rigbuild: "RIG BENCH",
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
      title: "RIG BENCH",
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
})();