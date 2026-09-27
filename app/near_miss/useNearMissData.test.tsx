import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { NearMissReport } from './types';
import { useNearMissData } from './useNearMissData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const report = (id: string): NearMissReport => ({
  id,
  department: 'Engineering',
  section: 'Mechanical',
  date: '2026-09-27',
  time: '09:00',
  location: 'Workshop',
  description: 'A machine guard came loose during inspection',
  witnessDetails: 'Audit witness',
  reporterName: 'Audit User',
  submittedAt: '2026-09-27T09:00:00Z',
});

describe('near miss loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial failure and recovers on retry', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Supabase is waking up'))
      .mockResolvedValueOnce([report('recovered')]);

    const { result } = renderHook(() => useNearMissData());
    await waitFor(() => expect(result.current.loadError).toBe('Supabase is waking up'));
    expect(result.current.reports).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load reports');

    await act(async () => result.current.loadReports());
    expect(result.current.loadError).toBe('');
    expect(result.current.reports[0]?.id).toBe('recovered');
  });

  it('preserves loaded reports when a quiet refresh fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([report('existing')])
      .mockRejectedValueOnce(new Error('Service unavailable'));

    const { result } = renderHook(() => useNearMissData());
    await waitFor(() => expect(result.current.reports[0]?.id).toBe('existing'));
    await act(async () => result.current.loadReports(true));

    expect(result.current.reports[0]?.id).toBe('existing');
    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('ignores an older response after a newer load succeeds', async () => {
    let resolveOlder: (value: NearMissReport[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([report('current')]);

    const { result } = renderHook(() => useNearMissData());
    await act(async () => result.current.loadReports());
    expect(result.current.reports[0]?.id).toBe('current');

    await act(async () => resolveOlder([report('older')]));
    expect(result.current.reports[0]?.id).toBe('current');
  });
});
