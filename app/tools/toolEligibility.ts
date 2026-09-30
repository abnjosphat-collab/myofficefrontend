import type { CompetencyRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';

export type EmployeeDepartmentGroup = {
  department: string;
  employees: Employee[];
};

export function groupEmployeesByDepartment(employees: Employee[]): EmployeeDepartmentGroup[] {
  const groups = new Map<string, Employee[]>();
  for (const employee of employees) {
    const department = employee.department.trim() || 'Department not recorded';
    groups.set(department, [...(groups.get(department) || []), employee]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([department, members]) => ({
      department,
      employees: members.sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

export function competencyForEmployeeTool(employee: Employee, tool: Tool, competencies: CompetencyRecord[]) {
  if (!employee.backendId || !tool.backendId) return undefined;
  const records = competencies.filter(record => record.employee_id === employee.backendId);
  return records.find(record => record.tool_id === tool.backendId)
    || records.find(record => !record.tool_id && record.category?.toLowerCase() === tool.category.toLowerCase());
}

export function isCurrentCompetency(record?: CompetencyRecord, now = Date.now()) {
  if (!record?.trained || !record.qualified || !record.authorized) return false;
  return [record.training_expires_at, record.qualification_expires_at, record.authorization_expires_at]
    .every(value => !value || Date.parse(value) >= now);
}
