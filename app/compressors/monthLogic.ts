// app/compressors/monthLogic.ts — one compressor's month at a glance, from its saved readings.
// A saved reading's daily hours are the change since the previous reading, so a reading after a gap carries every day
// of that gap: such a day is marked with how many days it covers rather than shown as one day's work. A day with no
// reading is "missing" (never zero), a day still to come is "future", and days before a unit's first reading are
// "before" (nothing was being recorded yet).
import type { ReadingRow } from './types';

export type DayState = 'reading' | 'missing' | 'future' | 'before';

export interface MonthDay {
  date: string;
  state: DayState;
  /** Hours since the previous reading (only on a reading day). */
  running: number | null;
  loaded: number | null;
  /** Days this reading covers: 1 normally, more after a gap. */
  span: number;
}

export interface MonthRow {
  days: MonthDay[];
  running: number;
  loaded: number;
  /** Loaded share of running hours this month, or null with no running hours. */
  loadedPct: number | null;
  /** Readings recorded this month, and the days that have passed (the whole month once it is over). */
  recorded: number;
  expected: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const dayNumber = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };

export interface RangeResult extends MonthRow {
  /** The reading behind each day, for the detail table (null where there is none). */
  rows: Array<ReadingRow | null>;
}

const addDays = (iso: string, by: number) => { const d = new Date(dayNumber(iso) * 86_400_000 + by * 86_400_000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
/** The Monday on or before a date (weeks run Monday to Sunday). */
export const weekStart = (iso: string) => { const wd = new Date(dayNumber(iso) * 86_400_000).getUTCDay(); return addDays(iso, -((wd + 6) % 7)); };
export { addDays };

/** Every day from `start` to `end` (inclusive, YYYY-MM-DD); `today` is the local day. `rows` may be in any order. */
export function buildRange(rows: ReadingRow[], start: string, end: string, today: string): RangeResult {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(sorted.map((r, i) => [r.date, i]));
  const first = sorted[0]?.date;
  const days: MonthDay[] = [];
  const detail: Array<ReadingRow | null> = [];
  let running = 0; let loaded = 0; let recorded = 0; let expected = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const i = byDate.get(date);
    if (date <= today) expected++;
    if (i === undefined) {
      days.push({ date, state: date > today ? 'future' : first && date < first ? 'before' : 'missing', running: null, loaded: null, span: 1 });
      detail.push(null);
      continue;
    }
    const row = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : undefined;
    const run = row.daily_running_hours ?? Math.max(0, row.total_running_hours - (prev?.total_running_hours ?? 0));
    const load = row.daily_loaded_hours ?? Math.max(0, row.total_loaded_hours - (prev?.total_loaded_hours ?? 0));
    const span = prev ? Math.max(1, dayNumber(row.date) - dayNumber(prev.date)) : 1;
    days.push({ date, state: 'reading', running: run, loaded: load, span });
    detail.push(row);
    running += run; loaded += load; recorded++;
  }
  return { days, rows: detail, running, loaded, loadedPct: running > 0 ? Math.round((loaded / running) * 100) : null, recorded, expected };
}

/** `month` is 1–12; `today` is the local YYYY-MM-DD. */
export function buildMonth(rows: ReadingRow[], year: number, month: number, today: string): MonthRow {
  return buildRange(rows, isoDay(year, month, 1), isoDay(year, month, daysInMonth(year, month)), today);
}

/** How strongly to shade a reading day: its average hours per day over a 24-hour day, from 0 to 1. */
export function intensity(day: MonthDay): number {
  if (day.state !== 'reading' || day.running == null) return 0;
  return Math.max(0, Math.min(1, day.running / day.span / 24));
}
