# PROFITNODE — Agent Guide

## What this is

Single-page browser app for a PC-flipping/inventory ledger ("Shadezy Repair Shop"). No backend, no build system, no npm — vanilla JS, local-first on `localStorage`.

## Architecture

- `index.html` — single HTML shell, loads `pn_scripts.js` then `app.js` via `<script>` tags
- `app.js` — **loader only**, uses `document.write()` to inject the scripts listed in `window.__PN_SCRIPTS` in order. The real entry point is `app_core.js`.
- `pn_scripts.js` — **canonical script manifest**: defines `window.__PN_SCRIPTS` (source order + `?v=` cache-busting suffixes). The browser loader (`app.js`) and the Node test harness both consume this single list — never maintain a second copy of the order.
- `app_core.js` — core data model, Store, Actions, rendering, and UI (~755 lines)
- `*_extension.js` files — feature modules loaded after core. Each appends to the global namespace. Load order matters.
- `profitnode_*_catalog_v1.json` — hardware catalogs fetched at runtime by `loadHardwareCatalog()`
- `assets/roulette/` — image assets for the Roulette feature, referenced by manifest JSONs

## Tests (zero deps)

All tests use Node's `vm` module to run every file in `window.__PN_SCRIPTS` in a sandboxed context with browser shims. No `node_modules`, no test framework. The harness lives in `pn_test_env.js`.

```bash
node smoketest.js && node rendertest.js && node hardwaretest.js
node browsertest.js
```

Run all four suites. They test the exact unminified code that deploys. `browsertest.js` additionally boots a real Chrome/Edge against a local static server and takes a minute; it can be skipped on machines without a browser.

## Editing rules

- **Edit `app.js`, `pn_scripts.js` or any extension, never `app.min.js` by hand.** There is no minification pipeline — the unminified source is the runtime, by design.
- **Load order is critical.** `pn_scripts.js` defines the canonical script injection order via `window.__PN_SCRIPTS`. Extensions must load after `app_core.js` and in the sequence listed.
- All modules write to globals (no ES modules, no bundler). When adding functions, follow the existing global pattern.
- The CSS lives inline in `index.html` (single dark theme, no light mode by design).

## Data model

- Primary key: `localStorage` key `profitnode_ledger_v1` (legacy fallback: `shadezy_ledger_v1`)
- Ledger shape: `{ meta, projects, inventory, deals, sales, timeline, plans, repairs, rigs, roadTo, myRig }` (roadTo = ROAD TO savings quest goals; myRig = single personal-rig profile object, e.g. `{name, slots, history, health}`, or null)
- The MY RIG tab (`my_rig_extension.js`, loads after `road_to_extension.js`) tracks the owner's personal PC separately from shop records. Its optional Compatibility Summary reuses the RIG ASSEMBLY Build Check pipeline (`buildCheckModel`/`catalogFind`) but hides generic UNVERIFIED findings, showing only WARN/FAIL rows plus a verdict chip. ROAD TO goals can carry a `targetSlot`; at 100% the quest offers INSTALL INTO MY RIG (replaces the slot, logs an upgrade-history entry, closes the quest as PURCHASED, and the user chooses whether the replaced part moves to PARTS VAULT).
- `Store` object handles all persistence. `Actions` object handles business logic.
- Full JSON backup + CSV export/import is built into the app.

## Deploy

Vercel static hosting, Vercel team `team_p26UJZ9MgenN71TjBdHzUeMo`. Only git-linked deployments persist; API file-upload deploys get garbage-collected. See `HANDOFF.md` for full deployment history and blockers.

## Gotchas

- `app.js` uses `document.write()` to inject all scripts — this is intentional and the only loading mechanism. It reads the manifest from `window.__PN_SCRIPTS` (set by `pn_scripts.js`).
- **Whenever you edit a runtime script, bump its `?v=` suffix in `pn_scripts.js`.** Browsers cache scripts by that suffix, so a stale version silently serves old behavior (this has bitten before).
- Hardware catalogs are fetched at runtime from sibling JSON files, not bundled. They must be served alongside the HTML/JS.
- Currencies are hardcoded: RSD and EUR with a fixed exchange rate of 117.5.
- The app uses `crypto.randomUUID()` — tests shim this.
- No TypeScript, no linting, no formatter config exists. Match existing code style (compact, semicolons, `"use strict"`, no comments in production code).
