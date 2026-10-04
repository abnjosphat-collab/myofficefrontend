import { describe, expect, it } from 'vitest';
import {
  NO_FILTERS, artisanBody, calcStats, countByStatus, durationText, editOrderBody, filterOrders, isFiltered, isOverdue, machinesOf, newOrderBody, nextWONumber, parseDurationHours, recurrenceLabel,
  NO_ANALYTICS_FILTERS, analyticsFilterCount, distinct, filterAnalytics, scheduleBody, scheduleProblems, type ArtisanReport, type RequestForm, type ScheduleDraft,
} from './helpers';
import { classificationLabel, priorityMeta, statusMeta } from './meta';
import type { MaintenanceSchedule, WorkOrder } from './types';

const wo = (o: Partial<WorkOrder> = {}): WorkOrder => ({ id: '1', work_order_number: 'WO-00001', equipment_info: 'Pump A', status: 'pending', priority: 'medium', progress: 0, date_raised: '2026-09-01', created_at: '', updated_at: '', ...o } as WorkOrder);
const TODAY = '2026-10-04';

describe('isOverdue', () => {
  it('is true only for open work whose due date has passed, and never on the due day', () => {
    expect(isOverdue({ due_date: '2026-10-03', status: 'pending' }, TODAY)).toBe(true);
    expect(isOverdue({ due_date: TODAY, status: 'pending' }, TODAY)).toBe(false);
    expect(isOverdue({ due_date: '2026-10-03', status: 'completed' }, TODAY)).toBe(false);
    expect(isOverdue({ due_date: '2026-10-03', status: 'cancelled' }, TODAY)).toBe(false);
    expect(isOverdue({ due_date: undefined, status: 'pending' }, TODAY)).toBe(false);
  });
});

describe('durations', () => {
  it('works out hours and minutes, across midnight too, and stays empty until both are set', () => {
    expect(durationText('08:00', '15:30')).toBe('7h 30m');
    expect(durationText('22:00', '02:15')).toBe('4h 15m');
    expect(durationText('08:00', '')).toBe('');
    expect(parseDurationHours('7h 30m')).toBe(7.5);
    expect(parseDurationHours('3')).toBe(3);
    expect(parseDurationHours(undefined)).toBe(0);
  });
  it('splits a list of machines, trimming and dropping repeats', () => {
    expect(machinesOf(' Pump A, pump a,, Fan 2 ,')).toEqual(['Pump A', 'Fan 2']);
    expect(machinesOf('')).toEqual([]);
  });
});

describe('the register filter and sort', () => {
  const rows = [
    wo({ id: 'a', equipment_info: 'Crusher', priority: 'low', status: 'in-progress', date_raised: '2026-09-05', due_date: '2026-09-10' }),
    wo({ id: 'b', equipment_info: 'Pump', priority: 'urgent', status: 'pending', date_raised: '2026-09-20', allocated_to: 'Alex' }),
    wo({ id: 'c', equipment_info: 'Belt', priority: 'high', status: 'completed', date_raised: '2026-09-10', due_date: '2026-09-11' }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>) => filterOrders(rows, { ...NO_FILTERS, ...f }, TODAY).map(r => r.id);
  it('filters by status, overdue, priority and search', () => {
    expect(ids({})).toEqual(['b', 'c', 'a']);
    expect(ids({ status: 'pending' })).toEqual(['b']);
    expect(ids({ status: 'overdue' })).toEqual(['a']);
    expect(ids({ priorities: ['urgent', 'high'] })).toEqual(['b', 'c']);
    expect(ids({ search: 'alex' })).toEqual(['b']);
    expect(ids({ search: 'CRUSH' })).toEqual(['a']);
  });
  it('sorts by priority, status, machine and date', () => {
    expect(ids({ sort: 'priority' })).toEqual(['b', 'c', 'a']);
    expect(ids({ sort: 'status' })).toEqual(['a', 'b', 'c']);
    expect(ids({ sort: 'machine' })).toEqual(['c', 'a', 'b']);
    expect(ids({ sort: 'date-asc' })).toEqual(['a', 'c', 'b']);
  });
  it('counts per status tile, overdue included', () => {
    expect(countByStatus(rows, TODAY)).toEqual({ all: 3, pending: 1, 'in-progress': 1, completed: 1, 'on-hold': 0, overdue: 1 });
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, priorities: ['low'] })).toBe(true);
  });
});

