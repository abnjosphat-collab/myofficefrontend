/** Shared clock ranges for timesheet / overtime forms (HH:mm, 24h). */

export type ShiftTimePreset = {
  id: string;
  /** Short label for chip buttons, e.g. "07–17". */
  label: string;
  /** Longer label for dropdowns. */
  description: string;
  start: string;
  end: string;
};

/** Default day shift — most employees on a public holiday who worked. */
export const DEFAULT_DAY_SHIFT_START = '07:00';
export const DEFAULT_DAY_SHIFT_END = '17:00';

export function defaultDayShiftTimes(): { start_time: string; end_time: string } {
  return { start_time: DEFAULT_DAY_SHIFT_START, end_time: DEFAULT_DAY_SHIFT_END };
}

export function isDefaultDayShiftTimes(start: string, end: string): boolean {
  return shiftTimesMatch(start, end, DEFAULT_DAY_SHIFT_START, DEFAULT_DAY_SHIFT_END);
}

/** Most-used ranges across the mine (OT tail, day shift, short evening OT). */
export const FREQUENT_SHIFT_TIME_PRESETS: ShiftTimePreset[] = [
  { id: 'day-07-17', label: '07–17', description: 'Day shift · 07:00 – 17:00', start: DEFAULT_DAY_SHIFT_START, end: DEFAULT_DAY_SHIFT_END },
  { id: 'ot-04-06', label: '04–06', description: 'Early morning · 04:00 – 06:00', start: '04:00', end: '06:00' },
  { id: 'ot-17-19', label: '17–19', description: 'Evening · 17:00 – 19:00', start: '17:00', end: '19:00' },
  { id: 'ot-17-18', label: '17–18', description: 'Evening · 17:00 – 18:00', start: '17:00', end: '18:00' },
];

/** Extra bulk-assign presets on the timesheet grid (role “normal shift” stays separate). */
export const TIMESHEET_BULK_EXTRA_PRESETS: ShiftTimePreset[] = [
  { id: 'day-07-16', label: '7–4', description: '07:00 – 16:00 (9h)', start: '07:00', end: '16:00' },
  { id: 'day-06-18', label: '6–6', description: '06:00 – 18:00 (12h)', start: '06:00', end: '18:00' },
  { id: 'day-07-15', label: '7–3', description: '07:00 – 15:00 (8h)', start: '07:00', end: '15:00' },
  { id: 'night-18-06', label: 'Night', description: 'Night · 18:00 – 06:00', start: '18:00', end: '06:00' },
];

export const TIMESHEET_BULK_SHIFT_PRESETS: ShiftTimePreset[] = [
  ...FREQUENT_SHIFT_TIME_PRESETS,
  ...TIMESHEET_BULK_EXTRA_PRESETS,
];

export const CUSTOM_SHIFT_PRESET_ID = '__custom__';

export function normalizeClockTime(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  const [h, m = '0'] = v.split(':');
  const hh = Number(h);
  const mm = Number(m);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return v;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function shiftTimesMatch(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return normalizeClockTime(aStart) === normalizeClockTime(bStart)
    && normalizeClockTime(aEnd) === normalizeClockTime(bEnd);
}

export function findShiftTimePresetId(
  start: string,
  end: string,
  presets: ShiftTimePreset[] = FREQUENT_SHIFT_TIME_PRESETS,
): string | null {
  const hit = presets.find(p => shiftTimesMatch(start, end, p.start, p.end));
  return hit?.id ?? null;
}
