// app/compressors/useCompressorsData.ts — the compressor tracker's data layer.
// Every section loads on its own and reports its own failure, so a failed analytics call is shown as a failure
// (with the reason and a retry) rather than as "no data". The register keeps its rows through a failed refresh.
// All writes throw, so the caller can show the reason and keep what the user typed.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { SERVICE_INTERVALS, localDateString, readingProblems } from './calcCompressors';
import type {
  AddCompressorFormData, ComparisonResult, Compressor, CompressorStats, ManagementSummary,
  PerformanceMetric, PreviousReading, TrendsResult, UpcomingService,
} from './types';

export { SERVICE_INTERVALS };

export const PERIOD_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90 };

const messageOf = (e: unknown, fallback: string) => {
  const raw = e instanceof Error && e.message ? e.message : fallback;
  // The database's check-constraint failure is not something a person can act on.
  return raw.includes('violates check constraint') || raw.includes('chk_daily_loaded_positive')
    ? 'Loaded hours must be positive and cannot exceed running hours.' : raw;
};

export interface Section<T> { data: T; error: string | null; loading: boolean; loaded: boolean; }

/** One independently loaded block of the page. Stale data is kept when a reload fails; a newer request wins. */
function useSection<T>(initial: T, fetcher: () => Promise<T>, deps: ReadonlyArray<unknown>, label: string) {
  const [state, setState] = useState<Section<T>>({ data: initial, error: null, loading: true, loaded: false });
  const latest = useRef(0);
  const fetchRef = useRef(fetcher);
  useEffect(() => { fetchRef.current = fetcher; });
  useEffect(() => {
    const request = ++latest.current;
    setState(s => ({ ...s, loading: true }));
    fetchRef.current().then(
      data => { if (request === latest.current) setState({ data, error: null, loading: false, loaded: true }); },
      e => { if (request === latest.current) setState(s => ({ ...s, error: messageOf(e, `${label} could not be loaded.`), loading: false })); },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

const asArray = <T,>(raw: unknown, what: string): T[] => {
  if (!Array.isArray(raw)) throw new Error(`${what} returned an unexpected response.`);
  return raw as T[];
};

export function useCompressorsData(date: string) {
  const [version, setVersion] = useState(0);
  const [period, setPeriod] = useState('monthly');
  const [metric, setMetric] = useState('efficiency');

  const register = useApiList<Compressor>('/api/compressors/compressors');
  const { items: compressors } = register;

  const stats = useSection<CompressorStats | null>(null, () => api.get<CompressorStats>('/api/compressors/stats'), [version], 'The summary figures');
  const services = useSection<UpcomingService[]>([], async () => asArray<UpcomingService>(await api.get('/api/compressors/service-due'), 'Upcoming services'), [version], 'Upcoming services');
  const metrics = useSection<PerformanceMetric[]>([], async () => asArray<PerformanceMetric>(await api.get(`/api/compressors/analytics/performance-metrics?period_days=${PERIOD_DAYS[period] ?? 30}`), 'Performance metrics'), [version, period], 'Performance metrics');
  const trends = useSection<TrendsResult | null>(null, () => api.get<TrendsResult>('/api/compressors/analytics/trends?period=monthly'), [version], 'Trend analysis');
  const comparison = useSection<ComparisonResult | null>(null, () => api.get<ComparisonResult>(`/api/compressors/analytics/comparison?metric=${metric}`), [version, metric], 'The comparison');
  const summary = useSection<ManagementSummary | null>(null, () => api.get<ManagementSummary>('/api/compressors/management/summary'), [version], 'The management summary');

  // The reading before the chosen date, per compressor. A compressor whose history could not be read is
  // listed in `previousFailed`, so its card says so instead of treating the history as empty.
  const idKey = useMemo(() => compressors.map(c => c.id).join(','), [compressors]);
  const [previous, setPrevious] = useState<{ byId: Record<number, PreviousReading>; failed: number[]; loading: boolean }>({ byId: {}, failed: [], loading: false });
  const prevRequest = useRef(0);
  useEffect(() => {
    if (!idKey) { setPrevious({ byId: {}, failed: [], loading: false }); return; }
    const request = ++prevRequest.current;
    setPrevious(p => ({ ...p, loading: true }));
    Promise.all(compressors.map(async c => {
      try {
        const r = await api.get<{ data?: Array<{ date: string; total_running_hours: number; total_loaded_hours: number }> }>(`/api/compressors/readings/${c.id}/detailed`);
        const rows = r.data ?? [];
        if (!rows.length) return { id: c.id, reading: undefined };
        const prior = rows.filter(x => x.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
        const reading: PreviousReading = prior
          ? { total_running_hours: prior.total_running_hours, total_loaded_hours: prior.total_loaded_hours, date: prior.date }
          : { total_running_hours: c.initial_total_running || 0, total_loaded_hours: c.initial_total_loaded || 0, date: 'Initial' };
        return { id: c.id, reading };
      } catch { return { id: c.id, reading: undefined, failed: true }; }
    })).then(results => {
      if (request !== prevRequest.current) return;
      const byId: Record<number, PreviousReading> = {};
      for (const r of results) if (r.reading) byId[r.id] = r.reading;
      setPrevious({ byId, failed: results.filter(r => 'failed' in r && r.failed).map(r => r.id), loading: false });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, date, version]);

  const refresh = useCallback(async () => { setVersion(v => v + 1); await register.refetch(); }, [register]);

  const saveReading = async (id: number, input: { running: number; loaded: number; pressure: number; temperature: number; notes: string }) => {
    const problems = readingProblems(previous.byId[id], input.running, input.loaded);
    const first = problems.running ?? problems.loaded;
    if (first) throw new Error(first);
    try {
      await api.post('/api/compressors/daily-entries/cumulative', { compressor_id: id, date, current_total_running: input.running, current_total_loaded: input.loaded, pressure: input.pressure, temperature: input.temperature, notes: input.notes });
    } catch (e) { throw new Error(messageOf(e, 'The reading could not be saved.')); }
    await refresh();
  };

  const addCompressor = async (data: AddCompressorFormData) => {
    try { await api.post('/api/compressors/compressors', data); } catch (e) { throw new Error(messageOf(e, 'The compressor could not be added.')); }
    await refresh();
  };

  const changeStatus = async (id: number, status: string) => {
    try { await api.patch(`/api/compressors/compressors/${id}/status`, { status }); } catch (e) { throw new Error(messageOf(e, 'The status could not be changed.')); }
    await refresh();
  };

  /** Records the service, then sets the running meter to the interval (the page's established behaviour). */
  const completeService = async (id: number, interval: number) => {
    const c = compressors.find(x => x.id === id);
    if (!c) throw new Error('That compressor is no longer in the register.');
    try {
      await api.post('/api/compressors/service-records', { compressor_id: id, service_type: `${interval} Hour Service`, service_date: localDateString(new Date()), running_hours_at_service: interval, description: `Completed ${interval} hour service`, is_completed: true });
    } catch (e) { throw new Error(messageOf(e, 'The service could not be recorded.')); }
    try {
      await api.post('/api/compressors/daily-entries/cumulative', { compressor_id: id, date, current_total_running: interval, current_total_loaded: c.total_loaded_hours, pressure: 0, temperature: 0, notes: `${interval} hour service completed` });
    } catch (e) {
      await refresh();
      throw new Error(`The service was recorded, but the running hours were not updated: ${messageOf(e, 'unknown error')}`);
    }
    await refresh();
  };

  const exportCsv = async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const blob = await api.blob('/api/compressors/export', 'POST', { start_date: localDateString(start), end_date: localDateString(end), format: 'csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `compressor-report-${localDateString(end)}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    const result = await api.post<{ errors?: unknown[]; imported_count?: number }>('/api/compressors/import', fd);
    await refresh();
    return { imported: result.imported_count ?? 0, errors: result.errors?.length ?? 0 };
  };

  return {
    register, compressors, stats, services, metrics, trends, comparison, summary, previous,
    period, setPeriod, metric, setMetric,
    refresh, saveReading, addCompressor, changeStatus, completeService, exportCsv, importCsv,
  };
}
