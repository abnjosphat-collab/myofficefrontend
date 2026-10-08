import { describe, expect, it } from 'vitest';
import { mergeEffectiveTimesheets } from './mergeEffectiveTimesheets';
import { buildEarlyMorningOtDatesForEmployee, calcEmployeeTotals, rosterNightAllowanceHours } from './calcTotals';
import type { ApprovedOvertimeRecord, TimesheetEntry } from './types';
import { applyNormalHoursFill, isFillProtectedTarget } from './fillEntry';

const base: TimesheetEntry = { id: 1, employee_id: 10, date: '2026-09-29', status: 'work', regular_hours: 10 };
const input = { timesheets: [base], approvedLeaves: [], approvedOvertime: [], shiftAssignments: [], dayStrs: ['2026-09-29'], rosterIds: ['10'], employeeIdByHuman: new Map([['C0001', '10']]), leaveTypeToStatus: { annual: 'leave' as const }, statusLabel: (s: string) => s };
const ot: ApprovedOvertimeRecord = { id: 2, employee_id: 'C1', date: base.date, status: 'approved', overtime_type: 'regular', hours: 2 };

describe('source module approval projection', () => {
  it('includes mixed approved/pending OT once and marks both statuses on saved rows', () => {
    const pending = { ...ot, id: 3, status: 'pending', hours: 4 };
    const [row] = mergeEffectiveTimesheets({ ...input, approvedOvertime: [ot, pending, pending, { ...ot, id: 4, status: 'rejected', hours: 20 }] });
    expect(row.overtime_hours).toBe(6);
    expect(row._moduleApproval).toEqual({ approved: 1, pending: 1 });
    expect(row.id).toBe(1);
  });

  it('rebuilds approval metadata after approval without changing the hours or duplicating leave', () => {
    const leave = { id: 5, employee_id: 'C1', leave_type: 'annual', start_date: base.date, end_date: base.date, status: 'pending' };
    const [pending] = mergeEffectiveTimesheets({ ...input, approvedLeaves: [leave, leave] });
    expect(pending.regular_hours).toBe(8);
    expect(pending._moduleApproval).toEqual({ approved: 0, pending: 1 });
    expect(isFillProtectedTarget(pending)).toBe(true);
    const [approved] = mergeEffectiveTimesheets({ ...input, timesheets: [pending], approvedLeaves: [{ ...leave, status: 'approved' }] });
    expect(approved.regular_hours).toBe(8);
    expect(approved._moduleApproval).toEqual({ approved: 1, pending: 0 });
  });

  it('does not overlay rejected leave or copy approval metadata during fill', () => {
    const [row] = mergeEffectiveTimesheets({ ...input, approvedLeaves: [{ employee_id: 'C1', leave_type: 'annual', start_date: base.date, end_date: base.date, status: 'rejected' }] });
    expect(row.status).toBe('work');
    expect(row.regular_hours).toBe(10);
    const filled = applyNormalHoursFill({ regular_hours: 8 }, { ...row, _moduleApproval: { approved: 1, pending: 1 } }, 10, '2026-09-30');
    expect(filled).not.toHaveProperty('_moduleApproval');
  });
});

describe('night roster vs callout', () => {
  it('does not award night allowance for Roy-style pre-dawn breakdown callouts', () => {
    const callout = { ...ot, start_time: '02:30', end_time: '07:00', hours: 4.5, reason: 'Loco fault finding' };
    const [row] = mergeEffectiveTimesheets({ ...input, approvedOvertime: [callout] });
    const dates = buildEarlyMorningOtDatesForEmployee('C1', [callout]);
    expect(dates.size).toBe(0);
    expect(row.overtime_hours).toBe(4.5);
    expect(calcEmployeeTotals('10', [row], { earlyMorningOtDates: dates }).nightAllowanceBonus).toBe(0);
  });

  it('retains full allowance for explicitly recorded night-shift tails with missing roster clocks', () => {
    const tail = { ...ot, start_time: '04:00', end_time: '06:00', reason: 'Night Shift' };
    const [row] = mergeEffectiveTimesheets({ ...input, approvedOvertime: [tail] });
    expect(row.nightshift_hours).toBe(12);
    expect(buildEarlyMorningOtDatesForEmployee('C1', [tail]).has(base.date)).toBe(true);
  });

  it('keeps a roster starting at 03:00 at three night hours instead of inferring twelve', () => {
    expect(rosterNightAllowanceHours({ ...base, start_time: '03:00', end_time: '13:00' }, { earlyMorningModuleOt: true })).toBe(3);
  });
});
