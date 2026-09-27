// app/breakdowns/useBreakdownsData.ts — the breakdowns page's data-fetching layer: the
// record CRUD calls, the analytics heatmap fetch, and a hook that owns the main records
// list's load cycle. Split out of page.tsx as part of the standing "decompose on touch"
// convention. One resource (the breakdowns list), one loading flag, parameterized by the
// active filters/date-range — same shape as timesheets' period-scoped hook.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Breakdown, BreakdownFormData, Filters, HeatmapData, SpareUsed } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no breakdowns match these filters".
export const fetchBreakdowns = async (filters: Record<string, string> = {}): Promise<Breakdown[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all' && v !== '') params.append(k, v); });
  const pageSize = 1000;
  const all: Breakdown[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const pageParams = new URLSearchParams(params);
    pageParams.set('limit', String(pageSize));
    pageParams.set('offset', String(offset));
    const response = await api.get<Breakdown[] | { data?: Breakdown[]; breakdowns?: Breakdown[]; results?: Breakdown[] }>(`/api/breakdowns/get-breakdowns?${pageParams}`);
    const page = Array.isArray(response) ? response : response?.data ?? response?.breakdowns ?? response?.results;
    if (!Array.isArray(page)) throw new Error('Breakdowns response was unavailable.');
    all.push(...page);
    if (page.length < pageSize) return all;
  }
};

function toApiBody(fd: BreakdownFormData) {
  return {
    machine_id: fd.machine_id || '', machine_name: fd.machine_name || '',
    breakdown_description: fd.breakdown_description || '', machine_description: fd.breakdown_description || '',
    artisan_name: fd.artisan_name || '', breakdown_date: fd.breakdown_date || new Date().toISOString().split('T')[0],
    location: fd.location || '', department: fd.department || '', breakdown_type: fd.breakdown_type || 'mechanical',
    work_done: fd.work_done || '', artisan_recommendations: fd.artisan_recommendations || '',
    status: fd.status || 'logged', priority: fd.priority || 'medium',
    breakdown_start: fd.breakdown_start || '', breakdown_end: fd.breakdown_end || '',
    work_start: fd.work_start || '', work_end: fd.work_end || '',
    spares_used: (Array.isArray(fd.spares_used) ? fd.spares_used : []).map((s: SpareUsed) => ({
      name: s.name || '', quantity: s.quantity || 1, part_number: s.part_number || '',
      unit_price: s.unit_price || 0, total_cost: (s.quantity || 1) * (s.unit_price || 0),
    })),
  };
}
export const createBreakdown = async (fd: BreakdownFormData): Promise<unknown> => {
  return api.post('/api/breakdowns/', toApiBody(fd));
};
export const updateBreakdown = async (id: number, fd: BreakdownFormData): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  return api.patch(`/api/breakdowns/${id}`, toApiBody(fd));
};
export const deleteBreakdown = async (id: number): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  return (await api.delete(`/api/breakdowns/${id}`)) ?? { success: true };
};

export const fetchBreakdownAnalytics = async (params: URLSearchParams): Promise<HeatmapData> => {
  return api.get<HeatmapData>(`/api/breakdowns/analytics/heatmap?${params}`);
};

export function useBreakdownAnalytics(filters: Filters, startDate: string, endDate: string) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setData(null);
    setError('');

    const params = new URLSearchParams();
    if (startDate) params.append('date_from', startDate);
    if (endDate) params.append('date_to', endDate);
    if (filters.department && filters.department !== 'all') params.append('department', filters.department);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.breakdown_type && filters.breakdown_type !== 'all') params.append('breakdown_type', filters.breakdown_type);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.location && filters.location !== 'all') params.append('location', filters.location);

    fetchBreakdownAnalytics(params).then(json => {
      if (!current) return;
      if (!json?.success) throw new Error('Analytics response was unavailable.');
      setData(json);
    }).catch(e => {
      if (!current) return;
      setError(e instanceof Error ? e.message : 'Could not load breakdown analytics.');
    }).finally(() => { if (current) setLoading(false); });

    return () => { current = false; };
  }, [startDate, endDate, filters.department, filters.status, filters.breakdown_type, filters.priority, filters.location, retryCount]);

  return { data, loading, error, retry: () => setRetryCount(value => value + 1) };
}

export function useBreakdownsData(filters: Filters, startDate: string, endDate: string, showDateRange: boolean) {
  const { status, breakdown_type, priority, department, location } = filters;
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const q: Record<string, string> = {};
      if (status !== 'all') q.status = status;
      if (breakdown_type !== 'all') q.breakdown_type = breakdown_type;
      if (priority !== 'all') q.priority = priority;
      if (department !== 'all') q.department = department;
      if (location !== 'all' && location !== '') q.location = location;
      if (showDateRange && startDate && endDate) { q.start_date = startDate; q.end_date = endDate; }
      const records = await fetchBreakdowns(q);
      if (current !== requestId.current) return;
      setBreakdowns(records);
      setLoadError('');
    } catch (e) {
      if (current !== requestId.current) return;
      // Keep the error visible instead of blanking the list into a "no breakdowns
      // found / log your first" state that looks like an empty database.
      setLoadError(e instanceof Error ? e.message : 'Could not load breakdowns.');
      toast.error('Failed to load breakdowns');
      setBreakdowns([]);
    }
    finally { if (current === requestId.current) setLoading(false); }
  }, [status, breakdown_type, priority, department, location, startDate, endDate, showDateRange]);

  useEffect(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]);

  return { breakdowns, loading, loadError, refresh };
}
