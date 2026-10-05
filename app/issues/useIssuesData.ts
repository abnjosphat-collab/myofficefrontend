// app/issues/useIssuesData.ts — the stock-issues page's data layer. Three sources load on their own and report their own
// failure: the issue log (every page of it, the route caps a single request), the server's summary figures, and the
// spare catalogue used to pick items. A failed load is never turned into an empty list or a default figure; rows already
// loaded stay through a failed refresh. Writes throw so the form can show the reason and keep what was typed.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { useApiResource } from '@/lib/useApiResource';
import type { Spare, Stats, StockIssue, StockMovement } from './types';

export function useIssuesData() {
  const issues = useApiList<StockIssue>('/api/issues', undefined, { paged: true });
  const stats = useApiResource<Stats>('/api/issues/stats/summary');
  const spares = useApiList<Spare>('/api/spares?limit=5000');
  const refresh = async () => { await Promise.all([issues.refetch(), stats.refetch(), spares.refetch()]); };
  return { issues, stats, spares, refresh };
}

export const createIssue = (payload: object) => api.post<StockIssue & StockMovement>('/api/issues', payload);
export const deleteIssue = (id: number) => api.delete<StockMovement>(`/api/issues/${id}`);
