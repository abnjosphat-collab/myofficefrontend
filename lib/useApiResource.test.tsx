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
});
