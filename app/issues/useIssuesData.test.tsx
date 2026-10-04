import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useIssuesData } from './useIssuesData';

vi.mock('@/lib/apiClient', () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } };
});
const { ApiError } = await import('@/lib/apiClient');

const issue = (id: number) => ({ id, issued_at: '2026-10-01T08:00:00', recipient_name: 'Ann', items: [] });

describe('useIssuesData', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads every page of the issue log, not just the first 1000', async () => {
    const first = Array.from({ length: 1000 }, (_, i) => issue(i + 1));
    vi.mocked(api.get).mockImplementation((async (path: string) => {
      if (path.startsWith('/api/issues?') || path.startsWith('/api/issues&')) return path.includes('offset=1000') ? [issue(1001)] : first;
      if (path.includes('/stats/summary')) return { total: 1001, today: 0, this_week: 0, unique_recipients: 1 };
      return [];
    }) as never);
    const { result } = renderHook(() => useIssuesData());
    await waitFor(() => expect(result.current.issues.loaded).toBe(true));
    expect(result.current.issues.items).toHaveLength(1001);
  });

  it('reports each failing source on its own and never replaces it with an empty default', async () => {
    vi.mocked(api.get).mockImplementation((async (path: string) => {
      if (path.includes('/stats/summary')) throw new ApiError('Stats down', 403);
      if (path.startsWith('/api/spares')) throw new ApiError('Catalogue down', 403);
      return [issue(1)];
    }) as never);
    const { result } = renderHook(() => useIssuesData());
    await waitFor(() => expect(result.current.stats.loading).toBe(false));
    await waitFor(() => expect(result.current.spares.loading).toBe(false));
    expect(result.current.stats.data).toBeNull();
    expect(result.current.stats.error).toBe('Stats down');
    expect(result.current.spares.loaded).toBe(false);
    expect(result.current.spares.error).toBe('Catalogue down');
    await waitFor(() => expect(result.current.issues.loaded).toBe(true));
    expect(result.current.issues.items).toHaveLength(1);
  });
});
