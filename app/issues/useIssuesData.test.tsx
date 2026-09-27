import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Spare, Stats, StockIssue } from './types';
import { useIssuesData } from './useIssuesData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const issue = (id: number): StockIssue => ({
  id,
  issued_at: '2026-09-27T08:00:00Z',
  recipient_name: 'Audit User',
  issued_by: 'Stores',
  items: [{ stock_code: 'SP-1', description: 'Test spare', qty: 1, unit: 'UN', unit_price: 2 }],
});

const stats = (total: number): Stats => ({ total, today: 0, this_week: total, unique_recipients: total });
const spare = (id: number): Spare => ({
  id,
  stock_code: `SP-${id}`,
  description: 'Test spare',
  unit_price: 2,
  current_quantity: 10,
});

function mockResources(values: {
  issues?: StockIssue[] | Error;
  stats?: Stats | Error;
  spares?: Spare[] | Error;
}) {
  vi.mocked(api.get).mockImplementation(path => {
    const value = path.startsWith('/api/issues?')
      ? values.issues
      : path === '/api/issues/stats/summary'
        ? values.stats
        : values.spares;
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

describe('Issues loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial register failure and recovers on retry', async () => {
    mockResources({
      issues: new Error('Supabase is waking up'),
      stats: stats(75),
      spares: [spare(1)],
    });

    const { result } = renderHook(() => useIssuesData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loadError).toBe('Supabase is waking up');
    expect(result.current.issues).toEqual([]);
    expect(result.current.serverStats).toEqual(stats(75));
    expect(toast.error).toHaveBeenCalledWith('Failed to load stock issues');

    mockResources({ issues: [issue(2)], stats: stats(1), spares: [spare(1)] });
    await act(async () => result.current.refresh());

    expect(result.current.loadError).toBe('');
    expect(result.current.issues[0]?.id).toBe(2);
  });

  it('does not turn failed supporting resources into valid zero or empty data', async () => {
    mockResources({
      issues: [issue(1)],
      stats: new Error('Statistics unavailable'),
      spares: new Error('Catalogue unavailable'),
    });

    const { result } = renderHook(() => useIssuesData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.issues).toHaveLength(1);
    expect(result.current.serverStats).toBeNull();
    expect(result.current.statsError).toBe('Statistics unavailable');
    expect(result.current.spares).toEqual([]);
    expect(result.current.sparesError).toBe('Catalogue unavailable');
  });

  it('preserves all loaded resources when a quiet refresh fails', async () => {
    mockResources({ issues: [issue(1)], stats: stats(1), spares: [spare(1)] });
    const { result } = renderHook(() => useIssuesData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockResources({
      issues: new Error('Register unavailable'),
      stats: new Error('Statistics unavailable'),
      spares: new Error('Catalogue unavailable'),
    });
    await act(async () => result.current.refresh(true));

    expect(result.current.issues[0]?.id).toBe(1);
    expect(result.current.serverStats).toEqual(stats(1));
    expect(result.current.spares[0]?.id).toBe(1);
    expect(result.current.loadError).toBe('Register unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('ignores every resource from an older load after a newer load completes', async () => {
    const olderResolvers: Array<(value: unknown) => void> = [];
    let call = 0;
    vi.mocked(api.get).mockImplementation(path => {
      const cycle = Math.floor(call++ / 3);
      if (cycle === 0) return new Promise(resolve => olderResolvers.push(resolve));
      if (path.startsWith('/api/issues?')) return Promise.resolve([issue(2)]);
      if (path === '/api/issues/stats/summary') return Promise.resolve(stats(2));
      return Promise.resolve([spare(2)]);
    });

    const { result } = renderHook(() => useIssuesData());
    await act(async () => result.current.refresh());
    expect(result.current.issues[0]?.id).toBe(2);

    await act(async () => {
      olderResolvers[0]([issue(1)]);
      olderResolvers[1](stats(1));
      olderResolvers[2]([spare(1)]);
    });

    expect(result.current.issues[0]?.id).toBe(2);
    expect(result.current.serverStats).toEqual(stats(2));
    expect(result.current.spares[0]?.id).toBe(2);
  });
});
