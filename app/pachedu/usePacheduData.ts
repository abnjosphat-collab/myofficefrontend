// app/pachedu/usePacheduData.ts — the Pachedu page's data-fetching layer: report CRUD,
// the stats-overview endpoint, and a hook owning both under one load cycle. Split out
// of page.tsx as part of the standing "decompose on touch" convention.
'use client';

import { useState } from 'react';
import { api } from '@/lib/apiClient';
import type { PacheduReport, PacheduStats } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage look like "no reports yet". loadData already sets an error state; it
// just never got the chance to.
export async function getPacheduReports(): Promise<PacheduReport[]> {
  const data = await api.get<PacheduReport[]>('/api/pachedu/');
  return Array.isArray(data) ? data : [];
}
export async function createPacheduReport(report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await api.post<PacheduReport>('/api/pachedu/', report); } catch { return null; }
}
export async function updatePacheduReport(id: string, report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await api.patch<PacheduReport>(`/api/pachedu/${id}`, report); } catch { return null; }
}
export async function deletePacheduReport(id: string): Promise<boolean> {
  try { await api.delete(`/api/pachedu/${id}`); return true; } catch { return false; }
}
export async function getPacheduStats(): Promise<PacheduStats> {
  try {
    const data = await api.get<Partial<PacheduStats>>('/api/pachedu/stats/overview');
    return {
      total: data?.total || 0, bySection: data?.bySection || { Mechanical: 0, Electrical: 0 }, byDept: data?.byDept || {},
      byBehaviour: data?.byBehaviour || { Intentional: 0, Unintentional: 0 }, totalImpacts: data?.totalImpacts || 0, totalChecklist: data?.totalChecklist || 0,
      draftCount: data?.draftCount || 0, submittedCount: data?.submittedCount || 0, reviewedCount: data?.reviewedCount || 0, closedCount: data?.closedCount || 0,
    };
  } catch {
    return { total: 0, bySection: { Mechanical: 0, Electrical: 0 }, byDept: {}, byBehaviour: { Intentional: 0, Unintentional: 0 }, totalImpacts: 0, totalChecklist: 0, draftCount: 0, submittedCount: 0, reviewedCount: 0, closedCount: 0 };
  }
}

export function usePacheduData() {
  const [reports, setReports] = useState<PacheduReport[]>([]);
  const [stats, setStats] = useState<PacheduStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsData, statsData] = await Promise.all([getPacheduReports(), getPacheduStats()]);
      setReports(reportsData);
      setStats(statsData);
    } catch { setError('Failed to load Pachedu reports. Please try again.'); }
    finally { setLoading(false); }
  };

  return { reports, setReports, stats, setStats, loading, setLoading, error, refresh: loadData };
}
