import { describe, expect, it } from 'vitest';
import type { EmployeeLookup } from '@/hooks/useLookups';
import { NO_FILTERS, countDuplicates, filterRecords, findDuplicate, isFiltered, lastCompletedWeek, monthOptions, normalizeSection, recordHours, summarise, tally, timeSpan, weeklyView } from './overtimeLogic';
import { payoutMeta, planningMeta, statusMeta, typeMeta } from './overtimeMeta';
import type { OTRecord } from './types';

const rec = (o: Partial<OTRecord> = {}): OTRecord => ({
  id: 1, employee_name: 'Jane Doe', employee_id: 'C1', position: 'Fitter', overtime_type: 'regular', date: '2026-09-07', start_time: '17:00', end_time: '20:00', status: 'pending', ...o,
});

describe('recordHours / timeSpan', () => {
  it('prefers hours entered directly and falls back to the time span', () => {
    expect(recordHours(rec())).toBe(3);
    expect(recordHours(rec({ start_time: undefined, end_time: undefined, hours: 2.5 }))).toBe(2.5);
    expect(recordHours(rec({ hours: 4 }))).toBe(4);
  });
  it('says hours only when there are no times', () => {
    expect(timeSpan(rec())).toBe('17:00 to 20:00');
    expect(timeSpan(rec({ start_time: undefined, end_time: undefined, hours: 2 }))).toBe('Hours only');
  });
});

