// app/timesheets/calcTotals.ts — NEC normal-hour Actual vs Reg (208 cap) vs overtime buckets.
import { normalizeTimesheetEmployeeCode, timesheetEmployeeCodesMatch } from './employeeCode';
import { approvedOvertimeHours, OT_TYPE_TO_BUCKET } from './mergeEffectiveTimesheets';
import type { ApprovedOvertimeRecord, HourTotals, StatusKey, TimesheetEntry } from './types';

/** Full 18:00–06:00 night allowance window (12h). */
export const FULL_NIGHT_ALLOWANCE_HOURS = 12;

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

/** Total shift length on the clock (handles overnight). */
export function shiftClockHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = parseClock(start);
  const [eh, em] = parseClock(end);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e <= s) e += 24;
  return e - s;
}

/** End time is after midnight (e.g. 04:00) on a night roster. */
function isPostMidnightShiftEnd(end: string): boolean {
  const [h] = parseClock(end);
  return !Number.isNaN(h) && h < 12;
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
> & {
  regular_hours?: number;
  overtime_hours?: number;
  holiday_overtime_hours?: number;
};

function moduleOtHoursOnRow(e: RosterNightAllowanceEntry): number {
  return (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
}

/** Module OT that starts before 06:00 — tail of a night roster on this payroll date. */
export function isEarlyMorningOvertimeStart(start?: string): boolean {
  if (!start?.trim()) return false;
  const [h] = parseClock(start);
  return !Number.isNaN(h) && h < 6;
}

export type NightAllowanceCalcOpts = {
  /** Same-day approved 1.5× OT with start before 06:00 (completes 18:00–06:00 window). */
  earlyMorningModuleOt?: boolean;
};

export function buildEarlyMorningOtDatesForEmployee(
  humanEmpId: string,
  approved: ApprovedOvertimeRecord[],
): Set<string> {
  const out = new Set<string>();
  approved.forEach(ot => {
    if (!timesheetEmployeeCodesMatch(ot.employee_id, humanEmpId)) return;
    if (ot.status === 'rejected') return;
    if (OT_TYPE_TO_BUCKET[ot.overtime_type] !== 'ot15') return;
    if (!isEarlyMorningOvertimeStart(ot.start_time)) return;
    if (approvedOvertimeHours(ot) <= 0) return;
    out.add(ot.date);
  });
  return out;
}

/**
 * Shift clock span for night overlap — roster end plus module OT worked **after** recorded
 * end (e.g. 18:00–04:00 + 2h OT → through 06:00 → 12h night allowance).
 */
export function resolveShiftTimesForNight(e: RosterNightAllowanceEntry): { start: string; end: string } | null {
  const st = e.start_time?.trim();
  if (!st) return null;
  const ot = moduleOtHoursOnRow(e);
  let en = e.end_time?.trim() || '';
  if (!en && (e.regular_hours || 0) + ot > 0) {
    en = endTimeFromStartAndHours(st, (e.regular_hours || 0) + ot);
  } else if (en && ot > 0) {
    en = endTimeFromStartAndHours(en, ot);
  }
  if (!en) return null;
  return { start: st, end: en };
}

/** Module 1.5× OT hours by date for one employee (human `employee_id` on OT records). */
export function buildModuleOt15ByDateForEmployee(
  humanEmpId: string,
  approved: ApprovedOvertimeRecord[],
): Record<string, number> {
  const out: Record<string, number> = {};
  approved.forEach(ot => {
    if (!timesheetEmployeeCodesMatch(ot.employee_id, humanEmpId) || ot.status === 'rejected') return;
    if (OT_TYPE_TO_BUCKET[ot.overtime_type] !== 'ot15') return;
    const h = approvedOvertimeHours(ot);
    if (h <= 0) return;
    out[ot.date] = (out[ot.date] ?? 0) + h;
  });
  return out;
}

/** Row OT for night calc — use module total when saved row is missing merged OT hours. */
export function entryForNightAllowanceCalc(
  e: RosterNightAllowanceEntry,
  moduleOt15ForDay = 0,
): RosterNightAllowanceEntry {
  const rowOt = e.overtime_hours || 0;
  if (moduleOt15ForDay > rowOt) return { ...e, overtime_hours: moduleOt15ForDay };
  return e;
}

/**
 * Night shift allowance: any 18:00–06:00 hours from a **rostered shift** (start/end).
 * Uses the **longer** of (a) start + regular+OT span or (b) explicit end + OT after end.
 * Scan/import may store hours without times when `nightshift_allowance` is set.
 * Ad-hoc breakdown work → `callout_overtime_hours`, not here.
 */
export function rosterNightAllowanceHours(
  e: RosterNightAllowanceEntry,
  opts?: NightAllowanceCalcOpts,
): number {
  if (LEAVE_STATUSES.has(e.status) || ZERO_HOUR_STATUSES.has(e.status)) return 0;
  const st = e.start_time?.trim();
  let best = 0;
  if (st) {
    const ot = moduleOtHoursOnRow(e);
    const reg = e.regular_hours || 0;
    const times = resolveShiftTimesForNight(e);
    if (times) best = calcNightHours(times.start, times.end);
    const explicitEnd = e.end_time?.trim() || '';
    if (ot > 0 && reg + ot > 0) {
      best = Math.max(best, calcNightHours(st, endTimeFromStartAndHours(st, reg + ot)));
    } else if (explicitEnd && isPostMidnightShiftEnd(explicitEnd) && reg > shiftClockHours(st, explicitEnd) + 0.01) {
      best = Math.max(best, calcNightHours(st, endTimeFromStartAndHours(st, reg)));
    } else if (!explicitEnd && reg + ot > 0) {
      best = Math.max(best, calcNightHours(st, endTimeFromStartAndHours(st, reg + ot)));
    }
  }
  if (opts?.earlyMorningModuleOt && best < FULL_NIGHT_ALLOWANCE_HOURS - 0.01) {
    best = Math.max(best, FULL_NIGHT_ALLOWANCE_HOURS);
  }
  if (best > 0) return best;
  const nh = e.nightshift_hours || 0;
  if (nh > 0 && e.nightshift_allowance) return nh;
  return 0;
}

export function deriveNightshiftAllowanceFlag(e: RosterNightAllowanceEntry): boolean {
  return rosterNightAllowanceHours(e) > 0;
}

export type SyncRosterNightOpts = NightAllowanceCalcOpts & {
  moduleOt15ForDay?: number;
};

/** Align stored night fields with shift times (grid display + exports). */
export function syncRosterNightFields<T extends TimesheetEntry>(e: T, opts?: SyncRosterNightOpts): T {
  if (LEAVE_STATUSES.has(e.status) || ZERO_HOUR_STATUSES.has(e.status)) return e;
  const forNight = entryForNightAllowanceCalc(e, opts?.moduleOt15ForDay ?? 0);
  const allow = rosterNightAllowanceHours(forNight, opts);
  if (allow > 0) {
    return { ...e, nightshift_hours: allow, nightshift_allowance: true };
  }
  return e;
}

export type CalcEmployeeTotalsOpts = {
  periodDates?: string[];
  /** NEC: Reg defaults to 208 when Actual < 208 unless the employee was Absent (not Off). */
  applyRegFloorWithoutAbsent?: boolean;
  /** Module 1.5× OT by date when row `overtime_hours` is missing/stale (night allow after shift end). */
  moduleOt15ByDate?: Record<string, number>;
  /** Dates with approved module OT starting before 06:00 on that row. */
  earlyMorningOtDates?: Set<string>;
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
      const forNight = entryForNightAllowanceCalc(e, opts?.moduleOt15ByDate?.[e.date] ?? 0);
      const allowH = rosterNightAllowanceHours(forNight, {
        earlyMorningModuleOt: opts?.earlyMorningOtDates?.has(e.date),
      });
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
  const humanKey = normalizeTimesheetEmployeeCode(humanEmpId);
  const seenOtIds = new Set<number>();
  type Part = { date: string; order: number; hours: number };
  const parts: Part[] = [];
  let order = 0;

  approvedOvertime
    .filter(ot => {
      if (!periodSet.has(ot.date)) return false;
      if (normalizeTimesheetEmployeeCode(ot.employee_id) !== humanKey) return false;
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
