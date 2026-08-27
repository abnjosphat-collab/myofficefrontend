// app/compressors/useCompressorsData.ts — the compressor tracker's data-fetching layer:
// the domain-specific enhancedFetch wrapper, every resource fetch, the write-path
// mutations, and a hook that owns all of it. Split out of page.tsx as part of the
// standing "decompose on touch" convention. This page's shape is a unified load cycle
// (all 7 resources fire together under one loading flag via loadAllData) but three of
// the fetchers (performance metrics, trends, comparison) are also independently
// re-triggered by their own tab's period/metric selectors — so unlike other pages'
// hooks, this one exposes the fetch functions themselves, not just their resulting
// state, matching exactly how page.tsx called them before extraction.
'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type {
  AddCompressorFormData, AnalyticsData, ComparisonResult, Compressor, CompressorStats,
  ManagementData, ManagementSummary, PerformanceMetric, PreviousReading, TrendsResult, UpcomingService,
} from './types';

const API_BASE_URL = API_BASE;
const SERVICE_INTERVALS = [1000, 2000, 4000, 8000, 16000];

// Domain wrapper over authFetch (attaches the auth token, same base as lib/apiClient):
// translates the DB check-constraint failure into a human-readable message. Callers
// pass a full URL and pre-stringified body, so this stays a thin fetch-shaped helper.
const enhancedFetch = async (url: string, options: RequestInit = {}): Promise<unknown> => {
  const r = await authFetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) } });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const e = await r.json() as { detail?: string; message?: string };
      msg = e.detail ?? e.message ?? msg;
    } catch { msg = r.statusText || msg; }
    if (msg.includes('violates check constraint') || msg.includes('chk_daily_loaded_positive'))
      throw new Error('Invalid data: Loaded hours must be positive and cannot exceed running hours.');
    throw new Error(msg);
  }
  return r.json();
};

