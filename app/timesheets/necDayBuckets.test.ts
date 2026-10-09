// app/timesheets/necDayBuckets.test.ts — the per-day slices agree with calcEmployeeTotals entry by entry.
import { describe, expect, it } from 'vitest';
import { calcEmployeeTotals } from './calcTotals';
import { necDayBuckets } from './necDayBuckets';
import type { TimesheetEntry } from './types';

const day = (over: Partial<TimesheetEntry> & { date: string }): TimesheetEntry => ({
  employee_id: 1, regular_hours: 0, status: 'work', ...over,
});

describe('necDayBuckets', () => {
  it('puts a plain work day in normal', () => {
    expect(necDayBuckets(day({ date: '2026-09-14', regular_hours: 8 }))).toMatchObject({
      normal: 8, ot15Module: 0, ot20: 0, nightAllowance: 0, nightExcess: 0, standby: false,
    });
  });

  it('splits module overtime at 1.5× from normal', () => {
    expect(necDayBuckets(day({ date: '2026-09-15', regular_hours: 8, overtime_hours: 2 }))).toMatchObject({
      normal: 8, ot15Module: 2, ot20: 0,
    });
  });

  it('puts every hour of a double-time day at 2.0×', () => {
    expect(necDayBuckets(day({ date: '2026-09-19', status: 'holiday', regular_hours: 8, holiday_overtime_hours: 4 }))).toMatchObject({
      normal: 0, ot15Module: 0, ot20: 12,
    });
  });

  it('counts leave-as-8h as normal and grants no night allowance on leave', () => {
    expect(necDayBuckets(day({ date: '2026-09-16', status: 'leave', regular_hours: 8, start_time: '18:00', end_time: '06:00' }))).toMatchObject({
      normal: 8, nightAllowance: 0,
    });
  });

  it('grants the full night allowance for an 18:00–06:00 roster', () => {
    expect(necDayBuckets(day({ date: '2026-09-17', regular_hours: 8, start_time: '18:00', end_time: '06:00' })).nightAllowance).toBe(12);
  });

  it('keeps stored night hours above the allowance as excess', () => {
    expect(necDayBuckets(day({ date: '2026-09-17', regular_hours: 8, start_time: '18:00', end_time: '06:00', nightshift_hours: 14 })).nightExcess).toBe(2);
  });

  it('passes the standby flag through', () => {
    expect(necDayBuckets(day({ date: '2026-09-18', regular_hours: 8, standby_allowance: true })).standby).toBe(true);
  });

  it('sums to calcEmployeeTotals across a mixed set of entries', () => {
    const entries = [
      day({ date: '2026-09-14', regular_hours: 8 }),
      day({ date: '2026-09-15', regular_hours: 8, overtime_hours: 2 }),
      day({ date: '2026-09-16', status: 'leave', regular_hours: 8 }),
      day({ date: '2026-09-17', regular_hours: 8, start_time: '18:00', end_time: '06:00' }),
      day({ date: '2026-09-19', status: 'holiday', regular_hours: 8, holiday_overtime_hours: 4 }),
      day({ date: '2026-09-20', status: 'off', regular_hours: 0 }),
    ];
    const sum = entries.map(e => necDayBuckets(e)).reduce(
      (a, b) => ({ normal: a.normal + b.normal, ot15Module: a.ot15Module + b.ot15Module, ot20: a.ot20 + b.ot20, nightAllowance: a.nightAllowance + b.nightAllowance, nightExcess: a.nightExcess + b.nightExcess }),
      { normal: 0, ot15Module: 0, ot20: 0, nightAllowance: 0, nightExcess: 0 },
    );
    const totals = calcEmployeeTotals('1', entries);
    expect(sum.normal).toBe(totals.actual);
    expect(sum.ot15Module).toBe(totals.ot15Module);
    expect(sum.ot20).toBe(totals.ot20);
    expect(sum.nightAllowance).toBe(totals.nightAllowanceBonus);
    expect(sum.nightExcess).toBe(totals.night);
  });
});
