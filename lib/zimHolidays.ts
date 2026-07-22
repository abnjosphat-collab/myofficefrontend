// Zimbabwe public holidays (Public Holidays Act), computed per calendar year so the
// Easter-based and "nth weekday" ones (Heroes'/Defence Forces Day) land correctly every
// year without a hardcoded table needing yearly upkeep. All date math is done with local
// Date getters (never toISOString) — see lib/dates.ts for why that matters for UTC+ users.

import { toLocalISODate } from './dates';

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** The nth (1-based) occurrence of `weekday` (0=Sun..6=Sat) in `month` (1-based) of `year`. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return addDays(first, offset + (n - 1) * 7);
}

export interface ZimHoliday { date: string; name: string; }

/** All Zimbabwe public holidays falling in `year`, sorted by date. */
export function getZimHolidays(year: number): ZimHoliday[] {
  const easter = easterSunday(year);
  const heroes = nthWeekdayOfMonth(year, 8, 1, 2); // 2nd Monday of August

  const holidays: ZimHoliday[] = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-02-21`, name: 'Robert Gabriel Mugabe National Youth Day' },
    { date: toLocalISODate(addDays(easter, -2)), name: 'Good Friday' },
    { date: toLocalISODate(addDays(easter, -1)), name: 'Easter Saturday' },
    { date: toLocalISODate(addDays(easter, 1)), name: 'Easter Monday' },
    { date: `${year}-04-18`, name: 'Independence Day' },
    { date: `${year}-05-01`, name: "Workers' Day" },
    { date: `${year}-05-25`, name: 'Africa Day' },
    { date: toLocalISODate(heroes), name: "Heroes' Day" },
    { date: toLocalISODate(addDays(heroes, 1)), name: 'Defence Forces Day' },
    { date: `${year}-12-22`, name: 'Unity Day' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
    { date: `${year}-12-26`, name: 'Boxing Day' },
  ];
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** Cache of year → date(YYYY-MM-DD) → holiday name, built lazily per year touched. */
const cache = new Map<number, Map<string, string>>();

function yearMap(year: number): Map<string, string> {
  let m = cache.get(year);
  if (!m) {
    m = new Map(getZimHolidays(year).map(h => [h.date, h.name]));
    cache.set(year, m);
  }
  return m;
}

/** Holiday name for a YYYY-MM-DD date, or null if it isn't a Zimbabwe public holiday. */
export function zimHolidayName(dateStr: string): string | null {
  const year = Number(dateStr.slice(0, 4));
  if (!year) return null;
  return yearMap(year).get(dateStr) ?? null;
}
