# Current handoff: MyOffice redesign

**Status as of 3 Oct 2026.** This is the one current handoff; any agent or developer, in any tool, should start here.
It supersedes [`CLAUDE_HANDOFF_2026-09-30.md`](./CLAUDE_HANDOFF_2026-09-30.md), [`MUSE_HANDOFF_2026-10-01.md`](./MUSE_HANDOFF_2026-10-01.md),
their prompt files, and is the summary of [`CLAUDE_REDESIGN_CHECKPOINT_2026-10-03.md`](./CLAUDE_REDESIGN_CHECKPOINT_2026-10-03.md)
(the checkpoint keeps the long per-route narrative and defects found).
Update this file at every milestone and before stopping for any reason.

## 1. Goal and decisions

Rebuild MyOffice around the real Tools & Equipment (`/tools`) interface as one shared design system.

- One appearance. There is no light/dark switch and no old theme. Text size (85–130%) is the only appearance preference.
- Preserve business behaviour. Keep Feedback visible in the top bar. The old bottom bar and its hard-coded status are gone.
- Never fake data and never show a failed load as an empty list (`DataRegion` / `deriveDataStatus`).
- A passing build or spec is not visual verification. Rendering is inspected and recorded by hand
  in [`migration-verification.json`](./migration-verification.json).
- Confirmed with the owner: the new sidebar drops "Recent activity", "Operations snapshot" and "Tips"; the first-run
  preferences popup is not carried over.
- Settings uses the spanner (Wrench), same as Tools. Icon meaning lives in `components/ui-system/icon-meanings.ts`.
- Website and installed apps are one codebase and one deployment ([`PWA_UPDATES.md`](./PWA_UPDATES.md)).

**Standing constraints from the owner:** do not commit, push, deploy, run database migrations or alter live records
without explicit authorisation. Preserve pre-existing uncommitted edits. Work inline; keep chat concise; never put
credentials or private business records in docs.

## 2. Git state (two separate repositories)

| Repo | Branch | Commits | State |
|---|---|---|---|
| `frontend/` | `redesign/ui-system` (pushed; `main` untouched) | `6b460f7` earlier Tools polish edits, `7dcabd9` the redesign | clean, except an untracked debug image `docs/_dbg.png` left out on purpose |
| `backend/` | `redesign/ui-system` (pushed; `main` untouched) | `67b9b17` earlier NEC rules edit, then the backend changes | clean |

Committed and pushed to the `redesign/ui-system` branch of both repos on 4 Oct 2026 at the owner's request, so a cloud session can continue. Nothing was merged to `main`, deployed, or released; the backend changes are not running live (only the `services.stage_signatures` column is). Because the owner's earlier edits were interleaved with the redesign in many files, only the clearly separate ones (`app/tools/**`, `e2e/smoke.mjs`, `docs/tools-polish-2026-10-02/`, the NEC rules doc) are in their own commit. Earlier note about who owned what, kept for reference:

- **Redesign (this effort):** `components/ui-system/**`, `components/app-shell/**` (new shell files; old TopNavigation,
  SidebarNavigation, BottomBar, PreferencesPanel deleted), migrated route folders (section 5), `lib/useApiList.ts`,
  `lib/serviceWorkerSource.ts`, `lib/registerServiceWorker*`, `app/sw.js/`, `app/globals.css`, `app/layout.tsx`,
  `components/Providers.tsx`, `components/shared/SuggestField.tsx`, `scripts/**`, `docs/**` listed here, `.github/workflows/ci.yml`,
  `eslint.config.mjs`, `package.json`, manifests, `public/sw.js` deleted.
- **Pre-existing, not part of the redesign, preserve:** the `app/tools/**` edits (Tools polish, 2 Oct), `app/timesheets/**`,
  `app/ppe/**`, `app/breakdowns/**`, `app/spares/**` changes, `e2e/smoke.mjs`, `docs/tools-polish-2026-10-02/`,
  `docs/NEC_TIMESHEET_RULES.md`, and similar. If unsure whether a file is yours, `git diff` it before touching; never
  blanket-commit the working tree.

