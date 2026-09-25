import type { StatusKey, TimesheetEntry } from './types';
import { DOUBLE_TIME_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';

/** Hours shown in a day cell. Payroll totals still come from calcEmployeeTotals. */
export function dayCellHours(entry: TimesheetEntry): { hours: number; isDT: boolean } | null {
  const isDT = DOUBLE_TIME_STATUSES.has(entry.status as StatusKey);
  const displayH = isDT ? (entry.holiday_overtime_hours || 0) : (entry.regular_hours || 0);
  if (ZERO_HOUR_STATUSES.has(entry.status) || displayH <= 0) return null;
  return { hours: displayH, isDT };
}

export function formatCellHours(hours: number): string {
  return hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
}
