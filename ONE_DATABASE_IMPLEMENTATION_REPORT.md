# One authoritative database implementation

The authenticated Supabase `profitnode_ledger` row remains the sole active ledger. Browser localStorage is a cache plus an offline queue. Divergent cache or stale queued data is archived to `profitnode_recovery` before the canonical cloud row is applied; duplicate snapshot inserts (`23505`) are treated as success. Recovery is exposed through a small badge action that downloads a review listing and never restores or overwrites cloud data.

If recovery insertion fails, the browser cache and queue are preserved and the badge reports `UNSYNCED · RETRY`. No migrations or production writes are included. Recovery listing is intentionally an export rather than a destructive restore UI; manual review/merge remains required.


## Independent safety review and verification (Skynet, 2026-11-04)
- Verified live database identity: Supabase project emnroovdtopxfzwoyhhp, single owner-scoped primary JSONB ledger at revision 2488 before deployment. Archived canonical row to immutable owner-scoped recovery snapshot pre-unification-r2488-20261104 before code changes.
- Created public.profitnode_recovery with owner-only SELECT and INSERT RLS, no UPDATE/DELETE grant for authenticated clients, unique owner/snapshot idempotency.
- Removed authenticated full-screen RECONCILING gate and made conflict warning nonblocking.
- Server-confirmed recovery archive precedes authoritative cloud cache replacement; late edits are re-archived before replacement; recovery failure keeps original browser data and queue intact.
- Local-only and older recovery pathways remain for backward compatibility but are not invoked on normal authenticated login.
- Light-weight 30-second revision polling while active supplements visibility, online, BroadcastChannel.
- Independent simulated Supabase two-device suite: 20 assertions PASS. Normal/stale queue, divergent rig and project, late cloud revision/CAS, recovery failures, repeated refresh idempotency, same account two browsers, safe additive WRAITH I rig, and no-blocking-modal cases.
- All 14 local Node/browser suites PASS; 101 general browser assertions, 471 smoke assertions, 101 budget assertions, 369 hardware assertions. git diff --check PASS.
- Critical limitation: divergent modifications are saved as immutable recoveries for manual review. They are NOT automatically merged into the canonical ledger; safe strictly additive snapshots can still be CAS-promoted. Each device must sign into the same Supabase account. Offline edits are only queued until online CAS confirmation.
- No live ledger was mutated by tests; no deletion of localStorage or cloud snapshots.
