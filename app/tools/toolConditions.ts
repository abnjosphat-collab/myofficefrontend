// app/tools/toolConditions.ts — what must be true before a tool can be issued: the checks the form shows
// when a tool is picked, mirroring what the backend enforces (availability, competency, overdue inspections,
// the pre-use check) plus the tool's own requirements (calibration, PPE, tracking) as information.
import type { Employee, Tool } from './prototype';

export type ConditionState = 'met' | 'unmet' | 'info' | 'attention';
export interface ToolCondition {
  key: string;
  label: string;
  detail?: string;
  state: ConditionState;
  /** The backend refuses the issue while this is unmet (or needs the written override). */
  blocker: boolean;
}

const employeeIds = (employee: Employee) => [employee.backendId, employee.employeeNumber].filter(Boolean) as string[];

export function toolConditions(tool: Tool, employee?: Employee | null, opts?: { preUseChecked?: boolean; kind?: 'issue' | 'transfer' }): ToolCondition[] {
  const kind = opts?.kind ?? 'issue';
  const rows: ToolCondition[] = [];

  if (tool.archived) {
    rows.push({ key: 'availability', label: 'Archived', detail: 'Restore it before issuing.', state: 'unmet', blocker: true });
  } else if (tool.status === 'available') {
    rows.push({ key: 'availability', label: 'Ready to issue', state: 'met', blocker: false });
  } else if (tool.holder) {
    rows.push({ key: 'availability', label: `With ${tool.holder.split(' · ')[0]}`, detail: 'Transfer the open loan instead of issuing.', state: 'unmet', blocker: true });
  } else {
    rows.push({ key: 'availability', label: 'Needs attention', detail: 'Mark it ready before issuing.', state: 'unmet', blocker: true });
  }

  const eligible = tool.eligibleEmployees;
  if (eligible === undefined) {
    rows.push({ key: 'competency', label: 'No competency list', detail: 'Any active employee may take it.', state: 'info', blocker: false });
  } else if (!employee) {
    rows.push({ key: 'competency', label: 'Competency unchecked', detail: 'Pick an employee to check training, qualification and authorization.', state: 'info', blocker: false });
  } else {
    const ids = employeeIds(employee);
    const ok = eligible.some(item => ids.includes(item.id) || ids.includes(item.employeeNumber));
    rows.push(ok
      ? { key: 'competency', label: 'Trained, qualified and authorized', state: 'met', blocker: false }
      : { key: 'competency', label: 'Not qualified for this equipment', detail: 'Update the Compliance register first.', state: 'unmet', blocker: true });
  }

  const due = tool.inspectionDue || [];
  if (due.length === 0) {
    rows.push({ key: 'inspections', label: 'Inspections current', state: 'met', blocker: false });
  } else {
    const names = due.map(item => item.replace('_', ' ')).join(', ');
    rows.push({ key: 'inspections', label: `${names} check overdue`, detail: 'Complete it, or go ahead anyway with a written reason.', state: 'unmet', blocker: true });
  }

  if (kind === 'issue' && tool.preUseCheckRequired === true) {
    rows.push(opts?.preUseChecked
      ? { key: 'pre-use', label: 'Pre-use inspection confirmed', state: 'met', blocker: false }
      : { key: 'pre-use', label: 'Pre-use inspection must be confirmed', state: 'unmet', blocker: true });
  }

  if (tool.calibrationRequired) {
    rows.push({ key: 'calibration', label: 'Calibration required', detail: tool.calibrationFrequencyDays ? `Every ${tool.calibrationFrequencyDays} days.` : undefined, state: 'info', blocker: false });
  }
  if ((tool.requiredPpe || []).length > 0) {
    rows.push({ key: 'ppe', label: `PPE: ${tool.requiredPpe!.join(', ')}`, state: 'info', blocker: false });
  }
  if (tool.criticality === 'safety_critical') {
    rows.push({ key: 'criticality', label: 'Safety-critical tool', state: 'attention', blocker: false });
  } else if (tool.criticality === 'high') {
    rows.push({ key: 'criticality', label: 'High criticality', state: 'info', blocker: false });
  }
  if (tool.cctvRequired) rows.push({ key: 'cctv', label: 'CCTV tracking required', state: 'info', blocker: false });
  if (tool.gpsRequired) rows.push({ key: 'gps', label: 'GPS tracking required', state: 'info', blocker: false });
  if (tool.workingStatus === 'not_working') {
    rows.push({ key: 'working', label: 'Marked not working', detail: 'Check it before issuing.', state: 'attention', blocker: false });
  }
  return rows;
}

/** Blockers that stop the issue (overdue inspections clear with the written override). */
export function blockingConditions(rows: ToolCondition[], overridden = false): ToolCondition[] {
  return rows.filter(row => row.state === 'unmet' && row.blocker && (overridden ? row.key !== 'inspections' : true));
}
