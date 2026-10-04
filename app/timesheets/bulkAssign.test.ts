import { describe, expect, it } from 'vitest';
import { buildBulkEntries, datesInRange, estimatedHours, missingOnDays, normalShiftBreakdown, perDay, weekDates, weekdayDates } from './bulkAssign';
import { getDays } from './timesheetMeta';
import type { Employee, TimesheetEntry } from './types';

const emp = (id: string, position = 'Fitter'): Employee => ({ id, employeeId: `C${id}`, name: `E${id}`, position, department: 'Maint', email: '', is_active: true, employmentType: 'NEC' });
const EMPS = [emp('1'), emp('2', 'Lamp Room Attendant'), emp('3')];
const SEP = getDays({ start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }); // Tue 1 Sep to Wed 30 Sep
const WORK = { status: 'work' as const, startTime: '07:00', endTime: '17:00', useNormalShift: false, standby: false };

describe('choosing days', () => {
  it('selects a range inside the period, leaving out weekends when asked', () => {
    expect(datesInRange(SEP, '2026-09-04', '2026-09-08', false)).toEqual(['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08']);
    expect(datesInRange(SEP, '2026-09-04', '2026-09-08', true)).toEqual(['2026-09-04', '2026-09-07', '2026-09-08']);
    expect(datesInRange(SEP, '2026-08-25', '2026-09-02', false)).toEqual(['2026-09-01', '2026-09-02']);
  });
  it('picks the weekdays, and weeks of seven days with the last running to the end', () => {
    expect(weekdayDates(SEP)).toHaveLength(22);
    expect(weekDates(SEP, 0, false)).toHaveLength(7);
    expect(weekDates(SEP, 3, false)).toHaveLength(9); // 22 to 30 Sep
    expect(weekDates([], 0, false)).toEqual([]);
  });
  it('finds who has no entry on any of the chosen days', () => {
    const ts = [{ employee_id: 1, date: '2026-09-07', status: 'work', regular_hours: 10 }] as TimesheetEntry[];
    expect(missingOnDays(EMPS, ts, ['2026-09-07']).map(e => e.id)).toEqual(['2', '3']);
    expect(missingOnDays(EMPS, ts, ['2026-09-07', '2026-09-08']).map(e => e.id)).toEqual(['2', '3']);
  });
});

describe('normal shift by role', () => {
  it('groups the people chosen by their normal shift, longest first', () => { expect(normalShiftBreakdown(['1', '2', '3'], EMPS)).toEqual([[10, 2], [8, 1]]); });
  it('works out the hours a day gives', () => {
    expect(perDay(WORK)).toEqual({ hours: 10, night: 0 });
    expect(perDay({ ...WORK, status: 'sick' })).toEqual({ hours: 8, night: 0 });
    expect(perDay({ ...WORK, status: 'off' })).toEqual({ hours: 0, night: 0 });
    expect(perDay({ ...WORK, startTime: '18:00', endTime: '06:00' })).toEqual({ hours: 12, night: 12 });
  });
  it('estimates the hours of a selection', () => {
    expect(estimatedHours(WORK, ['1', '2'], EMPS, 3)).toBe(60);
    expect(estimatedHours({ ...WORK, useNormalShift: true }, ['1', '2'], EMPS, 3)).toBe((10 + 8) * 3);
  });
});

describe('the entries written', () => {
  it('writes one entry for every person and date, in date order', () => {
    const e = buildBulkEntries({ employeeIds: ['1', '3'], dates: ['2026-09-08', '2026-09-07'], settings: WORK, employees: EMPS });
    expect(e.map(x => `${x.employee_id}:${x.date}`)).toEqual(['1:2026-09-07', '1:2026-09-08', '3:2026-09-07', '3:2026-09-08']);
    expect(e[0]).toMatchObject({ regular_hours: 10, holiday_overtime_hours: 0, start_time: '07:00', end_time: '17:00', status: 'work', total_hours: 10 });
  });
  it('gives each person their own role length in normal-shift mode', () => {
    const e = buildBulkEntries({ employeeIds: ['1', '2'], dates: ['2026-09-07'], settings: { ...WORK, useNormalShift: true }, employees: EMPS });
    expect(e.map(x => [x.employee_id, x.regular_hours, x.end_time])).toEqual([[1, 10, '17:00'], [2, 8, '15:00']]);
  });
  it('writes leave as 8 hours on the standard shift, and off with no times', () => {
    const leave = buildBulkEntries({ employeeIds: ['1'], dates: ['2026-09-07'], settings: { ...WORK, status: 'leave' }, employees: EMPS })[0];
    expect(leave).toMatchObject({ regular_hours: 8, start_time: '07:00', end_time: '15:00' });
    const off = buildBulkEntries({ employeeIds: ['1'], dates: ['2026-09-07'], settings: { ...WORK, status: 'off' }, employees: EMPS })[0];
    expect(off).toMatchObject({ regular_hours: 0, start_time: '', end_time: '' });
  });
  it('writes a double-time day as 2.0× hours with no regular hours, and carries the standby flag', () => {
    const e = buildBulkEntries({ employeeIds: ['1'], dates: ['2026-09-12'], settings: { ...WORK, status: 'weekend', standby: true }, employees: EMPS })[0];
    expect(e).toMatchObject({ regular_hours: 0, holiday_overtime_hours: 10, standby_allowance: true });
  });
});
