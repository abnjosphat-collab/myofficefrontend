// app/sheq/useSheqDashboardData.ts — the SHEQ dashboard's data-fetching layer: the
// cross-module fetch plus a hook that owns the raw-data load cycle, and the on-demand
// AI safety-analysis call. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Six endpoints behind one Promise.allSettled, one loading flag —
// a unified load cycle even though it fans out wider than most pages. A source that fails
// keeps its previous rows while the banner names it; only every source down is an error. The AI analysis
// call stays a separate export (like breakdowns' fetchBreakdownAnalytics) since it's an
// on-demand action with its own result/loading/error state in the component, not part
// of this load cycle.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';
import { getAllPages } from '@/lib/paged';
import { toast } from 'sonner';
import type { RawData, Rec } from './types';

export const SHEQ_SOURCE_LABELS: Record<keyof RawData, string> = {
  nm: 'Near Miss', ws: 'Work Stoppage', vfl: 'VFL', pto: 'PTO', insp: 'SHEQ Inspections', pach: 'Pachedu',
};

export interface SheqLoadResult {
  /** The sources that answered (only these keys are present). */
  rows: Partial<RawData>;
  /** The sources that failed, for the banner that names them. */
  failed: (keyof RawData)[];
}

export async function fetchAllModules(): Promise<SheqLoadResult> {
  // These routes return only the newest 100 rows unless paged; a dashboard built on a cut-off list would
  // understate every count. The inspections route takes no limit, so it is read as one request.
  const loads: { key: keyof RawData; run: () => Promise<unknown> }[] = [
    { key: 'nm', run: () => getAllPages<unknown>('/api/nearmiss/', { label: 'Near Miss' }) },
    { key: 'ws', run: () => getAllPages<unknown>('/api/work-stoppage/', { label: 'Work Stoppage' }) },
    { key: 'vfl', run: () => getAllPages<unknown>('/api/vfl/', { label: 'VFL' }) },
    { key: 'pto', run: () => getAllPages<unknown>('/api/pto/', { label: 'PTO' }) },
    { key: 'insp', run: () => api.get<unknown>('/api/sheq/') },
    { key: 'pach', run: () => getAllPages<unknown>('/api/pachedu/', { label: 'Pachedu' }) },
  ];
  // One source down must not blank the other five: settle each, keep what answered,
  // name what did not. Only every source down is still one error (the first one's).
  const settled = await Promise.allSettled(loads.map(l => l.run()));
  const rows: Partial<RawData> = {};
  const failed: (keyof RawData)[] = [];
  let firstError: unknown = null;
  settled.forEach((s, i) => {
    const value = s.status === 'fulfilled' ? s.value : undefined;
    if (s.status === 'fulfilled' && Array.isArray(value)) {
      rows[loads[i].key] = value as Rec[];
    } else {
      failed.push(loads[i].key);
      if (firstError === null) {
        firstError = s.status === 'rejected' ? s.reason : new Error(`${SHEQ_SOURCE_LABELS[loads[i].key]} returned an invalid response.`);
      }
    }
  });
  if (failed.length === loads.length) throw firstError instanceof Error ? firstError : new Error('Could not load SHEQ dashboard data.');
  return { rows, failed };
}

export async function postSafetyAnalysis(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return api.post('/api/ai/safety-analysis', payload);
}

export function useSheqDashboardData() {
  const [raw, setRaw] = useState<RawData>({ nm: [], ws: [], vfl: [], pto: [], insp: [], pach: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (hasLoadedRef.current) setRefreshing(true); else setLoading(true);
    setLoadError('');
    setFailedSources([]);
    try {
      const next = await retryTransient(fetchAllModules);
      if (requestId !== requestRef.current) return;
      // A source that failed keeps its previous rows (nothing on the first load);
      // the banner names it, so its panel never goes quietly empty or quietly stale.
      setRaw(prev => ({ ...prev, ...next.rows }));
      setFailedSources(next.failed.map(k => SHEQ_SOURCE_LABELS[k]));
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

  return { raw, loading, refreshing, loadError, failedSources, lastUpdated, refresh };
}
