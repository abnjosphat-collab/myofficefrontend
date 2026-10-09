// app/leaves/leaveMeta.ts — how a leave status and a day count are shown.
import type { IconMeaning, Tone } from '@/components/ui-system';
import type { Leave } from './types';
import { statusTone } from '@/lib/status';

const UNKNOWN = { label: 'Unknown', tone: 'neutral' as Tone, icon: 'pending' as IconMeaning };
const KNOWN: Record<Leave['status'], { label: string; tone: Tone; icon: IconMeaning }> = {
  pending: { label: 'Pending', tone: statusTone('pending'), icon: 'pending' },
  approved: { label: 'Approved', tone: statusTone('approved'), icon: 'success' },
  rejected: { label: 'Rejected', tone: statusTone('rejected'), icon: 'close' },
};
/** An unrecognised status (legacy or malformed data) is shown as it is, never a crash. */
export const statusMeta = (status: string) => (KNOWN as Record<string, (typeof KNOWN)[Leave['status']]>)[status] ?? { ...UNKNOWN, label: status || UNKNOWN.label };

export const daysText = (days: number | null | undefined) => (days == null ? '—' : days === 1 ? '1 day' : `${days} days`);
