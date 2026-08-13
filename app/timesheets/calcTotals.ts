// app/timesheets/calcTotals.ts — the status-classification sets, the 208-hour cap, and
// the one per-employee hour-totals function everything else in this module reads from.
// Previously duplicated near-identically between the on-screen grid's summary
// (page.tsx's old `calcTotals`) and the download dialog's `calcTotalsLocal` — split out
// so the two can't drift, and so the public-holiday/night-allowance logic added here only
// has to be written once to reach both the grid and the Excel/PDF export.
import type { HourTotals, StatusKey, TimesheetEntry } from './types';

export const LEAVE_STATUSES = new Set<StatusKey>(['leave', 'sick', 'special_leave', 'training', 'maternity', 'study', 'lieu']);
// 'holiday' = worked a public holiday (2.0x, "PPH"). 'holiday_paid' is NOT here — it's the
// not-worked case, paid as ordinary regular hours (see effectiveTimesheets in page.tsx).
export const DOUBLE_TIME_STATUSES = new Set<StatusKey>(['holiday', 'weekend']);
export const ZERO_HOUR_STATUSES = new Set<StatusKey>(['off', 'absent']);

export const apply208 = (reg: number, ot15: number) =>
  reg <= 208 ? { reg, ot15 } : { reg: 208, ot15: ot15 + (reg - 208) };

export function calcEmployeeTotals(empId: string, timesheets: TimesheetEntry[]): HourTotals {
  let reg = 0, ot15 = 0, ot20 = 0, night = 0;
  let standbyBonus = 0, inStandbyRun = false;
  let nightAllowanceBonus = 0;

  timesheets
    .filter(t => String(t.employee_id) === String(empId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      reg += e.regular_hours || 0;
      night += e.nightshift_hours || 0;
      if (DOUBLE_TIME_STATUSES.has(e.status)) {
        ot20 += (e.regular_hours || 0) + (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
        reg -= e.regular_hours || 0;
      } else {
        ot15 += e.overtime_hours || 0;
        ot20 += e.holiday_overtime_hours || 0;
      }
      // Standby is a flat 8h once per contiguous run (of any length) — a fresh run earns
      // it the moment it starts, then stays flat until the run breaks.
      if (e.standby_allowance) { if (!inStandbyRun) { standbyBonus += 8; inStandbyRun = true; } } else inStandbyRun = false;
      // Night Shift Allowance is NOT flat — it's the actual hours worked between 18:00 and
      // 06:00 (nightshift_hours, already computed as exactly that overlap) on days someone
      // is on a scheduled night shift (the nightshift_allowance flag). A callout entry has
      // no start/end time and never carries this flag, so callout hours never contribute
      // here — only genuine rostered night-shift hours do.
      if (e.nightshift_allowance) nightAllowanceBonus += e.nightshift_hours || 0;
    });

  const a = apply208(reg, ot15);
  // actual = the normal day-shift hours only (reg, capped at 208). Leave/sick/etc. days
  // already count as 8h each here, via regular_hours — but overtime (1.5x/2.0x), night-window
  // hours, and the flat standby/night-allowance bonuses are all deliberately excluded; they
  // only show up in their own columns and in `total` below.
  const actual = a.reg;
  return {
    reg: a.reg, ot15: a.ot15, ot20, night, standbyBonus, nightAllowanceBonus, actual,
    total: a.reg + a.ot15 + ot20 + night + standbyBonus + nightAllowanceBonus,
    excess: Math.max(0, reg - 208),
  };
}
