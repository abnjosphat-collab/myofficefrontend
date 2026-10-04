// app/training/useTrainingData.ts — the training register's data-fetching layer:
// record CRUD plus a hook wrapping the 3-resource (certs/compliance rate/due
// refreshers) load behind Promise.allSettled and a single loading/refreshing flag —
// ppe-shaped unified load cycle. Split out of page.tsx as part of the standing
// "decompose on touch" convention.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';
import type { Certification, ComplianceReport, RefresherItem } from './types';

export async function createCertification(fd: FormData) {
  return api.post('/api/training', fd);
}
export async function updateCertification(id: string | number, fd: FormData) {
  return api.put(`/api/training/${id}`, fd);
}
export async function deleteCertification(id: string | number) {
  return api.delete(`/api/training/${id}`);
}

export function useTrainingData() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [refreshers, setRefreshers] = useState<RefresherItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceReport>({ compliance_rate: 0, total_tracked: 0, non_compliant: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [registerUnavailable, setRegisterUnavailable] = useState(false);
  const [complianceUnavailable, setComplianceUnavailable] = useState(false);
  const [refreshersUnavailable, setRefreshersUnavailable] = useState(false);

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [certsRes, rateRes, refreshRes] = await Promise.allSettled([
        retryTransient(() => api.get<Certification[]>('/api/training')),
        retryTransient(() => api.get<ComplianceReport>('/api/training/reports/compliance_rate')),
        retryTransient(() => api.get<RefresherItem[]>('/api/training/reports/due_refreshers')),
      ]);
      if (certsRes.status === 'fulfilled') setCerts(certsRes.value);
      setRegisterUnavailable(certsRes.status === 'rejected');
      setComplianceUnavailable(rateRes.status === 'rejected');
      setRefreshersUnavailable(refreshRes.status === 'rejected');
      // Merge onto the safe defaults instead of replacing outright — a response
      // succeeding with compliance_rate missing (not a full outage, already
      // reported separately) otherwise left compliance_rate undefined,
      // which rendered as the literal text "undefined%" on the page (found
      // live, 2026-08-29 UI audit).
      if (rateRes.status === 'fulfilled') setCompliance(prev => ({ ...prev, ...rateRes.value }));
      if (refreshRes.status === 'fulfilled') setRefreshers(refreshRes.value);
      const failures = [certsRes, rateRes, refreshRes]
        .map((result, index) => result.status === 'rejected' ? {
          name: ['certifications', 'compliance', 'refreshers'][index],
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
        } : null)
        .filter((failure): failure is { name: string; message: string } => failure !== null);
      setError(failures.length ? `Could not load ${failures.map(failure => failure.name).join(', ')}: ${[...new Set(failures.map(failure => failure.message))].join('; ')}` : '');
    } catch (e) { setError(`Failed to load: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { certs, refreshers, compliance, loading, refreshing, error, setError, registerUnavailable, complianceUnavailable, refreshersUnavailable, fetchAll };
}
