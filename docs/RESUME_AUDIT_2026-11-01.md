# Recovery audit — 1 November 2026

Source of scope: the owner's resume instructions and motion context, supplied as local files. The section-1 ledger
was posted to the owner before any source/documentation edit. No commits, pushes, tags, deployments, SQL execution,
real-account sign-ins or live-data mutations were performed in this audit. All automated browser sessions use fixtures.

## Starting state

- Frontend HEAD `26146c4` on `fix/ui-consistency-remediation`, tracking the matching origin branch. This commit is
  **not on main**. Local and remote main are `580b22c`; the supplied prompt's main landmark was incorrect.
- Backend main and origin/main are `af45f7f`. No backend source changes are required by these fixes.
- Preserved: frontend untracked `debug.log`; backend untracked `supabase_fix_reset_work_orders_20261027.sql`;
  all existing worktrees and branches. No cleanup, reset, stash or line-ending normalization.
- Both initial tracked diffs were empty. Initial diff checks passed. Global-ignore access warnings remain unchanged.

## Section 1 ledger and evidence boundary

The verdicts below concern delivered code and the named checks, not production certification. Release tags were read
from origin with `git ls-remote`, compared with local peeled commits, and checked as ancestors of **main**, separately
in each repository. Historical suite totals are not fresh test results. SQL application and real-user acceptance remain
owner-reported until the owner checks them.

