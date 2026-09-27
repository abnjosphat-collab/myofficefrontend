import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { WorkStoppageReport } from './types';
import { useWorkStoppageData } from './useWorkStoppageData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const report: WorkStoppageReport = {
  id: 'report-1',
  date: '2026-09-27',
  department: 'Engineering',
  section: 'General',
  description: 'Unsafe condition',
  investigationFindings: '',
  stoppageBy: 'Audit User',
  stoppagePosition: 'Supervisor',
  acceptedBy: '',
  sheqCheckedBy: '',
  correctiveActions: [],
  submittedAt: '2026-09-27T08:00:00Z',
};

describe('work stoppage loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes a failed initial load and recovers on retry', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce([report]);

    const { result } = renderHook(() => useWorkStoppageData());

    await act(async () => result.current.load());
    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.reports).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load reports');

    await act(async () => result.current.load());
    expect(result.current.loadError).toBe('');
    expect(result.current.reports).toEqual([report]);
  });

  it('preserves loaded reports when a quiet refresh fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([report])
      .mockRejectedValueOnce(new Error('Supabase is waking up'));

    const { result } = renderHook(() => useWorkStoppageData());
    await act(async () => result.current.load());
    await act(async () => result.current.load(true));

    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.reports).toEqual([report]);
    expect(result.current.loadError).toBe('Supabase is waking up');
  });
});
