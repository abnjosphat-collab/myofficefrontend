import { describe, expect, it } from 'vitest';
import { indexRegister, matchToRegister } from '@/lib/registerMatch';
import { NO_DUE_FILTERS, NO_EMPLOYEE_FILTERS, dueItems, expiryFor, filterEmployees, formProblems, groupByEmployee, renewalTarget, sectionCounts, selectableEmployees, sizeCounts, standing, summarise } from './ppeLogic';
import { enrichPPERecords } from './calcPPE';
import { conditionMeta, statusMeta, typeName } from './ppeMeta';
import { todayLocal, addMonths } from '@/lib/dates';
import type { EmployeeRow, PPERecord } from './types';

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const rec = (o: Partial<PPERecord> = {}): PPERecord => ({ id: '1', employee_id: 'C1', employee_name: 'Ann Alpha', position: 'Fitter', department: '', ppe_type: 'helmet', item_name: 'Helmet', size: 'L', issue_date: day(-100), expiry_date: day(200), condition: 'good', status: 'active', notes: '', issued_by: '', location: '', mine_section: 'Mechanical', ...o });

describe('standing', () => {
  it('is overdue from the expiry day, soon within 30 days, ok beyond, and none unless active', () => {
    expect(standing(rec({ expiry_date: day(0) }))).toBe('overdue');
    expect(standing(rec({ expiry_date: day(-5) }))).toBe('overdue');
    expect(standing(rec({ expiry_date: day(10) }))).toBe('soon');
    expect(standing(rec({ expiry_date: day(31) }))).toBe('ok');
    expect(standing(rec({ expiry_date: null }))).toBe('ok');
    expect(standing(rec({ status: 'returned', expiry_date: day(-5) }))).toBe('none');
  });
});

describe('who holds what', () => {
  const roster: EmployeeRow[] = [{ employee_id: 'C1', employee_name: 'Ann Alpha', position: 'Fitter', department: '', section: 'Electrical' }, { employee_id: 'C9', employee_name: 'Zed Nine', position: 'Welder', department: '', section: 'Mechanical' }];
  const rows = [rec({ id: '1' }), rec({ id: '2', ppe_type: 'gloves', expiry_date: day(5) }), rec({ id: '3', employee_id: 'C2', employee_name: 'Bo Beta', mine_section: '', expiry_date: day(-2) })];
  const holders = groupByEmployee(rows, roster);
  it('groups per person, taking the section from the live roster first', () => {
    expect(holders.map(h => h.employee_id)).toEqual(['C1', 'C2']);
    expect(holders[0]).toMatchObject({ section: 'Electrical' });
    expect(holders[0].records).toHaveLength(2);
  });
  it('offers the roster plus holders who are not on it', () => {
    expect(selectableEmployees(roster, holders).map(e => e.employee_id).sort()).toEqual(['C1', 'C2', 'C9']);
  });
  it('filters by view, section and search, and counts sections in order', () => {
    const ids = (f: Partial<typeof NO_EMPLOYEE_FILTERS>) => filterEmployees(holders, { ...NO_EMPLOYEE_FILTERS, ...f }).map(h => h.employee_id);
    expect(ids({ view: 'soon' })).toEqual(['C1']);
    expect(ids({ view: 'overdue' })).toEqual(['C2']);
    expect(ids({ section: 'Electrical' })).toEqual(['C1']);
    expect(ids({ search: 'bo b' })).toEqual(['C2']);
    expect(sectionCounts(holders)).toEqual([['Electrical', 1], ['Unassigned', 1]]);
  });
  it('counts items and people', () => {
    expect(summarise(rows, holders)).toMatchObject({ employees: 2, active: 3, soon: 1, overdue: 1, employeesSoon: 1, employeesOverdue: 1 });
  });
});

describe('due items', () => {
  const rows = [rec({ id: 'a', expiry_date: day(-1), size: '8', ppe_type: 'safety_shoes', item_name: 'Boots' }), rec({ id: 'b', expiry_date: day(-9), size: '8' }), rec({ id: 'c', expiry_date: day(5) }), rec({ id: 'd', expiry_date: day(-3), status: 'not_required' })];
  it('lists the chosen state oldest first and ignores items marked not required', () => {
    expect(dueItems(rows, 'overdue', NO_DUE_FILTERS).map(r => r.id)).toEqual(['b', 'a']);
    expect(dueItems(rows, 'soon', NO_DUE_FILTERS).map(r => r.id)).toEqual(['c']);
  });
  it('narrows by type, search and date range', () => {
    expect(dueItems(rows, 'overdue', { ...NO_DUE_FILTERS, type: 'safety_shoes' }).map(r => r.id)).toEqual(['a']);
    expect(dueItems(rows, 'overdue', { ...NO_DUE_FILTERS, search: 'boots' }).map(r => r.id)).toEqual(['a']);
    expect(dueItems(rows, 'overdue', { ...NO_DUE_FILTERS, from: day(-5) }).map(r => r.id)).toEqual(['a']);
  });
  it('counts sizes, biggest first, naming a blank size', () => {
    expect(sizeCounts([rec({ size: '8' }), rec({ size: '8' }), rec({ size: '' })])).toEqual([['8', 2], ['Unspecified', 1]]);
  });
});

