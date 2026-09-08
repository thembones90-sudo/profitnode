"use strict";

(function () {
  function runSidebarCleanup() {
    const shop = document.querySelector(".sidebar .brand-shop");
    if (!shop) return false;
    shop.style.setProperty("display", "none", "important");
    shop.style.setProperty("visibility", "hidden", "important");
    shop.setAttribute("data-pn-sidebar-cleanup", "hidden");
    return true;
  }

  window.__pnSidebarCleanup = runSidebarCleanup;
  const coreRender = render;
  render = function () {
    const result = coreRender.apply(this, arguments);
    runSidebarCleanup();
    return result;
  };

  if (document.readyState !== "loading") runSidebarCleanup();
})();