| Pack / batch | Claimed delivery | Current verdict and evidence |
|---|---|---|
| Tools wording 1 | Released | VERIFIED-DONE in source; frontend tag `827421a` on main/origin. Visible terminology uses Tools; API/schema names retained. |
| Set types 2 | Released | VERIFIED-DONE for implementation/focused tests; frontend `0357f80`, backend `6a318de`. Set types, numbered pieces, per-person issue and old-link refusal exist. SQL state not queried. |
| PPE budget 3 | Released | VERIFIED-DONE for implementation/focused tests; frontend `1ba7e1b`, backend `f1e070b`. Calculation/workbook regressions pass; live saved settings unverified. |
| Mining/import 4 | Released | VERIFIED-DONE for implementation/focused tests; frontend `34b2bff`, backend `af45f7f`. Structured scope, module enforcement and importer exist; no real permissions/imports changed. |
| N0 reconciliation | Finished | VERIFIED-DONE as a historical inventory. Its initial gaps must be read together with N1/N2. |
| N1 layer/adoption | Released | VERIFIED-DONE in checked shared scope; `dc7635d` on main/origin; motion primitive/adoption tests rerun. |
| N2 compressor/ratchet/zoom | Released | VERIFIED-DONE with a performance limitation; `dcdc40f` confirmed. Memoized UnitGrid, deferred focus and UnitPod/UnitDrawer zoom exist and fixture route checks pass. |
| N5 motion half | Finished | VERIFIED-DONE for delivered measurement work; `a028ed1` confirmed, six trace JSONs and eight recordings exist. Historical performance failures were explicitly recorded, not passes. |
| N3/N4/search half N5 | Excluded from motion run | NOT-DONE by that pack, explicitly deferred. No search redesign added to this recovery patch. |
| Workflow cleanup | Finished/accounted for | VERIFIED-DONE for the released-work accounting: B-series tags/ancestry corroborate it. Runtime queues from a different tool/session cannot be inspected or cleared here. |
| B0 bulk work orders | Released | VERIFIED-DONE for endpoint/shared selection; frontend `1cbdc6d`, backend `5f318c6`; focused backend tests and shared BulkBar tests pass. |
| B1 labelled exports | Released | VERIFIED-DONE in checked shared scope; `ab90919` confirmed, ExportButton/export-consistency tests pass. Later Download wording supersedes old copy. |
| B2 refresh | Released | VERIFIED-DONE in checked shared scope; `3a12cd5` confirmed, shared refresh tests pass; mutation/in-flight gates retained. |
| B3 motion foundation | Released | VERIFIED-DONE in checked shared scope; `6198471` confirmed, preset/primitive/ratchet tests pass. |
| B4 slice 1 | Released | VERIFIED-DONE in checked shared scope; `f81d36a` confirmed, zoom/list/feedback source and tests present. |
| B4 slice 2 | Released | VERIFIED-DONE in checked scope; `14ce535` confirmed, rollout source and fixture scenarios present. Strict performance bar remains red. |
| B4 slice 3 | Released | VERIFIED-DONE in checked scope; release record `3cc11ce` includes implementation `9276011`; copy/table/state wiring remains. |
| B4 slice 4 | Released | VERIFIED-DONE in checked scope; `c3518ff` confirmed; floor/chart/snap work remains. UnitPod deferral was subsequently completed in N2. |
| B5 review | Finished | DONE-POORLY at intake in the confirmed follow-ups; now corrected in this uncommitted patch: report printing, PointerEventsGuard's nonexistent portal wrapper, and animated StatusBadge's invalid inline HTML. Validation below. This does not invalidate every B5 feature. |
| Projects scope, 23 Oct | Planned then released | Implementation exists and subsequent Mining scope tests cover compatibility. Historical frontend scope merges are ancestors of main. Production account settings are not revalidated. |
| Full-product A, 22 Oct | Local auth repair | VERIFIED-DONE for implementation/tests: backend `34be972` is on main; full current backend suite passes, including endpoint-auth/security regressions. No real-account security certification. |
| Full-product B | Local paging repair | VERIFIED-DONE for implementation/tests: frontend `7ff1724`, backend `774d773` are on main; current import orchestration/backend regressions pass. |
| Full-product C | Local retry-state repair | VERIFIED-DONE for implementation/tests: `b9abec4` on main; full current frontend suite passes. No historical browser totals reused. |
| Full-product D | Local session/error/upload repairs | VERIFIED-DONE for implementation/tests: backend `9f19823` on main; current full backend suite passes. No live logout/uploads performed. |
| Full-product E | Local migration safeguards | VERIFIED-DONE for source safeguards/tests: backend `8c54f41` on main; current rerun-safety/tracking tests pass. No SQL execution. |
| Full-product F | Local helper/calculation repairs | VERIFIED-DONE for implementation/tests: backend `107ed65` and frontend `d14d9e5` on main; both current full unit suites pass. No business calculations changed here. |
| Full-product G | Local test/quality repairs | VERIFIED-DONE for implementation/tests: frontend `3ce317a` on main; full current frontend suite and docs checks pass. The old local-only delivery claim is stale. |
| Full-product H | Verification only | VERIFIED-DONE for its ledger interpretation: test-file counts are not test-case counts (Tools now has 33 test files); Axios is absent from package.json; the five alleged missing page paths still do not exist. Current docs ledger is valid. This does not certify every hidden workflow. |
| PPE/timesheets/notifications, 21 Oct | Uncommitted patches | Historical status stale: frontend merge `eab19ff` contains `8f08ad1`. Current source contains delivered features. Payroll/import business rules were not changed. Full historic real-user acceptance is unverified. |
| UI remediation, 1 Nov | Feature branch | Implemented at current HEAD `26146c4`, not merged into main. Prior checks are recorded separately in CURRENT_HANDOFF section 11. |

Older-pack acceptance remains a limited revalidation, not VERIFIED-DONE for every workflow. There is no evidence here
that the absent handoff in the newest pack means the implementation never ran. Conversely, tags do not prove live SQL.

## Known-open items, confirmed in order

1. **UnitPod zoom:** already finished by N2; no replacement built. Compressor fixture checks include zoom mode,
   close/reversal and recovery. Existing shared Zoom/registry regressions pass.
2. **Performance:** retain the literal strict gate. On the starting production build, `perf-zoom-trace.mjs` at 1x
   measured click-to-open **203 ms**, open **128 ms max** (one task >50), close **53 ms max** (one), insert zero.
   At 4x: click-to-open **2235 ms**, open **1727 ms max** (two), close **457 ms max** (two), insert **285 ms max**
   (seven). Both commands exited 1. No threshold/window was relaxed. These measurements include interaction/mount/list
   cost; they do not independently prove the animation flight is cost-free. The old zero-task flight is historical.
   A focus-scope/page-weight redesign is a separate measured performance project, not a reason to replace shared zoom.
