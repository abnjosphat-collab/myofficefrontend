# MyOffice NEC timesheets — context for ChatGPT → Cursor prompts

**Use this file:** Paste it (or the relevant sections) into ChatGPT when you want help drafting a prompt for **Cursor** about NEC timesheets. It reflects **implemented** behaviour as of **Sep 2026** (frontend **`42fa44d`**, backend **`45aef8e`** on `main`). **Agent memory:** `memory/MEMORY.md` (NEC section) + `.claude/skills/myoffice-conventions/SKILL.md` (NEC continuity).

**Authoritative rules (short):** `frontend/docs/NEC_TIMESHEET_RULES.md` (same content in `backend/docs/`).  
**Do not confuse with:** `app/artisan-timesheets/` — separate product surface for artisans, not NEC payroll grid.

---

## Workspace shape

- **Two git repos:** `frontend/` (Next.js), `backend/` (FastAPI). Parent folder `myoffice/` is **not** one repo.
- **Timesheet UI:** `frontend/app/timesheets/page.tsx` (large; exports, grid, download dialog).
- **Single totals source:** `frontend/app/timesheets/calcTotals.ts` → `calcEmployeeTotals()`. Grid, summaries, PDF/Excel must all use it — never duplicate 208-cap math in the page.

---

## Related modules (data flow)

| Module | Role |
|--------|------|
| **Timesheets** | Saved rows per employee/day; NEC vs salaried tabs; period **13th→12th** for NEC. |
| **Leaves** | Approved leave → overlay on grid via `mergeEffectiveTimesheets.ts` (8h normal; `_auto: 'leave'`). |
| **Overtime** | Approved OT → adds `overtime_hours` (1.5×) or `holiday_overtime_hours` (2.0×) on merge. |
| **Shifts / roster** | Standby allowance flags (8h per contiguous run in totals). |

**Merge policy:** Real saved timesheet row **wins** over overlay for normal hours. Approved OT per day is **authoritative SET** (sum deduped lines by `id`) — **never add** module OT onto existing row `overtime_hours` (double-count bug). Dedupe approved OT by `id` in merge. After merge, **`syncRosterNightFields`** aligns night display from shift times.

**Sep 2026 one-off:** `necModuleBatch.ts` includes unsigned/pending leave+OT for **2026-08-13…2026-09-12** NEC only — not global policy.

---

## Payroll totals (NEC) — must stay consistent

- **Actual** = sum of **normal** `regular_hours` (uncapped). Leave counts as 8h. Double-time days (`weekend` / `holiday` worked) → hours go to **2.0×**, not Actual normal sum.
- **Reg** = `min(Actual, 208)` **unless** NEC floor: no **Absent** day in period → **Reg = 208** even if Actual &lt; 208. **Off** rest days do **not** block the floor — only **Absent** does.
- **Normal excess** = `max(Actual − 208, 0)` → part of **1.5×**.
- **1.5×** = normal excess **+** sum of row `overtime_hours` (module OT at 1.5×). **No double-count** of excess on stored rows.
- **2.0×** = double-time day totals + `holiday_overtime_hours` on ordinary days.
- **Payable total** = Reg + 1.5× + 2.0× + night + standby + night allowance (Actual is **not** added again).
- **Night allowance** = 18:00–06:00 from **rostered shift** start/end (`rosterNightAllowanceHours` in `calcTotals.ts`), **including module `overtime_hours` + `holiday_overtime_hours` worked after recorded shift end** on that day (10h to 04:00 + 2h OT → 12h night allow.). Computed from times even if DB `nightshift_hours` is 0. **Callout** / breakdown → `callout_overtime_hours`, not night allowance. **UI:** show totals only in **Night Allow** column (not per-day cells).

Options: `calcEmployeeTotals(empId, timesheets, { periodDates, applyRegFloorWithoutAbsent: true })` for NEC tab.

---

## Grid UX (shipped)

- **Drag-fill** (normal / OFF): `fillEntry.ts`, `fillDrag.ts` → **`handleBulkSave`** → Supabase (`timesheetWritePayload.ts` strips `_auto`, syncs night; `resolveFillTargetEntry` uses saved rows first). Does not fill protected `_auto: 'leave'` cells. Copying from a night shift copies 18:00–06:00 allowance pattern onto empty days.
- Tooltips on **Reg** / **1.5×** explain floor and formula breakdown. **Night allow.** in header stat = sum of `nightAllowanceBonus`.

---

## Combined Excel export (NEC) — current design

- **Style:** B&W print-friendly; **Mine No** before name; leave cells **8h** + green fill; signature block; legend row; `fullCalcOnLoad`.
- **Total columns (6):** Actual h, Reg h, OT 1.5×, OT 2.0×, Standby h, Night Allow. h — **no separate “Added OT” column** (rejected).
- **OT 1.5× cell formula** (user must see it in Excel formula bar):

  `=MAX(0, ActualCol − 208) + h1 + h2 + …`

  - **MAX(0, …)** = only count hours **above 208** normal cap; never negative.
  - **+h1+h2+…** = one term **per approved 1.5× OT record** (chronological), built by `moduleOt15FormulaAddends()` in `calcTotals.ts`; any extra row OT on a day adds another term; HR can append manual `+2+1` in the bar.
  - Helpers: `excelOt15Formula()` in `frontend/lib/exportUtils.ts`.
  - Export passes **`approvedOvertime`** into `DownloadDialog` for the breakdown.

