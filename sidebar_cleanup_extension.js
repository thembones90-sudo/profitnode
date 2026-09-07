"use strict";

(function () {
  const KNOWN_LABELS = [
    "COMMAND", "INTEL", "RIG BENCH", "BUILDS", "PARTS VAULT",
    "REPAIR BAY", "THE HUNT", "LEDGER", "ARCHIVE", "THE ROULETTE",
    "BLACKBOX", "DASHBOARD", "ANALYTICS", "PROJECTS", "INVENTORY",
    "REPAIRS", "DEALS", "SALES", "HISTORY", "BACKUP"
  ];

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasKnownLabel(text) {
    const upper = normalizeText(text).toUpperCase();
    return KNOWN_LABELS.some(label => upper.includes(label));
  }

  function findSidebar() {
    const selectors = [
      "aside",
      "nav",
      ".sidebar",
      "[class*='sidebar']",
      "[class*='side-nav']",
      "[class*='sidenav']"
    ];

    const candidates = [];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => candidates.push(el));
    });

    return candidates.find(el => {
      const text = normalizeText(el.textContent);
      return /PROFITNODE/i.test(text) && /THE ROULETTE|PARTS VAULT|COMMAND|RIG BENCH/i.test(text);
    }) || null;
  }

  function hideElement(el) {
    if (!el) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("max-height", "0", "important");
    el.style.setProperty("overflow", "hidden", "important");
    el.setAttribute("data-pn-sidebar-cleanup", "hidden");
  }

  function removeShopIdentity(sidebar) {
    const elements = Array.from(sidebar.querySelectorAll("*"));

    const shopEl = elements.find(el => normalizeText(el.textContent).toUpperCase() === "SHADEZY REPAIR SHOP");
    if (!shopEl) return;

    hideElement(shopEl);

    let prev = shopEl.previousElementSibling;
    let steps = 0;
    while (prev && steps < 4) {
      const text = normalizeText(prev.textContent);
      const rect = prev.getBoundingClientRect();
      const style = window.getComputedStyle(prev);

      const looksLikeRule =
        text.length === 0 &&
        (
          rect.height <= 12 ||
          parseFloat(style.borderTopWidth || "0") > 0 ||
          parseFloat(style.borderBottomWidth || "0") > 0 ||
          /line|rule|divider|accent/i.test(prev.className || "")
        );

      if (looksLikeRule) {
        hideElement(prev);
        break;
      }

      prev = prev.previousElementSibling;
      steps += 1;
    }
  }

  function cleanNavItem(item) {
    if (!hasKnownLabel(item.textContent)) return;

    Array.from(item.children).forEach(child => {
      const text = normalizeText(child.textContent);
      if (/^\d{1,2}$/.test(text)) {
        hideElement(child);
      }
    });

    Array.from(item.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent.replace(/^\s*\d{1,2}\s+/, "");
      }
    });

    if (item.children.length === 1) {
      const child = item.children[0];
      const childText = child.textContent || "";
      const updatedChildText = childText.replace(/^\s*\d{1,2}\s+/, "");
      if (updatedChildText !== childText) {
        child.textContent = updatedChildText;
      }
    } else if (item.children.length === 0) {
      const itemText = item.textContent || "";
      const updatedItemText = itemText.replace(/^\s*\d{1,2}\s+/, "");
      if (updatedItemText !== itemText) {
        item.textContent = updatedItemText;
      }
    }

    item.style.setProperty("gap", "0.55rem");
  }

  function removeNavNumbers(sidebar) {
    const navItems = Array.from(
      sidebar.querySelectorAll("a, button, li, [role='button'], .nav-item, .menu-item, .sidebar-item")
    );

    navItems.forEach(cleanNavItem);
  }

  function injectStyles() {
    if (document.getElementById("pn-sidebar-cleanup-style")) return;

    const style = document.createElement("style");
    style.id = "pn-sidebar-cleanup-style";
    style.textContent = `
      [data-pn-sidebar-cleanup="hidden"] {
        display: none !important;
        visibility: hidden !important;
        max-height: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  function runSidebarCleanup() {
    injectStyles();
    const sidebar = findSidebar();
    if (!sidebar) return;
    removeShopIdentity(sidebar);
    removeNavNumbers(sidebar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSidebarCleanup, { once: true });
  } else {
    runSidebarCleanup();
  }

  let passes = 0;
  const timer = setInterval(() => {
    runSidebarCleanup();
    passes += 1;
    if (passes >= 30) clearInterval(timer);
  }, 500);

  const startObserver = () => {
    if (!document.body) return;
    const observer = new MutationObserver(() => runSidebarCleanup());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();