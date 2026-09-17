"use strict";

/*
  PROFITNODE SIDEBAR IDENTITY V1
  Adds locked menu icons and per-route identity colors.

  Safety:
  - no routing changes
  - no click-handler changes
  - no render wrapping
  - no data writes
  - existing separators remain
  - RIG ASSEMBLY lightning remains
*/

(function(){
  if (window.__PN_SIDEBAR_IDENTITY_V1) return;
  window.__PN_SIDEBAR_IDENTITY_V1 = true;

  const NAV = {
    dashboard:  {label:"COMMAND ◈"},
    treasury:   {label:"WAR CHEST ¤"},
    analytics:  {label:"INTEL ⌖"},
    rigbuild:   {label:"RIG ASSEMBLY \u2692\uFE0E"},
    myrig:      {label:"MY RIG ◆"},
    projects:   {label:"BUILDS ▦"},
    inventory:  {label:"PARTS VAULT ⚙"},
    repairs:    {label:"REPAIR BAY ⊕"},
    roadto:     {label:"ROAD TO ➜"},
    sales:      {label:"LEDGER ▤"},
    mail:       {label:"MAIL ✉\uFE0E"},
    history:    {label:"ARCHIVE ⧉"},
    roulette:   {label:"THE ROULETTE ◉"},
    backup:     {label:"BLACKBOX ■"}
  };

  /* Canonical route labels. Internal keys and render functions remain untouched. */
  if (typeof ROUTES !== "undefined" && Array.isArray(ROUTES)){
    ROUTES.forEach(route=>{
      const spec = NAV[route.key];
      if (spec) route.label = spec.label;
    });
  }

  /*
    If the sidebar was already painted before this final extension loaded,
    update only its existing visible label text once. Future app renders use
    the updated ROUTES labels above.
  */
  if (typeof document !== "undefined"){
    document.querySelectorAll(".mainnav .navlink[data-route]").forEach(link=>{
      const key = link.getAttribute("data-route");
      const spec = NAV[key];
      if (spec && key !== "rigbuild") link.textContent = spec.label;
    });

    const style = document.createElement("style");
    style.id = "pn-sidebar-identity-v1";
    style.textContent = `
/* ============================================================
   PROFITNODE SIDEBAR IDENTITY V1
============================================================ */

/* Shared doctrine: identity color, restrained normal state, stronger hover. */
.mainnav .navlink{
  text-shadow:none;
}
.mainnav .navlink:hover{
  text-shadow:0 0 8px rgba(var(--pn-nav-rgb),.18);
}
.mainnav .navlink.active,
.mainnav .navlink.is-powered{
  text-shadow:0 0 9px rgba(var(--pn-nav-rgb),.27);
}

/* COMMAND ◈ — command-white */
.mainnav .navlink[data-route="dashboard"]{
  --pn-nav-color:#b7b6c2;
  --pn-nav-hover:#f0eef7;
  --pn-nav-accent:#d8d6e2;
  --pn-nav-rgb:216,214,226;
}

/* WAR CHEST ¤ — treasury green */
.mainnav .navlink[data-route="treasury"]{
  --pn-nav-color:#5e9d72;
  --pn-nav-hover:#a8e0ba;
  --pn-nav-accent:#78c091;
  --pn-nav-rgb:120,192,145;
}

/* INTEL ⌖ — recon cyan */
.mainnav .navlink[data-route="analytics"]{
  --pn-nav-color:#4fa2bc;
  --pn-nav-hover:#9de6f7;
  --pn-nav-accent:#62c7e5;
  --pn-nav-rgb:98,199,229;
}

/* RIG ASSEMBLY ⚒︎ — forge gold */
.mainnav .navlink[data-route="rigbuild"]{
  --pn-nav-color:#c69c38;
  --pn-nav-hover:#ffe28b;
  --pn-nav-accent:#f2c14e;
  --pn-nav-rgb:242,193,78;
}

/*
  Terminal Naming intentionally hides the real RIG ASSEMBLY text and paints
  its animated chrome label through :before. Keep that effect, add the icon.
*/
.mainnav .navlink[data-route="rigbuild"]:before{
  content:"RIG ASSEMBLY ⚒︎";
  color:#f2c14e;
  -webkit-text-fill-color:#f2c14e;
  filter:drop-shadow(0 0 3px rgba(242,193,78,.52))
         drop-shadow(0 0 8px rgba(242,193,78,.22));
}
.mainnav .navlink[data-route="rigbuild"]:after{
  background:#f2c14e;
  filter:drop-shadow(0 0 2px rgba(242,193,78,.9))
         drop-shadow(0 0 7px rgba(242,193,78,.62));
}
.mainnav .navlink[data-route="rigbuild"]:hover:before,
.mainnav .navlink[data-route="rigbuild"].active:before{
  filter:drop-shadow(0 0 4px rgba(242,193,78,.76))
         drop-shadow(0 0 11px rgba(242,193,78,.42));
}

/* MY RIG ◆ — Leviathan lavender/silver */
.mainnav .navlink[data-route="myrig"]{
  --pn-nav-color:#9589cf;
  --pn-nav-hover:#d5ccff;
  --pn-nav-accent:#b8a7ff;
  --pn-nav-rgb:184,167,255;
}

/* BUILDS ▦ — project blue */
.mainnav .navlink[data-route="projects"]{
  --pn-nav-color:#3f85d1;
  --pn-nav-hover:#8cc8ff;
  --pn-nav-accent:#4da3ff;
  --pn-nav-rgb:77,163,255;
}

/* PARTS VAULT ⚙ — industrial steel, LOCKED */
.mainnav .navlink[data-route="inventory"]{
  --pn-nav-color:#7e90a2;
  --pn-nav-hover:#cbd8e4;
  --pn-nav-accent:#9fb2c5;
  --pn-nav-rgb:159,178,197;
}

/* REPAIR BAY ⊕ — workbench orange */
.mainnav .navlink[data-route="repairs"]{
  --pn-nav-color:#b56d3e;
  --pn-nav-hover:#ffb071;
  --pn-nav-accent:#e58a4a;
  --pn-nav-rgb:229,138,74;
}

/* ROAD TO ➜ — progression magenta */
.mainnav .navlink[data-route="roadto"]{
  --pn-nav-color:#b35fa7;
  --pn-nav-hover:#f4a9e8;
  --pn-nav-accent:#d878c8;
  --pn-nav-rgb:216,120,200;
}

/* LEDGER ▤ — accounting teal */
.mainnav .navlink[data-route="sales"]{
  --pn-nav-color:#5f918b;
  --pn-nav-hover:#a7d9d1;
  --pn-nav-accent:#79b7ae;
  --pn-nav-rgb:121,183,174;
}

/* MAIL ✉︎ — retain alert-red identity */
.mainnav .navlink[data-route="mail"]{
  --pn-nav-color:#b94b58;
  --pn-nav-hover:#e97f89;
  --pn-nav-accent:#d85a6a;
  --pn-nav-rgb:216,90,106;
}

/* ARCHIVE ⧉ — archival gray */
.mainnav .navlink[data-route="history"]{
  --pn-nav-color:#6f6e7a;
  --pn-nav-hover:#b9b8c4;
  --pn-nav-accent:#858493;
  --pn-nav-rgb:133,132,147;
}

/* THE ROULETTE ◉ — retain special purple identity */
.mainnav .navlink[data-route="roulette"]{
  --pn-nav-color:#a05db7;
  --pn-nav-hover:#e4a4f2;
  --pn-nav-accent:#c071d8;
  --pn-nav-rgb:192,113,216;
}

/* BLACKBOX ■ — deliberately subdued dark steel */
.mainnav .navlink[data-route="backup"]{
  --pn-nav-color:#5a6273;
  --pn-nav-hover:#a7afbe;
  --pn-nav-accent:#697386;
  --pn-nav-rgb:105,115,134;
}

/* Active rows get the route's own color wash through the existing core rule. */
.mainnav .navlink.active,
.mainnav .navlink.is-powered{
  border-left-color:var(--pn-nav-accent);
}

/* Keep the industrial icons textual, not colorful emoji. */
.mainnav .navlink{
  font-variant-emoji:text;
}

@media (prefers-reduced-motion:reduce){
  .mainnav .navlink{
    transition:none;
  }
}
`;
    document.head.appendChild(style);
  }
})();
