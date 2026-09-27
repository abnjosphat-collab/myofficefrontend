import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { Breakdown, Filters, HeatmapData } from './types';
import { fetchBreakdowns, useBreakdownAnalytics, useBreakdownsData } from './useBreakdownsData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));

const filters: Filters = { status: 'all', breakdown_type: 'all', priority: 'all', department: 'all', location: 'all' };
const analytics = (name: string) => ({ success: true, marker: name }) as unknown as HeatmapData;

describe('breakdown register loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads every API page with the active filters before returning records', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id })) as Breakdown[];
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({ data: [{ id: 1000 }] });

    const records = await fetchBreakdowns({ priority: 'critical', location: 'Plant' });
    expect(records).toHaveLength(1001);
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    const urls = vi.mocked(api.get).mock.calls.map(([url]) => new URL(String(url), 'http://local'));
    expect(urls.map(url => url.searchParams.get('offset'))).toEqual(['0', '1000']);
    expect(urls.every(url => url.searchParams.get('limit') === '1000' && url.searchParams.get('priority') === 'critical' && url.searchParams.get('location') === 'Plant')).toBe(true);
  });

  it('does not show an older register response after a filter change', async () => {
    let resolveOld: (value: unknown) => void = () => {};
    const loggedFilters = { ...filters, status: 'logged' };
    const resolvedFilters = { ...filters, status: 'resolved' };
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: 2 }] });

    const { result, rerender } = renderHook(
      ({ activeFilters }) => useBreakdownsData(activeFilters, '', '', false),
      { initialProps: { activeFilters: loggedFilters } },
    );
    rerender({ activeFilters: resolvedFilters });
    await waitFor(() => expect(result.current.breakdowns[0]?.id).toBe(2));

    await act(async () => resolveOld({ data: [{ id: 1 }] }));
    expect(result.current.breakdowns[0]?.id).toBe(2);
  });
});

describe('breakdown analytics loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows a failed request and can retry without treating it as empty data', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(analytics('recovered'));

    const { result } = renderHook(() => useBreakdownAnalytics(filters, '2026-09-01', '2026-09-27'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Service unavailable');
    expect(result.current.data).toBeNull();

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual(analytics('recovered')));
    expect(result.current.error).toBe('');
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('ignores an older filter response after a newer request succeeds', async () => {
    let resolveOld: (value: HeatmapData) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(analytics('current'));

    const { result, rerender } = renderHook(
      ({ status }) => useBreakdownAnalytics({ ...filters, status }, '2026-09-01', '2026-09-27'),
      { initialProps: { status: 'logged' } },
    );
    rerender({ status: 'resolved' });
    await waitFor(() => expect(result.current.data).toEqual(analytics('current')));

    await act(async () => resolveOld(analytics('old')));
    expect(result.current.data).toEqual(analytics('current'));
    expect(result.current.loading).toBe(false);
  });

  it('ignores an older failure after the date range changes', async () => {
    let rejectOld: (reason: Error) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }))
      .mockResolvedValueOnce(analytics('current'));

    const { result, rerender } = renderHook(
      ({ startDate }) => useBreakdownAnalytics(filters, startDate, '2026-09-27'),
      { initialProps: { startDate: '2026-08-01' } },
    );
    rerender({ startDate: '2026-09-01' });
    await waitFor(() => expect(result.current.data).toEqual(analytics('current')));

    await act(async () => rejectOld(new Error('Old request failed')));
    expect(result.current.error).toBe('');
    expect(result.current.data).toEqual(analytics('current'));
  });
});
