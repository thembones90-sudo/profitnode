# PROFITNODE Budget Command Center: Implementation Report (2026-11-04)

Branch `feat/budget-command-center-20261104` in the sandbox worktree `A:\PROFITNODE-BUDGET-COMMAND`. The changes are left as an uncommitted diff for review. Nothing was pushed or deployed, and neither `A:\PROFITNODE` nor any live ledger was touched.

## What changed for the user

### Every new build needs a budget
| Creation path | Behaviour |
|---|---|
| RIG ASSEMBLY **NEW RIG** / new variant | The draft opens with an orange **REQUIRED** chip, and the budget input is focused straight away. SAVE, ASSEMBLE, DISASSEMBLE and MARK SOLD are blocked until there's a valid budget. When blocked, the input gets an inline error with `role="alert"` and `aria-invalid`, plus an error notice, and receives focus. The draft is never lost. |
| RIG **DUPLICATE** | If the source has a budget, the copy keeps the budget, mode, currency and target margin. If the source has no budget, the copy opens as an **unsaved draft** that must be given a budget. Nothing is inserted without one. |
| **NEW PROJECT** form | Takes a **Build Budget (required)** in the project currency and a **Budget Mode** (NEW CASH by default). Empty, zero, negative, non-numeric and Infinity values are refused, with an inline message, `setCustomValidity` and focus on the field. |
| Blueprint deploy (uncommon and rare) | The blueprint's hard cap (23.500 RSD / 40.000 RSD) becomes the required budget in TOTAL COST mode. If a blueprint ever has no cap, the deploy uses the sum of its priced parts. If that is also zero, the deploy is refused. Note: both blueprint scripts are still *dormant* (excluded from the runtime manifest), so this only takes effect once they're re-enabled. |

Validation rejects these values with no silent coercion: empty, `0`, `0,00`, negative, `abc`, `12abc`, `NaN`, `Infinity`, `1e999`, anything over 1e9 RSD, and unknown currencies. European formats such as `58.750` and `1.234,56` are accepted.

### Budget modes, side by side
- **NEW CASH SPEND** counts only money still to be spent (rigs) or paid for this build (projects: parts bought for the project plus additional costs). Owned or reused Vault parts are shown, but as "sunk / not counted".
- **TOTAL COST BASIS** counts the true landed cost: owned/reused basis plus planned purchases plus reserves.
- A one-line explanation of each mode sits next to the selector. Projects also have a mode chip whose tooltip carries the same explanation.