export function useCompressorsData(currentDate: Date) {
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [previousReadings, setPreviousReadings] = useState<Record<number, PreviousReading>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<{ type?: string; id?: number | string }>({});
  const [stats, setStats] = useState<CompressorStats | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<UpcomingService[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    performanceMetrics: [],
    trends: { success: false, data: [], message: '', has_data: false },
    comparison: { success: false, data: [], message: '', count: 0 },
  });
  const [managementData, setManagementData] = useState<ManagementData>({ summary: null, alerts: [], services: [] });

  const fetchCompressors = async () => {
    const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`)) as Compressor[];
    setCompressors(data || []);
    const prevData: Record<number, PreviousReading> = {};
    const curStr = currentDate.toISOString().split('T')[0];
    for (const c of data || []) {
      try {
        const r = (await enhancedFetch(`${API_BASE_URL}/api/compressors/readings/${c.id}/detailed`)) as { data?: Array<{ date: string; total_running_hours: number; total_loaded_hours: number }> };
        if (r.data?.length) {
          const prev = r.data.filter(x => x.date < curStr).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          if (prev) prevData[c.id] = { total_running_hours: prev.total_running_hours, total_loaded_hours: prev.total_loaded_hours, date: prev.date };
          else prevData[c.id] = { total_running_hours: c.initial_total_running || 0, total_loaded_hours: c.initial_total_loaded || 0, date: 'Initial' };
        }
      } catch { /* ignore per-compressor errors */ }
    }
    setPreviousReadings(prevData);
  };

  const fetchStats = async () => { try { setStats((await enhancedFetch(`${API_BASE_URL}/api/compressors/stats`)) as CompressorStats); } catch (e: unknown) { setStats(null); toast.error(`Stats failed to load: ${(e as Error).message}`); } };
  const fetchUpcomingServices = async () => { try { setUpcomingServices(((await enhancedFetch(`${API_BASE_URL}/api/compressors/service-due`)) as UpcomingService[]) || []); } catch (e: unknown) { setUpcomingServices([]); toast.error(`Upcoming services failed to load: ${(e as Error).message}`); } };
  const fetchPerformanceMetrics = async (days = 30) => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/performance-metrics?period_days=${days}`)) as PerformanceMetric[]) || [];
      setAnalyticsData(p => ({ ...p, performanceMetrics: data }));
    } catch (e: unknown) { setAnalyticsData(p => ({ ...p, performanceMetrics: [] })); toast.error(`Performance metrics failed to load: ${(e as Error).message}`); }
  };
  const fetchTrendAnalysis = async (period = 'monthly') => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/trends?period=${period}`)) as TrendsResult) || { success: false, data: [], message: '', has_data: false };
      setAnalyticsData(p => ({ ...p, trends: data }));
    } catch (e: unknown) { setAnalyticsData(p => ({ ...p, trends: { success: false, data: [], message: (e as Error).message, has_data: false } })); }
  };
  const fetchComparisonAnalytics = async (metric = 'efficiency') => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/comparison?metric=${metric}`)) as ComparisonResult) || { success: false, data: [], message: '', count: 0 };
      setAnalyticsData(p => ({ ...p, comparison: data }));
    } catch (e: unknown) { setAnalyticsData(p => ({ ...p, comparison: { success: false, data: [], message: (e as Error).message, count: 0 } })); }
  };
  const fetchManagementSummary = async () => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/management/summary`)) as ManagementSummary;
      setManagementData(p => ({ ...p, summary: data }));
    } catch (e: unknown) { setManagementData(p => ({ ...p, summary: null })); toast.error(`Management summary failed to load: ${(e as Error).message}`); }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try { await Promise.all([fetchCompressors(), fetchStats(), fetchUpcomingServices(), fetchPerformanceMetrics(), fetchTrendAnalysis(), fetchComparisonAnalytics(), fetchManagementSummary()]); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to load data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadAllData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateReading = (id: number, newRun: number, newLoad: number): boolean => {
    const prev = previousReadings[id];
    if (!prev) return true;
    if (newRun < prev.total_running_hours) { toast.error(`Running hours (${newRun}) < previous total (${prev.total_running_hours})`); return false; }
    if (newLoad < prev.total_loaded_hours) { toast.error(`Loaded hours (${newLoad}) < previous total (${prev.total_loaded_hours})`); return false; }
    const dr = newRun - prev.total_running_hours; const dl = newLoad - prev.total_loaded_hours;
    if (dl > dr) { toast.error(`Daily loaded (${dl.toFixed(1)}) > daily running (${dr.toFixed(1)})`); return false; }
    if (newLoad > newRun) { toast.error(`Total loaded (${newLoad}) > total running (${newRun})`); return false; }
    return true;
  };

  const updateCompressorHours = async (id: number, totalRunning: number, totalLoaded: number, pressure = 0, temperature = 0, notes = '') => {
    setIsSaving({ type: 'update', id });
    if (!validateReading(id, totalRunning, totalLoaded)) { setIsSaving({}); return; }
    try {
      const curStr = currentDate.toISOString().split('T')[0];
      const r = (await enhancedFetch(`${API_BASE_URL}/api/compressors/daily-entries/cumulative`, { method: 'POST', body: JSON.stringify({ compressor_id: id, date: curStr, current_total_running: parseFloat(String(totalRunning)) || 0, current_total_loaded: parseFloat(String(totalLoaded)) || 0, pressure: parseFloat(String(pressure)) || 0, temperature: parseFloat(String(temperature)) || 0, notes }) })) as { data?: { total_running_hours?: number; total_loaded_hours?: number } };
      if (r.data) {
        setCompressors(p => p.map(c => c.id === id ? { ...c, total_running_hours: r.data!.total_running_hours ?? totalRunning, total_loaded_hours: r.data!.total_loaded_hours ?? totalLoaded } : c));
        setPreviousReadings(p => ({ ...p, [id]: { total_running_hours: r.data!.total_running_hours ?? totalRunning, total_loaded_hours: r.data!.total_loaded_hours ?? totalLoaded, date: curStr } }));
      }
      await Promise.all([fetchStats(), fetchUpcomingServices(), fetchPerformanceMetrics(), fetchComparisonAnalytics()]);
      toast.success('Compressor hours updated');
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to update hours'); }
    finally { setIsSaving({}); }
  };

  const addCompressor = async (data: AddCompressorFormData) => {
    setIsSaving({ type: 'add', id: 'new' });
    try { await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`, { method: 'POST', body: JSON.stringify(data) }); await fetchCompressors(); toast.success(`${data.name} added`); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to add compressor'); throw e; }
    finally { setIsSaving({}); }
  };

  const updateCompressorStatus = async (id: number | null, status: string) => {
    setIsSaving({ type: 'status', id: id ?? undefined });
    try { await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); await fetchCompressors(); toast.success(`Status updated to ${status}`); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to update status'); throw e; }
    finally { setIsSaving({}); }
  };

  const markServiceCompleted = async (compressorId: number, serviceInterval: number) => {
    const comp = compressors.find(c => c.id === compressorId);
    if (!comp) return;
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/service-records`, { method: 'POST', body: JSON.stringify({ compressor_id: compressorId, service_type: `${serviceInterval} Hour Service`, service_date: new Date().toISOString().split('T')[0], running_hours_at_service: serviceInterval, description: `Completed ${serviceInterval} hour service`, is_completed: true }) });
      await updateCompressorHours(compressorId, serviceInterval, comp.total_loaded_hours, 0, 0, `${serviceInterval} hour service completed`);
      await fetchUpcomingServices();
      toast.success('Service marked as completed');
    } catch { toast.error('Failed to mark service as completed'); }
  };

  const generateCSVReport = async () => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const blob = await api.blob('/api/compressors/export', 'POST', { start_date: startDate, end_date: new Date().toISOString().split('T')[0], format: 'csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `compressor-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch { toast.error('Failed to export report'); }
  };

  const importData = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const result = await api.post<{ errors?: unknown[]; imported_count?: number }>('/api/compressors/import', fd);
      if (result.errors?.length) toast.warning(`Imported with ${result.errors.length} errors`);
      else toast.success(`Imported ${result.imported_count} compressors`);
      await loadAllData();
    } catch { toast.error('Failed to import data'); }
  };

  return {
    compressors, previousReadings, isLoading, isSaving,
    stats, upcomingServices, analyticsData, managementData,
    refresh: loadAllData,
    fetchPerformanceMetrics, fetchTrendAnalysis, fetchComparisonAnalytics,
    updateCompressorHours, addCompressor, updateCompressorStatus, markServiceCompleted,
    generateCSVReport, importData,
  };
}

export { SERVICE_INTERVALS };