## 3. Architecture entry points

| Topic | Read |
|---|---|
| Design system contract (tokens, roles, primitives, patterns, shell) | [`../components/ui-system/README.md`](../components/ui-system/README.md) |
| UI stack, theme, shell structure | [`UI_ARCHITECTURE.md`](./UI_ARCHITECTURE.md) |
| Failure handling, wiring rules | [`ENGINEERING_STANDARDS.md`](./ENGINEERING_STANDARDS.md) |
| Tests, verification scripts | [`TESTING.md`](./TESTING.md) |
| PWA, service worker, update path | [`PWA_UPDATES.md`](./PWA_UPDATES.md) |
| Route status | [`MIGRATION_LEDGER.md`](./MIGRATION_LEDGER.md) (generated) |
| Long narrative, defects found per route | [`CLAUDE_REDESIGN_CHECKPOINT_2026-10-03.md`](./CLAUDE_REDESIGN_CHECKPOINT_2026-10-03.md) |
| Doc conventions | [`DOCUMENTATION_STANDARD.md`](./DOCUMENTATION_STANDARD.md) |

Key facts: `<AppShell migrated>` selects the new frame; tokens are `--mo-*` on `:root`; breakpoint is 821 px (Tailwind 4
`max-*` is exclusive, so write mobile-first `min-[821px]`); coarse pointers get 44 px targets (`pointer-coarse:`); safe areas via
`--mo-safe-*`; server components must not import the ui-system barrel (import `appearance` by path).

## 4. Implemented vs not yet wired

Implemented: foundation, primitives, patterns, new shell (sidebar with spotlight, top bar, mobile strip and drawer, notifications,
feedback, settings, account menu), appearance record and pre-paint script, PWA update path, ledger and link checks.
Not wired: 24 routes still render a legacy page body inside the new shell (they work but keep old components); `/inventory`
has no backend table behind its migrated UI (decision pending, below).

## 5. Route ledger summary

56 routes: **47 migrated**, 0 legacy body on new shell, 5 redirects, 4 own chrome; 52 browser-verified (the 47, plus the
`/ppe/allocate`, `/standby`, `/av` and `/leave-management` redirects). Every route is now migrated: the layout pass still needs the geometric overlay audit on the newly migrated routes and a real-device check (below).
Migrated and verified at 1440/820/390/320 (`/near_miss`, `/safety_complaints`, `/work_stoppage`, `/vfl`, `/sheq_inspection`, `/sheq`, `/pto`, `/pachedu`, `/requisitions`, `/admin`, `/noticeboard` added 3 Oct): `/`, `/contractors`, `/competency`, `/compliance-register`, `/reliability`,
`/condition-monitoring`, `/engineering-dashboard`, `/job-cards`, `/inventory`, `/training`, `/sop-library`, `/drivers`,
`/admin/lists`, `/engineering_report`, `/usage-analyzer`, `/near_miss`, `/safety_complaints`, `/work_stoppage`, `/vfl`, `/sheq_inspection`, `/sheq`, `/pto`, `/pachedu`, `/requisitions`, `/admin`, `/noticeboard`. Everything else: not checked. The authoritative per-route table is
the generated ledger; do not trust this paragraph over it.

Shell parity with Tools (gate passed 3 Oct): `scripts/verify-shell-parity.mjs` compares computed styles against live `/tools`
(layout, typography, icon family/weight with SVG path equality, spacing, hover/selected, tooltips, collapse, motion, mobile drawer,
safe areas, portrait/landscape, emulated touch with 44 px targets). Remaining known differences: MyOffice has more modules and
labels by design; the notification and feedback popovers are MyOffice-only. Not covered: real iOS/Android devices.

## 6. Commands (run from `frontend/`; dev server http://localhost:3000)

