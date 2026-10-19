# Usability fix plan — October 2026 sweep (U1–U5)

Shared-level usability run on MyOffice ERP: every fix lands in a reusable
component, hook, lib module, or backend endpoint — never as a page patch.
Measure before/after, screenshots looked at, gates run before done.

Status: U1–U5 implemented and verified. This doc records root causes, changed
files, evidence, and remaining gaps.

## U1 — Overtime notes were typed but never saved

Root cause, three layers deep (any one of them drops the field silently):

1. `OvertimeCreate`/`OvertimeUpdate` never declared `notes`, so Pydantic's
   default `extra='ignore'` discarded it on every save.
2. `create_overtime` builds an explicit `data_to_insert` dict that listed
   every field except `notes`.
3. The `overtime` table has no `notes` column, so even a correct payload
   would fail at the database.

Changed (backend):

- `app/routers/overtime.py` — `notes: Optional[str]` on both models;
  `"notes": overtime.notes` in `data_to_insert`.
- `supabase_migration_overtime_notes.sql` (new) — `ALTER TABLE ... ADD
  COLUMN IF NOT EXISTS notes text`. Written, NOT run — apply before the
  backend deploys or inserts carrying notes fail.
- `tests/test_overtime_crud.py` — 4 tests (insert carries notes, `None`
  still sent, update round-trip, detail read-back).

Changed (frontend):

- `app/overtime/OvertimeDetail.tsx` — replaced a hand-made conditional
  notes box with an always-visible `<Fact label="Notes" wide>`, inheriting
  the shared "Not recorded" language.
- `app/overtime/OvertimeDetail.test.tsx` (new) — empty shows the shared
  missing-data text; saved notes render.

Verified: backend 43/43 in `test_overtime_crud.py` (37 + 6 bulk-edit, see
U3); `OvertimeDetail` 2/2; tsc 0; eslint clean; `/overtime` spec ALL CHECKS
PASSED; axe 0 violations; renders viewed
(`tmp/phase2-shots/ot-notes-filled@1440.png`, `ot-notes-empty@390.png`).

## U1-sweep — payload-vs-model audit, every router

