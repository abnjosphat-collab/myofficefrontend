import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/apiClient';
import { useCompressorsData } from './useCompressorsData';

vi.mock('@/lib/apiClient', async () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), blob: vi.fn() } };
});

const compressor = { id: 1, name: 'Audit compressor', model: 'AC-100', capacity: '100 CFM', location: 'Main Plant', status: 'running', total_running_hours: 1200, total_loaded_hours: 900, initial_total_running: 1000, initial_total_loaded: 750 };
const STATS = { total_compressors: 1, total_running_hours: 1200, avg_efficiency: 75, upcoming_services: 0, urgent_alerts: 0, active_compressors: 1 };

function install(overrides: Record<string, () => unknown> = {}) {
  vi.mocked(api.get).mockImplementation((async (path: string) => {
    for (const [needle, fn] of Object.entries(overrides)) if (path.includes(needle)) return fn();
    if (path.endsWith('/api/compressors/compressors')) return [compressor];
    if (path.includes('/readings/')) return { data: [{ date: '2026-09-27', total_running_hours: 1190, total_loaded_hours: 890 }] };
    if (path.endsWith('/stats')) return STATS;
    if (path.endsWith('/service-due')) return [];
    if (path.includes('/performance-metrics')) return [];
    if (path.includes('/analytics/trends')) return { success: true, data: [], message: '', has_data: false };
    if (path.includes('/analytics/comparison')) return { success: true, data: [], message: '', count: 0 };
    if (path.includes('/management/summary')) return {};
    return [];
  }) as never);
}

describe('compressor data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('marks an initial register failure unavailable instead of empty', async () => {
    install({ '/api/compressors/compressors': () => { throw new ApiError('Service unavailable', 403); } });
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.register.loading).toBe(false));
    expect(result.current.register.loaded).toBe(false);
    expect(result.current.compressors).toEqual([]);
    expect(result.current.register.error).toBe('Service unavailable');
  });

  it('keeps loaded compressors when a refresh fails', async () => {
    let fail = false;
    install({ '/api/compressors/compressors': () => { if (fail) throw new ApiError('Temporary outage', 403); return [compressor]; } });
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.register.loaded).toBe(true));
    fail = true;
    await act(async () => { await result.current.refresh(); });
    expect(result.current.compressors[0]?.name).toBe('Audit compressor');
    expect(result.current.register.error).toBe('Temporary outage');
  });

  it('reports a failed analytics section as an error, not as no data', async () => {
    install({ '/performance-metrics': () => { throw new ApiError('Metrics are down', 500); } });
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.metrics.loading).toBe(false));
    expect(result.current.metrics.error).toBe('Metrics are down');
    expect(result.current.metrics.loaded).toBe(false);
  });

  it('takes the previous reading from before the chosen day, and reloads when the day changes', async () => {
    install();
    const { result, rerender } = renderHook(({ day }) => useCompressorsData(day), { initialProps: { day: '2026-09-28' } });
    await waitFor(() => expect(result.current.previous.byId[1]?.total_running_hours).toBe(1190));
    rerender({ day: '2026-09-27' }); // the only reading is now not before the chosen day: falls back to the initial totals
    await waitFor(() => expect(result.current.previous.byId[1]?.date).toBe('Initial'));
    expect(result.current.previous.byId[1]?.total_running_hours).toBe(1000);
  });

  it('lists a compressor whose history failed to load instead of treating it as having none', async () => {
    install({ '/readings/': () => { throw new ApiError('boom', 500); } });
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.previous.failed).toEqual([1]));
    expect(result.current.previous.byId[1]).toBeUndefined();
  });

  it('refuses a reading that is below the previous total, without calling the server', async () => {
    install();
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.previous.byId[1]).toBeDefined());
    await expect(result.current.saveReading(1, { running: 1100, loaded: 890, pressure: 0, temperature: 0, notes: '' })).rejects.toThrow(/previous total/);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reports which step failed when a service is recorded but the hours are not updated', async () => {
    install();
    vi.mocked(api.post).mockImplementation((async (path: string) => { if (path.includes('daily-entries')) throw new ApiError('Hours rejected', 400); return {}; }) as never);
    const { result } = renderHook(() => useCompressorsData('2026-09-28'));
    await waitFor(() => expect(result.current.register.loaded).toBe(true));
    await expect(result.current.completeService(1, 2000)).rejects.toThrow(/The service was recorded, but the running hours were not updated: Hours rejected/);
  });
});