3. **Engineering report print:** reproduced with failing browser tests at 1440/390; now opts into a print-only shared
   layout, keeps period/totals/chart descriptions, hides chrome/actions, wraps metrics, and restores the screen on exit.
   Render review exposed dark-palette status values at **1.91:1** on paper; the additional failing contrast regression
   drove the light-palette fallback for semantic values, grounds, progress and chart roles. Actual A4 PDF review then
   caught dark margins and a split lubrication card; additional failing checks led to hiding the decorative backdrop,
   forcing a light browser page-box scheme in print, and keeping short report cards together. Both corrected PDF pages
   were rendered with Poppler and visually inspected: white margins, no clipped content, whole lubrication card.
4. **Employee empty state:** existing harness now awaits expected text. It passed unchanged in the fresh route run.
5. **Employee normalisation retry:** `042c1e4` already reopens the dialog and observes both POSTs; the fresh fixture
   route check passed unchanged. No business or retry logic changed.
6. **PointerEventsGuard:** real fixture DOM probe showed zero portal-marker matches while a dialog was open, with
   body lock wrongly cleared. Tests now reproduce real role/data-state shape, preserve open/closing overlays, repair
   mount-time leaks, ignore inline listboxes, and check real dialog + nested picker close/recovery in Chromium.
7. **Sidebar baseline:** NOT-DONE. Current test asserts geometry and captures a still, but has no sidebar pixel
   comparison/baseline. The sanctioned Ubuntu workflow always commits/pushes. It was not invoked; no unrelated images
   were refreshed. A safe artifact-only Ubuntu run needs a separately approved workflow change/release path.
8. **Architecture backlog:** acknowledged, not started. CrudRouter is already widely adopted (the old partial-adoption
   claim needs updating); calculation files exist but some page-local logic remains; backend pyright still uses a
   196-error baseline. Frontend standards' lib-only test glob/two-component-test claims are stale against current config.
9. **Old queues/debug.log:** runtime history is unavailable here. No old workflow was resumed. `debug.log`, reset SQL,
   other worktrees and other sessions' servers are preserved.

## Additional confirmed issue fixed

StatusBadge's normal-motion Presence emitted a div inside inline content; the fresh failing regression reproduces the
React nesting diagnostic. Presence now accepts `as="span"`, used by StatusBadge. No animation timing or status semantics
changed. Shared hooks' feedback throw/re-entry tests, reduced-motion/SSR parity, and first-active indicator tests exist;
these do not replace a real-device or screen-reader review.

## Execution evidence (updated as gates complete)

- Fresh initial frontend focused run: **40 files, 195 tests passed**, exit 0.
- Fresh initial backend set/budget/Mining/import/bulk-delete run: **98 passed**, exit 0 (deprecation/cache warnings).
- Additional scope/auth/import/migration/helper run: **453 passed**, exit 0. Then the **full current backend suite:
  2928 passed**, exit 0, one Starlette/httpx deprecation warning, 195.90 seconds. No backend source edits or SQL.
- Initial fixture route run: **318 PASS, no FAIL**, all checks passed for employees, compressors, engineering report,
  PPE and Tools, including 390/820/844/1180 geometry checks. Current production bundle at the starting HEAD.
- Failing-first: three new browser tests failed (real modal lock and report print at both widths); five new pointer
  unit cases failed after fixture cleanup; inline Badge test failed; print contrast test failed at 1.9062:1.
- After fixes: pointer unit file **7 passed**; Badge/Presence/motion-ratchet/feedback focused run **4 files, 20 passed**;
  new Chromium regressions **3 passed**, including print text contrast >=4.5, 0px overflow, selected period, real
  dialog/nested Select lock and recovery. Print-emulation screenshots at 1440/390 were inspected.
- Final production build: exit 0, **68 static pages**. One dynamic-filesystem tracing warning in the untouched
  budget-shift-book route remains; build success is not browser certification.
