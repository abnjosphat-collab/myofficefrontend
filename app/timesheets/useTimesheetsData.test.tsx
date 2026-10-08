import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, useTimesheetsData } from './useTimesheetsData';
import type { Employee, Period } from './types';
import { ApiError, api as apiClient } from '@/lib/apiClient';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const august: Period = { start: new Date(2026, 7, 13), end: new Date(2026, 8, 12) };
const september: Period = { start: new Date(2026, 8, 13), end: new Date(2026, 9, 12) };
const employee: Employee = {
  id: 'one', employeeId: 'C100', name: 'Example Employee', position: 'Artisan',
  department: 'Engineering', email: '', is_active: true, employmentType: 'NEC',
};

describe('timesheet data loading', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads unsigned NEC records in a later month and excludes rejected records', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([
      { id: 1, status: 'approved' }, { id: 2, status: 'pending' },
      { id: 3, status: 'unsigned' }, { id: 4, status: ' Rejected ' },
    ]);
    expect((await api.moduleLeaves(september, true)).map(r => r.id)).toEqual([1, 2, 3]);
    expect(get).toHaveBeenLastCalledWith('/api/leaves', { signal: undefined });
    expect((await api.moduleOvertime(september, true)).map(r => r.id)).toEqual([1, 2, 3]);
    expect(get).toHaveBeenLastCalledWith('/api/overtime', { signal: undefined });
    await api.moduleOvertime(september, false);
    expect(get).toHaveBeenLastCalledWith('/api/overtime?status=approved', { signal: undefined });
  });

  it('preserves the register temporary mine number for module joins', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([{ id: 38836, employee_id: 'TBA', first_name: 'Mathew', last_name: 'Simango', employment_type: 'NEC' }]);
    expect((await api.employees())[0].employeeId).toBe('TBA');
  });

  it('always includes pending module records (NEC eligibility)', async () => {
    vi.spyOn(api, 'employees').mockResolvedValue([employee]);
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    const leaves = vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
    const overtime = vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);
    const { result } = renderHook(() => useTimesheetsData(september));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await waitFor(() => expect(leaves).toHaveBeenLastCalledWith(september, true, expect.any(AbortSignal)));
    expect(overtime).toHaveBeenLastCalledWith(september, true, expect.any(AbortSignal));
  });

  it('clears the prior period after a failed load instead of showing stale records', async () => {
    vi.spyOn(api, 'employees').mockResolvedValueOnce([employee]).mockRejectedValueOnce(new ApiError('Access denied', 403));
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
    vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);

    const { result, rerender } = renderHook(({ period }) => useTimesheetsData(period), { initialProps: { period: august } });
    await waitFor(() => expect(result.current.allEmployees).toHaveLength(1));

    rerender({ period: september });
    await waitFor(() => expect(result.current.loadError).toBe('Access denied'));
    expect(result.current.allEmployees).toEqual([]);
    expect(result.current.timesheets).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('preserves the current period after a failed quiet refresh', async () => {
    vi.spyOn(api, 'employees').mockResolvedValueOnce([employee]).mockRejectedValueOnce(new ApiError('Access denied', 403));
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
    vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);

    const { result } = renderHook(() => useTimesheetsData(august));
    await waitFor(() => expect(result.current.allEmployees).toHaveLength(1));
    await act(async () => { await result.current.refresh(true); });

    expect(result.current.allEmployees).toHaveLength(1);
    expect(result.current.loadError).toBe('Access denied');
    expect(result.current.refreshing).toBe(false);
  });
});

describe('automatic timesheet recovery', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  function mockReads() {
    vi.spyOn(api, 'employees').mockResolvedValue([employee]);
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);
    return vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
  }

  it('keeps loading through temporary Leaves failures and retries only that source', async () => {
    vi.useFakeTimers();
    const leaves = mockReads().mockRejectedValueOnce(new ApiError('Resource temporarily unavailable', 500))
      .mockRejectedValueOnce(new ApiError('Try later', 503)).mockResolvedValue([]);
    const { result } = renderHook(() => useTimesheetsData(september));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.loading).toBe(true);
    expect(result.current.retrying).toBe(true);
    expect(result.current.loadError).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(leaves).toHaveBeenCalledTimes(3);
    expect(api.employees).toHaveBeenCalledTimes(1);
    expect(api.timesheets).toHaveBeenCalledTimes(1);
    expect(result.current.allEmployees).toEqual([employee]);
    expect(result.current.loading).toBe(false);
    expect(result.current.retrying).toBe(false);
    expect(result.current.loadError).toBeNull();
  });

  it('stops obsolete retries on period change and accepts an empty successful period', async () => {
    vi.useFakeTimers();
    const leaves = mockReads().mockRejectedValueOnce(new ApiError('Busy', 503));
    vi.mocked(api.timesheets).mockImplementationOnce((_start, _end, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const { result, rerender } = renderHook(({ period }) => useTimesheetsData(period), { initialProps: { period: august } });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const oldSignal = vi.mocked(api.timesheets).mock.calls[0][2];
    rerender({ period: september });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(oldSignal?.aborted).toBe(true);
    expect(leaves).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.timesheets).toEqual([]);
    expect(result.current.loadError).toBeNull();
  });

  it('retains current rows during a recovering quiet refresh', async () => {
    vi.useFakeTimers();
    const leaves = mockReads();
    const { result } = renderHook(() => useTimesheetsData(september));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    leaves.mockRejectedValueOnce(new ApiError('Busy', 503));
    let refresh!: Promise<void>;
    await act(async () => { refresh = result.current.refresh(true); await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.allEmployees).toEqual([employee]);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.retrying).toBe(true);
    expect(result.current.loadError).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); await refresh; });
    expect(result.current.refreshing).toBe(false);
  });

  it('cancels retry timers on unmount', async () => {
    vi.useFakeTimers();
    const leaves = mockReads().mockRejectedValue(new TypeError('Failed to fetch'));
    const { unmount } = renderHook(() => useTimesheetsData(september));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(leaves).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
