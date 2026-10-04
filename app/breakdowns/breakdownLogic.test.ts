import { describe, expect, it } from 'vitest';
import { NO_FILTERS, costOf, downtimeOf, filterBreakdowns, formFromRecord, formProblems, emptyForm, isFiltered, partsOf, previewDowntime, sortBreakdowns, summarise, toPayload } from './breakdownLogic';
import type { Breakdown } from './types';

const bd = (id: number, over: Partial<Breakdown> = {}): Breakdown => ({ id, machine_id: `M${id}`, machine_name: `Machine ${id}`, artisan_name: 'Ann', department: 'Engineering', location: '6 Level', breakdown_date: '2026-09-10', breakdown_type: 'mechanical', status: 'logged', priority: 'medium', breakdown_description: 'Stopped', ...over });

describe('parts and cost', () => {
  it('reads a list or a JSON string, and nothing else', () => {
    expect(partsOf({ spares_used: [{ name: 'a', quantity: 1, unit_price: 2, total_cost: 2 }] })).toHaveLength(1);
    expect(partsOf({ spares_used: '[{"name":"a","quantity":2,"unit_price":3}]' })).toHaveLength(1);
    expect(partsOf({ spares_used: 'not json' })).toEqual([]);
    expect(partsOf({})).toEqual([]);
  });
  it('costs a line by its total, or quantity times price when it has none', () => {
    expect(costOf({ spares_used: [{ name: 'a', quantity: 2, unit_price: 5, total_cost: 0 }, { name: 'b', quantity: 1, unit_price: 3, total_cost: 3 }] })).toBe(13);
    expect(costOf({ spares_used: '[{"name":"a","quantity":2,"unit_price":4,"total_cost":8}]' })).toBe(8);
  });
});

describe('downtime', () => {
  it('counts an end before the start as crossing midnight', () => { expect(downtimeOf({ breakdown_start: '23:10', breakdown_end: '01:40' })).toBe(150); });
  it('is zero without both times', () => { expect(downtimeOf({ breakdown_start: '08:00' })).toBe(0); });
  it('previews only once both times are in', () => { expect(previewDowntime('08:00', '')).toBeNull(); expect(previewDowntime('08:00', '09:30')).toBe(90); });
});

describe('filter and sort', () => {
  const list = [bd(1, { status: 'resolved', priority: 'critical', breakdown_date: '2026-09-01', breakdown_start: '08:00', breakdown_end: '10:00' }), bd(2, { status: 'in_progress', location: 'Shaft', breakdown_date: '2026-09-20' }), bd(3, { status: 'closed', breakdown_type: 'electrical', breakdown_date: '2026-08-15', work_done: 'Replaced a fuse' })];
  it('treats "open" as logged or in progress', () => { expect(filterBreakdowns(list, { ...NO_FILTERS, status: 'open' }).map(b => b.id)).toEqual([2]); });
  it('filters by date range, type and search across fields', () => {
    expect(filterBreakdowns(list, { ...NO_FILTERS, from: '2026-09-01', to: '2026-09-10' }).map(b => b.id)).toEqual([1]);
    expect(filterBreakdowns(list, { ...NO_FILTERS, type: 'electrical' }).map(b => b.id)).toEqual([3]);
    expect(filterBreakdowns(list, { ...NO_FILTERS, search: 'fuse' }).map(b => b.id)).toEqual([3]);
  });
  it('knows when a filter is on', () => { expect(isFiltered(NO_FILTERS)).toBe(false); expect(isFiltered({ ...NO_FILTERS, search: 'x' })).toBe(true); });
  it('sorts by date, priority and downtime, in both directions', () => {
    expect(sortBreakdowns(list, 'date', 'desc').map(b => b.id)).toEqual([2, 1, 3]);
    expect(sortBreakdowns(list, 'date', 'asc').map(b => b.id)).toEqual([3, 1, 2]);
    expect(sortBreakdowns(list, 'priority', 'asc')[0].id).toBe(1);
    expect(sortBreakdowns(list, 'downtime', 'desc')[0].id).toBe(1);
  });
});

describe('summarise', () => {
  it('averages downtime over finished breakdowns that have times, and is null when none do', () => {
    const s = summarise([bd(1, { status: 'resolved', breakdown_start: '08:00', breakdown_end: '10:00' }), bd(2, { status: 'closed', breakdown_start: '08:00', breakdown_end: '09:00' }), bd(3, { status: 'resolved' }), bd(4, { priority: 'critical' })]);
    expect(s).toMatchObject({ total: 4, open: 1, critical: 1, avgDowntimeMinutes: 90, avgDowntimeCount: 2 });
    expect(summarise([bd(1)]).avgDowntimeMinutes).toBeNull();
  });
});

describe('the form', () => {
  const ok = { ...emptyForm('2026-09-10'), machine_name: 'Winder', machine_id: 'W1', breakdown_description: 'Tripped', artisan_name: 'Ann', location: 'Shaft' };
  it('needs the machine ID, which the server requires', () => {
    expect(formProblems({ ...ok, machine_id: '' }).machine_id).toBeTruthy();
    expect(formProblems(ok)).toEqual({});
  });
  it('asks for an end time when only a start is given', () => {
    expect(formProblems({ ...ok, breakdown_start: '08:00' }).breakdown_end).toBeTruthy();
    expect(formProblems({ ...ok, work_start: '08:00' }).work_end).toBeTruthy();
  });
  it('sends the nature of the breakdown (it used to be dropped) and clears blank times with empty strings', () => {
    const p = toPayload({ ...ok, breakdown_nature: ' Bearing failure ', breakdown_start: '', spares_used: [{ name: 'Bearing', quantity: 2, unit_price: 3.5, total_cost: 0 }] });
    expect(p.breakdown_nature).toBe('Bearing failure');
    expect(p.breakdown_start).toBe('');
    expect(p.spares_used[0].total_cost).toBe(7);
  });
  it('round-trips a record, trimming stored times to HH:MM', () => {
    const f = formFromRecord(bd(1, { breakdown_start: '08:30:00', breakdown_end: '09:00:00', breakdown_nature: 'Seal', breakdown_date: '2026-09-10T00:00:00' }), '2026-01-01');
    expect(f).toMatchObject({ breakdown_start: '08:30', breakdown_end: '09:00', breakdown_nature: 'Seal', breakdown_date: '2026-09-10' });
  });
});
