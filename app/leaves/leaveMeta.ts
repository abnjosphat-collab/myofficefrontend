// app/leaves/leaveMeta.ts — how a leave status and a day count are shown.
import type { IconMeaning, Tone } from '@/components/ui-system';
import type { Leave } from './types';

const UNKNOWN = { label: 'Unknown', tone: 'neutral' as Tone, icon: 'pending' as IconMeaning };
const KNOWN: Record<Leave['status'], { label: string; tone: Tone; icon: IconMeaning }> = {
  pending: { label: 'Pending', tone: 'warning', icon: 'pending' },
  approved: { label: 'Approved', tone: 'success', icon: 'success' },
  rejected: { label: 'Rejected', tone: 'danger', icon: 'close' },
};
/** An unrecognised status (legacy or malformed data) is shown as it is, never a crash. */
export const statusMeta = (status: string) => (KNOWN as Record<string, (typeof KNOWN)[Leave['status']]>)[status] ?? { ...UNKNOWN, label: status || UNKNOWN.label };

export const daysText = (days: number | null | undefined) => (days == null ? '—' : days === 1 ? '1 day' : `${days} days`);
