# Current handoff: MyOffice redesign

**Status as of 10 Oct 2026** (sections 2, 4, 5 and 9 re-checked against git, the generated ledger and the live database that day). This is the one current handoff; any agent or developer, in any tool, should start here.
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
| `frontend/` | `main` (trunk; CI gates the Vercel deploy) | the redesign and every later batch are merged | a parallel session may hold uncommitted Timesheets work; stage explicit paths |
| `backend/` | `main` (trunk; Render deploys after CI passes) | the same | live commit: `GET https://myofficebackend.onrender.com/api/version` |

The redesign was first pushed to the `redesign/ui-system` branches (4 Oct 2026); it, `fix/availability-no-data-defaults` and `feature/shared-lists-and-stock` are all merged into `main` and live (checked 10 Oct). The only unmerged remote branches are old maintenance experiments (`claude/maintenance-slice*`, `plan/maintenance-*`, `prototype/maintenance-*`, `claude/festive-noether-*`, `claude/deps-audit-fix`). Earlier note about who owned what, kept for reference:

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
Not wired: nothing. No route renders a legacy body any more, and `/inventory` reads and writes the `inventory_items` table (9 Oct 2026).

## 5. Route ledger summary

57 routes (generated ledger, 10 Oct 2026): **49 migrated**, 0 legacy body, 4 redirects, 4 own chrome; 50 browser-verified. Not marked verified: `/login`, `/auth/set-password`, `/auth/callback` and `/tools` (covered by screenshots and `scripts/verify-tools.mjs` instead), and `/timesheets`, `/standby`, `/test-homepage` (the parallel session's). Still open in the layout pass: a real-device check (below).
(22 Oct 2026, Muse ppe-timesheets run: ledger regen'd — 59 routes, 49 migrated, 51 browser-verified. `/timesheets` verified; `/leaves`, `/overtime`, `/noticeboard`, `/breakdowns`, `/sheq`, `/tasks-events`, `/ppe`, `/issues`, `/employees`, `/inventory`, `/maintenance` re-verified with appended scopes. Per-route table stays authoritative.)
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
npx vitest run                       # unit tests (254 files / 1927 tests on main, 23 Oct 2026)
npm run build                        # production build
npm run docs:check                   # typedoc + ledger current + link check + css-consistency ratchet
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
- `npm run docs:check` fails its ledger step while the parallel session's untracked `app/timesheets - Copy/` folder exists (migrated route, no verification entry, no route spec). Pre-existing, 17 Oct 2026; the folder is preserved by the owner's instruction, so the failure stays until that session lands or removes it. Resolved 22 Oct 2026: the folder is gone, and `docs:check` (typedoc 0 errors, ledger, links, css) is green on the ppe-timesheets branch. typedoc (0 errors) and the link check pass.

Finish ("fine linen") pass: audited nine pages at desktop, tablet and phone (`docs/linen/`), refined shared wrapping, numerals, caption tracking and legacy heading weight; decisions in `components/ui-system/README.md`. Remaining: installed-PWA and touch-device check, and the same audit on each route as it migrates (run `node scripts/linen-audit.mjs --label <name>`).

## 8a. Wireframe and typography review (owner instruction, 3 Oct 2026)

Page-body migration is paused at a milestone boundary (last route: `/tasks-events`) while the layout architecture is reviewed. Done: every route rendered at 1440 and 390 px and its structure measured (`docs/wireframes/before/`), eight page patterns and six overlay patterns defined in [PAGE_PATTERNS.md](./PAGE_PATTERNS.md), each route assigned a pattern in [WIREFRAME_LEDGER.md](./WIREFRAME_LEDGER.md), the typography pairing reviewed on the rendered patterns (kept), and two shared changes made: `Toolbar` collapses its filters behind a Filters button on phones, and `PageHeader` carries a hairline rule. Shared changes made and verified on all 30 migrated routes (after-captures in `docs/wireframes/after/`; route specs pass): `Toolbar` collapses filters behind a Filters button on phones (looks through fragments), `PageHeader` has a hairline rule, `MetricGrid` is one swipeable row on phones and columns from 768 px, and `RecordCard` lets its status badges wrap below a crowded title. Overlays reviewed 4 Oct 2026 on every migrated route (`scripts/overlay-audit.mjs`, results in `docs/overlays/before/`): create, detail, manage and confirm dialogs and the Download menu open at desktop and phone, all fit the screen, take focus, close on Escape and keep their action reachable (the compressor reading dialog scrolls its own Save on a phone). Fixed from that review: the compressor status dialog is a 2x2 option grid, requisition numbers no longer wrap. Not yet done: the 18 legacy routes have not been rebuilt to their pattern, and tablet was only spot-checked. Next: resume migration in pattern order using the ledger (planning grids and workflow pages next, since they are the least covered patterns). The system-wide layout pass is not complete until every route and significant overlay has been reviewed in the rendered app.

## 8b. Reuse, database and clean-UI audit (owner instruction, 9 Oct 2026)

The owner asked whether the app defines things once and reuses them, whether it really organises information in a database, and whether the UI is as clean as the Tools top bar (icon-only controls with hints, nothing extra). Three measured audits answered it. The full plan is in the owner's plan file, `mellow-bouncing-eclipse.md`, in five phases.

**Findings, in short:**
- Reuse is mostly good: 214 files import `ui-system`, no raw palette colours or raw text sizes.
- The real departures are three:
  - The Tools workspace is a second UI system, with 78% of the app's raw `<button>`/`<input>` elements and its own dialog, select, tooltip and CSS module.
  - The SHEQ report pages are near-copies of each other.
  - Status colours, dates and chips were each defined many times.
- About 45 of 51 live routes use the database. Six gaps:
  - Training is held in backend memory, seeded with mock records.
  - Inventory lives only in the browser.
  - The Tools workspace keeps its own people, equipment and login.
  - People and machines are linked by typed names, and some links already point at no record.
  - Timesheet roster exceptions are kept in the browser.
  - `reports.py` serves mock figures.
- Every page header stacks a breadcrumb, a description, 3–4 buttons and a tile row. The Tools topline is the target.

**Phase 1 done 9 Oct 2026 (uncommitted at the time of writing):**
- One status vocabulary in `lib/status.ts` (a new file; the unused one of the same name was deleted on 4 Oct). It holds `statusTone`, `priorityTone`, `conditionTone` and `EXPORT_TONE_HEX`. 20 modules' maps read from it, and `lib/status.test.ts` asserts that the same word looks the same across modules.
- Visible effects:
  - "In progress" is blue everywhere.
  - "Open" is amber everywhere.
  - Cancelled is grey everywhere.
  - Priority is low grey → medium blue → high amber → critical red everywhere.
  - Damaged and poor items are red.
  - Excel/PDF status cells use darker, print-legible shades of the same tones.
- Dates: `components/shared/utils.ts` `fmtDate`/`fmtDateTime` now delegate to `lib/format.ts`, so the day is no longer zero-padded. Named label formats were added: `formatLongDate`, `formatDayMonth`, `formatFullDate`, `formatWeekday`, `formatMonth`. 31 hand-written calls were converted. There is one `formatCurrency`.
- `Tag` has `onRemove`, which replaced 5 hand-built chips. `IconButton` shows its label as a real tooltip (Tools hint behaviour, 350 ms) instead of the native `title`. `Tooltip` supplies its own provider outside the root.
- The typography roles in `foundations/typography.ts` are wired into `PageHeader`, `Panel`, `ChartPanel`, `Dialog`, `DataRegion` and `RecordCard`. `ChartPanel` headings now match `Panel` (`text-section`).
- Lint:
  - The text-size guard had been silently disabled. The auth block's `no-restricted-syntax` replaced its list, because flat config replaces a rule's options rather than merging them.
  - It is now the local rule `local/no-raw-text-size`, beside the new `local/no-hex-colour` and `local/no-locale-date` (app code, Tools exempt).

**Phases 2–5 done 9 Oct 2026, after Phase 1 was pushed as `58d37b5` (uncommitted at the time of writing; the owner is asked before any commit, push or migration):**
- **Shared controls.**
  - `MoreMenu`, `DownloadButton` and the Toolbar Filters button are icon-only by default, using the Tools `shell` square with a tooltip. `IconButton` gained `badge`, and `SearchField` gained `collapsible`.
  - `DataTable` gained expandable rows (`renderExpanded`), which replaced the hand-built Overtime "Recurring reasons" table.
  - Tooltips open on keyboard focus only, so a tooltip no longer pops up when a menu closes.
  - Toasts moved to bottom centre, because at the top right they covered every header's primary button.
- **Define once.**
  - `lib/useConfirmDelete.ts` runs the delete flow for 25 pages. A failure now always names what was not deleted.
  - `Fact`/`FactList` replace 22 hand-made detail lists in two looks with one plain look.
  - `components/shared/SectionBadge.tsx` (neutral, with icon) replaces seven local section badges. "Electrical" is no longer amber, since amber means waiting.
- **Clean header** (in `PageHeader`):
  - A breadcrumb trail shows only when it links somewhere; 45 of 47 trails had no links.
  - The description sits behind a hint icon.
  - `meta` stays visible for live facts.
  - A development warning fires on more than one primary button.
  - Refresh buttons are the shared `shell` square.
  - Tab counts use `count`.
  - Compressors uses compact tiles.
  - Titles match their sidebar names ("Leaves", "PPE", "Documents" and so on); PTO and VFL keep their full names.
  - The Quotations notice moved into the hint.
- **Bugs fixed.**
  - Availability's footer linked to two pages that do not exist (`/breakdowns/new`, `/reports/availability`).
  - Its per-machine Breakdowns and Maintenance links ignored the machine; both pages now read `?q=`.
  - The shared `Select` lost its value when options changed inside a form (Radix's hidden select emitted "").
- **Tools onto the shared system (first tranche).**
  - `ActionHint`/`Help`, `ToolsDialog` and `AnimatedSelect` are now wrappers over the shared `Tooltip`/`HelpHint`, `Dialog` and `Select`. Each takes a `skin`, so Tools keeps its look, typeface and text size.
  - Remaining: about 250 raw `<button>` elements to `Button`, then shrinking `tools.module.css`.
  - `scripts/verify-tools.mjs` passes through the issue form. Its employee-dialog steps describe the pre-eligibility Employees screen and need rewriting.
- **Database (code and draft migrations; nothing applied).**
  - `training.py` now uses a `training_certifications` table (`supabase_migration_training_certifications.sql`, needs approval to apply) and really stores certificate files in `ams-documents/training/`. The mock people are gone.
  - The mock `/api/reports` router was deleted.
  - The fake work orders and placeholder people no longer appear in the Tools forms.
  - `supabase_migration_record_links.sql` (a draft) adds `employee_ref`/`equipment_ref` foreign keys and fills them by mine number, then row id, then a unique name. On 9 Oct the records that would still match nobody were: leaves 9, overtime 12, PPE 16, breakdowns 10 (machines missing from the Equipment register).
- **Done and pushed 9 Oct 2026, after the owner approved the push and migrations:**
  - Commits: frontend `48df4ae` and `c679707`; backend `7cdd44d` and `66362b7`.
  - Migrations applied: `training_certifications` and `inventory_items`, each with a service-role policy.
  - Inventory is now a shared table. A browser's old local items are moved up once, and each is removed locally only after the server saves it.
  - The record-links migration was dropped by the owner's choice. Leaves, Overtime and PPE instead flag records whose employee number is not on the register ("Show them"), for manual clean-up. On 9 Oct that was 22, 68 and 36 records.
  - The Tools login stays separate (owner's decision).
  - **Employee numbers corrected (live data, owner's instruction).** 104 leave/overtime/PPE records (14, 61, 29) took their number from the employee register. A record changed only on a unique name match, or when it held the register row id of the same-named person. 22 records that match no one remain for the owner to delete through "Show them". The old → new list was kept outside the repo, so the change is reversible.
- **Unified design, same day:**
  - Tools' 89 ordinary buttons use the shared `Button`. Their Tools-only styles are deleted; container rules now target `button` for layout only, and `data-variant` is exposed for that.
  - `MetricTile` has one design (the quiet chip); the large card variant is gone and the number takes its tone colour.
  - The MyOffice mark is a briefcase and Core Management uses stacked layers (no more buildings).
  - The Tools close quarter-turn is `closeTurn` in `foundations/gestures.ts`, on every close and remove control.
- **Quality pass, later 9 Oct (all pushed: frontend `ae5d000`, `dabd07c`, `a518456`, `81f739a`, the visual-regression commits; backend `34a2283`):**
  - CI gates: a scoped `sharp` patch cleared the audit step; the coverage floor is a ratchet (35/34/28/38 since 18 Oct 2026); a 15 s test timeout ended a load flake; the backend pyright baseline is 196 (was 198).
  - WCAG 2.1 AA: `scripts/a11y-routes.mjs` (axe, every route) passes 46/46. The muted-ink, subtle-ink and neutral tokens were darkened to measured contrast; Sonner toasts use the status tokens; charts set `accessibilityLayer={false}`; `ChartPanel` has a `controls` slot.
  - One absence vocabulary (`ABSENCE_TONE` in `lib/status.ts`) for Leaves and Timesheets.
  - Lint: every warning in files this effort owns is cleared, each remaining exception has its reason written beside it. The 13 left are in the other session's files (shifts, test-homepage, shift presets, the timesheets spec). The jsx-a11y recommended rules now keep their options.
  - The shell's background reads share `components/app-shell/fetchOrNull.ts` and typed rows; notifications read their seen list with `useSyncExternalStore`.
  - `scripts/verify-tools.mjs` follows the current Tools workspace and passes end to end. Run it with `TOOLS_CDP_URL=http://127.0.0.1:1` so it launches its own browser instead of attaching to an open one.
  - Visual regression is now a real CI gate (no `continue-on-error`). The spec signs in with the fixture session (`signInFixture` in `scripts/lib/fixtures.mjs`), pins the browser clock and fails on a sign-in screen. The first baselines were ten pictures of the sign-in card and were replaced. `.github/workflows/visual-baseline.yml` (run by hand after a deliberate visual change) makes Linux baselines and commits them only if two more comparisons match.
  - Backend security (10 Oct, owner approved): PyJWT 2.15.0, urllib3 2.8.0, multidict 6.9.1 clear every pip-audit advisory; tests, pyright and a live forged-token check passed, and backend CI is green.
  - Unused empty tables: `spare_parts`, `sheq_reports` and `document_categories` have no code anywhere; the owner decided (10 Oct) to leave them as they are. `maintenance_schedule` is **in use** (compressor servicing writes it), so it stays. The document categories stay in `app/documents/categories.ts`: they are the seven fixed ISO 55001 clauses, not editable records.
- **Owner decisions (superseded by the above where answered).**
  - Inventory: its own table, or merge into Spares? Its backend is still in-memory.
  - The Tools login and employee/equipment copies: link them to the main tables or retire them.
  - Timesheet roster exceptions to the database (the other session is active in Timesheets).
- **Left for the other session:** refresh buttons in Artisan timesheets, Shifts and Standby still use `ghost`.
- **Verification (latest):** frontend 1,218 tests pass under coverage; backend 1,773 pass at 93.8 % coverage. Run pytest with a short `--basetemp`, because a long temp path breaks the NEC import tests on Windows.

## 8c. Scan 2026-10-18 and fixes (merged: frontend 4f86e24, backend ec9158f)

An independent quality scan (open endpoints, fabricated metrics, safety-status masks, date/token/drift issues) was remediated in five phases, all verified, and merged since (see heading). Backend files live in `backend/` (separate repo); the Phase 1 SQL files are written but NOT applied — see Gate 1.
- **Phase 1, database exposure:** `supabase_migration_enable_rls_public_tables.sql` (RLS on for the 24 public tables, no new policies; drops the two open sheq policies), `supabase_migration_lock_down_functions.sql` (revokes + security-invoker views), `supabase_migration_function_search_path.sql` (optional, flagged untested), guard test `tests/test_migrations_rls.py`, doc `backend/docs/RLS_AND_API_EXPOSURE.md`.
- **Phase 2, backend auth and honesty:** server-side MFA AAL2 gate (`REQUIRE_MFA_AAL2`, default on) with frontend mfa_required re-gate; 30 s in-process auth cache (`AUTH_CACHE_TTL_SECONDS`) with invalidation on role/deactivate/factor-reset; `app/errors.py` + codemod took 500 error-text leaks 215 → 0 with guard test `tests/test_no_internal_error_leak.py`; 8 open aggregate reads pinned in `OPEN_READS` and tabled in `ENGINEERING_STANDARDS.md`, 4 debug `/test` routes deleted, health probes status-only; rate limits (reset-requests 5/min, Tools login 10/min + failed-login counter, register 5/min) and `client_ip()` behind `TRUST_PROXY_HEADERS` (default off); breakdown metrics return None instead of zeros, Harare-day helper `app/clock.py`, compliance/lube helpers return "unknown" on bad dates, `.dict()` → `.model_dump()` (80 sites).
- **Phase 3, frontend correctness:** `todayLocal()` in the 9 report forms + export stamps with an ESLint ban on `toISOString()` date-slicing; `app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`, `tools/error.tsx` + `/no-such-page` spec; per-page `<title>` from PageHeader; Segmented selected = filled action pill (was 1.04:1); `--mo-line-control` holds 3:1 on all four grounds, chart series retuned to ΔE > 30 + deuteranopia-safe (tests in `foundations/tokens.test.ts`); PWA colours aligned to the canvas token + `COLOR_HARMONY.md` rewritten; 4 grids reflow (verified at 320/390 px, BulkAssignDialog calendar too); 177 token-utility replacements in 37 files (pixel-diffed before/after) + `css-consistency.mjs` ratchet (new `no-var-utility`/`no-var-z`/`no-px-text` rules, 2 deferred emoji exceptions) wired into `docs:check`.
- **Phase 4, hygiene:** 35 dead dependencies uninstalled (lockfile 14,966 → 12,676 lines, node_modules 1,207 → 938 MB; prod audit now 3 moderate, 0 high); security headers incl. report-only CSP (hashes of the two layout bootstrap scripts; enforcing needs nonce plumbing — see `next.config.ts`); deleted unreferenced template SVGs, `temp_dev_log.txt`, 6 empty route dirs; backend untracked `node_modules/`, root `package.json`/lock, `myoffice.db`, `spares.db` (+ `.gitignore`); `uploads/notices/` left (attachments live in Supabase Storage `ams-documents`); `timesheets - Copy/` diffed (7 files, active experiment — owner decides).
- **Phase 5, structural:** 4 detail views migrated to FactList (`NecPersonView`, `ArtisanEditor`, `JobCardDetail`, `ToolDrawer`) with render tests; 13 other `<dl>` sites triaged as figures/rows/menus and kept deliberately; `toolsApi` + `AuthForm` on the shared `apiFetch` transport (Tools error contract byte-identical; reset-request failures now surface instead of false success); 16 backend smoke tests for the 8 untested routers + `sw.js` header test; coverage ratchet raised to 35/34/28/38 (measured 35.71/34.82/28.12/38.97); fixed 2 null-vs-unset update bugs (`employees` bulk-normalize, `equipment` PATCH) with tests, cleared `training` (form posts can't express null), located the 2 emoji-icon sites (owner visual call, not changed).
- **Verification (18 Oct):** frontend tsc clean, eslint 0 errors, vitest 214 files / 1671 tests, docs:check green except the pre-existing `timesheets - Copy/` ledger gap (untracked dir, CI unaffected), route suite green, axe green, production build green, `npm audit --omit=dev --audit-level=high` clean; backend pytest green, pyright 196/196. Nothing committed, pushed, deployed, or migrated; no live writes.
- **Owner gates:** (1) run the Phase 1 SQL in Supabase in file order + confirm `SUPABASE_KEY` is service_role on Render (exposure live until then); (2) `TRUST_PROXY_HEADERS` only if the proxy is trusted, one enrolled MFA test user, Supabase leaked-password protection on; (3) decide `timesheets_backup_20261014_holiday`, `timesheets - Copy/`, Tools self-registration, the 8 open reads, and `supabase_migration_housekeeping_indexes.sql` (4 redundant + 2 duplicate-definition indexes, not applied).

## 8d. Data integrity: whole categories of bug closed (owner instruction, 19 Oct 2026; merged: frontend 227b987, backend 3c93d98)

Trigger: overtime for the same person, date and hours was recorded twice from two laptops and both were approved; the only check was a browser warning. The fix is one set of rules, each with one shared mechanism and a scanning test, documented in the backend's `docs/DATA_INTEGRITY_STANDARD.md`:

- **Rules are enforced on the server.** Overtime (time overlap), leaves (day overlap) and PPE (same item, person, day) are refused with a 409 naming the record in the way; the forms refuse earlier. Unique indexes for the exact-duplicate case are in `supabase_migration_*_no_duplicates.sql` (they refuse to run until the existing duplicates are resolved).
- **Who and when come from the session.** Approver and rejecter (overtime, leaves), job-card sign-off and created-by are stamped by the server; the browser sends only the drawn signature. Overtime approval no longer sends names or times.
- **Everything is audited.** The shared Supabase client records writes to the payroll and people tables in `audit_log` (who, when, what changed; whole row for creates and deletes). `/api/audit` is manager-only; detail dialogs show "Show who changed it" (`components/shared/RecordHistory.tsx`).
- **No deleting approved money records.** Approved or paid overtime and approved leave cannot be deleted; overtime has a new "Cancel request", leaves are rejected. An employee with records cannot be deleted; renaming an employee id carries their history.
- **No silent overwrite.** Edit forms for overtime, leaves and PPE send `expected_updated_at`; a stale save gets a plain 409. (Timesheet grid editing is not wired yet.)
- **Errors keep their meaning.** `server_error` passes a deliberate 404/409 through and maps database constraint refusals to 409/422; 42 hand-written 500s were converted; a guard test forbids new ones.
- **Free-text overtime reasons stay free text** (owner decision).

Owner steps, in order: run `supabase_migration_integrity_constraints.sql`; optionally `supabase_cleanup_names_and_spaces.sql`; review `scripts/data_integrity_report.py` output (a copy was saved to the Documents folder, outside the repo), resolve duplicates, then run the two `no_duplicates` files; set default passwords for the three manager accounts created with `scripts/create_management_accounts.py`. The application works before and after each SQL step.

## 8e. Document library rebuilt (owner instruction, 19 Oct 2026; merged: frontend 3eb084c, backend a3d62b3)

Trigger: files were "lost" across email, OneDrive, WhatsApp and Windows folders. `/documents` is now one library: a real folder tree (the Asset Management System structure from Engineering Planning plus any folder a person makes), one search, and in-page preview, open and print. Backend contract and rules: `backend/docs/DOCUMENT_LIBRARY.md`.

- **Finding that drove the model:** 94 files; about 83 were tagged with folder names ("SOPs" 54, "SHEQ" 12, ...) that were neither a built-in folder nor a row, so they could not be reached by browsing. Files now point at a real folder (`folder_ref`) and the upgrade SQL gives every such name a real folder.
- **Folders:** nested (to 8 levels), every folder renamed, moved, filled and deleted (when empty) the same way; "Set up the AMS folders" (manager) creates the 85-folder structure and skips what exists (keyed by `seed_key`, so a renamed folder is still recognised); hand-made folders with a matching name are adopted with their files.
- **Finding files:** one search over name, comment, tags, folder and the words inside PDF, Word, Excel and PowerPoint files; several words must all match, quotes keep a phrase; filters (kind, extension, tag, uploader, date, size, starred), scope (this folder or everywhere), order, cards or table. A file found only by its inside text says "Found inside".
- **In the page:** images (zoom), PDF, audio, video, text, Word (`docx-preview`, the one new dependency), spreadsheets (`xlsx`); older Office files offer Microsoft's viewer only when asked. Print through a hidden frame. ← → move through the list (not while focus is inside an embedded PDF, which keeps its own keys).
- **Safety:** delete moves to a Trash with Undo; only a manager deletes for good, from the trash; identical files cannot be put in one folder twice; same-name files get "(2)"; uploader and deleter come from the sign-in; served content type comes from the extension; history in `document_activities`.
- **Upload:** documents, images (all common extensions), audio, video, drawings and emails; drop files on the page or paste a picture; unsafe types (.exe, .html, ...) are refused before sending.
- **Verified:** backend 2167 tests (about 204 new for the library, safeguards mutation-checked), pyright 196/196, Sphinx clean; `documentLogic` and component tests; `scripts/route-specs/documents.mjs` in a real browser (all widths, empty and failed states, preview of every kind). Not verified live: nothing was run against Supabase.

Owner steps, in order: (1) run `backend/supabase_migration_documents_v2.sql` BEFORE deploying (until then the page shows a plain "needs the upgrade SQL" notice); (2) open Documents, press "Set up the AMS folders", then "Read them now"; (3) move files out of Unfiled over time. `next.config.ts` report-only CSP was widened for the storage host (frames, media) and `blob:` fonts so preview keeps working when the policy is enforced.

## 8f. Owner UX items 1-10 (Muse, 21 Oct 2026; merged to main as 815712b)

All 10 owner UX items done on frontend branch `ux-fixes-2026-10`, merged to main as `815712b`, in 10 independently reversible batches (patches in `audit/ux-fixes-2026-10-21/muse/patches/`). Every fix is at shared-component level; backend untouched. The full account is `audit/ux-fixes-2026-10-21/muse/COMPLETION-REPORT.md`; decisions in `DECISIONS.md` (D1-D18); owner follow-ups in `OWNER-ATTENTION.md`.

- Bulk delete of unmatched records from the register notice (PPE/leaves/overtime), skipping what single-delete refuses and naming it.
- Signature action row mirrors the Dialog footer rhythm (was two full-width buttons in a 448px panel).
- Bulk overtime tick-list (`PeopleChecklist`); overtime dialogs focus the picker and remember recent people.
- Timesheet callout inputs removed; stored callouts show read-only and pass through (callout capture gap → OWNER-ATTENTION).
- Archived people hidden by default in PPE (toggle + read-only details + picker exclusion + typed-ID ask) and off the timesheet auto-roster.
- Find-a-part lookup tab on Stock issues over the shared `lib/spareSearch` matcher.
- Documents rests the shell sidebar as a rail (transient, never persisted; user expand wins).
- Pointer cursor for actionable elements.
- Verified: tsc clean, eslint 0 errors, full vitest green, docs:check green, production build green (63/63), all 7 touched route specs green; full sweep failures on /admin, /employees, /maintenance, /pachedu, /training exonerated against the base (2 pre-existing, 3 sweep-context flakes). Every item rendered and looked at at desktop + 390.

## 8g. PPE/timesheets/notifications run (Muse, 21-22 Oct 2026; merged to main as eab19ff)

12 owner items (timesheets edges, stock-issues find-a-part, notification deep-links + backlog honesty, PPE register/basket/lens/cleanup, related issues, reusable components) on branches `ppe-timesheets-2026-10` (frontend + backend), merged to main as `eab19ff`, in independently reversible batches (patches `01`, `02`, `03a-d`, `04`, `05a/b`, `06a/b`, `07`, `08a/b`, `09` in `audit/ppe-timesheets-notifications-2026-10-21/muse/patches/`). Full account: that folder's `COMPLETION-REPORT.md`; decisions `DECISIONS.md` (D1-D118); owner follow-ups `OWNER-ATTENTION.md`; PPE number/filter inventory `U6-INVENTORY.md`.

- Shared first: ChoiceCards, OptionChecklist (+PeopleChecklist rewrap), MultiSelectFilter, useDeepLink/useRecordDeepLink, grid tokens; ui-system README updated.
- Timesheets: register-only roster (copy/add/row-X gone), NEC ledger grid (contrast-tested), bulk cues + reworked bulk dialog (times/role/leave).
- Notifications: bell items link to records (7 pages deep-link), grouped backlog with honest unread, per-source Retry; `?status=pending` initializers; additive GET /api/overtime/{id}.
- Stock issues: find-a-part lookup atop the page (add/copy/highlight/keyboard), collapsible issue form.
- PPE: register-driven people (blank cards, unmatched pseudos, pick-only PersonPicker, server stamp + rename-follow), shared order basket (auto/manual/free lines, exclusions, LineEdit/Choose/Free dialogs, PO lines, PATCH + legacy graduation), persisted type lens (include/exclude, week/choose helpers), two restated tiles removed; one-shot SQL written, never run (owner item 13).
- Related: mine-number letter-or-digit rule both layers, employment type required for new + Type-not-set badges, formatMineNumber in pickers/register, normalizePpeType in frontend matching (matrix keys stay exact, D8 contract commented), inventory duplicate Segmented removed.
- Verified (Stage D, 22 Oct): tsc clean, eslint 0 errors (11 pre-existing warnings), vitest 1920/1920 across 253 files (exit 0; two earlier full-scale runs flaked at teardown after all-pass summaries — teardown race, zero failing tests), backend 2206 pytest green, docs:check green (ledger regen'd: 59 routes, 49 migrated, 51 verified), production build green ("Compiled successfully", exit 0), route suite 634/634 across the 12 touched routes incl. /maintenance (spec repaired to drive the dirty-guard Discard flow), 164-scale bell render 11/11 (9+ cap, "showing 5 of 164", no overflow at 1440 + 390). 77 shots in muse/shots/, every batch looked at at 1440 + 390.

## 8h. Tools eligibility + quarterly plan (Muse, 24 Oct 2026; merged to main, pushed and live 24 Oct 2026, tagged `release-2026-10-24-1`)

Three parts, one branch per part (frontend `tools-eligibility-2` stacks on `-1`, `-3` on `-2`; backend `-2`/`-3` off main). Frontend: `-1` = `566c24c`, `-2` = `41d5d65`, `-3` = `809e686` (main `2846c7d`). Backend: `-2` = `3dc8776`, `-3` = `33e1ab8` (main, live per `/api/version`). Four SQL files run 24 Oct 2026 after the owner reviewed the lists; verified live read-only 25 Oct (42 Tools people with a section, 72 tools with trade sections, monthly off on all 103 tools). Release note: Tools blocks issuing what nobody can use, eligibility follows trade sections, and quarterly checks run on a calendar plan.

- Part 1 (frontend): shared `nobodyCanUse(tool)`; issue/transfer blocked everywhere with `Nobody can use it yet` + admin/issuer shortcut to set who can use it. Nobody-tools stay visible greyed.
- Part 2 (both): eligibility by trade section. Backend `_eligibility_basis`/`_is_eligible` (individual approval OR active section member with non-excluded title; explicit removal beats the rule); pure tested classifier (name/kind/category → Electrical/Mechanical); `via_section` on eligible lists; `GET /tools/trade-section-suggestion`. Frontend follows the server list, marks `by section (X)` vs `approved individually`, section editable in the employee form + card editor, ToolForm prefills trade sections until edited.
- Part 3 (both): quarterly-only inspections. Monthly default off (backend model + ToolForm). Plan table `tools_workspace_inspection_plan`, generated on first read (first 10 working days, Zim holidays out, locations together, even spread; late tools to next free day or next quarter). Quarterly due on planned date, overdue past the window until a pass is recorded that quarter; next due = next quarter's planned date. Compliance/Inspections shows "This quarter's plan" by day with Done/Pending + Record check. Pre-migration fallback to next-due dates (no crash if SQL runs after deploy).
- Owner review lists (live data, read-only): 38 people matched by mine number (21 Mechanical, 17 Electrical), 4 title-inferred (all DEMO rows), 12 non-Engineering DEMO rows left blank; 72 active tools classified (44 both trades, 16 Mechanical-only, 12 Electrical-only; full lists in the 24 Oct session report). SQL guards encode these exact counts.
- Verified: backend 2603 pytest green, pyright 181/196 (no rise), RLS + integrity green; frontend tsc clean, eslint 0 errors (no tools warnings), vitest 251/251, docs:check 0/22, route spec ALL PASS incl. new plan checks, /tools + plan viewed at 1440 + 390. Vitest needed `--maxWorkers=1` + redirected TEMP: the box sat at 0.7GB free and Windows Temp was being wiped mid-run (environmental, same tests).

## 8i. Projects scope (Muse, 23-24 Oct 2026; merged to main, pushed and live 24 Oct 2026, tagged `release-2026-10-24-1`)

Section-scoped access for the Projects work: accounts with scope Projects see only Projects-section people modules; Tools stays whole-mine (owner decision). Backend batches 0-7 (scope registry, auth scope, enforcement per module, documents subtree, C0952 move + acceptance; `84939ef`...`b1515c7`), frontend batches 1-5 (scope-aware headers/empties, pins, documents adoption; `dccd028`...`1bccbab`). Full account: backend `docs/PROJECTS_SCOPE.md`. SQL run 24 Oct (section columns, C0952 move, account scopes); verified live read-only 25 Oct (C0952 in section Projects, 2 accounts scoped Projects). Release note: Projects accounts now see their own people modules; everyone else is unchanged.

## 8j. Process adopted (P0, Muse, 25 Oct 2026; merged to main, pushed and live 25 Oct 2026, tagged `release-2026-10-25-1`)

`frontend/docs/ENGINEERING_PROCESS.md` adopted from the 25 Oct audit draft (title only changed); linked from both `AGENTS.md` files and `docs/README.md`. Handoff record corrected: 8h (tools-eligibility live), new 8i (projects-scope release), two stale notes fixed (shared-lists tables exist live; `competency_required` column exists). Branch `process-adopt-2026-10` both repos (frontend `88b2617`, backend `c045362`). Verified: docs:check 0 errors / 22 pre-existing warnings; no code touched. Release note: how we build is now written down, and the release record is true.

## 8k. P1+P2+C1-C8 release (Muse, 25 Oct 2026; merged to main, pushed and live 25 Oct 2026, tagged `release-2026-10-25-2`)

Backend main `3568120` (merges: `plan-january-2026-10`, `c0952-department-2026-10`, `ux-consistency-4`, `ux-consistency-7`); frontend main (merges `ux-consistency-1`, `-2`, `-3-tabs`, `-4` through `-8` in order). P1: the quarterly plan starts in January (2027-Q1 generated, no 2026-Q4 rows), plan loaded once per request, idempotent race-safe generation, Harare time. P2: C0952 department Engineering. C1 feedback reaches admins (bell source + server-loaded panel, no-rating wording); C2 one bell badge rule (dark green, red when urgent); C3 one tab system (4 view-switchers to Tabs, sliding indicator, first-visit guide); C4 Recently deleted kept forever with manager restore; C5 same bulk buttons; C6 icon consistency; C7 colour themes + darkness gated to the `appearance_themes` trial flag (Projects test account), Tools keeps the sage floor; C8 the sign-in hand-over is stated on both brands, the sidebar row and both sign-in screens. Merges: 2 conflicts resolved (C2 kept C1's feedback prop + the urgency helper; C3 README kept both paragraphs) + 1 fallout fix (C2 test fixtures gained C1's feedback totals). SQL run 25 Oct via `scripts/apply_migration.py` (all HTTP 201): deleted-records table, C0952 department, themes trial flag, January plan start. Verified: backend 2627 pytest green, pyright 181/196; frontend tsc clean, eslint 0, docs:check 0 errors, vitest 2048/2048 (271 files), production build 63 pages clean. Live: `/api/version` serves the merged backend; plan rows only 2027-Q1; C0952 Engineering/Projects; test account flagged; `deleted_records` reachable and empty. Release note: the quarterly plan starts in January, deletes are kept and restorable, and the interface speaks with one voice about bells, tabs, bulk actions, themes and sign-in.

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
- **Open decision:** `/tools` still has its own component layer (`ToolsUI`, `AnimatedSelect`, `ToolsDateInput`, `ToolsDialog`, the 125 KB `tools.module.css`, about 2,500 lines). It shares the token layer and glyphs. Owner decision, 5 Oct 2026: not yet. 9 Oct: its 89 buttons, dialogs, selects and tooltips moved onto the shared components. 10 Oct: the owner approved finishing the move.

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

1. `/inventory`: DONE 9 Oct 2026, its own table (`inventory_items`); a browser's old local items move up once.
2. `/quotations`: decided to keep (see above).
3. `REPORT_TARGETS` in `lib/engineeringReport.ts`: owner to supply real targets.
4. `/sheq` safety score: owner said to leave the SHEQ page alone; no decision needed now.
5. `/compressors` "Mark as done": decided to keep as is (see above).
6. DECIDED 4 Oct 2026: `/av` redirects to `/availabilities`; `/availability` is kept and linked as "Availability Overview"; `/leave-management` (a demo prototype with sample data) redirects to `/leaves`; `/leaves` stays; `/employees-preview` is retired once `/employees` is rebuilt. DONE (branches `fix/availability-no-data-defaults` in both repos, merged and live): for equipment with no availability record the backend now returns `null` for availability, MTBF and MTTR instead of the defaults (100%, 100 h, 4 h), and `/availability` shows "No data" for them (no progress bar, left out of the department averages, "No data" in the Download as well). Equipment that has a record is unchanged. Deploy the backend first or together: the page already copes with both.

7. `/spares/import` DEFECT FIXED (backend repo, merged to `main` and deployed 5 Oct 2026): the bulk import's "Update existing" mode wrote every model default (stock on hand 0, min 1, max 5, priority medium, no supplier or location) over each existing part, because the update used the whole validated model. The backend now updates only the fields the client sent (`exclude_unset`, `backend/app/routers/spares.py`, 2 new tests in `tests/test_spares_bulk_create.py`) and the page sends only what the file says. Any earlier import in update mode may have reset stock on hand. Read-only check of the live database on 5 Oct 2026 (the owner asked for my judgment): 3,788 of 3,807 spares are at the default pattern (stock 0, min 1, max 5, medium, no supplier, no location); 3,259 were created on 20 May and about 3,330 of them were updated in one run on 21 May between 00:20 and 00:34 UTC, and the 460 created on 21 May are also at defaults. That fits the bug, but the 21 May rows created fresh also have defaults, so stock was probably never entered through the import files and nothing can be proved lost from the database alone; there is nothing in it to restore from. If anyone remembers stock quantities being on the register before 21 May, restore from a Supabase backup taken before 00:20 UTC that day (Supabase dashboard, Database, Backups) into a scratch copy and compare; otherwise enter stock on hand (issuing now depends on it: with nearly every spare at 0, issuing will report shortfalls until quantities are entered).

8. DECIDED 5 Oct 2026 (owner: yes) and BUILT and LIVE (branch `feature/shared-lists-and-stock`, merged): issuing stock takes it off the spare's `current_quantity` by stock code (`backend/app/stock_levels.py`; a read-only check of the live database found no trigger that already does it, so it is not applied twice); never below zero, a shortfall and an unknown code are reported as warnings and the issue is still recorded; deleting an issue puts the stock back; editing the items moves only the difference; the issue summary now reads every page (it was cut at 1000 rows). Existing issues (75 on 5 Oct) are not retro-applied. The Spares picker refreshes its quantities after an issue. Background: `/issues`: recording a stock issue does not reduce the spare's quantity (neither the page nor the issues router touches `spares.current_quantity`; a database trigger cannot be ruled out from the code). The page now says it is a record only. Decide whether issuing should decrement stock. Also the server's issue summary counts at most 1000 rows (an unbounded select), so the "Total records" tile is wrong beyond that.

9. `/leaves` authorisation: decided and done (see above).

10. `/timesheets` roster and retry: decided and done (see above).
11. `/artisan-timesheets` saved list: summary mode done (see above).
12. DECIDED 5 Oct 2026 (owner: save to Supabase) and BUILT and LIVE (merged; tables `ppe_order_list` and `saved_quotations` exist): the PPE order list (`/api/ppe-order-list`, table `ppe_order_list`) and saved quotations (`/api/quotations`, table `saved_quotations`) are kept on the server and shared by everyone who signs in; what a browser held before is moved up once and then removed from the browser; a quotation can be deleted by whoever saved it or a manager. The quotation being typed and the company details stay in the browser. CORRECTED 25 Oct 2026 (read-only live check): both tables exist live (`ppe_order_list` 9 rows, `saved_quotations` 0 rows) — the earlier note that the file was not applied was stale.
13. `/ppe` DEFECT FIXED (6 Oct 2026): issuing from the order list saved the new record but left the item that was due `active` and overdue, so the employee's card still showed it as due and compliance counted it. The old record is now marked `returned` when its replacement is issued from the order list (a failure to do so is reported, the issue itself stands); a plain "Issue PPE" is unchanged. Route spec `/ppe` covers it.
    CORRECTED 20 Oct 2026 (owner): the 6 Oct fix marked the old record `returned`, which is wrong for PPE: an item that has worn out or reached its expiry is kept by the person, nothing is handed back, and it applied to items that were not yet due as well. Issuing from the order list now UPDATES the record the entry pointed at, in place: new issue date, expiry counted from it by the matrix, status `active` so it reads "In date" again, size and item as issued; its notes, issued-by and location are carried into the form so they are not blanked. Due and not-yet-due items are treated the same. It is only done when the record is still active and is for the same person and kind of PPE; otherwise it is a plain new issue (nothing is ever set to `returned` by this flow). `renewalTarget` in `ppeLogic.ts` decides it; unit tests and the `/ppe` route spec cover it. The previous issue date and expiry are overwritten on the record itself; the old values are kept only in the server audit log (writes to ppe_records are audited by app/audit.py, once the audit_log table exists: check /api/health shows audit ok). A plain "Issue PPE" is unchanged.
14. BUILT AND PUSHED 7 Oct 2026 (backend `213b3d3`, frontend the commit after `9189ada`): (a) `/ppe` order list: the "Purchase order lines" summary starts collapsed, opens on request (`OrderListView.tsx`, route spec). (b) `/tools` Employees tab rebuilt as eligibility "By person" and "By equipment": each heading opens to a short list with a searchable add (type, Tab or Enter) and a two-step remove; an "Authorised by" field (remembered in the browser, defaults to the latest authoriser) is sent as `authorized_by` on each approval (`ToolsEligibility.tsx`, `ToolsPeople.tsx`, `buildEligibility` in `toolEligibility.ts`). While the approvals are loading or failed, counts read "Approvals unknown" with a retry, never 0. (c) Issue and transfer of equipment with an overdue inspection can now go ahead: tick "Go ahead anyway" and give a reason (5+ characters); backend `MovementInput`/`IssueInput` take `override_due_checks` and `override_reason`, the reason is written into the history entry, and a viewer still cannot (403). The Issue form's Employee field lists every eligible person, not just 8. (d) Data (live, done by the owner's request): the 752 bulk-granted approvals now say authorised by Edson Mavhondo (they said the signed-in administrator). Deploy backend first; each side tolerates the other being old (unknown fields are ignored, the override then simply does not apply).
15. BUILT 7 Oct 2026 (second batch, same state as item 14): `/tools` Equipment opens as a list (only an explicit choice of the grid is remembered, `viewChosen` in the saved preferences); the Overview leads with large stat tiles, needs-attention and the workspace shortcuts, and Recent movements fold away (closed by default, remembered in this browser, open and unmissable if the history failed to load); a visible Download button on the register and a rebuilt export (`toolsExports.ts`): Excel with a title band, frozen header, filter, stripes, status colours and print setup (Cambria over Calibri), Word with a repeating header row and page numbers, PDF with a Times title over a Helvetica table and "Page x of y". The Issue form's Employee field is now `ToolsEmployeePicker.tsx`: everyone eligible for the chosen tool is listed under the search box with job title and number (type to narrow; Enter or Tab takes the top match). Account access is one aligned table (Person, Access, Department, Gate-pass signing, Action) that becomes labelled cards when narrow, with Apply live only when something changed. Also fixed: the Overview's animated stat numbers were 11 px because a label rule matched their spans. STILL OPEN: the 31 demo tools (25 are marked "Example record for the Tools workspace pilot", the rest are 19 and 23 Sept test imports and junk such as `def2333` and `type`) and the 16 `DEMO-*` employees are still in the live Tools tables. The owner asked for them to be removed; a direct delete was refused by the tool permission layer and was not worked around. The database keeps audit history with restrict foreign keys, so a delete has to remove their `tools_workspace_history` and `tools_workspace_changes` rows first (52 and 50 rows, the competencies cascade), and the 40 PUG tools are unaffected.
16. BUILT 7 Oct 2026 and PUSHED (third batch; frontend `9cf97f0`): (a) `/tools` Compliance is no longer one long page. It has a summary strip and four sections: Inspections (a table, overdue equipment first, a Record check button per row that opens the form for that equipment), Incidents (open incidents with a Close investigation button), Approvals (approval cover: equipment nobody is eligible for and approvals expiring within 30 days, with a link to Employees) and Record (the four forms for managers); the per-person-and-tool competency list that printed hundreds of rows is gone because Employees now shows it (`ToolsComplianceViews.tsx`, `ToolsCompliance.tsx`). (b) The eligible-employees list in a tool's details sits above the specifications, uses the person icon instead of initials (also in the Issue form picker and on Account access) and gives an issuer an Issue button on each name that opens the Issue form for that tool and person. (c) Employees can be deactivated and reactivated (backend `PATCH /api/tools-workspace/employees/{id}` with `active`; refused while they hold equipment; nothing is deleted); inactive people are hidden by default behind a Show inactive toggle and are never counted as eligible. (d) Demo data: the 13 Engineering demo tools are archived; the 15 in Mining, Mine Technical Services and Shared Services still need an administrator sign-in, and MTS-TL-003, 005 and 006 are issued to demo people so must be received first; the 16 `DEMO-*` employees wait for the deactivate endpoint to be deployed.
17. BUILT 17 Oct 2026, NOT COMMITTED (prompt [`TOOLS_LIEU_PROMPT_2026-10.md`](./TOOLS_LIEU_PROMPT_2026-10.md), units T1–T4/O1–O2; awaiting the owner's commit word): (a) `/tools` issue surfaces: tools that cannot be issued are greyed out with the reason, and naming one previews how to unblock it; blockers resolve inline — Receive/Transfer for custody, Record check / Record repair over the issue flow without losing it — in both the single and bulk issue forms; backend `commands` refuses `not_working`/fault issues. (b) Suggest fields are the shared `Combobox` (Tab/Enter commits, empty-Tab safe). (c) Mouse-scroll probe (`tmp/scroll-probe.mjs`): no stuck scroll found, page lock behind modals verified correct — no change made. (d) Unknown mine numbers are a real NULL: `EmployeeInput.employee_number` optional, `PATCH` add/change/clear, import preview/commit accept numberless staff; frontend shows "Not recorded" (migration `supabase_migration_tools_workspace_employee_number_nullable.sql`, written, NOT run). (e) Overtime "Taken in lieu" is now "To be taken as leave"; `POST /api/overtime/{id}/take-as-leave` (approved + lieu, idempotent, manager-only) writes an approved linked `leave_type="lieu"` leave, and the detail offers Mark as leave taken with a taken badge (migration `supabase_migration_leaves_overtime_link.sql`, written, NOT run). (f) Transferred lieu leaves skip timesheet projection (`isTransferredLieuLeave`); manual lieu and the OT premium merge untouched. Verified: tsc, eslint, unit suites (tools 188, overtime 67, timesheets 261, merge 17; backend routers 116), production build, route specs `/tools,/overtime,/leaves,/timesheets` ALL CHECKS PASSED, axe 3 passed, renders at 1440 and 390 inspected (`tmp/shots-390/`, route shots). Other session's `Dialog.tsx`/`gestures.ts` edits and `app/timesheets - Copy/` untouched. DEPLOYED 17 Oct 2026 in that order, all verified: backend `2e23838` pushed, CI green, Render live per `/api/version`; both migrations applied to `geomlsxphwaxpaloweky` via `scripts/apply_migration.py` and re-checked (overtime_id column + unique index present, employee_number nullable, row counts unchanged); frontend `ae71b52` + ledger `f7526fb` pushed, CI green (176 files / 1364 tests, smoke 62/62 after realignment, browser quality 4/4), Vercel production verified by serving a new-build marker. Notes: (a) frontend CI had been red since 15 Oct (committed ledger was stale, generated from a dirty tree with a phantom `/timesheets - Copy` row) — clean regen fixed it; local `docs:check` still fails on that untracked folder, which CI never sees. (b) Smoke's 3 Tools checks were stale since committed `0c1ca19` (Open settings / Open filter buttons gone) — realigned to Settings, Grid view, Filters popover; no product change. (c) `e2e/visual/` had no committed baselines so the visual step always skipped — seeded by the baseline workflow as `36c322e`; future UI changes are now gated for real. (d) Excluded from both commits and left in the worktree: the parallel session's `home-preview/` route + spec, `timesheets - Copy/`, Nav/gestures/employeeCatalog/package edits, Nav test, 4 docs (all still dirty; another session was writing mid-deploy). (e) Compressor migrations (`compressor_service_milestones`, `compressors_equipment_link`) APPLIED 17 Oct 2026 via `scripts/apply_migration.py` — live was already in their end state (12 linked zero-hour rows, 6-rung ladder), so every step was a verified no-op; post-checks identical. CORRECTED 25 Oct 2026 (read-only live check): the `competency_required` column exists on `tools_workspace_equipment` — the file's content is applied. The `schema_migrations` tracker table is still absent on live, so nothing was recorded there.

18. BUILT 19-20 Oct 2026, MERGED to main 20 Oct 2026 as `a29db4a` (PR #19, CI green; branch `forms-polish-2026-10` commits `6ad2465` + handoff `40b2a0d` + main-merge `3104b8b` + ledger `a1a1f3e` + baselines `2f7460d` + handoff `8c16577`; audit `audit/form-audit-2026-10-19/`, run docs under `muse/`): the forms behaviour-polish run. All 19 audit findings verified, fixed or deliberately dispositioned (map in `muse/IMPLEMENTATION-PLAN.md`; decisions D2-D34 in `muse/DECISIONS.md`). Shared-component fixes so every form inherits: dirty-guard asks before closing (was: Escape closed 49/49, no ask), focus moves to the first invalid field on failed submit (was: 0/57), SuggestField error wiring (sop 4/4, was 4/1), Tools double-submit guard (1 POST, was 2), server 422 field labels ("Name: ..."), timesheet expected_updated_at + verbatim 409s, upload size/type guards, number-input editing, linked error messages, checkbox 44px rows, required-cue alignment, auth fixes (no login length minimum, Show/Hide x3, set-password catch), employee email check. Verified: tsc clean, eslint 0 errors (11 pre-existing warnings in untouched files), vitest 227 files / 1698 tests pass, docs:check green, production build passes, touched-route specs ALL PASS, staged before/after probe green, final shots reviewed. Full route suite: /maintenance, /overtime, /training fail only under load (pass in isolation); `/` home-search failure is a PRE-EXISTING timing race (proven on pristine HEAD: search files byte-identical, outcome flips on same server+code; Escape-to-clear vs un-reopened popover) — not fixed, out of scope, logged with recommendation in `muse/OWNER-ATTENTION.md` 8b. Backend untouched. Other session's 4 timesheets files (NEC period-month) preserved and verified working. Completion report: `muse/COMPLETION-REPORT.md`; per-batch reversible patches: `muse/patches/01-13`.

19. BUILT 20 Oct 2026, MERGED to main 20 Oct 2026 (frontend PR #19 as `a29db4a`, backend PR #9 as `c68e306` and live on Render; backend commits `d9a7c1b` + certifi bump `ece599e`): the owner-asked recommendations from `muse/OWNER-ATTENTION.md`. (1b) Tools refuses numberless duplicates by (name, department) with 409 on create + import commit — option (b), because (a) would undo the deliberate nullable-number feature (D35); PATCH-clear deliberately unguarded. (2) expected_updated_at honored + restamp on employees/spares/requisitions/stock_issues, clients send it (issues backend-only, no UI edit); `supabase_migration_updated_at_guards.sql` APPLIED 20 Oct 2026 via `scripts/apply_migration.py` with the owner's word (HTTP 201) and re-checked live (both columns + triggers present). (3) Timesheet bulk saves send per-row expectations; 409 rows skip with a reload message while the rest save; undo intentionally unsent. (4) Employee email server check (blank OK, else client regex, 422). (6) ToolsDialog dirty guard (derived dirt, no busy prop). (8b) Home-search race fixed (non-empty input claims focus) and `/` spec green 3/3 (asserts popover open; fixed its relative goto, which Playwright never supported). (5) DONE: owner confirmed the Supabase password minimum is 6 — client minimums already match. Verified: backend pytest 2182 passed; tsc clean; eslint 0 errors, 0 new warnings; full vitest green; build passes; route specs `/ /tools /timesheets /employees /spares /requisitions /issues` all pass. Decisions D35-D38; owner list updated with DONE markers. Merge CI fixes (all pre-existing, none from this run): certifi 2026.10.19 for the backend pip-audit gate (fresh advisory), ledger regen after merging main (timesheets count 19), home visual baseline regen via the sanctioned workflow — the 17 Oct baseline predates the 19 Oct home search box, and main was red for the same reason since 19 Oct.

## 10. Preserve

The other repo's pre-existing edit; Tools polish edits; the no-caching rules in `PWA_UPDATES.md`; the never-auto-refresh rule;
the failure-state patterns; the owner's constraints in section 1.
