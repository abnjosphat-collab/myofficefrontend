import { describe, expect, it } from 'vitest';
import { ARTISAN_FILTER_VALUE } from '@/lib/employeeCatalog';
import { NO_FILTERS, filterEmployees, formProblems, fullName, groupByProfession, groupBySectionAndProfession, isFiltered, necEmployees, sortEmployees, summarise, tenure } from './roster';
import type { Employee } from './types';

const emp = (o: Partial<Employee> = {}): Employee => ({ id: 1, employee_id: 'C1', first_name: 'Ann', last_name: 'Alpha', ...o }) as Employee;

describe('tenure', () => {
  const NOW = new Date(2026, 9, 4);
  it('counts whole years and months, and says so for a new start', () => {
    expect(tenure('2023-06-01', NOW)).toBe('3y 4m');
    expect(tenure('2026-01-10', NOW)).toBe('8m');
    expect(tenure('2026-10-01', NOW)).toBe('Less than a month');
    expect(tenure('2020-10-01', NOW)).toBe('6y');
  });
  it('is empty for no date, a bad date or a date in the future', () => {
    expect(tenure(undefined, NOW)).toBe('');
    expect(tenure('soon', NOW)).toBe('');
    expect(tenure('2030-01-01', NOW)).toBe('');
  });
});

describe('grouping', () => {
  const rows = [
    emp({ id: 1, first_name: 'A', section: 'Electrical', designation: 'Electrician' }),
    emp({ id: 2, first_name: 'B', section: 'mechanical', designation: 'Fitter' }),
    emp({ id: 3, first_name: 'C', section: 'Mechanical', designation: 'Fitter' }),
    emp({ id: 4, first_name: 'D', section: '', designation: 'Clerk' }),
    emp({ id: 5, first_name: 'E', section: 'Management', designation: 'Manager' }),
  ];
  it('orders sections the mine\'s way with Unassigned last, folding mixed case', () => {
    expect(groupBySectionAndProfession(rows).map(g => g.section)).toEqual(['Management', 'Mechanical', 'Electrical', 'Unassigned']);
    expect(groupBySectionAndProfession(rows).find(g => g.section === 'Mechanical')?.employees).toHaveLength(2);
  });
  it('lists trades within a section and applies the colour function', () => {
    const g = groupBySectionAndProfession(rows, s => `c-${s}`).find(x => x.section === 'Mechanical')!;
    expect(g.color).toBe('c-Mechanical');
    expect(g.subgroups.map(s => s.employees.length).reduce((a, b) => a + b, 0)).toBe(2);
  });
  it('groups by trade alone with Unclassified last', () => {
    const g = groupByProfession([emp({ designation: 'Fitter' }), emp({ id: 2, designation: '' }), emp({ id: 3, designation: 'Fitter' })]);
    expect(g.map(x => x.designation)).toEqual(['Fitter', 'Unclassified']);
    expect(g[0].employees).toHaveLength(2);
  });
});

describe('filter, sort, summarise', () => {
  const rows = [
    emp({ id: 1, employee_id: 'C10', first_name: 'Zed', last_name: 'One', employment_type: 'NEC', employee_class: 'Permanent', section: 'Mechanical', designation: 'Fitter', date_of_engagement: '2020-01-01' }),
    emp({ id: 2, employee_id: 'C2', first_name: 'Amy', last_name: 'Two', employment_type: 'SALARIED', employee_class: 'Contract', section: 'Electrical', designation: 'Electrician', date_of_engagement: '2022-05-01' }),
    emp({ id: 3, employee_id: 'C3', first_name: 'Bob', last_name: 'Three', archived: true }),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>) => filterEmployees(rows, { ...NO_FILTERS, ...f }).map(e => e.id);
  it('shows active people by default, and archived or everyone on request', () => {
    expect(ids({})).toEqual([1, 2]);
    expect(ids({ show: 'archived' })).toEqual([3]);
    expect(ids({ show: 'all' })).toEqual([1, 2, 3]);
  });
  it('filters by search, type, class and section', () => {
    expect(ids({ search: 'amy' })).toEqual([2]);
    expect(ids({ search: 'c10' })).toEqual([1]);
    expect(ids({ etype: 'NEC' })).toEqual([1]);
    expect(ids({ cls: 'Contract' })).toEqual([2]);
    expect(ids({ section: 'Electrical' })).toEqual([2]);
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, show: 'all' })).toBe(true);
    expect(filterEmployees(rows, { ...NO_FILTERS, role: ARTISAN_FILTER_VALUE }).every(e => !!e.designation)).toBe(true);
  });
  it('sorts by name, id and engagement date either way without mutating', () => {
    const active = rows.slice(0, 2);
    expect(sortEmployees(active, 'first_name', 'asc').map(e => e.id)).toEqual([2, 1]);
    expect(sortEmployees(active, 'first_name', 'desc').map(e => e.id)).toEqual([1, 2]);
    expect(sortEmployees(active, 'date_of_engagement', 'desc').map(e => e.id)).toEqual([2, 1]);
    expect(active.map(e => e.id)).toEqual([1, 2]);
    expect(fullName(active[0])).toBe('Zed One');
  });
  it('counts active people by type and class and the archived separately', () => {
    expect(summarise(rows)).toMatchObject({ total: 2, archived: 1, nec: 1, salaried: 1, permanent: 1 });
  });
});

describe('formProblems', () => {
  it('names each missing required field', () => {
    expect(formProblems({ employee_id: ' ', first_name: 'A', last_name: '', id_number: '', designation: '' })).toEqual({
      employee_id: 'Enter the mine number.', last_name: 'Enter the last name.', id_number: 'Enter the national ID or passport number.', designation: 'Choose the designation.',
    });
    expect(formProblems({ employee_id: 'C1', first_name: 'A', last_name: 'B', id_number: '1', designation: 'Fitter' })).toEqual({});
  });
});

describe('necEmployees', () => {
  it('keeps only people on NEC terms, leaving out salaried staff and anyone with no type set', () => {
    const list = [{ employment_type: 'NEC', id: 1 }, { employment_type: 'SALARIED', id: 2 }, { employment_type: '', id: 3 }, { employment_type: 'NEC', id: 4 }] as Array<Pick<Employee, 'employment_type'> & { id: number }>;
    expect(necEmployees(list).map(e => e.id)).toEqual([1, 4]);
    expect(necEmployees([])).toEqual([]);
  });
});
