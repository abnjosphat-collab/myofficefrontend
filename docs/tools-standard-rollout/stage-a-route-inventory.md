# Stage A — Route Inventory

Date: 2026-10-02. Source: `frontend/app/**/page.tsx` (no `frontend/pages/` dir). All 56 page bodies opened; AppShell status verified per file, not by grep alone.

## Totals

- Routes: **56** (all `page.tsx`; zero `page.ts`)
- AppShell: **51 yes / 5 no** (no: `/auth/callback`, `/auth/set-password`, `/login`, `/standby`, `/tools`)
- Families: register 33, dashboard 10, grid 4, form 3, auth 3, documents 2, other 1
- Local CSS modules: only 3 routes (maintenance, timesheets, tools)

## Per-route table

Columns: route | page lines | AppShell (import line) | family | local CSS module.

| # | Route | Lines | AppShell | Family | Local CSS |
|---|-------|-------|----------|--------|-----------|
| 1 | `/` (`app/page.tsx`) | 775 | yes L19-22 `AppShell, useAppShell, … from '@/components/app-shell'` (multi-line) | dashboard | none |
| 2 | `/admin` | 356 | yes L8 `import { AppShell } from '@/components/app-shell';` | register | none |
| 3 | `/admin/lists` | 194 | yes L14 std | register | none |
| 4 | `/artisan-timesheets` | 445 | yes L4 std | grid | none |
| 5 | `/auth/callback` | 76 | **no** | auth | none |
| 6 | `/auth/set-password` | 61 | **no** | auth | none |
| 7 | `/av` | 621 | yes L9 std | dashboard | none |
| 8 | `/availabilities` | 549 | yes L14 std | dashboard | none |
| 9 | `/availability` | 319 | yes L11 std | dashboard | none |
| 10 | `/breakdowns` | 900 | yes L5 `from "@/components/app-shell"` (double quotes) | register | none |
| 11 | `/breakdowns/analytics` | 1624 | yes L4 std | dashboard | none |
| 12 | `/competency` | 177 | yes L5 std | grid | none |
| 13 | `/compliance-register` | 155 | yes L5 std | register | none |
| 14 | `/compressors` | 764 | yes L14 std | register | none |
| 15 | `/condition-monitoring` | 148 | yes L5 std | register | none |
| 16 | `/contractors` | 277 | yes L6 std | register | none |
| 17 | `/documents` | 913 | yes L4 std | documents | none |
| 18 | `/drivers` | 529 | yes L4 std | register | none |
| 19 | `/employees` | 1349 | yes L8 `from "@/components/app-shell"` (double quotes) | register | none |
| 20 | `/employees-preview` | 230 | yes L5 std | register | none |
| 21 | `/engineering-dashboard` | 189 | yes L4 std | dashboard | none |
| 22 | `/engineering_report` | 342 | yes L5 std | dashboard | none |
| 23 | `/equipment` | 528 | yes L4 std | register | none |
| 24 | `/inventory` | 395 | yes L4 std | register | none |
| 25 | `/issues` | 1046 | yes L4 std | register | none |
| 26 | `/job-cards` | 251 | yes L4 std | register | none |
| 27 | `/leave-management` | 468 | yes L11 std | register | none |
| 28 | `/leaves` | 858 | yes L4 std | register | none |
| 29 | `/login` | 44 | **no** | auth | none |
| 30 | `/maintenance` | 944 | yes L4 std | register | `maintenance.module.css` 6228 B / 241 lines (also imports shared `../tools/tools.module.css`) |
| 31 | `/near_miss` | 380 | yes L8 std | register | none |
| 32 | `/noticeboard` | 611 | yes L5 std | register | none |
| 33 | `/overtime` | 2597 | yes L6 std | register | none |
| 34 | `/pachedu` | 760 | yes L17 std | register | none |
| 35 | `/ppe` | 1730 | yes L16 std | register | none |
| 36 | `/ppe/allocate` | 112 | yes L8 std | form | none |
| 37 | `/pto` | 694 | yes L11 std | register | none |
| 38 | `/quotations` | 649 | yes L9 std | form | none |
| 39 | `/reliability` | 112 | yes L4 std | dashboard | none |
| 40 | `/requisitions` | 650 | yes L13 std | register | none |
| 41 | `/safety_complaints` | 567 | yes L12 std | register | none |
| 42 | `/services` | 916 | yes L13 std | register | none |
| 43 | `/sheq` | 1013 | yes L14 std | dashboard | none |
| 44 | `/sheq_inspection` | 799 | yes L19 std | register | none |
| 45 | `/shifts` | 1071 | yes L20 std | grid | none |
| 46 | `/sop-library` | 241 | yes L10 std | documents | none |
| 47 | `/spares` | 1060 | yes L4 std | register | none |
| 48 | `/spares/import` | 520 | yes L3 std | form | none |
| 49 | `/standby` | 4 | **no** (bare `redirect('/shifts')`) | other | none |
| 50 | `/tasks-events` | 433 | yes L13 std | register | none |
| 51 | `/timesheets` | 2106 | yes L19 std | grid | `timesheet-grid.module.css` 8571 B / 385 lines |
| 52 | `/tools` | 391 | **no** (standalone workspace, own `tools.module.css`) | register | `tools.module.css` 124653 B / 369 lines |
| 53 | `/training` | 385 | yes L10 std | register | none |
| 54 | `/usage-analyzer` | 499 | yes L9 std | dashboard | none |
| 55 | `/vfl` | 533 | yes L9 std | register | none |
| 56 | `/work_stoppage` | 593 | yes L11 std | register | none |

