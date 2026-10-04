import { describe, expect, it } from 'vitest';
import { entryProblems, entryTotal, initialForm, settle, toEntry, withStatus, withTimes } from './entryForm';
import type { TimesheetEntry } from './types';

const MON = new Date(2026, 8, 7); // Monday 7 Sep 2026
const SAT = new Date(2026, 8, 12);
const entry = (over: Partial<TimesheetEntry> = {}): TimesheetEntry => ({ id: 1, employee_id: 4, date: '2026-09-07', status: 'work', regular_hours: 10, start_time: '07:00', end_time: '17:00', ...over });

describe('what a day opens with', () => {
  it('opens a new weekday as a 10-hour work day on the standard shift', () => {
    const f = initialForm(undefined, MON, null);
    expect(f).toMatchObject({ status: 'work', start_time: '07:00', end_time: '17:00', regular_hours: 10, nightshift_hours: 0 });
  });
  it('opens a new weekend day as worked double time, and a public holiday as not worked (8 paid hours)', () => {
    expect(initialForm(undefined, SAT, null).status).toBe('weekend');
    const h = initialForm(undefined, MON, 'Heroes Day');
    expect(h).toMatchObject({ status: 'holiday_paid', regular_hours: 8 });
  });
  it('opens a saved entry as it was saved, recalculating hours from its times', () => {
    const f = initialForm(entry({ start_time: '07:00', end_time: '15:00', regular_hours: 3, notes: 'x' }), MON, null);
    expect(f).toMatchObject({ regular_hours: 8, notes: 'x', status: 'work' });
  });
});

describe('changing the times or the status', () => {
  it('follows the times, working out night hours and the night allowance', () => {
    const f = withTimes(initialForm(undefined, MON, null), '18:00', '06:00');
    expect(f.regular_hours).toBe(12);
    expect(f.nightshift_hours).toBe(12);
    expect(f.nightshift_allowance).toBe(true);
  });
  it('gives leave 8 hours on the standard shift, and off or absent nothing', () => {
    const base = initialForm(undefined, MON, null);
    expect(withStatus(base, 'sick')).toMatchObject({ status: 'sick', start_time: '07:00', end_time: '15:00', regular_hours: 8 });
    expect(withStatus(base, 'off')).toMatchObject({ status: 'off', regular_hours: 0, start_time: '', end_time: '' });
    expect(withStatus(base, 'absent').nightshift_hours).toBe(0);
  });
  it('turns a paid holiday given real shift times into a worked public holiday', () => {
    const paid = initialForm(undefined, MON, 'Heroes Day');
    const worked = withTimes(paid, '06:00', '18:00');
    expect(worked.status).toBe('holiday');
    expect(worked.regular_hours).toBe(12);
    expect(withTimes(paid, '07:00', '17:00').status).toBe('holiday_paid');
  });
  it('leaves an off day alone however the times change', () => { const off = withStatus(initialForm(undefined, MON, null), 'off'); expect(settle({ ...off, start_time: '07:00', end_time: '17:00' }).regular_hours).toBe(0); });
});

describe('what is saved', () => {
  it('writes a double-time day as 2.0× hours with no regular hours', () => {
    const f = withStatus(initialForm(undefined, SAT, null), 'weekend');
    expect(toEntry(f, 4, SAT)).toMatchObject({ regular_hours: 0, holiday_overtime_hours: 10, overtime_hours: 0, date: '2026-09-12', employee_id: 4 });
  });
  it('writes a normal day with its regular hours, callouts and the total', () => {
    const f = { ...initialForm(undefined, MON, null), callout_overtime_hours: 2, callout_count: 1 };
    const e = toEntry(f, 4, MON);
    expect(e).toMatchObject({ regular_hours: 10, holiday_overtime_hours: 0, callout_overtime_hours: 2, callout_count: 1, total_hours: 12 });
    expect(entryTotal(f)).toBe(12);
  });
  it('refuses a work day with no times, and impossible callout hours', () => {
    const f = initialForm(undefined, MON, null);
    expect(entryProblems(f)).toEqual([]);
    expect(entryProblems({ ...f, start_time: '' })).toContain('Enter the start and end times.');
    expect(entryProblems(withStatus(f, 'off'))).toEqual([]);
    expect(entryProblems({ ...f, callout_overtime_hours: 30 })).toContain('Callout hours cannot be more than 24 in a day.');
    expect(entryProblems({ ...f, callout_count: -1 })).toContain('Callout hours and the number of callouts cannot be negative.');
  });
});
