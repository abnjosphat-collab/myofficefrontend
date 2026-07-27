// app/pto/usePTOData.ts — the PTO page's data-fetching layer: single-resource CRUD plus
// a hook owning the report list and its load/error state. Split out of page.tsx as part
// of the standing "decompose on touch" convention. One resource, one load cycle — same
// shape as sheq_inspection/pachedu.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { PTOReport } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no PTO reports yet".
export async function getPTOReports(): Promise<PTOReport[]> {
  const data = await api.get<PTOReport[]>('/api/pto/');
  return Array.isArray(data) ? data : [];
}
export async function createPTOReport(report: Partial<PTOReport>): Promise<PTOReport> {
  return api.post<PTOReport>('/api/pto/', report);
}
export async function updatePTOReport(id: string, report: Partial<PTOReport>): Promise<PTOReport> {
  return api.patch<PTOReport>(`/api/pto/${id}/`, report);
}
export async function deletePTOReport(id: string): Promise<void> {
  return api.delete<void>(`/api/pto/${id}/`);
}

export function usePTOData() {
  const [reports, setReports] = useState<PTOReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try { setReports(await getPTOReports()); setLoadError(''); }
    catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load PTO reports.');
      toast.error('Failed to load PTO reports');
    }
    finally { setLoading(false); }
  };

  return { reports, setReports, loading, loadError, refresh: loadData };
}