`std` = `import { AppShell } from '@/components/app-shell';`

## Git state (2026-10-02)

### frontend (`C:/Users/Administrator/Documents/studio/myoffice/frontend`)

Log (`-3`): `1c699f8 feat: use regular-weight sidebar icons without secondary infills` / `9113c20 feat: polish tools sidebar, dropdowns, overview and green accents` / `97c93bb Merge MuseOffice standalone work back into /tools`.

Uncommitted: 26 modified (+356/−146) + 10 untracked paths (all `??` under `app/timesheets/`, `docs/`).

- Tools (modified, 12 files): `app/tools/page.tsx`, `ToolsAuth`, `ToolsCompliance(.test)`, `ToolsFeedbackInbox`, `ToolsGatePasses`, `ToolsHomepage`, `ToolsPeople(.test)`, `ToolsSourceRegisters`, `ToolsUI`, `tools.module.css`, plus `scripts/verify-tools.mjs`. Small touch-ups (largest: `page.tsx` 38 lines, `ToolsCompliance.tsx` 29).
- Tools (untracked): `docs/tools-polish-2026-10-02/green-explore/`, `docs/tools-polish-2026-10-02/organize/`.
- Timesheets (modified, 10 files): `page.tsx`, `TimesheetDayCell`, `calcTotals`, `fillEntry`, `mergeEffectiveTimesheets`, `timesheetWritePayload(.test)`, `types`, `useTimesheetsData(.test)` (largest: test 118, hook 78 lines).
- Timesheets (untracked, 7 files): `ModuleApprovalIndicator(.test)`, `moduleApproval(.test)`, `nightRosterOvertime.ts`, `retryTimesheetRead(.test)`.
- Other: `docs/DALLAGLIO_AUDIT_2026-09-26.md`, `docs/NEC_TIMESHEET_RULES.md`, `vitest.setup.ts`, `docs/ZIMBABWE_MARKET_AND_PRICING_2026-10-02.md` (untracked).

### backend (`C:/Users/Administrator/Documents/studio/myoffice/backend`)

Log (`-3`): `d2e0e2a feat: enforce tools eligibility and overtime cost centres` / `2155ca4 docs: add backend documentation system` / `5d3de2d feat: add portable tools compliance controls`.

Uncommitted: 1 modified — `docs/NEC_TIMESHEET_RULES.md` (+12/−2, timesheet-rules doc touch-up). No code changes.
