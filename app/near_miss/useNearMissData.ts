// app/near_miss/useNearMissData.ts — the near-miss report's data-fetching layer:
// record CRUD plus a hook that owns the list and its load(quiet)/loading/refreshing
// cycle. Split out of page.tsx as part of the standing "decompose on touch"
// convention, same load(quiet) shape as sheq_inspection/pto/vfl/work_stoppage.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { NearMissReport } from './types';

// Throws on failure — deliberately. This used to `catch { return [] }`, which made
// a server outage indistinguishable from "no reports yet": loadReports' own
// catch could never fire and the page rendered the friendly empty state, inviting
// you to file the first report over data that simply hadn't loaded.
export async function getReports(): Promise<NearMissReport[]> {
  const data = await api.get<NearMissReport[]>('/api/nearmiss/');
  return Array.isArray(data) ? data : [];
}
export async function createReport(report: Partial<NearMissReport>): Promise<NearMissReport | null> {
  try { return await api.post<NearMissReport>('/api/nearmiss/', report); }
  catch { return null; }
}
export async function updateReport(id: string, report: Partial<NearMissReport>): Promise<NearMissReport | null> {
  try { return await api.patch<NearMissReport>(`/api/nearmiss/${id}`, report); }
  catch { return null; }
}
export async function deleteReport(id: string): Promise<boolean> {
  try { await api.delete(`/api/nearmiss/${id}`); return true; }
  catch { return false; }
}

export function useNearMissData() {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<NearMissReport[]>([]);

  const loadReports = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try { setReports(await getReports()); setLoadError(''); }
    catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load reports.');
      toast.error('Failed to load reports');
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadReports(); }, []);

  return { reports, setReports, loading, loadError, refreshing, loadReports };
}
