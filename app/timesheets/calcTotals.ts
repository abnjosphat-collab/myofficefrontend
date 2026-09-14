// app/timesheets/calcTotals.ts — NEC normal-hour Actual vs Reg (208 cap) vs overtime buckets.
import { approvedOvertimeHours, OT_TYPE_TO_BUCKET } from './mergeEffectiveTimesheets';
import type { ApprovedOvertimeRecord, HourTotals, StatusKey, TimesheetEntry } from './types';

export const LEAVE_STATUSES = new Set<StatusKey>(['leave', 'sick', 'special_leave', 'training', 'maternity', 'study', 'lieu']);
export const DOUBLE_TIME_STATUSES = new Set<StatusKey>(['holiday', 'weekend']);
export const ZERO_HOUR_STATUSES = new Set<StatusKey>(['off', 'absent']);

export const NEC_REG_CAP = 208;

function parseClock(t: string): [number, number] {
  const parts = t.trim().split(':');
  if (parts.length < 2) return [NaN, NaN];
  return [Number(parts[0]), Number(parts[1])];
}

function endTimeFromStartAndHours(startHHMM: string, hours: number): string {
  const [h, m] = parseClock(startHHMM);
  if (Number.isNaN(h)) return '';
  const total = h * 60 + m + Math.round(hours * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Overlap with 18:00–06:00 from roster start/end (same rules as the entry editor). */
export function calcNightHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = parseClock(start);
  const [eh, em] = parseClock(end);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e <= s) e += 24;
  const ov = (a: number, b: number) => Math.max(0, Math.min(e, b) - Math.max(s, a));
  return ov(0, 6) + ov(18, 24) + ov(24, 30);
}

export type RosterNightAllowanceEntry = Pick<
  TimesheetEntry,
  'nightshift_hours' | 'start_time' | 'end_time' | 'status' | 'nightshift_allowance'
> & { regular_hours?: number };

/** Resolve shift clock times for night overlap (infers end from regular_hours when missing). */
export function resolveShiftTimesForNight(e: RosterNightAllowanceEntry): { start: string; end: string } | null {
  const st = e.start_time?.trim();
  if (!st) return null;
  let en = e.end_time?.trim() || '';
  if (!en && (e.regular_hours || 0) > 0) en = endTimeFromStartAndHours(st, e.regular_hours || 0);
  if (!en) return null;
  return { start: st, end: en };
}

/**
 * Night shift allowance: any 18:00–06:00 hours from a **rostered shift** (start/end).
 * Computed from times when present (so saved rows missing `nightshift_hours` still qualify).
 * Scan/import may store hours without times when `nightshift_allowance` is set.
 * Ad-hoc breakdown work → `callout_overtime_hours`, not here.
 */
export function rosterNightAllowanceHours(e: RosterNightAllowanceEntry): number {
  if (LEAVE_STATUSES.has(e.status) || ZERO_HOUR_STATUSES.has(e.status)) return 0;
  const times = resolveShiftTimesForNight(e);
  if (times) {
    const fromClock = calcNightHours(times.start, times.end);
    if (fromClock > 0) return fromClock;
  }
  const nh = e.nightshift_hours || 0;
  if (nh > 0 && e.nightshift_allowance) return nh;
  return 0;
}

export function deriveNightshiftAllowanceFlag(e: RosterNightAllowanceEntry): boolean {
  return rosterNightAllowanceHours(e) > 0;
}

/** Align stored night fields with shift times (grid display + exports). */
export function syncRosterNightFields<T extends TimesheetEntry>(e: T): T {
  if (LEAVE_STATUSES.has(e.status) || ZERO_HOUR_STATUSES.has(e.status)) return e;
  const allow = rosterNightAllowanceHours(e);
  const times = resolveShiftTimesForNight(e);
  if (times) {
    const nh = calcNightHours(times.start, times.end);
    return {
      ...e,
      nightshift_hours: nh,
      nightshift_allowance: nh > 0,
    };
  }
  if (allow > 0) {
    return { ...e, nightshift_hours: allow, nightshift_allowance: true };
  }
  return e;
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