**Rejected approaches (do not re-introduce in prompts):**

- OT 1.5× = `Actual − Reg` in Excel (user wanted **208**, not Reg column).
- Separate **Added OT** column feeding the formula.

---

## Backend / API

- **Pagination:** `GET /api/timesheets` (and stats/import reads) use `fetch_all_pages` in `db_helpers.py` — PostgREST **1000-row cap** broke early NEC dates when sorted newest-first. Tests: `test_timesheets_pagination.py`.
- **Import:** `backend/scripts/nec_timesheet_import.py` (+ gitignored snapshots under `data/nec_import_snapshots/`). See `backend/docs/NEC_TIMESHEET_IMPORT.md`.

---

## Tests to cite in Cursor prompts

- `frontend/app/timesheets/calcTotals.test.ts` (incl. Reg floor, module OT addends).
- `frontend/app/timesheets/mergeEffectiveTimesheets.test.ts`, `fillEntry.test.ts`, `timesheetWritePayload.test.ts`.
- `backend/tests/test_timesheets_pagination.py`.

**Verify before “done”:** `npx tsc --noEmit`, `npx vitest run app/timesheets/calcTotals.test.ts` (frontend); `pytest -q` (backend).

---

## Known data / ops notes (Sep 2026 cycle)

- NEC period **13 Aug – 12 Sep 2026** import applied (~1161 rows); some blank normals / leave gaps documented in session memory.
- Dodzo 19 Aug sick leave may still be missing in Leaves module (historical note).
- Production UI needs **deployed backend** with pagination fix or grid looks truncated on dense periods.

---

## Prompt template for ChatGPT to give Cursor

When asking ChatGPT to write a Cursor prompt, include:

1. **Goal** — one sentence (bug, export tweak, new column rule, etc.).
2. **Scope** — NEC only or salaried too; combined Excel vs grid vs API.
3. **Constraints** — “Use `calcEmployeeTotals`; don’t add columns without approval”; “match NEC_TIMESHEET_RULES.md”.
4. **Acceptance** — e.g. “OT 1.5× formula still `MAX(0,Actual−208)+terms`; tests pass; tsc clean”.
5. **Push policy** — “commit only when I say” / “push both repos separately”.

**Example starter prompt for Cursor:**

> In MyOffice frontend (`app/timesheets/`), [goal]. Follow `docs/NEC_TIMESHEET_RULES.md` and `calcEmployeeTotals`. Reuse design-system + existing export helpers. Do not add an Added OT column. Excel OT 1.5× stays `MAX(0, Actual−208)` plus individual +terms from approved OT. Run `calcTotals.test.ts` and `tsc --noEmit`. Do not push unless I ask.

---

## File cheat sheet

| Concern | Path |
|---------|------|
| Totals / night allow / OT addends | `frontend/app/timesheets/calcTotals.ts` |
| API write payload + fill resolve | `frontend/app/timesheets/timesheetWritePayload.ts` |
| Leave/OT merge | `frontend/app/timesheets/mergeEffectiveTimesheets.ts` |
| Grid + Excel export | `frontend/app/timesheets/page.tsx` (`DownloadDialog`) |
| Excel formula helper | `frontend/lib/exportUtils.ts` |
| Sep 2026 batch | `frontend/app/timesheets/necModuleBatch.ts` |
| API list | `backend/app/routers/timesheets.py`, `db_helpers.fetch_all_pages` |
| Durable rules doc | `frontend/docs/NEC_TIMESHEET_RULES.md` |

---

## Scanned PDF import (in-app)

- **UI:** NEC tab → **Import scans** (`app/timesheets/necImport/`).
- **API:** `backend/app/routers/nec_timesheet_import.py` + `app/nec_import/*`.
- **Flow:** create job → upload PDF(s) → upload validated **review JSON** → preview → dry-run/apply.
- **Default extraction:** manual review JSON on server (`NEC_IMPORT_EXTRACTION_PROVIDER=manual_review_json`); vision provider pluggable later.
- **Apply logic:** shared with CLI `scripts/nec_timesheet_import.py` via `apply_runner.py` — does **not** duplicate `calcEmployeeTotals`.

## Changelog (high level)

| Area | Change |
|------|--------|
| Totals | Actual uncapped; Reg cap + NEC absent-only floor; 1.5× = excess@208 + module OT |
| Grid | Drag-fill persists to Supabase; merge OT SET not add; night allow from times + OT after end; column-only UI |
| API | Paginate timesheets past 1000 rows |
| Excel | B&W, signatures, Mine No; single OT 1.5× formula with per-OT +terms |
| Import | In-app NEC scan import jobs + preview/apply |
| Docs | NEC rules + this brief in `frontend/docs/` and `backend/docs/` |

Update this file when payroll rules or export behaviour changes.
