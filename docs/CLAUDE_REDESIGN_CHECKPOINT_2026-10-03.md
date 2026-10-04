> Long-form narrative log. The current summary and next steps are in [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md).

# MyOffice redesign — checkpoint, 3 October 2026

**Status: PAUSED by the user mid-foundation. Nothing is wired into the running app.**
The new design system exists as unreferenced, partly verified code in
`frontend/components/ui-system/`. No route, layout, provider or stylesheet imports it yet,
so **the application looks exactly as it did before this session.** Nothing is committed
or pushed. The redesign is not done and must not be described as done.

Written for: the next Claude session (or a human) resuming this work without the chat.

---

## 1. Goal and decisions

**Goal (from the user's brief):** one site-wide visual and interaction language across
every MyOffice route, derived from the *improved* Tools & Equipment workspace
(near-white `#f4f6f5` canvas, pale-sage surfaces, charcoal-green `#233b31` action,
Inter body, Plus Jakarta Sans display, Phosphor icons at regular weight in navigation,
stationary cards, calm motion). Tools must consume the shared system too. One
authority at `@/components/ui-system`; obsolete design systems and docs are physically
deleted after migration. Business rules, payroll (NEC timesheets), work orders and
auth must not change. Do not commit, push, deploy or migrate.

**Decisions made (mine, flagged where the user should confirm):**

| # | Decision | Why | Status |
|---|---|---|---|
| D1 | One light appearance; **dark mode is retired.** Tokens are semantic on `:root` so a dark palette is one future block. | Tools' own CSS has no dark rules; the earlier `tools-theme.css` header already scheduled the light/dark control to retire. | **NEEDS USER CONFIRMATION** — it removes a user-visible preference. |
| D2 | Shell rebuilt, not reskinned: one sidebar, one top bar, **bottom bar removed.** | Bottom bar shows a hard-coded, always-green pulsing "All systems operational" (a fabricated status) and duplicates notifications and settings. | **NEEDS USER CONFIRMATION** (removes a visible element). Feedback moves to the account menu. |
| D3 | Page scrolls at the document level (sticky top bar and sidebar) instead of an inner `overflow-y-auto` main. | Browser zoom, find-in-page, anchors and mobile browser chrome behave normally. | Unverified against the 56 pages (only one hard-coded `100vh` found: `overtime/page.tsx:2096`). |
| D4 | Text size uses `--mo-text-scale` inside Tailwind's `--text-*` theme values (including default `text-xs`…`text-4xl`). **No CSS `zoom`.** | Brief forbids `zoom` and double scaling; portals inherit from `:root`. | Designed, not yet exercised. |
| D5 | Radix for Dialog, AlertDialog, Popover, Tooltip, Select, DropdownMenu, Tabs; `cmdk` for the searchable picker. Native `<select>` kept as `NativeSelect`. | Brief prefers existing Radix infrastructure. | Written, not rendered. |
| D6 | Chart palette is the dataviz reference categorical set (8 slots, fixed order). | Only part of the tokens actually *computed*: `validate_palette.js` against `#fbfcfb` → all gates pass; contrast WARN on slots 3–5 (aqua/yellow/magenta) so those charts need direct labels or a table view. | Verified by script. |
| D7 | Interim migration strategy: switch the theme layer once, centrally, then migrate pages in small groups and **delete** the token layer with codemods. No permanent compatibility wrapper. | Measured: 4,414 `${t.*}` interpolations in 106 files cannot be hand-edited safely. | Plan only. |
| D8 | Fonts: Inter (body), Plus Jakarta Sans (display), Manrope (alternative). Drop Montserrat, Sora, Geist. | Brief. | Not applied. **Known required fix:** apply the `next/font` variable classes to `<html>`, not `<body>` (see §6). |

---

## 2. Files actually changed

**Modified in the repo (by me): one line.** `frontend/eslint.config.mjs` — added
`"components/ui-system/foundations/**"` to the `ignores` of the existing
`@phosphor-icons/react` restricted-import rule. (That whole rule block was already an
uncommitted addition from earlier work; only the ignore entry is mine.)

**Created (all untracked, all under `frontend/components/ui-system/`, 46 files, 3,939 lines):**

- `foundations/` — `tokens.css`, `theme.css` (Tailwind bridge + scale-aware type), `base.css`,
  `cn.ts` (tailwind-merge extended for the custom scales), `typography.ts` (role scale),
  `glyphs.ts` (450 Phosphor re-exports under logical names), `icon-meanings.ts` (147 meanings → one glyph each),
  `Icon.tsx` (weight policy: control = light, navigation = regular, emphasis = fill)
- `appearance/` — `appearance.ts` (validated record, migration, pre-paint `APPEARANCE_BOOTSTRAP`),
  `appearanceStore.ts` (`useSyncExternalStore` store), `AppearanceProvider.tsx`
- `primitives/` — `Button.tsx` (Button, IconButton, Spinner), `Badge.tsx`, `Field.tsx`, `Input.tsx`,
  `Checkbox.tsx`, `SearchField.tsx`, `Tabs.tsx`, `Card.tsx`, `Skeleton.tsx`
- `overlays/` — `surfaces.ts`, `Dialog.tsx`, `Drawer.tsx`, `Confirm.tsx`, `Popover.tsx`,
  `Tooltip.tsx` (+ `HelpHint`), `Select.tsx`, `Combobox.tsx`, `Menu.tsx`
- `patterns/` — `PageHeader.tsx` (+ `Toolbar`), `MetricTile.tsx`, `RecordCard.tsx`,
  `DataTable.tsx`, `Pagination.tsx`, `ViewToggle.tsx`, `DataRegion.tsx` (+ `EmptyState`, `Notice`),
  `DestinationSearch.tsx`, `dataStatus.ts`, `tableLogic.ts` and the two `*.test.ts`
- `shell/` — `Nav.tsx` (NavItem, NavGroup, NavHeading), `Frame.tsx` (SidebarFrame, TopBar, AppFrame)
- `hooks/` — `usePersistentState.ts`, `useMediaQuery.ts`
- `index.ts` — barrel (**does not yet export `shell/*` or `useMediaQuery`**)

**Not touched:** every route, `app/layout.tsx`, `app/globals.css`, `components/Providers.tsx`,
`components/app-shell/*`, `components/shared/design-system/*`, `components/ui/*`, `app/tools/*`,
all docs, rules, skills, memory, and the backend. The 91 modified and 14 untracked paths that
existed before this session are unchanged.

**Outside the repo (temporary, may not survive):** harness and scan files in the session scratchpad
`%TEMP%\claude\c--Users-Administrator-Documents-studio-myoffice\db575038-…\scratchpad\`
(`tools-fixtures.mjs`, `capture-tools.mjs`, `inventory-scan.mjs`, `scan\scan.json`,
`inventory\g01-*.json`, `inventory\g02-*.json`, `shots\tools-before\*.png`), plus copies of the
two harness scripts in `frontend/node_modules/.cache/mo-audit/` (git-ignored).

---

## 3. Components: completed vs unfinished

"Written" means the file exists and type-checks/lints (except `Nav.tsx`). **None has been rendered
in a browser or interaction-tested.** Only the two pure-logic modules have unit tests.

| Area | Written | Unit-tested | Rendered / interaction-tested |
|---|---|---|---|
| Tokens, theme bridge, base CSS, type scale | yes | no | **no** (CSS is not imported anywhere) |
| Icon layer (glyphs, meanings, `Icon`) | yes | no | no |
| Appearance (record, store, provider, bootstrap) | yes | parse/migrate logic not covered by new tests (old `design-system/appearance.test.ts` covers the legacy twin) | no |
| Button, IconButton, Badge, Field, Input, Checkbox, Card, Tabs, Skeleton | yes | no | no |
| SearchField, DestinationSearch (incl. idle/recent results) | yes | no | no |
| Dialog, Drawer, Confirm, Popover, Tooltip, Select, Combobox, Menu | yes | no | no |
| DataTable, Pagination, ViewToggle, RecordCard, MetricTile, PageHeader, DataRegion | yes | selection/sort/paging logic and data-status logic only (25 tests) | no |
| Shell frames (`Nav`, `Frame`) | yes — **2 type errors** | no | no |

**Unfinished (nothing started unless stated):**
1. Fix `Nav.tsx` type errors; export `shell/*` and `useMediaQuery` from the barrel.
2. Wire-up: import the three CSS files in `app/globals.css` **and remove the colliding legacy
   `@theme inline` keys** (`--font-sans`, `--radius-sm…xl`, `--color-chart-1…5`); map the shadcn
   variables to `--mo-*`; new fonts in `layout.tsx`; replace the zoom/theme/design pre-paint script
   with `APPEARANCE_BOOTSTRAP`; swap providers in `components/Providers.tsx`.
3. Rebuild `components/app-shell/*` on the new frames: `AppShell`, sidebar, top bar (global search,
   one notifications popover, one Appearance/Preferences entry, account menu), preferences dialog
   (typeface cards, 85–130% in 5% steps, helpful hints, default view, sections expanded, clear typed
   history, reset customisations, manage favourites), feedback dialog; restyle `AuthMenu`/`AuthForm`,
   `QuickActionsManagePanel`, `ActiveNoticesPopup`; **delete `BottomBar.tsx`**. Keep `useAppShellState`,
   `modules.ts`, notification and alert hooks unchanged (behaviour to preserve).
4. Charts wrapper from the validated palette; toast styling; focus/keyboard tests for Select,
   Combobox, DestinationSearch, Dialog focus return; preference persistence tests.
5. Tools migration onto the shared system (replace `ToolsUI.tsx`, `AnimatedSelect.tsx`,
   `ToolsDialog`, `ToolsWorkspaceSearch`, `ToolsIcon`; reduce `tools.module.css`; note `/maintenance`
   imports `../tools/tools.module.css`).
6. All 56 routes; codemod to remove `${t.*}`/`useTheme`; delete `components/shared/design-system`
   (Classic + Dallaglio), `components/shared/theme.tsx`, legacy `globals.css` `.oz-*` block, superseded
   `components/ui/*`, and obsolete design docs after extracting principles; enforce import boundaries
   in `eslint.config.mjs`; rewrite `AGENTS.md`/`CLAUDE.md`, `.cursor/rules`, skills, README, project
   memory; write `components/ui-system/README.md` as the single authority; foundation handoff;
   acceptance matrix.
7. Not yet done at all: docs/guidance inventory (agent x2), claims audit (x4), test/CI inventory
   (x3), shared-component consumer counts beyond the scan below, route-by-route layout redesign notes
   for the 44 routes not covered by g01/g02.

---

## 4. Checks actually run, and results

All run from `frontend/` on 3 Oct 2026. Nothing else was run.

| Check | Command | Result |
|---|---|---|
| Unit tests | `npx vitest run components/ui-system` | **PASS** — 2 files, 25 tests (`dataStatus` 12, `tableLogic` 13) |
| Lint | `npx eslint components/ui-system` | **PASS** — no output (earlier run had 10 warnings; fixed) |
| Typecheck, whole project | `npx tsc --noEmit -p .` | **FAIL, 2 errors, both mine**: `components/ui-system/shell/Nav.tsx(30,43)` and `(85,54)` — `typeof icon === 'string'` does not narrow `ElementType` (which includes intrinsic tag names), so `Icon name={icon}` rejects it. Rest of project: 0 errors. Fix: discriminate with a prop (e.g. `icon={{meaning}}` vs `glyph={Component}`) or check against `ICON_MEANINGS`. |
| Palette validation | `validate_palette.js` (dataviz skill) on the 8 chart colours vs `#fbfcfb` | **PASS**, contrast WARN slots 3–5 (see D6) |
| Production build | `npm run build` | **NOT RUN** |
| Smoke / a11y / visual / browser-quality suites | `npm run test:smoke`, `test:browser-quality`, `test:visual` | **NOT RUN** |
| Full vitest / coverage floors (14/10/8/15) | `npm run test:coverage` | **NOT RUN** |
| Backend tests | `pytest` | **NOT RUN** (no backend code touched) |

**Browser checks:** the only rendering done was of the **existing, unmodified `/tools`**, with
GET-only fixtures (writes aborted; two analytics POSTs were blocked, none reached a server), against the
user's dev server on `localhost:3000`, at 1440, 820, 390 and 320 px. These are "before" evidence of the
standard being copied (screenshots in the scratchpad `shots\tools-before\`), **not verification of any
redesigned page.** Authenticated rendering of AppShell routes (needs the Supabase fake-session pattern
in `scripts/verify-maintenance.mjs` + `/api/**` fixtures) has not been attempted.

---

## 5. Failures and unverified claims — read before trusting anything above

1. **Contrast ratios in `tokens.css` comments are estimates, not computed.** The comments claim ink
   13.9:1, muted 5.3:1, subtle 4.6:1, focus ring 4.4:1, control border 3.1:1. I did not run a contrast
   calculator. I changed `--mo-line-control` from `#8a9a93` to `#87978f` on an estimate. **Compute all
   of them (surface, raised, canvas, action-soft backgrounds) before shipping.**
2. **Tailwind features assumed but not exercised:** `pointer-coarse:` variant (added in Tailwind 4.1;
   installed 4.1.17), `has-[…]:` variant, `inert` attribute on a `div` (React 19), `animate-in`/`fade-in-0`/
   `slide-in-from-*` from `tw-animate-css`, opacity modifiers such as `bg-surface/92`, and the custom
   `@utility focus-ring`/`touch-target`/`tabular`. Any may need adjusting once CSS is actually imported.
3. **`tailwind-merge` extension** (`cn.ts`) is untested; verify `cn('text-body text-ink')` keeps both.
4. **Radix `--radix-popover-trigger-width` with `Popover.Anchor`** (used by `DestinationSearch`) is assumed
   to resolve to the anchor width; unverified.
5. **`Dialog.onInteractOutside` allow-list** (selectors for nested Select/Menu/cmdk portals) is a guess.
6. **`Select` empty-value sentinel** (`__mo_empty__`) and Radix `position="popper"` sizing are unrendered.
7. **`useViewPreference` key scheme** (`myoffice_view_<module>`) is new and does not read the existing
   per-module view preferences; migrating a page must carry its current stored key/values over.
8. **The agent inventory is mostly missing.** Workflow `wf_626b3d7e-205` hit a five-hour session limit
   (HTTP 429, resets 08:50 SAST) at ~04:21: 13 of 14 agents failed (8 instantly with 0 tool calls, 5
   mid-work). My resume at 08:52 relaunched 6 agents, duplicating g01 and g02 (replay stops at the first
   failed agent), and was cut off by the session ending. Usable: **g02** (cached result + JSON) and **g01**
   JSON, which I checked: all 9 expected routes present, no truncated fields (empty only where genuinely
   none), line counts include sibling modules. **g01/g02 findings are agent claims — spot-check against code
   when migrating.** Agents g03–g10 and x1–x4 produced nothing. The Workflow tool is currently switched off.
9. The old Tools `AnimatedSelect`/`ToolsUI` behaviours I intend to preserve (single-open popover event,
   viewport collision, focus return to a still-connected opener, `/` focus shortcut, destination ranking in
   `toolsSearch.ts`/`fuzzySearch.ts`) are only partially replicated and not tested in the new components.
10. **Session usage:** the harness's token counter read ≈14.99M of 15M remaining, but that is not the
    five-hour plan window that was exhausted earlier; I cannot see the plan window. Treat budget as unknown.

---

## 6. Git status (read-only snapshot at checkpoint)

- **frontend** (`C:\Users\Administrator\Documents\studio\myoffice\frontend`): HEAD `1c699f8`
  *feat: use regular-weight sidebar icons without secondary infills*. **91 modified, 15 untracked entries
  (106 total)**. Versus session start (91 / 14 / 105) the only difference is the new untracked directory
  `components/ui-system/`; `eslint.config.mjs` was already modified. Pre-existing uncommitted work
  (Tools polish, Timesheets payroll/approval work, shared `design-system` edits, docs, rollout docs) is
  untouched and **must not be reset, stashed or overwritten**.
- **backend** (`…\myoffice\backend`): HEAD `d2e0e2a` *feat: enforce tools eligibility and overtime cost
  centres*. 1 modified: `docs/NEC_TIMESHEET_RULES.md` (pre-existing, doc only).
- **Nothing committed. Nothing pushed.** The workspace root is not a Git repository.
- Interrupted tool call: the last call (a read-only `awk` over page wrappers) left no edit; the
  modified-file scan found nothing outside `components/ui-system/` except `eslint.config.mjs` and a
  git-ignored `tsconfig.tsbuildinfo`.

---

## 7. Measured baseline (scripted scan, 56 routes, 51,226 route-owned lines)

Totals: `${t.*}` theme-token interpolations **4,414** (in 106 files using `useTheme`); design-branch
checks **410**; `GlowCard` **49**; `PrimaryButton` **122**; `CenterModal` **73** (39 files) + `useConfirm`
users 23; hand-rolled `fixed inset-0` overlays **18**; hex literals **1,072**; violet/accent references
**915**; raw `text-xs/sm/[Npx]` **2,212**; native `<select>` 4; raw `authFetch`/`useModuleData` 11; swallowed
`catch {}` 6; `.oz-*` classes 164; 129 files import the design-system barrel. Zero direct
`@phosphor-icons/react` imports remain outside the icon layers.

| Route | Lines | `${t.*}` tokens | design branches | GlowCard | PrimaryButton | CenterModal | hand-rolled modal | hex literals | hover-lift/pulse |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| `/` | 1005 | 72 | 0 | 0 | 2 | 1 | 0 | 163 | 1 |
| `/admin` | 393 | 24 | 11 | 0 | 0 | 1 | 0 | 3 | 0 |
| `/admin/lists` | 215 | 9 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/artisan-timesheets` | 2046 | 42 | 0 | 0 | 3 | 2 | 0 | 0 | 0 |
| `/auth/callback` | 86 | 0 | 0 | 0 | 0 | 0 | 2 | 5 | 1 |
| `/auth/set-password` | 74 | 0 | 0 | 0 | 1 | 0 | 2 | 4 | 0 |
| `/av` | 964 | 88 | 2 | 0 | 2 | 3 | 0 | 36 | 0 |
| `/availabilities` | 777 | 101 | 1 | 0 | 2 | 2 | 0 | 7 | 0 |
| `/availability` | 443 | 71 | 1 | 0 | 1 | 0 | 0 | 17 | 0 |
| `/breakdowns` | 1220 | 160 | 15 | 1 | 6 | 3 | 0 | 28 | 0 |
| `/breakdowns/analytics` | 1877 | 83 | 1 | 0 | 0 | 0 | 0 | 78 | 0 |
| `/competency` | 249 | 32 | 1 | 0 | 0 | 0 | 1 | 8 | 0 |
| `/compliance-register` | 182 | 25 | 2 | 0 | 2 | 0 | 0 | 6 | 0 |
| `/compressors` | 1136 | 158 | 1 | 2 | 6 | 2 | 0 | 25 | 0 |
| `/condition-monitoring` | 215 | 25 | 1 | 0 | 2 | 0 | 0 | 8 | 0 |
| `/contractors` | 351 | 29 | 1 | 0 | 2 | 0 | 0 | 9 | 0 |
| `/documents` | 1192 | 132 | 7 | 3 | 7 | 5 | 2 | 9 | 1 |
| `/drivers` | 657 | 37 | 2 | 0 | 2 | 1 | 0 | 4 | 0 |
| `/employees` | 2145 | 91 | 14 | 0 | 3 | 3 | 0 | 0 | 0 |
| `/employees-preview` | 735 | 58 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `/engineering_report` | 419 | 63 | 1 | 0 | 0 | 0 | 1 | 24 | 0 |
| `/engineering-dashboard` | 307 | 31 | 1 | 0 | 0 | 0 | 0 | 16 | 0 |
| `/equipment` | 653 | 62 | 5 | 0 | 4 | 2 | 0 | 0 | 0 |
| `/inventory` | 501 | 38 | 2 | 0 | 3 | 0 | 0 | 2 | 0 |
| `/issues` | 1285 | 122 | 19 | 0 | 1 | 0 | 1 | 29 | 0 |
| `/job-cards` | 294 | 38 | 3 | 0 | 3 | 1 | 0 | 12 | 0 |
| `/leave-management` | 539 | 65 | 1 | 0 | 2 | 0 | 0 | 10 | 0 |
| `/leaves` | 1135 | 185 | 15 | 2 | 3 | 2 | 2 | 13 | 0 |
| `/login` | 51 | 3 | 1 | 0 | 0 | 0 | 2 | 2 | 0 |
| `/maintenance` | 1297 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 1 |
| `/near_miss` | 498 | 60 | 20 | 0 | 1 | 2 | 0 | 13 | 0 |
| `/noticeboard` | 848 | 62 | 3 | 1 | 3 | 2 | 0 | 25 | 0 |
| `/overtime` | 3265 | 303 | 34 | 9 | 4 | 4 | 0 | 44 | 2 |
| `/pachedu` | 929 | 186 | 18 | 1 | 3 | 3 | 3 | 27 | 0 |
| `/ppe` | 2677 | 257 | 47 | 3 | 8 | 3 | 0 | 39 | 1 |
| `/ppe/allocate` | 128 | 9 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/pto` | 841 | 113 | 2 | 1 | 3 | 3 | 0 | 42 | 0 |
| `/quotations` | 732 | 68 | 2 | 1 | 3 | 0 | 0 | 13 | 0 |
| `/reliability` | 225 | 21 | 1 | 0 | 0 | 0 | 0 | 10 | 0 |
| `/requisitions` | 820 | 96 | 2 | 0 | 4 | 3 | 0 | 12 | 0 |
| `/safety_complaints` | 731 | 86 | 21 | 0 | 1 | 2 | 0 | 35 | 0 |
| `/services` | 1178 | 149 | 1 | 1 | 6 | 6 | 0 | 13 | 0 |
| `/sheq` | 1211 | 0 | 23 | 0 | 0 | 0 | 0 | 47 | 0 |
| `/sheq_inspection` | 961 | 103 | 21 | 1 | 2 | 2 | 0 | 29 | 0 |
| `/shifts` | 1369 | 202 | 22 | 2 | 5 | 4 | 0 | 12 | 0 |
| `/sop-library` | 382 | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| `/spares` | 1232 | 265 | 28 | 2 | 4 | 1 | 1 | 7 | 0 |
| `/spares/import` | 564 | 51 | 1 | 0 | 2 | 0 | 1 | 1 | 0 |
| `/standby` | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/tasks-events` | 566 | 36 | 2 | 2 | 6 | 2 | 0 | 2 | 0 |
| `/timesheets` | 4341 | 149 | 18 | 0 | 1 | 1 | 0 | 24 | 0 |
| `/tools` | 2852 | 0 | 0 | 0 | 0 | 0 | 0 | 62 | 0 |
| `/training` | 510 | 72 | 1 | 0 | 1 | 2 | 0 | 31 | 0 |
| `/usage-analyzer` | 534 | 76 | 0 | 15 | 0 | 0 | 0 | 1 | 0 |
| `/vfl` | 666 | 95 | 19 | 1 | 3 | 3 | 0 | 37 | 0 |
| `/work_stoppage` | 717 | 109 | 13 | 1 | 3 | 2 | 0 | 22 | 0 |
| **Total** | **51226** | **4414** | **410** | **49** | **122** | **73** | **18** | **1072** | **7** |

Counts are regex measurements (review leads, not verdicts). `/tools` uses its own CSS module so shows 0
for token classes. Maintenance (`/maintenance`) already uses the Tools register language but imports
`../tools/tools.module.css`.

Shell findings (read directly): bottom bar has a hard-coded green "All systems operational"; notifications
exist in both top and bottom bars; appearance controls are split across a theme toggle, a Classic/Dallaglio
toggle, an icon-style toggle, Preferences, "Customize" and a bottom settings menu; the sidebar carries
"Recent Activity" (duplicates notifications), "Operations Snapshot" and "Tips & Shortcuts"; `AppShell`
wraps `main` in an inner scroll container; pages rely on `AppShell` for chrome only (most have no outer
width container, so a shared `PageContainer` can be introduced without double padding for those pages —
verify per page).

---

## 8. Resume plan (in order)

**R1 — repair what is written (small).** Fix the two `Nav.tsx` errors; export `shell/*` and
`useMediaQuery`; compute real contrast ratios for the token pairs and correct `tokens.css`; run
`npx tsc --noEmit`, `npx eslint components/ui-system`, `npx vitest run components/ui-system`.

**R2 — wire and prove the foundation before any page.** Do the §3 item 2–3 work, after the user
confirms D1 and D2. Build a reusable authenticated-render harness first (fake Supabase session + `/api/**`
fixtures, writes aborted; model: `scripts/verify-maintenance.mjs`, `scripts/verify-tools.mjs`) and save it
in `frontend/e2e/` or `scripts/`. Verify at 1440/820/390/320 px: shell, search keyboard path, Select,
Combobox, Dialog focus return, text-size 85–130% including portals, no `zoom`, reduced motion.
Run `npm run build` and `npm run test:smoke`. Port 3000 is the user's dev server (started from their
Cursor terminal); a second `next dev` on another port fails with a lock error — reuse 3000 or use
`next build && next start`.

**R3 — the one next small group of pages (only after R2 passes): "Register canary".**
`/contractors` (351 lines), `/competency` (249), `/compliance-register` (182) — three simple registers
(782 lines, 83 token interpolations combined, no dialogs-heavy flows, no payroll). Migrate each to
`PageHeader` + `Toolbar` (`SearchField`, `Select`, `ViewToggle`) + `DataRegion` + `RecordCard`/`DataTable`
+ `Dialog` forms, using the existing `useXData` hooks and `api.*` unchanged (they already use
`api.*` / hooks: `useContractorsData`, `useCompetencyData`; `/compliance-register` check). Preserve
validation, permissions and exports. After the group: `tsc`, `eslint` on touched paths, focused tests,
`npm run build`, rendered desktop + 390 px checks with fixtures, and a short report (changed, tests,
pages rendered, remaining issues, usage). Then continue: dashboard canary `/reliability`, form/dialog
canary `/ppe/allocate`, dense-grid canary (`/artisan-timesheets` before `/timesheets`), then Tools
migration, then the remaining groups by family (the scan table above gives the order by size/risk),
keeping `/overtime`, `/timesheets`, `/maintenance`, `/breakdowns` for last with their existing tests.

---

## 9. Working notes learned this session

- Use the `Write` tool for files with quotes/`$` in them; a long bash heredoc failed on quoting.
- On Windows the shell cwd resets between calls; use absolute paths.
- `git add` warnings about LF→CRLF are expected here.
- Repo guidance still describes the old system as current (`design-system/README.md` describes violet
  `GlowCard` glow/lift as canon; `AGENTS.md` points to it). These stay until the final guidance rewrite.
- Do not run agents or workflows unless the user asks again; Workflow is currently disabled.

---

## Update: milestone 1 (foundation repair), 2026-10-03

**Milestone workflow (user decision):** (1) repair/test the unwired foundation, (2) wire and browser-verify the shell, (3) register canary, (4) remaining routes in small groups, (5) site-wide integration checks. Never mark a page complete from a code change alone.

**Done and verified this milestone**
- `shell/Nav.tsx` type errors fixed. `isIconMeaning()` added to `foundations/Icon.tsx` and exported; `Nav` and `DestinationSearch` (results may now carry a glyph component) use it.
- `index.ts` now exports `shell/*`, `useMediaQuery`, `DESKTOP_QUERY`.
- Contrast computed by script (WCAG formula) from `tokens.css`: every text/status/control pair passes. The old comments understated them; corrected (ink 14.7, ink-muted 8.4, ink-subtle 7.3, line-control 6.5, focus 4.4, lowest text pair neutral-on-soft 4.73). Decorative `line` on surface is 2.87 (borders only).
- `tsc --noEmit` exit 0; focused eslint (ui-system, new shell files, notification hooks) 0 errors; vitest on ui-system + app-shell + design-system: 11 files, 77 tests pass.

**Parked, not verified: shell wiring attempted before the milestone instruction arrived**
- Written but NOT wired, never rendered: `components/app-shell/ShellSidebar|ShellTopBar|ShellBrand|ShellFeedback|ShellNotifications|ShellSettings|AccountMenu.tsx`. They type-check and lint clean only.
- The wired versions of `AppShell.tsx`, `app/globals.css`, `app/layout.tsx`, `components/Providers.tsx`, `design-system/tokens.tsx` were saved to the scratchpad (`scratchpad/wired/`) and the live files were restored to their pre-edit state (backups in `scratchpad/backup/`). They are identical to what the user had. Scratchpad may not persist; the design of that wiring is: import tokens/theme/base CSS after the legacy imports in globals.css, drop legacy `--font-sans`/`--radius-*` theme entries and the legacy body/heading rules, fonts as classes on `<html>`, APPEARANCE_BOOTSTRAP + light-only pre-paint script, AppearanceProvider/TooltipProvider/ConfirmProvider in Providers, legacy ThemeProvider forced to light + dallaglio, legacy font/zoom providers made inert, `AppShell` with a `migrated` prop (non-migrated content keeps CSS zoom on its own subtree), `AppFrame contained` prop.
- Kept (small, backward-compatible, tsc-checked): `failed` flags on `useDashboardData` (`activityFailed`), `useOperationalAlerts`, `useNoticeAlerts`, `useNotifications`, so the new bell can report a failed source instead of an empty list. Existing hook tests pass.
- Also added `contained` prop to `AppFrame` (default true).

**Still open:** D1 (retire dark mode) and D2 (remove bottom bar) confirmed by the user's latest brief ("one appearance, no light/dark switch", "remove the old bottom bar") — treat as decided. Sidebar drops "Recent activity / Operations snapshot / Tips" (decision to confirm). First-run preferences auto-open is dropped in the new shell (confirm). Nothing has been rendered in a browser. Next milestone: 2 (wire + browser-verify the shell at 1440/820/390/320, then build).

**Decisions confirmed by the user (2026-10-03):** the new sidebar drops "Recent activity", "Operations snapshot" and "Tips"; the first-run preferences popup is not carried over. D1 (one appearance, no light/dark switch) and D2 (remove the bottom bar) are decided. Open decisions: none. Next: milestone 2.

---

## Update: milestone 2 (shell wired and browser-verified), 2026-10-03

**Wired (live files, all type-checked):** `app/globals.css` (imports ui-system tokens/theme/base after the legacy imports; legacy `--font-sans`, `--radius-*`, body/heading rules removed; `--font-active` bridged to `--mo-font-body`), `app/layout.tsx` (fonts on `<html>`, light-only pre-paint script + `APPEARANCE_BOOTSTRAP`, Montserrat/Sora dropped, themeColor `#f4f6f5`), `components/Providers.tsx` (AppearanceProvider, TooltipProvider, ui-system ConfirmProvider), `design-system/tokens.tsx` (legacy ThemeProvider forced light + dallaglio; legacy font provider and CSS zoom made inert), `components/app-shell/AppShell.tsx` (rebuilt from `ui-system`; `migrated` prop; non-migrated content keeps CSS zoom on its own subtree only), `ui-system/shell/Nav.tsx` (`min-w-0` fix so long group labels no longer clip the count/chevron).
**Server-component rule found by rendering:** `app/layout.tsx` must import `APPEARANCE_BOOTSTRAP` from `@/components/ui-system/appearance/appearance` (pure module). Importing the barrel from a server component crashes (`createContext` via the icon layer). Documented here; add to the README.
**Deleted (after replacements worked; copies in scratchpad `removed/`):** `TopNavigation.tsx`, `SidebarNavigation.tsx`, `BottomBar.tsx` (and its hard-coded "All systems operational"), `PreferencesPanel.tsx`; barrel exports removed. Legacy `AuthForm` stays in `AuthMenu.tsx` (used by /login and hosted in the new sign-in dialog until /login migrates).

**Evidence (real, run against the user's dev server on :3000, fixture session, mocked /api, `scripts/verify-shell.mjs`):**
- `/contractors`: ALL CHECKS PASSED at 1440/820/390/320: top bar renders, no horizontal scroll, single light appearance, no CSS zoom on `<html>`, no fixed bottom bar, Feedback + notifications + settings visible in the top bar, UI typeface applied, document scrolls. Interaction: first Tab stop is the skip link; settings dialog opens; text size 130% scales shell text via `--mo-text-scale` and persists to `myoffice_appearance_v1` and survives reload; Escape closes settings; phone drawer opens/closes with Escape; feedback and notifications popovers open; destination search lists results. 0 browser console/page errors.
- Legacy routes inside the new shell (`/`, `/maintenance`, `/timesheets`, `/employees`, `/leaves`): render, 0 console errors; only failure is `/` at 320 px (36 px horizontal overflow from the home page's own content).
- Screenshots reviewed by eye: shell at 1440, drawer and search (after animations settle), settings dialog, legacy timesheets and maintenance pages. Screens are under `node_modules/.cache/mo-audit/shots*`.
- `tsc --noEmit` 0; eslint on ui-system + app-shell + layout/providers/tokens 0 errors; vitest ui-system + app-shell + shared: 14 files, 117 tests pass.

**Not done / known issues**
- `next build` NOT run: the user's dev server shares `.next`; run it when the dev server is stopped.
- Home hero still has its own hard-coded "All systems operational" (`app/page.tsx:552`), and `/` overflows at 320 px: both belong to the home route migration.
- Legacy pages with their own `sticky top-0` headers (e.g. `/maintenance`) now sit under the shell's sticky top bar; revisit when each migrates.
- Not yet checked: real-account flows (sign-in dialog, security/2FA dialog, sign-out), hover/active states in a real browser, reduced-motion, dark OS preference, real data in notifications.
- Test harness is `scripts/verify-shell.mjs` (`MSYS_NO_PATHCONV=1 node scripts/verify-shell.mjs --base http://localhost:3000 --routes /contractors,... --out <dir>`); do not press keys before hydration.
- Migrated routes: none yet (the shell is shared; `/contractors`, `/competency`, `/compliance-register` still use legacy page bodies).

**Next milestone 3:** register canary: migrate `/contractors`, then `/competency`, `/compliance-register` onto ui-system (`AppShell migrated`), preserving data behaviour; verify each with the harness plus a data-state fixture (loading, error + retry, empty, rows).

**Build (added after milestone 2):** with the dev server stopped (user authorised stopping PID 18684 on :3000), `next build` completed and prerendered all routes including `/login`, `/tools`, `/maintenance`, `/timesheets`. The dev server on :3000 is no longer running; restart it with `npm run dev` when needed (it will need to recompile after the build).

---

## Update: milestone 3 (register canary), 2026-10-03

**Migrated and browser-verified (fixture session, mocked API, `scripts/verify-registers.mjs`, plus `scripts/verify-shell.mjs` at 1440/820/390/320):**
`/contractors`, `/competency`, `/compliance-register`. Each: rows, empty, failed load (+ Try again), the page's interactions, 390 px no sideways scroll, 0 console errors. Screens reviewed by eye under `node_modules/.cache/mo-audit/shots-registers`.

**Real defects found and fixed during the migration (not just restyling)**
- `/contractors` and `/competency` hooks swallowed fetch errors, so a failed load showed an empty register; now `DataRegion` states (error + retry, 401/403 as "no access").
- `/contractors`: a failed create silently closed the form and discarded input; now the dialog stays open with the server message and the typed values.
- `/competency`: a failed skill save was ignored but the cell still changed; now nothing changes and a toast says it failed. **Data bug:** saves matched/created rows by the first row's primary key instead of `employee_id`, so editing an employee who already had rows created a phantom employee row. `Employee` now carries `employeeId`; verified the POST sends `employee_id: 'E7'`. The Department filter could never match (department was a copy of trade) and was removed.
- `/compliance-register`: a failed create threw an unhandled rejection with no message; load/error replaced the whole page including its header; now inline.
- Legacy `dallaglio/palette.css` forced every heading to weight 350 in the inherited font and beat the utility classes; headings with the shared `.font-display` class are now exempt (legacy pages unchanged).
- `PredictiveInput` set `aria-label` = placeholder even when given an external label id; fixed (label binding verified).

**Shared pieces added/changed:** `Segmented`, `Rating`, `Progress` primitives; `Toolbar` no longer forces its first child to grow; `DownloadButton` presentation rebuilt on `Menu`/`Button` (export logic untouched; 5 existing tests pass; this re-skins every page's Download button); `scripts/lib/fixtures.mjs`, `scripts/verify-registers.mjs`.

**Interim items to retire later:** `PredictiveInput` (legacy, hosted inside new dialogs; rebuild as a ui-system `SuggestInput` with the first form-heavy group); legacy `AuthForm`/`SecurityPanel` inside new dialogs; home hero's hard-coded "All systems operational".

**Route status (56 routes)**
- Migrated + verified: `/contractors`, `/competency`, `/compliance-register`.
- Shell only (new top bar/sidebar, legacy page body; renders without errors in the earlier check): `/`, `/maintenance`, `/timesheets`, `/employees`, `/leaves`. All other AppShell routes are on the new shell but have not been individually rendered.
- Own chrome, untouched: `/tools`, `/login`, `/auth/*`.
- Remaining legacy page bodies: all others (see §7 table).

**Next:** `/reliability` (dashboard canary), then `/ppe/allocate` (form/dialog canary), then small registers by size (`/condition-monitoring`, `/engineering-dashboard`, `/job-cards`, `/sop-library`, `/inventory`, `/drivers`, `/training`...). Dev server for review: http://localhost:3000.

---

## Update: group 2 (dashboards, registers, forms), 2026-10-03

**Migrated + browser-verified (`scripts/verify-routes.mjs` specs in `scripts/route-specs/`, plus `verify-shell.mjs` at 1440/820/390/320; 0 console errors):**
`/reliability`, `/condition-monitoring`, `/engineering-dashboard`, `/job-cards`. `/ppe/allocate` retired (see below). Earlier three registers re-verified after refactoring onto the new shared pieces.

**Fake data and dead controls removed (these were not styling issues)**
- `/reliability` fell back to a hard-coded equipment table, MTTR table and a fake "MTBF trend, last 6 months" chart whenever the fetch failed or returned nothing. Now every figure is derived from `/api/breakdowns` (`lib/reliability.ts`, 6 unit tests); a failed load is an error, no records is an honest empty state; the fake trend is replaced by real breakdowns per month. Charts have text alternatives.
- `/engineering-dashboard` showed literal KPIs (83% availability, 87% PM compliance, 94% lube compliance, 22 breakdowns, "Gold Mine Operations, June 2024"), a static availability trend and fleet-status pie. Rebuilt from `/api/job-cards?status=open` and `/api/breakdowns` only (open and overdue job cards, breakdowns this month, mean time to repair, six-month chart, repeat failures, open job cards). Availability %, PM and lube compliance and fleet status have no data source in MyOffice and are gone (add them back only when real data exists). The two sources fail independently.
- `/ppe/allocate`: orphan page (nothing links to it) whose "Create allocation" wrote to localStorage keys nothing reads, and whose PPE-item list read a key nothing writes. Replaced by a redirect to `/ppe` (PPE is issued there via `/api/ppe`). Original is in Git history.
- `/job-cards`: the primary "New job card" button had no action (removed); saving closed the dialog immediately and a failed update was lost; now the dialog stays open with the message and the typed edits.
- `/condition-monitoring`: a reading of `0` was stored as "no value"; fixed (blank is none, `0` is a reading).

**Shared pieces added/changed:** `FormDialog` (create/edit dialog: real form, pending, inline failure, keeps input, optional secondary action), `useApiList` (honest list loading), `ChartPanel` + `chartTheme` (token-based Recharts styling + text alternative), `SuggestField` (legacy PredictiveInput bound to a `Field`), `MetricGrid`/`MetricTile` now two-up on phones, `lib/reliability.ts`; the contractors, compliance and condition-monitoring hooks/dialogs use them. `verify-routes.mjs` gives every spec the same ready/empty/failed-load/create-flow/390px scenarios.

**Migrated + verified so far (7):** `/contractors`, `/competency`, `/compliance-register`, `/reliability`, `/condition-monitoring`, `/engineering-dashboard`, `/job-cards`. Retired redirect: `/ppe/allocate`.
**Interim items:** `PredictiveInput` (via `SuggestField`), legacy `AuthForm`/`SecurityPanel` in dialogs, `ApprovalGate` (legacy modal; the job-card dialog steps aside while it is open), home hero status text. `/job-cards` has no create flow (none existed).
**Next:** `/sop-library`, `/inventory`, `/drivers`, `/training`, `/quotations`, `/usage-analyzer`, then the mid-size registers. Dev server: http://localhost:3000.

---

## Update: group 3 (stock, training, SOPs), 2026-10-03

**Migrated + browser-verified (specs in `scripts/route-specs/`; all 12 specs and the 3 register scripts pass; shell checks at 4 widths):**
`/inventory`, `/training`, `/sop-library`. **Total migrated + verified: 10** (`/contractors`, `/competency`, `/compliance-register`, `/reliability`, `/condition-monitoring`, `/engineering-dashboard`, `/job-cards`, `/inventory`, `/training`, `/sop-library`); `/ppe/allocate` retired.

**Findings fixed (not just restyling)**
- `/inventory` was a browser-local demo seeded with invented items ("Industrial Circuit Boards"...), and its New item / View / Edit links pointed at routes that do not exist. The backend `inventory.py` is an in-memory mock that is not mounted. Now: no seeded data, a visible "Stored in this browser only" notice, working add/edit/delete dialogs (validation incl. duplicate SKU), storage errors surfaced. **Product decision needed:** connect it to a real inventory service, or retire/redirect it to `/spares` (the module card on the home page also carries invented numbers: 156 items, 1.2k, 8 low stock).
- `/sop-library`: a failed save closed the form and lost the input; a failed load showed an error banner and "No SOPs yet" together. The 13 in-card accordions became a viewer drawer (documented sections in order, "not yet documented" list, revision history); card actions are one menu.
- `/training`: required fields had no validation; save/delete failures went to a top banner; now field errors, inline failures, confirmation dialog for delete; honest per-source "unavailable" states kept.
- **Test-harness bug found:** the fixture profile was returned as an array, but `upsertProfile` asks PostgREST for one object, so the fixture user had no profile and every role check ran as "no role" (it hid the role-gated "New SOP" button). Fixed in `scripts/lib/fixtures.mjs`; all specs re-run with a real admin profile and pass.

**Shared pieces added:** `SopCard`/`SopViewer`/`SopFormDialog` (retired `SopFormModal`); `FormDialog` `secondaryAction`; `verify-routes.mjs` supports `storage` (localStorage fixtures).
**Interim items:** `AutofillInput`/`PredictiveInput` typeaheads (legacy, inside new dialogs); legacy `ApprovalGate`; home page hero status text and fake module-card metrics in `components/app-shell/modules.ts`.
**Next:** `/drivers`, `/quotations`, `/usage-analyzer`, `/admin/lists`, `/engineering_report`, then mid-size registers.

**Update (after session-limit resume): `/drivers` migrated + verified** (spec `scripts/route-specs/drivers.mjs` passes: cards by department, table, status/department filters, licence badges, tel links, add/edit/delete, failed load + retry, 390 px). **Migrated + verified total: 11** (`/contractors`, `/competency`, `/compliance-register`, `/reliability`, `/condition-monitoring`, `/engineering-dashboard`, `/job-cards`, `/inventory`, `/training`, `/sop-library`, `/drivers`). Fixed: a failed load used to show only a toast plus "No drivers found". The driver Excel/PDF exports moved unchanged to `app/drivers/exportDrivers.ts`; the hook uses `useApiList`.
Resume note: dev server on http://localhost:3000 is running (PID changes). Next: `/quotations`, `/usage-analyzer`, `/admin/lists`, `/engineering_report`.
**`/admin/lists` migrated + verified** (spec passes: tabs, add, rename with Enter, delete with confirmation, failed load + retry; access states are explicit messages instead of a blank page). `useApiList` now ignores superseded responses. **Total migrated + verified: 12.**
**`/engineering_report` migrated + verified** (spec passes incl. per-source failure, period change, "No data" for empty months; `lib/engineeringReport.ts` has 4 unit tests). Fixed: a failed source (breakdowns/job cards/production/compliance/lubrication) used to be counted as zero and shown as real figures; "PM compliance" was really work orders completed / raised and is now labelled that way; removed "Gold Mine Operations" and "run SQL migration" copy; "(MTD)" labels corrected for the selectable period. **Product input needed:** the report targets (breakdowns <= 20, MTTR <= 4 h, completion 90%, recovery 92%, 1900 t per record) are hard-coded policy numbers now in `REPORT_TARGETS` and printed on the report; confirm or replace them. **Total migrated + verified: 13.**
**`/usage-analyzer` migrated + verified** (spec: tiles, module scoping, feedback, text alternatives for charts and both heatmaps, manager-only "All users" source, clear with confirmation). Fixed: a failed cross-user load was followed by "No usage recorded yet" (failure disguised as empty); outdated copy pointed at the removed bottom bar; heatmap/chart colours now come from tokens. **Total migrated + verified: 14.**
**Parked, product decision needed: `/quotations`** (686 lines + `calcQuotations.ts` with tests). It is a local-only quotation generator whose built-in templates are invented web-development / consulting packages (USD, emoji icons) unrelated to mine engineering; history/clients are browser-local. Decide: keep as a generator (then replace the demo templates with real ones or none), connect it to real records, or retire it. Not migrated yet.
**Remaining routes (not yet migrated):** `/` (home; has the fake "All systems operational" and invented module-card metrics in `components/app-shell/modules.ts`), `/admin`, `/artisan-timesheets`, `/auth/callback`, `/auth/set-password`, `/av`, `/availabilities`, `/availability`, `/breakdowns`, `/breakdowns/analytics`, `/compressors`, `/documents`, `/employees`, `/employees-preview`, `/equipment`, `/issues`, `/leave-management`, `/leaves`, `/login`, `/maintenance`, `/near_miss`, `/noticeboard`, `/overtime`, `/pachedu`, `/ppe`, `/pto`, `/quotations`, `/requisitions`, `/safety_complaints`, `/services`, `/sheq`, `/sheq_inspection`, `/shifts`, `/spares`, `/spares/import`, `/tasks-events`, `/timesheets`, `/tools`, `/vfl`, `/work_stoppage` (+ `/standby` is a redirect). Migrated + verified: 14. Retired: `/ppe/allocate`.

## Milestone: Tools shell parity, touch, safe areas, PWA, home (3 Oct 2026)

**Covered earlier:** shell wired on every route; sidebar/top bar rebuilt to the Tools design; home migrated; PWA update path built.
**Changed in the parity gate:** sidebar width 236 to 216, header 34 px, tooltip 11 px, `--soft` colour, strip 57 px, drawer focus
return, left safe area, nav panel stretching, exact-820 px breakpoint (`min-[821px]`), settings icon is the spanner, manifests
re-coloured with stable ids, worker served with a build stamp.
**Touch (new):** `verify-shell-parity.mjs` emulates a touch device: controls at least 44x44, tap opens the drawer, drawer rows
at least 44 px, tapping a destination navigates and closes it, tapping the overlay closes it. It first failed (rows 40 px,
collapsed spotlight 28 px); fixed with `pointer-coarse:min-h-11` / `min-w-11` in `Nav.tsx` and `ShellSidebar.tsx`. Now passes.
**Remaining differences from /tools:** intentional MyOffice labels/modules; notification and feedback popovers exist only here.
**Not verified:** real devices, installed standalone windows. Details: [PWA_UPDATES.md](./PWA_UPDATES.md), [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md).

## Milestone: `/near_miss` migrated (3 Oct 2026)

- Page rebuilt on the UI system (header, section tiles as filters, search/date filters, sortable table, detail dialog, `FormDialog`, confirm on delete, `DownloadButton`). Spec: `scripts/route-specs/near-miss.mjs` (27 checks, all passed); inspected at 1440, 820, 390 and 320 px.
- Data: `useNearMissData` now uses `useApiList`; writes throw so the dialog shows the reason and keeps input (hook test rewritten). A failed load shows "could not be loaded", never the empty state.
- Dropped: inline row expansion (the detail dialog shows the same fields). Reporter and location now use datalists from the employee and lookup-list hooks.
- Shared fix found at 320 px: `MetricGrid` truncated labels in two columns; it is now one column below 360 px (all pages).
- Not verified: live data, real devices. `scripts/verify-near-miss.mjs` (old design, live CDP) is stale.

## Milestone: `/safety_complaints` migrated (3 Oct 2026)

- Rebuilt on the UI system: status tiles as filters, nine filters, sortable table, detail dialog, `FormDialog`, confirm on delete, `DownloadButton`, and a Records/Analytics tab pair. Spec `scripts/route-specs/safety-complaints.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Analytics: closure-rate bar, a Recharts monthly trend with a legend, and count distributions; each has a text alternative. Analytics and tiles still read the filtered list (existing behaviour kept).
- Data: `useApiList` for the list; writes throw so the dialog shows the reason and keeps input (hook test rewritten). Failed load never shows the empty state.
- Dropped: inline row expansion. Not verified: live data, real devices. `scripts/verify-safety-complaints.mjs` (old design, live CDP) is stale.

## Milestone: `/work_stoppage` migrated (3 Oct 2026)

- Rebuilt on the UI system: action-status tiles as filters, cards/table toggle, detail dialog with the corrective-action list, one scrolling `FormDialog` with a repeatable action section (per-field errors, progress line), confirm on delete, `DownloadButton`. Spec `scripts/route-specs/work-stoppage.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Dropped: the form's Details/Action plan/Summary tabs (errors could hide on another tab), inline row expansion and Expand/Collapse all.
- Kept: the unrecognised-section guard (now a spec case), `summarizeActions`, overdue rule, export columns.
- Data: `useApiList`; writes throw so the dialog shows the reason (hook test rewritten). Not verified: live data, real devices. `scripts/verify-work-stoppage.mjs` is stale.
- Spec files now use a named `spec` export (silences the anonymous-default lint warning in the three new specs; older specs still warn).

## Milestone: `/vfl` migrated (3 Oct 2026)

- Rebuilt on the UI system: status tiles as filters, behaviour filter with counts, cards/table toggle, detail dialog with optimistic status change (reverted and explained on failure; the open dialog reads from the list so it updates at once), one scrolling `FormDialog` with segmented choices replacing the radio groups and a repeatable action section. Spec `scripts/route-specs/vfl.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Defect found while migrating: on create the form showed a Status field that the save then overrode with `submitted`. It is now shown only when editing.
- Defect found by the 390 px check: three badges in the card's status slot overflowed; the card now shows only status there and section/behaviour as facts.
- Kept: bad-time, missing-technique and unrecognised-section guards (now spec cases), `summarizeActions`, export columns, `updated_at`/`submitted_at` stamps.
- Dropped: tabs in the form, Safe/Unsafe/Actions tiles (now a filter and a count line). Not verified: live data, real devices. `scripts/verify-vfl.mjs` is stale.

## Milestone: `/sheq_inspection` migrated (3 Oct 2026)

- Rebuilt on the UI system: cards/table, section and status filters, finding tiles (informational), detail dialog with findings, photos and sign-off, one scrolling `FormDialog` with repeatable findings. Spec `scripts/route-specs/sheq-inspection.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Interim bridge: photos still use the legacy `PhotoUpload` (listed in the ui-system README). Its upload path was not exercised (no storage endpoint in the fixture harness); only display and the form round trip were.
- Dropped: form tabs, inline row expansion, Expand/Collapse all. Kept: finding validation, completed-date rule, export columns, signature display.
- Data: `useApiList`; writes throw so the dialog shows the reason (hook test rewritten). Not verified: live data, real devices, uploads. `scripts/verify-sheq-inspection.mjs` is stale.

## Milestone: `/sheq` dashboard migrated (3 Oct 2026)

- Rebuilt on the UI system: period filter, KPI tiles linking to modules, six tabs (Overview, Weekly targets, Modules, Analytics, Analysis, Notes), `ChartPanel` charts with text alternatives, a shared `Distribution` bar list (extracted from `/safety_complaints` into `components/ui-system/patterns/Distribution.tsx`). Computation moved to `app/sheq/stats.ts` with unit tests (`stats.test.ts`, 9 cases). Spec `scripts/route-specs/sheq.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- **Fabricated data removed.** Near-miss records have no status or severity, yet the old page showed Resolved/Open donuts built from `Math.round(total * 0.7)` and `0.3` when counts were zero, and a near-miss "resolution" score that was always 100. Now only the section split is shown.
- **Score definition changed (needs owner confirmation, handoff section 9).** It averages only measures that have records, and an empty period shows "No score" instead of 100 "Good standing".
- Weekly targets and notes remain in `localStorage` and are labelled device-only. Notes now confirm before deleting.
- Shared fixes: `MetricTile` label and detail now wrap to two lines instead of truncating. Defect found: a Recharts `<Legend>` on a single-series chart stopped the bars drawing; removed here (the safety-complaints trend chart has a legend and draws, so it was left).
- Dropped: collapsible sections and Expand/Collapse all, the donut gauges (counts and bars replace them). Kept: auto-refresh every 5 minutes, alerts, range filter, AI analysis (mocked in the spec; the real service was not called).
- Not verified: live data, the real AI endpoint, real devices. `scripts/verify-sheq.mjs` is stale.

## Milestone: `/pto` migrated (3 Oct 2026)

- Rebuilt on the UI system, same pattern as `/vfl`: status tiles as filters, high-risk filter with a count, cards/table toggle, detail dialog with inline status change, one scrolling `FormDialog` (Yes/No segmented rows, shared checkboxes, repeatable actions with per-field errors). Spec `scripts/route-specs/pto.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Defect found while migrating: the form showed a Report status field on create that the save overrode with `submitted`; now shown only when editing.
- Robustness: the old page read nested groups (`reasons`, `timeOnJob`, `procedures`, ...) without guards in the detail view. A `normalise` step fills missing groups so a legacy record renders and edits (now a spec case).
- Dropped: form tabs, inline expansion. Kept: risk rule (any "No" flags it), `summarizeActions`, export columns, `updated_at`/`submitted_at` stamps, action numbering (`no` is renumbered on save).
- Not verified: live data, real devices.

## Defects found while migrating the SHEQ group: truncated lists and a wrong endpoint (3 Oct 2026)

Reading the routers (not the mocks) showed two problems that no route spec could catch:

1. **Silent truncation.** Near miss, VFL, PTO, work stoppage and Pachedu return 100 rows by default, safety complaints 200, `/get-breakdowns` 100 and production 30, unless `limit`/`offset` are passed. The pages called them plainly, so a register with more rows showed only the newest. Added `lib/paged.ts` (`getAllPages`, `unwrapRows`, 6 + 3 unit tests) and a `paged` / `pick` option on `useApiList`; applied to the five SHEQ list pages, the `/sheq` dashboard (which counted from a cut-off list, so every figure was understated), `/reliability`, `/engineering-dashboard` and `/engineering_report` (production too, since a report can cover any past month).
2. **Wrong endpoint.** `/reliability`, `/engineering-dashboard` and `/engineering_report` read `GET /api/breakdowns`, which returns an info object (`{ message, status, endpoints }`), not records. The original code did the same, and the reliability page quietly fell back to static demo data. The pages would show a load error live. They now read `/api/breakdowns/get-breakdowns` (response `{ data: [...] }`). Their specs had mocked the wrong path, so they passed. The specs now mock the real shape and keep the old path as a trap that returns the real info object.

Rule recorded in `ENGINEERING_STANDARDS.md` section 6. Not yet verified: either fix against real data. `/api/sheq/` (inspections) has no `limit` and depends on the database row cap of 1000.

## Milestone: `/pachedu` migrated, SHEQ group complete (3 Oct 2026)

- Rebuilt on the UI system like `/vfl` and `/pto`: status tiles as filters, high-risk filter with a count, cards/table toggle, detail dialog with inline status change, one scrolling `FormDialog` (checkbox groups for impacts and the four-category referral checklist, segmented behaviour choice, employee and department suggestions). Spec `scripts/route-specs/pachedu.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Data: paged list through `usePacheduData` (the old hook already paged by hand; it now uses the shared `getAllPages`). The page no longer calls `/api/pachedu/stats/overview`; tiles and the section split come from the full list, so a stats failure can no longer disagree with the register. The endpoint still exists on the backend.
- Defect found while migrating: Status field on create (overridden by `submitted`), now edit-only. Create, update and delete used to return null on failure and show a generic toast; they now throw and the dialog shows the reason.
- Not verified: live data, real devices. `PacheduStats` type removed with the stats call.
- SHEQ group (near miss, safety complaints, work stoppage, VFL, inspections, dashboard, PTO, Pachedu) is migrated: 23 of 56 routes.

## Milestone: `/requisitions` migrated (3 Oct 2026)

- Rebuilt on the UI system: status/priority tiles as filters, sortable table (cost sorts numerically), detail dialog with an item table, Requisitions/Analytics tabs, one scrolling `FormDialog` with repeatable items and a live total. Spec `scripts/route-specs/requisitions.mjs` passed (mock uses the backend's real snake_case shape); inspected at 1440, 820, 390 and 320 px. Kept `calcRequisitions.itemTotal`.
- Honesty fixes: a failed load no longer shows "No requisitions" (the old hook only toasted); `useApiList` reports it. The old page showed a lookup-failure message only through a toast; the equipment field now says so in place.
- The list route has no `limit`/`offset`, so it is not paged (database cap 1000). Delete is `manager`-only on the backend; the confirmation text says so and a refusal shows its message.
- Dropped: the collapsible filter panel (filters are always visible), the hand-rolled employee dropdown (datalist suggestions). Not verified: live data, real devices, the manager-only delete against a real non-manager account.

## Milestone: `/admin` migrated (3 Oct 2026)

- Rebuilt on the UI system: role tiles as filters, user table, a Manage dialog (role, deactivate, reactivate, reset password), invite dialog, role guide. Spec `scripts/route-specs/admin.mjs` passed (fixture admin session; no real account was changed); inspected at 1440, 820, 390 and 320 px. `scripts/verify-routes.mjs` now accepts `create.listPath` for a list that lives at a different path than the create endpoint.
- Permission rules preserved and covered by the spec: an admin cannot manage a super admin or their own account, is not offered Super Admin when changing a role, and is not offered Admin or Super Admin when inviting. Server-side enforcement is the backend's (`admin.py`); not exercised.
- Behaviour changes: role edits and the account controls moved from an inline expansion into a dialog; the role change refetches the list instead of patching it locally; failures show inside the dialog instead of only a toast; the user list is requested only after the caller is confirmed an admin.
- Not verified: live data, real devices, the backend's role checks.

## Milestone: `/noticeboard` migrated, active-notices popup fixed (3 Oct 2026)

- Rebuilt on the UI system: notices as cards (pinned section first) or a table, tiles as filters, a priority breakdown with a text alternative, server-side filters, detail dialog with attachments, one scrolling `FormDialog` with multi-file upload. Spec `scripts/route-specs/noticeboard.mjs` passed; inspected at 1440, 820, 390 and 320 px.
- Data: `useApiList` with the filters in the path and a debounced search (new `lib/useDebouncedValue.ts`, 2 tests). `getAllNotices` stays exported because the shell's notification bell reads it. Writes throw; a failed load is an error, not an empty board.
- Behaviour changes: Archive all expired and Unpin all now confirm first (they used to act on one click across many notices); pin toggles optimistically and reverts with the reason; the save waits for uploads. The old comment claimed the tiles ignored filters, but they were computed from the filtered list, so they now say "matching your filters" when one is active.
- **Shell defect found:** `ActiveNoticesPopup` (once per session, only when unread notices exist) was fixed at the top right, over the page header's actions on desktop and over the top bar and page title on a phone, and still used the retired theme. Rebuilt on the UI system, placed at the bottom (full width on phones, capped at 40% of the height), header on its own surface. Its test now finds the dismiss button by name (`Dismiss <title>`).
- Harness: `verify-routes.mjs` records each call's query string and accepts `create.before(page)` for per-route setup.
- Not verified: live data, real devices, a real storage upload.

### Milestone: fine-linen audit and first refinement
- Full gates before the pass: tsc clean, eslint 0 errors, every route spec, 103 files / 716 tests.
- `scripts/linen-audit.mjs` captures nine pages at three sizes and measures type, icon alignment, contrast and text-spacing breakage. Before and after are in `docs/linen/`.
- Findings: migrated pages are already consistent (no contrast or icon misalignment, no horizontal scroll under 1.4.12 spacing). Changes: balanced heading wraps, pretty paragraph wraps, tabular table figures, caption tracking, and legacy 350-weight headings raised to 500. Decisions are in `components/ui-system/README.md`.
- Not verified: installed PWA and real touch devices; the Tools reference page is behind its own sign-in in this harness.

### Milestone: /compressors
- Rewritten on the UI system: page, `useCompressorsData` (register through `useApiList`; stats, services, metrics, trends, comparison and summary as independent sections with their own error), `ReadingCard`, `ServicesTab`, `AnalyticsTab`, `ManagementTab`, `dialogs`, `SectionView`, `meta`. Spec `scripts/route-specs/compressors.mjs`.
- Defects fixed: (1) the previous readings were loaded once and never reloaded when the day changed; (2) a failed per-compressor history was swallowed, which skipped the checks against the previous totals; it is now stated on the card and the daily figures are left blank; (3) every analytics failure was shown as "no data"; (4) the cards were components defined inside the page's render, remounting on every change; (5) loaded hours were silently clamped while typing, now a field error explains it; (6) the day used UTC (`toISOString`) and could be off by one late in the evening; (7) a missing total showed as 0.0 (now a dash).
- Behaviour kept: "Mark as done" still sets the running hours to the interval; it now confirms first (pending decision 5). The 100-row/paging question does not apply: the register route is unbounded and the per-compressor history is read per unit.
- Pure logic added to `calcCompressors.ts` with tests (`readingProblems`, `efficiencyTone`, `localDateString`); hook tests replaced (7). The pre-existing cosmetic `transition-all` edit in the old page was replaced along with the page.
- Not verified: live data, the real history route's response shape (the backend sorts with `asc=True`, which may not behave as expected against the live client), CSV import with a real file.

### Milestone: /availability
- Rewritten on the UI system. New shared `lib/useApiResource.ts` (single-object counterpart of `useApiList`, 4 tests). Spec `scripts/route-specs/availability.mjs`.
- Defects fixed: the hook fell back to eight invented machines and invented statistics whenever the backend failed (a failure looked like a healthy dashboard); a "Cost Impact" column priced downtime at an invented $250/hour; a placeholder "Chart integration point" box; "Last month" showed the lifetime figure (the backend returns the same number by design) and is now labelled for what it is; missing numbers showed as 0.
- Not verified: live data. Backend notes in pending decision 6.

### Milestone: /availabilities
- Rewritten on the UI system (`RecordDialog`, honest three-source hook, `mergeRecords` with tests, spec `scripts/route-specs/availabilities.mjs`).
- Defects fixed: all three fetches were `.catch(() => [])`, so a failure looked like an empty register; the by-month rows sorted alphabetically (Apr before Jan) and weeks across a year boundary mis-ordered, now chronological with tests; downtime above operating hours was silently clamped on save, now a field error (operating hours must also be above 0, since the stored percentage is derived from them); the breakdown prefill failure was silent, now stated; the records list was not in date order.
- Not verified: live data. The derived-records route is unbounded and the manual list relies on the 1000-row database cap (no `limit` parameter exists on either route).

### Milestone: /tasks-events (migration paused after this for the wireframe review)
- Rewritten on the UI system (`PeoplePicker`, dialogs, meta, honest hook; spec `scripts/route-specs/tasks-events.mjs`). Defects fixed: a failed load or comment load showed as an empty board/"No comments"; the list was fetched before the role was known; completing was not reverted on a refused change; items with no type were dropped from the type breakdown. The done button must not bubble to the row (it opened the details dialog).
- Per the owner's latest instruction, no further page bodies are migrated until the page-pattern architecture review below is recorded.

### Milestone: wireframe and typography architecture review
- Inventory: 51 routes rendered at 1440, 820 and 390 px with structure read from the DOM (`scripts/wireframe-audit.mjs`, contact sheets from `scripts/contact-sheets.mjs`); before in `docs/wireframes/before/`, after in `docs/wireframes/after/`.
- Documents: `docs/PAGE_PATTERNS.md` (eight page patterns, six overlay patterns, responsive rules, typography review: pairing kept), `docs/WIREFRAME_LEDGER.md` (generated from `docs/wireframe-ledger.json`, generator `scripts/wireframe-ledger.mjs`).
- Evidence-driven shared changes: phone toolbar (the first record had been more than a screen below the filters on every register), ruled `PageHeader`, phone tile row and tablet columns, `RecordCard` status wrapping (the SOP title had been squeezed to one letter per line).
- Honest gaps: overlays not yet reviewed per route; legacy routes not yet rebuilt; tablet spot-checked only; `/requisitions` request-number cells wrap on a phone (nowrap needed).

### Owner decisions applied (4 Oct 2026)
- `/av` and `/leave-management` replaced by redirects (to `/availabilities` and `/leaves`), their entries removed from the navigation, the old page files, types and hooks deleted; `/availability` linked as "Availability Overview". The two old pages had small uncommitted cosmetic edits (transition tweaks); those went with the files. `/employees-preview` stays until `/employees` is rebuilt.

### Milestone: overlay review of the migrated routes (4 Oct 2026)
- `scripts/overlay-audit.mjs` opens each route's create dialog, first-record detail, manage/edit/confirm dialogs and Download menu at 1440 and 390 px and measures fit, focus, Escape and action reachability; screenshots in `docs/overlays/before/`. Result: every overlay fits both sizes, takes focus and closes on Escape; the topmost overlay is inspected when a confirmation sits over a dialog.
- Fixed: compressor status dialog options (a four-way segmented control wrapped on a phone) now a 2x2 grid with icons; requisition number cells no longer wrap.
- Recorded `overlaysReviewed` per route in `docs/wireframe-ledger.json`. Dashboards and report pages have no overlays to open.

### Milestone: /spares/import (workflow pattern)
- Rebuilt on the UI system: three visible steps, a real column mapping with Select and confidence in words, mode as a radio group, a confirmation before the bulk write, honest failure panels. Pure rules in `app/spares/import/extract.ts` with 8 tests; spec `scripts/route-specs/spares-import.mjs`.
- Defects: (1) update mode reset every existing part's stock on hand, limits, priority and supplier to defaults (backend update used the full model; frontend also sent explicit defaults), fixed in both repos with tests; (2) a blank price was sent as 0 and would have overwritten the stored price; (3) a decimal comma ("12,50") was read as 1250; (4) failures were only a toast.
- Not verified: a real spreadsheet, live data, the backend against the live database.

### Milestone: /issues (workflow pattern)
- Rebuilt on the UI system: record form first (`IssueForm`), log and analytics in tabs (`AnalyticsPanel`), exports moved to `exportIssues.ts`, honest three-source hook (`useIssuesData`, 2 tests), pure analytics in `analytics.ts` (9 tests); spec `scripts/route-specs/issues.mjs`.
- Defects: the log was requested with `limit=2000` but one request returns at most 1000 rows, so a long log was cut silently (now every page is read); a quantity of 0 was silently changed to 1 (now an error); the analytics buckets used UTC dates (now local); `issued_by` came from a legacy localStorage key (now the signed-in profile); failures were toasts only.
- SHARED COMPONENT DEFECT FOUND AND FIXED: every `Combobox` option rendered faded and unclickable, because `optionRow` used `data-[disabled]` and cmdk always sets `data-disabled="true|false"` (so "false" still matched); Radix items use an empty attribute, so both forms are matched now (`surfaces.ts`). Combobox options with a description now show it under the label (it squeezed a short code to one letter) and the popup is at least 18rem wide.
- Not verified: live data; the Excel and PDF exports were moved unchanged and not re-run here.

### Milestone: /leaves (register pattern)
- Rebuilt on the UI system: `LeaveForm`, `LeaveDetails`, pure rules in `leaveLogic.ts` (10 tests), honest `useLeaves` (30 s visibility-aware polling that no longer replaces the list with a spinner), spec `scripts/route-specs/leaves.mjs`. Unused legacy cards, breakdown panels and the stray "Studio.code-workspace" in the folder were left alone (the workspace file is tracked; I briefly staged its removal by mistake and restored the index).
- Defects: a failed load toasted and showed an empty register (the fetch swallowed errors); the 30-second poll set `loading` and replaced the whole list with a spinner each time; the date filter required a leave to start AND end inside the range (now overlap); "on leave now" used the UTC date; an unrecognised status crashed the employee summary (`undefined++`); delete and status failures were toasts that left dialogs closed.
- SHARED: `ApprovalGate` (used by job cards, leaves, overtime, PPE, shifts) was a hand-built modal with no dialog role, no focus trap and no Escape; rebuilt on `Dialog`. It stays open with the reason if the approval fails.
- Not verified: a real signed approval, live data.

### Milestone: /equipment (register pattern)
- Rebuilt: `EquipmentFormDialog` (four labelled sections, replacing the legacy `components/EquipmentForm.tsx`, now deleted), pure rules in `equipmentLogic.ts` (6 tests), spec `scripts/route-specs/equipment.mjs`. The list is read with `useApiList` (a failed load is an error), the shared `Pagination` is used for the first time.
- Defects: a failed load or save was a banner that left an empty register; the form turned the date through `Date`-free slicing correctly but nothing validated the ID/name until submit and the error was the only feedback; delete is manager-only on the server, so its refusal is shown with the reason.
- SHARED: `FormDialog` scrolls a new save failure into view (in a long form the notice was scrolled off the top).
- Not verified: live data; the list route is unbounded and relies on the 1000-row database cap.

### Milestone: /shifts (planning grid pattern)
- Rebuilt in pieces: `shiftMeta.ts`, `cellLogic.ts` (what a schedule cell says and why, 7 tests), `ScheduleGrid`, `EventDialog`, `AssignDialog`, `ShiftDetail`, honest hook (`useShiftsData`, 2 tests), spec `scripts/route-specs/shifts.mjs`. The Shift Patterns and Roster mini-panels were dropped (the list and a pattern filter with counts replace them); eight tiles became five.
- Defects: "On in Nd" and "Next on" showed the cycle percentage as a number of days (`daysUntilNextOn` was a second name for `cycleProgress`); now real days following the cycle and events, with 3 tests; a legacy record with no cycle printed "on, off" and "100%"; failures of the leave register were an easily-missed line of text; timing blocks and standby periods accepted an end before the start; the schedule cells used colour with tiny 7 px captions (now abbreviations at readable size plus a key and tooltips).
- Not verified: live data. The employee id stored by the form is the database id (as before), while leaves use the employee code; the schedule matches leaves by id or name.

### Milestone: /documents (hub pattern)
- Rebuilt in pieces: `categories.ts` (the seven ISO 55001 clauses and their built-in folders), `documentLogic.ts` (file typing, sizes, folder merge, filters and sort, 11 tests), `useDocumentsData.ts` (honest reads on `useApiList`, writes that throw), `HomeView`, `CategoryView`, `FileBrowser`, `UploadDialog`, `PreviewDialog`, `NameDialog`, spec `scripts/route-specs/documents.mjs`. `useApiList` gained an `enabled` option and now resets when its path changes (5 tests), so one folder's files are never shown under another.
- Defects: files uploaded at a category's top level were saved but never listed anywhere; bulk delete ran with no confirmation; the folder-delete text promised to delete the files inside, but the server deletes only the folder row (the files stay, orphaned), so deleting is now refused while the folder holds files; search silently stopped at 100 results and now says so; a failed load of files, folders or search is an error with a retry, not an empty list; the upload dialog claimed drag and drop but had none; a half-successful upload now keeps the refused files with their reasons and removes the accepted ones.
- Decisions: bulk selection is table-only (as on leaves). Delete is manager-only on the server, so a refusal shows the server's reason. There is still no way to move a file between folders (the server has no endpoint).
- Not verified: live data, real storage uploads and public file links, the Excel export after the move.

### Milestone: /services (register pattern, staged approvals)
- Rebuilt in pieces: `meta.ts`, `serviceLogic.ts` (progress, filters, sort, stage drafts, 10 tests), `extract.ts` (spreadsheet rows and OCR fields to records, 6 tests), honest hooks (`useServices`, `useAttachments`), `ServiceForm`, `PipelineEditor`, `ServiceDetail`, `AttachmentsPanel`, `ImportDialog`, spec `scripts/route-specs/services.mjs`. Import and Scan were two overlapping dialogs (the import dialog already accepted scans); they are one.
- Defects: each approval stage auto-saved on a 1.2 s timer with no revert, so closing the page inside that second lost the change, and a failure left the screen showing a state the server did not have; now each stage saves with an explicit button, needs a name and date to be marked complete, and reopening asks first. A failed attachment load showed "No attachments yet". Bulk import swallowed every failed row and reported only a count; now each refused row is listed with its reason and only those stay for a retry. The sheet view's own "Eng. Mgr" header was not understood by the importer, so a round trip dropped that column. "This month" parsed dates as UTC. Delete is manager-only and the refusal said only "Delete failed". The list endpoint was cut at 1000 rows by the database default and is now paged (backend, uncommitted, not deployed; 48 services tests pass in the project venv). A scan with no date found used to leave the date empty silently or be replaced by today's; it stays empty for the person to fill.
- Decisions pending for the owner: stage approvals are a typed name and a date, not an authenticated signature (unlike the signature gate on leaves and overtime); the amount is free text (so it cannot be totalled); both are as before.
- Not verified: live data, real OCR (needs the optional OCR libraries), real storage uploads, Excel files from the real tracker.

### Milestone: /overtime (register pattern, three tabs)
- Rebuilt in pieces (the 2789-line page is now about 200 lines): `overtimeMeta.ts`, `overtimeLogic.ts` (hours, filters, summaries, duplicate slots, the insight tallies and the weekly view model, 17 tests), `OvertimeForm`, `BulkOvertimeForm`, `EmployeePicks`, `OvertimeDetail`, `WeeklySummary` with `exportWeeklySummary.ts`, and `insights/` (`InsightsView`, `OverviewTab`, `AnalyticsTab`, `PatternsTab`, `CausesTab`, `Heatmap`, `CategoryTable`, `TopPeople`, `AnalysisGate`), spec `scripts/route-specs/overtime.mjs`. New shared pieces: `ShiftTimeRange` (start and end with the person's quick shifts) and `RecentChoices` (recently typed reasons, sharing the older PredictiveInput's stored history); `useApiList` gained a `fetcher` option, so the register keeps its 20 s timeout and one retry.
- Defects: the table's Hours column ignored hours entered directly, so hours-only requests showed a dash while the detail and the totals counted them (one `recordHours` now); the card showed "undefined to undefined" for them; editing a request from hours to times (or the reverse) left the old value stored, and stored hours win over times everywhere, so the request kept the wrong duration (the edit now clears the other pair, 2 tests); the form let a request without an employee ID or position through only for the server to refuse it with a bare error (now required with a reason on the field); an old type the form no longer offers (emergency, project, night) showed an empty select when editing; bulk entry swallowed every refusal and reported only counts (now each refused person is named with the reason and only they stay for a retry); delete had no error handling; the analysis is announced and re-run with a visible state, and a failed re-run keeps the last result; the heatmap, category table and charts are now operable by keyboard and each chart has a written summary; spares cost showed "R" (rand) where the app uses dollars, now formatted like the rest.
- Dropped on purpose: the "Quick stats" panel that repeated the header tiles, and the pie charts for type and status (replaced by labelled count lists that always print the numbers).
- Pending for the owner: the weekly summary excludes people by hard-coded role words and names in `calcOvertime.ts` (managers, trainees, foremen, hoist drivers and a list of named people); that is a business rule living in code, so confirm it or move it to data. Changing an approved, paid or rejected request needs a manager on the server; the form now says so.
- Not verified: live data, a real signature capture, the real analysis output, the Excel workbook opened in Excel.

### Milestone: /maintenance (register pattern, three tabs, three-step detail)
- Rebuilt in pieces: `meta.ts`, `helpers.ts` (overdue, stats, filter and sort, durations, schedule rules, analytics filters and the payload builders, 18 tests), `phrases.ts` (completions for typed report text, 4 tests), `WorkOrderForm`, `MachinePicker`, `WorkOrderDetail` with `ArtisanReportForm`, `ForemanSignoff` and `PhraseField`, `ScheduleForm`, `SchedulesView`, `AnalyticsView`, honest hooks (`useMaintenanceData`), spec `scripts/route-specs/maintenance.mjs`. The legacy `components/maintenance/*` (five files), the page's own stylesheet and its render test are deleted. New shared pieces: `SparesEditor` (also now used by the overtime form), `PersonInput`.
- Backend: the work-order list was a plain select, so the register silently lost every work order after the first 1,000 (the database default). It now pages (`backend/app/routers/maintenance.py`, test added, 22 tests pass in the project venv; uncommitted, not deployed).
- Defects: the foreman tab kept the status and progress it was opened with, so a foreman saving a comment after the artisan had set "completed" wrote the old status back (both forms now restart from the saved order); emptying the spares list was never saved (an empty list was left out of the request, so the old spares stayed for ever), nor was clearing a classification, discipline or trade (sent as undefined); delete had no error handling, so a refusal (delete is manager-only) closed the dialog and said nothing; creating a schedule closed the dialog before the save finished, so a refusal lost everything typed; "All active" included completed and cancelled work; the spares total was "R" in one place and "$" in another (now formatted like the rest); today's date came from UTC; a failed load of work orders, schedules or analytics each had its own ad-hoc message and a failed attachment-style silent path.
- Dropped on purpose: the inline row preview (the detail dialog replaces it), the "/" shortcut to focus the search, the ghost-text prediction in report fields (replaced by buttons that finish the word or phrase and a "recently used" list, which also work on touch).
- Not verified: live data, real signatures (they are typed names, as before), the work order numbering race (the server allocates the number, so the client's is only a placeholder), the stranded-browser-data upload, exports opened in Excel.

### Milestone: /employees (register pattern, section and trade groups) and /employees-preview retired
- Rebuilt in pieces: `roster.ts` (tenure, the section-and-trade grouping used by both the screen and the exports, filters, sort, counts, form validation; 10 tests), `EmployeeForm`, `EmployeeDetail`, `RosterGroups`, `RosterExportDialog` with `exportRoster.ts`, `NormalizeRosterDialog`, an honest `useRoster` hook (the 20 s limit kept), spec `scripts/route-specs/employees.mjs`. New shared piece: `TagField`. `/employees-preview` (the sandbox) is now a redirect, its entry is out of the navigation, and its components and duplicate grouping module are deleted.
- Defects: the four-tab form showed a field error only on its own tab, so submitting with a missing designation while on the Personal tab showed nothing; archived people could not be found by search at all (now a Show choice: active, archived, everyone); tenure ignored the day of the month (someone engaged on the 10th showed a month early until the 10th); the roster and registry exports and the clean-up had no failure path beyond a toast and the clean-up closed itself on a partial failure (it now stays open and says how many were updated and the first reason); delete had no explanation of the manager-only rule; the registry download was fire-and-forget.
- Kept on purpose: offence records are editable in the form but not displayed in the detail (as before; showing them is an owner decision).
- Not verified: live data, the real workbook and PDF opened in Excel and a PDF viewer, the clean-up against the live roster.

### Milestone: /spares (register pattern, requisition drawer)
- Rebuilt in pieces: `stock.ts` (stock level rule, filters, sort, counts, category breakdown, requisition totals and the saved and clipboard forms; 9 tests), `SpareForm`, `SpareDetail`, `CategoryPanel`, `RequisitionPanel` with `requisitionPdf.ts`, honest hooks (`useSparesRegister`, `useSavedRequisitions`, reusing the existing `api.ts` and its response-shape checks), spec `scripts/route-specs/spares.mjs`. The legacy page's 1,144 lines are replaced.
- Defects: favourites lived only in memory and vanished on reload (now saved in the browser); a failed load of the saved requisitions was swallowed (now an error with a retry); the same-name saved requisition was replaced only in the local copy, so the server collected duplicates (it now just adds); delete had a bare toast and a custom-categories list kept only in one browser (the categories in use now come from the register itself); the form's required-field errors were toasts rather than on the fields; stock level and quantities arrived as text for some rows and are made numeric in one place.
- Dropped on purpose: the cards grouped by category within each page of results (a page boundary cut groups in two; the category panel and filter replace it), the expandable card (the detail dialog replaces it).
- Not verified: live data, the PDF opened in a viewer, copy-to-clipboard in a real browser permission prompt.

### Milestone: /ppe (register pattern with tabs)
- Rebuilt in pieces: `ppeMeta.ts` (types, conditions, statuses), `ppeLogic.ts` (standing, grouping, filters, counts, due items, size counts, expiry rule, form problems; 11 tests), honest hooks (`usePPEData`, 4 tests), `PPEIssueForm`, `PPEItemViews` (employee and item detail), `DueItems`, `OrderListView`, `MatrixDialog`, `SummaryView`, spec `scripts/route-specs/ppe.mjs`. The legacy page's 1,862 lines and `OrderListPanel` are replaced; `useOrderList` and `calcPPE` are kept.
- Defects: a personnel-register row with no name blanked the name on that person's PPE records (it now falls back to the name on the record); tiles showed "0 people" while the records had failed to load; matrix rows changed height for a zero interval; the two downloads were both just "Download" (now captioned); the form let an unknown employee ID through silently (it now asks first).
- Not verified: live data, the Excel and PDF downloads opened in their apps, the matrix recalculation against the real backend (manager-only).
- Noted, not changed: the shared confirm dialog's title and label reset during its fade-out (it briefly reads "Confirm" with no title).

### Milestone: /breakdowns and /breakdowns/analytics (register pattern, shared insight views)
- Rebuilt in pieces: `breakdownMeta.ts`, `breakdownLogic.ts` (parts and cost, downtime, filters, sort, tile counts, the form and its payload; 14 tests), honest hooks (`useBreakdowns`, `useBreakdownInsights`, 5 tests), `BreakdownForm` (one scrolling form in four parts), `BreakdownDetail`, and `insights/` (`BreakdownInsights` with five views, `HourDayHeatmap`, `RankTable`, `InsightsPanel`; 7 tests), specs `breakdowns.mjs` and `breakdowns-analytics.mjs`. The legacy pages (981 and 1,675 lines) are replaced; the two analytics UIs now share one set of views. New shared piece: `components/shared/ListInput` (a text field that suggests a shared growing list).
- Defects: the nature of the breakdown was never saved (the payload left it out); the form called the machine ID optional and the server refused a blank one with a bare error (now required, with the reason, filled from the equipment register); a save failure was a toast over a closed form on the old tabs (the form is one page and shows the reason inline); the inline heatmap put seven day columns in a 24-column grid (tiny cells); parts stored as a JSON string cost nothing; the average resolution counted unfinished or untimed jobs as zero (now only finished ones with times, and "None yet" when there are none); a failed analytics load was a toast and a blank page; delete had no reason shown for the manager-only refusal.
- Pending owner decision: the Open tile filters the records only, because the analytics endpoint takes one status; the Analytics tab says so. Spare quantities are whole numbers (the server requires an integer of at least 1), so a fractional quantity is rounded.
- Not verified: live data, the Excel download opened in its app.

### Milestone: /quotations (document composer, browser-only)
- Rebuilt in pieces: `quotationLogic.ts` (blank draft, amounts, totals, what stops an export, reading stored drafts back; 17 tests), `exportQuotation.ts` (PDF with a table that breaks across pages, Word), `QuotationPreview`, `QuotationPanels`, spec `scripts/route-specs/quotations.mjs`. `calcQuotations.ts` is kept (now takes any `{ amount }` list) and `types.ts` is gone.
- Decision taken (the owner's open question): keep it as a generator with nothing pre-filled. Removed: the invented company (Elite Solutions), clients, quotation history and the web-development and consulting templates; the Send to Client button that only showed "sent" (nothing was sent), Save Template ("Saved!" saved nothing), Copy Link (copied text), and a Print that printed the whole app. Added: company details, the draft and saved quotations kept in this browser (so they survive a reload), clients offered from saved quotations, a logo on the document (PNG or JPEG, 300 KB), and a refusal that lists what is missing before an export.
- Defects: the PDF cut each description at 40 characters, could draw the totals box below the bottom of the page after a long list, and put the notes and terms at fixed offsets so a long note ran into the terms (now a wrapping table and flowing blocks that start a new page); the client's address was left off the PDF; the Word file used "
" inside a run, which Word ignores; quantities were forced to whole numbers; an export with no client or no lines was allowed.
- Not verified: the PDF and Word files opened in their apps (their text was read back, not their look), a logo of each type on the PDF.

### Milestone: /artisan-timesheets (the day grid, on the shared system)
- Rebuilt in pieces: `artisanLogic.ts` (who counts as an artisan, record to draft and back, opening a month, unsaved changes, what stops a save; 12 tests), honest hooks (`useStaff`, `useSavedTimesheets`, `useReference` that names any source that failed), `DayGrid` (the grid), `ArtisanEditor`, `SignatureField`, `CommentField`, spec `scripts/route-specs/artisan-timesheets.mjs`. The page's own five components are deleted. `calcTotals`, `autoPopulate`, `fillHours`, `dayStatus`, `shiftDay` and the exports are unchanged.
- Defects: any change to the list filters or a background reload rebuilt the open draft and threw away unsaved edits (an effect re-opened the month whenever the saved list changed); opening a month used the filtered saved list, so with a filter on, an existing month opened blank and then failed to save with a 409 (it is now read fresh for that artisan and month); a failed load of leave, overtime or standby became "no leave" and the page still announced "Updated from Leaves, Overtime, Standby" (each source now reports its own failure and the page says which); the hour inputs rewrote "1" to "1.00" under the cursor, so a decimal could hardly be typed (now typed as text, read once); a daily figure over 24 hours or below zero could be saved (refused with the day named); switching month discarded edits without asking (now a confirmation, plus a warning on leaving the page); delete used the browser confirm; copy-down worked by mouse only (Enter on the handle copies to the end of the month).
- Not verified: the signature pad and comment dialog driven in a browser, the Excel and PDF downloads opened in their apps, live data. The saved-timesheet list returns every row with its signatures (PNG data) in one response; that size was not measured and may need a summary mode on the backend list endpoint as saved timesheets accumulate.

### Milestone: /timesheets (the last legacy route; the roster grid on the shared system)
- Rebuilt in pieces around the user's untouched payroll logic: `timesheetMeta.ts` (statuses, periods, the role's normal shift, roster keys), `entryForm.ts` (the day dialog's rules as pure functions, 10 tests), `bulkAssign.ts` (bulk entry rules, 10 tests), `useTimesheetEditing.ts` (every write, with Undo; 2 tests), `exportTimesheet.ts` (the Excel and PDF code moved over unchanged), and the components `TimesheetGrid`, `TimesheetDayCell`, `TimesheetEmployeeCell`, `EntryDialog`, `BulkAssignDialog`, `AddEmployeesDialog`, `DownloadDialog`, and the scan-import panel. The 2,271-line page and its stylesheet are replaced. Untouched (the user's in-progress work, each with its own tests): `calcTotals`, `fillEntry`, `mergeEffectiveTimesheets`, `timesheetWritePayload`, `moduleApproval`, `retryTimesheetRead`, `useTimesheetsData` and `types`; `ModuleApprovalIndicator` keeps its accessible labels and tests and now uses the shared tokens.
- Defects: keyboard fill never applied (pressing Enter on the fill handle to apply it was read by the handle as "start a new fill", so the fill restarted and wrote nothing); period notes were read once, so moving to another period kept the previous period's notes and the next edit wrote them under the new period's key (the notes are now keyed by period); copying the previous period silently replaced entries already entered (it now says how many it replaces and asks); a work day could be saved with no times (and so zero hours); a failed bulk write or clear said only "failed" (it now gives the first reason); the dialog's hours followed the times through an effect (now pure functions with tests); delete confirmation was inline custom UI (now the shared confirm); Undo of a bulk write reported success even if some rows could not be restored.
- Decisions recorded, not changed: employee number PP288 is excluded from the automatic roster in code for everyone (it was, and is, hard-coded); a server outage on the page's reads is retried forever by design (the user's `retryTimesheetRead`), so the page shows "waiting for the server" rather than an error; Regular hours of 208 per person for NEC when nothing is absent is the payroll floor rule, so a roster of N people shows 208 x N regular hours before any entry.
- Not verified: live data, the PDF and Excel files opened in their apps, a real touch device for the fill handle (the pointer path is the user's `fillDrag`, unchanged).

## Overlay audit on the routes migrated on 4 Oct 2026
Run with `scripts/overlay-audit.mjs` (labels `after-migration` and `after-migration-extras`, screenshots in `docs/overlays/`), desktop 1440 and phone 390, for `/employees`, `/maintenance`, `/overtime`, `/services`, `/spares`, `/ppe`, `/breakdowns`, `/quotations`, `/artisan-timesheets` and `/timesheets`: every overlay found fits the screen, takes focus, has a name and a close control, and Escape closes it.
- Fixed because of it: the maintenance work-order detail kept "Save artisan report" and "Save foreman sign-off" at the end of a long scrolling form, off the screen (they are now a sticky bar at the bottom of the dialog body); on a phone `/timesheets` hid "Add employees" behind the Filters button (it now sits with the period controls); on a phone `/artisan-timesheets` froze three columns that took most of the width, so the comments column could not be tapped (the frozen columns now start off below 821 px).
- Reported as ACTION-OFFSCREEN but not defects: the PPE replacement matrix (every row has its own Save, there is no single submit; the audit picks the last row's) and the timesheets bulk dialog on a phone (the audit matches the "Add range" button, not the footer's Apply, which is in view).
- Not measurable by the audit: `/documents` (its category buttons are not reachable in the audit's fixture within its timeout; the route spec drives the new-folder, upload, preview and delete dialogs at desktop and its screenshots were inspected), `/quotations` and `/artisan-timesheets` have no create dialog (their other overlays were opened as extras).

### Home redesign (4 Oct 2026)
- Order is now: a greeting (the one `display` headline, with the date above it and Tips on demand), Quick actions as one row of compact buttons, "Operations today" as one panel of four live figures, then "All modules" with a category filter. Removed: the standing "Getting started" banner (tips are a popover), the Modules and Categories tiles (directory counts, now the subtitle of All modules), per-category collapse and Expand all (the filter replaces them), and the three icon buttons on every module card (one "more" menu holds favourite, quick action and quick view; a star shows beside a favourite's name). Select-several moved into the modules overflow menu.
- Sidebar: long group and module names (Core Management, Operations & Maintenance, Time & Attendance, Safety & Compliance, Third Party Services...) wrap to two lines with the full name as a tooltip, instead of ending in an ellipsis.
- Spec `home.mjs` rewritten for the new structure and passes (it also asserts that no sidebar label is cut off). Not verified: a real device.
- Revised the same day at the owner's request: Quick actions and the category chips are gone from the home page (the sidebar's Favourites and category groups already do both), and the greeting is replaced by a plain "Home" title with the date beneath. The shell's quick-action state and Customise panel still exist in `components/app-shell` but nothing on the home page uses them now; removing them is a separate decision.

### Milestone: signatures for every approval, sidebar text, top bar (4 Oct 2026)
- Maintenance artisan and foreman sign-offs and the six `/services` approval stages now use the signature step instead of a typed name; specs `maintenance.mjs` and `services.mjs` draw a signature and assert the saved image / signer name, dismissing the step sends nothing, and a refused save keeps the step open with the signature.
- Sidebar links, group headings and section labels are `text-ink` (black); the active item still shows by its tinted background. The top bar now has the Tools lines above and below, shadow and blur.
- Service stage signature images are kept in `services.stage_signatures` (migration applied live on 4 Oct 2026; spec `services.mjs` asserts the image is sent and shown). Not verified: signing a real stage against the live database, a real device.
