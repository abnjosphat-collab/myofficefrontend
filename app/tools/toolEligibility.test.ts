import { describe, expect, it } from 'vitest';
import type { CompetencyRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import { competencyForEmployeeTool, groupEmployeesByDepartment, isCurrentCompetency } from './toolEligibility';

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
