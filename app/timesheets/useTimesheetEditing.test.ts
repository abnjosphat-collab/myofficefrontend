import { describe, expect, it } from 'vitest';
import { previousPeriodEntries } from './useTimesheetEditing';
import { getDays } from './timesheetMeta';
import type { Employee, TimesheetEntry } from './types';

const emp = (id: string): Employee => ({ id, employeeId: `C${id}`, name: `E${id}`, position: 'Fitter', department: 'M', email: '', is_active: true, employmentType: 'NEC' });
const ts = (employee_id: number, date: string, over: Partial<TimesheetEntry> = {}): TimesheetEntry => ({ id: 9, employee_id, date, status: 'work', regular_hours: 10, ...over });

describe('previousPeriodEntries', () => {
  const prevDays = getDays({ start: new Date(2026, 7, 13), end: new Date(2026, 8, 12) }); // 31 days
  const curDays = getDays({ start: new Date(2026, 8, 13), end: new Date(2026, 9, 12) });   // 30 days
  it('copies each day onto the same position of the new period, without the old id', () => {
    const out = previousPeriodEntries({ previous: [ts(1, '2026-08-13'), ts(1, '2026-08-15', { status: 'off', regular_hours: 0 })], employees: [emp('1')], currentDays: curDays, previousDays: prevDays });
    expect(out.map(e => [e.date, e.status, (e as TimesheetEntry).id])).toEqual([['2026-09-13', 'work', undefined], ['2026-09-15', 'off', undefined]]);
  });
  it('copies only for the people on the roster, and ignores days the new period does not have', () => {
    const previous = [ts(1, '2026-09-12'), ts(2, '2026-08-13')];
    expect(previousPeriodEntries({ previous, employees: [emp('2')], currentDays: curDays, previousDays: prevDays }).map(e => e.employee_id)).toEqual([2]);
    // the 31st day of the old period has no counterpart in a 30-day period
    expect(previousPeriodEntries({ previous: [ts(1, '2026-09-12')], employees: [emp('1')], currentDays: curDays, previousDays: prevDays })).toEqual([]);
  });
});
