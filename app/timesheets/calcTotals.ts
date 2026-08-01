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
  let nightAllowanceBonus = 0, inNightAllowanceRun = false;

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
      // Both bonuses are paid once per contiguous run (of any length), not per day — a
      // fresh run earns the flat 8h the moment it starts, then stays flat until it breaks.
      if (e.standby_allowance) { if (!inStandbyRun) { standbyBonus += 8; inStandbyRun = true; } } else inStandbyRun = false;
      if (e.nightshift_allowance) { if (!inNightAllowanceRun) { nightAllowanceBonus += 8; inNightAllowanceRun = true; } } else inNightAllowanceRun = false;
    });

  const a = apply208(reg, ot15);
  // actual = hours genuinely worked/credited (regular + both overtime tiers + night), as
  // distinct from the flat standby/night-allowance bonuses added on top — previously
  // standbyBonus was folded silently into ot15, so "1.5×" and "Total" both overstated what
  // was actually worked with no way to see the bonus on its own (nightAllowanceBonus never
  // had that problem — it was always kept separate).
  const actual = a.reg + a.ot15 + ot20 + night;
  return {
    reg: a.reg, ot15: a.ot15, ot20, night, standbyBonus, nightAllowanceBonus, actual,
    total: actual + standbyBonus + nightAllowanceBonus,
    excess: Math.max(0, reg - 208),
  };
}
