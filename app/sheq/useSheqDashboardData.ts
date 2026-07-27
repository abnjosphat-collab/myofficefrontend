// app/sheq/useSheqDashboardData.ts — the SHEQ dashboard's data-fetching layer: the
// cross-module fetch plus a hook that owns the raw-data load cycle, and the on-demand
// AI safety-analysis call. Split out of page.tsx as part of the standing "decompose on
// touch" convention. Six endpoints behind one Promise.allSettled, one loading flag —
// a unified load cycle even though it fans out wider than most pages. The AI analysis
// call stays a separate export (like breakdowns' fetchBreakdownAnalytics) since it's an
// on-demand action with its own result/loading/error state in the component, not part
// of this load cycle.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { RawData } from './types';

export async function fetchAllModules(): Promise<RawData> {
  const settled = await Promise.allSettled([
    api.get<any[]>('/api/nearmiss/'),
    api.get<any[]>('/api/work-stoppage/'),
    api.get<any[]>('/api/vfl/'),
    api.get<any[]>('/api/pto/'),
    api.get<any[]>('/api/sheq/'),
    api.get<any[]>('/api/pachedu/'),
  ]);
  const [nm, ws, vfl, pto, insp, pach] = settled.map(r => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []));
  return { nm, ws, vfl, pto, insp, pach };
}

export async function postSafetyAnalysis(payload: Record<string, unknown>): Promise<Record<string, any>> {
  return api.post('/api/ai/safety-analysis', payload);
}

export function useSheqDashboardData() {
  const [raw, setRaw] = useState<RawData>({ nm: [], ws: [], vfl: [], pto: [], insp: [], pach: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setRaw(await fetchAllModules()); setLastUpdated(new Date()); }
    catch { toast.error('Failed to load dashboard data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { raw, loading, lastUpdated, refresh };
}
