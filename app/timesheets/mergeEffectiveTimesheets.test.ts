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
  const human = new Map([['C0001', '10']]);

  it('does not double-count when saved row already has the same module OT persisted', () => {
    const saved: TimesheetEntry = {
      id: 99, employee_id: 10, date: '2026-08-18', status: 'work', regular_hours: 10,
      overtime_hours: 3, holiday_overtime_hours: 0,
    };
    const merged = mergeEffectiveTimesheets({
      timesheets: [saved],
      approvedLeaves: [],
      approvedOvertime: [{
        id: 501, employee_id: 'C1', overtime_type: 'regular', date: '2026-08-18', status: 'approved', hours: 3,
      }],
      shiftAssignments: [],
      dayStrs: ['2026-08-18'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged[0].overtime_hours).toBe(3);
    expect(calcEmployeeTotals('10', merged).ot15).toBe(3);
  });

  it('sums multiple approved OT records on the same day without duplicate ids', () => {
    const merged = mergeEffectiveTimesheets({
      timesheets: [{ id: 1, employee_id: 10, date: '2026-08-19', status: 'work', regular_hours: 8, overtime_hours: 5 }],
      approvedLeaves: [],
      approvedOvertime: [
        { id: 1, employee_id: 'C1', overtime_type: 'regular', date: '2026-08-19', status: 'approved', hours: 2 },
        { id: 2, employee_id: 'C1', overtime_type: 'emergency', date: '2026-08-19', status: 'approved', hours: 1 },
      ],
      shiftAssignments: [],
      dayStrs: ['2026-08-19'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged[0].overtime_hours).toBe(3);
  });

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

  it('overlays leave onto an existing saved work row for that day', () => {
    const saved: TimesheetEntry = {
      id: 50, employee_id: 10, date: '2026-08-14', status: 'work', regular_hours: 10,
      start_time: '07:00', end_time: '17:00',
    };
    const merged = mergeEffectiveTimesheets({
      timesheets: [saved],
      approvedLeaves: [{
        employee_id: 'C0001', leave_type: 'annual', start_date: '2026-08-14', end_date: '2026-08-15', status: 'approved',
      }],
      approvedOvertime: [],
      shiftAssignments: [],
      dayStrs: ['2026-08-14', '2026-08-15'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: { annual: 'leave' },
      statusLabel,
    });
    const d14 = merged.find(r => r.date === '2026-08-14')!;
    expect(d14.status).toBe('leave');
    expect(d14.regular_hours).toBe(8);
    expect(d14.id).toBe(50);
  });

  it('projects approved leave types onto empty grid days (incl. emergency → special leave)', () => {
    const merged = mergeEffectiveTimesheets({
      timesheets: [],
      approvedLeaves: [{
        employee_id: 'C0001', leave_type: 'emergency', start_date: '2026-09-07', end_date: '2026-09-07', status: 'approved',
      }],
      approvedOvertime: [],
      shiftAssignments: [],
      dayStrs: ['2026-09-07', '2026-09-08'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: { emergency: 'special_leave', annual: 'leave' },
      statusLabel,
    });
    const row = merged.find(r => r.date === '2026-09-07');
    expect(row?.status).toBe('special_leave');
    expect(row?.regular_hours).toBe(8);
    expect(row?._auto).toBe('leave');
  });

  it('derives OT hours from clock times when stored hours is null', () => {
    const merged = mergeEffectiveTimesheets({
      timesheets: [{
        id: 1, employee_id: 10, date: '2026-08-17', status: 'work', regular_hours: 10,
        start_time: '18:00', end_time: '04:00', overtime_hours: 0, nightshift_hours: 10,
      }],
      approvedLeaves: [],
      approvedOvertime: [{
        id: 701, employee_id: 'C1', overtime_type: 'regular', date: '2026-08-17', status: 'approved',
        start_time: '04:00', end_time: '06:00', hours: undefined,
      }],
      shiftAssignments: [],
      dayStrs: ['2026-08-17'],
      tabIds: ['10'],
      employeeIdByHuman: human,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged[0].overtime_hours).toBe(2);
    expect(merged[0].nightshift_hours).toBe(12);
    expect(calcEmployeeTotals('10', merged, {
      earlyMorningOtDates: new Set(['2026-08-17']),
    }).nightAllowanceBonus).toBe(12);
  });

  it('matches module OT when mine number casing differs (c1 vs C0001)', () => {
    const map = new Map([['C0001', '10']]);
    const merged = mergeEffectiveTimesheets({
      timesheets: [{ id: 1, employee_id: 10, date: '2026-08-18', status: 'work', regular_hours: 8 }],
      approvedLeaves: [],
      approvedOvertime: [{
        id: 1, employee_id: 'c1', overtime_type: 'regular', date: '2026-08-18', status: 'approved', hours: 2,
      }],
      shiftAssignments: [],
      dayStrs: ['2026-08-18'],
      tabIds: ['10'],
      employeeIdByHuman: map,
      leaveTypeToStatus: {},
      statusLabel,
    });
    expect(merged[0].overtime_hours).toBe(2);
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