describe('filterRecords', () => {
  const rows = [
    rec({ id: 1, date: '2026-09-01', reason: 'Pump repair' }),
    rec({ id: 2, date: '2026-09-05', status: 'approved', employee_id: 'C2', employee_name: 'Bo Ng', overtime_type: 'weekend', cost_centre: 'Projects' }),
    rec({ id: 3, date: '2026-08-20', status: 'rejected', employee_id: 'C3', employee_name: 'Cy Wu' }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>, order?: 'asc' | 'desc') => filterRecords(rows, { ...NO_FILTERS, ...f }, order).map(r => r.id);
  it('filters by each field and sorts by date', () => {
    expect(ids({})).toEqual([2, 1, 3]);
    expect(ids({}, 'asc')).toEqual([3, 1, 2]);
    expect(ids({ status: 'approved' })).toEqual([2]);
    expect(ids({ type: 'weekend' })).toEqual([2]);
    expect(ids({ from: '2026-09-01', to: '2026-09-04' })).toEqual([1]);
    expect(ids({ employeeIds: ['C3'] })).toEqual([3]);
    expect(ids({ search: 'pump' })).toEqual([1]);
    expect(ids({ search: 'projects' })).toEqual([2]);
    expect(ids({ search: 'zzz' })).toEqual([]);
  });
  it('knows when a filter is on', () => { expect(isFiltered(NO_FILTERS)).toBe(false); expect(isFiltered({ ...NO_FILTERS, employeeIds: ['C1'] })).toBe(true); });
});

describe('summaries', () => {
  it('counts hours the same way everywhere, including hours-only records', () => {
    const s = summarise([rec(), rec({ id: 2, status: 'approved', start_time: undefined, end_time: undefined, hours: 2, employee_id: 'C2' })]);
    expect(s).toMatchObject({ total: 2, pending: 1, approved: 1, hours: 5, employees: 2, avgHours: 2.5 });
  });
  it('offers the newest months as date ranges', () => {
    const m = monthOptions([rec({ date: '2026-02-10' }), rec({ date: '2026-09-01' })]);
    expect(m.map(x => x.key)).toEqual(['2026-09', '2026-02']);
    expect(m[1]).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('duplicate slots', () => {
  const rows = [rec({ id: 1 }), rec({ id: 2, employee_id: 'C2', status: 'rejected' })];
  it('flags another live request for the same person, date and start, ignoring itself and rejected ones', () => {
    expect(findDuplicate(rows, { employee_id: 'C1', date: '2026-09-07', start_time: '17:00' })?.id).toBe(1);
    expect(findDuplicate(rows, { employee_id: 'C1', date: '2026-09-07', start_time: '17:00' }, 1)).toBeUndefined();
    expect(findDuplicate(rows, { employee_id: 'C2', date: '2026-09-07', start_time: '17:00' })).toBeUndefined();
    expect(countDuplicates(rows, ['C1', 'C2', 'C9'], '2026-09-07', '17:00')).toBe(1);
  });
});

describe('tally', () => {
  const emps = [{ id: 1, employee_id: 'C1', section: 'electrical ' }, { id: 2, employee_id: 'C2' }] as EmployeeLookup[];
  const t = tally([rec(), rec({ id: 2, employee_id: 'C2', employee_name: 'Bo', date: '2026-09-12', hours: 5, start_time: undefined, end_time: undefined, spares_used: [{ name: 'Seal', quantity: 2, unit_price: 10 }] })], emps);
  it('buckets by section with mixed case folded and unknown ones as Unassigned', () => {
    expect(normalizeSection(' ELECTRICAL')).toBe('Electrical');
    expect(t.bySection.map(s => s.section).sort()).toEqual(['Electrical', 'Unassigned']);
  });
  it('totals hours, weekdays and spares', () => {
    expect(t.stats).toMatchObject({ employees: 2, totalHours: 8, avgHours: 4, spareCost: 20 });
    expect(t.byWeekday.find(d => d.day === 'Mon')?.hours).toBe(3);
    expect(t.byWeekday.find(d => d.day === 'Sat')?.hours).toBe(5);
    expect(t.stats.busiestDay).toBe('Sat');
    expect(t.byArtisan[0].employee_id).toBe('C2');
  });
});

describe('weekly view', () => {
  const emps = [{ id: 1, employee_id: 'C1', full_name: 'Jane Doe', designation: 'Fitter' }, { id: 3, employee_id: 'C3', full_name: 'Quiet Person', designation: 'Fitter' }] as EmployeeLookup[];
  const rows = [
    rec({ id: 1, planning_status: 'planned', reason: 'Burnet daily checks' }),
    rec({ id: 2, date: '2026-09-08', planning_status: 'unplanned', overtime_type: 'weekend', reason: 'Burnett daily check' }),
    rec({ id: 3, cost_centre: 'Projects' }),
  ];
  const v = weeklyView(rows, emps, '2026-09-07', '2026-09-13', 'total');
  it('rolls up per person with the rate and planning split, and leaves other cost centres out', () => {
    expect(v.excluded).toBe(1);
    expect(v.totals).toMatchObject({ all: 6, r15: 3, r20: 3, planned: 3, unplanned: 3 });
    expect(v.rows.find(r => r.employee_id === 'C3')?.total).toBe(0);
    expect(v.dayTotals).toEqual([3, 3, 0, 0, 0, 0, 0]);
  });
  it('names each person\'s main reason, grouping spellings of the same task', () => {
    expect(v.people).toHaveLength(1);
    expect(v.people[0].mainCause).toMatchObject({ count: 2, hours: 6 });
    expect(v.topShare).toBe(100);
  });
  it('defaults to the last completed Monday to Sunday week', () => {
    expect(lastCompletedWeek(new Date(2026, 9, 7))).toEqual({ from: '2026-09-28', to: '2026-10-04' });
  });
});

describe('labels', () => {
  it('fall back to the raw value for legacy data', () => {
    expect(typeMeta('regular').label).toBe('Regular');
    expect(typeMeta('mystery')).toEqual({ label: 'mystery', tone: 'neutral' });
    expect(statusMeta('pending').tone).toBe('warning');
    expect(planningMeta(null)).toBeNull();
    expect(payoutMeta('cash')).toBeNull();
    expect(payoutMeta('lieu')?.label).toMatch(/lieu/);
  });
});
