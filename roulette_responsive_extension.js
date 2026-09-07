"use strict";

/*
  PROFITNODE THE ROULETTE - RESPONSIVE CHAMBER v6
  Makes the cursed page scale live with viewport width and height.
  Visual/layout only. No roulette logic or accounting changes.
*/

(function installRouletteResponsiveChamber(){
  const root = document.documentElement;
  let raf = 0;

  function clamp(min,value,max){
    return Math.max(min,Math.min(value,max));
  }

  function updateRouletteViewport(){
    cancelAnimationFrame(raf);

    raf = requestAnimationFrame(function(){
      const page = document.querySelector(".pn-r3-content");
      const body = document.body;

      if (!page){
        body.classList.remove("pn-roulette-open","pn-roulette-compact","pn-roulette-tight");
        return;
      }

      body.classList.add("pn-roulette-open");

      const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      const vh = window.innerHeight || document.documentElement.clientHeight || 900;
      const grid = page.querySelector(".pn-r3-wheel-grid");
      const gridWidth = grid ? grid.getBoundingClientRect().width : page.getBoundingClientRect().width;
      const twoColumns = vw > 880;
      const panelWidth = twoColumns ? Math.max(260,(gridWidth-16)/2) : Math.max(260,gridWidth);

      /*
        Width constraint keeps the wheel inside its panel.
        Height constraint is the missing piece from the previous fixed layout:
        short browser windows now physically shrink the machine instead of
        merely cutting the lower half off like some barbaric viewport guillotine.
      */
      const byWidth = panelWidth * 0.50;
      const byHeight = vh * 0.31;
      const wheel = clamp(178,Math.min(byWidth,byHeight,310),310);

      root.style.setProperty("--pn-roulette-wheel-size",wheel.toFixed(1)+"px");
      root.style.setProperty("--pn-roulette-vh",vh+"px");

      body.classList.toggle("pn-roulette-compact",vh < 900);
      body.classList.toggle("pn-roulette-tight",vh < 730);
    });
  }

  window.addEventListener("resize",updateRouletteViewport,{passive:true});

  if (window.ResizeObserver){
    const observer = new ResizeObserver(updateRouletteViewport);
    observer.observe(document.documentElement);
  }

  const mutation = new MutationObserver(updateRouletteViewport);
  mutation.observe(document.body,{childList:true,subtree:true});

  updateRouletteViewport();

  const style = document.createElement("style");

  style.textContent = `
  /*
    CRITICAL:
    The cursed visual layer used overflow:hidden. Pretty, yes. Also capable of
    eating the lower half of the page when the viewport became shorter.
  */
  body.pn-roulette-open{
    overflow-y:auto !important;
  }

  body.pn-roulette-open .pn-r3-content{
    overflow-x:hidden !important;
    overflow-y:visible !important;
    min-width:0 !important;
    padding-bottom:clamp(14px,2vh,26px) !important;
  }

  body.pn-roulette-open .pn-r3-wheel-grid{
    grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important;
    gap:clamp(9px,1vw,16px) !important;
    align-items:stretch;
    min-width:0;
  }

  body.pn-roulette-open .pn-r3-panel{
    min-width:0;
  }

  body.pn-roulette-open .pn-r3-wheel-shell{
    width:var(--pn-roulette-wheel-size,300px) !important;
    max-width:calc(100% - 26px) !important;
  }

  body.pn-roulette-open .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,300px) + 106px) !important;
    height:auto !important;
    padding-top:clamp(8px,1.4vh,14px) !important;
    padding-bottom:clamp(9px,1.5vh,14px) !important;
    gap:clamp(8px,1.2vh,12px) !important;
  }

  body.pn-roulette-open .pn-r3-spin{
    min-width:clamp(178px,34%,224px) !important;
    min-height:clamp(34px,4.5vh,42px) !important;
  }

  body.pn-roulette-open .pn-r3-header,
  body.pn-roulette-open .pn-r3-stats,
  body.pn-roulette-open .pn-r3-stage-strip,
  body.pn-roulette-open .pn-r3-tabs,
  body.pn-roulette-open .pn-r3-controls,
  body.pn-roulette-open .pn-r3-wheel-grid,
  body.pn-roulette-open .pn-r3-result-zone,
  body.pn-roulette-open .pn-omnissiah-blessing,
  body.pn-roulette-open .pn-machine-litany,
  body.pn-roulette-open .pn-curse-rail{
    margin-bottom:clamp(7px,1.25vh,14px) !important;
  }

  body.pn-roulette-open .pn-r3-stats>div{
    min-height:clamp(68px,9vh,102px) !important;
    padding:
      clamp(9px,1.4vh,15px)
      clamp(12px,1.3vw,20px) !important;
  }

  body.pn-roulette-open .pn-r3-stats b{
    font-size:clamp(18px,2vw,25px) !important;
  }

  body.pn-roulette-open .pn-r3-net b{
    font-size:clamp(24px,3vw,42px) !important;
  }

  body.pn-roulette-open .pn-r3-stage-strip>div{
    min-height:clamp(31px,4.1vh,42px) !important;
    padding:
      clamp(5px,.8vh,8px)
      clamp(7px,.8vw,11px) !important;
  }

  body.pn-roulette-open .pn-r3-tabs button{
    padding:
      clamp(7px,.9vh,10px)
      clamp(10px,1vw,16px) !important;
  }

  body.pn-roulette-open .pn-r3-controls input,
  body.pn-roulette-open .pn-r3-controls select,
  body.pn-roulette-open .pn-r3-result-form input,
  body.pn-roulette-open .pn-r3-result-form select{
    min-height:clamp(32px,4vh,38px) !important;
  }

  body.pn-roulette-open .pn-r3-result-zone{
    min-height:clamp(72px,10vh,98px) !important;
    padding:clamp(10px,1.35vh,16px) !important;
  }

  body.pn-roulette-open .pn-omnissiah-blessing{
    min-height:clamp(30px,4.5vh,42px) !important;
    padding:
      clamp(4px,.8vh,7px)
      clamp(9px,1vw,14px) !important;
  }

  body.pn-roulette-open .pn-curse-rail span{
    min-height:clamp(22px,3vh,28px) !important;
  }

  body.pn-roulette-open .pn-machine-litany span{
    min-height:clamp(20px,2.8vh,25px) !important;
  }

  /*
    SHORT DESKTOP WINDOWS
    Keep the whole ritual materially visible before resorting to scrolling.
  */
  body.pn-roulette-compact .pn-r3-header{
    min-height:45px !important;
    padding:9px 13px !important;
  }

  body.pn-roulette-compact .pn-r3-stats>div{
    min-height:64px !important;
  }

  body.pn-roulette-compact .pn-r3-stage-strip>div{
    min-height:30px !important;
  }

  body.pn-roulette-compact .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,250px) + 88px) !important;
  }

  body.pn-roulette-compact .pn-r3-protocol-key{
    padding-top:5px !important;
    gap:3px 8px !important;
  }

  body.pn-roulette-compact .pn-r3-protocol-key span{
    font-size:6.4px !important;
  }

  body.pn-roulette-compact .pn-omnissiah-blessing b{
    font-size:9px !important;
  }

  body.pn-roulette-compact .pn-omnissiah-blessing span,
  body.pn-roulette-compact .pn-curse-rail span{
    font-size:6.2px !important;
  }

  /*
    VERY SHORT WINDOWS
    Nothing disappears. We simply compress the ceremony harder.
  */
  body.pn-roulette-tight .pn-r3-header{
    min-height:38px !important;
    padding:7px 11px !important;
  }

  body.pn-roulette-tight .pn-r3-header span,
  body.pn-roulette-tight .pn-r3-header small{
    font-size:7px !important;
  }

  body.pn-roulette-tight .pn-r3-header b{
    font-size:13px !important;
  }

  body.pn-roulette-tight .pn-r3-stats>div{
    min-height:52px !important;
    padding:7px 11px !important;
  }

  body.pn-roulette-tight .pn-r3-stage-strip>div{
    min-height:26px !important;
    padding:4px 6px !important;
  }

  body.pn-roulette-tight .pn-r3-stage-strip b{
    font-size:6.6px !important;
  }

  body.pn-roulette-tight .pn-r3-tabs button{
    padding:6px 10px !important;
    min-width:115px !important;
  }

  body.pn-roulette-tight .pn-machine-litany span{
    min-height:18px !important;
    font-size:5.7px !important;
  }

  body.pn-roulette-tight .pn-curse-rail span{
    min-height:19px !important;
    font-size:5.7px !important;
  }

  body.pn-roulette-tight .pn-r3-stage{
    min-height:calc(var(--pn-roulette-wheel-size,210px) + 76px) !important;
  }

  body.pn-roulette-tight .pn-r3-result-zone{
    min-height:62px !important;
  }

  /*
    NARROW WINDOWS
    Two wheels cannot remain side by side forever without violating geometry.
    Stack them, preserve the full controls, and allow normal vertical scrolling.
  */
  @media(max-width:880px){
    body.pn-roulette-open .pn-r3-wheel-grid{
      grid-template-columns:1fr !important;
    }

    body.pn-roulette-open .pn-r3-controls{
      grid-template-columns:minmax(0,1fr) minmax(120px,180px) !important;
    }

    body.pn-roulette-open .pn-r3-wheel-shell{
      max-width:min(78vw,310px) !important;
    }
  }

  @media(max-width:680px){
    body.pn-roulette-open .pn-r3-header,
    body.pn-roulette-open .pn-omnissiah-blessing{
      grid-template-columns:1fr !important;
      text-align:left;
    }

    body.pn-roulette-open .pn-r3-header small,
    body.pn-roulette-open .pn-omnissiah-blessing span:last-child{
      text-align:left !important;
    }

    body.pn-roulette-open .pn-r3-stats,
    body.pn-roulette-open .pn-r3-controls{
      grid-template-columns:1fr !important;
    }

    body.pn-roulette-open .pn-r3-stats>div{
      border-right:0 !important;
      border-bottom:1px solid rgba(147,92,193,.45);
    }

    body.pn-roulette-open .pn-r3-stats>div:last-child{
      border-bottom:0;
    }

    body.pn-roulette-open .pn-r3-stage-strip{
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    }

    body.pn-roulette-open .pn-r3-stage-strip>div{
      border-bottom:1px solid rgba(147,92,193,.24);
    }

    body.pn-roulette-open .pn-curse-rail,
    body.pn-roulette-open .pn-machine-litany{
      grid-template-columns:1fr 1fr !important;
    }

    body.pn-roulette-open .pn-r3-result-zone{
      flex-direction:column !important;
      align-items:flex-start !important;
    }
  }
  `;

  document.head.appendChild(style);
})();
