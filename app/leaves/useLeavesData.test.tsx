// app/leaves/useLeavesData.test.tsx — the register keeps itself fresh on the shared background tick
// (lists re-read; the silence contract lives in lib/useAutoRefresh.ts + lib/autoRefreshSilence.test.tsx).
// A manual refetch still works, and writes still refresh through their own refetch.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { api } from '@/lib/apiClient';
import { useLeaves } from './useLeavesData';
import type { Leave } from './types';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number | null;
    constructor(message: string, status: number | null = null) { super(message); this.status = status; }
  },
}));

const row = (over: Partial<Leave> = {}): Leave => ({
  id: '1', employee_id: 'E1', employee_name: 'Ann Alpha', position: 'Fitter', leave_type: 'annual',
  start_date: '2026-09-14', end_date: '2026-09-16', reason: 'Family event', contact_number: '',
  status: 'pending', total_days: 3, applied_date: '2026-09-01T00:00:00Z', ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.get).mockResolvedValue([row()]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** Fake timers freeze waitFor's polling, so settle the mocked fetch with explicit flushes instead. */
const load = async () => {
  const utils = renderHook(() => useLeaves());
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(utils.result.current.loaded).toBe(true);
  return utils;
};

describe('useLeaves', () => {
  it('re-reads on the shared background tick', async () => {
    const { result } = await load();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    vi.mocked(api.get).mockResolvedValue([row(), row({ id: '2', employee_name: 'Ben Beta' })]);
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000); });
    expect(api.get).toHaveBeenCalledTimes(11); // the load plus one tick a minute
    expect(result.current.items).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('refetches when the network comes back', async () => {
    await load();
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('still refreshes on demand through refetch', async () => {
    const { result } = await load();
    await act(async () => { await result.current.refetch(); });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
