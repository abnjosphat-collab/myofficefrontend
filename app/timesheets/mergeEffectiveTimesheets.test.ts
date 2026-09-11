import { describe, it, expect } from 'vitest';
import { calcEmployeeTotals } from './calcTotals';
import { approvedOvertimeHours, mergeEffectiveTimesheets } from './mergeEffectiveTimesheets';
import type { ApprovedOvertimeRecord, TimesheetEntry } from './types';
import type { ShiftAssignment } from '@/app/shifts/types';

const statusLabel = (s: string) => s;

describe('approvedOvertimeHours', () => {
  it('uses stored hours from the Overtime module when present', () => {
    const ot: ApprovedOvertimeRecord = {
      employee_id: 'C1', overtime_type: 'regular', date: '2026-08-10', status: 'approved',
      hours: 4.5, start_time: '17:00', end_time: '22:00',
    };
    expect(approvedOvertimeHours(ot)).toBe(4.5);
  });
});

describe('mergeEffectiveTimesheets — overtime vs standby', () => {
  const human = new Map([['C1', '10']]);

  it('layers approved OT onto saved work rows for grid totals (OT columns only)', () => {
    const saved: TimesheetEntry = {
      id: 99, employee_id: 10, date: '2026-08-10', status: 'work', regular_hours: 10,
      overtime_hours: 0, holiday_overtime_hours: 0,
    };
    const merged = mergeEffectiveTimesheets({
      timesheets: [saved],
      approvedLeaves: [],
      approvedOvertime: [{
        employee_id: 'C1', overtime_type: 'regular', date: '2026-08-10', status: 'approved', hours: 3,
      }],
      shiftAssignments: [],
      dayStrs: ['2026-08-10'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged[0].regular_hours).toBe(10);
    expect(merged[0].overtime_hours).toBe(3);
    expect(merged[0].standby_allowance).toBeFalsy();
  });

  it('applies approved OT hours into OT columns only, not standby', () => {
    const merged = mergeEffectiveTimesheets({
      timesheets: [],
      approvedLeaves: [],
      approvedOvertime: [{
        employee_id: 'C1', overtime_type: 'regular', date: '2026-08-10', status: 'approved', hours: 3,
      }],
      shiftAssignments: [],
      dayStrs: ['2026-08-10'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    const row = merged.find(r => r.date === '2026-08-10')!;
    expect(row.overtime_hours).toBe(3);
    expect(row.standby_allowance).toBeFalsy();
    const t = calcEmployeeTotals('10', merged);
    expect(t.ot15).toBe(3);
    expect(t.standbyBonus).toBe(0);
  });

  it('marks standby roster days without adding OT; 7-day run earns 8h standby total', () => {
    const assignment: ShiftAssignment = {
      id: 1, employee_id: 'C1', employee_name: 'Test', shift_type: 'standby',
      on_days: 0, off_days: 0, cycle_start_date: '2026-08-01', is_active: true,
    };
    const days = Array.from({ length: 7 }, (_, i) => `2026-08-${String(10 + i).padStart(2, '0')}`);
    const merged = mergeEffectiveTimesheets({
      timesheets: [],
      approvedLeaves: [],
      approvedOvertime: [],
      shiftAssignments: [assignment],
      dayStrs: days,
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged.every(r => r.standby_allowance)).toBe(true);
    expect(merged.every(r => (r.overtime_hours || 0) === 0)).toBe(true);
    expect(calcEmployeeTotals('10', merged).standbyBonus).toBe(8);
  });
});
