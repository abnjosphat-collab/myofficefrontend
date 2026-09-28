import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/lib/api';
import { useCompressorsData } from './useCompressorsData';

vi.mock('@/lib/api', () => ({ authFetch: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ api: { post: vi.fn(), blob: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const compressor = { id: 1, name: 'Audit compressor', model: 'AC-100', capacity: '100 CFM', location: 'Main Plant', status: 'running', total_running_hours: 1200, total_loaded_hours: 900, initial_total_running: 1000, initial_total_loaded: 750, color: 'bg-brand-500' };
const response = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Unavailable', json: vi.fn().mockResolvedValue(data) }) as unknown as Response;

function installFetch(primary: () => Response) {
  vi.mocked(authFetch).mockImplementation(async input => {
    const url = String(input);
    if (url.endsWith('/api/compressors/compressors')) return primary();
    if (url.includes('/readings/')) return response({ data: [] });
    if (url.endsWith('/stats')) return response({ total_compressors: 1, total_running_hours: 1200, avg_efficiency: 75, upcoming_services: 0, urgent_alerts: 0, active_compressors: 1 });
    if (url.endsWith('/service-due')) return response([]);
    if (url.includes('/performance-metrics')) return response([]);
    if (url.includes('/analytics/trends')) return response({ success: true, data: [], message: '', has_data: false });
    if (url.includes('/analytics/comparison')) return response({ success: true, data: [], message: '', count: 0 });
    if (url.includes('/management/summary')) return response({});
    return response([]);
  });
}

describe('Compressor register loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('marks an initial register failure unavailable', async () => {
    installFetch(() => response({ detail: 'Service unavailable' }, 503));
    const { result } = renderHook(() => useCompressorsData(new Date('2026-09-28T08:00:00Z')));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.compressorsLoaded).toBe(false);
    expect(result.current.compressors).toEqual([]);
    expect(result.current.loadError).toBe('Service unavailable');
  });

  it('preserves loaded compressors when a quiet refresh fails', async () => {
    let failPrimary = false;
    installFetch(() => failPrimary ? response({ detail: 'Temporary outage' }, 503) : response([compressor]));
    const { result } = renderHook(() => useCompressorsData(new Date('2026-09-28T08:00:00Z')));
    await waitFor(() => expect(result.current.compressorsLoaded).toBe(true));

    failPrimary = true;
    await act(async () => result.current.refresh());

    expect(result.current.compressors[0]?.name).toBe('Audit compressor');
    expect(result.current.compressorsLoaded).toBe(true);
    expect(result.current.loadError).toBe('Temporary outage');
  });
});