```
npx tsc --noEmit                     # typecheck
npx eslint .                         # lint
npx vitest run                       # unit tests (98 files / 685 tests at last run)
npm run build                        # production build
npm run docs:check                   # typedoc + ledger current + link check
npm run docs:ledger                  # regenerate the ledger
node scripts/verify-routes.mjs       # route specs (browser, fixture session, mocked API)
node scripts/verify-shell-parity.mjs # shell vs /tools, incl. touch
node scripts/verify-pwa-update.mjs   # needs a build; serves two stamps on 3201
```

## 7. Known failures and unverified claims

- No real-device or installed-PWA test has been done (Playwright cannot install a PWA).
- 34 legacy routes have not been rendered with fixtures; some have the known antipatterns (fail-as-empty, auth-gate spinner).
- PDF snapshot: [`snapshots/MYOFFICE_REDESIGN_SNAPSHOT.pdf`](./snapshots/MYOFFICE_REDESIGN_SNAPSHOT.pdf), generated 3 Oct 2026 by `node scripts/docs-pdf.mjs` (8 pages). Verified by extracting text from the first and last pages with pdf.js; **page layout was not inspected visually** (no rasteriser installed), so open it once by eye. Regenerate at the next stable milestone.
- Production build and `verify-pwa-update.mjs` were rerun on the final shell code on 3 Oct 2026 and passed.
- Capped list routes: pages were showing only the newest 100/200/30 rows. Fixed for `/near_miss`, `/safety_complaints`, `/work_stoppage`, `/vfl`, `/pto`, `/reliability`, `/engineering-dashboard`, `/engineering_report` and the `/sheq` dashboard (see `ENGINEERING_STANDARDS.md` section 6). Legacy pages not yet migrated, and any other page that calls a `limit` route plainly, may still be cut off. `/pachedu` is now on the shared paged hook. `/api/compliance` and `/api/lubrication` rely on the database's own row cap.
- Those three engineering pages called `/api/breakdowns` (an info object, not records), so live they could never have shown breakdowns. Corrected, but not yet run against real data.
- The MyOffice `REPORT_TARGETS` values are placeholders awaiting the owner.

Finish ("fine linen") pass: audited nine pages at desktop, tablet and phone (`docs/linen/`), refined shared wrapping, numerals, caption tracking and legacy heading weight; decisions in `components/ui-system/README.md`. Remaining: installed-PWA and touch-device check, and the same audit on each route as it migrates (run `node scripts/linen-audit.mjs --label <name>`).

## 8b. Maintenance workflow rebuild (owner approved the prototype, 7 Oct 2026)

Plan: `docs/plans/maintenance-workflow.md` (branch `plan/maintenance-workflow`). Prototype: `/maintenance-prototype` on branch `prototype/maintenance-workflow`, never merged. Post-prototype decisions taken by the author on the owner's instruction ("everything else decide for me"): Tab fills from the register (W.9); table is the default list on desktop and cards on phone; the record opens as a pop-up on desktop and as a full page on phone (slice 5); the scheduler and KPI board are built directly in slices 9 and 11 without a second prototype; KPI targets stay "not set" until the owner gives them (Q10).

**Slice 1 (audit trail, row version, comments): built, not merged, migration not applied.** Backend `supabase_migration_maintenance_audit.sql` (rehearsed with `scripts/test_maintenance_audit_sql.sh`), `app/maintenance_events.py`, version check on `PATCH /work-orders/{id}`, events and comments endpoints. Frontend: Comments and History tabs in the work order detail, and a conflict notice on the artisan and foreman saves and a repeat-Save conflict message on the edit form. Rollout order: owner applies the migration, then backend merges, then frontend. Until the migration is applied the tabs show a failure (not an empty list) and saves behave as before.

**Slice 2 (one Maintenance group, separate modules): built on branch `claude/festive-noether-rrxq4l`, frontend only, no data change (8 Oct 2026).** The old single `/maintenance` page is split: `/maintenance` is the Overview (pattern D: linking tiles, notices, overdue and due-soon lists, the analytics tab), `/maintenance/work-orders` is the register and record (unchanged behaviour; `?new=1` opens the New work order form, used by the home page shortcut), `/maintenance/schedules` is the schedules module. They sit in the one existing sidebar group, Operations & Maintenance, with Breakdowns, Condition Monitoring, Reliability, Spares and the rest. The sidebar now has an `exact` flag so the Overview does not light up on its sub-pages. Requests and Planner are not in the navigation: they need backend tables that do not exist yet (slices 6, 8 and 10). The clickable preview at `/maintenance-preview` (branch `prototype/maintenance-modules`) uses example data and is never merged.

