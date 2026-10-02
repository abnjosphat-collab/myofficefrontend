# Muse Code handoff — Classic / Dallaglio + Timesheets

> **Historical only — superseded 1 October 2026.** Do not resume from this file
> alone. Use `MUSE_HANDOFF_2026-10-01.md` and
> `MUSE_PROMPTS_2026-10-01.md`, then reconcile them with the current Git state
> and `DALLAGLIO_AUDIT_2026-09-26.md`.

Written 25 Sep 2026 so the next agent can resume without re-discovering the architecture. **A module is complete only after rendered inspection.** This document is candid about what was source-fixed vs actually seen in a browser.

## 1. Objective and principles

MyOffice has two **independent** design languages. Light/dark is orthogonal.

| Design | Meaning | Do not |
|---|---|---|
| **Classic** | Original Studio glass (`design-system` parent files, `classic/`). Gradients, filled chips, tinted status pills stay when Classic is selected. | Do not “improve” Classic to look like Dallaglio. |
| **Dallaglio** | Tools-derived system (`design-system/dallaglio/`). Semantic tokens, thin Phosphor `light` icons, scan-first surfaces, contextual actions. | Do not implement as a CSS overlay on Classic. Do not copy `/tools` auth, analytics, or sidebar into AppShell. |

`/tools` stays isolated (`data-tools-workspace`, pathname force-Classic on `<html>`). Visualization is deleted. Work-order **statuses must not be renamed or added**. NEC payroll must not be re-derived in chat — read `frontend/docs/NEC_TIMESHEET_RULES.md` + `memory/MEMORY.md` (NEC section) before touching `calcTotals.ts` / fill / export.

Switch: `DESIGN_KEY = 'myoffice_design'` → `classic` \| `dallaglio` (migrates old `studio`/`paper`). Applied on `<html data-design>` before first paint.

## 2. Architecture

| Concern | Where |
|---|---|
| Selection + persist | `components/shared/design-system/shared/design.ts` |
| Dallaglio tokens / CSS | `dallaglio/palette.css`, `tokens.ts`, `ui.tsx`, `shell.module.css`, `controls.module.css` |
| Classic | parent `tokens.tsx` + `classic/icons.ts` |
| Icon registry | `shared/icon-meanings.ts` → `DsIcon` / `classic/icons.ts` / `dallaglio/icons.ts` |
| Shared controls | `Button.tsx`, `CloseButton.tsx`, `IconAction`, `StatTile`, `ViewToggle`, `PrimaryButton` (wrapper) |
| Facades | `primitives.tsx`, `components.tsx`, `@/components/shared/theme` barrel |
| Pre-paint | `app/layout.tsx` + ThemeProvider reads `document.documentElement.dataset.design` |

**Pages request meanings, not glyphs.** `Button` variants: `primary` \| `secondary` \| `subtle` \| `ghost` \| `danger` \| `icon`. Compact Add = `subtle` + `xs`. Dialog dismiss = `CloseButton`.

Timesheets Dallaglio grid (this session):

| File | Role |
|---|---|
| `app/timesheets/timesheet-grid.module.css` | Dallaglio-only cell/employee chrome. Classic does not import it. |
| `app/timesheets/TimesheetDayCell.tsx` | Classic branch = previous markup; Dallaglio = hours first, Off as muted text, actions on hover/focus/coarse pointer. |
| `app/timesheets/TimesheetEmployeeCell.tsx` | Dallaglio: “Remove from period” text (not a red X). Classic: previous red circle X. |
| `app/timesheets/timesheetCellDisplay.ts` | Display-only hours helper. **Not payroll.** |

Payroll / fill / persist unchanged: `calcTotals.ts`, `mergeEffectiveTimesheets.ts`, `fillEntry.ts`, `timesheetWritePayload.ts`, `fillDrag.ts`, `necModuleBatch.ts`.

## 3. Routes inspected vs still needing inspection

**Rendered in browser this session:** Timesheets grid/toolbar **not captured** (no running production server + login gate historically blocked `/employees` and `/tools` screenshots). Treat Timesheets as **source-complete, render-unverified**.

**Source-inspected and Dallaglio-migrated earlier (commit `df15837` and predecessors):** employees (StatTile/ViewToggle/IconAction), shared Button/CloseButton, many compact Add pills, dialog close X, login/AccessBoundary phosphor leak, AppShell chrome.

**Source-inspected this session (Timesheets only):** `/timesheets` grid, toolbar, period controls, entry/bulk/download/add-employee dialogs, NEC import panel.

**Still need rendered Dallaglio inspection (desktop + tablet + phone, light + dark):**

