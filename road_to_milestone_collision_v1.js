"use strict";
/*
  PROFITNODE — ROAD TO milestone/marker collision fix v1.

  road_to_premium_extension.js renders two independent diamond markers
  on each progress track: a 14px glowing "you are here" marker at the
  exact saved% (.pn-rt-marker), and four fixed 8px milestone ticks at
  0/25/50/75/100% (.pn-rt-track>span>em). Both are positioned purely
  by percentage with no awareness of each other, so whenever progress
  lands near (but not on) a milestone - a very common case, roughly a
  third of all possible percentages given the 25%-spaced ticks - the
  two diamonds crowd into each other and read as a rendering glitch.

  Fix: after each render, measure the real on-screen gap between the
  marker and each tick (getBoundingClientRect, not a guessed % band -
  the same lesson as the earlier BLOODWORKS rail/text overlap: derive
  from actual geometry, verify, don't eyeball a couple of widths) and
  hide a tick's diamond only when it would visually crowd the marker.
  The tick's "25%"-style label stays - only the duplicate shape goes,
  since the marker itself already shows the precise position.

  Display-only, runs on every ROAD TO render (any number of tracks:
  the feature card, the dossier, and every grid card each have one)
  and on resize, since track width is responsive.
*/
(function installRoadToMilestoneCollisionV1(){
  if (typeof document === "undefined") return;
  if (window.__PN_ROAD_TO_MILESTONE_COLLISION_V1__) return;
  window.__PN_ROAD_TO_MILESTONE_COLLISION_V1__ = true;

  var GLOW_BUFFER = 10; // px of breathing room beyond the two shapes' own half-widths

  var style = document.createElement("style");
  style.id = "pn-road-to-milestone-collision-v1";
  style.textContent = ".pn-rt-track>span.is-crowded em{opacity:0}";
  document.head.appendChild(style);

  function declutterTrack(track){
    var marker = track.querySelector(".pn-rt-marker");
    if (!marker) return;
    var mRect = marker.getBoundingClientRect();
    if (!mRect.width) return; // track not laid out yet (e.g. display:none ancestor)
    var mCenter = mRect.left + mRect.width / 2;
    var ticks = track.querySelectorAll(":scope > span");
    for (var i = 0; i < ticks.length; i++){
      var tick = ticks[i];
      var em = tick.querySelector("em");
      if (!em) continue;
      var eRect = em.getBoundingClientRect();
      var eCenter = eRect.left + eRect.width / 2;
      var gap = Math.abs(mCenter - eCenter);
      var threshold = (mRect.width / 2) + (eRect.width / 2) + GLOW_BUFFER;
      if (gap < threshold) tick.classList.add("is-crowded");
      else tick.classList.remove("is-crowded");
    }
  }

  function declutterAll(){
    document.querySelectorAll(".pn-rt-track").forEach(declutterTrack);
  }

  var scheduled = false;
  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; declutterAll(); });
  }

  var resizeTimer = null;
  window.addEventListener("resize", function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(schedule, 120);
  });

  var observer = new MutationObserver(function(mutations){
    for (var i = 0; i < mutations.length; i++){
      if (mutations[i].type === "childList"){ schedule(); return; }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
})();
