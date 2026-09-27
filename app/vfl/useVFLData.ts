// app/vfl/useVFLData.ts — the VFL page's data-fetching layer: single-resource CRUD plus a
// hook owning the report list and its loading/error state. Split out of page.tsx as part
// of the standing "decompose on touch" convention. One resource, one load cycle — same
// shape as pto/pachedu.
'use client';

import { useRef, useState } from 'react';
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);

  const loadData = async (quiet = false) => {
    const requestId = ++requestRef.current;
    if (quiet) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const nextReports = await getVFLReports();
      if (requestId !== requestRef.current) return;
      setReports(nextReports);
    }
    catch (e) {
      if (requestId !== requestRef.current) return;
      setLoadError(e instanceof Error ? e.message : 'Could not load VFL reports.');
      toast.error('Failed to load VFL reports');
    }
    finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  return { reports, setReports, loading, refreshing, loadError, loadData };
}
