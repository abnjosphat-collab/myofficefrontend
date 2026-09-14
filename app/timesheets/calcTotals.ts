// app/timesheets/calcTotals.ts — NEC normal-hour Actual vs Reg (208 cap) vs overtime buckets.
import { approvedOvertimeHours, OT_TYPE_TO_BUCKET } from './mergeEffectiveTimesheets';
import type { ApprovedOvertimeRecord, HourTotals, StatusKey, TimesheetEntry } from './types';

export const LEAVE_STATUSES = new Set<StatusKey>(['leave', 'sick', 'special_leave', 'training', 'maternity', 'study', 'lieu']);
export const DOUBLE_TIME_STATUSES = new Set<StatusKey>(['holiday', 'weekend']);
export const ZERO_HOUR_STATUSES = new Set<StatusKey>(['off', 'absent']);

export const NEC_REG_CAP = 208;

/** Overlap with 18:00–06:00 from roster start/end (same rules as the entry editor). */
export function calcNightHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e <= s) e += 24;
  const ov = (a: number, b: number) => Math.max(0, Math.min(e, b) - Math.max(s, a));
  return ov(0, 6) + ov(18, 24) + ov(24, 30);
}

export type RosterNightAllowanceEntry = Pick<
  TimesheetEntry,
  'nightshift_hours' | 'start_time' | 'end_time' | 'status'
>;

/**
 * Night shift allowance: any 18:00–06:00 hours from a **rostered shift** (start/end).
 * Ad-hoc night work (breakdown callouts) belongs in `callout_overtime_hours`, not here.
 */
export function rosterNightAllowanceHours(e: RosterNightAllowanceEntry): number {
  if (LEAVE_STATUSES.has(e.status) || ZERO_HOUR_STATUSES.has(e.status)) return 0;
  const nh = e.nightshift_hours || 0;
  if (nh <= 0) return 0;
  const st = e.start_time?.trim();
  const en = e.end_time?.trim();
  if (!st || !en) return 0;
  return nh;
}

export function deriveNightshiftAllowanceFlag(e: RosterNightAllowanceEntry): boolean {
  return rosterNightAllowanceHours(e) > 0;
}

export type CalcEmployeeTotalsOpts = {
  periodDates?: string[];
  /** NEC: Reg defaults to 208 when Actual < 208 unless the employee was Absent (not Off). */
  applyRegFloorWithoutAbsent?: boolean;
};

/** True if the employee has any deliberate **Absent** day in the period (Off/rest does not count). */
export function employeeHasAbsentInPeriod(
  empId: string,
  timesheets: TimesheetEntry[],
  periodDates: string[],
): boolean {
  const byDate = new Map(
    timesheets
      .filter(t => String(t.employee_id) === String(empId))
      .map(t => [t.date, t]),
  );
  return periodDates.some(d => {
    const e = byDate.get(d);
    return e != null && e.status === 'absent';
  });
}

/** @deprecated Use calcEmployeeTotals — kept for tests that target the cap helper directly. */
export const apply208 = (reg: number, ot15: number) =>
  reg <= NEC_REG_CAP ? { reg, ot15 } : { reg: NEC_REG_CAP, ot15: ot15 + (reg - NEC_REG_CAP) };

export function calcEmployeeTotals(
  empId: string,
  timesheets: TimesheetEntry[],
  opts?: CalcEmployeeTotalsOpts,
): HourTotals {
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
      const allowH = rosterNightAllowanceHours(e);
      nightAllowanceBonus += allowH;
      if (nh > allowH) night += nh - allowH;
      if (e.standby_allowance) {
        if (!inStandbyRun) { standbyBonus += 8; inStandbyRun = true; }
      } else inStandbyRun = false;
    });

  const actual = normalSum;
  let reg = Math.min(normalSum, NEC_REG_CAP);
  const periodDates = opts?.periodDates ?? [];
  const hasAbsent = periodDates.length > 0
    ? employeeHasAbsentInPeriod(empId, timesheets, periodDates)
    : false;
  if (opts?.applyRegFloorWithoutAbsent && !hasAbsent && actual < NEC_REG_CAP) {
    reg = NEC_REG_CAP;
  }
  const excess = Math.max(0, normalSum - NEC_REG_CAP);
  const ot15 = excess + ot15Module;

  return {
    reg,
    ot15,
    ot15Module,
    ot20,
    night,
    standbyBonus,
    nightAllowanceBonus,
    actual,
    excess,
    total: reg + ot15 + ot20 + night + standbyBonus + nightAllowanceBonus,
  };
}

/** Individual 1.5× module OT lines for Excel (approved OT entries, then any row-only remainder). */
export function moduleOt15FormulaAddends(
  dbEmpId: string,
  humanEmpId: string,
  timesheets: TimesheetEntry[],
  approvedOvertime: ApprovedOvertimeRecord[],
  periodDates: string[],
): number[] {
  const periodSet = new Set(periodDates);
  const humanKey = humanEmpId.trim();
  const seenOtIds = new Set<number>();
  type Part = { date: string; order: number; hours: number };
  const parts: Part[] = [];
  let order = 0;

  approvedOvertime
    .filter(ot => {
      if (!periodSet.has(ot.date)) return false;
      if (ot.employee_id.trim() !== humanKey) return false;
      return OT_TYPE_TO_BUCKET[ot.overtime_type] === 'ot15';
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))
    .forEach(ot => {
      if (ot.id != null) {
        if (seenOtIds.has(ot.id)) return;
        seenOtIds.add(ot.id);
      }
      const h = approvedOvertimeHours(ot);
      if (h > 0) parts.push({ date: ot.date, order: order++, hours: h });
    });

  const approvedByDate = new Map<string, number>();
  parts.forEach(p => approvedByDate.set(p.date, (approvedByDate.get(p.date) || 0) + p.hours));

  timesheets
    .filter(t => String(t.employee_id) === String(dbEmpId) && periodSet.has(t.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      if (DOUBLE_TIME_STATUSES.has(e.status)) return;
      const rowOt = e.overtime_hours || 0;
      const appr = approvedByDate.get(e.date) || 0;
      const rem = rowOt - appr;
      if (rem > 0.005) parts.push({ date: e.date, order: order++, hours: rem });
    });

  parts.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

  const rowModuleTotal = timesheets
    .filter(t => String(t.employee_id) === String(dbEmpId) && periodSet.has(t.date))
    .reduce((s, e) => (DOUBLE_TIME_STATUSES.has(e.status) ? s : s + (e.overtime_hours || 0)), 0);
  const partSum = parts.reduce((s, p) => s + p.hours, 0);

  const perDayRowAddends = () => timesheets
    .filter(t => String(t.employee_id) === String(dbEmpId) && periodSet.has(t.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap(e => {
      if (DOUBLE_TIME_STATUSES.has(e.status)) return [];
      const h = e.overtime_hours || 0;
      return h > 0 ? [Number(h.toFixed(2))] : [];
    });

  if (parts.length === 0 && rowModuleTotal > 0) return perDayRowAddends();
  if (Math.abs(partSum - rowModuleTotal) > 0.05) return perDayRowAddends();

  return parts.map(p => Number(p.hours.toFixed(2)));
}