describe('calcStats', () => {
  it('uses recorded time for breakdown artisan hours and falls back to the estimate, marked as estimated', () => {
    const s = calcStats([
      wo({ classification: 'breakdown', allocated_to: 'Alex', total_time_worked: '2h 30m', failure_mode: 'Bearing failure', time_raised: '07:15', spares_used: [{ id: 's', name: 'Bearing', quantity: 2, unit_cost: 10 }] }),
      wo({ id: '2', classification: 'breakdown', allocated_to: 'Alex', estimated_hours: '4', failure_mode: 'Bearing failure', time_raised: '07:45' }),
      wo({ id: '3', classification: 'planned_maintenance', status: 'completed' }),
    ]);
    expect(s.artisanCost[0]).toMatchObject({ name: 'Alex', hours: 6.5, estimated: 4, sparesCost: 20, count: 2 });
    expect(s.failureModes).toEqual([['Bearing failure', 2]]);
    expect(s.hourBuckets[7]).toBe(2);
    expect(s).toMatchObject({ total: 3, completed: 1, efficiency: 33, breakdowns: 2, plannedMaintenance: 1 });
  });
});

describe('numbers, labels and rules', () => {
  it('suggests the next work order number', () => { expect(nextWONumber([wo({ work_order_number: 'WO-00012' })], 1)).toBe('WO-00014'); expect(nextWONumber([])).toBe('WO-00001'); });
  it('describes recurrence', () => {
    const s = { recurrence_type: 'monthly', recurrence_dom: 22 } as MaintenanceSchedule;
    expect(recurrenceLabel(s)).toBe('Monthly on the 22nd');
    expect(recurrenceLabel({ recurrence_type: 'custom', specific_dates: ['2026-10-01'] } as MaintenanceSchedule)).toBe('1 specific date');
  });
  it('falls back for unknown values', () => {
    expect(statusMeta('weird')).toEqual({ label: 'weird', tone: 'neutral' });
    expect(priorityMeta('weird').label).toBe('Medium');
    expect(classificationLabel({ classification: 'custom', classification_custom: ' Shutdown ' })).toBe('Shutdown');
    expect(classificationLabel({})).toBe('');
  });
});

const form: RequestForm = { equipment_info: ' Pump A ', to_department: 'Engineering', allocated_to: 'Alex', priority: 'high', estimated_hours: '2', job_request_details: 'Seal', requested_by: 'Sam', authorising_foreman: 'Lee', job_instructions: '', date_raised: '2026-10-04', due_date: '', classification: '' };

describe('what the forms send', () => {
  it('a new order omits a blank due date and classification, and is pending at 0%', () => {
    const b = newOrderBody(form, 'Pump A', 'WO-00009');
    expect(b).toMatchObject({ work_order_number: 'WO-00009', equipment_info: 'Pump A', status: 'pending', progress: 0, artisan_name: 'Alex', responsible_foreman: 'Lee' });
    expect('due_date' in b).toBe(false);
    expect('classification' in b).toBe(false);
    expect(newOrderBody({ ...form, due_date: '2026-10-09', classification: 'project' }, 'Pump A', 'WO-1')).toMatchObject({ due_date: '2026-10-09', classification: 'project' });
  });
  it('an edit clears an emptied due date with null instead of keeping the old one', () => {
    expect(editOrderBody(form)).toMatchObject({ equipment_info: 'Pump A', due_date: null });
    expect(editOrderBody({ ...form, due_date: '2026-10-09' }).due_date).toBe('2026-10-09');
  });
});

