import { fuzzyMatch } from './fuzzySearch';

/** Local design fixtures. These records never touch the operational ledger. */
export type Status = 'available' | 'issued' | 'overdue' | 'attention';
export type EquipmentKind =
  | 'cordless-drill' | 'rotary-hammer' | 'angle-grinder'
  | 'digital-multimeter' | 'clamp-meter' | 'torque-wrench'
  | 'inverter-welder' | 'laser-level' | 'socket-set'
  | 'laptop' | 'work-lamp' | 'survey-equipment' | 'tool-kit'
  | 'power-tool' | 'hand-tool' | 'test-instrument'
  | 'welding-equipment' | 'lifting-equipment' | 'other-equipment';
export type Evidence = { id: string; name: string; type: string; size: number; url: string };
export type Employee = { id: string; backendId?: string; employeeNumber: string; name: string; department: string; jobTitle?: string; active: boolean };
export type AccountRole = 'admin' | 'issuer' | 'viewer';
export type WorkspaceAccount = { id: string; name: string; username: string; password: string; role: AccountRole; department?: string; canIssue: boolean; token?: string };
export type Tool = { id: string; backendId?: string; name: string; make: string; serial: string; category: string; kind: EquipmentKind; status: Status; location: string; holder?: string; due?: string; dueISO?: string; originalDue?: string; job?: string; assignedEquipment?: string[]; condition: string; notes?: string; department?: string; section?: string; archived?: boolean; evidence?: Evidence[]; calibration?: string; approvalRef?: string; specifications?: Record<string,string> };
export type Activity = { id: string; toolId: string; title: string; detail: string; time: string; recordedBy?: string; issuedAt?: string; returnedAt?: string };
export const STATUS: Record<Status, string> = { available: 'Ready to use', issued: 'With an employee', overdue: 'Return overdue', attention: 'Needs attention' };
export const PEOPLE = ['Alex Morgan · EMP-014', 'Jordan Ellis · EMP-028', 'Sam Taylor · EMP-036', 'Casey Brooks · EMP-041'];
export const LOCATIONS = ['Main workshop', 'Mechanical bay', 'Electrical bay', 'South workshop'];
export const JOBS = ['WO-2408 · Conveyor service', 'WO-2412 · Pump inspection', 'WO-2416 · Workshop repairs'];
export const CATEGORIES = ['Power tools', 'Hand tools', 'Test & measure', 'Welding', 'Lifting equipment', 'IT equipment', 'Surveying', 'Lighting', 'Other equipment'];
export const EQUIPMENT_TYPES: ReadonlyArray<{ value: EquipmentKind; label: string; category: string }> = [
  { value: 'cordless-drill', label: 'Cordless drill / driver', category: 'Power tools' },
  { value: 'rotary-hammer', label: 'Rotary hammer', category: 'Power tools' },
  { value: 'angle-grinder', label: 'Angle grinder', category: 'Power tools' },
  { value: 'power-tool', label: 'Other power tool', category: 'Power tools' },
  { value: 'torque-wrench', label: 'Torque wrench', category: 'Hand tools' },
  { value: 'socket-set', label: 'Socket wrench set', category: 'Hand tools' },
  { value: 'hand-tool', label: 'Other hand tool', category: 'Hand tools' },
  { value: 'digital-multimeter', label: 'Digital multimeter', category: 'Test & measure' },
  { value: 'clamp-meter', label: 'Clamp meter', category: 'Test & measure' },
  { value: 'laser-level', label: 'Laser level', category: 'Test & measure' },
  { value: 'test-instrument', label: 'Other test instrument', category: 'Test & measure' },
  { value: 'inverter-welder', label: 'Inverter welder', category: 'Welding' },
  { value: 'welding-equipment', label: 'Other welding equipment', category: 'Welding' },
  { value: 'lifting-equipment', label: 'Lifting equipment', category: 'Lifting equipment' },
  { value: 'laptop', label: 'Laptop or computer', category: 'IT equipment' },
  { value: 'survey-equipment', label: 'Survey equipment', category: 'Surveying' },
  { value: 'work-lamp', label: 'Work lamp', category: 'Lighting' },
  { value: 'tool-kit', label: 'Tool kit', category: 'Other equipment' },
  { value: 'other-equipment', label: 'Other equipment', category: 'Other equipment' },
];
export function equipmentTypesForCategory(category: string) { return EQUIPMENT_TYPES.filter(type => type.category === category); }
export function defaultEquipmentKind(category: string): EquipmentKind { return equipmentTypesForCategory(category)[0]?.value ?? 'other-equipment'; }
const EQUIPMENT_KINDS = new Set<EquipmentKind>(EQUIPMENT_TYPES.map(type => type.value));
const KIND_HINTS: ReadonlyArray<[RegExp,EquipmentKind]> = [
  [/clamp meter/, 'clamp-meter'], [/multimeter|voltmeter/, 'digital-multimeter'],
  [/torque wrench/, 'torque-wrench'], [/angle grinder/, 'angle-grinder'],
  [/rotary hammer|core drill/, 'rotary-hammer'], [/cordless|impact drill|drill driver/, 'cordless-drill'],
  [/mig welder|inverter welder/, 'inverter-welder'], [/weld/, 'welding-equipment'],
  [/laser (distance|level)/, 'laser-level'], [/socket set/, 'socket-set'],
  [/laptop|notebook computer/, 'laptop'], [/work lamp|portable lamp/, 'work-lamp'],
  [/total station|survey|gnss|optical level/, 'survey-equipment'],
  [/tool kit|toolkit/, 'tool-kit'], [/lifting|chain block|hoist/, 'lifting-equipment'],
  [/tester|detector|instrument/, 'test-instrument'],
];
export function inferEquipmentKind(name: string, category: string, storedKind?: string): EquipmentKind {
  if (storedKind && storedKind !== 'other-equipment' && EQUIPMENT_KINDS.has(storedKind as EquipmentKind)) return storedKind as EquipmentKind;
  const description = `${name} ${category}`.toLowerCase();
  return KIND_HINTS.find(([pattern]) => pattern.test(description))?.[1] ?? defaultEquipmentKind(category);
}
export const DEPARTMENTS = ['Engineering', 'Mining', 'Mine Technical Services', 'IT'];
export const departmentOf = (tool: Tool) => tool.department || 'Engineering';
export const primaryToolImage = (tool: Tool) => tool.evidence?.find(file => file.type.startsWith('image/'))?.url;
export const SEED_TOOLS: Tool[] = [];
export const SEED_ACTIVITY: Activity[] = [];
export type ActionKind = 'issue' | 'return' | 'transfer' | 'extend';
export type Movement = { kind: ActionKind; toolId: string; person: string; location: string; due: string; job: string; assignedEquipment?: string[]; condition: string; notes: string; dueISO?: string; evidence?: Evidence[]; calibration?: string; approvalRef?: string; gatePass?: string; movementScope?: string; department?: string };
export function applyMovement(tool: Tool, input: Movement): Tool {
  if (tool.archived) throw new Error('Restore this tool before recording a movement.');
  if (input.kind === 'issue' && tool.status !== 'available') throw new Error('This tool is not available to issue.');
  if (input.kind !== 'issue' && !['issued', 'overdue'].includes(tool.status)) throw new Error('This tool has no open loan.');
  const evidence = [...(tool.evidence || []), ...(input.evidence || [])];
  if (input.kind === 'return') return { ...tool, status: input.condition === 'Good' && !['Expired', 'Not verified'].includes(input.calibration || '') ? 'available' : 'attention', holder: undefined, due: undefined, dueISO: undefined, originalDue: undefined, job: undefined, location: input.location, condition: input.condition, notes: input.notes, evidence, calibration: input.calibration || tool.calibration };
  if (input.kind === 'extend') return { ...tool, due: input.due, dueISO: input.dueISO, originalDue: tool.originalDue || tool.due, status: 'issued', notes: input.notes, evidence };
  return { ...tool, status: input.kind === 'transfer' ? tool.status : 'issued', holder: input.person, location: input.location, due: input.kind === 'transfer' ? tool.due : input.due, dueISO: input.kind === 'transfer' ? tool.dueISO : input.dueISO, originalDue: tool.originalDue || tool.due || input.due, job: input.job || tool.job, assignedEquipment: input.assignedEquipment?.length ? input.assignedEquipment : tool.assignedEquipment, notes: input.notes, evidence };
}
export function matchesTool(tool: Tool, search: string) {
  return fuzzyMatch(search, `${tool.id} ${tool.name} ${tool.make} ${tool.serial} ${tool.category} ${tool.condition} ${tool.holder ?? ''} ${tool.location} ${tool.job || ''} ${tool.notes || ''} ${departmentOf(tool)} ${tool.section || ''}`);
}

export function attachmentError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf'].includes(file.type)) return 'Choose a JPG, PNG, WebP, GIF, AVIF or PDF file.';
  if (!file.size) return 'This file is empty. Choose another file.';
  if (file.type === 'application/pdf' && file.size > 10 * 1024 * 1024) return 'Choose a PDF smaller than 10 MB.';
  return null;
}

