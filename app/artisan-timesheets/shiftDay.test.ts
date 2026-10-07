import { describe, expect, it } from 'vitest';
import {
  dayPart,
  groupOvertimeByShift,
  groupPendingOvertimeByShift,
  isCreditedOvertimeStatus,
  sameEmployee,
  shiftDateForClock,
  signTimesFromOvertime,
} from './shiftDay';

describe('shiftDateForClock', () => {
  it('keeps same calendar date at or after 07:00', () => {
    expect(shiftDateForClock('2024-08-02', '07:00')).toBe('2024-08-02');
    expect(shiftDateForClock('2024-08-02', '17:30')).toBe('2024-08-02');
  });

  it('rolls before 07:00 to the previous shift day', () => {
    expect(shiftDateForClock('2024-08-02', '05:00')).toBe('2024-08-01');
    expect(shiftDateForClock('2024-08-02', '06:59')).toBe('2024-08-01');
  });
});

describe('groupOvertimeByShift', () => {
  it('assigns early-morning OT on the next calendar day to the prior shift', () => {
    const map = groupOvertimeByShift([{
      employee_id: 'C001',
      overtime_type: 'regular',
      date: '2024-08-02',
      start_time: '05:00',
      end_time: '06:30',
      status: 'approved',
    }], 'C001');
    expect(map.get('2024-08-01')).toHaveLength(1);
    expect(map.get('2024-08-02')).toBeUndefined();
  });

  it('counts paid overtime like approved, and drops rejected and cancelled', () => {
    const map = groupOvertimeByShift([
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '17:00', end_time: '19:00', status: 'paid' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '20:00', end_time: '21:00', status: 'rejected' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '21:00', end_time: '22:00', status: 'cancelled' },
    ], 'C001');
    expect(map.get('2024-08-01')?.map(o => o.status)).toEqual(['paid']);
    expect(isCreditedOvertimeStatus('approved')).toBe(true);
    expect(isCreditedOvertimeStatus('paid')).toBe(true);
    expect(isCreditedOvertimeStatus('pending')).toBe(false);
  });

  it('matches the artisan loosely and tolerates datetime-suffixed dates', () => {
    const map = groupOvertimeByShift([
      { employee_id: ' c001 ', overtime_type: 'regular', date: '2024-08-01T00:00:00', start_time: '17:00', end_time: '19:00', status: 'approved' },
    ], 'C001');
    expect(map.get('2024-08-01')).toHaveLength(1);
    expect(sameEmployee('C001', ' c001 ')).toBe(true);
    expect(sameEmployee('C001', 'C002')).toBe(false);
    expect(dayPart('2024-08-01T00:00:00')).toBe('2024-08-01');
    expect(dayPart(undefined)).toBe('');
  });
});

describe('groupPendingOvertimeByShift', () => {
  it('keeps only pending overtime for the artisan, rolled to its shift day', () => {
    const map = groupPendingOvertimeByShift([
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-02', start_time: '05:00', end_time: '06:30', status: 'pending' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-02', start_time: '17:00', end_time: '19:00', status: 'approved' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-02', start_time: '17:00', end_time: '19:00', status: 'rejected' },
      { employee_id: 'C002', overtime_type: 'regular', date: '2024-08-02', start_time: '17:00', end_time: '19:00', status: 'pending' },
    ], 'C001');
    expect([...map.keys()]).toEqual(['2024-08-01']);
    expect(map.get('2024-08-01')).toHaveLength(1);
  });
});

describe('signTimesFromOvertime', () => {
  it('uses earliest start and latest end across multiple OT entries', () => {
    const times = signTimesFromOvertime([
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '17:00', end_time: '19:00', status: 'approved' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '20:00', end_time: '22:30', status: 'approved' },
    ], '2024-08-01');
    expect(times).toEqual({ signIn: '17:00', signOut: '22:30' });
  });

  it('reads a night shift split at midnight as one span: in at 17:00, out at 01:23', () => {
    // Eliyah Frank, September 2: the evening row plus the after-midnight row dated the 3rd.
    const times = signTimesFromOvertime([
      { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-02', start_time: '17:00', end_time: '23:59', status: 'approved' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-03', start_time: '00:00', end_time: '01:23', status: 'approved' },
    ], '2026-09-02');
    expect(times).toEqual({ signIn: '17:00', signOut: '01:23' });
  });

  it('compares an after-midnight end against the evening, not against midnight', () => {
    const times = signTimesFromOvertime([
      { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-02', start_time: '23:00', end_time: '23:30', status: 'approved' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-03', start_time: '00:30', end_time: '01:00', status: 'approved' },
    ], '2026-09-02');
    expect(times).toEqual({ signIn: '23:00', signOut: '01:00' });
  });

  it('ignores entries without usable times', () => {
    expect(signTimesFromOvertime([
      { employee_id: 'C001', overtime_type: 'regular', date: '2026-09-02', status: 'approved', hours: 3 },
    ], '2026-09-02')).toBeNull();
  });
});