describe('expiry from the matrix and the form', () => {
  it('adds the months, clears for a type that does not expire, and leaves an unknown type alone', () => {
    expect(expiryFor('helmet', '2026-01-15', { helmet: 24 })).toBe(addMonths('2026-01-15', 24));
    expect(expiryFor('gloves', '2026-01-15', { gloves: 0 })).toBe('');
    expect(expiryFor('mystery', '2026-01-15', { helmet: 24 })).toBeUndefined();
    expect(expiryFor('helmet', '', { helmet: 24 })).toBeUndefined();
  });
  it('names what an issue is missing', () => {
    const base = { employee_id: 'C1', employee_name: 'A', position: 'P', item_name: 'Helmet', ppe_type: 'helmet', issue_date: todayLocal(), expiry_date: '' };
    expect(formProblems(base)).toEqual({});
    expect(formProblems({ ...base, employee_id: ' ', item_name: '' })).toEqual({ employee_id: 'Enter the employee ID.', item_name: 'Enter the item or brand.' });
    expect(formProblems({ ...base, issue_date: '2026-05-10', expiry_date: '2026-05-01' }).expiry_date).toMatch(/before the issue date/);
  });
  it('labels with fallbacks', () => {
    expect(typeName('helmet')).toBe('Safety Helmet');
    expect(typeName('mystery')).toBe('mystery');
    expect(statusMeta('expired').label).toBe('Due');
    expect(conditionMeta('weird').tone).toBe('neutral');
  });
});

describe('stale stored positions (live register wins)', () => {
  // Shaped like Tafadzwa Matangira: PPE rows stored position "Maintenance Engineer" while the register says
  // "Planning Superintendent". The page enriches by register id before grouping, so the live value wins.
  const roster: EmployeeRow[] = [{ employee_id: 'TBA34', employee_name: 'Tafadzwa Matangira', position: 'Planning Superintendent', department: '', section: 'Planning' }];
  it('shows the live designation and section once the record links to the register id', () => {
    const stale = rec({ id: '9', employee_id: 'TBA34', employee_name: 'Tafadzwa  Matangira', position: 'Maintenance Engineer', mine_section: 'Management' });
    const holders = groupByEmployee(enrichPPERecords([stale], roster), roster);
    expect(holders).toHaveLength(1);
    expect(holders[0]).toMatchObject({ employee_name: 'Tafadzwa Matangira', position: 'Planning Superintendent', section: 'Planning' });
    expect(matchToRegister(holders[0], indexRegister(roster))).toBe('linked');
  });
  it('keeps the stored copy, flagged as unmatched, when the record id matches nobody', () => {
    // His rows actually say TBA2, which is on no register row: enrichment cannot help until the link is fixed,
    // so the page must show the stored values and flag the broken link rather than silently showing stale data.
    const broken = rec({ id: '9', employee_id: 'TBA2', employee_name: 'Tafadzwa  Matangira', position: 'Maintenance Engineer', mine_section: 'Management' });
    const holders = groupByEmployee(enrichPPERecords([broken], roster), roster);
    expect(holders).toHaveLength(1);
    expect(holders[0]).toMatchObject({ position: 'Maintenance Engineer', section: 'Management' });
    // The register flag indexes the personnel rows (first/last name), as useRegisterCheck does in production.
    const lookup = [{ id: 38839, employee_id: 'TBA34', first_name: 'Tafadzwa', last_name: 'Matangira' }];
    expect(matchToRegister(holders[0], indexRegister(lookup))).toBe('number-differs');
  });
});

describe('renewalTarget (issuing from the order list renews the item in place; nothing is marked returned)', () => {
  const issue = { employee_id: 'C1', ppe_type: 'helmet' };
  it('renews an item that was overdue', () => {
    const old = rec({ id: '7', expiry_date: day(-5) });
    expect(renewalTarget([old], '7', issue)).toBe(old);
  });
  it('renews an item that was not yet due, in date or only expiring soon, exactly the same way', () => {
    const inDate = rec({ id: '7', expiry_date: day(200) });
    const soon = rec({ id: '8', expiry_date: day(10) });
    expect(renewalTarget([inDate], '7', issue)).toBe(inDate);
    expect(renewalTarget([soon], '8', issue)).toBe(soon);
  });
  it('renews an item with no expiry', () => {
    const old = rec({ id: '7', expiry_date: null });
    expect(renewalTarget([old], '7', issue)).toBe(old);
  });
  it('finds the record by id whatever the type of the id, and ignores the other records', () => {
    const other = rec({ id: '3' }); const old = rec({ id: '12' });
    expect(renewalTarget([other, old], '12', issue)).toBe(old);
  });
  it('matches the person by normalised employee ID and the kind of PPE without regard to case or spaces', () => {
    const old = rec({ id: '7', employee_id: ' c1 ', ppe_type: 'Helmet ' });
    expect(renewalTarget([old], '7', { employee_id: 'C1', ppe_type: 'helmet' })).toBe(old);
  });
  it('is a plain new issue when there is no order entry', () => {
    expect(renewalTarget([rec({ id: '7' })], null, issue)).toBeUndefined();
    expect(renewalTarget([rec({ id: '7' })], undefined, issue)).toBeUndefined();
    expect(renewalTarget([rec({ id: '7' })], '', issue)).toBeUndefined();
  });
  it('is a plain new issue when the record is gone or already closed', () => {
    expect(renewalTarget([], '7', issue)).toBeUndefined();
    for (const status of ['returned', 'lost', 'damaged', 'not_required', 'expired'] as const) expect(renewalTarget([rec({ id: '7', status })], '7', issue)).toBeUndefined();
  });
  it('never touches the record when the issue is for another person or another kind of PPE', () => {
    const old = rec({ id: '7' });
    expect(renewalTarget([old], '7', { employee_id: 'C2', ppe_type: 'helmet' })).toBeUndefined();
    expect(renewalTarget([old], '7', { employee_id: 'C1', ppe_type: 'gloves' })).toBeUndefined();
  });
});
