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

/** Today's date as YYYY-MM-DD in the LOCAL timezone (not UTC, so it's never a day off). */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
