// app/overtime/overtimeMeta.ts — the fixed vocabulary of the overtime module: what each type, status, planning and payout value is
// called and what tone it carries. Records can hold values the form no longer offers (emergency, project, night), so every lookup
// falls back to the raw value instead of failing.
import type { Tone } from '@/components/ui-system';
import type { OTStatus, OTType, PayoutMethod, PlanningStatus } from './types';
import { statusTone } from '@/lib/status';

export const TYPE_LABELS: Record<OTType, string> = { regular: 'Regular', weekend: 'Weekend', emergency: 'Emergency', project: 'Project', holiday: 'Holiday', night: 'Night shift' };
const TYPE_TONE: Record<OTType, Tone> = { regular: 'info', weekend: 'brand', emergency: 'danger', project: 'success', holiday: 'warning', night: 'neutral' };
export const typeMeta = (type: string): { label: string; tone: Tone } => ({ label: TYPE_LABELS[type as OTType] ?? String(type), tone: TYPE_TONE[type as OTType] ?? 'neutral' });

export const STATUS_LABELS: Record<OTStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', paid: 'Paid', cancelled: 'Cancelled' };
const STATUS_TONE: Record<OTStatus, Tone> = { pending: statusTone('pending'), approved: statusTone('approved'), rejected: statusTone('rejected'), paid: statusTone('paid'), cancelled: statusTone('cancelled') };
export const statusMeta = (status: string): { label: string; tone: Tone } => ({ label: STATUS_LABELS[status as OTStatus] ?? String(status), tone: STATUS_TONE[status as OTStatus] ?? 'neutral' });

export const PLANNING_LABELS: Record<PlanningStatus, string> = { planned: 'Planned', unplanned: 'Unplanned' };
export const planningMeta = (s?: string | null): { label: string; tone: Tone } | null => (s ? { label: PLANNING_LABELS[s as PlanningStatus] ?? String(s), tone: s === 'planned' ? 'success' : 'warning' } : null);

export const PAYOUT_LABELS: Record<PayoutMethod, string> = { cash: 'To be paid', lieu: 'Taken as leave (lieu)' };
/** Only the exception is worth a badge: time off in lieu. Cash is the unremarkable default. */
export const payoutMeta = (m?: string | null): { label: string; tone: Tone } | null => (m === 'lieu' ? { label: PAYOUT_LABELS.lieu, tone: 'info' } : null);

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
