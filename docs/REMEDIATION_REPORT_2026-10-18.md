# Remediation report — frontend (Phases 3–5) + final verification, 2026-10-18 scan

Independent quality scan dated 2026-10-18, remediated per the owner-supplied
5-phase prompt. This file covers the frontend repo (Phases 3–5) and the final
full verification. The backend repo (Phases 1–2) is reported in
`backend/docs/REMEDIATION_REPORT_2026-10-18.md`.

Standing rules observed: no commit/push/deploy, no migrations, no live data,
no new packages, shared-component fixes over page patching, Tailwind
no-competing-classes, `--mo-*` tokens / type roles / focus / motion kept.

## Phase 3 — frontend correctness

Error surfaces (new): `app/error.tsx`, `app/global-error.tsx`,
`app/not-found.tsx`, `app/loading.tsx`, `app/tools/error.tsx`,
`app/error-shared.tsx`, `app/error-pages.test.tsx`,
`scripts/route-specs/no-such-page.mjs`. Every route now fails honestly with
retry/home, never a blank page or a fake empty state.

Design-system refinements (shared level): `PageHeader` title treatment,
`Segmented` pill restyle, `tokens.css` + `tokens.test.ts` + `chartTheme`,
`docs/COLOR_HARMONY.md`, 4 reflowed grids. 37-file token codemod
(177 replacements) moving hardcoded colours onto `--mo-*` tokens;
`scripts/css-consistency.mjs` ratchet (`no violations`) wired into
`docs:check`, with `lib/css-consistency.test.ts`. Before/after screenshots
pixel-diffed with a zero-dependency PNG differ: Tools card region IDENTICAL,
remaining diffs proven animation/layout noise via an after-vs-after2 control.

Data honesty: `lib/apiClient.ts` gained shared `apiFetch` transport;
`app/tools/toolsApi.ts` + `toolsApi.test.ts` route through it with the Tools
error contract preserved byte-identical; `AuthForm.tsx` (+ test) fixed a
false-success on 429/500. Four true key-value detail views migrated to
`FactList` with tests (`NecPersonView`, `ArtisanEditor`, `JobCardDetail`,
`ToolDrawer`); figures/rows/menus deliberately kept with reasons recorded.
`app/sw.js/route.test.ts` covers the service-worker route. Date handling via
`lib/dates.ts` (`todayLocal`, incl. the `work_stoppage` fix).

## Phase 4 — hygiene

- `next.config.ts`: security headers + report-only CSP. Report-only, not
  enforcing: App Router flight scripts change per build; hashes are pinned
  for the 2 bootstrap scripts; enforcing needs nonce plumbing (follow-up).
- Deletions: 5 unused SVGs, `temp_dev_log.txt`, the stray
  `Tempeslint_out.txt` (owner-authorised), 6 empty route dirs (after
  confirming no nav/spec references).
- 35 dependency uninstalls, no new packages: `package-lock.json`
  14966 → **12676 lines**; `node_modules` 1207 → **938 MB**.
- `npm audit --omit=dev --audit-level=high`: exit 0 — 3 moderate, **0 high**.
- Coverage ratchet in `vitest.config.ts`: 35/34/28/38 under measured
  35.71/34.82/28.12/38.97, so coverage can only rise.
