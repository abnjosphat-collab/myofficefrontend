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

export type EligibilityBasis = { kind: 'individual' } | { kind: 'section'; section: string } | { kind: 'open' };

export type Eligibility = {
  /** Equipment each employee may receive, keyed by the employee's backend id. */
  forEmployee: Map<string, Tool[]>;
  /** Active employees who may receive each tool, keyed by the tool's backend id (someone who has been deactivated is not offered). */
  forTool: Map<string, Employee[]>;
  /** Why each pair is eligible, keyed by tool and employee backend id. */
  basis: Map<string, EligibilityBasis>;
};

export const eligibilityKey = (toolBackendId: string, employeeBackendId: string) => `${toolBackendId}::${employeeBackendId}`;

/** Both directions of the eligibility register at once, so the page can show it by person and by equipment from one pass.
Follows the server's eligible list per tool (the one rule in _is_eligible) rather than a second client-side copy of it. */
export function buildEligibility(employees: Employee[], tools: Tool[]): Eligibility {
  const byId = new Map(employees.filter(employee => employee.backendId).map(employee => [employee.backendId as string, employee]));
  const forEmployee = new Map<string, Tool[]>();
  const forTool = new Map<string, Employee[]>();
  const basis = new Map<string, EligibilityBasis>();
  for (const tool of tools) if (tool.backendId) forTool.set(tool.backendId, []);
  for (const tool of tools) {
    if (!tool.backendId || tool.archived) continue;
    for (const entry of tool.eligibleEmployees || []) {
      const employee = byId.get(entry.id);
      if (!employee?.backendId) continue;
      const why: EligibilityBasis = tool.competencyRequired === false ? { kind: 'open' } : entry.viaSection ? { kind: 'section', section: entry.viaSection } : { kind: 'individual' };
      basis.set(eligibilityKey(tool.backendId, employee.backendId), why);
      if (!forEmployee.has(employee.backendId)) forEmployee.set(employee.backendId, []);
      forEmployee.get(employee.backendId)?.push(tool);
      if (employee.active) forTool.get(tool.backendId)?.push(employee);
    }
  }
  for (const employee of employees) if (employee.backendId && !forEmployee.has(employee.backendId)) forEmployee.set(employee.backendId, []);
  return { forEmployee, forTool, basis };
}

/** The name on the most recently saved approval, so the next one defaults to the same authorising officer. */
export function latestAuthoriser(competencies: CompetencyRecord[]): string {
  return competencies
    .filter(record => record.authorized && record.authorized_by)
    .sort((left, right) => (right.updated_at || '').localeCompare(left.updated_at || ''))[0]?.authorized_by || '';
}
