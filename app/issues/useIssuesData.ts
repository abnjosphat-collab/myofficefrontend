// app/issues/useIssuesData.ts — the stock-issues page's data-fetching layer: the record
// CRUD calls plus a hook that owns the issues/stats/spares state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Three
// resources behind one Promise.all, one loading flag — the same unified-load-cycle shape
// as app/ppe's usePPEData.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  return api.get<Stats>('/api/issues/stats/summary');
}

export async function apiGetSpares(): Promise<Spare[]> {
  return api.get<Spare[]>('/api/spares?limit=5000');
}

const errorMessage = (result: PromiseRejectedResult, fallback: string) =>
  result.reason instanceof Error ? result.reason.message : fallback;

export function useIssuesData() {
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [serverStats, setServerStats] = useState<Stats | null>(null);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [sparesError, setSparesError] = useState('');
  const requestRef = useRef(0);

  const loadData = useCallback(async (quiet = false) => {
    const requestId = ++requestRef.current;
    if (quiet) setRefreshing(true); else setLoading(true);
    const [issueResult, statsResult, spareResult] = await Promise.allSettled([
        apiGetIssues(),
        apiGetStats(),
        apiGetSpares(),
    ]);
    if (requestId !== requestRef.current) return;

    if (issueResult.status === 'fulfilled') {
      setIssues(Array.isArray(issueResult.value) ? issueResult.value : []);
      setLoadError('');
    } else {
      setLoadError(errorMessage(issueResult, 'Could not load stock issues.'));
      if (!quiet) setIssues([]);
      toast.error('Failed to load stock issues');
    }

    if (statsResult.status === 'fulfilled') {
      setServerStats(statsResult.value);
      setStatsError('');
    } else {
      setStatsError(errorMessage(statsResult, 'Could not load issue statistics.'));
      if (!quiet) setServerStats(null);
    }

    if (spareResult.status === 'fulfilled') {
      setSpares(Array.isArray(spareResult.value) ? spareResult.value : []);
      setSparesError('');
    } else {
      setSparesError(errorMessage(spareResult, 'Could not load the spare catalogue.'));
      if (!quiet) setSpares([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return {
    issues,
    serverStats,
    spares,
    loading,
    refreshing,
    loadError,
    statsError,
    sparesError,
    refresh: loadData,
  };
}
