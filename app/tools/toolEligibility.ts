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

export type Eligibility = {
  /** Equipment each employee is currently trained, qualified and authorised for, keyed by the employee's backend id. */
  forEmployee: Map<string, Tool[]>;
  /** Active employees currently eligible for each tool, keyed by the tool's backend id (someone who has been deactivated is not offered). */
  forTool: Map<string, Employee[]>;
};

/** Both directions of the eligibility register at once, so the page can show it by person and by equipment from one pass. */
export function buildEligibility(employees: Employee[], tools: Tool[], competencies: CompetencyRecord[], now = Date.now()): Eligibility {
  const byEmployee = new Map<string, CompetencyRecord[]>();
  for (const record of competencies) byEmployee.set(record.employee_id, [...(byEmployee.get(record.employee_id) || []), record]);
  const forEmployee = new Map<string, Tool[]>();
  const forTool = new Map<string, Employee[]>();
  for (const tool of tools) if (tool.backendId) forTool.set(tool.backendId, []);
  for (const employee of employees) {
    if (!employee.backendId) continue;
    const records = byEmployee.get(employee.backendId) || [];
    const eligible: Tool[] = [];
    for (const tool of tools) {
      if (!tool.backendId || tool.archived) continue;
      const record = records.find(item => item.tool_id === tool.backendId)
        || records.find(item => !item.tool_id && item.category?.toLowerCase() === tool.category.toLowerCase());
      if (!isCurrentCompetency(record, now)) continue;
      eligible.push(tool);
      if (employee.active) forTool.get(tool.backendId)?.push(employee);
    }
    forEmployee.set(employee.backendId, eligible);
  }
  return { forEmployee, forTool };
}

/** The name on the most recently saved approval, so the next one defaults to the same authorising officer. */
export function latestAuthoriser(competencies: CompetencyRecord[]): string {
  return competencies
    .filter(record => record.authorized && record.authorized_by)
    .sort((left, right) => (right.updated_at || '').localeCompare(left.updated_at || ''))[0]?.authorized_by || '';
}
