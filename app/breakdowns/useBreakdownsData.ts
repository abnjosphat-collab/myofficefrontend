// app/breakdowns/useBreakdownsData.ts — the breakdowns data layer: the register (every page of it, with an honest load state), the
// writes (they throw, so a dialog shows the reason and keeps what was typed), and the server's analytics for the current selection.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { unwrapRows } from '@/lib/paged';
import { isTransientError, retryDelay } from '@/lib/transientRetry';
import { useApiList } from '@/lib/useApiList';
import { useAutoRefresh } from '@/lib/useAutoRefresh';
import { toPayload } from './breakdownLogic';
import type { HeatmapData } from './insights/types';
import type { Breakdown, BreakdownFormData, CreateBreakdownResult, RaiseWorkOrderResult } from './types';
import { fetchWorkOrderById } from '../maintenance/api';
import type { WorkOrder } from '../maintenance/types';

export const useBreakdowns = () => useApiList<Breakdown>('/api/breakdowns/get-breakdowns', undefined, { paged: true, pick: unwrapRows<Breakdown> });

/** One breakdown for a `?open=` deep link; null when the server has no such record. */
export async function fetchBreakdownById(id: number | string): Promise<Breakdown | null> {
  try {
    return await api.get<Breakdown>(`/api/breakdowns/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const createBreakdown = (form: BreakdownFormData) => api.post<CreateBreakdownResult>('/api/breakdowns/', toPayload(form));
export const updateBreakdown = (id: number, form: BreakdownFormData) => api.patch(`/api/breakdowns/${id}`, toPayload(form));
export const deleteBreakdown = (id: number) => api.delete(`/api/breakdowns/${id}`);

/** Raise the work order for an unlinked breakdown (idempotent: answers the linked one again). */
export const raiseWorkOrderForBreakdown = (id: number | string) => api.post<RaiseWorkOrderResult>(`/api/breakdowns/${id}/work-order`);

/** The work order a breakdown links to (null until one is raised). A failed read is flagged, never an empty link. */
export function useLinkedWorkOrder(workOrderId: number | string | null | undefined) {
  const [settled, setSettled] = useState<{ key: string; order: WorkOrder | null; failed: boolean }>({ key: '', order: null, failed: false });
  const key = workOrderId === null || workOrderId === undefined ? '' : String(workOrderId);
  useEffect(() => {
    if (key === '') return;
    let current = true;
    fetchWorkOrderById(key).then(
      row => { if (current) setSettled({ key, order: row, failed: row === null }); },
      () => { if (current) setSettled({ key, order: null, failed: true }); },
    );
    return () => { current = false; };
  }, [key]);
  const mine = key !== '' && settled.key === key ? settled : null;
  return { order: mine?.order ?? null, loading: key !== '' && !mine, failed: mine?.failed ?? false };
}

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
/** The analytics for `query`. A new query starts from nothing (the old charts are never shown under new filters) and a failure is never an empty chart. The answer also refreshes on a silent background tick that keeps the old charts while it fetches. */
export function useBreakdownInsights(query: string, enabled = true) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled>({ key: '', data: null, error: null, status: null });
  const quietFails = useRef(0);
  const busyRef = useRef(false);
  const key = `${query}|${tick}`;
  const keyRef = useRef(key);
  const queryRef = useRef(query);
  useEffect(() => { keyRef.current = key; queryRef.current = query; });
  useEffect(() => {
    if (!enabled) return;
    busyRef.current = true;
    let current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = (n: number) => {
      api.get<HeatmapData>(`/api/breakdowns/analytics/heatmap?${query}`).then(json => {
        if (!current) return;
        busyRef.current = false;
        if (!json?.success) throw new Error('The analytics response was unavailable.');
        setSettled({ key, data: json, error: null, status: null });
      }).catch(e => {
        if (!current) return;
        // A slow or waking service is waited out (the analytics keep loading); anything else is reported now.
        if (isTransientError(e)) { timer = setTimeout(() => attempt(n + 1), retryDelay(n)); return; }
        busyRef.current = false;
        setSettled({ key, data: null, error: e instanceof Error ? e.message : 'The analytics could not be loaded.', status: e instanceof ApiError ? e.status : null });
      });
    };
    attempt(0);
    return () => { current = false; busyRef.current = false; if (timer) clearTimeout(timer); };
  }, [query, enabled, key]);
  // A background tick swaps the answer silently: the old charts stay while it
  // fetches, a first failure is silent, and the error surfaces from the second
  // failure in a row. A waking service waits for the next tick, uncounted.
  // Results landing for a stale key (filters moved on) are dropped.
  const quietFetch = useCallback(() => {
    const atCall = keyRef.current;
    return api.get<HeatmapData>(`/api/breakdowns/analytics/heatmap?${queryRef.current}`).then(json => {
      if (!json?.success) throw new Error('The analytics response was unavailable.');
      quietFails.current = 0;
      setSettled(s => (s.key === atCall ? { ...s, data: json, error: null, status: null } : s));
    }).catch(e => {
      if (isTransientError(e)) return;
      if (++quietFails.current >= 2) {
        const error = e instanceof Error ? e.message : 'The analytics could not be loaded.';
        const status = e instanceof ApiError ? e.status : null;
        setSettled(s => (s.key === atCall ? { ...s, error, status } : s));
      }
    });
  }, []);
  useAutoRefresh(quietFetch, { enabled, isLoading: () => busyRef.current });
  const mine = settled.key === key ? settled : null;
  return { data: mine?.data ?? null, error: mine?.error ?? null, errorStatus: mine?.status ?? null, loading: enabled && !mine, refetch: () => setTick(t => t + 1) };
}
