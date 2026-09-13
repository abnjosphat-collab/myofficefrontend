// app/timesheets/calcTotals.ts — NEC normal-hour Actual vs Reg (208 cap) vs overtime buckets.
import type { HourTotals, StatusKey, TimesheetEntry } from './types';

export const LEAVE_STATUSES = new Set<StatusKey>(['leave', 'sick', 'special_leave', 'training', 'maternity', 'study', 'lieu']);
export const DOUBLE_TIME_STATUSES = new Set<StatusKey>(['holiday', 'weekend']);
export const ZERO_HOUR_STATUSES = new Set<StatusKey>(['off', 'absent']);

export const NEC_REG_CAP = 208;

/** @deprecated Use calcEmployeeTotals — kept for tests that target the cap helper directly. */
export const apply208 = (reg: number, ot15: number) =>
  reg <= NEC_REG_CAP ? { reg, ot15 } : { reg: NEC_REG_CAP, ot15: ot15 + (reg - NEC_REG_CAP) };

export function calcEmployeeTotals(empId: string, timesheets: TimesheetEntry[]): HourTotals {
  let normalSum = 0;
  let ot15Module = 0;
  let ot20 = 0;
  let night = 0;
  let standbyBonus = 0;
  let inStandbyRun = false;
  let nightAllowanceBonus = 0;

  timesheets
    .filter(t => String(t.employee_id) === String(empId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      if (DOUBLE_TIME_STATUSES.has(e.status)) {
        ot20 += (e.regular_hours || 0) + (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
      } else {
        normalSum += e.regular_hours || 0;
        ot15Module += e.overtime_hours || 0;
        ot20 += e.holiday_overtime_hours || 0;
      }
      const nh = e.nightshift_hours || 0;
      if (e.nightshift_allowance) nightAllowanceBonus += nh;
      else night += nh;
      if (e.standby_allowance) {
        if (!inStandbyRun) { standbyBonus += 8; inStandbyRun = true; }
      } else inStandbyRun = false;
    });

  const actual = normalSum;
  const reg = Math.min(normalSum, NEC_REG_CAP);
  const excess = Math.max(0, normalSum - NEC_REG_CAP);
  const ot15 = excess + ot15Module;

  return {
    reg,
    ot15,
    ot20,
    night,
    standbyBonus,
    nightAllowanceBonus,
    actual,
    excess,
    total: reg + ot15 + ot20 + night + standbyBonus + nightAllowanceBonus,
  };
}
