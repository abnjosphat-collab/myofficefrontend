import type { DayStatusKey } from './dayStatus';

export const ON_DUTY_NORMAL_HRS = 10;
export const LEAVE_NORMAL_HRS = 8;

const LEAVE_STATUSES = new Set<DayStatusKey>([
  'leave', 'sick', 'special_leave', 'maternity', 'study', 'lieu',
]);

/** Normal hours credited for a given day-status selection. */
export function normalHrsForDayStatus(status: DayStatusKey): number {
  if (!status) return ON_DUTY_NORMAL_HRS;
  if (LEAVE_STATUSES.has(status)) return LEAVE_NORMAL_HRS;
  return 0;
}
