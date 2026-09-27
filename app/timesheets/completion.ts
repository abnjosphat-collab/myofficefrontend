import { toLocalISODate } from '@/lib/dates';

/** Count one filled cell per roster employee and working date, matching the denominator. */
export function countPeriodCompletion(
  employeeIds: string[],
  days: Date[],
  entries: { employee_id: number | string; date: string }[],
) {
  const roster = new Set(employeeIds.map(String));
  const workingDates = new Set(days.filter(day => day.getDay() !== 0 && day.getDay() !== 6).map(toLocalISODate));
  const filled = new Set(entries
    .filter(entry => roster.has(String(entry.employee_id)) && workingDates.has(entry.date))
    .map(entry => `${entry.employee_id}:${entry.date}`)).size;
  return { filled, possible: roster.size * workingDates.size };
}