describe('artisanBody', () => {
  const r: ArtisanReport = {
    work_done_details: 'Replaced seal', cause_of_failure: '', delay_details: '', time_work_started: '08:00', time_work_finished: '10:30', overtime_start_time: '', overtime_end_time: '', delay_from_time: '', delay_to_time: '',
    artisan_name: 'Alex', artisan_sign: 'Alex', artisan_date: '2026-10-04', status: 'completed', progress: 100, classification: 'breakdown', classification_custom: 'ignored', failure_mode: 'Seal / gasket failure', discipline: 'Mechanical', trade: 'Fitter',
  };
  it('works out the durations from the times and keeps what applies', () => {
    const b = artisanBody(r, []);
    expect(b).toMatchObject({ total_time_worked: '2h 30m', overtime_hours: '', total_delay_hours: '', classification: 'breakdown', failure_mode: 'Seal / gasket failure', classification_custom: null, trade: 'Fitter' });
  });
  it('clears what no longer applies and always sends the spares as a list', () => {
    const b = artisanBody({ ...r, classification: '', discipline: 'Electrical' }, []);
    expect(b).toMatchObject({ classification: null, failure_mode: null, trade: null, discipline: 'Electrical', spares_used: [] });
    expect(artisanBody({ ...r, classification: 'custom', classification_custom: 'Shutdown' }, []).classification_custom).toBe('Shutdown');
  });
});

const draft: ScheduleDraft = { name: ' Weekly check ', equipment_info: 'Pump A, Fan 2', to_department: 'Engineering', allocated_to: 'Alex', authorising_foreman: 'Lee', estimated_hours: '2', job_request_details: ' Check seals ', job_instructions: '', priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [], advance_days: 1, start_date: '2026-10-05' };

describe('schedules', () => {
  it('names each problem before saving', () => {
    expect(scheduleProblems(draft)).toEqual({});
    expect(scheduleProblems({ ...draft, name: ' ', equipment_info: '', job_request_details: '' })).toEqual({ name: 'Give the schedule a name.', machines: 'Add at least one machine.', job: 'Describe what the artisan has to do.' });
    expect(scheduleProblems({ ...draft, recurrence_type: 'custom' }).recurrence).toMatch(/at least one date/);
    expect(scheduleProblems({ ...draft, recurrence_type: 'quarterly' }).recurrence).toMatch(/at least one month/);
    expect(scheduleProblems({ ...draft, recurrence_type: 'quarterly', recurrence_months: [0] })).toEqual({});
  });
  it('sends trimmed text, tidy machines and a null first date when empty', () => {
    expect(scheduleBody(draft)).toMatchObject({ name: 'Weekly check', equipment_info: 'Pump A, Fan 2', job_request_details: 'Check seals', next_due_date: '2026-10-05' });
    expect(scheduleBody({ ...draft, start_date: '' }).next_due_date).toBeNull();
  });
});

describe('analytics filters', () => {
  const rows = [
    wo({ id: 'a', date_raised: '2026-09-05', to_department: 'Engineering', allocated_to: 'Alex', equipment_info: 'Crusher 1', discipline: 'Mechanical', trade: 'Fitter', classification: 'breakdown', failure_mode: 'Bearing failure' }),
    wo({ id: 'b', date_raised: '2026-10-01', to_department: 'Plant', artisan_name: 'Bo', equipment_info: 'Pump', discipline: 'Electrical', classification: 'project' }),
  ];
  const ids = (f: Partial<typeof NO_ANALYTICS_FILTERS>) => filterAnalytics(rows, { ...NO_ANALYTICS_FILTERS, ...f }).map(r => r.id);
  it('narrows by each field, falling back to the artisan name when nobody is allocated', () => {
    expect(ids({})).toEqual(['a', 'b']);
    expect(ids({ dateFrom: '2026-09-20' })).toEqual(['b']);
    expect(ids({ dateTo: '2026-09-20' })).toEqual(['a']);
    expect(ids({ department: 'Plant' })).toEqual(['b']);
    expect(ids({ artisan: 'Bo' })).toEqual(['b']);
    expect(ids({ machine: 'crusher' })).toEqual(['a']);
    expect(ids({ classification: 'breakdown', discipline: 'Mechanical', trade: 'Fitter', failureMode: 'Bearing failure' })).toEqual(['a']);
  });
  it('counts active filters and lists distinct choices', () => {
    expect(analyticsFilterCount({ ...NO_ANALYTICS_FILTERS, department: 'Plant', trade: 'Fitter' })).toBe(2);
    expect(distinct([' b ', 'a', 'b', '', undefined, null])).toEqual(['a', 'b']);
  });
});
