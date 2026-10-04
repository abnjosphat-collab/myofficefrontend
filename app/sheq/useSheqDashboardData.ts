// app/sheq/useSheqDashboardData.ts — the SHEQ dashboard's data-fetching layer: the
// cross-module fetch plus a hook that owns the raw-data load cycle, and the on-demand
// AI safety-analysis call. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Six endpoints behind one Promise.allSettled, one loading flag —
// a unified load cycle even though it fans out wider than most pages. The AI analysis
// call stays a separate export (like breakdowns' fetchBreakdownAnalytics) since it's an
// on-demand action with its own result/loading/error state in the component, not part
// of this load cycle.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';
import { getAllPages } from '@/lib/paged';
import { toast } from 'sonner';
import type { RawData } from './types';

export async function fetchAllModules(): Promise<RawData> {
  const [nm, ws, vfl, pto, insp, pach] = await Promise.all([
    // These routes return only the newest 100 rows unless paged; a dashboard built on a cut-off list would
    // understate every count. The inspections route takes no limit, so it is read as one request.
    getAllPages<unknown>('/api/nearmiss/', { label: 'Near Miss' }),
    getAllPages<unknown>('/api/work-stoppage/', { label: 'Work Stoppage' }),
    getAllPages<unknown>('/api/vfl/', { label: 'VFL' }),
    getAllPages<unknown>('/api/pto/', { label: 'PTO' }),
    api.get<unknown>('/api/sheq/'),
    getAllPages<unknown>('/api/pachedu/', { label: 'Pachedu' }),
  ]);

  const rows = (value: unknown, label: string) => {
    if (!Array.isArray(value)) throw new Error(`${label} returned an invalid response.`);
    return value;
  };

  return {
    nm: rows(nm, 'Near Miss'),
    ws: rows(ws, 'Work Stoppage'),
    vfl: rows(vfl, 'VFL'),
    pto: rows(pto, 'PTO'),
    insp: rows(insp, 'SHEQ Inspections'),
    pach: rows(pach, 'Pachedu'),
  };
}

export async function postSafetyAnalysis(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post('/api/ai/safety-analysis', payload);
}

export function useSheqDashboardData() {
  const [raw, setRaw] = useState<RawData>({ nm: [], ws: [], vfl: [], pto: [], insp: [], pach: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (hasLoadedRef.current) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const nextRaw = await retryTransient(fetchAllModules);
      if (requestId !== requestRef.current) return;
      setRaw(nextRaw);
      setLastUpdated(new Date());
      hasLoadedRef.current = true;
    }
    catch (error) {
      if (requestId !== requestRef.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load SHEQ dashboard data.');
      toast.error('Failed to load dashboard data');
    }
    finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { raw, loading, refreshing, loadError, lastUpdated, refresh };
}
