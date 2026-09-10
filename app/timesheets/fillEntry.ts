import { toLocalISODate } from '@/lib/dates';
import { zimHolidayName } from '@/lib/zimHolidays';
import type { Employee, StatusKey, TimesheetEntry } from './types';

/** Role-based normal shift length — mirrors page.tsx normalShiftHours. */
export function normalShiftHours(position: string): 8 | 10 {
  return /lamp\s*room|compressor/i.test(position) ? 8 : 10;
}

function timeFromHours(startHHMM: string, hours: number): string {
  const [h, m] = startHHMM.split(':').map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Default entry for the grid's quick-add / empty-cell fill (same rules as handleQuickAdd). */
export function buildDefaultEntry(emp: Pick<Employee, 'id' | 'position'>, day: Date): Omit<TimesheetEntry, 'id'> {
  const ds = toLocalISODate(day);
  const holiday = zimHolidayName(ds);
  const status: StatusKey = holiday ? 'holiday_paid' : (day.getDay() === 0 || day.getDay() === 6) ? 'weekend' : 'work';
  const hours = status === 'holiday_paid' ? 8 : normalShiftHours(emp.position);
  return {
    employee_id: parseInt(emp.id),
    date: ds,
    status,
    start_time: status === 'holiday_paid' ? '' : '07:00',
    end_time: status === 'holiday_paid' ? '' : timeFromHours('07:00', hours),
    regular_hours: hours,
    overtime_hours: 0,
    holiday_overtime_hours: 0,
    nightshift_hours: 0,
    standby_allowance: false,
    nightshift_allowance: false,
    total_hours: hours,
    notes: '',
    overtime_periods: [],
    callout_overtime_hours: 0,
    callout_count: 0,
  };
}

/** Clone a grid entry onto another date (creates real rows from templates or _auto projections). */
export function cloneEntryForDate(
  source: TimesheetEntry,
  empId: number,
  targetDate: string,
): Omit<TimesheetEntry, 'id'> {
  const { id: _id, _auto, ...rest } = source;
  const notes = rest.notes?.startsWith('Auto:') ? '' : (rest.notes || '');
  return {
    ...rest,
    employee_id: empId,
    date: targetDate,
    notes,
    overtime_periods: rest.overtime_periods ?? [],
    callout_overtime_hours: rest.callout_overtime_hours ?? 0,
    callout_count: rest.callout_count ?? 0,
  };
}

export function fillTargetDayIndices(sourceIndex: number, endIndex: number): number[] {
  const lo = Math.min(sourceIndex, endIndex);
  const hi = Math.max(sourceIndex, endIndex);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) {
    if (i !== sourceIndex) out.push(i);
  }
  return out;
}
