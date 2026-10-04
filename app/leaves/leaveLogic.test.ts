import { describe, expect, it } from 'vitest';
import { NO_FILTERS, filterLeaves, overlappingLeave, statsFromLeaves, summariseByEmployee, summariseByType } from './leaveLogic';
import type { Leave } from './types';

const leave = (over: Partial<Leave> = {}): Leave => ({
  id: '1', employee_id: 'E1', employee_name: 'Ann Alpha', position: 'Fitter', leave_type: 'annual', start_date: '2026-10-05', end_date: '2026-10-09',
  reason: 'Rest', contact_number: '0771', status: 'pending', total_days: 5, applied_date: '2026-10-01T08:00:00Z', ...over,
});

describe('statsFromLeaves', () => {
  it('counts by status, who is on leave today, the approval rate and the days', () => {
    const s = statsFromLeaves([leave({ status: 'approved', start_date: '2026-10-03', end_date: '2026-10-06' }), leave({ id: '2', status: 'rejected' }), leave({ id: '3', status: 'pending', total_days: 2 })], '2026-10-04');
    expect(s).toMatchObject({ total: 3, pending: 1, approved: 1, rejected: 1, on_leave_now: 1, approvalRate: 50, total_days_requested: 12, average_days: 4 });
  });
  it('is zero for no leaves and does not divide by zero', () => {
    expect(statsFromLeaves([], '2026-10-04')).toMatchObject({ total: 0, approvalRate: 0, average_days: 0 });
  });
  it('does not count an approved leave that has not started or has ended as on leave', () => {
    expect(statsFromLeaves([leave({ status: 'approved' })], '2026-10-04').on_leave_now).toBe(0);
    expect(statsFromLeaves([leave({ status: 'approved' })], '2026-10-20').on_leave_now).toBe(0);
  });
});

describe('filterLeaves', () => {
  const rows = [leave({ id: 'a', start_date: '2026-06-28', end_date: '2026-07-03', employee_name: 'Zed' }), leave({ id: 'b', start_date: '2026-07-20', end_date: '2026-07-22', employee_name: 'Amy', leave_type: 'sick', status: 'approved', total_days: 3 })];
  it('matches a leave that overlaps the date range, not only one wholly inside it', () => {
    expect(filterLeaves(rows, { ...NO_FILTERS, from: '2026-07-01', to: '2026-07-31' }).map(l => l.id).sort()).toEqual(['a', 'b']);
    expect(filterLeaves(rows, { ...NO_FILTERS, from: '2026-07-10', to: '2026-07-15' })).toEqual([]);
  });
  it('filters by status, type and search across name, id and department', () => {
    expect(filterLeaves(rows, { ...NO_FILTERS, status: 'approved' }).map(l => l.id)).toEqual(['b']);
    expect(filterLeaves(rows, { ...NO_FILTERS, type: 'sick' }).map(l => l.id)).toEqual(['b']);
    expect(filterLeaves(rows, { ...NO_FILTERS, search: 'zed' }).map(l => l.id)).toEqual(['a']);
  });
  it('sorts by name, days and applied date in either direction', () => {
    expect(filterLeaves(rows, { ...NO_FILTERS, sort: 'name-asc' }).map(l => l.id)).toEqual(['b', 'a']);
    expect(filterLeaves(rows, { ...NO_FILTERS, sort: 'days-desc' }).map(l => l.id)).toEqual(['a', 'b']);
  });
});

describe('summaries', () => {
  it('summarises by type, skipping types with no leaves', () => {
    const r = summariseByType([leave(), leave({ id: '2', leave_type: 'sick', total_days: 1 })], ['annual', 'sick', 'study']);
    expect(r.map(x => x.key)).toEqual(['annual', 'sick']);
    expect(r[0]).toMatchObject({ count: 1, totalDays: 5, percentage: 50 });
  });
  it('summarises by employee, most days first, and survives an unrecognised status', () => {
    const r = summariseByEmployee([leave(), leave({ id: '2', employee_id: 'E2', employee_name: 'Bob', total_days: 9, status: 'weird' as never })]);
    expect(r.map(x => x.name)).toEqual(['Bob', 'Ann Alpha']);
    expect(r[0]).toMatchObject({ pending: 0, approved: 0, rejected: 0, total_days: 9 });
  });
});

describe('overlappingLeave', () => {
  const rows = [leave({ id: 'x', status: 'approved' }), leave({ id: 'r', status: 'rejected', start_date: '2026-11-01', end_date: '2026-11-03' })];
  it('finds another active leave of the same person touching the dates', () => {
    expect(overlappingLeave(rows, 'E1', '2026-10-09', '2026-10-12')?.id).toBe('x');
  });
  it('ignores a rejected leave, another person, the leave being edited, and missing dates', () => {
    expect(overlappingLeave(rows, 'E1', '2026-11-01', '2026-11-02')).toBeUndefined();
    expect(overlappingLeave(rows, 'E2', '2026-10-05', '2026-10-06')).toBeUndefined();
    expect(overlappingLeave(rows, 'E1', '2026-10-05', '2026-10-06', 'x')).toBeUndefined();
    expect(overlappingLeave(rows, 'E1', '', '2026-10-06')).toBeUndefined();
  });
});
