import { toLocalISODate } from '@/lib/dates';
import { zimHolidayName } from '@/lib/zimHolidays';
import { calcNightHours, deriveNightshiftAllowanceFlag, DOUBLE_TIME_STATUSES, LEAVE_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
import type { Employee, StatusKey, TimesheetEntry } from './types';

export type NormalHoursSlice = Pick<TimesheetEntry, 'regular_hours' | 'start_time' | 'end_time'>;

export type FillFromSource =
  | { kind: 'off'; status: 'off' | 'absent' }
  | { kind: 'normal'; normal: NormalHoursSlice; nightAllowance?: { hours: number; enabled: true } };

export { calcNightHours } from './calcTotals';

/** Role-based normal shift length — mirrors page.tsx normalShiftHours. */
export function normalShiftHours(position: string): 8 | 10 {
  return /lamp\s*room|compressor/i.test(position) ? 8 : 10;
}

function timeFromHours(startHHMM: string, hours: number): string {
  const [h, m] = startHHMM.split(':').map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Default entry for the grid's quick-add / empty-cell fill (same rules as handleQuickAdd). */
export function buildDefaultEntry(emp: Pick<Employee, 'id' | 'position'>, day: Date): Omit<TimesheetEntry, 'id'> {
  const ds = toLocalISODate(day);
  const holiday = zimHolidayName(ds);
  const status: StatusKey = holiday ? 'holiday_paid' : (day.getDay() === 0 || day.getDay() === 6) ? 'weekend' : 'work';
  const hours = status === 'holiday_paid' ? 8 : normalShiftHours(emp.position);
  return {
    employee_id: parseInt(emp.id),
    date: ds,
    status,
    start_time: status === 'holiday_paid' ? '' : '07:00',
    end_time: status === 'holiday_paid' ? '' : timeFromHours('07:00', hours),
    regular_hours: hours,
    overtime_hours: 0,
    holiday_overtime_hours: 0,
    nightshift_hours: 0,
    standby_allowance: false,
    nightshift_allowance: false,
    total_hours: hours,
    notes: '',
    overtime_periods: [],
    callout_overtime_hours: 0,
    callout_count: 0,
  };
}

export function extractFillFromSource(source: TimesheetEntry): FillFromSource {
  if (ZERO_HOUR_STATUSES.has(source.status)) {
    return { kind: 'off', status: source.status === 'absent' ? 'absent' : 'off' };
  }
  const normal = extractNormalHoursFromSource(source);
  const nh = calcNightHours(normal.start_time ?? '', normal.end_time ?? '');
  const nightAllowance = nh > 0 ? { enabled: true as const, hours: nh } : undefined;
  return { kind: 'normal', normal, nightAllowance };
}

/** Normal hours + shift times taken from the source cell (fill never copies OT/allowances). */
export function extractNormalHoursFromSource(source: TimesheetEntry): NormalHoursSlice {
  const regular_hours = source.regular_hours || 0;
  const start_time = source.start_time || '07:00';
  const end_time = source.end_time || (regular_hours > 0 ? timeFromHours(start_time, regular_hours) : '');
  return { regular_hours, start_time, end_time };
}

/** New row with only normal work hours (empty target). */
export function newRowFromNormalHours(
  normal: NormalHoursSlice,
  empId: number,
  targetDate: string,
  nightAllowanceFromSource?: { hours: number; enabled: true },
): Omit<TimesheetEntry, 'id'> {
  const regular_hours = normal.regular_hours;
  const start = normal.start_time ?? '07:00';
  const end = normal.end_time ?? '';
  const nightHours = nightAllowanceFromSource?.enabled
    ? calcNightHours(start, end) || nightAllowanceFromSource.hours
    : 0;
  const nightFlag = deriveNightshiftAllowanceFlag({
    nightshift_hours: nightHours,
    start_time: start,
    end_time: end,
    status: 'work',
  });
  return {
    employee_id: empId,
    date: targetDate,
    status: 'work',
    start_time: start,
    end_time: end,
    regular_hours,
    overtime_hours: 0,
    holiday_overtime_hours: 0,
    nightshift_hours: nightHours,
    standby_allowance: false,
    nightshift_allowance: nightFlag,
    total_hours: regular_hours + nightHours,
    notes: '',
    overtime_periods: [],
    callout_overtime_hours: 0,
    callout_count: 0,
  };
}

/** Mark target day OFF (or absent) — 0 hours; does not preserve OT on filled cells. */
export function applyOffFill(
  status: 'off' | 'absent',
  existing: TimesheetEntry | undefined,
  empId: number,
  targetDate: string,
): Omit<TimesheetEntry, 'id'> {
  const notes = existing?.notes?.startsWith('Auto:') ? '' : (existing?.notes || '');
  return {
    employee_id: empId,
    date: targetDate,
    status,
    start_time: '',
    end_time: '',
    regular_hours: 0,
    overtime_hours: 0,
    holiday_overtime_hours: 0,
    nightshift_hours: 0,
    standby_allowance: false,
    nightshift_allowance: false,
    total_hours: 0,
    notes,
    overtime_periods: [],
    callout_overtime_hours: 0,
    callout_count: 0,
  };
}

/** Apply normal hours to a target day; keeps existing OT, allowances, and module fields on saved rows. */
export function applyNormalHoursFill(
  normal: NormalHoursSlice,
  existing: TimesheetEntry | undefined,
  empId: number,
  targetDate: string,
  nightAllowanceFromSource?: { hours: number; enabled: true },
): Omit<TimesheetEntry, 'id'> {
  if (!existing?.id) {
    const base = newRowFromNormalHours(normal, empId, targetDate, nightAllowanceFromSource);
    if (!existing) return base;
    const ot15 = existing.overtime_hours || 0;
    const ot20 = existing.holiday_overtime_hours || 0;
    return {
      ...base,
      overtime_hours: ot15,
      holiday_overtime_hours: ot20,
      standby_allowance: existing.standby_allowance ?? base.standby_allowance,
      notes: existing.notes?.trim() ? existing.notes : base.notes,
      overtime_periods: existing.overtime_periods ?? [],
      callout_overtime_hours: existing.callout_overtime_hours ?? 0,
      callout_count: existing.callout_count ?? 0,
      total_hours: (base.total_hours ?? 0) + ot15 + ot20,
    };
  }

  const { id: _id, _auto, ...rest } = existing;
  const ot15 = rest.overtime_hours || 0;
  const ot20 = rest.holiday_overtime_hours || 0;
  const regular_hours = normal.regular_hours;
  const start_time = normal.start_time ?? rest.start_time;
  const end_time = normal.end_time ?? rest.end_time;
  const nh = calcNightHours(start_time ?? '', end_time ?? '');
  const nightFlag = deriveNightshiftAllowanceFlag({
    nightshift_hours: nh,
    start_time,
    end_time,
    status: rest.status,
    regular_hours,
  });
  return {
    ...rest,
    employee_id: empId,
    date: targetDate,
    regular_hours,
    start_time,
    end_time,
    overtime_hours: ot15,
    holiday_overtime_hours: ot20,
    nightshift_hours: nh,
    nightshift_allowance: nightFlag,
    overtime_periods: rest.overtime_periods ?? [],
    callout_overtime_hours: rest.callout_overtime_hours ?? 0,
    callout_count: rest.callout_count ?? 0,
    total_hours: regular_hours + ot15 + ot20 + nh,
  };
}

/** Target day is owned by approved leave only — filling would overwrite module leave. */
export function isFillProtectedTarget(entry?: TimesheetEntry): boolean {
  return !!entry && entry._auto === 'leave';
}

/** Fill from work days (normal hours) or OFF/absent (0h). Not from leave or 2.0× days. */
export function canFillFromSource(entry?: TimesheetEntry): boolean {
  if (!entry) return true;
  if (entry._auto === 'leave') return false;
  if (LEAVE_STATUSES.has(entry.status)) return false;
  if (DOUBLE_TIME_STATUSES.has(entry.status)) return false;
  return true;
}

/** @deprecated Use extractNormalHoursFromSource + applyNormalHoursFill */
export function prepareFillTemplate(source: TimesheetEntry): Omit<TimesheetEntry, 'id'> {
  return newRowFromNormalHours(extractNormalHoursFromSource(source), source.employee_id, source.date);
}

export function fillTargetDayIndices(sourceIndex: number, endIndex: number): number[] {
  const lo = Math.min(sourceIndex, endIndex);
  const hi = Math.max(sourceIndex, endIndex);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) {
    if (i !== sourceIndex) out.push(i);
  }
  return out;
}
