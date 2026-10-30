// app/tools/toolConditions.ts — what must be true before a tool can be issued: the checks the form shows
// when a tool is picked, mirroring what the backend enforces (availability, competency, overdue inspections,
// the pre-use check) plus the tool's own requirements (calibration, PPE, tracking) as information.
import type { Employee, Tool } from './prototype';

export type ConditionState = 'met' | 'unmet' | 'info' | 'attention';
/** What unblocks the row, offered inline: receive/transfer the open loan, record the missing check/repair, or set who may use the tool. */
export type ConditionAction = 'receive' | 'transfer' | 'record-check' | 'record-repair' | 'manage-eligibility';
export interface ToolCondition {
  key: string;
  label: string;
  detail?: string;
  state: ConditionState;
  /** The backend refuses the issue while this is unmet (or needs the written override). */
  blocker: boolean;
  actions?: ConditionAction[];
}
/** Button labels for the resolving actions, one source for every surface that offers them. */
export const CONDITION_ACTION_LABELS: Record<ConditionAction, string> = { receive: 'Receive', transfer: 'Transfer', 'record-check': 'Record check', 'record-repair': 'Record repair', 'manage-eligibility': 'Set who can use it' };

/** Mirror of the backend register's `_needs_attention`: not working, or recorded as defective, missing or damaged, is not fit to issue. */
const FAULT_CONDITIONS = new Set(['Defective', 'Missing', 'Damaged']);
export function needsAttention(tool: Tool): boolean {
  return tool.workingStatus === 'not_working' || FAULT_CONDITIONS.has(tool.condition);
}

const employeeIds = (employee: { backendId?: string; employeeNumber: string | null }) => [employee.backendId, employee.employeeNumber].filter(Boolean) as string[];

/** "Monthly, quarterly check overdue": the due-check names read as a sentence-leading title (conditions panel, override notice), so the first one is capitalized. */
export function overdueCheckLabel(due: readonly string[]): string {
  const names = due.map(item => item.replace('_', ' ')).join(', ');
  return `${names.charAt(0).toUpperCase()}${names.slice(1)} check overdue`;
}

/** One predicate for "nobody can take this tool", shared by every picker and issue button. The server builds the list from active people only, so an empty list means no active eligible person; no list at all (or no competency requirement) means anyone may take it — the same reading as isEligibleForTool. */
export function nobodyCanUse(tool: Tool): boolean {
  return tool.competencyRequired !== false && tool.eligibleEmployees !== undefined && tool.eligibleEmployees.length === 0;
}

/** One predicate for "may this person take this tool", shared by the conditions panel and both issue forms. Unknown numbers match nothing: two people without numbers are never the same person, and a numberless person only matches by id. */
export function isEligibleForTool(tool: Tool, employee: { backendId?: string; employeeNumber: string | null }): boolean {
  if (tool.competencyRequired === false) return true;
  const eligible = tool.eligibleEmployees;
  if (eligible === undefined) return true;
  const ids = employeeIds(employee);
  return eligible.some(item => ids.includes(item.id) || (item.employeeNumber != null && ids.includes(item.employeeNumber)));
}

export function toolConditions(tool: Tool, employee?: Employee | null): ToolCondition[] {
  const rows: ToolCondition[] = [];

  if (tool.archived) {
    rows.push({ key: 'availability', label: 'Archived', detail: 'Restore it before issuing.', state: 'unmet', blocker: true });
  } else if (tool.status === 'available' && !needsAttention(tool)) {
    rows.push({ key: 'availability', label: 'Ready to issue', state: 'met', blocker: false });
  } else if (tool.holder) {
    rows.push({ key: 'availability', label: `With ${tool.holder.split(' · ')[0]}`, detail: 'Receive it back or transfer the open loan instead of issuing.', state: 'unmet', blocker: true, actions: ['receive', 'transfer'] });
  } else {
    rows.push({ key: 'availability', label: 'Needs attention', detail: 'Record what was repaired, then mark it ready before issuing.', state: 'unmet', blocker: true, actions: ['record-repair'] });
  }

  const eligible = tool.eligibleEmployees;
  if (nobodyCanUse(tool)) {
    rows.push({ key: 'competency', label: 'Nobody can use it yet', detail: 'Set who is trained, qualified and authorized before issuing.', state: 'unmet', blocker: true, actions: ['manage-eligibility'] });
  } else if (tool.competencyRequired === false) {
    rows.push({ key: 'competency', label: 'No training needed for this item', detail: 'Any active employee may take it.', state: 'info', blocker: false });
  } else if (eligible === undefined) {
    rows.push({ key: 'competency', label: 'No competency list', detail: 'Any active employee may take it.', state: 'info', blocker: false });
  } else if (!employee) {
    rows.push({ key: 'competency', label: 'Competency unchecked', detail: 'Pick an employee to check training, qualification and authorization.', state: 'info', blocker: false });
  } else {
    rows.push(isEligibleForTool(tool, employee)
      ? { key: 'competency', label: 'Trained, qualified and authorized', state: 'met', blocker: false }
      : { key: 'competency', label: 'Not qualified for this tool', detail: 'Update the Compliance register first.', state: 'unmet', blocker: true });
  }

  const due = tool.inspectionDue || [];
  if (due.length === 0) {
    rows.push({ key: 'inspections', label: 'Inspections current', state: 'met', blocker: false });
  } else {
    rows.push({ key: 'inspections', label: overdueCheckLabel(due), detail: 'Record the check now, or go ahead anyway with a written reason.', state: 'unmet', blocker: true, actions: ['record-check'] });
  }

  if (tool.preUseCheckRequired === true) {
    rows.push({ key: 'pre-use', label: 'Pre-use inspection follows issue', detail: 'The borrower records it after receiving the tool.', state: 'info', blocker: false });
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
