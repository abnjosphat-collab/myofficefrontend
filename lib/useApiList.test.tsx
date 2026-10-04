import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useApiList } from './useApiList';

vi.mock('@/lib/apiClient', () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn() } };
});
const { ApiError } = await import('@/lib/apiClient');

describe('useApiList', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads rows and maps them', async () => {
    vi.mocked(api.get).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useApiList<{ id: number }, string>('/api/x', r => `#${r.id}`));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual(['#1', '#2']);
  });

  it('reports a failure that waiting cannot fix at once, with its status, and never turns it into an empty list', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError('Not allowed', 403));
    const { result } = renderHook(() => useApiList('/api/x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBe('Not allowed');
    expect(result.current.errorStatus).toBe(403);
  });

  it('keeps the rows it has when a refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{ id: 1 }]);
    const { result } = renderHook(() => useApiList<{ id: number }>('/api/x'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Blip'));
    await act(async () => { await result.current.refetch(); });
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.error).toBe('Blip');
  });

  it('requests nothing while disabled, and loads once enabled', async () => {
    vi.mocked(api.get).mockResolvedValue([{ id: 1 }]);
    const { result, rerender } = renderHook(({ on }) => useApiList<{ id: number }>('/api/x', undefined, { enabled: on }), { initialProps: { on: false } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    rerender({ on: true });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('starts from nothing when the path changes, so one folder\'s rows are never shown under another', async () => {
    vi.mocked(api.get).mockImplementation((async (p: string) => (p === '/api/a' ? [{ id: 'a' }] : new Promise(() => {}))) as never);
    const { result, rerender } = renderHook(({ path }) => useApiList<{ id: string }>(path), { initialProps: { path: '/api/a' } });
    await waitFor(() => expect(result.current.items).toEqual([{ id: 'a' }]));
    rerender({ path: '/api/b' });
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(result.current.loaded).toBe(false);
  });

  it('uses a custom fetcher in place of the plain request', async () => {
    const fetcher = vi.fn(async (path: string) => [{ id: path }]);
    const { result } = renderHook(() => useApiList<{ id: string }>('/api/x', undefined, { fetcher }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([{ id: '/api/x' }]);
    expect(api.get).not.toHaveBeenCalled();
  });

  describe('a service that is slow or waking up', () => {
    it('keeps loading and retries until it answers, without ever showing a final error', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockRejectedValueOnce(new ApiError('Waking up', 503)).mockRejectedValueOnce(new ApiError('Still waking', 502)).mockResolvedValue([{ id: 1 }]);
        const { result } = renderHook(() => useApiList<{ id: number }>('/api/x'));
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        expect(result.current.loading).toBe(true);
        expect(result.current.loaded).toBe(false);
        expect(result.current.error).toBe('Waking up'); // what it last said, for "still loading"
        await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
        expect(result.current.loading).toBe(true);
        await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
        expect(result.current.loading).toBe(false);
        expect(result.current.loaded).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.items).toEqual([{ id: 1 }]);
        expect(api.get).toHaveBeenCalledTimes(3);
      } finally { vi.useRealTimers(); }
    });

    it('retries a lost connection and a plain 500, but not a malformed answer', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockRejectedValueOnce(new ApiError('Boom', 500)).mockResolvedValue([]);
        const { result } = renderHook(() => useApiList('/api/x'));
        await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
        expect(result.current.loaded).toBe(true);
        expect(api.get).toHaveBeenCalledTimes(3);
        vi.mocked(api.get).mockReset().mockResolvedValue({ not: 'a list' });
        const bad = renderHook(() => useApiList('/api/y'));
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        expect(bad.result.current.loading).toBe(false);
        expect(bad.result.current.error).toMatch(/unexpected response/);
        expect(api.get).toHaveBeenCalledTimes(1);
      } finally { vi.useRealTimers(); }
    });

    it('keeps the rows it has while a refresh is retried, and stops retrying when the page goes away', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockResolvedValueOnce([{ id: 1 }]);
        const { result, unmount } = renderHook(() => useApiList<{ id: number }>('/api/x'));
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        expect(result.current.items).toHaveLength(1);
        vi.mocked(api.get).mockRejectedValue(new ApiError('Down', 503));
        await act(async () => { void result.current.refetch(); await vi.advanceTimersByTimeAsync(10); });
        expect(result.current.items).toHaveLength(1);
        expect(result.current.error).toBeNull(); // rows are on screen, so nothing alarming
        const calls = vi.mocked(api.get).mock.calls.length;
        unmount();
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        expect(vi.mocked(api.get).mock.calls.length).toBe(calls);
      } finally { vi.useRealTimers(); }
    });
  });
});
