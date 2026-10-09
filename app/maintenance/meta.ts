// app/maintenance/meta.ts — the fixed vocabulary of the work-order module: statuses, priorities, classifications, disciplines and
// trades, the common failure modes, and the recurrence kinds a schedule can follow. Lookups fall back to the raw value so a record
// holding something unexpected still renders.
import type { Tone } from '@/components/ui-system';
import type { Discipline, RecurrenceType, Trade, WOClassification, WorkOrderPriority, WorkOrderStatus } from './types';
import { priorityTone, statusTone } from '@/lib/status';

export const STATUS: Record<WorkOrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: statusTone('pending') }, 'in-progress': { label: 'In progress', tone: statusTone('in-progress') }, completed: { label: 'Completed', tone: statusTone('completed') },
  'on-hold': { label: 'On hold', tone: statusTone('on-hold') }, cancelled: { label: 'Cancelled', tone: statusTone('cancelled') }, postponed: { label: 'Postponed', tone: statusTone('postponed') }, 'not-done': { label: 'Not done', tone: statusTone('not-done') },
};
export const statusMeta = (s: string): { label: string; tone: Tone } => STATUS[s as WorkOrderStatus] ?? { label: s || 'Pending', tone: 'neutral' };
/** The statuses a person can choose when reporting on a job. */
export const REPORT_STATUSES: WorkOrderStatus[] = ['pending', 'in-progress', 'completed', 'on-hold', 'postponed', 'not-done', 'cancelled'];

export const PRIORITY: Record<WorkOrderPriority, { label: string; tone: Tone; rank: number }> = {
  urgent: { label: 'Urgent', tone: priorityTone('urgent'), rank: 0 }, high: { label: 'High', tone: priorityTone('high'), rank: 1 }, medium: { label: 'Medium', tone: priorityTone('medium'), rank: 2 }, low: { label: 'Low', tone: priorityTone('low'), rank: 3 },
};
export const priorityMeta = (p: string): { label: string; tone: Tone; rank: number } => PRIORITY[p as WorkOrderPriority] ?? PRIORITY.medium;

export const CLASSIFICATIONS: { value: WOClassification; label: string; short: string }[] = [
  { value: 'planned_maintenance', label: 'Planned maintenance', short: 'PM' }, { value: 'project', label: 'Project', short: 'Project' },
  { value: 'breakdown', label: 'Breakdown', short: 'Breakdown' }, { value: 'custom', label: 'Other', short: 'Other' },
];
export const classificationLabel = (wo: { classification?: string; classification_custom?: string }) => {
  if (!wo.classification) return '';
  if (wo.classification === 'custom') return wo.classification_custom?.trim() || 'Other';
  return CLASSIFICATIONS.find(c => c.value === wo.classification)?.label ?? wo.classification;
};

export const DISCIPLINES: Discipline[] = ['Mechanical', 'Electrical'];
export const MECHANICAL_TRADES: Trade[] = ['Fitter', 'Boilermaker', 'Rigger', 'Plumber', 'Carpenter'];
export const FAILURE_MODES = [
  'Bearing failure', 'Seal / gasket failure', 'Motor failure', 'Belt / chain failure', 'Shaft failure', 'Coupling failure', 'Gearbox failure', 'Pump failure', 'Valve failure',
  'Electrical fault', 'Lubrication failure', 'Structural failure / cracking', 'Overheating', 'Blockage / fouling', 'Corrosion', 'Wear & tear', 'Operator error',
  'Foreign object damage', 'Calibration drift', 'Other',
];

export const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }, { value: 'custom', label: 'Specific dates' },
];
