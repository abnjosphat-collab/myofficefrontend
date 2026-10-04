// app/breakdowns/useBreakdownsData.ts — the breakdowns data layer: the register (every page of it, with an honest load state), the
// writes (they throw, so a dialog shows the reason and keeps what was typed), and the server's analytics for the current selection.
'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { unwrapRows } from '@/lib/paged';
import { isTransientError, retryDelay } from '@/lib/transientRetry';
import { useApiList } from '@/lib/useApiList';
import { toPayload } from './breakdownLogic';
import type { HeatmapData } from './insights/types';
import type { Breakdown, BreakdownFormData } from './types';

export const useBreakdowns = () => useApiList<Breakdown>('/api/breakdowns/get-breakdowns', undefined, { paged: true, pick: unwrapRows<Breakdown> });

export const createBreakdown = (form: BreakdownFormData) => api.post('/api/breakdowns/', toPayload(form));
export const updateBreakdown = (id: number, form: BreakdownFormData) => api.patch(`/api/breakdowns/${id}`, toPayload(form));
export const deleteBreakdown = (id: number) => api.delete(`/api/breakdowns/${id}`);

export interface InsightFilters { from?: string; to?: string; department?: string; machineId?: string; status?: string; type?: string; priority?: string; location?: string }
/** The query string for the analytics endpoint. Empty and "all" values are left out; the endpoint takes one status, so "open" is not sent. */
export function insightQuery(f: InsightFilters): string {
  const q = new URLSearchParams();
  const add = (key: string, value?: string) => { if (value && value !== 'all') q.set(key, value); };
  add('date_from', f.from); add('date_to', f.to); add('department', f.department); add('machine_id', f.machineId);
  add('status', f.status === 'open' ? undefined : f.status); add('breakdown_type', f.type); add('priority', f.priority); add('location', f.location);
  return q.toString();
}

interface Settled { key: string; data: HeatmapData | null; error: string | null; status: number | null }
/** The analytics for `query`. A new query starts from nothing (the old charts are never shown under new filters) and a failure is never an empty chart. */
export function useBreakdownInsights(query: string, enabled = true) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled>({ key: '', data: null, error: null, status: null });
  const key = `${query}|${tick}`;
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = (n: number) => {
      api.get<HeatmapData>(`/api/breakdowns/analytics/heatmap?${query}`).then(json => {
        if (!current) return;
        if (!json?.success) throw new Error('The analytics response was unavailable.');
        setSettled({ key, data: json, error: null, status: null });
      }).catch(e => {
        if (!current) return;
        // A slow or waking service is waited out (the analytics keep loading); anything else is reported now.
        if (isTransientError(e)) { timer = setTimeout(() => attempt(n + 1), retryDelay(n)); return; }
        setSettled({ key, data: null, error: e instanceof Error ? e.message : 'The analytics could not be loaded.', status: e instanceof ApiError ? e.status : null });
      });
    };
    attempt(0);
    return () => { current = false; if (timer) clearTimeout(timer); };
  }, [query, enabled, key]);
  const mine = settled.key === key ? settled : null;
  return { data: mine?.data ?? null, error: mine?.error ?? null, errorStatus: mine?.status ?? null, loading: enabled && !mine, refetch: () => setTick(t => t + 1) };
}
