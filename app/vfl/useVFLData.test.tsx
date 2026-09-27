import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { VFLReport } from './types';
import { useVFLData } from './useVFLData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const report = (id: string): VFLReport => ({
  id,
  observerName: 'Audit User',
  designation: 'Supervisor',
  sectionChoice: 'Mechanical',
  departmentSection: 'Engineering',
  date: '2026-09-27',
  time: '09:00',
  behaviourCategory: 'Safe Behaviour',
  observationType: 'Safe Behaviour',
  description: 'Observed safe work',
  coachingTechnique: 'SBR',
  actions: [],
  status: 'submitted',
  created_at: '2026-09-27T09:00:00Z',
});

describe('VFL loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial failure and recovers on retry', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce([report('recovered')]);

    const { result } = renderHook(() => useVFLData());
    await act(async () => result.current.loadData());

    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.reports).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load VFL reports');

    await act(async () => result.current.loadData());
    expect(result.current.loadError).toBe('');
    expect(result.current.reports[0]?.id).toBe('recovered');
  });

  it('preserves loaded reports when a quiet refresh fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([report('existing')])
      .mockRejectedValueOnce(new Error('Supabase is waking up'));

    const { result } = renderHook(() => useVFLData());
    await act(async () => result.current.loadData());
    await act(async () => result.current.loadData(true));

    expect(result.current.reports[0]?.id).toBe('existing');
    expect(result.current.loadError).toBe('Supabase is waking up');
    expect(result.current.refreshing).toBe(false);
  });

  it('ignores an older response after a newer load succeeds', async () => {
    let resolveOlder: (value: VFLReport[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([report('current')]);

    const { result } = renderHook(() => useVFLData());
    act(() => { void result.current.loadData(); });
    await act(async () => result.current.loadData());
    expect(result.current.reports[0]?.id).toBe('current');

    await act(async () => resolveOlder([report('older')]));
    expect(result.current.reports[0]?.id).toBe('current');
  });
});
