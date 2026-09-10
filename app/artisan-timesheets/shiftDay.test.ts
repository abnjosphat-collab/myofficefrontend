import { describe, expect, it } from 'vitest';
import {
  groupOvertimeByShift,
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
});

describe('signTimesFromOvertime', () => {
  it('uses earliest start and latest end across multiple OT entries', () => {
    const times = signTimesFromOvertime([
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '17:00', end_time: '19:00', status: 'approved' },
      { employee_id: 'C001', overtime_type: 'regular', date: '2024-08-01', start_time: '20:00', end_time: '22:30', status: 'approved' },
    ]);
    expect(times).toEqual({ signIn: '17:00', signOut: '22:30' });
  });
});
