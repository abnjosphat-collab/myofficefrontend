// app/vfl/useVFLData.ts — the VFL page's data-fetching layer: single-resource CRUD plus a
// hook owning the report list and its loading/error state. Split out of page.tsx as part
// of the standing "decompose on touch" convention. One resource, one load cycle — same
// shape as pto/pachedu.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { VFLReport } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage look like "no reports yet", so loadData's own catch never fired.
export async function getVFLReports(): Promise<VFLReport[]> {
  const data = await api.get<VFLReport[]>('/api/vfl/');
  return Array.isArray(data) ? data : [];
}
export async function createVFLReport(report: Partial<VFLReport>): Promise<VFLReport> { return api.post<VFLReport>('/api/vfl/', report); }
export async function updateVFLReport(id: string, report: Partial<VFLReport>): Promise<VFLReport> { return api.patch<VFLReport>(`/api/vfl/${id}/`, report); }
export async function deleteVFLReport(id: string): Promise<void> { return api.delete<void>(`/api/vfl/${id}/`); }

export function useVFLData() {
  const [reports, setReports] = useState<VFLReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try { setReports(await getVFLReports()); setLoadError(''); }
    catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load VFL reports.');
      toast.error('Failed to load VFL reports');
    }
    finally { setLoading(false); }
  };

  return { reports, setReports, loading, loadError, loadData };
}
