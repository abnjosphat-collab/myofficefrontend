# MyOffice NEC timesheets — context for ChatGPT → Cursor prompts

**Use this file:** Paste it (or the relevant sections) into ChatGPT when you want help drafting a prompt for **Cursor** about NEC timesheets. It reflects **implemented** behaviour as of **Sep 2026** (frontend `d229738`, backend `3765806` on `main`).

**Authoritative rules (short):** [NEC_TIMESHEET_RULES.md](./NEC_TIMESHEET_RULES.md).  
**Do not confuse with:** `app/artisan-timesheets/` — separate product surface for artisans, not NEC payroll grid.

---

## Workspace shape

- **Two git repos:** this **frontend** repo and sibling **backend** (FastAPI). A local `myoffice/` folder may wrap both but is not one git root.
- **Timesheet UI:** `app/timesheets/page.tsx` (large; exports, grid, download dialog).
- **Single totals source:** `app/timesheets/calcTotals.ts` → `calcEmployeeTotals()`. Grid, summaries, PDF/Excel must all use it — never duplicate 208-cap math in the page.

---

## Related modules (data flow)

| Module | Role |
|--------|------|
| **Timesheets** | Saved rows per employee/day; NEC vs salaried tabs; period **13th→12th** for NEC. |
| **Leaves** | Approved leave → overlay on grid via `mergeEffectiveTimesheets.ts` (8h normal; `_auto: 'leave'`). |
| **Overtime** | Approved OT → adds `overtime_hours` (1.5×) or `holiday_overtime_hours` (2.0×) on merge. |
| **Shifts / roster** | Standby allowance flags (8h per contiguous run in totals). |

**Merge policy:** Real saved timesheet row **wins** over overlay; OT **adds on top**, does not wipe user edits. Dedupe approved OT by `id` in merge.

**Sep 2026 one-off:** `necModuleBatch.ts` includes unsigned/pending leave+OT for **2026-08-13…2026-09-12** NEC only — not global policy.

---

## Payroll totals (NEC) — must stay consistent

- **Actual** = sum of **normal** `regular_hours` (uncapped). Leave counts as 8h. Double-time days (`weekend` / `holiday` worked) → hours go to **2.0×**, not Actual normal sum.
- **Reg** = `min(Actual, 208)` **unless** NEC floor: no **Absent** day in period → **Reg = 208** even if Actual &lt; 208. **Off** rest days do **not** block the floor — only **Absent** does.
- **Normal excess** = `max(Actual − 208, 0)` → part of **1.5×**.
- **1.5×** = normal excess **+** sum of row `overtime_hours` (module OT at 1.5×). **No double-count** of excess on stored rows.
- **2.0×** = double-time day totals + `holiday_overtime_hours` on ordinary days.
- **Payable total** = Reg + 1.5× + 2.0× + night + standby + night allowance (Actual is **not** added again).

Options: `calcEmployeeTotals(empId, timesheets, { periodDates, applyRegFloorWithoutAbsent: true })` for NEC tab.

---

## Grid UX (shipped)

- **Drag-fill** (normal / OFF): `fillEntry.ts`, `fillDrag.ts`; optimistic bulk save; does not fill protected `_auto: 'leave'` cells; fill templates zero out module OT fields.
- Tooltips on **Reg** / **1.5×** explain floor and formula breakdown.

---

## Combined Excel export (NEC) — current design

- **Style:** B&W print-friendly; **Mine No** before name; leave cells **8h** + green fill; signature block; legend row; `fullCalcOnLoad`.
- **Total columns (6):** Actual h, Reg h, OT 1.5×, OT 2.0×, Standby h, Night Allow. h — **no separate “Added OT” column** (rejected).
- **OT 1.5× cell formula** (user must see it in Excel formula bar):

  `=MAX(0, ActualCol − 208) + h1 + h2 + …`

  - **MAX(0, …)** = only count hours **above 208** normal cap; never negative.
  - **+h1+h2+…** = one term **per approved 1.5× OT record** (chronological), built by `moduleOt15FormulaAddends()` in `calcTotals.ts`; any extra row OT on a day adds another term; HR can append manual `+2+1` in the bar.
  - Helpers: `excelOt15Formula()` in `lib/exportUtils.ts`.
  - Export passes **`approvedOvertime`** into `DownloadDialog` for the breakdown.

**Rejected approaches (do not re-introduce in prompts):**

- OT 1.5× = `Actual − Reg` in Excel (user wanted **208**, not Reg column).
- Separate **Added OT** column feeding the formula.

---

## Backend / API

- **Pagination:** `GET /api/timesheets` (and stats/import reads) use `fetch_all_pages` in backend `db_helpers.py` — PostgREST **1000-row cap** broke early NEC dates when sorted newest-first. Tests: `test_timesheets_pagination.py`.
- **Import:** backend `scripts/nec_timesheet_import.py` (+ gitignored snapshots). See backend `docs/NEC_TIMESHEET_IMPORT.md`.

---

## Tests to cite in Cursor prompts

- `app/timesheets/calcTotals.test.ts` (incl. Reg floor, module OT addends).
- `app/timesheets/mergeEffectiveTimesheets.test.ts`, `fillEntry.test.ts`.
- Backend: `tests/test_timesheets_pagination.py`.

**Verify before “done”:** `npx tsc --noEmit`, `npx vitest run app/timesheets/calcTotals.test.ts`; backend `pytest -q`.

---

## Prompt template for ChatGPT to give Cursor

1. **Goal** — one sentence.
2. **Scope** — NEC vs salaried; Excel vs grid vs API.
3. **Constraints** — use `calcEmployeeTotals`; follow [NEC_TIMESHEET_RULES.md](./NEC_TIMESHEET_RULES.md).
4. **Acceptance** — tests + tsc; formula rules if export touched.
5. **Push** — only when user asks; frontend/backend separate repos.

**Example Cursor prompt:**

> In MyOffice frontend (`app/timesheets/`), [goal]. Follow NEC_TIMESHEET_RULES.md and `calcEmployeeTotals`. Reuse design-system + export helpers. No Added OT column. Excel OT 1.5× = `MAX(0, Actual−208)` + individual +terms from approved OT. Run `calcTotals.test.ts` and `tsc --noEmit`. Do not push unless I ask.

---

## Scanned PDF import (in-app)

- **UI:** NEC tab → **Import scans** (`app/timesheets/necImport/`).
- **API:** backend `/api/nec-timesheet-import` + `app/nec_import/*`.
- **Flow:** create job → upload PDF(s) → upload validated **review JSON** → preview → dry-run/apply.
- **Default extraction:** manual review JSON (`NEC_IMPORT_EXTRACTION_PROVIDER=manual_review_json` on server).

## File cheat sheet

| Concern | Path |
|---------|------|
| Totals / OT addends | `app/timesheets/calcTotals.ts` |
| Leave/OT merge | `app/timesheets/mergeEffectiveTimesheets.ts` |
| Grid + Excel export | `app/timesheets/page.tsx` |
| Scan import UI | `app/timesheets/necImport/NecScanImportPanel.tsx` |
| Excel formula helper | `lib/exportUtils.ts` |
| Sep 2026 batch | `app/timesheets/necModuleBatch.ts` |

Update this file when payroll rules or export behaviour changes.
