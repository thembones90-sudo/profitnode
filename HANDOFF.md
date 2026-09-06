# PROFITNODE — Handoff to Codex

**From:** Claude (this session was pure dev-work-then-deploy-attempt)
**Date:** 2026-09-06
**App:** PROFITNODE — local-first PC-flipping/inventory/deal-tracking ledger for "Shadezy Repair Shop"
**Owner:** Chavez / "Teacher Layne"

## TL;DR

The code is done and tested. 65/65 tests pass (28 logic + 37 render, `smoketest*.js` + `rendertest*.js`, both minified and unminified variants). **The blocker is entirely deployment, not code.** Every Vercel project this Claude session created — via the Vercel MCP `deploy_to_vercel` tool, i.e. direct file-upload API deploys — was garbage-collected off the account within minutes, including ones that came back `READY` immediately after creation. This happened to every non-git-linked project across two separate sessions now (burned names below). The one project in the account that has never disappeared, `teacher-preacher`, is the only one that's **GitHub-linked** rather than API-uploaded. That's the strongest lead: this Vercel team appears to only retain git-linked deployments.

Claude's environment could not complete a GitHub-linked deploy: no working GitHub token (`GH_TOKEN`/`GITHUB_TOKEN` are proxy-injected placeholders that 502 against `api.github.com`), and browser-automation file upload only accepts files already on the *user's own machine*, not paths inside Claude's cloud container. If Codex's environment has real `git`/GitHub push access, that's very likely the actual unblock: push this repo to GitHub, then link it as a Vercel project (`vercel link` / import from Git in the dashboard, or Vercel's `create_git_project` API) instead of uploading files directly.

## What's in this package

| File | What it is |
|---|---|
| `app.js` | Canonical unminified source, 117,332 bytes. All 12 RIG BUILD tweaks implemented here. |
| `app.min.js` | Minified build for deploy, 100,090 bytes. **SHA-256: `43fe40e73e14ddeab63e1c51fa6d607b318dc571606da1cc4ccdcc2cad0eb8f8`** — verified byte-identical to the tested source at deploy time (this hash is your ground truth if you need to confirm a deployed copy matches). |
| `index.html` | The single HTML shell. Loads `app.js` via a **relative** `<script src="app.js">` — expects to be served from the same origin/project as the JS file, not split across two hosts. |
| `smoketest.js` / `smoketest_min.js` | Node/vm-based logic test harness (no browser needed) — same 28 assertions, run against unminified/minified builds respectively. |
| `rendertest.js` / `rendertest_min.js` | Node/vm-based render/DOM-shim test harness — same 37 assertions, unminified/minified. |

Run tests with plain Node, no deps:
```
node smoketest.js && node rendertest.js       # unminified
node smoketest_min.js && node rendertest_min.js   # minified (this is what's actually deployed)
```
All four currently report `ALL PASSED`, confirmed moments before this handoff was written.

**Not included** (left behind in the working scratchpad, not canonical): `app.noseed.js` (an experimental variant, ~9.5KB smaller, purpose not fully audited — don't treat as a source of truth), and four early `bootstrap_test*.js` files superseded by `smoketest`/`rendertest`.

## Data model

Local-first: everything lives in the browser's `localStorage` under key `profitnode_ledger_v1` (legacy fallback key `shadezy_ledger_v1` from older versions). No backend, no auth, no server-side storage. The app has full JSON backup + CSV export/import and a Reset-All-Data control built in.

## The real ledger data — currently unrecoverable by Claude

The user's actual inventory/sales data (7 inventory items, projects "REVENANT III" / "WYRM", 4 sales, 25 timeline entries, 1 repair record) was located in a `v9` project's `localStorage` in an earlier session and migrated into a `v18` project. **Both of those Vercel projects are now among the ones that vanished** — so that data is not reachable through Vercel anymore. If it still exists, it's only in a browser's `localStorage` on whatever machine last had `v9` or `v18` open, or in a JSON backup file the user may have exported via the app's own backup feature. Worth asking the user directly whether they have a `.json` backup export before assuming this data is gone — don't try to reconstruct it from memory/notes.

## Deployment history — what's already been tried and failed (don't repeat)

- **API file-upload deploy (`deploy_to_vercel` MCP tool), same project name twice:** first deploy to a brand-new name can succeed; any second deploy (even `target: "preview"` again) to that same name returns `403 Forbidden`. So updates always require a fresh project name — no in-place redeploys this way.
- **`target: "production"` on this account:** blocked outright, even as the very first deploy to a brand-new name — `403 Forbidden`, "You don't have permission to create a Production Deployment for this project." Only `target: "preview"` has ever succeeded.
- **Projects created this way vanish entirely** (this is the new, worse finding from this session) — not just "can't redeploy," the whole project disappears from `list_projects`/`get_project`/`get_deployment` (404) within minutes, sometimes before it could even be verified. Confirmed burned/vanished project names across sessions: `v3`–`v7`, `v9`, `v10`, `v12`–`v21-app`, plus this session's `permission-test-abc123`, `shadezy-profitnode-live`, `shadezy-profitnode-shop`, `shadezy-profitnode-terminal`. Don't reuse any of these names (some may still be soft-reserved even though the project is gone) and don't bother investigating them — they're empty leads.
- **GitHub-linked deploy attempt (prior session):** blocked by environment, not by Vercel — Claude's `GH_TOKEN`/`GITHUB_TOKEN` env vars are non-functional proxy placeholders, and Claude's browser-automation tool can't upload files that live in Claude's own cloud container (only the user's local machine). If Codex has a real, working `git push` / GitHub CLI in its environment, this path has never actually been tested end-to-end — it's the most promising unblock.
- **Deployment Protection / Vercel Authentication:** on projects that *did* stay up long enough to check, the fix that worked was browser automation on `vercel.com/<team>/<project>/settings/deployment-protection` → toggle "Vercel Authentication" off → type the confirmation phrase `disable vercel authentication`. The Vercel MCP tools (`get_project_deployment_protection`, `update_project_deployment_protection`) could never see or touch these file-upload-deployed projects at all (404s) — worth re-testing against a git-linked project, since that class of project might behave normally through the API.

## Recommended next step for Codex

1. Confirm you have working git + GitHub credentials in your environment (`git push` to a real remote).
2. Push this app (`index.html` + `app.min.js`, renamed to `app.js` on deploy, or update `index.html`'s script tag if you keep the `.min` suffix) to a GitHub repo.
3. Link that repo as a new Vercel project (dashboard "Import Git Repository," or `vercel link` / the Vercel API's git-project-creation endpoint) under the same Vercel account/team (`team_p26UJZ9MgenN71TjBdHzUeMo`, slug `thembones90-sudos-projects`) — this is the account's only project that has ever persisted (`teacher-preacher`), so mirroring its setup is the working template.
4. Verify the deployed `app.js` hashes to `43fe40e73e14ddeab63e1c51fa6d607b318dc571606da1cc4ccdcc2cad0eb8f8` before telling the user it's live.
5. Ask the user for a JSON backup of their ledger data if they have one — don't assume it's lost, but don't try to guess/reconstruct it either.
6. Going forward, git-linked deploy also solves the user's standing "keep just one version and upgrade it in place" request, which the API one-shot-per-name pattern could never satisfy anyway.