- `docs:check` ledger gap on untracked `app/timesheets - Copy/` is
  pre-existing (other session's folder, preserved); `docs-links.mjs`
  standalone is green.
- 2 deferred emoji-icon sites (`FileBrowser.tsx:74`, `services/page.tsx:30`)
  left for an owner visual call, ratchet exceptions documented.

## Phase 5 — structural (ran only after 1–4 green)

Shared-component work behind the Phase 3–4 fixes: `Dialog`/`Confirm`/
`Tooltip`/`surfaces`, `DataTable`, `ViewToggle`, `Nav` (+ test), `Frame`,
`Button`, `gestures`, `AppearanceFields`, `auth-context` (+ test), `mfa-ui`
(+ test), `ModuleBrowser` (+ test), `useOperationalAlerts` (+ test),
`ToolsAuth`/`ToolsNotifications` (+ tests), `ArtisanEditor`/`JobCardDetail`
tests, `employeeCatalog`, `usage`, `exportUtils`, `moduleSearch` (+ test),
`pwa-colours` (+ test), PWA manifests, `report-date-defaults` test,
`docs-ledger.mjs`, `migration-verification.json`, `home.mjs` spec updates,
CSS tooling docs. Full per-file list in the Manifest section below —
nothing is claimed here that the manifest does not show.

## Final verification (frontend)

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | 0 errors, 11 warnings |
| `npx vitest run --coverage` | **214 files / 1671 passed**; 35.71/34.82/28.12/38.97 vs 35/34/28/38 ratchet, exit 0 |
| `npm run build` | green (production build) |
| `scripts/verify-routes.mjs` (full) | **ALL CHECKS PASSED - 1910 passed, 0 failed**, exit 0 |
| `scripts/a11y-routes.mjs` (full) | **0 routes with serious/critical violations**, exit 0 |
| `scripts/css-consistency.mjs` | no violations |
| `npm audit --omit=dev --audit-level=high` | 3 moderate, 0 high, exit 0 |

### Harness races found and fixed during final verification

Three full-suite runs each surfaced exactly one distinct timing flake; all
three were root-caused to the harness sampling the UI mid-update, with
product code verified untouched on each path, and all three specs fixed:

1. `spares-import.mjs` — "the result step shows the counts and a way back":
   immediate `isVisible()` with no wait. Fix: `waitFor('In the file')`
   before asserting (same pattern as the rest of the spec). Only
   `app/spares/requisitionPdf.ts` (2 lines, PDF-only) changed in that area.
2. `a11y-routes.mjs` — `/noticeboard` 3× serious color-contrast: axe sampled
   the shell's `ActiveNoticesPopup` cards mid framer-motion spring entrance
   (`initial={{y:40,opacity:0}}`, `ActiveNoticesPopup.tsx`), reading blended
   intermediate colours. Settled state is compliant (isolated axe PASS, 0
   nodes, screenshot-verified). Fix: settle wait 800 → 2000 ms with an
   explanatory comment. Full axe re-run: 0 violations.
3. `quotations.mjs` — "saving keeps the quotation…": the 5 s `waitFor` for
   the Saved tab expired under load (swallowed), then an immediate assert
   ran before the UI updated — while the later auto-waiting click and all
   follow-up checks passed. `app/quotations` untouched. Fix: poll for the
   asserted condition (tab visible AND store updated, 100 ms × 50) before
   checking. Same expectation, no narrowing.

Each fix was verified with its focused spec (`--only …`: ALL CHECKS PASSED).
Follow-up worth an owner word: the `isVisible()`-without-wait +
swallowed-`waitFor` pattern recurs across specs; the three observed sites
are fixed, others may flake under load in future full runs.

### Line endings

The editing tools wrote LF into this repo's CRLF working tree (~217 files).
All touched files were converted back to CRLF byte-level after the work;
`git diff --stat` totals verified identical before/after
(frontend 123 files +1264/−4924; backend 86 files +1882/−510) and the
`LF will be replaced by CRLF` warnings are gone. Other-session paths
(`app/timesheets - Copy/`, `app/home-preview/`, `app/wireframes/`, related
docs) were excluded and are untouched.

## Manifest (frontend tracked changes)

121 modified + 2 spec/harness fixes + deletions; new files untracked.
(`??` other-session paths — `app/timesheets - Copy/`, `app/home-preview/`,
`app/wireframes/`, `FORM_POLISH`/`QUALITY_INSPECTION`/`USABILITY_FIX_PLAN`
docs — are NOT this run's and are preserved as found.)

Modified: `app/admin`, `app/artisan-timesheets/ArtisanEditor`,
`app/availability`, `app/compressors` (7 files), `app/drivers/exportDrivers`,
`app/employees` (EmployeeForm, exportRoster, roster+test, useEmployeesData
test), `app/issues/exportIssues`, `app/job-cards`, `app/near_miss`,
`app/noticeboard`, `app/overtime/insights/Heatmap`, `app/pachedu`, `app/page`,
`app/ppe/ppeLogic.test`, `app/pto`, `app/requisitions`,
`app/safety_complaints`, `app/sheq_inspection`, `app/shifts/ScheduleGrid`,
`app/spares/requisitionPdf`, `app/standby/standbyRoster`,
`app/timesheets` (ModuleApprovalIndicator, NecPersonView+test, TimesheetGrid),
`app/tools` (24 files incl. toolsApi+test, ToolDrawer, ToolsUI), `app/training`,
`app/usage-analyzer`, `app/vfl`, `app/work_stoppage`, `components/app-shell`
(AccountMenu, ShellSearch, ShellSidebar, AuthForm, AuthLayout, mfa-ui,
useOperationalAlerts), `components/home/ModuleBrowser`,
`components/shared/utils`, `components/ui-system` (README, AppearanceFields,
chartTheme, gestures, theme.css, tokens.css, tokens.test, Confirm, Dialog,
Tooltip, surfaces, DataTable, PageHeader+test, ViewToggle, Button, Segmented
+test, Frame, Nav), `docs` (COLOR_HARMONY, CURRENT_HANDOFF,
ENGINEERING_STANDARDS, MIGRATION_LEDGER, migration-verification.json),
`eslint.config.mjs`, `lib` (apiClient, auth-context, employeeCatalog+test,
exportUtils, mfa, usage), `next.config.ts`, `package.json`,
`package-lock.json`, `public/manifest.json`,
`public/tools/manifest.webmanifest`, `scripts/docs-ledger.mjs`,
`scripts/route-specs/home.mjs`, `vitest.config.ts`.

Deleted: 5 SVGs (`file`, `globe`, `next`, `vercel`, `window`),
`temp_dev_log.txt`.

New (untracked, this run): error pages + tests, `app/loading.tsx`,
`app/not-found.tsx`, `app/report-date-defaults.test.ts`,
`app/sw.js/route.test.ts`, `ArtisanEditor`/`JobCardDetail`/`ToolDrawer`/
`ToolsAuth`/`ToolsNotifications`/`AuthForm`/`mfa-ui`/`useOperationalAlerts`/
`ModuleBrowser`/`Nav`/`apiClient`/`auth-context`/`css-consistency`/
`moduleSearch`/`pwa-colours` tests, `lib/moduleSearch.ts`,
`scripts/css-consistency.mjs`, `scripts/lib/wireframe-fixtures.mjs`,
`route-specs/home-preview.mjs`, `route-specs/no-such-page.mjs`,
wireframes route specs (administration, dashboard, index, planning-grid,
register, report, workflow), CSS tooling docs.

Lockfile: `package-lock.json` 14966 → **12676 lines** (35 uninstalls, 0 adds).
Migrations: none in this repo (all SQL lives in backend; none applied).

## Owner gates (frontend parts)

- Gate 3 items touching frontend: the 2 deferred emoji-icon sites
  (`FileBrowser.tsx:74`, `services/page.tsx:30`); enforcing CSP needs nonce
  plumbing (follow-up, not a gate); commit/push of both repos awaits the
  owner's explicit word (stage by name, never `add -A`; two separate repos).

## Not verified

- Full route suite: 1910/1910 on the final run. Three harness races found across earlier full runs are fixed (see Harness races); the suite's `isVisible()`-without-wait pattern means future full runs under load may still flake at other unobserved sites.
- Reduced-motion and animation paths beyond the axe settle fix were not
  exhaustively exercised.
- Production (Render + live Supabase) was not touched: no deploy, no
  migration, no live-data check — per instructions.
- `docs:check` ledger gap on untracked `app/timesheets - Copy/` is
  pre-existing; CI unaffected.