### RIG ASSEMBLY budget rail
This is the same compact strip as before, with the same 5 → 3 → 2 → 1 column layout. It now includes:
- an amount field, a currency selector and a REQUIRED chip;
- the mode selector with a status chip (`WITHIN PARAMETERS`, `NEAR LIMIT`, `OVER BUDGET` or `BUDGET REQUIRED`) and help text;
- OWNED BASIS ("counted" or "sunk · not new cash"), PLANNED CASH (with an **N unpriced** warning) and AVAILABLE/OVER (with the committed total);
- a segmented meter (hatched owned segment, planned segment, an **80% warning tick**, and a red limit marker when over), exposed as a `progressbar`;
- a status line with `role="status"` and `aria-live="polite"`;
- a collapsible **COST LEDGER · SALE OUTLOOK** section, closed by default, with a per-part list (OWNED / PLANNED / UNPRICED and each part's share of the limit) and the sale outlook:
  - TARGET SALE (the rig's Expected Sale Price);
  - BREAK-EVEN (true basis);
  - PROJECTED PROFIT and MARGIN, both on true basis;
  - CASH BACK AFTER NEW SPEND (target minus planned cash).

  When there's no sale price, the outlook shows only a labelled suggestion from the rig's Target Margin %. When neither exists, it shows a prompt instead. No price is ever invented.

### Build Workspace (projects)
- **FISCAL OPS** (in COST DETAILS) and the **BUDGET** tile now read one shared model, so they can't disagree. Both show the mode.
- In NEW CASH mode, the "spent" figure becomes **PAID CASH**. Reused parts appear as **REUSED · NOT COUNTED** (struck through) and are left out of the bar.
- The gauge marks 25%, 50% and the **80% warning line**.
- A **SALE OUTLOOK** strip appears when a listing price or estimated market value exists. It shows break-even on projected basis (basis + planned + reserves), projected profit, margin and cash back.
- The per-part ledger is collapsible and open by default when there are 10 rows or fewer.
- Accessible banners at the top of the page:
  - `OVER BUDGET` (`role="alert"`);
  - `PLANNED BREACH` and `NEAR LIMIT` (`role="status"`);
  - `BUDGET REQUIRED`, for a policy project that somehow lacks a budget.
- Warnings never block adding parts or selling.

### Currency safety
- **Rigs**: the budget is stored in canonical RSD. EUR/RSD only changes how it's entered and displayed, so 500 EUR is stored as 58.750 RSD.
- **Projects**: if EDIT DETAILS changes the project currency while the budget is unchanged, the budget is converted. For example, 23.500 RSD becomes €200. A budget the user retypes during the same edit is taken as entered. Reserve allocations with no currency are pinned to the old currency so their meaning stays the same.

## Compatibility (legacy data is untouched)
- There's no migration. Old rigs with no budget show **SET LIMIT** and save normally. Old rigs without a mode default to NEW CASH, as before.
- Old projects without a mode default to **TOTAL COST**, so today's numbers are identical. The smoke test's existing FISCAL OPS assertions pass unchanged.
- Old projects can still be edited with the budget left empty. A budget can't be cleared on records marked `budgetRequired`.
- Enforcement runs **only at UI entry points**. `Actions.addProject`, `Store.insert`, `Actions.duplicateRig` (which now also copies the budget fields), and a programmatic `newRigDraft` + `saveRigDraft` stay legacy-compatible for migrations, imports and tests. JSON/CSV backups carry the new fields as ordinary properties.
- MY RIG and inventory items are not affected.

## Files
| File | Change |
|---|---|
| `build_budget_model.js` (new) | Shared `PN_BUDGET`: parse/validate, `rigModel`, `projectModel`, tone rules (warn at ≥80%, over above 100%), currency patch. |
| `rig_assembly_compact_extension.js` | Rail redesign, input validation, UI save guard (capture-phase), budget-safe duplicate, `budgetRequired` on UI-created drafts. |
| `project_budget_extension.js` | Required form field, mode select, submit validation, currency-safe `updateProject`, model-driven tile/alerts/FISCAL OPS/sale outlook. Folds in the legacy display, so there's one set of numbers. |
| `pn_scripts.js` | Adds `build_budget_model.js` before `project_budget_extension.js` and bumps `?v=` on both modified runtime scripts (`budget-command-v1-20261104`). |
| `profit_blueprints_v1.js`, `profit_blueprints_rare_v3.js` | Deploys seed the cap as the budget (dormant scripts, so no manifest entry). |
| `budgetcommandtest.js` (new) | 100 assertions. |
| `rigassemblycompacttest.js` | New rigs now start with a `null` limit instead of 0. |
| `rigassemblycompactbrowsertest.js` | Adds a real-click guard test, negative-input refusal, a 390px check with the ledger and outlook open, and an overflow culprit report. |
| `manifestintegritytest.js`, `runtime_classification.json` | Classify `budgetcommandtest.js` as test-only. |
| `AGENTS.md` | Short data-model note. |

## Test results (run 2026-11-04 in this worktree)
| Suite | Result |
|---|---|
| smoketest | 471 pass, 0 fail |
| rendertest | 74 pass |
| hardwaretest | 369 pass |
| mailparsertest | 59 pass |
| costintegritytest | 42 pass |
| mailworkflowtest | 110 pass |
| rigassemblycompacttest | 17 pass |
| **budgetcommandtest (new)** | **100 pass** |
| projectsaletest / auditcorrectnesstest / cputest / gpu_registry_test / gpu_runtime_v4_test / flicker_regression_test / cloudsyncregressiontest / hall_of_legends_test | all pass |
| rigassemblycompactbrowsertest (real Chrome/Edge) | 20 pass |
| browsertest (real Chrome/Edge) | ALL PASSED (100) |

**These suites already fail on the untouched base commit 91357df, with identical output before and after this change:**
- `manifestintegritytest`: `cloudsyncregressiontest.js` is unclassified.
- `auditintegritytest`: `PN_STORE_HEALTH is not defined`.
- `financialrecoverytest`: `realizedProfitLedgerV2Backup` is undefined.
- `storagerecoverytest`: `pnRecognizedLedgerRoot is not defined`.

I left these alone because they're outside this work.

Visual checks were done with screenshots of the rig rail at 1920px, FISCAL OPS at 1600 and 390px, and the NEW PROJECT form showing the inline error. No horizontal overflow at any tested width. A 390px overlap of scale labels was found and fixed.

## Known limits and review points
- The blueprint cap becomes the budget (per Skynet's decision). This is inert until the blueprint scripts are re-enabled.
- When a project's currency changes, `additionalCosts` and any planned parts *without* their own currency are not converted. That's existing behaviour, tied to Treasury accounting, and left untouched on purpose.
- Rigs are simulations, so they have no "paid cash". Owned parts are sunk basis and everything else is planned. Rigs therefore show OWNED / PLANNED, not PAID.
- `budgetRequired` is a new optional flag on records. Older app versions ignore it safely.


## Skynet independent final review (2026-11-04)
- Fixed a valid-to-empty budget edit loophole: invalid pending text blocks UI SAVE even if the last stored budget is still valid.
- Added regression test: 101 budget assertions pass.
- Fixed over-budget progressbar accessibility range while leaving the true over-limit percentage in the accessible text.
- Classified the pre-existing cloudsyncregressiontest.js file as test-only, restoring manifest integrity checks.
- Enabled budget and compact browser tests in GitHub CI.
- Full 12-suite postchange pass: zero failures; git diff --check passed.
- All changes were isolated from the original dirty working folder and live ledger.
