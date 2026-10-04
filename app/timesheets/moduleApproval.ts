import type { TimesheetEntry } from './types';

/** Source-record approval counts for one effective grid cell. */
export interface ModuleApprovalSummary {
  approved: number;
  pending: number;
}

/** NEC includes unsigned and pending records, but never rejected ones. */
export function moduleRecordIncluded(status: string): boolean {
  return status.trim().toLowerCase() !== 'rejected';
}

/** Accumulate approval state without mutating a source record or prior summary. */
export function addModuleApproval(summary: ModuleApprovalSummary | undefined, status: string): ModuleApprovalSummary {
  const next = { approved: summary?.approved ?? 0, pending: summary?.pending ?? 0 };
  if (!moduleRecordIncluded(status)) return next;
  if (status.trim().toLowerCase() === 'approved') next.approved += 1;
  else next.pending += 1;
  return next;
}

/** Human-readable source status for cell tooltips and assistive technology. */
export function moduleApprovalDescription(entry: TimesheetEntry): string {
  const summary = entry._moduleApproval;
  if (!summary) return '';
  return [
    summary.approved ? `${summary.approved} approved leave/overtime record${summary.approved === 1 ? '' : 's'}` : '',
    summary.pending ? `${summary.pending} leave/overtime record${summary.pending === 1 ? '' : 's'} pending approval; included in provisional totals` : '',
  ].filter(Boolean).join('; ');
}
