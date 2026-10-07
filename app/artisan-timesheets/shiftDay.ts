import { toLocalISODate } from '@/lib/dates';
import type { ApprovedOvertimeRecord } from '@/app/timesheets/types';

/** Artisan shifts roll at 07:00 — work before 07:00 belongs to the previous shift day. */
export const SHIFT_START_HOUR = 7;

export function parseClockTime(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatClockTime(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function addCalendarDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toLocalISODate(dt);
}

/**
 * Map a calendar date + wall-clock time to the shift date row it belongs on.
 * e.g. 2024-08-02 @ 05:00 → shift 2024-08-01 (window started 07:00 on the 1st).
 */
export function shiftDateForClock(calendarDate: string, clockTime: string): string | null {
  const mins = parseClockTime(clockTime);
  if (mins == null) return null;
  if (mins >= SHIFT_START_HOUR * 60) return calendarDate;
  return addCalendarDays(calendarDate, -1);
}

/** The calendar-day part of a date value, tolerant of datetime suffixes ('2026-09-02T00:00:00' → '2026-09-02'). */
export function dayPart(value: string | undefined | null): string {
  return (value ?? '').slice(0, 10);
}

/** Employee numbers match loosely — a code typed with a stray space or different case is still the same person. */
export function sameEmployee(a: string | undefined | null, b: string | undefined | null): boolean {
  return (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
}

/** Overtime that counts toward the timesheet: approved, or approved-and-paid (payroll ran; the hours were still worked). */
export function isCreditedOvertimeStatus(status: string): boolean {
  return status === 'approved' || status === 'paid';
}

/** Shift date for an overtime record — uses start_time when present. */
export function overtimeShiftDate(ot: ApprovedOvertimeRecord): string | null {
  const date = dayPart(ot.date);
  if (!date) return null;
  if (ot.start_time) return shiftDateForClock(date, ot.start_time) ?? date;
  return date;
}

function groupByShift(records: ApprovedOvertimeRecord[]): Map<string, ApprovedOvertimeRecord[]> {
  const map = new Map<string, ApprovedOvertimeRecord[]>();
  for (const ot of records) {
    const shift = overtimeShiftDate(ot);
    if (!shift) continue;
    const list = map.get(shift) ?? [];
    list.push(ot);
    map.set(shift, list);
  }
  return map;
}

export function groupOvertimeByShift(
  records: ApprovedOvertimeRecord[],
  employeeMineNo: string,
): Map<string, ApprovedOvertimeRecord[]> {
  return groupByShift(records.filter(ot => isCreditedOvertimeStatus(ot.status) && sameEmployee(ot.employee_id, employeeMineNo)));
}

/** Overtime awaiting approval, by shift day — shown on the timesheet, never counted in its totals. */
export function groupPendingOvertimeByShift(
  records: ApprovedOvertimeRecord[],
  employeeMineNo: string,
): Map<string, ApprovedOvertimeRecord[]> {
  return groupByShift(records.filter(ot => ot.status === 'pending' && sameEmployee(ot.employee_id, employeeMineNo)));
}

export interface ShiftSignTimes {
  signIn: string;
  signOut: string;
}

/** First OT start and last OT end on this shift (for sign-in / sign-out columns), compared on the shift's own
 *  timeline: a record dated the next morning (rolled into this shift) sits past the 24h mark, so a 00:00 start never
 *  beats the evening's 17:00 and a 01:23 end never loses to 23:59. */
export function signTimesFromOvertime(entries: ApprovedOvertimeRecord[], shiftDate: string): ShiftSignTimes | null {
  const shift = dayPart(shiftDate);
  let bestIn: { at: number; text: string } | null = null;
  let bestOut: { at: number; text: string } | null = null;

  for (const ot of entries) {
    if (!ot.start_time || !ot.end_time) continue;
    const start = parseClockTime(ot.start_time);
    const end = parseClockTime(ot.end_time);
    if (start == null || end == null) continue;
    const dayOffset = ot.date && dayPart(ot.date) > shift ? 24 * 60 : 0;
    const startAt = dayOffset + start;
    let endAt = dayOffset + end;
    if (endAt <= startAt) endAt += 24 * 60;

    if (!bestIn || startAt < bestIn.at) bestIn = { at: startAt, text: ot.start_time.trim() };
    if (!bestOut || endAt > bestOut.at) bestOut = { at: endAt, text: ot.end_time.trim() };
  }

  if (!bestIn || !bestOut) return null;
  return { signIn: bestIn.text, signOut: bestOut.text };
}
