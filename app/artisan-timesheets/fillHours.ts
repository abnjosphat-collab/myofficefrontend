import { normalHrsForDayStatus } from './hourAlloc';
import type { ArtisanTimesheetDayRow } from './types';
import type { DayStatusKey } from './dayStatus';

export const HOUR_FIELDS = [
  'normal_hrs',
  'ot_15',
  'ot_20',
  'sb_15',
  'sb_20',
  'night_shift',
] as const satisfies readonly (keyof ArtisanTimesheetDayRow)[];

export type HourField = (typeof HOUR_FIELDS)[number];
export type FillColumn =
  | HourField
  | 'day_status'
  | 'on_standby'
  | 'sign_in_signature'
  | 'sign_out_signature';

export type FillTarget = FillColumn | 'all-hours';

export function extractHourFields(row: ArtisanTimesheetDayRow): Pick<ArtisanTimesheetDayRow, HourField> {
  return {
    normal_hrs: row.normal_hrs || 0,
    ot_15: row.ot_15 || 0,
    ot_20: row.ot_20 || 0,
    sb_15: row.sb_15 || 0,
    sb_20: row.sb_20 || 0,
    night_shift: row.night_shift || 0,
  };
}

/** Copy hour columns from source row to rows (source+1)…endIndex inclusive. */
export function fillHoursDown(
  rows: ArtisanTimesheetDayRow[],
  sourceIndex: number,
  endIndex: number,
): ArtisanTimesheetDayRow[] {
  if (sourceIndex < 0 || endIndex <= sourceIndex || sourceIndex >= rows.length) return rows;
  const cappedEnd = Math.min(endIndex, rows.length - 1);
  const hours = extractHourFields(rows[sourceIndex]);
  return rows.map((row, i) => {
    if (i <= sourceIndex || i > cappedEnd) return row;
    return { ...row, ...hours, _auto: false };
  });
}

/** Copy a single column value downward (Excel-style fill handle per column). */
export function fillColumnDown(
  rows: ArtisanTimesheetDayRow[],
  column: FillColumn,
  sourceIndex: number,
  endIndex: number,
): ArtisanTimesheetDayRow[] {
  if (sourceIndex < 0 || endIndex <= sourceIndex || sourceIndex >= rows.length) return rows;
  const cappedEnd = Math.min(endIndex, rows.length - 1);
  const value = rows[sourceIndex][column];
  return rows.map((row, i) => {
    if (i <= sourceIndex || i > cappedEnd) return row;
    const next = { ...row, [column]: value, _auto: false } as ArtisanTimesheetDayRow;
    if (column === 'day_status') {
      next.normal_hrs = normalHrsForDayStatus(value as DayStatusKey);
    }
    if (column === 'sign_in_signature') {
      next.sign_in_time = rows[sourceIndex].sign_in_time;
    }
    if (column === 'sign_out_signature') {
      next.sign_out_time = rows[sourceIndex].sign_out_time;
    }
    return next;
  });
}

export const FILL_COLUMN_LABELS: Record<FillColumn, string> = {
  day_status: 'Status',
  normal_hrs: 'Normal Hrs',
  ot_15: 'O/T @ 1.5',
  ot_20: 'O/T @ 2.0',
  sb_15: 'SB @ 1.5',
  sb_20: 'SB @ 2.0',
  night_shift: 'Night Shift',
  on_standby: 'Standby',
  sign_in_signature: 'Sign In Signature',
  sign_out_signature: 'Sign Out Signature',
};

export const FILL_TARGET_OPTIONS: { value: FillTarget; label: string }[] = [
  { value: 'all-hours', label: 'All hour columns' },
  ...Object.entries(FILL_COLUMN_LABELS).map(([value, label]) => ({
    value: value as FillColumn,
    label,
  })),
];
