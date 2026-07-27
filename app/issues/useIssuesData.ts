// app/issues/useIssuesData.ts — the stock-issues page's data-fetching layer: the record
// CRUD calls plus a hook that owns the issues/stats/spares state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Three
// resources behind one Promise.all, one loading flag — the same unified-load-cycle shape
// as app/ppe's usePPEData.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Spare, Stats, StockIssue } from './types';

export async function apiGetIssues(): Promise<StockIssue[]> {
  return api.get<StockIssue[]>('/api/issues?limit=2000');
}

export async function apiCreateIssue(payload: object): Promise<StockIssue> {
  return api.post<StockIssue>('/api/issues', payload);
}

export async function apiDeleteIssue(id: number): Promise<void> {
  await api.delete(`/api/issues/${id}`);
}

export async function apiGetStats(): Promise<Stats> {
  try {
    return await api.get<Stats>('/api/issues/stats/summary');
  } catch { return { total: 0, today: 0, this_week: 0, unique_recipients: 0 }; }
}

export async function apiGetSpares(): Promise<Spare[]> {
  return api.get<Spare[]>('/api/spares?limit=5000').catch(() => []);
}

export function useIssuesData() {
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [serverStats, setServerStats] = useState<Stats>({ total: 0, today: 0, this_week: 0, unique_recipients: 0 });
  const [spares, setSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [issueData, statsData, spareData] = await Promise.all([
        apiGetIssues(),
        apiGetStats(),
        apiGetSpares(),
      ]);
      setIssues(Array.isArray(issueData) ? issueData : []);
      setServerStats(statsData);
      setSpares(Array.isArray(spareData) ? spareData : []);
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return { issues, serverStats, spares, loading, refreshing, refresh: loadData };
}