- Final `tsc --noEmit --pretty false`: exit 0. Repository-wide `eslint .`: exit 0, **0 errors / 23 warnings**.
  `docs:check`: exit 0, **0 errors / 26 TypeDoc warnings**, all link/ledger/CSS/export/refresh/motion checks clean.
- Complete final frontend unit run: **358 files / 2589 tests passed**, exit 0, **1732.81 seconds**, two fork workers.
  An earlier four-worker attempt overlapped heavy checks, timed out in ToolForm's invalid-name focus test, and was
  stopped rather than counted as passing. The unchanged whole Tools interaction file then passed **51/51** alone
  (51.92 seconds; that focus case **697 ms**), followed by the clean full run. No timeout, assertion or product code
  was changed to clear it. No unsupported attribution of that timeout to a pre-existing product defect is made.
- Final production Playwright run: **4 passed** (new modal/picker and print tests plus existing sidebar-rail geometry).
  The sidebar test captures an image but does not perform a Linux pixel comparison.
- Full fixture route sweep: **2122 PASS / 2 FAIL**, exit 1. Both failures are the Availabilities manual-downtime
  overwrite described below. The broad route gate is **not fully green**. Other checks include normal-motion browser
  errors and overflow at 390/820/844/1180. Overtime/Pachedu/PTO/VFL no longer emit the nesting diagnostics; representative
  desktop/phone captures were inspected. This is fixture verification, not full production or hidden-workflow acceptance.
- Full axe route scan: exit 0, **60 fixture entries passed**, **0 serious/critical violations**. Not a full manual WCAG audit.
- Standalone job card under Mono dark, print emulation: light page-box scheme, hidden decorative backdrop,
  `rgb(27, 41, 35)` heading, 0px overflow; screenshot inspected. Report A4 PDF: both pages rendered with Poppler and inspected.
- Owner-only checks: owner replied **"Checks passed"** to real signed-in report print preview (including allowed dark
  mode), Employees form/picker cancellation, and PPE Reset confirmation **cancel only**. This is owner-reported
  acceptance, distinct from fixture automation. No SQL is needed for these fixes, and no SQL was run.
- An initial broad frontend unit/route attempt was stopped when actual PDF review found the page-box/pagination
  defects. Those interrupted attempts are not counted as passes. Final runs follow the final source edits.

## Additional finding approved for inclusion: Availabilities prefill

The full route sweep's two failures concern **downtime hours**, not notes. Selecting equipment starts an asynchronous
breakdown prefill. If the person types 3 hours before that request resolves with 9, `RecordDialog.prefill` overwrites the
manual value. This is a data-input race; the failing save-persistence/body assertions must not be weakened or hidden.

Base evidence, as required before calling it pre-existing:

- Created `frontend-resume-base/`, detached at the exact starting commit `26146c44ab1293657fd6568ccfa4cb4bc97592a8`.
  The app worktree tool rejected the nested Git source root, so Git created this verification checkout locally.
- Installed its **own** dependencies with `npm ci --no-audit --no-fund` (790 locked packages; no primary dependency changes).
  Both package-lock SHA256 values match: `BA324314A89C0D644A0FD91D9425CB546BF4AD4BAF5BAB8C64B1BCEA591F324D`.
- Base tracked source diff is empty; its only added file is the explicit negative regression probe.
- Ran the identical deferred-response probe against base and current source, one worker each. **Both fail identically**:
  expected downtime **3**, received **9**. Base: 33.48 seconds; current: 33.34 seconds. The ordinary 358-file unit suite
  does not currently cover this race.
- The temporary current-tree probe was copied to the ignored evidence folder and removed only after its hash matched
  the preserved base probe. No existing file was removed. Evidence: `node_modules/.cache/resume-base-proof/`
  (`RecordDialog.resume.test.tsx`, `base.log`, `install.log`) and `node_modules/.cache/resume-availability-current-proof.log`.
  The isolated base checkout and its negative test are retained for review. Base verification did not alter product
  source in the original checkout; all other existing worktrees remain untouched.

