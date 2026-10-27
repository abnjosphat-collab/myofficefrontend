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

  it('renders the loaded modules, names the failed source, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Supabase is waking up'));
    for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);
    queueLoad('recovered');

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.failedSources).toEqual(['Near Miss']));
    expect(result.current.loadError).toBe('');
    expect(result.current.lastUpdated).not.toBeNull();
    expect(result.current.raw.ws).toEqual([]);
    expect(toast.error).not.toHaveBeenCalled();

    await act(async () => result.current.refresh());
    expect(result.current.failedSources).toEqual([]);
    expect(result.current.raw.nm[0]?.id).toBe('nm-recovered');
    expect(result.current.raw.pach[0]?.id).toBe('pach-recovered');
  });

  it('keeps the failed module stale on refresh while updating the rest', async () => {
    queueLoad('existing');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable'));
    for (const rows of [[{ id: 'ws-new' }], [{ id: 'vfl-new' }], [{ id: 'pto-new' }], [{ id: 'insp-new' }], [{ id: 'pach-new' }]]) {
      vi.mocked(api.get).mockResolvedValueOnce(rows);
    }

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.raw.nm[0]?.id).toBe('nm-existing'));
    await act(async () => result.current.refresh());

    expect(result.current.raw.nm[0]?.id).toBe('nm-existing');
    expect(result.current.raw.ws[0]?.id).toBe('ws-new');
    expect(result.current.raw.pach[0]?.id).toBe('pach-new');
    expect(result.current.failedSources).toEqual(['Near Miss']);
    expect(result.current.loadError).toBe('');
    expect(result.current.refreshing).toBe(false);
  });

  it('reports one error when every source fails', async () => {
    for (const label of ['nm', 'ws', 'vfl', 'pto', 'insp', 'pach']) {
      vi.mocked(api.get).mockRejectedValueOnce(new Error(`${label} is down`));
    }

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.loadError).toBe('nm is down'));
    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.failedSources).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data');
  });

  it('names a malformed source instead of failing the dashboard', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ records: [] });
    for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSheqDashboardData());
    await waitFor(() => expect(result.current.failedSources).toEqual(['Near Miss']));

    expect(result.current.loadError).toBe('');
    expect(result.current.lastUpdated).not.toBeNull();
    expect(result.current.raw.nm).toEqual([]);
    expect(result.current.raw.ws).toEqual([]);
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

  it('merges a background tick silently and names a source only after two quiet failures', async () => {
    vi.useFakeTimers();
    try {
      queueLoad('first');
      const { result } = renderHook(() => useSheqDashboardData());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.lastUpdated).not.toBeNull();
      // Quiet tick: five sources answer new rows, Near Miss blips once — the
      // rows merge, the banner stays down, no flags flip.
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Blip'));
      for (const rows of [[{ id: 'ws-new' }], [{ id: 'vfl-new' }], [{ id: 'pto-new' }], [{ id: 'insp-new' }], [{ id: 'pach-new' }]]) {
        vi.mocked(api.get).mockResolvedValueOnce(rows);
      }
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.raw.ws[0]?.id).toBe('ws-new');
      expect(result.current.raw.nm[0]?.id).toBe('nm-first');
      expect(result.current.failedSources).toEqual([]);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.loadError).toBe('');
      expect(toast.error).not.toHaveBeenCalled();
      // Near Miss fails again on the next tick: now it is named, and the old rows stay.
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Blip'));
      for (let index = 0; index < 5; index += 1) vi.mocked(api.get).mockResolvedValueOnce([]);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.failedSources).toEqual(['Near Miss']);
      expect(result.current.raw.nm[0]?.id).toBe('nm-first');
      expect(toast.error).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
});
