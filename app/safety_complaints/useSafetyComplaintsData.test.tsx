import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api as apiClient } from '@/lib/apiClient';
import type { Complaint } from './types';
import { api, useSafetyComplaintsData } from './useSafetyComplaintsData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const complaint = (id: string): Complaint => ({
  id, date: '2026-09-27', raisedBy: 'Audit User', issueRaised: 'Guard missing from rotating equipment', category: 'Safety', priority: 'high',
  section: 'Mechanical', location: 'Workshop', actionPlan: 'Isolate equipment and replace guard', byWho: 'Maintenance Foreman', byWhen: '2026-09-28',
  supervisorName: 'Shift Supervisor', supervisorSignature: 'S.S.', dateClosed: null, status: 'open', submittedAt: '2026-09-27T09:00:00Z',
});

describe('safety complaints data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports an initial failure as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Supabase is waking up')).mockResolvedValueOnce([complaint('recovered')]);
    const { result } = renderHook(() => useSafetyComplaintsData());
    await waitFor(() => expect(result.current.error).toBe('Supabase is waking up'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.complaints[0]?.id).toBe('recovered');
  });

  it('keeps loaded complaints when a refresh fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce([complaint('existing')]).mockRejectedValueOnce(new Error('Service unavailable'));
    const { result } = renderHook(() => useSafetyComplaintsData());
    await waitFor(() => expect(result.current.complaints[0]?.id).toBe('existing'));
    await act(async () => result.current.refetch());
    expect(result.current.complaints[0]?.id).toBe('existing');
    expect(result.current.error).toBe('Service unavailable');
  });

  it('sends snake_case payloads and lets write failures propagate', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(complaint('n'));
    await api.create({ issueRaised: 'x', date: '2026-10-01', byWhen: '' });
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ issue_raised: 'x', date: '2026-10-01', by_when: null, status: 'open' });
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('nope'));
    await expect(api.update('1', {})).rejects.toThrow('nope');
  });
});
