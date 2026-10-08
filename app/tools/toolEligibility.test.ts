import { describe, expect, it } from 'vitest';
import type { CompetencyRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import { buildEligibility, competencyForEmployeeTool, groupEmployeesByDepartment, isCurrentCompetency, latestAuthoriser } from './toolEligibility';

const employees: Employee[] = [
  { id: '3', employeeNumber: 'E-3', name: 'Zulu', department: 'Mining', active: true },
  { id: '2', employeeNumber: 'E-2', name: 'Beta', department: 'Engineering', active: true },
  { id: '1', employeeNumber: 'E-1', name: 'Alpha', department: 'Engineering', active: true },
];

describe('groupEmployeesByDepartment', () => {
  it('orders departments and employees consistently', () => {
    expect(groupEmployeesByDepartment(employees).map(group => [group.department, group.employees.map(employee => employee.name)])).toEqual([
      ['Engineering', ['Alpha', 'Beta']],
      ['Mining', ['Zulu']],
    ]);
  });
});

describe('competencyForEmployeeTool', () => {
  it('prefers a tool-specific record over category authorization', () => {
    const employee = { ...employees[0], backendId: 'employee-1' };
    const tool = { id: 'T-1', backendId: 'tool-1', name: 'Grinder', make: '', serial: '', category: 'Power tools', kind: 'angle-grinder', status: 'available', location: 'Store', condition: 'Good' } as Tool;
    const category = { id: 'category', employee_id: 'employee-1', category: 'Power tools', trained: true, qualified: true, authorized: true, updated_at: '' } as CompetencyRecord;
    const exact = { ...category, id: 'exact', tool_id: 'tool-1', authorized: false };
    expect(competencyForEmployeeTool(employee, tool, [category, exact])?.id).toBe('exact');
  });
});

describe('isCurrentCompetency', () => {
  it('requires all three approvals and rejects expired records', () => {
    const record = { id: '1', employee_id: 'employee-1', trained: true, qualified: true, authorized: true, training_expires_at: '2030-01-01T00:00:00Z', updated_at: '' } as CompetencyRecord;
    expect(isCurrentCompetency(record, Date.parse('2029-01-01T00:00:00Z'))).toBe(true);
    expect(isCurrentCompetency(record, Date.parse('2031-01-01T00:00:00Z'))).toBe(false);
    expect(isCurrentCompetency({ ...record, qualified: false }, Date.parse('2029-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('buildEligibility', () => {
  const people = [
    { id: 'a', backendId: 'ea', employeeNumber: 'E-A', name: 'Ann', department: 'Engineering', active: true },
    { id: 'b', backendId: 'eb', employeeNumber: 'E-B', name: 'Bob', department: 'Engineering', active: true },
  ] as Employee[];
  const make = (id: string, category: string, archived = false) => ({ id: `T-${id}`, backendId: id, name: `Tool ${id}`, make: '', serial: '', category, kind: 'power-tool', status: 'available', location: 'Store', condition: 'Good', archived }) as Tool;
  const tools = [make('t1', 'Welding'), make('t2', 'Power tools'), make('t3', 'Welding', true)];
  const rec = (over: Partial<CompetencyRecord>) => ({ id: 'r', employee_id: 'ea', trained: true, qualified: true, authorized: true, updated_at: '', ...over }) as CompetencyRecord;

  it('lists both directions from tool records and category approvals, skipping archived tools and lapsed approvals', () => {
    const result = buildEligibility(people, tools, [
      rec({ tool_id: 't1' }),
      rec({ id: 'c', employee_id: 'eb', tool_id: undefined, category: 'power tools' }),
      rec({ id: 'x', employee_id: 'eb', tool_id: 't1', authorized: false }),
      rec({ id: 'old', tool_id: 't3' }),
      rec({ id: 'lapsed', employee_id: 'ea', tool_id: 't2', authorization_expires_at: '2001-01-01T00:00:00Z' }),
    ], Date.parse('2026-10-07'));
    expect(result.forEmployee.get('ea')?.map(tool => tool.backendId)).toEqual(['t1']);
    expect(result.forEmployee.get('eb')?.map(tool => tool.backendId)).toEqual(['t2']);
    expect(result.forTool.get('t1')?.map(person => person.name)).toEqual(['Ann']);
    expect(result.forTool.get('t2')?.map(person => person.name)).toEqual(['Bob']);
  });

  it('gives a person and a tool with nothing recorded an empty list, not a missing one', () => {
    const result = buildEligibility(people, tools, []);
    expect(result.forEmployee.get('ea')).toEqual([]);
    expect(result.forTool.get('t2')).toEqual([]);
  });
});

describe('latestAuthoriser', () => {
  it('is the authoriser on the most recent approval, and blank when there is none', () => {
    const recs = [
      { id: '1', employee_id: 'a', authorized: true, authorized_by: 'Old Name', updated_at: '2026-10-01T00:00:00Z' },
      { id: '2', employee_id: 'b', authorized: true, authorized_by: 'Edson Mavhondo', updated_at: '2026-10-06T00:00:00Z' },
      { id: '3', employee_id: 'c', authorized: false, authorized_by: 'Revoked By', updated_at: '2026-10-07T00:00:00Z' },
    ] as CompetencyRecord[];
    expect(latestAuthoriser(recs)).toBe('Edson Mavhondo');
    expect(latestAuthoriser([])).toBe('');
  });
});
