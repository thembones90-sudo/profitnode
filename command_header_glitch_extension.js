"use strict";

/*
  PROFITNODE COMMAND header upgrade.

  Dashboard / COMMAND becomes:
  - WELCOME BACK, COMMANDER
  - BATTLE CONTROLS ONLINE
  with restrained glitch and flicker styling.
*/

(function installCommandHeaderGlitch(){
  if (typeof pageHeader === "function"){
    const PNCorePageHeaderCommandGlitch = pageHeader;

    pageHeader = function(title,subtitle,actionHtml){
      const key = String(title || "").trim().toUpperCase();

      if (key === "DASHBOARD" || key === "COMMAND" || key === "THE COMMAND" || key === "WELCOME BACK, COMMANDER"){
        title = "WELCOME BACK, COMMANDER";
        const freshness = typeof window.pnCommandFreshnessHtml === "function" ? window.pnCommandFreshnessHtml() : "";
        subtitle = '<span class="pn-battle-controls" data-text="BATTLE CONTROLS ONLINE">BATTLE CONTROLS ONLINE</span>'+freshness;
      }

      return PNCorePageHeaderCommandGlitch(title,subtitle,actionHtml);
    };
  }

  const style = document.createElement("style");
  style.textContent = `
  .pn-battle-controls{
    position:relative;
    display:inline-block;
    text-transform:uppercase;
    letter-spacing:.12em;
    font-weight:800;
    color:#d9d2e8;
    text-shadow:
      0 0 8px rgba(168,85,247,.18),
      0 0 12px rgba(255,58,105,.10);
    animation:pnBattleFlicker 3.2s infinite steps(1,end);
  }

  .pn-battle-controls:before,
  .pn-battle-controls:after{
    content:attr(data-text);
    position:absolute;
    left:0;
    top:0;
    pointer-events:none;
    opacity:.35;
    mix-blend-mode:screen;
  }

  .pn-command-updated{
    display:inline-flex;
    align-items:center;
    gap:5px;
    margin-left:11px;
    padding-left:11px;
    border-left:1px solid rgba(216,222,232,.22);
    color:#8f8998;
    font-family:var(--mono);
    font-size:8px;
    font-weight:600;
    letter-spacing:.08em;
    white-space:nowrap;
    vertical-align:1px;
  }

  .pn-command-updated i{
    width:4px;
    height:4px;
    border-radius:50%;
    background:#77717e;
  }

  .pn-command-updated time{color:#bdb7c5}
  .pn-command-updated.is-fresh{animation:pnCommandFresh 2.2s ease-out}
  .pn-command-updated.is-fresh i{background:var(--green);box-shadow:0 0 8px rgba(62,207,126,.72)}

  @keyframes pnCommandFresh{
    0%,22% { color:var(--green);text-shadow:0 0 8px rgba(62,207,126,.28); }
    100% { color:#8f8998;text-shadow:none; }
  }

  @media (max-width:620px){
    .pn-command-updated{display:flex;margin:4px 0 0;padding:0;border-left:0}
  }

  .pn-battle-controls:before{
    color:#ff4a78;
    transform:translate(1px,0);
    animation:pnBattleGlitchA 1.8s infinite steps(2,end);
  }

  .pn-battle-controls:after{
    color:#a855f7;
    transform:translate(-1px,0);
    animation:pnBattleGlitchB 2.1s infinite steps(2,end);
  }

  @keyframes pnBattleFlicker{
    0%,8%,10%,22%,24%,56%,100% { opacity:1; }
    9%,23% { opacity:.55; }
    57% { opacity:.72; }
    58% { opacity:.95; }
    59% { opacity:.64; }
    60% { opacity:1; }
    84% { opacity:.82; }
    85% { opacity:1; }
  }

  @keyframes pnBattleGlitchA{
    0%,72%,100% { clip-path:inset(0 0 0 0); transform:translate(1px,0); }
    73% { clip-path:inset(12% 0 68% 0); transform:translate(3px,-1px); }
    74% { clip-path:inset(54% 0 18% 0); transform:translate(-2px,1px); }
    75% { clip-path:inset(82% 0 4% 0); transform:translate(2px,0); }
    76% { clip-path:inset(0 0 0 0); transform:translate(1px,0); }
  }

  @keyframes pnBattleGlitchB{
    0%,64%,100% { clip-path:inset(0 0 0 0); transform:translate(-1px,0); }
    65% { clip-path:inset(8% 0 74% 0); transform:translate(-3px,1px); }
    66% { clip-path:inset(46% 0 28% 0); transform:translate(2px,-1px); }
    67% { clip-path:inset(76% 0 6% 0); transform:translate(-2px,0); }
    68% { clip-path:inset(0 0 0 0); transform:translate(-1px,0); }
  }
  `;
  document.head.appendChild(style);
})();