| Priority | Route | Why |
|---|---|---|
| 1 | `/timesheets` | New grid — empty / work / Off / leave / OT / weekend / holiday / today / selected / drag-fill |
| 2 | `/overtime` | Dense calendar grid + page-local Edit/Close chips (~2044+) |
| 3 | `/leaves`, `/leave-management`, `/pto` | Same family as timesheets |
| 4 | `/shifts`, `/artisan-timesheets` | Parallel attendance UIs |
| 5 | `/maintenance` | Already Tools-like; confirm no Classic leak |
| 6 | `/employees` | Icon registry claimed complete; confirm Add/close |
| 7 | Home `/`, `/equipment`, `/breakdowns`, `/spares`, `/ppe` | High-traffic registers |
| 8 | SHEQ / VFL / issues / handover / work_stoppage | Safety dialogs |
| 9 | `/admin`, `/documents`, `/contractors`, `/compliance-register` | Chrome leftovers |
| 10 | `/tools` | Must stay **unchanged** |

Nested/portal dialogs on those routes were **not** opened this session.

## 4. Findings (severity · route · path)

| Sev | Route | Finding | Path | Screenshot |
|---|---|---|---|---|
| High | `/timesheets` | Day cells always showed status + hours + OT + plus/X + drag corner; Off used `XCircle` + slate tint (looked like an error). | Was `page.tsx` ~1485–1604; now `TimesheetDayCell.tsx` | None (before). After: unverified. |
| High | `/timesheets` | Employee remove was a 28px red X; easy to confuse with “remove this day's entry”. | `TimesheetEmployeeCell.tsx` | Unverified |
| Med | `/timesheets` | Toolbar Refresh/Import/Download were Classic `chipBg` pills; dialogs used `bg-brand-600`. | `page.tsx` hero + dialogs; `necImport/NecScanImportPanel.tsx` | Unverified |
| Med | `/overtime` | Weekend-tinted calendar, bold brand hours, page-local Edit/Delete icon buttons. Same scan problem as old timesheets. | `app/overtime/page.tsx` ~2044–2343 | Not taken |
| Med | Many registers | Only Employees + Timesheets use `IconAction`. Other toolbars still pass raw icons / chip buttons. | `app/*/page.tsx` | Not taken |
| Low | `/timesheets` Classic | Off still uses `XCircle` in `STATUS_CFG` — **intentional** for Classic. | `page.tsx` `STATUS_CFG.off` | n/a |
| Low | Bulk assign calendar | Still page-local date chips / preview tints. Functional, not Tools-quiet. | `page.tsx` BulkAssignDialog | Not taken |

## 5. Changes completed and verified

**Code (this session, unpushed until commit):**

- Dallaglio timesheet cells: hours first; Off = muted “Off”; leave/absent use text not tinted pills; plus / entry-remove / fill handle appear on hover, `:focus-within`, and `@media (pointer: coarse)` (44px).
- Employee column: “Remove from period” vs cell “Remove this day's entry only”.
- Sticky header uses `--d-surface` / `--d-soft` in Dallaglio (avoids Classic white/`#040c18` leak).
- Day-header Layers icon hidden until hover in Dallaglio.
- Totals: no rainbow bold in Dallaglio.
- Toolbar: `IconAction` + `DsButton`; dialogs + NEC import use design-system `Button`.
- `dayCellHours` tests (display only).

**Verified:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass (after STATUS_CFG / `ZERO_HOUR_STATUSES` fixes) |
| `npx vitest run app/timesheets` | 6 files, **61 passed** |
| ESLint timesheets | (run this session — see §8) |
| `npx next build` | (run this session — see §8) |
| Browser light/dark / viewport / keyboard / reduced-motion | **Not done** |

**Not changed:** calc/fill/persist, work-order statuses, `/tools`, Classic visual branch.

## 6. WIP and exact next steps (importance order)

1. **Render-verify `/timesheets` in Dallaglio** — login, NEC + Salaried, light and dark, desktop then ~768 and ~390. Exercise empty cell, work, Off, leave, OT, weekend, holiday, today, drag-fill, keyboard fill (Enter/arrows/Esc), touch (actions must stay visible). Confirm sticky employee column and date header do not overlap. Capture screenshots into this folder or `frontend/docs/dallaglio-audit/`.
2. **Classic smoke** — switch design to Classic on the same grid. Cells must still look like the old 64px tinted pills + red X. If Classic drifted, fix the Classic branch in `TimesheetDayCell` / `TimesheetEmployeeCell` only.
3. **Overtime grid** — apply the same pattern: extract day cell, CSS module, hours-first, contextual actions. Do not change OT approval rules.
4. **Leaves / PTO / shifts** — same scan-first pass; reuse `Button` / `IconAction` / `CloseButton`.
5. **App-wide toolbar** — any remaining `chipBg` Refresh/Download/Add should become `IconAction` or `Button`. Trace to shared components; no page-local CSS pile-up.
6. **Dialog audit** — open CenterModal + shadcn Dialog on high-traffic pages; confirm `CloseButton` rotate/ring in Dallaglio.
7. **Then** tablet/phone and `prefers-reduced-motion` (fill-handle opacity transition already disabled).