## 8a. Wireframe and typography review (owner instruction, 3 Oct 2026)

Page-body migration is paused at a milestone boundary (last route: `/tasks-events`) while the layout architecture is reviewed. Done: every route rendered at 1440 and 390 px and its structure measured (`docs/wireframes/before/`), eight page patterns and six overlay patterns defined in [PAGE_PATTERNS.md](./PAGE_PATTERNS.md), each route assigned a pattern in [WIREFRAME_LEDGER.md](./WIREFRAME_LEDGER.md), the typography pairing reviewed on the rendered patterns (kept), and two shared changes made: `Toolbar` collapses its filters behind a Filters button on phones, and `PageHeader` carries a hairline rule. Shared changes made and verified on all 30 migrated routes (after-captures in `docs/wireframes/after/`; route specs pass): `Toolbar` collapses filters behind a Filters button on phones (looks through fragments), `PageHeader` has a hairline rule, `MetricGrid` is one swipeable row on phones and columns from 768 px, and `RecordCard` lets its status badges wrap below a crowded title. Overlays reviewed 4 Oct 2026 on every migrated route (`scripts/overlay-audit.mjs`, results in `docs/overlays/before/`): create, detail, manage and confirm dialogs and the Download menu open at desktop and phone, all fit the screen, take focus, close on Escape and keep their action reachable (the compressor reading dialog scrolls its own Save on a phone). Fixed from that review: the compressor status dialog is a 2x2 option grid, requisition numbers no longer wrap. Not yet done: the 18 legacy routes have not been rebuilt to their pattern, and tablet was only spot-checked. Next: resume migration in pattern order using the ledger (planning grids and workflow pages next, since they are the least covered patterns). The system-wide layout pass is not complete until every route and significant overlay has been reviewed in the rendered app.

## 8. Next bounded item

Every route is migrated (4 Oct 2026; the last ones were `/breakdowns`, `/breakdowns/analytics`, `/quotations`, `/artisan-timesheets` and `/timesheets`). What remains of the layout pass, in order:

