import { toLocalISODate } from '@/lib/dates';
import type { ArtisanTimesheetDayRow, ArtisanTimesheetTotals } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function dayLabelForDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export function emptyDayRow(dateStr: string): ArtisanTimesheetDayRow {
  return {
    date: dateStr,
    day: dayLabelForDate(dateStr),
    day_status: '',
    normal_hrs: 0,
    ot_15: 0,
    ot_20: 0,
    sb_15: 0,
    sb_20: 0,
    night_shift: 0,
    on_standby: false,
    sign_in_time: '',
    sign_in_signature: '',
    sign_out_time: '',
    sign_out_signature: '',
    comments: '',
  };
}

/** Ensure rows loaded from older saves have new fields. */
export function normalizeDayRow(row: ArtisanTimesheetDayRow): ArtisanTimesheetDayRow {
  return {
    ...emptyDayRow(row.date),
    ...row,
    day: dayLabelForDate(row.date),
    day_status: row.day_status ?? '',
    on_standby: row.on_standby ?? false,
  };
}

/** One row per calendar day in the given month (local timezone). */
export function buildMonthDayRows(year: number, month: number): ArtisanTimesheetDayRow[] {
  const rows: ArtisanTimesheetDayRow[] = [];
  const cursor = new Date(year, month - 1, 1);
  while (cursor.getMonth() === month - 1) {
    rows.push(emptyDayRow(toLocalISODate(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

/** Merge saved rows onto a full month scaffold — keeps edits for known dates. */
export function mergeMonthRows(
  year: number,
  month: number,
  saved: ArtisanTimesheetDayRow[],
): ArtisanTimesheetDayRow[] {
  const byDate = new Map(saved.map(r => [r.date, r]));
  return buildMonthDayRows(year, month).map(scaffold => {
    const existing = byDate.get(scaffold.date);
    if (!existing) return scaffold;
    return normalizeDayRow({ ...scaffold, ...existing });
  });
}

export function calcArtisanTimesheetTotals(rows: ArtisanTimesheetDayRow[]): ArtisanTimesheetTotals {
  return rows.reduce<ArtisanTimesheetTotals>(
    (acc, row) => ({
      normal_hrs: acc.normal_hrs + (row.normal_hrs || 0),
      ot_15: acc.ot_15 + (row.ot_15 || 0),
      ot_20: acc.ot_20 + (row.ot_20 || 0),
      sb_15: acc.sb_15 + (row.sb_15 || 0),
      sb_20: acc.sb_20 + (row.sb_20 || 0),
      night_shift: acc.night_shift + (row.night_shift || 0),
    }),
    { normal_hrs: 0, ot_15: 0, ot_20: 0, sb_15: 0, sb_20: 0, night_shift: 0 },
  );
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-GB', { month: 'long' });
}

export function parseNumericField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
