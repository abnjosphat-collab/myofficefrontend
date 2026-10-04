import { describe, expect, it } from 'vitest';
import { cellFor, findLeave, timingFor } from './cellLogic';
import type { LeaveRecord, ShiftAssignment } from './types';

const a = (over: Partial<ShiftAssignment> = {}): ShiftAssignment => ({ id: 1, employee_id: 'E1', employee_name: 'Ann Alpha', shift_type: '10-4', on_days: 10, off_days: 4, cycle_start_date: '2026-10-01', is_active: true, ...over });
const d = (ds: string) => new Date(`${ds}T12:00:00`);
const none = new Map<string, string>();
const leave = (over: Partial<LeaveRecord> = {}): LeaveRecord => ({ id: 1, employee_id: 'E1', employee_name: 'Ann Alpha', leave_type: 'Annual', start_date: '2026-10-03', end_date: '2026-10-04', status: 'approved', ...over });

describe('cellFor priority', () => {
  it('shows the cycle: on for the first on_days, off after', () => {
    expect(cellFor(a(), d('2026-10-02'), '2026-10-02', [], none)).toMatchObject({ kind: 'on', abbr: 'ON', tone: 'success' });
    expect(cellFor(a(), d('2026-10-12'), '2026-10-12', [], none)).toMatchObject({ kind: 'off', tone: null });
  });
  it('shows an event the person was given over everything else', () => {
    const asg = a({ day_overrides: [{ id: 'e', from: '2026-10-03', to: '2026-10-03', type: 'overtime', start_time: '06:00', end_time: '18:00' }] });
    expect(cellFor(asg, d('2026-10-03'), '2026-10-03', [leave()], new Map([['2026-10-03', 'Day']]))).toMatchObject({ kind: 'event', abbr: 'OT', hours: '06:00–18:00' });
  });
  it('shows a synced leave over a public holiday and the cycle, and marks a pending one', () => {
    expect(cellFor(a(), d('2026-10-03'), '2026-10-03', [leave()], new Map([['2026-10-03', 'Day']]))).toMatchObject({ kind: 'leave', abbr: 'AL', pending: false });
    expect(cellFor(a(), d('2026-10-03'), '2026-10-03', [leave({ status: 'pending' })], none).pending).toBe(true);
  });
  it('shows a public holiday over the cycle', () => {
    expect(cellFor(a(), d('2026-10-03'), '2026-10-03', [], new Map([['2026-10-03', 'Day']]))).toMatchObject({ kind: 'holiday', abbr: 'PH', label: 'Public holiday: Day' });
  });
  it('shows a standby assignment and on-duty-plus-standby periods', () => {
    expect(cellFor(a({ shift_type: 'standby' }), d('2026-10-02'), '2026-10-02', [], none)).toMatchObject({ kind: 'standby', abbr: 'SBY' });
    const both = a({ standby_periods: [{ from: '2026-10-02', to: '2026-10-02' }] });
    expect(cellFor(both, d('2026-10-02'), '2026-10-02', [], none)).toMatchObject({ abbr: 'ON+S', tone: 'info' });
  });
});

describe('timingFor and findLeave', () => {
  it('uses a timing block over the default, and the default otherwise', () => {
    const asg = a({ shift_label: 'day', shift_timing_periods: [{ from: '2026-10-05', to: '2026-10-07', label: 'night', start_time: '', end_time: '' }] });
    expect(timingFor(asg, '2026-10-06')).toMatchObject({ abbr: 'N', hours: '22:00–06:00' });
    expect(timingFor(asg, '2026-10-08')).toMatchObject({ abbr: 'D', hours: '07:00–17:00' });
    expect(timingFor(a(), '2026-10-08')).toBeNull();
  });
  it('matches a leave by employee id or name, ignoring rejected leaves', () => {
    expect(findLeave([leave({ employee_id: 'X', employee_name: ' ann alpha ' })], a(), '2026-10-03')).toBeDefined();
    expect(findLeave([leave({ status: 'rejected' })], a(), '2026-10-03')).toBeUndefined();
  });
});
