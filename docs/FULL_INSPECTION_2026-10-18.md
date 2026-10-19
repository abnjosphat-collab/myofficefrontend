# MyOffice full inspection — 2026-10-18 (report only, nothing implemented)

Inspector: independent pass over backend (`myoffice/backend`) and frontend
(`myoffice/frontend`) as committed at HEAD `ec9158f` ("Security and honesty
hardening from the 2026-10-18 scan"). Working trees were clean; the inspection
changed nothing. Prior scans and the remediation reports were treated as
unverified and re-checked; several of their claims did not survive (B-F13,
D-F4, and the reconciled suite counts below).

Method: four evidence gatherers (backend suite+code, frontend static
suite+code, database SQL+live catalogue read-only, live headless browser with
fixture data on a local server), then a falsification critic that re-opened
every cited file body and re-ran the cheap checks. 28 findings confirmed, 1
dropped outright, 3 weakened, 0 duplicates. The browser findings were
adjudicated by the lead inspector instead (strongest claims re-read in full:
useApiList, DataRegion, transientRetry, MetricTile, leaves router).
Evidence packs and logs: `C:\Users\Administrator\AppData\Local\Temp\inspect-20261018\`
(backend, database, frontend-static, browser, critic subdirs).

## Summary

Counts (38 verified findings, 0 critical):

| Severity | Backend | Database | Frontend static | Browser/runtime | Total |
|---|---|---|---|---|---|
| Critical | 0 | 0 | 0 | 0 | 0 |
| Medium | 3 | 3 | 2 | 1 | 9 |
| Medium-low | 2 | 0 | 4 | 1 | 7 |
| Low | 8 | 3 | 6 | 5 | 22 |

The ten items that matter most, in impact order:

1. **R-F1: persistent 5xx/timeout never surfaces** — every list can sit on
   "Loading" forever with no error and no Try again (uncapped retry +
   `retrying` renders as loading). This also swallows B-F1's 500s, so two
   findings compound into silent hangs.
2. **B-F2: NEC import fetches leaves/employees unbounded** — past ~1000 rows
   PostgREST truncates, missed leave days import as worked days with invented
   hours. Payroll correctness, silent, grows with time.
3. **B-F1: missing records return 500 instead of 404** (leaves, timesheets,
   incl. delete) — wrong status, 500-alert pollution, and tests PIN the bug
   (`status_code == 500` asserted with "re-wrapped" comments).
4. **B-F3: Tools sessions are never revoked** — no logout; a stolen bearer
   stays valid up to 7 days through password change/reset.
5. **D-F2: two migrations DROP live tables unconditionally** — re-running
   `maintenance_schedules.sql` or `documents.sql` wipes live data (one has a
   stale "table was empty" justification, the other none).
6. **D-F3: feature migrations re-create the policies file 4/4 drops** —
   re-apply breaks the lockdown verification invariant and silently re-arms
   exposure if grants are ever re-added. One file grants TO PUBLIC.
7. **D-F1: ~60 live functions still EXECUTEable by anon/PUBLIC** — mitigated
   (invoker rights + RLS + revoked grants, all verified live), but the
   lockdown file's own verification query allow-lists only its 7 functions,
   so it reports clean while 60 stay open.
8. **S-F5: SHEQ dashboard `Promise.all` contradicts its own comment** — one
   bad endpoint (or one non-array payload) kills all six panels.
9. **B-F9: upload handling trio** — buffer-before-cap OOM, stored-XSS via
   SVG + public buckets + client content-type, unsanitized photo folder.
10. **B-F5: leaves PATCH stores negative `total_days`** — end<start accepted
    when only one date is patched; calendar mode stores negative while
    working-day mode returns 0 for the same input.

Honest overall verdict: this is a well-built product with strong foundations
- green suites on both repos, zero axe violations, live RLS verified good,
deliberate auth boundaries with tests, honest empty/error states almost
everywhere. There are no criticals and nothing that says "stop shipping".
But the mediums are real and specific: one UX trap that can hang every list
(R-F1), one payroll-corruption time bomb (B-F2), one session-security hole
(B-F3), and SQL-hygiene risks that bite on re-run rather than today (D-F2,
D-F3). Below that is a long tail of small, cheaply fixable lows. Fix the top
10 in order and the product is genuinely hard to fault.

## Findings (most severe first)

### B-F1 — Missing records return 500 instead of 404 (leaves, timesheets)
Severity: medium. Status: Verified.
Where: `backend/app/routers/leaves.py:227-231` (get), `:244-285` (patch),
`:293` (delete raises its own 404 inside the same try); `backend/app/routers/timesheets.py:132-139,144-169,174-185`.
Evidence: `get_or_404` raises HTTPException(404) (`app/db_helpers.py:51-53`);
`except Exception` catches it and `server_error` always returns 500
(`app/errors.py:32-35`). Correct pattern exists elsewhere
(`employees.py:241-242`, `equipment.py:165-166`: `except HTTPException:
raise`). Worse than filed: tests PIN the bug —
`tests/test_leaves_crud.py:198-202,:418-422` and
`tests/test_timesheets_crud.py:177-181,:217-221,:233-237` assert
`status_code == 500` with "re-wrapped by outer except" comments. Lead
inspector re-read leaves.py:225-285 and confirms.
Why it matters: wrong status for every missing-record read/update/delete;
500-alert and log pollution; combined with R-F1, these 500s present as
endless loading instead of any error at all.
Fix size: small. Direction: re-raise HTTPException before the generic
handler (the pattern already used in sibling routers) and flip the pinning
tests to 404.

### B-F2 — NEC import reads leaves/employees unbounded: silent truncation, wrong hours
Severity: medium. Status: Verified.
Where: `backend/app/nec_import/apply_runner.py:35-43`
(`load_employees`, `fetch_leaves`); `backend/app/nec_import/patch_builder.py:11-21,60-61,82-87`.
Evidence: single `.execute()` with no pagination, while
`fetch_timesheets_map` (:14-32) correctly uses `fetch_all_pages` and
`app/db_helpers.py:14-15` documents the ~1000-row PostgREST cap. Past the
cap, `leave_on_date` misses real leave days and the scan-marked-work branch
builds a work patch with hours for a leave day. Truncated employees fail
safe (exception rows); truncated leaves do not.
Why it matters: payroll correctness — leave days silently paid as worked
days once the table passes ~1000 rows, with no error anywhere.
Fix size: small. Direction: page both fetches with the existing
`fetch_all_pages` helper both already sit next to.

### B-F3 — Tools-workspace sessions are never revoked (no logout; survive password change)
Severity: medium. Status: Verified.
Where: `backend/app/routers/tools_workspace.py:98,325-326,366-391`
(sessions, reset/change password).
Evidence: sessions live 7 days; `reset_account_password` and
`change_own_password` rotate the hash and touch no sessions; repo-wide
search for logout/revoke/session-delete: 0 hits. Adjacent smell (same
lines): expiry is a string comparison (`session.get("expires_at","") <=
_now()`), fragile to datetime-format shifts.
Why it matters: a stolen bearer token stays valid up to 7 days after the
user changes their password or an admin resets it.
Fix size: medium. Direction: delete the user's sessions on password
change/reset, add logout, and compare parsed datetimes.

### D-F1 — ~60 live functions still EXECUTEable by anon/PUBLIC; lockdown verifier is blind to them
Severity: medium. Status: Verified.
Where: live DB catalogue (Q4b/Q4c/Q4d in `database/live-outputs.txt`);
`backend/supabase_migration_lock_down_functions.sql:59-103,135-144`.
Evidence: 181 `routine_privileges` rows to PUBLIC/anon/authenticated (~60
distinct names incl. `upsert_daily_report`, `reset_compressor_hours`,
`database_health_check`). Mitigations verified live: all SECURITY INVOKER,
RLS on with no policies, table grants revoked — so data access is blocked
and LOW-MED would also be defensible. Sustained at medium because the
file's own verification query allow-lists only its 7 functions and reports
clean regardless.
Why it matters: callable surface via PostgREST `.rpc()` plus a guardrail
that cannot see it; the next SECURITY DEFINER function added live-first
would be exploitable with no alarm.
Fix size: small. Direction: extend the lockdown file with a guarded
EXECUTE revoke for all public functions except documented exceptions, or
record the 60 as accepted with the invoker-rights rationale.

### D-F2 — Two migrations DROP live tables unconditionally: re-run wipes data
Severity: medium. Status: Verified.
Where: `backend/supabase_migration_maintenance_schedules.sql:11`;
`backend/supabase_migration_documents.sql:6`.
Evidence: `DROP TABLE IF EXISTS ... CASCADE` in both. The first file's
header justifies it ("that table was empty", 2026-10-18) — true once,
deletes all recurring schedules plus cascade targets on re-run. The second
has no justification; re-run wipes the document catalogue and orphans
storage objects. Related hygiene (not filed as bug):
`tools_workspace.sql:29,88` migrates then drops `portable_tools*`, so a
second run fails at line 29 (transaction rollback makes it safe but noisy).
Why it matters: routine re-application (new environment, repair, partial
rollback drill) deletes production data with no warning.
Fix size: trivial. Direction: remove the DROP TABLEs from the re-runnable
files (one-way history stays in git) and note the break-glass alternative.

### D-F3 — Feature migrations re-create the policies file 4/4 drops
Severity: medium. Status: Verified.
Where: `backend/supabase_migration_engineering.sql:291-293` (12 tables,
`TO authenticated USING (true)` loop); `timesheets.sql:72-76` (no TO clause
= TO PUBLIC); `safety_complaints.sql:27-28` (no TO clause despite "for
authenticated" name); `documents.sql:44-48`, `document_folders.sql:40-43`,
`availabilities.sql:51-54`, `services.sql:115-126`,
`shared_lists.sql:33-36`, `sop_library.sql:86-89,114-117`
(`auth_all_*` + `service_role_*` pairs). Dropped by
`supabase_migration_close_permissive_access.sql:69-71`.
Evidence: re-apply recreates the policies; file 4/4's verification
invariant (zero policies outside `user_profiles`) breaks; the guardrail
test checks RLS only, zero policy assertions
(`tests/test_migrations_rls.py`, only drop-checks at :219-230). Impact is
bounded today (policies without grants grant nothing — verified sound),
but silently re-arms exposure if grants are ever re-added. Safe-pattern
counter-examples verified and not filed (`signatures.sql:27-45`,
`maintenance_schedules.sql:76-89`, `inventory_items.sql:28`).
Why it matters: the lockdown decays on every re-apply with no failing
check; a future grant change re-opens data access invisibly.
Fix size: small. Direction: strip the open policies from feature
migrations (backend uses service_role; they serve nothing) or add a
guardrail test forbidding `USING (true)` policies in migration files.

### S-F2 — READMEs describe demo-vertical routes that no longer exist
Severity: medium. Status: Verified.
Where: `frontend/README.md:6-8`; root `myoffice/README.md:3-5`.
Evidence: claims routes `bank`, `roomRental`, `restaurant`, `cv-builder`
exist as shipped prototypes; inventory of 52 `app/*/page.tsx` dirs shows
none; they live at workspace-root
`archived-modules/other-products-2026-08-29/`.
Why it matters: a new developer (or the owner) following the README looks
for routes that are not there; first-contact documentation is wrong.
Fix size: trivial. Direction: point the READMEs at the archive path.

### S-F3 — Root TESTING.md is stale about what the suites cover
Severity: medium. Status: Verified.
Where: root `myoffice/TESTING.md:23,33-37` (pointed to by
`frontend/README.md:51` as "the full picture").
Evidence: line 23 says endpoint-auth tests assert "reads stay open" —
false since reads went behind auth (`backend/app/routers/breakdowns.py:231`
verified `Depends(get_current_user)`). Lines 33-37 say the frontend suite
is `frontend/lib/*.test.ts` covering two files — the suite is 195 files /
1489 tests across `app/`, `lib/`, `components/`.
Why it matters: the document that tells contributors what "tested" means
describes a product from months ago.
Fix size: small. Direction: rewrite the two stale sections from the
current suites (counts above are fresh).

### R-F1 — Persistent 5xx/timeout/network failure never surfaces: infinite "Loading", no error, no Try again
Severity: medium. Status: Verified.
Where: `frontend/lib/useApiList.ts:53-77`; `frontend/lib/transientRetry.ts:7-14`;
`frontend/components/ui-system/patterns/DataRegion.tsx:100-102`;
`frontend/components/ui-system/patterns/dataStatus.ts:43`.
Evidence: transient branch chains `setTimeout(attempt(n+1))` with no
attempt cap; 500/502/503/504/408/429 are transient by `isTransientError`.
`retrying` renders the identical `LoadingPulse` and drops the recorded
error, while the comment above it ("If the retries run out the status
becomes error", DataRegion.tsx:100-101) describes a state that cannot
happen — retries never run out. Probe: 500 on `/api/leaves` for 45 s,
still "Loading", no error, no Try again, 18 requests and counting
(`browser/probe-500persist.log`, `browser/shots/leaves-error500-t45@1440.png`,
`browser/shots/leaves-error@{1440,390}.png`). Note `retryTransient`
supports `maxWaitMs` but `useApiList` does not use it. Blast radius: every
`useApiList` consumer. The route harness never covers this path (its
failure is always non-transient 404, `verify-routes.mjs:71`). Lead
inspector re-read all four files and confirms. Side observation, cause
untraced: 12 requests in the first 10 s exceeds the documented
1/2/4/8/15 s backoff for a single chain.
Why it matters: any sustained outage or slow backend presents as a page
that loads forever with no explanation and no recovery action — the
opposite of the honest-states design everywhere else. It also hides B-F1's
500s completely.
Fix size: small. Direction: cap the transient chain (attempts or elapsed
time) and let the recorded error surface with Try again.

### B-F4 — NEC extract 502 leaks raw exception text; guard test only covers 500
Severity: medium-low. Status: Verified.
Where: `backend/app/routers/nec_timesheet_import.py:148`;
`backend/tests/test_no_internal_error_leak.py:26-32`.
Evidence: `raise HTTPException(502, detail=str(exc))` — provider
internals (paths, API errors) reach the client. The no-leak guard only
inspects status-500 details, so this bypasses it. The `str(e)`-to-zero
claim is literally true yet incomplete (`str(exc)` variant). Checked and
cleared: line 157 echoes only the job id / "no review json" (verified in
`job_store.py:61-65,120-125`).
Why it matters: manager-only, but it violates the no-internals contract
the whole remediation enforced, through a hole in its own guardrail.
Fix size: trivial. Direction: route the 502 through `server_error` and
extend the guard test to non-500 error details.

### B-F5 — leaves PATCH accepts end_date before start_date, stores negative total_days
Severity: medium-low. Status: Verified.
Where: `backend/app/routers/leaves.py:51-55,247-264`;
`backend/app/leave_days.py:9-10,19-26`.
Evidence: the update validator compares dates only when BOTH are in the
payload, so PATCH `{"end_date": <stored start}` passes; the handler merges
over stored dates and recomputes with no end>=start check;
`calculate_calendar_days` returns `(end-start).days+1`, negative when
inverted — while working-day mode returns 0 for the same input
(inconsistent). Create path (`leaves.py:34-38`) and overtime take-as-leave
(`overtime.py:409-410`) are correctly validated.
Why it matters: stored negative durations corrupt leave balances and any
report that sums them; two modes disagree on the same input.
Fix size: trivial. Direction: validate merged end>=start in the PATCH
handler (one check covers all partial-update shapes).

### S-F4 — Two notification voices: `notify` wrapper bypassed by ~200 raw `toast` calls
Severity: medium-low. Status: Verified.
Where: `frontend/lib/notify.ts:1-4,84-88`; 226 raw `toast.*` calls outside
notify/tests (re-counted); 11 `toast.warning` sites (re-counted).
Evidence: `notify` presents itself as "the app's notification voice... so
every task outcome looks the same" but has exactly 2 app importers
(`ToolsCustomize.tsx`, `useToolsWorkspace.ts`); every other page calls
sonner directly with default durations and no sound. Nuance: `notify` has
no `warning` variant, so the 11 warning sites cannot migrate as-is.
Durations/punctuation drift, e.g. `app/drivers/exportDrivers.ts:35`.
Why it matters: task outcomes look and behave differently per page; the
standard exists but nothing follows it.
Fix size: medium. Direction: add the missing `warning` variant, then
migrate call sites module by module (mechanical).

### S-F5 — SHEQ dashboard: `Promise.all` contradicts its own comment, one bad endpoint kills all six panels
Severity: medium-low. Status: Verified.
Where: `frontend/app/sheq/useSheqDashboardData.ts:4-5,19,30-33,72`.
Evidence: comment says "Six endpoints behind one Promise.allSettled"; line
19 uses `Promise.all`; first non-array payload throws (:30-33), leaving
`loadError` plus `toast.error('Failed to load dashboard data')` (:72,
wording unlike the page's other messages) instead of five working panels.
Why it matters: a single sick endpoint blanks the whole safety dashboard,
the page least able to afford it.
Fix size: small. Direction: use allSettled per the comment (or fix the
comment if all-or-nothing is intended) and align the toast wording.

### S-F6 — Admin invite accepts any non-empty string as an email
Severity: medium-low. Status: Verified.
Where: `frontend/app/admin/page.tsx:102-108,111`;
`frontend/components/ui-system/overlays/FormDialog.tsx:74`;
`backend/app/routers/admin.py:46-48`.
Evidence: submit checks only `email.trim()` non-empty; `type="email"` is
inert because FormDialog renders `<form noValidate>`; backend
`InviteUserRequest.email: str` has no format validation either, so a typo
round-trips to Supabase before failing. Inconsistent with
`AuthForm.tsx:43,59`, which regex-checks.
Why it matters: admin typos fail late and opaquely instead of at the field.
Fix size: trivial. Direction: reuse the AuthForm email check on the
frontend and add a format validator on the backend field.

### S-F7 — Dead static figures in the module directory invite resurrection as fake live data
Severity: medium-low. Status: Verified.
Where: `frontend/components/app-shell/modules.ts:60-131,106-107`.
Evidence: hardcoded per-module `badge` counts and `metrics` verified as
quoted; repo-wide searches show zero reads outside the definitions — dead
weight today, but plausible enough (`'12'`, `'48'`, `MTTR 4.2h`) that a
future card redesign could display them as real. (LOW would also fit; the
harm is hypothetical.) Adjacent: `/availabilities` vs `/availability`
share the Gauge icon, `Uptime` tag, and near-identical titles — easy to
confuse.
Why it matters: invented-looking numbers sitting one import away from a
product whose rule is "nothing is invented".
Fix size: trivial. Direction: delete the dead fields (and disambiguate
the two availability entries while there).

### R-F2 — MetricTile shows computed zero-details next to "Unavailable" on load failure
Severity: medium-low. Status: Verified.
Where: `frontend/components/ui-system/patterns/MetricTile.tsx:56`;
`frontend/app/leaves/page.tsx:58,122,124`.
Evidence: `detail` renders whenever `!loading`, including `unavailable` —
contradicting the line-19 contract ("instead of a misleading zero").
Screenshot: `browser/shots/leaves-error2@1440.png` ("Approved Unavailable
**0% of decided**", "Days requested Unavailable **0 on average**"); details
computed from `[]`. ~60 call sites pass `detail`. Lead inspector re-read
MetricTile.tsx:43-62 and confirms. near_miss tiles unaffected (no `detail`
prop — `browser/verify-rerun/near_miss-error@1440.png`).
Why it matters: the one component-level hole in the "never a fake zero"
rule, on the failure path of every tile strip that passes details.
Fix size: trivial. Direction: render detail only when `!loading &&
!unavailable`.

### B-F6 — Anonymous usage ingest: unbounded batch + unvalidated ts cause 500/DoS
Severity: low. Status: Verified.
Where: `backend/app/routers/usage.py:36-37,40-41,47,63`;
`backend/app/rate_limit.py:13,36`.
Evidence: `events` list has no `max_length` on an anonymous-by-design
endpoint (300/min global limit is the only brake);
`datetime.fromtimestamp(e.ts/1000)` sits outside the try (starts :63), so
huge/negative `ts` raises unhandled to 500.
Why it matters: unauthenticated callers can 500 the endpoint at will and
throw oversized batches at it.
Fix size: small. Direction: bound the batch length and the `ts` range so
bad input is a 422, not a 500.

### B-F7 — crud_router: `?offset=abc` gives 500; DELETE reports ok for missing ids
Severity: low. Status: Verified.
Where: `backend/app/crud_router.py:165-169,188-190,218-224`.
Evidence: `int(params.get("offset") or 0)` unguarded (`limit` directly
above it is) — ValueError to 500 on every CrudRouter consumer with
default_limit. DELETE returns `{"ok": True}` unchecked while `update_item`
in the same file 404s — inconsistent.
Why it matters: user-craftable 500s on shared infrastructure; deletes
that claim success for rows that never existed.
Fix size: trivial. Direction: guard offset like limit; check the delete
result and 404 like update does.

### B-F8 — stock_warnings carry raw DB error text in 200 responses
Severity: low. Status: Verified.
Where: `backend/app/stock_levels.py:53`;
`backend/app/routers/issues.py:115,158-159,171`.
Evidence: `warnings.append(f"{code}: ... ({e}).")` reaches signed-in
callers on the happy path via `_with_stock` (all three call sites
verified). The compare-and-swap retry itself (`stock_levels.py:64-76`) was
reviewed and is correct. Violates the no-internals contract without any
failure occurring.
Why it matters: database internals leak to any signed-in user whenever a
stock check hiccups, inside an otherwise successful response.
Fix size: trivial. Direction: log the exception server-side, return a
generic "stock check unavailable" warning string.

### B-F9 — Upload handling: buffer-before-cap, SVG+XSS, unsanitized photo folder
Severity: low. Status: Verified.
Where: `backend/app/uploads.py:29-35,59-60`;
`backend/app/routers/photos.py:15,37-38,41,47,54`;
`backend/app/routers/notices.py:123,133,139`;
`backend/app/routers/nec_timesheet_import.py:24-25,81,109`.
Evidence: (1) `await file.read()` runs BEFORE the size check in both
`uploads.py:59-60` and `photos.py:37-38` — a single large POST with an
allowed extension can OOM the worker (caps: notices 100 MB, NEC PDF
80 MB, review JSON 40 MB, all verified). (2) SVG in allowlists
(`photos.py:15`, NOTICE_ATTACHMENT_EXTS) + public buckets (`get_public_url`)
+ client-controlled `content-type` = authenticated stored-XSS vector: plant
an SVG, a victim admin views it. (3) `photos.py:41` interpolates the raw
`folder` form field into the storage path (`../` not stripped).
Why it matters: three independent upload weaknesses; the XSS one turns any
signed-in uploader into a threat to admins.
Fix size: medium. Direction: stream-or-cap before reading, serve uploads
with safe content handling (or drop SVG), sanitize the folder field.

### B-F10 — Schedules cron: non-constant-time secret compare; server-local "today"
Severity: low. Status: Verified.
Where: `backend/app/routers/schedules.py:335-339`;
`backend/app/clock.py:1-7`.
Evidence: `x_cron_secret == secret` instead of `hmac.compare_digest`
(timing side channel on a low-value secret; cheap fix). `date.today()` is
server-local UTC, contradicting the Harare-clock rule `clock.py`
explicitly states for people-facing dates — due-date rollover can shift by
a day near midnight. Fail-safe design confirmed (no CRON_SECRET falls back
to manager auth) and idempotent claim-generation verified sound
(`schedules.py:258-321`).
Why it matters: a crack in two rules the codebase otherwise follows
everywhere: constant-time secrets and Harare dates.
Fix size: trivial. Direction: `compare_digest` plus the shared Harare
`today()`.

### B-F11 — /api/health always reports "healthy"
Severity: low. Status: Verified.
Where: `backend/main.py:163-177`.
Evidence: returns `"status": "healthy"` unconditionally while the
`database`/`redis` fields can say "unavailable". The per-dependency fields
themselves leak nothing.
Why it matters: monitoring keyed on `status` never fires; an outage looks
healthy to automation.
Fix size: trivial. Direction: report "degraded" when a dependency is down.

### B-F12 — Dead code and stale comments
Severity: low. Status: Verified.
Where: `backend/app/aggregation.py:33-41`; `backend/main.py:108-115,313-314`;
`backend/app/routers/employees.py:115`.
Evidence: `sum_by` has zero callers in app code (only a unit test exercises
it; latent float+str TypeError if values are text). `Mangum` handler
unused — deploy target is Render, referenced nowhere else. `main.py:108-115`
comment still describes the removed `str(e)` pattern as current.
`employees.py:115` has a redundant second disjunct (harmless).
Why it matters: the owner counts needless complexity as a defect; stale
comments mislead the next reader about live patterns.
Fix size: trivial. Direction: delete the dead code, fix the two comments.

### B-F13 — Backend remediation-report inaccuracies (weakened: 4.5 of 6 bullets hold)
Severity: low. Status: Verified.
Where: `backend/docs/REMEDIATION_REPORT_2026-10-18.md:30,40,52,79-81,91`.
Evidence: "5 read endpoints stay deliberately open" vs 10-entry OPEN_READS
(8 data + 2 probes, `tests/test_endpoint_auth.py:96-107`); "Full diff 86
tracked files +1882/-510" vs HEAD `119 files +3942/-888` (re-ran `git show
--shortstat HEAD`; the report counted `git diff --stat`, which excludes
untracked new files); gate-3 "`timesheets - Copy/` (7-file experiment)" vs
directory absent from tree AND git; "deleted myoffice.db/spares.db/
package.json" vs files present on disk but gitignored+untracked. Dropped
bullet: the pack's "`.dict()` 0 hits / understated cleanup" was false —
9 comment hits exist, the report's "5 hits are comments only" is
essentially correct. Weakened to nit: "pinned in code as OPEN_READS" is
imprecise (it lives in tests, which is still code), not false.
Why it matters: the report is the owner's record of what was done; wrong
counts and phantom paths erode trust in the true parts.
Fix size: trivial. Direction: correct the four numbers/paths in place.

### D-F4 — Database docs/report drift (weakened: 7 of 8 bullets hold)
Severity: low. Status: Verified.
Where: `backend/docs/RLS_AND_API_EXPOSURE.md:21-37`; `backend/docs/REMEDIATION_REPORT_2026-10-18.md:13,17`;
`backend/supabase_migration_close_permissive_access.sql:41-43`;
`backend/supabase_migration_housekeeping_indexes.sql:5`;
file headers 1/3,2/3,3/3 vs existing 4/4.
Evidence (all re-verified by the critic): RLS doc lists a 3-file run order
and never mentions file 4/4 or its rollback; report:17 says the enable-RLS
file adds "per-table policies" — it adds NO policies by explicit design
(`:18-20`); line counts 233/164/79/64 vs actual 262/177/82/65
(re-counted); report:13 "untracked until the owner stages them" vs clean
tree at ec9158f; housekeeping "79 CREATE INDEX" vs 80 matching lines;
close-file header "SELECT and INSERT own row" vs live SELECT `USING (true)`
(only INSERT is own-row); lock-file recorded line numbers drifted
(auth.py:77->293, spares.py:708->709, tools_workspace.py:121/198/768->
149/226/806). Dropped bullet: report:88 "1916 passed" is ACCURATE (backend
pack confirmed 1916 twice; the database pack's own 1889+27=1916 arithmetic
corroborates it) — a stale local temp dir is not report drift.
Why it matters: run-order and line-count drift in security docs sends the
next operator down wrong paths during an incident.
Fix size: small. Direction: update the RLS doc to the 4-file order and
fix the stale counts/line references.

### D-F5 — `schema_migrations` exists but is empty: no applied-history (weakened)
Severity: low. Status: Verified.
Where: live Q6 (`[]` in `database/live-outputs.txt`);
`backend/supabase_migration_schema_migrations_table.sql`;
`backend/scripts/track_migration.py`.
Evidence: the tracking table exists but has zero rows —
`--mark-applied` was evidently never run, so which files were applied, and
in which order, is inferred from live state only (Q1-Q5/Q9-Q12 all
consistent with files 1+2+3+4 applied). Dropped corroboration: the pack's
"live `user_profiles.is_active` with no repo migration" was false — the
file is 15 lines and line 14-15 literally adds that column; no live-first
drift.
Why it matters: without applied-history, the next incident starts with
forensics instead of a ledger.
Fix size: small. Direction: backfill `--mark-applied` for what live state
proves is applied, then use it going forward.

### D-F6 — Accepted-but-unrecorded exposures (confirm decisions, no change made)
Severity: low. Status: Verified.
Where: live Q10/Q12 (`database/live-outputs.txt`);
`backend/supabase_migration_sheq_photos.sql:13-15,23-25,31-33`;
`backend/supabase_migration_documents.sql:52-53`;
`backend/supabase_migration_services.sql:93-102`;
`backend/supabase_migration_close_permissive_access.sql:51-53,98-99,103-104`.
Evidence: public storage buckets `ams-documents`, `inspection-photos`,
`service-attachments` all `public=true`, consistent with repo migrations
and the deliberate "storage untouched" note. Sharp edge inside the
accepted set: ANY authenticated user can DELETE any object in
`inspection-photos` (no ownership check, `sheq_photos.sql:31-33`) —
integrity exposure needing sign-in. Also confirmed as disclosed-not-new:
default-privilege revokes cover only the running role's future objects
(live `supabase_admin` defaults still open, exactly the header caveat);
`handle_new_user` holds a benign service_role EXECUTE grant though the
lock file revokes without re-granting (trigger fires as owner anyway).
Why it matters: accepted exposures that live only in reviewers' heads get
re-litigated or silently relied on; the delete-any policy deserves an
explicit owner yes/no.
Fix size: small. Direction: record the acceptances (and the delete-any
decision) next to the storage migrations.

### S-F8 — Driver licence expiry flags "Expired" for most of the expiry day
Severity: low. Status: Verified.
Where: `frontend/app/drivers/page.tsx:23-28`; `frontend/lib/dates.ts:57-63`.
Evidence: instant comparison `new Date(expiry) < new Date()`;
`new Date('YYYY-MM-DD')` is UTC midnight (02:00 Harare), so on the expiry
day itself the badge flips at 02:00 instead of end of day. The codebase
already has the calendar-day helper for this (`daysUntil`); drivers is the
only page rolling its own here.
Why it matters: drivers flagged expired while still legal, for most of
their last valid day.
Fix size: trivial. Direction: use the shared `daysUntil` helper.

### S-F9 — Stale `tsc` failure on the tree as found (environmental, self-heals)
Severity: low. Status: Verified.
Where: generated `frontend/.next/types/validator.ts` (9 errors); log
`frontend-static/tsc.log` (2650 bytes) vs empty `tsc-rerun.log`.
Evidence: first `tsc --noEmit` exited 1, all errors in generated cache
referencing since-deleted routes (`home-preview`, `timesheets - Copy`,
`wireframes/*` — all confirmed absent); rerun after `npm run build` exits
0 with zero errors in real source. CI unaffected (fresh checkout has no
`.next`).
Why it matters: anyone running `tsc` on a stale checkout sees a red
herring; small but recurring confusion.
Fix size: trivial. Direction: one-line AGENTS.md note ("rm -rf .next"
before tsc) or pin validator regeneration.

### S-F10 — `lib/api.ts` header comment contradicts the shipped auth design
Severity: low. Status: Verified.
Where: `frontend/lib/api.ts:11-12`; `frontend/lib/apiClient.ts:61-62,148`.
Evidence: "GET/read calls don't need this; only use it for writes" — but
every backend GET now requires the token, and `apiClient` correctly routes
ALL methods through `authFetch`. Comment wrong, code right.
Why it matters: the next reader trusts the comment and writes an
unauthenticated read that 401s in production.
Fix size: trivial. Direction: fix the two comment lines.

### S-F11 — Dead files and unlinked prototype routes still ship
Severity: low. Status: Verified.
Where: `frontend/app/breakdowns/JSON` (0 bytes, 2026-06-25);
`frontend/app/leaves/Studio.code-workspace` (144 bytes, also flagged in
`vitest.config.ts:25` as a coverage-parser hazard);
`frontend/app/test-homepage/page.tsx:1` ("TEMPORARY design concept"),
`/deep-space-preview`, `/login-preview`.
Evidence: all three preview routes exist, none in nav (`modules.ts`), all
in css-consistency SKIP_DIRS, yet live URLs shipped to production;
test-homepage alone owns 7 of the 11 eslint warnings. Correction:
smoke route-specs cover test-homepage and deep-space-preview but NOT
login-preview (no such spec file).
Why it matters: dead weight in the bundle and the suite; prototypes that
ship are product, whether intended or not.
Fix size: small. Direction: delete the two stray files; either link or
remove the three preview routes.

### S-F12 — `apiClient.extractError` text fallback is unreachable
Severity: low. Status: Verified.
Where: `frontend/lib/apiClient.ts:69-87`.
Evidence: after `await res.json()` settles, the body is disturbed, so
`res.clone()` at :83 throws (clone of a used body) and is swallowed at
:85 — non-JSON error responses always surface as generic `Request failed
(HTTP n)` even when the backend sent a useful plain-text message.
Why it matters: real backend error messages are replaced by generic ones
on exactly the path users need them.
Fix size: trivial. Direction: read `res.text()` once, JSON-parse
conditionally.

### S-F13 — CSP pins production hosts while the app allows overrides
Severity: low. Status: Verified.
Where: `frontend/next.config.ts:3-7,25-26,56`; `frontend/lib/config.ts:9-11`;
`frontend/lib/supabase.ts:6`.
Evidence: `connect-src`/`img-src` hardcode the Render backend and one
Supabase project, but API_BASE and the Supabase URL are env-overridable —
a staging/preview pointed elsewhere gets API calls and stored images
blocked (report-only today, so silent until enforcing). Note:
`next.config.ts:3-5` already carries a brief comment acknowledging the
coupling, so the "document" half partially exists; the enforce-time
breakage risk stands.
Why it matters: the first enforcing-CSP deploy (or a staging env) breaks
API and images with no code change to blame.
Fix size: small. Direction: derive the hosts from env (or keep hardcoded
and document the coupling where envs are set).

### R-F3 — Floating Feedback button covers controls at 320 px / 200% zoom
Severity: low. Status: Verified.
Where: `frontend/components/app-shell/ShellFeedback.tsx:32`;
`frontend/components/ui-system/primitives/Button.tsx:99-100`;
`frontend/components/ui-system/shell/Frame.tsx:166`.
Evidence: fixed bottom-right `z-sticky` by design; screenshots show it
covering half the list-view toggle (`browser/shots/leaves-zoom200.png`),
overlapping view toggles at 320 px (`leaves-ready@320.png`,
`overtime-ready@320.png`), KPI tile corner (`home-zoom200.png`,
`home-ready@320.png`), card edge (`tools-ready@320.png`). Covered halves
hit Feedback instead of the control. Page bottom padding does not help
(the button floats above content). Structure re-verified by the lead
inspector; shots pixel-viewed by the browser agent.
Why it matters: at small widths and high zoom, real controls are
unreachable behind the Feedback button.
Fix size: small. Direction: move, collapse, or add dismiss/avoidance for
the FAB at narrow widths and high zoom.

### R-F4 — /tools has no h1 inside `main` (two responsive-split h1s outside it)
Severity: low. Status: Verified.
Where: `frontend/app/tools/ToolsFrame.tsx:76,84`.
Evidence: `<h1 ... sm:hidden>` in the nav strip and `AnimatedText as="h1"
... hidden sm:inline-block` in the TopBar — exactly one ever exposed
(display:none), so screen-reader impact is limited, but `main` holds no
heading and the markup holds two h1s. `shots.log` records `h1="(no h1)"`
for /tools at all 4 widths (locator `main h1`). Axe has no h1-presence
rule, so the green axe run does not contradict this. Lines re-verified by
the lead inspector.
Why it matters: the landmark/heading contract the other 48 routes keep;
assistive-tech users get structure everywhere except Tools.
Fix size: trivial. Direction: one h1 inside `main`, responsive visibility
kept via classes.

### R-F5 — Create action disabled-on-unavailable is inconsistent across pages
Severity: low. Status: Verified.
Where: 10 pages with `disabled={unavailable}` (admin:166,
availabilities:153, equipment:102, leaves:114, noticeboard:313,
pachedu:264, requisitions:253, shifts:131, tasks-events:101,
timesheets:160); the rest — including /near_miss and /work_stoppage —
leave it enabled.
Evidence: lead inspector re-counted: exactly 10 files match.
Screenshots: greyed "New leave request"
(`browser/shots/leaves-error2@1440.png`) vs active "New report"
(`browser/verify-rerun/near_miss-error@1440.png`) under identical failure.
Either rule is defensible (POST may succeed where GET failed), but it
should be one rule.
Why it matters: identical failure states teach opposite lessons about
whether creating still works.
Fix size: small. Direction: pick one rule (recommendation: keep enabled
with honest error on failure, since POST and GET fail independently).

### R-F6 — Route-harness timing gaps caused the 2 flakes; transient path untested (harness)
Severity: low. Status: Verified.
Where: `frontend/scripts/verify-routes.mjs:41,63-66,71,77-80`.
Evidence: empty-state assert with no `waitFor` (:64); fixed 1200 ms sleep
plus immediate `isVisible` (:79-80); 800 ms settle while h1 renders before
async data (:41). These produced the full run's 2 FAILs (`/near_miss` "Try
again loads the register", `/work_stoppage` empty state), both passing on
2/2 independent reruns with honest-state screenshots — flakes, not product
bugs. Separately, :71 only ever serves non-transient 404, so R-F1's retry
path has zero harness coverage.
Why it matters: flakes erode trust in the suite; the untested transient
path is exactly where R-F1 hid.
Fix size: small. Direction: `waitFor`-with-timeout on both asserts; add a
persistent-500 variant asserting steady copy once R-F1 is fixed.

### R-F7 — `leaves-error.*` screenshots are mislabeled: they show loading, not error state (docs)
Severity: low. Status: Verified.
Where: `browser/shots.mjs:77-86` vs `browser/retake-error.mjs:9,20`.
Evidence: shots.mjs serves 500 (transient, retried per R-F1) and waits
10 s for failure text that can never arrive — the shots show "Loading
leave requests" + skeleton. The true error state is `leaves-error2@*.png`
(404 + 60 s wait). Filed so future readers do not cite the wrong shots.
Why it matters: mislabeled evidence misleads the next inspection.
Fix size: trivial. Direction: rename or annotate the two files.

## Inconsistencies table (same concern, different handling)

| # | Concern | Handling A | Handling B | Finding |
|---|---|---|---|---|
| 1 | 404 from `get_or_404` | employees/equipment re-raise HTTPException (404 survives) | leaves/timesheets swallow to 500 | B-F1 |
| 2 | Inverted dates in `total_days` | calendar mode stores negative | working-day mode returns 0 | B-F5 |
| 3 | Read-failure UX | non-transient 404: immediate honest error + Try again | transient 5xx: infinite loading, no error | R-F1 |
| 4 | Retry caps | `retryTransient` supports `maxWaitMs` | `useApiList` retries uncapped | R-F1 |
| 5 | Create while unloaded | 10 pages disable the button | rest (incl. near_miss, work_stoppage) leave it enabled | R-F5 |
| 6 | Notifications | `notify` wrapper (standard durations + chime), 2 importers | ~200 raw `toast.*` calls, defaults, no sound | S-F4 |
| 7 | Email validation | AuthForm regex-checks | admin invite checks non-empty only; backend `str` | S-F6 |
| 8 | Date comparison | shared `daysUntil` calendar-day helper | drivers hand-rolled instant compare | S-F8 |
| 9 | CrudRouter DELETE vs update | update 404s on missing | DELETE returns ok unchecked | B-F7 |
| 10 | Pagination params | `limit` parse guarded | `offset` parse unguarded (500) | B-F7 |
| 11 | List fetching vs row caps | `fetch_timesheets_map` paged | `fetch_leaves`/`load_employees` single-shot | B-F2 |
| 12 | CSP hosts vs API base | hosts hardcoded to prod | API/Supabase URLs env-overridable | S-F13 |
| 13 | Migration policies vs lockdown | feature files create open/`USING(true)` policies | file 4/4 drops them + verifies zero | D-F3 |
| 14 | `detail` on tiles | value shows "Unavailable" | detail still renders computed zeros | R-F2 |

## Dropped candidates (checked and ruled out, with reason)

Critic-level drops (were filed as findings or bullets, disproved on re-check):
- **S-F1 (missing icon PNGs)** — fully disproved: all six PNGs exist in
  `public/icons/`, dated 2026-10-14, git-tracked; manifest refs resolve; 13+
  PNGs under `public/`. The pack's directory read was wrong.
- **B-F13 `.dict()` bullet** — the pack's "0 hits anywhere" was false; 9
  comment hits exist and the remediation report's "5 hits are comments
  only" is essentially correct.
- **D-F4 "1916 passed" bullet** — the report is accurate (1916 confirmed
  twice this round); a stale local temp dir is not report drift.
- **D-F5 `is_active` corroboration** — the pack misread a 15-line file;
  lines 14-15 literally add the column. No live-first drift.

Backend pack drops: NEC job_id path traversal (FastAPI params exclude `/`
+ fixed filenames + `is_file()` gates + server-sanitized doc names);
NEC double-apply (keyed update-or-insert, benign rewrite);
`or_ilike` metacharacters (same-table authenticated lists only);
Tools `RegisterAccount.can_issue` ignored (cosmetic dead field);
overtime `hours=None` on start/end-only create (downstream recompute;
client-side, unverified); take-as-leave double-submit race (UNIQUE index
rejects loser; tiny and acceptable); backup-table check (live-only,
unverifiable read-only here).

Database pack drops: "file 4/4 breaks sign-in" (live policies intact);
"file 4/4 breaks backend writes" (service_role ALL + RLS bypass);
"anon reads data via the 60 open functions" (catalogue-disproved: all
invoker + revoked grants; live `.rpc()` probe not done, kept as F1
residual risk); "rollback file broken" (break-glass one-shot by design);
"housekeeping DROP list wrong" (all 6 items verified as described).

Frontend-static drops: standby `toISOString` round-trip (sanctioned UTC
exception); `Date.parse` in Tools (instant compares, never calendar days);
`lib/format.ts` UTC-midnight render (stable in UTC+2); CI eslint `--ext`
flag (re-ran: exit 0, works on v9.38.0); unused-dependency suspects — every
one has real imports, no unused runtime dependency found; `/av` and
`/employees-preview` (6-line redirect stubs, as ledgered); "Playwright
smoke" README claim (accurate); raw `<button>` hits (link-styled/custom
rows, no second design system); hand-rolled backend `fetch` (exactly one,
the fire-and-forget tools beacon, by design); `report-date-defaults` UTC
tests (meaningful, passing); `<title>` in client components (hoisted,
cosmetic); admin setState-during-render (documented pattern).

Browser-pack drops: the 2 full-run FAILs as product bugs (2/2 reruns pass,
honest-state screenshots); borderless tiles at 320 px (identical 1px
borders, perception artifact); clipped overtime tab at 320 px (scrolls,
clicks, selects); transparent dialog footer at 390 px (opaque in-flow
footer, overlay hit-test confirmed); noticeboard popup cards mouse-only
(Tab reaches Dismiss/Got it; board list opens the notice); F1 retry-rate
root cause (reported as numbers only, untraced); 14 Tabs staying in
header/sidebar (expected — skip link exists).

## Strengths worth keeping (do not touch these)

- Backend suite: 1916 passed, 94% statement coverage; pyright gate real
  (196/196, fails on increase); `pip audit --local`: no known
  vulnerabilities.
- Error honesty architecture: `server_error` helper, zero `str(e)` in
  responses, `DataRegion` honest states (verified on screens: "X could not
  be loaded" + reason + Try again, "Unavailable" tiles, never fake zeros
  except R-F2's detail leak).
- Live database state is good: 106/106 tables RLS on, zero rogue policies,
  zero rogue table grants, all views `security_invoker`, zero functions
  missing `search_path`, postgres default-privilege hole closed.
- Auth boundaries deliberate and tested: OPEN_READS pinned in tests;
  Tools register/login rate-limited with generic errors; 2FA fail-closed.
- Idempotent write paths: NEC apply (keyed update-or-insert, delta
  totals), take-as-leave (UNIQUE index), schedules claims, stock
  compare-and-swap — all reviewed and sound.
- Accessibility: full axe run 0 serious/critical over 49 routes; visible
  focus rings verified in screenshots; keyboard paths sane.
- Frontend unit suite 195 files / 1489 passed over a 35/34/27/38 ratchet;
  css-consistency ratchet at zero; no unused runtime dependencies;
  lockfile trimmed (12676 lines); production build clean in 79 s.
- Unknown enum values degrade gracefully in UI (literal badges, no crash).

## Coverage

What was inspected: full backend suite + coverage + pyright + pip-audit +
AST auth sweep + deep reads of auth core, error paths, PATCH semantics,
money/hours/date math, uploads, NEC import, Tools auth; all 66 migration
SQL files + rollback + live read-only catalogue (Q1-Q13, SELECT-only, no
row data, no secrets printed); full frontend static suites (tsc, eslint x3
forms, vitest+coverage, docs:check, css-consistency, build, npm audit x2)
+ shared-component and docs review; full route suite (49 routes) + reruns,
  full axe run + spot reproduction, 44+20 screenshots at 1440/768/390/320
  px incl. empty/error/keyboard/zoom states with 26 pixel-viewed; both
  remediation reports claim-by-claim against reruns.

Reconciled suite-count changes since the remediation reports (not
findings): vitest 214/1671 then vs 195/1489 now, and route checks 1910
then vs 1684+2 now — the owner commit `ec9158f` removed the other-session
dirs (`home-preview`, `wireframes/*`, `timesheets - Copy/`, all confirmed
absent) which took their tests/specs with them. Backend 1916 still exact.

Every command run (by area; full logs in the evidence packs):

Backend: `pytest -q` (1916 passed, 161.76s); `pytest -q --cov` (1916
passed, 94%, 366.63s); `check_pyright_baseline.py` (196/196, exit 0);
`pip audit` x4 (3 env failures, then exit 0 clean); `str(e)`/`.dict()`
greps; 2 AST sweeps (auth, 404-swallow); git status/diff/log/ls-files.
Database: tree + migration inventory; git status/log; line counts;
CREATE POLICY/DEFINER/GRANT/REVOKE/DROP/storage/INDEX searches; credential
presence (names only); full pytest with default TEMP (1889 passed + 27
WinError-5 setup errors on a stale `pytest-of-HP` dir — environmental;
file rerun with clean TEMP: 14 passed; 1889+27=1916); `test_migrations_rls.py`
(5 passed); live read-only Q1-Q13 via Management API.
Frontend-static: `tsc --noEmit` (exit 1 stale-cache, then exit 0);
`eslint .`, CI `--ext` form, `npm run lint` (all: 0 errors, 11 warnings);
`vitest run --coverage` (195/1489, 35.33/34.52/27.74/38.58 over 35/34/27/38,
1287s); `docs:check` (exit 0); css-consistency standalone (0 violations);
`npm run build` (exit 0, 79s); `npm audit` prod (exit 0, 3 moderate) and
full (exit 1: 3 moderate + 5 high, dev-only); lockfile line count (12676).
Browser: `verify-routes.mjs` full (1684 PASS + 2 FAIL, flakes); focused
reruns x2 (ALL PASS); `a11y-routes.mjs` full (49 PASS, 0 violations) + 3-route
spot (0); shots run (44 shots, ALL PASS log); 6 gap probes (tiles, tabs,
FAB, dialog, persistent-500, rerun shots); server start/stop on :3222.

What was NOT inspected / not verified (plain statement): live table row
data (deliberately never selected); live `.rpc()` exploit probes (F1
residual risk stands on catalogue evidence only); production login/MFA on
Render+Supabase; Supabase Auth settings / leaked-password / advisors
endpoint; the 196 pyright errors individually (count gate only); deep logic
of ~35 lower-risk routers beyond the auth sweep; NEC/WORK_ORDERS/TOOLS rule
docs line-by-line; signed-in live flows; screen-reader UX, reduced-motion,
touch, non-Chromium browsers; export/print outputs; notification bell and
Feedback popover open states; timesheets "Period at a glance" content
(probe outputs unsaved); visual-regression baselines; whether file 3/3 was
literally applied vs already-pinned (end state verified only); exact
apply order of all 66 files (schema_migrations empty — D-F5).

Quality note: a short certain list was preferred — 1 filed finding and 3
filed bullets were dropped on disproof, and every surviving item was
confirmed against an opened file body, a rerun command, a live catalogue
row, or a viewed screenshot. Anything suspected but unproven is labeled in
place (R-F1 retry-rate side observation; D-F1 residual risk).