The owner replied **"Include the focused fix"** on 1 November. The fix is now included; the earlier three corrections
are preserved. `RecordDialog` owns a lookup generation: equipment/date changes, manual downtime edits (including zero),
valid submission, closing, record/open-context changes and unmount retire old results. Both obsolete success and error
responses are ignored. A current failure still gives the existing manual-entry instruction; manual input clears obsolete
source hints. No transport, availability formula, threshold, payload shape or backend behaviour changed.

Regression coverage: eleven real-component cases cover untouched prefill, manual 3/0, old equipment success/error,
dates changing away/back, cleared date, close/reopen, current failure/manual correction, rejected-save snapshot and
editing existing records without prefill. The pre-change run reported **9 failures / 2 passes**. After the guard,
RecordDialog plus existing calculation tests pass **26/26**. The current-failure test uses the existing immediate
rejected-transport pattern; deferred obsolete failures remain covered. A temporary explicit-rejection harness failure
and diagnostic runs are retained in cache; no product assertion or timeout was relaxed.

The controlled browser regression at 390px delays the lookup until after 3 hours is entered, returns 9 hours, then
asserts both the visible value and the mocked saved payload remain 3. It passed on the dev server and its screenshot
was inspected. The owner also reported **Checks passed** for signed-in entry, waiting, cancelling/discarding and reopening
with normal defaults, without saving a live record.

Post-inclusion validation on the production build:

- TypeScript passed; repository lint passed with **0 errors / 23 warnings**. Documentation gates passed with
  **0 errors / 26 existing TypeDoc warnings**, current ledger and clean links/CSS/export/refresh/motion ratchets.
- Production build compiled and generated **68 static pages**. The existing budget-shift-book dynamic-filesystem
  tracing warning remains; no unrelated API change was made.
- Chromium: **5/5 passed**: delayed prefill/manual saved payload, actual Radix modal/picker lock, engineering-report
  print at 1440/390, and sidebar geometry. This last check does not provide the missing Ubuntu pixel baseline.
- Affected Availabilities route: **40 PASS / 0 FAIL**, including failed-save preservation and saved downtime 3.
  Desktop 1440 and responsive 390/820/844/1180 checks passed with zero page overflow/browser errors.
  The phone manual-entry and desktop failed-save screenshots were inspected; labels, fields and actions fit.
- Affected axe scan: **0 serious/critical violations**. This is automated fixture coverage, not manual WCAG certification.
- Evidence logs: `node_modules/.cache/availability-final-{tsc,eslint,docs,build,playwright,routes,a11y}.log`;
  route captures: `node_modules/.cache/availability-final-routes/`.
- Full post-inclusion Vitest: **359 files / 2600 tests passed**, exit 0, two fork workers, **2009.76 seconds**.
  Log: `node_modules/.cache/availability-final-vitest.log`. No competing build/browser/lint job ran during this suite.

The earlier full route sweep remains recorded as **2122/2 before this fix**. The focused production rerun closes its
two identified failures; a second full-product route sweep is not claimed.

Generated migration ledger updated only the Availabilities test-file count (2 to 3); its historic rendered-verification
date and the overall migration totals were not promoted by this test change.

## Release and remaining risk

Uncommitted frontend-only recovery work on the existing feature branch. Main/production are unchanged by this task.
Strict performance and sidebar Linux pixel-baseline gaps remain open; Availabilities post-fix production checks passed.
Historical full-product acceptance and hidden workflows are not certified. All test mutations are intercepted fixtures; production SQL state/account access requires
the owner. Review shared print fallback also on the standalone job card; normal screen appearance must remain unchanged.

## Exact changed files and shared effects

