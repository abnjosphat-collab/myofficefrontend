# Overtime saving and bulk employee completion — 2 November 2026

## Scope and starting state

Owner reports repeated live bulk-save failures, sometimes partial success, and requests inline name autocomplete/Tab
selection like individual overtime entry. Site in screenshots: `https://myofficefrontend.vercel.app/overtime`.
No live overtime was submitted by this investigation. Existing Mining/PPE work, debug.log and SQL files preserved.
Frontend began at `55a2176` and backend at `78d474c`; both had other-session changes. Recheck before release.

## What the evidence establishes

1. Browser `Failed to fetch` is an unreadable/lost HTTP response, not proof of a payroll validation failure or a particular
   employee being invalid. Browser/network, intermediary and CORS failures can all produce it.
2. Owner's second screenshot reports **1 submitted / 1 not saved** with application reference **eaf1458**. That attempt
   received a backend application error, so these reports cannot all be explained as a disconnected local browser.
3. Owner-supplied Render log excerpt at **06:39:32 UTC / 08:39:32 Africa/Johannesburg** includes
   `httpx.ReadError: [Errno 11] Resource temporarily unavailable` during backend HTTP transport, followed by an overtime
   list HTTP 500. Other Supabase calls subsequently succeed. At 06:39:51 UTC Render records an instance restart.
   This demonstrates intermittent backend/upstream transport failure and a nearby restart. The excerpt does not contain
   the start of the eaf1458 traceback, a POST insert outcome, restart reason, memory metric or OOM diagnosis. Do not claim
   it proves which SQL/HTTP step failed or that a particular POST never committed.
4. Four authorised anonymous diagnostic requests (version, health, overtime OPTIONS, overtime GET) received HTTP 429
   HTML `Just a moment...` challenge responses without Allow-Origin. The OPTIONS request used the exact live frontend
   origin and POST/authorization/content-type headers. This blocks this automated client's verification and shows a
   possible unreadable-response mechanism; it does **not** prove the owner's browser received the same challenge.
   No protected records were read and no write endpoint was exercised. No challenge bypass was attempted.
5. Current source confirms a separate responsiveness defect: async `create_overtime` runs synchronous Supabase scope,
   conflict, insert and audit calls directly on the event loop. A controlled slow insert prevents an independent async
   continuation until the save ends. This can delay other requests while a dependency is slow; it does not prove it caused
   the observed Render restart or HTTP transport error.
6. Bulk entry uses separate sequential POSTs. Partial success is possible by design, and confirmed successful people
   already leave the retry list. Previously a transport failure or 5xx was always labelled **not saved**, although a lost
   response may follow a successful insert. Never blindly replay POSTs to hide the problem.

Conclusion: service-side instability is evidenced, and a blocking-save defect is reproduced. The exact production
restart cause and full eaf1458 POST traceback remain unverified. Local patches below do not certify live resolution.

## Changes

| Source | Change | Boundary |
|---|---|---|
| backend `app/routers/overtime.py` | Keep the async route contract; execute one complete synchronous create operation with `run_in_threadpool`, including scope/conflict/audit work | Actor ContextVars propagate; no detached work, duplicate POST replay, payroll/approval/payload change |
| same | Classify `httpx.TransportError` during list/create as 503 through existing referenced error handling | Database refusals remain 409/422; unexpected errors remain generic 500; no CORS widening or transport-policy replacement |
| `BulkOvertimeForm.tsx` | Count transport/5xx/408/unreadable or otherwise unconfirmed outcomes as **not confirmed**, retain those people, request a list refresh and explain checking before retry | Confirmed successful people removed; clear 4xx refusals retain server messages; explicit resubmit attempts remaining people only |
| `PeopleChecklist.tsx`, `NameTypeahead.tsx` | Optional autocomplete and keepFocusOnPick backed by existing NameTypeahead; bulk overtime opts into both | Bulk Tab/Enter adds and keeps Employees focused; empty Tab advances; single pickers retain default Tab advancement; mine-number matching, Section filter, ticks and chips retained |
| `OptionChecklist.tsx` | Optional renderSearch receives the existing filtering query | Default SearchField behaviour unchanged for other consumers; no second independent search state |
| UI README / generated ledger | Describe the opt-in contract and update test-file counts | No rendered-certification dates promoted; generated ledger also reflects concurrent Mining test files |

No SQL, environment, package, access-rule, approval-authority or overtime-calculation change. This patch does not add
offline queues, automatic retries of uncertain writes, idempotency schema or a bulk-create endpoint. An uncertain request
may still need operator reconciliation against the register; the UI now says so.

## Regression evidence

- New responsiveness/transport tests: **3 failures before / 3 passes after**. They verify an event-loop continuation
  during a blocked fake insert, worker-thread execution, actor-context propagation, 503 classification and no replay.
- Backend focused CRUD/conflict/responsiveness set: **85 passed**. Pyright remains **196**, at the existing limit.
- Full backend run initially reached **2932 passed / 27 setup errors** because the existing pytest temp root was denied
  by Windows permissions. No assertion was disabled. Rerun with a verified new workspace-cache basetemp:
  **2959 passed**, **92.94% coverage** (90% required), exit 0, 315.56 seconds. Existing permission/deprecation warnings remain.