Do **not** declare the redesign done after tokens or after Timesheets source-only.

## 7. Business rules and interactions to preserve

- NEC cycle **13th → 12th**. Salaried = calendar month.
- **Off ≠ Absent.** Off does not block the 208 Reg floor. Blank ≠ Off.
- **Actual / Reg / 1.5× / 2.0× / Standby / Night Allow** only from `calcEmployeeTotals`. Night allowance is **18:00–06:00** from shift times (+ module OT after end). **Not** shown as a day-cell glyph.
- Drag-fill: source = work day or Off; copies normal hours / Off; **does not copy OT**; `_auto: 'leave'` cells protected. Persist via `handleBulkSave` → `timesheetWritePayload` (strips `_auto`).
- Quick-add vs cell click vs fill-handle vs “Remove from period” vs “Remove this day's entry” must stay distinct.
- Leaves / Overtime modules remain authoritative; timesheet overlays are derived (`_auto` dot).
- Excel: 6 columns, OT 1.5× formula `MAX(0, Actual−208)+h1+h2+…`.

## 8. Test / build commands and results

From `frontend/`:

```bash
npx tsc --noEmit
npx vitest run app/timesheets
npx eslint app/timesheets --ext .ts,.tsx --max-warnings=0
npx next build
```

NEC payroll tests (re-run if you touch calc/fill/persist):

- `app/timesheets/calcTotals.test.ts`
- `mergeEffectiveTimesheets.test.ts`
- `fillEntry.test.ts`
- `timesheetWritePayload.test.ts`
- new: `TimesheetDayCell.test.ts` (display helper)

Backend (unchanged this session): `pytest -q` from `backend/` with `.venv`.

**Results (25 Sep 2026, this session):**

| Command | Result |
|---|---|
| `npx tsc --noEmit` | 0 |
| `npx vitest run app/timesheets` | 6 files, 61 passed |
| `npx eslint` on new grid TS/TSX | 0 (`--max-warnings=0`). Do not pass CSS files — ignored file = warning. `page.tsx` still exceeds `max-lines` (pre-existing). NEC import file-input a11y warnings pre-existing. |
| `npx next build` | 0 — 65 static routes |

Browser: `/timesheets` on the new build (`localhost:3001`) hit **MyOffice Access** login gate — no grid screenshot. Same gate blocked earlier Employee Register captures. Muse must use a real session.

## 9. Known defects, limitations, decisions needed

- **No Timesheets screenshots** in this handoff. Do not treat the grid as visually signed-off.
- AccessBoundary / login often blocks automated browser capture; use a real session.
- After `next build`, `next dev` can break (`@vercel/turbopack-next` font module). Prefer `next start` for screenshots, or kill stale turbopack first.
- Word-spacing in some screenshot compositor captures looked concatenated — product bug not confirmed.
- Bulk-assign calendar and day-header bulk Layers control are still denser than Tools. Decision: keep one-click bulk-day (hidden Layers until hover) vs a separate “bulk day” toolbar action.
- `STATUS_CFG.off` still uses `XCircle` for Classic StatusPill. Dallaglio cells do not use that icon.
- App-wide rendered audit was **not** completed. Overtime is the strongest remaining analogue of the Timesheets problem.
- Cursor subscription lapse: stop after this commit; Muse should start at §6 step 1.

## 10. Git

- **Repos:** `frontend/` and `backend/` are separate. Root is not a git repo.
- **Frontend remote:** `https://github.com/abnjosphat-collab/myofficefrontend.git`
- **Previous pushed HEAD:** `df15837` — “Give MyOffice a real Classic/Dallaglio split so pages inherit Tools-style buttons and close controls…”
- **This session:** Timesheets grid + this handoff. Commit locally when asked (this request includes commit; **do not push** unless the user says push).
- **Backend:** `origin/main` through `45aef8e`, expected clean.

## Muse: do this first

1. Read `frontend/docs/NEC_TIMESHEET_RULES.md` (do not rewrite payroll).
2. Start frontend (`npx next start` after build, or `npx next dev` if clean).
3. Log in, set design to **Dallaglio**, open `/timesheets`.
4. Walk the states in §6.1. Fix whatever the rendered grid still gets wrong in `TimesheetDayCell` / `timesheet-grid.module.css` — not with page-local overrides.
5. Only then move to Overtime.