| File (frontend-relative) | Purpose / regression boundary |
|---|---|
| `app/availabilities/RecordDialog.tsx` | Retire obsolete prefill results on new context/manual input/submission/close; calculations and server unchanged. |
| `app/availabilities/RecordDialog.test.tsx` | Eleven prefill, manual override, stale response and form-lifecycle regressions. |
| `app/engineering_report/page.tsx` | Opt-in print article, visible paper period, wrapping metrics and whole short cards. Calculations and source orchestration unchanged. |
| `components/shared/floor/FloorBackdrop.tsx` | Stable marker to hide decoration on print-first surfaces; no screen styling change. |
| `components/ui-system/foundations/base.css` | Scoped paper layout, page-box colour scheme and existing light-palette roles; also benefits the standalone print-first job card. |
| `components/ui-system/shell/Frame.tsx` | Stable frame/top-bar markers for opt-in print isolation; expanded/collapsed navigation layout unchanged. |
| `components/ui-system/overlays/PointerEventsGuard.tsx` | Recognize actual Radix content and repair mount-time orphaned locks. Open/closing dialogs, drawers, menus, popovers and Selects share the effect. |
| `components/ui-system/overlays/PointerEventsGuard.test.tsx` | Seven repair/preservation/inline-listbox regression cases. |
| `components/ui-system/motion/Presence.tsx` | Optional inline wrapper; block default and animation presets unchanged. |
| `components/ui-system/primitives/Badge.tsx` | Valid inline animation wrapper; status wording/tones unchanged. |
| `components/ui-system/primitives/Badge.full.test.tsx` | Real full-motion React nesting regression. |
| `e2e/resume-followups.spec.ts` | Delayed prefill/manual saved payload, real modal/picker locks and report print geometry, period, contrast, page-box scheme and decoration/card print rules. |
| `components/ui-system/README.md` | Effective contracts for inline motion, modal-lock repair and print-first surfaces. |
| `docs/CURRENT_HANDOFF.md` | Append recovery status/evidence without replacing historical entries. |
| `docs/MIGRATION_LEDGER.md` | Generated Availabilities test-file count, without a browser-certification/date change. |
| `docs/RESUME_AUDIT_2026-11-01.md` | This ledger, evidence, limitations and follow-ups. |

No dependency, backend, schema, status, approval, payroll, timesheet-persistence or theme-eligibility changes. No screenshot
baselines were updated. Existing untracked files are outside this change. The shared-effects review focuses on modal
handoffs, normal-motion badge consumers, normal screen navigation, and the job card's print light fallback.

## Three next improvements

1. Profile and reduce dialog focus-scope/page mount work on a representative low-power device: medium-to-large effort/risk;
   retain focus trapping, keyboard access and strict measurements.
2. Add an artifact-only, sidebar-filtered Ubuntu baseline path, review the image, then explicitly approve its commit:
   small effort/low product risk; publishing still requires owner authorization.
3. Reproduce the Overtime employee-lookup readiness/error lead in CURRENT_HANDOFF section 11 before changing it (see follow-up below):
   small-to-medium effort/medium summary-accuracy risk; preserve payroll calculations.

## Follow-up — 1 Nov 2026 (same branch, uncommitted)

All three items above are now worked; full account is CURRENT_HANDOFF section 13.

1. Dialog performance: reproduced red on the production build (1x click-to-open 373ms, 4x far worse), separated costs with a CDP trace (JS commit plus Radix mount/focus/scroll-lock plus full-page style recalculation) and a motion-vs-reduced control that exonerates the animation flight. Smallest effective correction landed (`hasDialogField` fast-path plus stale-pass guard); before/after deltas are noise and the strict gate stays red, reported honestly. No threshold weakened, no work moved outside the window, no replacement dialog.
2. Sidebar baseline: artifact-only Ubuntu workflow added (`.github/workflows/sidebar-baseline-artifact.yml`, contents read-only, uploads stills plus reports, never commits). Geometry test passes and the still was inspected. Linux execution itself is the one outstanding step (owner's manual Actions run plus human review).
3. Overtime lookup: lead confirmed with a failing-first test, fixed by gating `SummariesView`/`BudgetView` generation on `useEmployeeRegister().loaded` (shared cache, no extra fetch). Payroll, matching, approvals, caps and workbook columns untouched. Route specs for `/overtime`, `/employees`, `/documents` pass; Summaries/Budget inspected at 1440 and 390. Final full frontend suite: 359 files / 2602 tests passed, exit 0, two fork workers, 2816.84s.
