// Calendar-date helpers that are timezone-safe.
//
// The trap these avoid: `new Date('2024-01-15T00:00:00')` parses as LOCAL midnight, and
// `.toISOString()` then converts to UTC — which rolls the date back a day in any UTC+
// timezone (e.g. Africa/Johannesburg, UTC+2). That made PPE expiry auto-calc land a day
// early. These work in plain year/month/day integers, never round-tripping through a
// timezone, so the result matches the backend (app/routers/*.py `_add_months`).

/** issue date (YYYY-MM-DD) + N months → expiry date (YYYY-MM-DD). Day overflow clamps to
 *  the last day of the target month (e.g. Aug 31 + 6mo → Feb 28/29). Empty input → ''. */
export function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return '';
  const [y, m, day] = dateStr.split('-').map(Number);
  if (!y || !m || !day) return '';
  const total = (m - 1) + months;          // 0-based month index, may exceed 11 / go negative
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;      // 0-based target month, normalized
  const lastDay = new Date(ny, nm + 1, 0).getDate();  // days in target month (day-only, TZ-safe)
  const nd = Math.min(day, lastDay);
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

/** Any Date → YYYY-MM-DD in its LOCAL calendar date — never `.toISOString().split('T')[0]`,
 *  which reads the UTC date and rolls a local-midnight Date back a day in any UTC+
 *  timezone. Use this for calendar/grid date keys (e.g. a timesheet period's day columns)
 *  so they match dates entered via <input type="date"> (which are already local, unshifted
 *  strings) instead of silently landing on the wrong day for UTC+ users. */
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's date as YYYY-MM-DD in the LOCAL timezone (not UTC, so it's never a day off). */
export function todayLocal(): string {
  return toLocalISODate(new Date());
}

/** Tomorrow at the given local time, as a datetime-local input value (YYYY-MM-DDTHH:MM). A default that is always in the future, for expected-return fields. */
export function tomorrowAt(hour = 16, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return `${toLocalISODate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** N days from today at the given local time, as a datetime-local input value. Powers return-date presets. */
export function daysFromNowAt(days: number, hour = 16, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return `${toLocalISODate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Whole days from today to `dateStr` (YYYY-MM-DD). Negative = in the past, 0 = today.
 *  Compares local midnight to local midnight, so it doesn't drift with the time of day or
 *  the UTC offset — unlike `(new Date(dateStr) - Date.now()) / 86400000`, which flips an
 *  item due *today* to "overdue" after midday. Drives expiry/overdue thresholds. */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const [y, m, day] = dateStr.split('-').map(Number);
  if (!y || !m || !day) return 0;
  const target = new Date(y, m - 1, day).getTime();     // local midnight of the target date
  const today = new Date(); today.setHours(0, 0, 0, 0); // local midnight today
  return Math.round((target - today.getTime()) / 86400000);
}
