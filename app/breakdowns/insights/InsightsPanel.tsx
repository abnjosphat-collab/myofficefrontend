// app/breakdowns/insights/InsightsPanel.tsx — loads the analytics for a query and shows them with an honest state: loading, a failure
// with a retry (never an empty chart), or "nothing in this selection". Shared by the Analytics tab and the full analytics page.
'use client';

import { DataRegion, EmptyState, deriveDataStatus, isTransientStatus } from '@/components/ui-system';
import { BreakdownInsights } from './BreakdownInsights';
import { useBreakdownInsights } from '../useBreakdownsData';

export function InsightsPanel({ query, enabled = true }: { query: string; enabled?: boolean }) {
  const ins = useBreakdownInsights(query, enabled);
  const status = deriveDataStatus({ loaded: !!ins.data, loading: ins.loading, error: ins.error, errorStatus: ins.errorStatus, count: ins.data?.summary?.total_breakdowns ?? 0, transient: isTransientStatus(ins.errorStatus) });
  return (
    <DataRegion status={status} subject="breakdown analytics" error={ins.error} onRetry={ins.refetch} empty={<EmptyState icon="analytics" title="No breakdowns in this selection" description="Widen the filters to see analytics." />}>
      {ins.data && <BreakdownInsights data={ins.data} />}
    </DataRegion>
  );
}
