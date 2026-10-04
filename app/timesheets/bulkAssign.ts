// app/timesheets/bulkAssign.ts — the rules behind bulk entry, as pure functions: which days a range or a quick pick selects, who has no
// entry on those days, what "normal shift (by role)" resolves to for the people chosen, and the entries that are written. Leave days get
// 8 hours on the standard shift, off and absent days none, and double-time days write their hours as 2.0×.
import { DOUBLE_TIME_STATUSES, LEAVE_STATUSES, ZERO_HOUR_STATUSES, calcNightHours, deriveNightshiftAllowanceFlag } from './calcTotals';
import { calcHours, fmtDate, normalShiftEnd, normalShiftHours } from './timesheetMeta';
import type { Employee, StatusKey, TimesheetEntry } from './types';

export interface BulkSettings { status: StatusKey; startTime: string; endTime: string; useNormalShift: boolean; standby: boolean }
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** The dates from `from` to `to` (inclusive) that fall in the period, leaving out weekends when asked. */
export function datesInRange(days: Date[], from: string, to: string, skipWeekends: boolean): string[] {
  return days.filter(d => { const ds = fmtDate(d); return ds >= from && ds <= to && (!skipWeekends || !isWeekend(d)); }).map(fmtDate);
}
export const weekdayDates = (days: Date[]): string[] => days.filter(d => !isWeekend(d)).map(fmtDate);
/** Week `n` (0 to 3) of the period: seven days each, the last one running to the end. */
export function weekDates(days: Date[], week: number, skipWeekends: boolean): string[] {
  if (days.length === 0) return [];
  const from = days[Math.min(week * 7, days.length - 1)]; const last = week >= 3 ? days.length - 1 : Math.min(week * 7 + 6, days.length - 1);
  return datesInRange(days, fmtDate(from), fmtDate(days[last]), skipWeekends);
}

/** Who has no entry on any of these days. */
export function missingOnDays(employees: Employee[], timesheets: TimesheetEntry[], dates: string[]): Employee[] {
  return employees.filter(emp => dates.every(ds => !timesheets.some(ts => String(ts.employee_id) === String(emp.id) && ts.date === ds)));
}

/** "2 people at 8 hours, 3 at 10": what normal shift resolves to for the people chosen. */
export function normalShiftBreakdown(selected: Iterable<string>, employees: Employee[]): [number, number][] {
  const groups = new Map<number, number>();
  for (const id of selected) { const h = normalShiftHours(employees.find(e => e.id === id)?.position || ''); groups.set(h, (groups.get(h) || 0) + 1); }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

/** The hours one day gives, and its night hours, for the chosen status and times. */
export function perDay(s: Pick<BulkSettings, 'status' | 'startTime' | 'endTime'>): { hours: number; night: number } {
  if (LEAVE_STATUSES.has(s.status)) return { hours: 8, night: 0 };
  if (ZERO_HOUR_STATUSES.has(s.status)) return { hours: 0, night: 0 };
  return { hours: calcHours(s.startTime, s.endTime), night: calcNightHours(s.startTime, s.endTime) };
}
export function estimatedHours(s: BulkSettings, selectedIds: string[], employees: Employee[], dayCount: number): number {
  if (s.useNormalShift) return normalShiftBreakdown(selectedIds, employees).reduce((sum, [hours, count]) => sum + hours * count * dayCount, 0);
  return perDay(s).hours * selectedIds.length * dayCount;
}

/** One entry for every person and date chosen. */
export function buildBulkEntries(args: { employeeIds: string[]; dates: string[]; settings: BulkSettings; employees: Employee[] }): Omit<TimesheetEntry, 'id'>[] {
  const { employeeIds, dates, settings: s, employees } = args;
  const leave = LEAVE_STATUSES.has(s.status); const zero = ZERO_HOUR_STATUSES.has(s.status); const dt = DOUBLE_TIME_STATUSES.has(s.status);
  const base = perDay(s);
  const entries: Omit<TimesheetEntry, 'id'>[] = [];
  for (const eid of employeeIds) {
    // Normal-shift mode looks up this person's own role length, so a mixed selection still lands right in one pass.
    let start = s.startTime, end = s.endTime, reg = base.hours, night = base.night;
    if (s.useNormalShift && !leave && !zero) {
      const h = normalShiftHours(employees.find(e => e.id === eid)?.position || '');
      start = '07:00'; end = normalShiftEnd(h); reg = calcHours(start, end); night = calcNightHours(start, end);
    }
    const startTime = leave ? '07:00' : zero ? '' : start; const endTime = leave ? '15:00' : zero ? '' : end;
    for (const ds of [...dates].sort()) {
      entries.push({
        employee_id: parseInt(eid), date: ds, start_time: startTime, end_time: endTime, regular_hours: dt ? 0 : reg, overtime_hours: 0, holiday_overtime_hours: dt ? reg : 0, nightshift_hours: night,
        standby_allowance: s.standby, nightshift_allowance: deriveNightshiftAllowanceFlag({ nightshift_hours: night, start_time: startTime, end_time: endTime, status: s.status }),
        total_hours: reg + night, status: s.status, notes: '', overtime_periods: [], callout_overtime_hours: 0, callout_count: 0,
      });
    }
  }
  return entries;
}
