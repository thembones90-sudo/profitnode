"use strict";

/*
  PROFITNODE — keep scroll position across re-renders.

  Every action calls render(), which rebuilds #root with innerHTML. That
  recreates the scroll container (.content on desktop, the window on narrow
  screens), so any click — SWAP, EDIT PRICE, a filter, a toggle — threw the
  user back to the top of the page. This wraps render(): when the user is
  still on the same view (same route and same open build / rig / family),
  the previous scroll offset is restored; moving to a different view still
  starts at the top. If a render opens the Build Workspace part picker (SWAP
  / + ADD), the picker is brought into view so it isn't opened off-screen.
*/
(function installScrollPreserveV1(){
  if (typeof render !== "function" || render.__pnScrollPreserveV1) return;

  const viewKey = () => {
    if (typeof state === "undefined" || !state) return "";
    const draft = state.rigDraft;
    return [state.route, state.pbId || "", draft ? (draft.id || "new") : "", state.rigFamilyView || ""].join("|");
  };
  const scroller = () => document.querySelector("#root .content");
  const picker = () => document.querySelector("[data-pb-picker]");

  const baseRender = render;
  const wrappedRender = function(){
    const keyBefore = viewKey();
    const box = scroller();
    const boxTop = box ? box.scrollTop : 0;
    const winTop = window.scrollY || 0;
    const hadPicker = !!picker();

    const result = baseRender.apply(this, arguments);

    if (keyBefore && keyBefore === viewKey()){
      const next = scroller();
      if (next && boxTop) next.scrollTop = boxTop;
      if (winTop) window.scrollTo(0, winTop);
      const opened = picker();
      if (opened && !hadPicker && typeof opened.scrollIntoView === "function"){
        try { opened.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) { opened.scrollIntoView(false); }
      }
    }
    return result;
  };
  wrappedRender.__pnScrollPreserveV1 = true;
  render = wrappedRender;
})();
