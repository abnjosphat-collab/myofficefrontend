import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useServicesData } from './useServicesData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const service = (id: string) => ({
  id,
  created_at: '2026-09-28T08:00:00Z',
  date: '2026-09-28',
  description: `Service ${id}`,
  supplier: 'Audit supplier',
});

describe('Services register loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('marks an initial failure unavailable without a false empty register', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Service unavailable'));
    const { result } = renderHook(() => useServicesData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recordsLoaded).toBe(false);
    expect(result.current.records).toEqual([]);
    expect(result.current.apiError).toBe('Service unavailable');
  });

  it('preserves loaded records when a quiet refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([service('one')]).mockRejectedValueOnce(new Error('Temporary outage'));
    const { result } = renderHook(() => useServicesData());
    await waitFor(() => expect(result.current.recordsLoaded).toBe(true));

    await act(async () => result.current.refresh());

    expect(result.current.records[0]?.id).toBe('one');
    expect(result.current.recordsLoaded).toBe(true);
    expect(result.current.apiError).toBe('Temporary outage');
  });

  it('ignores an older response after a newer refresh completes', async () => {
    let resolveOlder: (value: Record<string, unknown>[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([service('current')]);
    const { result } = renderHook(() => useServicesData());

    await act(async () => result.current.refresh(false));
    await act(async () => resolveOlder([service('older')]));

    expect(result.current.records[0]?.id).toBe('current');
  });
});
