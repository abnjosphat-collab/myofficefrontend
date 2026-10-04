import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { useSheqDashboardData } from './useSheqDashboardData';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const moduleRows = (marker: string) => [[{ id: `nm-${marker}` }], [{ id: `ws-${marker}` }], [{ id: `vfl-${marker}` }], [{ id: `pto-${marker}` }], [{ id: `insp-${marker}` }], [{ id: `pach-${marker}` }]];
const queueLoad = (marker: string) => {
  for (const rows of moduleRows(marker)) vi.mocked(api.get).mockResolvedValueOnce(rows);
};

describe('SHEQ dashboard loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes a failed source and recovers with all modules on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Supabase is waking up'));
    for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);
    queueLoad('recovered');

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.loadError).toBe('Supabase is waking up'));
    expect(result.current.lastUpdated).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');

    await act(async () => result.current.refresh());
    expect(result.current.loadError).toBe('');
    expect(result.current.raw.nm[0]?.id).toBe('nm-recovered');
    expect(result.current.raw.pach[0]?.id).toBe('pach-recovered');
    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('preserves the complete dashboard when a refresh fails', async () => {
    queueLoad('existing');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable'));
    for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.raw.nm[0]?.id).toBe('nm-existing'));
    await act(async () => result.current.refresh());

    expect(result.current.raw.nm[0]?.id).toBe('nm-existing');
    expect(result.current.raw.pach[0]?.id).toBe('pach-existing');
    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('rejects a malformed source instead of presenting it as an empty module', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ records: [] });
    for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.loadError).toBe('Near Miss returned an invalid response.'));

    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.raw.nm).toEqual([]);
  });

  it('ignores an older six-source response after a newer load succeeds', async () => {
    const olderResolvers: Array<(value: unknown[]) => void> = [];
    for (let index = 0; index < 6; index += 1) {
      vi.mocked(api.get).mockImplementationOnce(() => new Promise(resolve => olderResolvers.push(resolve)));
    }
    queueLoad('current');

    const { result } = renderHook(() => useSheqDashboardData());
    await act(async () => result.current.refresh());
    expect(result.current.raw.nm[0]?.id).toBe('nm-current');

    await act(async () => {
      moduleRows('older').forEach((rows, index) => olderResolvers[index](rows));
    });
    expect(result.current.raw.nm[0]?.id).toBe('nm-current');
  });
});