1. The geometric overlay audit on the newly migrated routes (`MSYS_NO_PATHCONV=1 node scripts/overlay-audit.mjs --label <name> --only /a,/b`).
2. DONE 4 Oct 2026: a chunked re-run of all 44 route specs passed; the wireframe audit (`docs/wireframes/after-2026-10-04/`) and the linen audit (`docs/linen/after-2026-10-04/`, its fixed page set only, so the routes migrated today are not in it) ran with no contrast, icon-alignment or page-overflow failures (the one "clipped under text spacing" per page is a constant shell element, as before).
3. DONE 4 Oct 2026: the PDF snapshot was regenerated.
4. A real-device or installed-PWA check by a person (not possible from the build machine).
5. DONE 4 Oct 2026: the 45 files nothing imported (the unused shadcn primitives in `components/ui`, the old autocomplete cluster, `PillTabs`, `UnderlineTabs`, `CollapsibleSection`, `RequireAuth`, `components/safety/index.tsx`, `lib/status.ts`, `lib/useEquipment.ts`, the classic design-system index) were deleted with `git rm`, so they are in history if one is ever wanted back. `node scripts/find-orphans.mjs` now lists only three files, all under `app/tools` (the owner's in-progress area). (`SignaturePad`, `PhotoUpload` and `SopFormDialog` have since been rebuilt on `ui-system`.)

## 9. Pending product decisions

**Design-system consolidation (owner's instruction on 4 Oct 2026: one design system for the whole software), done:**
- The legacy system is deleted: `components/shared/design-system/` (tokens, `${t.*}` classes, Classic/Dallaglio, its icons, confirm, charts), `components/shared/theme.tsx`, `components/ui/` (shadcn leftovers), `AuthMenu.tsx`, the unused `ShiftTimeRangeField`, the legacy providers, and about 600 lines of legacy rules in `app/globals.css` (including unlayered `:focus-visible`, scrollbar and body-size rules that were overriding the system's own). `globals.css` is now Tailwind, the three `ui-system/foundations` files, the body typeface, `font-mono`/`font-heading` and native option colours.
- Rebuilt on `ui-system`: sign-in, set-password and callback pages, the access gate, the account/2FA dialogs and the 2FA prompt (`components/app-shell/auth/`), `SignaturePad`, `PhotoUpload`, `PredictiveInput`, the SOP form's typeahead. Module accents/growth figures removed from the module list (categories are told apart by name and glyph).
- Tokens only the Tools workspace read (`--mo-paper`, `--mo-amber`, `--mo-radius-pill`, `--mo-shadow-*`) moved into `ui-system/foundations/tokens.css`; Tools imports icons and appearance from `ui-system`.
- `bg-brand-500` (one use, compressors dialogs, file untouched) now resolves to the action colour.
- Verified: tsc clean, eslint 0 errors, 892 unit tests, docs check, production build, every route spec (the sop-library spec's label queries updated), login and set-password screenshots at 1440 and 390.
- **Open decision:** `/tools` still has its own component layer (`ToolsUI`, `AnimatedSelect`, `ToolsDateInput`, `ToolsDialog`, the 125 KB `tools.module.css`, about 2,500 lines). It shares the token layer and glyphs. Owner decision, 5 Oct 2026: do not move Tools onto `ui-system` yet; revisit later.

**Dependencies (5 Oct 2026):** `npm audit fix` cleared 10 of the 15 advisories that already failed `main`'s CI (including the one critical) and `eslint-config-next` moved to 16.3.8 to match Next. The remaining 5 are one advisory, `braces` (via `eslint-config-next` -> `fast-glob` -> `micromatch`), which has no patched release; it is lint tooling and never ships. CI's audit step now checks production dependencies only (`npm audit --omit=dev --audit-level=high`, 0 vulnerabilities); remove `--omit=dev` once `braces` is patched.

**After going live (5 Oct 2026):** the live Overtime page showed "could not be loaded" for an HTTP 500 (`[Errno 11] Resource temporarily unavailable`, a backend stall) because the page's "still loading" test (`isTransientStatus`) did not count 500 while the retry rule did; they now agree (any 5xx except 501/505, 408, 429, no answer) and a unit test compares them for every status. Tools sign-in and sign-up now retry a request that never arrived or got a 503 (2 s, 4 s, 8 s) before saying the server could not be reached. The backend answered slowly or not at all for a few minutes after the Render deploy and recovered by itself; if it recurs, check Render's logs for the Errno 11 (the backend reads pages through a thread pool).

**Loading, everywhere (owner, 5 Oct 2026: "keep loading until records appear, for all pages"), done:**
- Overtime and Personnel had their own 20 s client timeout that raised a plain error, so a slow service showed "taking too long" at once; the timeout is now a transient 408 (`timeoutError`), so those pages keep loading. Every other read that kept its own state now waits out a slow or waking service with `retryTransient` (`lib/transientRetry.ts`): competency, training, SHEQ dashboard, PPE matrix, task comments, availability prefill, artisan timesheet reads, the employee/equipment/spares/lookup pickers, `useModuleData` (compliance register, job cards), and the home figures and bell alerts (capped at 90 s, they are secondary). Compressors still has its own per-section reads (page left alone by the owner's instruction).
- `/tools` overview: it waited for four sources and each retried without a timeout, so one slow or hung request kept the whole overview on "Loading overview". It now opens as soon as the equipment has answered; the movements and needs-attention panels (and that figure) show their own loading, each request gives up after 45 s and retries, and errors show per panel. Spec `ToolsHomepage.test.tsx` covers it.
- The sheq route spec's fixture dates are local, not UTC (it failed in the first hours after local midnight).

**Decided by the owner on 4 Oct 2026 (later), and done:**
- `/quotations` and `/inventory` stay as they are (the browser-only generator; the browser-local inventory with its notice).
- `/timesheets` roster: PP288 is no longer excluded in code; everyone is on the roster by employment type like everyone else (hide or add a person by hand still works).
- Loading: a read that fails because the service is slow, waking up or unreachable (408, 429, 500, 502, 503, 504, a lost connection) is retried quietly with a growing delay (1, 2, 4, 8 s, then every 15 s) and the page keeps loading until records appear; a refusal, a not-found, a bad request or a malformed answer is still reported at once. This applies to every list and resource read (`lib/useApiList.ts`, `lib/useApiResource.ts`, the breakdown analytics) and the retrying notice shows the service's last answer. `/timesheets` already did this in its own reads. The route-spec harness now injects a 404 for "failed load" because a 500 is waited out.
- `/artisan-timesheets`: the saved list asks the backend for a summary (`GET /api/artisan-timesheets?summary=true`: no daily rows, no signatures; every page is read) and a timesheet is fetched in full only when opened. 2 new backend tests.
- `/leaves` (owner left it to me; backend, not deployed): deleting a leave request is manager-only, and changing a request that has already been approved or rejected (editing it, or reopening it to pending) is manager-only; a pending request can still be amended by anyone signed in. 3 new backend tests.
- `/compressors`: left alone for now; to be dealt with separately ("Mark as done" and the running meter, item 5 below).
- Overtime weekly roster: the title exclusions (manager, trainee, foreman, hoist driver) and the named exclusions stay, because those titles are not paid overtime. `/compressors` stays as it is, including "Mark as done" setting the running hours to the service interval.
- Spares bulk import (backend): left alone for now; the owner still has to check live stock after earlier "update" imports.
- Approvals use signatures. Maintenance: the artisan and foreman sign-offs are drawn, uploaded or saved signatures (`SignOffField`, stored as an image in `artisan_sign` / `foreman_sign`; an earlier typed name is shown as text until replaced). Services: each approval stage is signed through the signature step (`ApprovalGate`); the signer's name is recorded from their account. The signature image of a service stage is kept in a new `services.stage_signatures` jsonb column (backend `supabase_migration_services_stage_signatures.sql`, authorised by the owner 4 Oct 2026; applied to the live database on 4 Oct 2026 through the Supabase connection, one `ALTER TABLE` and nothing else; the column reads back as `{}` on every existing record; the repo's own tracker table `schema_migrations` does not exist on the live database, so it was not recorded there). The register list leaves the images out; `GET /api/services/{id}/signatures` and `PUT /api/services/{id}/signatures/{stage}` read and keep them (6 new backend tests). `SignatureField` moved to `components/shared`. `ApprovalGate` keeps the signature step mounted while an approval applies, so a refused approval leaves the signature as drawn.
- The shell's quick-actions code is kept for later use (not removed).
- Sidebar text is black (`text-ink`) instead of grey; the top bar matches the Tools top bar (lines above and below, shadow, blur, 60px).
- Employee offences stay out of the employee detail view (they are held on the record and edited in the form only), as it already was.

**Still open:**

1. `/inventory`: kept as is (decided).
2. `/quotations`: decided to keep (see above).
3. `REPORT_TARGETS` in `lib/engineeringReport.ts`: owner to supply real targets.
4. `/sheq` safety score: owner said to leave the SHEQ page alone; no decision needed now.
5. `/compressors` "Mark as done": decided to keep as is (see above).
6. DECIDED 4 Oct 2026: `/av` redirects to `/availabilities`; `/availability` is kept and linked as "Availability Overview"; `/leave-management` (a demo prototype with sample data) redirects to `/leaves`; `/leaves` stays; `/employees-preview` is retired once `/employees` is rebuilt. DONE (branches `fix/availability-no-data-defaults` in both repos, pending merge): for equipment with no availability record the backend now returns `null` for availability, MTBF and MTTR instead of the defaults (100%, 100 h, 4 h), and `/availability` shows "No data" for them (no progress bar, left out of the department averages, "No data" in the Download as well). Equipment that has a record is unchanged. Deploy the backend first or together: the page already copes with both.

7. `/spares/import` DEFECT FIXED (backend repo, merged to `main` and deployed 5 Oct 2026): the bulk import's "Update existing" mode wrote every model default (stock on hand 0, min 1, max 5, priority medium, no supplier or location) over each existing part, because the update used the whole validated model. The backend now updates only the fields the client sent (`exclude_unset`, `backend/app/routers/spares.py`, 2 new tests in `tests/test_spares_bulk_create.py`) and the page sends only what the file says. Any earlier import in update mode may have reset stock on hand. Read-only check of the live database on 5 Oct 2026 (the owner asked for my judgment): 3,788 of 3,807 spares are at the default pattern (stock 0, min 1, max 5, medium, no supplier, no location); 3,259 were created on 20 May and about 3,330 of them were updated in one run on 21 May between 00:20 and 00:34 UTC, and the 460 created on 21 May are also at defaults. That fits the bug, but the 21 May rows created fresh also have defaults, so stock was probably never entered through the import files and nothing can be proved lost from the database alone; there is nothing in it to restore from. If anyone remembers stock quantities being on the register before 21 May, restore from a Supabase backup taken before 00:20 UTC that day (Supabase dashboard, Database, Backups) into a scratch copy and compare; otherwise enter stock on hand (issuing now depends on it: with nearly every spare at 0, issuing will report shortfalls until quantities are entered).

8. DECIDED 5 Oct 2026 (owner: yes) and BUILT (branch `feature/shared-lists-and-stock`, not yet merged or live): issuing stock takes it off the spare's `current_quantity` by stock code (`backend/app/stock_levels.py`; a read-only check of the live database found no trigger that already does it, so it is not applied twice); never below zero, a shortfall and an unknown code are reported as warnings and the issue is still recorded; deleting an issue puts the stock back; editing the items moves only the difference; the issue summary now reads every page (it was cut at 1000 rows). Existing issues (75 on 5 Oct) are not retro-applied. The Spares picker refreshes its quantities after an issue. Background: `/issues`: recording a stock issue does not reduce the spare's quantity (neither the page nor the issues router touches `spares.current_quantity`; a database trigger cannot be ruled out from the code). The page now says it is a record only. Decide whether issuing should decrement stock. Also the server's issue summary counts at most 1000 rows (an unbounded select), so the "Total records" tile is wrong beyond that.

9. `/leaves` authorisation: decided and done (see above).

10. `/timesheets` roster and retry: decided and done (see above).
11. `/artisan-timesheets` saved list: summary mode done (see above).
12. DECIDED 5 Oct 2026 (owner: save to Supabase) and BUILT (branch `feature/shared-lists-and-stock`, not yet merged or live): the PPE order list (`/api/ppe-order-list`, table `ppe_order_list`) and saved quotations (`/api/quotations`, table `saved_quotations`) are kept on the server and shared by everyone who signs in; what a browser held before is moved up once and then removed from the browser; a quotation can be deleted by whoever saved it or a manager. The quotation being typed and the company details stay in the browser. The migration `backend/supabase_migration_shared_lists.sql` has NOT been applied: it only adds the two tables; apply it before the backend and frontend go live.
13. `/ppe` DEFECT FIXED (6 Oct 2026): issuing from the order list saved the new record but left the item that was due `active` and overdue, so the employee's card still showed it as due and compliance counted it. The old record is now marked `returned` when its replacement is issued from the order list (a failure to do so is reported, the issue itself stands); a plain "Issue PPE" is unchanged. Route spec `/ppe` covers it.
14. BUILT AND PUSHED 7 Oct 2026 (backend `213b3d3`, frontend the commit after `9189ada`): (a) `/ppe` order list: the "Purchase order lines" summary starts collapsed, opens on request (`OrderListView.tsx`, route spec). (b) `/tools` Employees tab rebuilt as eligibility "By person" and "By equipment": each heading opens to a short list with a searchable add (type, Tab or Enter) and a two-step remove; an "Authorised by" field (remembered in the browser, defaults to the latest authoriser) is sent as `authorized_by` on each approval (`ToolsEligibility.tsx`, `ToolsPeople.tsx`, `buildEligibility` in `toolEligibility.ts`). While the approvals are loading or failed, counts read "Approvals unknown" with a retry, never 0. (c) Issue and transfer of equipment with an overdue inspection can now go ahead: tick "Go ahead anyway" and give a reason (5+ characters); backend `MovementInput`/`IssueInput` take `override_due_checks` and `override_reason`, the reason is written into the history entry, and a viewer still cannot (403). The Issue form's Employee field lists every eligible person, not just 8. (d) Data (live, done by the owner's request): the 752 bulk-granted approvals now say authorised by Edson Mavhondo (they said the signed-in administrator). Deploy backend first; each side tolerates the other being old (unknown fields are ignored, the override then simply does not apply).
15. BUILT 7 Oct 2026 (second batch, same state as item 14): `/tools` Equipment opens as a list (only an explicit choice of the grid is remembered, `viewChosen` in the saved preferences); the Overview leads with large stat tiles, needs-attention and the workspace shortcuts, and Recent movements fold away (closed by default, remembered in this browser, open and unmissable if the history failed to load); a visible Download button on the register and a rebuilt export (`toolsExports.ts`): Excel with a title band, frozen header, filter, stripes, status colours and print setup (Cambria over Calibri), Word with a repeating header row and page numbers, PDF with a Times title over a Helvetica table and "Page x of y". The Issue form's Employee field is now `ToolsEmployeePicker.tsx`: everyone eligible for the chosen tool is listed under the search box with job title and number (type to narrow; Enter or Tab takes the top match). Account access is one aligned table (Person, Access, Department, Gate-pass signing, Action) that becomes labelled cards when narrow, with Apply live only when something changed. Also fixed: the Overview's animated stat numbers were 11 px because a label rule matched their spans. STILL OPEN: the 31 demo tools (25 are marked "Example record for the Tools workspace pilot", the rest are 19 and 23 Sept test imports and junk such as `def2333` and `type`) and the 16 `DEMO-*` employees are still in the live Tools tables. The owner asked for them to be removed; a direct delete was refused by the tool permission layer and was not worked around. The database keeps audit history with restrict foreign keys, so a delete has to remove their `tools_workspace_history` and `tools_workspace_changes` rows first (52 and 50 rows, the competencies cascade), and the 40 PUG tools are unaffected.
16. BUILT 7 Oct 2026, NOT YET PUSHED (third batch; both repos): (a) `/tools` Compliance is no longer one long page. It has a summary strip and four sections: Inspections (a table, overdue equipment first, a Record check button per row that opens the form for that equipment), Incidents (open incidents with a Close investigation button), Approvals (approval cover: equipment nobody is eligible for and approvals expiring within 30 days, with a link to Employees) and Record (the four forms for managers); the per-person-and-tool competency list that printed hundreds of rows is gone because Employees now shows it (`ToolsComplianceViews.tsx`, `ToolsCompliance.tsx`). (b) The eligible-employees list in a tool's details sits above the specifications, uses the person icon instead of initials (also in the Issue form picker and on Account access) and gives an issuer an Issue button on each name that opens the Issue form for that tool and person. (c) Employees can be deactivated and reactivated (backend `PATCH /api/tools-workspace/employees/{id}` with `active`; refused while they hold equipment; nothing is deleted); inactive people are hidden by default behind a Show inactive toggle and are never counted as eligible. (d) Demo data: the 13 Engineering demo tools are archived; the 15 in Mining, Mine Technical Services and Shared Services still need an administrator sign-in, and MTS-TL-003, 005 and 006 are issued to demo people so must be received first; the 16 `DEMO-*` employees wait for the deactivate endpoint to be deployed.

## 10. Preserve

The other repo's pre-existing edit; Tools polish edits; the no-caching rules in `PWA_UPDATES.md`; the never-auto-refresh rule;
the failure-state patterns; the owner's constraints in section 1.
