import { normalHrsForDayStatus } from './hourAlloc';
import type { ArtisanTimesheetDayRow } from './types';

export type DayStatusKey =
  | ''
  | 'off'
  | 'leave'
  | 'sick'
  | 'special_leave'
  | 'maternity'
  | 'study'
  | 'lieu'
  | 'absent'
  | 'training';

export const DAY_STATUS_OPTIONS: { value: DayStatusKey; label: string }[] = [
  { value: '', label: 'On Duty' },
  { value: 'off', label: 'Off' },
  { value: 'leave', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'special_leave', label: 'Special Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'study', label: 'Study Leave' },
  { value: 'lieu', label: 'Leave in Lieu' },
  { value: 'absent', label: 'Absent' },
  { value: 'training', label: 'Training' },
];

export const LEAVE_TYPE_TO_DAY_STATUS: Record<string, DayStatusKey> = {
  annual: 'leave',
  sick: 'sick',
  compassionate: 'special_leave',
  emergency: 'special_leave',
  maternity: 'maternity',
  study: 'study',
  lieu: 'lieu',
};

export function dayStatusLabel(status: DayStatusKey): string {
  return DAY_STATUS_OPTIONS.find(o => o.value === status)?.label ?? 'On Duty';
}

/** Apply status and the standard normal-hours credit (10h on duty, 8h leave, 0 off/absent). */
export function applyDayStatus(row: ArtisanTimesheetDayRow, status: DayStatusKey): ArtisanTimesheetDayRow {
  return {
    ...row,
    day_status: status,
    normal_hrs: normalHrsForDayStatus(status),
  };
}