- New shared autocomplete tests fail before the opt-in exists and pass after. Focused shared picker/checklist plus bulk
  save tests: **29 passed**, followed by **6/6 final bulk-outcome tests**, including zero-response refresh, 408 timeout
  and unreadable-response cases. After the owner's focus request, shared checklist/picker/bulk focused run: **29 passed**
  across three files. These runs overlap; their counts must not be added as unique test totals.
  Covers completion/Tab/Enter, Section restriction, existing tick/search/remove behaviour,
  partial success, 422 explicit retry and uncertain transport/500 with no automatic POST replay.
- An isolated copy of the starting BulkOvertimeForm, using the same corrected outcome tests, fails **2 / passes 1**;
  current implementation passes. Probe files were hash-checked and removed only after preserving them in ignored cache.
  Initial test-fixture errors (checkbox accessible name and canonical designation) were corrected before this comparison.
- TypeScript passed; full lint **0 errors / 23 warnings**; docs **0 errors / 26 TypeDoc warnings**, all existing ratchets clean.

## Rendered checks and remaining gates

- Final production build passed, **68 static pages**. Existing budget-shift-book tracing warning remains. Initial
  sandbox build failed on Google Fonts downloads; network-enabled build then caught an in-progress PPE prop declaration
  from the other session. Once that session completed the declaration, builds passed. No PPE source fix was made here.
- Final Chromium regressions: **2/2 passed** at 1440 and 390, including Tab/Enter, correct employee payload metadata,
  partial successful/lost responses, preserved remaining selection, list refresh, no automatic replay and zero body/dialog
  overflow. Screenshots inspected; notice text/actions fit. All API writes were intercepted fixtures.
- A first desktop dev scenario timed out during cold page compilation before reaching the form; phone passed. No timeout
  was increased. The production rerun and final-build rerun both passed at both widths.
- Overtime route: **65 PASS / 0 FAIL**, including existing CRUD, partial refusal, summaries and 390/820/844/1180 checks.
  Targeted axe: **0 serious/critical violations**.
- PPE cross-consumer pass on the concurrent Mining build reports **2 failures**, not a pass: the new opening-record
  hide assertion, and a `More` button locator matching three controls. Those new Issue Log scenarios are from the other
  session; no attempt was made to suppress them or change its source. Responsive geometry/browser-error checks passed.
- Backend Sphinx `-W` exits 1 on **3 toctree warnings** for BACKUP_AND_RESTORE, PPE_BUDGET and PROJECTS_SCOPE.
  Reported as an open documentation gate, not a claimed pass or an independently base-proven failure.
- Owner reported **yes** to the initial real-session selection/Tab/Enter/cancel check, then requested that the cursor
  remain in Employees after adding a name. The opt-in keepFocusOnPick implements that follow-up. A new consecutive-Tab
  focus test fails before and passes after; defaults still advance and empty Tab still advances. Updated final production
  browser regressions passed **2/2** at 1440/390 against the final focus build. This follow-up is browser-fixture verified,
  not a second owner-reported manual pass.
- Final frontend full suite: **362 files / 2638 tests passed**, exit 0, two fork workers, **3189.58 seconds**.
  Earlier attempts were interrupted for final outcome review and the owner's focus
  change; neither is counted as a completed pass. A later build and lint process both stopped with exit -1 without compiler
  errors; a process check found no Node processes. Cause is unknown. Final build and focused lint reruns subsequently pass.

Repeated-rejection test setup now uses distinct error instances per simulated HTTP request, reflecting real transport
failures. An earlier repeated-instance harness run failed; the zero-response assertions remain unchanged and pass 4/4.
Final focused lint is clean. No product assertion, worker timeout or coverage threshold was relaxed.

Final frontend diff check is clean. The whole backend diff check is **not clean**: concurrent `app/routers/ppe.py`
contains repeated trailing-CR/blank-line errors. That file belongs to the ongoing Mining work and was not modified here.
The scoped overtime router diff check passes. Do not blanket-stage, normalize or certify the combined worktree.

Evidence logs are under `node_modules/.cache/overtime-*`; base UI probe under `.cache/overtime-resilience/`.
Owner screenshots/logs are primary evidence of the reported live incidents, distinct from local fixture regressions.

## Release and follow-up

At the end of the investigation no commit, push, deployment, migration or live mutation had been performed. The owner
subsequently authorised commit and push to main to go live on 2 November. Isolated release preparation is in progress;
the completed release evidence will be recorded in CURRENT_HANDOFF. Backend must be
released before frontend through the normal owner gate. Owner performs signed-in acceptance after a preview/release;
do not submit test payroll records to production. Recheck Render restart events and CPU/memory around 08:39, and obtain
the beginning of the referenced POST traceback to identify its exact operation. A local pass does not resolve platform
availability or establish that the production fix is deployed.