Method: two AST scripts (`tmp/model-fields.mjs`, `tmp/sweep-diff.mjs`
list every Create/Update model's fields and diff each create/update
handler's explicit insert dict against them; every mismatch inspected in
source, then frontend payloads cross-checked for the payroll/safety modules.

Result: no other overtime-class bug. Every explicit-dict handler covers its
model (standby's conditional adds, requisitions' child-table items,
services' signature merge, near_miss's camel→lower mapping, the safety
family's snake_case maps, documents' guarded updates, compressors'
9-for-9). Frontend payloads match models in overtime, leaves, ppe,
breakdowns, services (38/38), notices, tasks-events, issues, shifts,
timesheets, and the safety family; `.dict()`/`CrudRouter` routers are
structurally safe.

Findings:

- Leaves: intentional drops, not bugs — `leaves.py` is headed
  "simplified, no department/manager". The frontend still renders a
  Department column that is therefore always empty (cosmetic dead UI,
  listed not fixed).
- No `extra='forbid'` anywhere: any future frontend/backend drift fails
  silent. Recommendation: forbid extras on Create/Update models (or a
  dev-mode drift warning). Only the new bulk-edit model (U3) forbids
  extras today.
- Unaudited at the frontend→model layer (dict layer verified safe):
  maintenance, spares, employees create/update, requisitions-update,
  artisan-timesheets, availabilities, contractors, compliance, competency,
  condition_monitoring, drivers, duty_roster, duty_rotations,
  failure_modes, handover, inventory, job_cards, lubrication, production,
  rotation_covers, sops, training, standby_rotations, signatures,
  saved_quotations, photos, admin, schedules, inventory restock.

## U2 — Bulk entry buried + one employee picker everywhere

Root causes: "Bulk entry" lived as the only item in a MoreMenu (a whole
overflow menu for one action); 20 call sites each hand-rolled an employee
Combobox with slightly different name/description/pick logic, including two
near-identical multi-pickers (`overtime/EmployeePicks`, a name-based
`tasks-events/PeoplePicker`).

Changed (shared):

- `components/ui-system/patterns/PeoplePicker.tsx` (new) —
  `lookupName` (one name rule), `useEmployeeOptions` (one option list),
  `PersonPicker` (single; caller owns the Field, fills its own form from
  the picked record; `employeeId` pins duplicate names, matching the
  personnel number or register row id), `PeoplePicker` (multi with chips,
  `single` filter mode).
- `components/ui-system/patterns/PeoplePicker.test.tsx` (new) — 6 tests.
- `components/ui-system/index.ts` — exports.

Changed (rollout): `app/overtime/page.tsx` (MoreMenu → visible secondary
"Bulk entry" button), `app/overtime/EmployeePicks.tsx` (re-export shim),
`app/tasks-events/PeoplePicker.tsx` (thin string[]↔picks adapter — its API
stores names), `LeaveForm`, `DutyDialog`, `CoverDialog` (×2),
`AssignDialog`, `OvertimeForm` (filler), `RotationDialog` (×2),
`ArtisanEditor` (×4 approvals, via `clearLabel`) → `PersonPicker`.
`scripts/route-specs/overtime.mjs` clicks the button, not the menu.

Not migrated (deliberate): `issues/IssueForm` datalist (free text plus
suggestions, a different pattern); filter dropdowns (near_miss, pachedu,
requisitions, sheq, vfl, work_stoppage, standby/shifts/overtime pages —
option lists, not pickers).

Verified: 240/240 tests across the 6 touched modules; tsc 0; eslint
clean; route specs ALL CHECKS PASSED for all 6; axe 0 serious/critical;
renders viewed (header button, bulk dialog, leave dialog at 1440 + 390).

## U3 — Overtime bulk edit with locks + select similar

Root cause: the register could approve/reject in bulk but fields could only
be fixed one record at a time; no bulk field endpoint existed.

Backend (`app/routers/overtime.py`, `tests/test_overtime_crud.py` +6):

- `POST /api/overtime/bulk-edit` — `{ids, patch}` over exactly 7 safe
  fields (date, type, planning, payout, cost centre, reason, notes).
  Identity, times, spares, and every lifecycle field are absent from the
  model, and `extra='forbid'` 422s a mistyped field instead of silently
  editing nothing. Locked statuses (approved/paid/rejected) are skipped
  for non-managers with per-record reasons, mirroring `update_overtime`'s
  F03 gate; managers edit everything. Empty patch → 422.

Shared (`components/ui-system/patterns/BulkEdit.tsx` + test, 5 tests):

- `useBulkEdit` + `BulkEditDialog` — every field starts locked; the patch
  carries only unlocked fields with a value; submitting locked or empty
  explains itself instead of wiping anything. `BulkEditLockedNotice`
  warns about decided records in the selection.

Overtime wiring: `OTBulkEditDialog.tsx` (new), `bulkEditOT` in
`useOvertimeData.ts`, `similarRecords` in `overtimeLogic.ts` (+2 tests:
same person + same day, personnel number preferred, name fallback, two
anonymous records never match), bulk bar gains Edit (and now shows in
cards view too when a selection exists), row action "Select similar"
(same person, same day, explicit toast), `select-similar` icon meaning.

Verified: backend 43/43; frontend 18/18 overtimeLogic, 5/5 BulkEdit; tsc
0; eslint clean; `/overtime` spec ALL CHECKS PASSED (covers locked-submit
message, unlock→select→apply, and asserts the POST carries only the
unlocked field); axe 0; renders viewed (locked dialog, grammar-fixed
notice, filled state, 390 stacking).

## U4 — Quiet net background (plates removed)

Root cause: two tilted glass `.plateA`/`.plateB` planes sat behind the
page header on every route — the "3D effect" lines the owner found too
pronounced. Grid/horizon were already gone (Phase 1.4).

Changed: `components/shared/floor/FloorBackdrop.tsx` (spans removed,
comment updated) and `floor.module.css` (`.plate*` rules removed). Net
(`MeshCanvas`), wash, ripple, and theme behaviour untouched; zero
references to the removed classes remain.

Proof: 6 routes × 2 widths captured before and after
(`tmp/phase2-shots/u4-<route>-{before,after}@{1440,390}.png`):
overtime, leaves, standby, shifts, tasks-events, artisan-timesheets.
Viewed before/after: overtime@1440 (plate behind header buttons gone),
standby@390 (lower plate gone, layout intact), artisan@1440 (both plates
gone — clearest pair). Remaining 9 pairs captured, not individually
viewed; removal is structural in the shared backdrop. tsc 0, eslint
clean.

## U5 — Planning Superintendent designation

Root cause: the role existed nowhere in the catalog, so the roster could
neither store it canonically nor offer it in the dropdown.

Changed (`lib/employeeCatalog.ts` + tests):

- `DESIGNATION_ORDER` += `'Planning Superintendent'` (appended; no
  order/index assertions exist to break).
- Aliases: `planning superintendant` (typo, per the `assistent`/
  `atendant` precedent), `superintendent planning` (reorder, per
  `assistant fitter`). Bare `superintendent` deliberately NOT aliased —
  too aggressive.
- Section map: Planning Superintendent → `Planning` (canonical section).
- `buildForemanOptions` includes superintendents (supervisor-level; the
  old substring check missed the word). `isForemanDesignation` untouched
  — a superintendent groups under its own name, not Foremen.

Tests: 5 new/extended cases in `lib/employeeCatalog.test.ts` (aliases,
standard, dropdown, section ×2, foreman options) — written first, watched
fail 5, then green. 45/45 across catalog + roster + normalize suites;
`/employees` spec ALL CHECKS PASSED; tsc 0; eslint clean.

Roster-corrections report (`tmp/roster-2026-10-16.json` snapshot, 92 rows
read-only; `tmp/roster-corrections-2026-10-16.{json,md}` via the real
`planRosterNormalization`, nothing applied): **0 proposed changes, 0
Planning Superintendent rows.** The roster is already normalized w.r.t.
every known rule, and nobody currently holds the role — the addition is
forward-looking. Observed but out of scope: non-standard values the engine
passes through by design (Hoist Driver ×18 already archived, Pump
Attendant ×4, Mechanical/Electrical Foreman, Truck Buster, Clerk,
Carpenter, Graduate Trainees, section Underground ×18) — mapping any of
those is a business decision, not taken here.

## Verification matrix (full, this run)

| Gate | Command | Result |
|---|---|---|
| Backend tests | `.venv/Scripts/python -m pytest -q` (TEMP redirected, see note) | 1810 passed, 0 failed |
| Typecheck | `npx tsc --noEmit` | 0 errors |
| Lint | `npx eslint` (full repo) | exit 0; warnings only, none in touched files |
| Frontend tests | `npx vitest run` | 709 passed; 2 files flaky under parallel load, both 15/15 green re-run alone (MonthBoard, ToolsCompliance — neither touched by this run) |
| Route specs | `node scripts/verify-routes.mjs` | ALL CHECKS PASSED, 48 routes |
| Build | `npm run build` | exit 0, full route table prerendered |
| Axe | `node scripts/a11y-routes.mjs` | 0 routes with serious/critical violations |
| Renders | drivers in `tmp/` | U1/U2/U3 dialogs, U4 6×2 before/after — all viewed |

Notes:

- Stock `pytest` shows 27 errors in `test_nec_timesheet_import_router.py`,
  all `PermissionError` on `C:\...\Temp\pytest-of-HP` (another user's stale
  temp dir) at fixture setup, before any app code runs. Pre-existing and
  environmental; with a writable `TEMP` the whole suite is 1810 green.
- The 2 vitest flakes happened while vitest, route specs, and eslint ran
  concurrently (pool worker starvation in the log). Re-ran alone: green.

## Remaining gaps (not taken)

1. ~~`supabase_migration_overtime_notes.sql` written, not run~~ — APPLIED
   2026-10-17 (HTTP 201) and read-back verified. Safe to deploy the backend.
2. `components/ui-system/README.md` should document the new `PeoplePicker`
   and `BulkEdit` patterns; the file has another session's dirty work, so
   it was left untouched.
3. Leaves Department column renders always-empty (backend drops it by
   design) — remove the column or store the value; owner's call.
4. `extra='forbid'` (or drift warnings) on the remaining Create/Update
   models; only the new bulk-edit model has it.
5. Frontend→model audit still open for the ~25 routers listed under
   U1-sweep; dict layer verified for all.
6. Issues `IssueForm` datalist and filter dropdowns not migrated to the
   shared picker (different patterns, listed deliberately).
7. Non-standard roster values outside the normalization engine's rules
   (Pump Attendant, Truck Buster, Clerk, Carpenter, trade Foremen,
   Graduate Trainees, Underground section) — mapping any is a business
   decision; see `tmp/roster-corrections-2026-10-16.md`.
8. U4: 9 of 12 after-shots captured but not individually viewed (removal
   is structural in the shared backdrop; 3 pairs viewed).
