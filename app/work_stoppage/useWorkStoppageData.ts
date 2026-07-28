// app/work_stoppage/useWorkStoppageData.ts — the work stoppage page's data-fetching
// layer: single-resource CRUD plus a hook owning the report list and its
// loading/refreshing flags. Split out of page.tsx as part of the standing "decompose on
// touch" convention. One resource, one load cycle — same load(quiet) shape as
// sheq_inspection.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { WorkStoppageReport } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no work stoppages yet".
export async function getReports(): Promise<WorkStoppageReport[]> {
  const d = await api.get<WorkStoppageReport[]>('/api/work-stoppage/');
  return Array.isArray(d) ? d : [];
}
export async function createReport(data: Partial<WorkStoppageReport>): Promise<WorkStoppageReport> {
  return api.post<WorkStoppageReport>('/api/work-stoppage/', data);
}
export async function updateReport(id: string, data: Partial<WorkStoppageReport>): Promise<WorkStoppageReport> {
  return api.patch<WorkStoppageReport>(`/api/work-stoppage/${id}`, data);
}
export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/api/work-stoppage/${id}`);
}

export function useWorkStoppageData() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<WorkStoppageReport[]>([]);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setReports(await getReports()); }
    catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  return { reports, setReports, loading, refreshing, load };
}
