// lib/deepSign.ts — the bell's `sign=approve` guard, shared by the leaves and
// overtime deep links: the gate opens only for a pending record viewed by a
// manager; every other case opens the detail with a notice saying why.
import { formatDate } from './format';

export interface SignableRecord {
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
}

export function deepSignDecision(
  noun: string,
  record: SignableRecord,
  sign: string | null,
  canApprove: boolean,
): { gate: boolean; notice: string | null } {
  if (sign !== 'approve') return { gate: false, notice: null };
  if (record.status !== 'pending') {
    if (record.status === 'approved' && record.approved_by) {
      const when = record.approved_at ? ` on ${formatDate(record.approved_at)}` : '';
      return { gate: false, notice: `Already approved by ${record.approved_by}${when}.` };
    }
    if (record.status === 'rejected' && record.rejected_by) {
      const when = record.rejected_at ? ` on ${formatDate(record.rejected_at)}` : '';
      return { gate: false, notice: `Already rejected by ${record.rejected_by}${when}.` };
    }
    if (record.status === 'approved') return { gate: false, notice: 'Already approved.' };
    if (record.status === 'rejected') return { gate: false, notice: 'Already rejected.' };
    return { gate: false, notice: `This ${noun} is no longer pending.` };
  }
  if (!canApprove) return { gate: false, notice: `Only a manager can approve this ${noun}.` };
  return { gate: true, notice: null };
}
