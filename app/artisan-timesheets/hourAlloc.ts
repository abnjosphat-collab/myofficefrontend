import type { DayStatusKey } from './dayStatus';

export const LEAVE_NORMAL_HRS = 8;

const LEAVE_STATUSES = new Set<DayStatusKey>([
  'leave', 'sick', 'special_leave', 'maternity', 'study', 'lieu',
]);

/** Normal hours credited for a given day-status selection. Artisans are on basic
 *  pay, so only leave days credit normal hours (8h) — on-duty days credit none. */
export function normalHrsForDayStatus(status: DayStatusKey): number {
  if (!status) return 0;
  if (LEAVE_STATUSES.has(status)) return LEAVE_NORMAL_HRS;
  return 0;
}
