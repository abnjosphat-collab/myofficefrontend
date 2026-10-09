// app/breakdowns/breakdownMeta.ts — the fixed vocabularies of a breakdown: its status, priority and kind of fault, with the label
// and badge tone each one carries. A value the page does not know (an old or imported record) is shown as it was typed, never as a
// default, so it is not mistaken for a real one.
import type { Tone } from '@/components/ui-system';
import { priorityTone, statusTone } from '@/lib/status';

export interface Meta { value: string; label: string; tone: Tone }

export const STATUSES: Meta[] = [
  { value: 'logged', label: 'Logged', tone: statusTone('logged') },
  { value: 'in_progress', label: 'In progress', tone: statusTone('in_progress') },
  { value: 'resolved', label: 'Resolved', tone: statusTone('resolved') },
  { value: 'closed', label: 'Closed', tone: statusTone('closed') },
  { value: 'cancelled', label: 'Cancelled', tone: statusTone('cancelled') },
];
export const PRIORITIES: Meta[] = [
  { value: 'critical', label: 'Critical', tone: priorityTone('critical') },
  { value: 'high', label: 'High', tone: priorityTone('high') },
  { value: 'medium', label: 'Medium', tone: priorityTone('medium') },
  { value: 'low', label: 'Low', tone: priorityTone('low') },
];
export const TYPES: Meta[] = ['mechanical', 'electrical', 'hydraulic', 'pneumatic', 'electronic', 'other'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1), tone: 'neutral' as Tone }));

const pick = (list: Meta[], value: string | undefined | null): Meta => {
  const found = list.find(m => m.value === value);
  if (found) return found;
  const text = (value ?? '').toString().trim();
  return { value: text, label: text ? text.replace(/_/g, ' ') : 'Not set', tone: 'neutral' };
};
export const statusMeta = (v?: string | null) => pick(STATUSES, v);
export const priorityMeta = (v?: string | null) => pick(PRIORITIES, v);
export const typeMeta = (v?: string | null) => pick(TYPES, v);

export const OPEN_STATUSES = ['logged', 'in_progress'];
export const DEFAULT_DEPARTMENT = 'Engineering';
