// app/timesheets/entryForm.ts — the rules behind the single-day entry dialog, as pure functions so they are tested rather than buried in
// effects: the form a day opens with, what changing the status or the times does to the hours, and the entry that is saved. Overtime is
// not entered here (it comes from the Overtime module), so this only writes a day's own hours, callout hours and allowances.
import { DEFAULT_DAY_SHIFT_END, DEFAULT_DAY_SHIFT_START, isDefaultDayShiftTimes } from '@/lib/shiftTimePresets';
import { DOUBLE_TIME_STATUSES, LEAVE_STATUSES, ZERO_HOUR_STATUSES, calcNightHours, deriveNightshiftAllowanceFlag } from './calcTotals';
import { calcHours, fmtDate } from './timesheetMeta';
import type { EntryForm, StatusKey, TimesheetEntry } from './types';

/** What the form does once the status or the times change: leave and zero-hour days keep their fixed hours; a paid holiday given real shift
 *  times becomes a worked public holiday (2.0×); otherwise the hours follow the times. The one rule the old dialog kept in an effect. */
export function settle(form: EntryForm): EntryForm {
  if (ZERO_HOUR_STATUSES.has(form.status)) return form;
  if (form.status === 'holiday_paid') {
    if (form.start_time && form.end_time && !isDefaultDayShiftTimes(form.start_time, form.end_time)) return settle({ ...form, status: 'holiday' });
    return form;
  }
  if (!form.start_time || !form.end_time) return form;
  const night = calcNightHours(form.start_time, form.end_time);
  return {
    ...form, regular_hours: calcHours(form.start_time, form.end_time), nightshift_hours: night,
    nightshift_allowance: deriveNightshiftAllowanceFlag({ nightshift_hours: night, start_time: form.start_time, end_time: form.end_time, status: form.status }),
  };
}

/** The form a day opens with. With no entry, a public holiday starts as "not worked" (8 paid hours), a weekend as a worked 2.0× day. */
export function initialForm(entry: TimesheetEntry | undefined, date: Date, holidayName: string | null | undefined): EntryForm {
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const status: StatusKey = entry?.status || (holidayName ? 'holiday_paid' : weekend ? 'weekend' : 'work');
  return settle({
    start_time: entry?.start_time ?? DEFAULT_DAY_SHIFT_START, end_time: entry?.end_time ?? DEFAULT_DAY_SHIFT_END, regular_hours: entry?.regular_hours ?? (status === 'holiday_paid' ? 8 : 10),
    nightshift_hours: entry?.nightshift_hours ?? 0, status, standby_allowance: entry?.standby_allowance ?? false, nightshift_allowance: entry?.nightshift_allowance ?? false, notes: entry?.notes || '',
    callout_overtime_hours: entry?.callout_overtime_hours ?? 0, callout_count: entry?.callout_count ?? 0,
  });
}

/** Choosing a status: leave gets 8 hours on the standard shift, off and absent get none, a paid holiday gets its fixed 8, a worked holiday the standard shift. */
export function withStatus(form: EntryForm, status: StatusKey): EntryForm {
  if (LEAVE_STATUSES.has(status)) return settle({ ...form, status, start_time: '07:00', end_time: '15:00' });
  if (ZERO_HOUR_STATUSES.has(status)) return { ...form, status, regular_hours: 0, nightshift_hours: 0, start_time: '', end_time: '' };
  if (status === 'holiday_paid') return { ...form, status, regular_hours: 8, nightshift_hours: 0, start_time: DEFAULT_DAY_SHIFT_START, end_time: DEFAULT_DAY_SHIFT_END };
  if (status === 'holiday') return settle({ ...form, status, start_time: DEFAULT_DAY_SHIFT_START, end_time: DEFAULT_DAY_SHIFT_END });
  return settle({ ...form, status });
}
export const withTimes = (form: EntryForm, start_time: string, end_time: string): EntryForm => settle({ ...form, start_time, end_time });
export const entryTotal = (f: EntryForm): number => f.regular_hours + f.nightshift_hours + f.callout_overtime_hours;

/** What stops a save. */
export function entryProblems(f: EntryForm): string[] {
  const out: string[] = [];
  if (!LEAVE_STATUSES.has(f.status) && !ZERO_HOUR_STATUSES.has(f.status) && (!f.start_time || !f.end_time)) out.push('Enter the start and end times.');
  if (f.callout_overtime_hours < 0 || f.callout_count < 0) out.push('Callout hours and the number of callouts cannot be negative.');
  if (f.callout_overtime_hours > 24) out.push('Callout hours cannot be more than 24 in a day.');
  return out;
}

/** The entry that is saved. A double-time day writes its hours as 2.0× (holiday overtime) with no regular hours. */
export function toEntry(f: EntryForm, employeeId: number, date: Date): Omit<TimesheetEntry, 'id'> {
  const dt = DOUBLE_TIME_STATUSES.has(f.status);
  return {
    employee_id: employeeId, date: fmtDate(date), start_time: f.start_time, end_time: f.end_time, regular_hours: dt ? 0 : f.regular_hours, overtime_hours: 0, holiday_overtime_hours: dt ? f.regular_hours : 0,
    nightshift_hours: f.nightshift_hours, standby_allowance: f.standby_allowance,
    nightshift_allowance: deriveNightshiftAllowanceFlag({ nightshift_hours: f.nightshift_hours, start_time: f.start_time, end_time: f.end_time, status: f.status }),
    total_hours: entryTotal(f), status: f.status, notes: f.notes, overtime_periods: [], callout_overtime_hours: f.callout_overtime_hours, callout_count: f.callout_count,
  };
}
