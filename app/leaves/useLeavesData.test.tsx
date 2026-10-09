// app/leaves/useLeavesData.test.tsx — the register loads once and stays put while it is read: no background
// polling and no refetch on tab switches. Refresh happens on demand (the caller's refetch) and after writes.
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
  it('loads once and never polls while it is read', async () => {
    const { result } = await load();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60 * 1000); });
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when the tab regains visibility', async () => {
    await load();
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(60 * 1000); });
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('still refreshes on demand through refetch', async () => {
    const { result } = await load();
    await act(async () => { await result.current.refetch(); });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
