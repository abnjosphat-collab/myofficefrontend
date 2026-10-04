// app/engineering_report/useEngineeringReportData.ts — the monthly report's five read-only sources
// (breakdowns, job cards, production, compliance, lubrication). Each reports its own loading / error
// state, so a failed source is shown as unavailable and never counted as zero.
'use client';

import { unwrapRows } from '@/lib/paged';
import { useApiList } from '@/lib/useApiList';
import type { AnyRecord } from '@/lib/engineeringReport';

export function useEngineeringReportData() {
  // The list route is /get-breakdowns (it wraps its rows and caps each request); /api/breakdowns returns an info object.
  const breakdowns = useApiList<AnyRecord>('/api/breakdowns/get-breakdowns', undefined, { paged: true, pick: unwrapRows });
  const jobCards = useApiList<AnyRecord>('/api/job-cards');
  // Production returns only the latest 30 rows by default, but a report can cover any past month.
  const production = useApiList<AnyRecord>('/api/production', undefined, { paged: true });
  const compliance = useApiList<AnyRecord>('/api/compliance');
  const lube = useApiList<AnyRecord>('/api/lubrication');
  const all = [breakdowns, jobCards, production, compliance, lube];
  const refetchAll = () => Promise.all(all.map(source => source.refetch()));
  return { breakdowns, jobCards, production, compliance, lube, refreshing: all.some(source => source.loading && source.loaded), refetchAll };
}
