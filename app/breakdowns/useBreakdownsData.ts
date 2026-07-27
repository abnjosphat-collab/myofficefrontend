// app/breakdowns/useBreakdownsData.ts — the breakdowns page's data-fetching layer: the
// record CRUD calls, the analytics heatmap fetch, and a hook that owns the main records
// list's load cycle. Split out of page.tsx as part of the standing "decompose on touch"
// convention. One resource (the breakdowns list), one loading flag, parameterized by the
// active filters/date-range — same shape as timesheets' period-scoped hook.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Breakdown, BreakdownFormData, Filters, HeatmapData, SpareUsed } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no breakdowns match these filters".
export const fetchBreakdowns = async (filters: Record<string, string> = {}): Promise<Breakdown[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all' && v !== '') params.append(k, v); });
  const data = await api.get<any>(`/api/breakdowns/get-breakdowns?${params}`);
  if (Array.isArray(data)) return data;
  return data.data ?? data.breakdowns ?? data.results ?? [];
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

export function useBreakdownsData(filters: Filters, startDate: string, endDate: string, showDateRange: boolean) {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, string> = {};
      if (filters.status !== 'all') q.status = filters.status;
      if (filters.breakdown_type !== 'all') q.breakdown_type = filters.breakdown_type;
      if (filters.priority !== 'all') q.priority = filters.priority;
      if (filters.department !== 'all') q.department = filters.department;
      if (filters.location !== 'all' && filters.location !== '') q.location = filters.location;
      if (showDateRange && startDate && endDate) { q.start_date = startDate; q.end_date = endDate; }
      setBreakdowns(await fetchBreakdowns(q));
      setLoadError('');
    } catch (e) {
      // Keep the error visible instead of blanking the list into a "no breakdowns
      // found / log your first" state that looks like an empty database.
      setLoadError(e instanceof Error ? e.message : 'Could not load breakdowns.');
      toast.error('Failed to load breakdowns');
      setBreakdowns([]);
    }
    finally { setLoading(false); }
  }, [filters, startDate, endDate, showDateRange]);

  useEffect(() => { refresh(); }, [refresh]);

  return { breakdowns, loading, loadError, refresh };
}
