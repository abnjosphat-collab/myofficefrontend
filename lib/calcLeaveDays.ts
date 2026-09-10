// lib/calcLeaveDays.ts — inclusive leave-day counting with optional weekend/holiday
// exclusion (Zimbabwe public holidays via zimHolidays.ts).

import { toLocalISODate } from './dates';
import { zimHolidayName } from './zimHolidays';

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Inclusive calendar days between two YYYY-MM-DD dates. */
export function calcCalendarLeaveDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** True for Mon–Fri that are not Zimbabwe public holidays. */
export function isWorkingLeaveDay(dateStr: string): boolean {
  const d = parseISODate(dateStr);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  return !zimHolidayName(dateStr);
}

/** Inclusive working days only — skips weekends and ZW public holidays. */
export function calcWorkingLeaveDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  let count = 0;
  const cur = parseISODate(start);
  const endD = parseISODate(end);
  if (endD < cur) return 0;
  while (cur <= endD) {
    if (isWorkingLeaveDay(toLocalISODate(cur))) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function calcLeaveDays(
  start?: string | null,
  end?: string | null,
  options?: { excludeWeekendsAndHolidays?: boolean },
): number {
  if (options?.excludeWeekendsAndHolidays) {
    return calcWorkingLeaveDays(start, end);
  }
  return calcCalendarLeaveDays(start, end);
}

/** @deprecated Use calcLeaveDays — kept for existing imports. */
export function calcDays(
  start?: string | null,
  end?: string | null,
  excludeWeekendsAndHolidays = false,
): number {
  return calcLeaveDays(start, end, { excludeWeekendsAndHolidays });
}
