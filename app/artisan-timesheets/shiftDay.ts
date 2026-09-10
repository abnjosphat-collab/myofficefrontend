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

/** Shift date for an overtime record — uses start_time when present. */
export function overtimeShiftDate(ot: ApprovedOvertimeRecord): string | null {
  if (!ot.date) return null;
  if (ot.start_time) return shiftDateForClock(ot.date, ot.start_time) ?? ot.date;
  return ot.date;
}

export function groupOvertimeByShift(
  records: ApprovedOvertimeRecord[],
  employeeMineNo: string,
): Map<string, ApprovedOvertimeRecord[]> {
  const map = new Map<string, ApprovedOvertimeRecord[]>();
  for (const ot of records) {
    if (ot.status !== 'approved' || ot.employee_id !== employeeMineNo) continue;
    const shift = overtimeShiftDate(ot);
    if (!shift) continue;
    const list = map.get(shift) ?? [];
    list.push(ot);
    map.set(shift, list);
  }
  return map;
}

export interface ShiftSignTimes {
  signIn: string;
  signOut: string;
}

/** Earliest OT start and latest OT end on this shift (for sign-in / sign-out columns). */
export function signTimesFromOvertime(entries: ApprovedOvertimeRecord[]): ShiftSignTimes | null {
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;
  let signIn = '';
  let signOut = '';

  for (const ot of entries) {
    if (!ot.start_time || !ot.end_time) continue;
    const start = parseClockTime(ot.start_time);
    let end = parseClockTime(ot.end_time);
    if (start == null || end == null) continue;
    if (end <= start) end += 24 * 60;

    if (earliestStart == null || start < earliestStart) {
      earliestStart = start;
      signIn = ot.start_time.trim();
    }
    if (latestEnd == null || end > latestEnd) {
      latestEnd = end;
      signOut = ot.end_time.trim();
    }
  }

  if (!signIn || !signOut) return null;
  return { signIn, signOut };
}
