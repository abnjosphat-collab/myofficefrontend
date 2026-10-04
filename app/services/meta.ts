// app/services/meta.ts — the fixed vocabulary of the services tracker: service categories and the six approval stages a job passes.
import type { IconMeaning, Tone } from '@/components/ui-system';

export const CATEGORIES = [
  'Maintenance', 'Electrical', 'Civil / Construction', 'IT / Technology', 'Cleaning', 'Security', 'Transport', 'Catering', 'Consulting', 'Other',
];

export type StageKey = 'planning' | 'engineering_manager' | 'finance' | 'gm' | 'stores' | 'payment';

export const STAGES: ReadonlyArray<{ key: StageKey; label: string; short: string; icon: IconMeaning; extra?: { label: string; placeholder: string } }> = [
  { key: 'planning', label: 'Planning', short: 'Plan', icon: 'task' },
  { key: 'engineering_manager', label: 'Engineering Manager', short: 'Eng Mgr', icon: 'wrench' },
  { key: 'finance', label: 'Finance', short: 'Finance', icon: 'cost' },
  { key: 'gm', label: 'General Manager', short: 'GM', icon: 'check' },
  { key: 'stores', label: 'Stores / GRV', short: 'Stores', icon: 'package', extra: { label: 'GRV number (goods received voucher)', placeholder: 'GRV-2026-001' } },
  { key: 'payment', label: 'Payment', short: 'Payment', icon: 'value', extra: { label: 'Payment reference or transaction number', placeholder: 'EFT-2026-001' } },
];

export type StatusKey = 'not_started' | 'in_progress' | 'completed';
export const STATUS: Record<StatusKey, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
};
export const STAGE_COUNT = STAGES.length;
