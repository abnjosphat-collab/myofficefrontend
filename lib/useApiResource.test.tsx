import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useApiResource } from './useApiResource';

vi.mock('@/lib/apiClient', () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn() } };
});
const { ApiError } = await import('@/lib/apiClient');

describe('useApiResource', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads an object', async () => {
    vi.mocked(api.get).mockResolvedValue({ total: 3 });
    const { result } = renderHook(() => useApiResource<{ total: number }>('/api/x'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data).toEqual({ total: 3 });
    expect(result.current.error).toBeNull();
  });

  it('reports a failure with its status and never substitutes a default', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError('Down', 403));
    const { result } = renderHook(() => useApiResource('/api/x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.loaded).toBe(false);
    expect(result.current.error).toBe('Down');
    expect(result.current.errorStatus).toBe(403);
  });

  it('keeps the data it has when a refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ total: 3 });
    const { result } = renderHook(() => useApiResource<{ total: number }>('/api/x'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Blip'));
    await act(async () => { await result.current.refetch(); });
    expect(result.current.data).toEqual({ total: 3 });
    expect(result.current.error).toBe('Blip');
  });

  it('treats a non-object body as a failure', async () => {
    vi.mocked(api.get).mockResolvedValue([] as never);
    const { result } = renderHook(() => useApiResource('/api/x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/unexpected response/);
  });

  describe('background refresh', () => {
    it('re-reads on the 60 s tick without ever flipping loading, and stamps updatedAt', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockResolvedValueOnce({ total: 3 }).mockResolvedValue({ total: 4 });
        const seen: boolean[] = [];
        const { result } = renderHook(() => {
          const state = useApiResource<{ total: number }>('/api/x');
          seen.push(state.loading);
          return state;
        });
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        expect(result.current.loaded).toBe(true);
        expect(result.current.updatedAt).toBeInstanceOf(Date);
        seen.length = 0;
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        expect(api.get).toHaveBeenCalledTimes(2);
        expect(result.current.data).toEqual({ total: 4 });
        expect(seen).not.toContain(true);
        expect(result.current.error).toBeNull();
      } finally { vi.useRealTimers(); }
    });

    it('stays silent on the first quiet failure and surfaces the second, keeping the data throughout', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockResolvedValueOnce({ total: 3 });
        const { result } = renderHook(() => useApiResource<{ total: number }>('/api/x'));
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        vi.mocked(api.get).mockRejectedValue(new ApiError('No', 403));
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        expect(result.current.data).toEqual({ total: 3 });
        expect(result.current.error).toBeNull();
        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
        expect(result.current.data).toEqual({ total: 3 });
        expect(result.current.error).toBe('No');
        expect(result.current.errorStatus).toBe(403);
      } finally { vi.useRealTimers(); }
    });

    it('wires nothing when refresh is false', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(api.get).mockResolvedValue({ total: 3 });
        const { result } = renderHook(() => useApiResource<{ total: number }>('/api/x', { refresh: false }));
        await act(async () => { await vi.advanceTimersByTimeAsync(10); });
        expect(result.current.loaded).toBe(true);
        await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
        expect(api.get).toHaveBeenCalledTimes(1);
      } finally { vi.useRealTimers(); }
    });
  });
});
