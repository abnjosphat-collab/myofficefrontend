// app/shifts/shiftMeta.ts — the vocabulary of the shifts page: shift patterns, day statuses, timing presets and schedule
// event types, each as words plus a tone (colour is never the only signal). Pure data.
import type { Tone } from '@/components/ui-system';
import type { DayStatus, EventType, ShiftType } from './types';

export const SHIFT_PATTERNS: Record<ShiftType, { label: string; tone: Tone; on: number; off: number }> = {
  '10-4': { label: '10-4 cycle', tone: 'info', on: 10, off: 4 },
  '5-2': { label: '5-2 cycle', tone: 'success', on: 5, off: 2 },
  standby: { label: 'Standby', tone: 'warning', on: 0, off: 0 },
  custom: { label: 'Custom', tone: 'brand', on: 0, off: 0 },
};
/** An unrecognised shift type (legacy or malformed data) is shown as the 10-4 cycle rather than crashing the page. */
export const patternOf = (type: string) => SHIFT_PATTERNS[type as ShiftType] ?? SHIFT_PATTERNS['10-4'];

export const DAY_STATUS: Record<DayStatus, { label: string; short: string; tone: Tone }> = {
  on: { label: 'On duty', short: 'ON', tone: 'success' },
  off: { label: 'Off duty', short: '—', tone: 'neutral' },
  standby: { label: 'Standby', short: 'SBY', tone: 'warning' },
  'on+standby': { label: 'On duty and standby', short: 'ON+S', tone: 'info' },
};
export const STATUS_KEYS = ['on', 'on+standby', 'off', 'standby'] as const;

export const TIMING_PRESETS: Record<string, { label: string; abbr: string; hours: string }> = {
  day: { label: 'Day shift', abbr: 'D', hours: '07:00–17:00' },
  morning: { label: 'Morning shift', abbr: 'AM', hours: '06:00–14:00' },
  afternoon: { label: 'Afternoon shift', abbr: 'PM', hours: '14:00–22:00' },
  night: { label: 'Night shift', abbr: 'N', hours: '22:00–06:00' },
  custom: { label: 'Custom', abbr: 'CX', hours: '' },
};
export const TIMING_KEYS = ['day', 'morning', 'afternoon', 'night'] as const;

export const EVENT_TYPES: Record<EventType, { label: string; abbr: string; tone: Tone; defaultStatus: DayStatus | null; showTiming: boolean }> = {
  annual_leave: { label: 'Annual leave', abbr: 'AL', tone: 'neutral', defaultStatus: 'off', showTiming: false },
  sick_leave: { label: 'Sick leave', abbr: 'SL', tone: 'neutral', defaultStatus: 'off', showTiming: false },
  special_leave: { label: 'Special leave', abbr: 'SPL', tone: 'neutral', defaultStatus: 'off', showTiming: false },
  public_holiday: { label: 'Public holiday', abbr: 'PH', tone: 'danger', defaultStatus: 'off', showTiming: false },
  work_off_day: { label: 'Working on an off day', abbr: 'W+', tone: 'success', defaultStatus: 'on', showTiming: true },
  defer_off: { label: 'Deferred day off', abbr: 'DEF', tone: 'warning', defaultStatus: 'on', showTiming: true },
  overtime: { label: 'Overtime', abbr: 'OT', tone: 'success', defaultStatus: 'on', showTiming: true },
  training: { label: 'Training or course', abbr: 'TR', tone: 'info', defaultStatus: null, showTiming: false },
  timing: { label: 'Timing change', abbr: 'TC', tone: 'info', defaultStatus: null, showTiming: true },
  custom: { label: 'Custom override', abbr: 'CX', tone: 'neutral', defaultStatus: null, showTiming: true },
};
export const eventOf = (type: string) => EVENT_TYPES[type as EventType] ?? EVENT_TYPES.custom;

/** A leave type from the leave register, as the schedule event it should look like. */
const LEAVE_TO_EVENT: Record<string, EventType> = { 'annual leave': 'annual_leave', 'sick leave': 'sick_leave', 'special leave': 'special_leave', 'public holiday': 'public_holiday', annual: 'annual_leave', sick: 'sick_leave', compassionate: 'special_leave' };
export const leaveEventType = (leaveType: string): EventType => LEAVE_TO_EVENT[(leaveType || '').toLowerCase()] ?? 'custom';

export const TONE_CELL: Record<Tone, string> = {
  success: 'border-success-line bg-success-soft text-success',
  warning: 'border-warning-line bg-warning-soft text-warning',
  danger: 'border-danger-line bg-danger-soft text-danger',
  info: 'border-info-line bg-info-soft text-info',
  brand: 'border-transparent bg-action-soft text-action',
  neutral: 'border-neutral-line bg-neutral-soft text-neutral',
};
