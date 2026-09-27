import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api as apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Complaint } from './types';
import { useSafetyComplaintsData } from './useSafetyComplaintsData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const complaint = (id: string): Complaint => ({
  id,
  date: '2026-09-27',
  raisedBy: 'Audit User',
  issueRaised: 'Guard missing from rotating equipment',
  category: 'Safety',
  priority: 'high',
  section: 'Mechanical',
  location: 'Workshop',
  actionPlan: 'Isolate equipment and replace guard',
  byWho: 'Maintenance Foreman',
  byWhen: '2026-09-28',
  supervisorName: 'Shift Supervisor',
  supervisorSignature: 'S.S.',
  dateClosed: null,
  status: 'open',
  submittedAt: '2026-09-27T09:00:00Z',
});

describe('safety complaints loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial failure and recovers on retry', async () => {
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(new Error('Supabase is waking up'))
      .mockResolvedValueOnce([complaint('recovered')]);

    const { result } = renderHook(() => useSafetyComplaintsData());
    await act(async () => result.current.load());

    expect(result.current.loadError).toBe('Supabase is waking up');
    expect(result.current.complaints).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load complaints');

    await act(async () => result.current.load());
    expect(result.current.loadError).toBe('');
    expect(result.current.complaints[0]?.id).toBe('recovered');
  });

  it('preserves loaded complaints when a quiet refresh fails', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce([complaint('existing')])
      .mockRejectedValueOnce(new Error('Service unavailable'));

    const { result } = renderHook(() => useSafetyComplaintsData());
    await act(async () => result.current.load());
    await act(async () => result.current.load(true));

    expect(result.current.complaints[0]?.id).toBe('existing');
    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('ignores an older response after a newer load succeeds', async () => {
    let resolveOlder: (value: Complaint[]) => void = () => {};
    vi.mocked(apiClient.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([complaint('current')]);

    const { result } = renderHook(() => useSafetyComplaintsData());
    act(() => { void result.current.load(); });
    await act(async () => result.current.load());
    expect(result.current.complaints[0]?.id).toBe('current');

    await act(async () => resolveOlder([complaint('older')]));
    expect(result.current.complaints[0]?.id).toBe('current');
  });
});
