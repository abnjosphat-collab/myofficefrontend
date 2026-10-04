'use client';

import { Icon } from '@/components/ui-system';
import type { ModuleApprovalSummary } from './moduleApproval';

/** Shared semantic indicators for grid cells and the approval legend. */
export function ModuleApprovalIndicator({ approval, legend = false }: { approval?: ModuleApprovalSummary; legend?: boolean }) {
  if (!approval || (!approval.approved && !approval.pending)) return null;
  return (
    <span className={`inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-sans ${legend ? 'text-caption' : 'text-[0.6875rem] leading-3'}`}>
      {approval.approved > 0 && (
        <span className="inline-flex items-center gap-0.5 text-success" title="Approved in Leaves / Overtime" aria-label="Approved leave or overtime">
          <Icon name="success" size="xs" />{legend && 'Approved'}
        </span>
      )}
      {approval.pending > 0 && (
        <span className="inline-flex items-center gap-0.5 text-warning" title="Pending approval; included in provisional totals" aria-label="Pending leave or overtime; included in provisional totals">
          <Icon name="clock" size="xs" />{legend ? 'Pending approval · included' : 'Pending'}
        </span>
      )}
    </span>
  );
}
