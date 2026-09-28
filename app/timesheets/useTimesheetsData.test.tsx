import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, useTimesheetsData } from './useTimesheetsData';
import type { Employee, Period } from './types';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const august: Period = { start: new Date(2026, 7, 13), end: new Date(2026, 8, 12) };
const september: Period = { start: new Date(2026, 8, 13), end: new Date(2026, 9, 12) };
const employee: Employee = {
  id: 'one', employeeId: 'C100', name: 'Example Employee', position: 'Artisan',
  department: 'Engineering', email: '', is_active: true, employmentType: 'NEC',
};

describe('timesheet data loading', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clears the prior period after a failed load instead of showing stale records', async () => {
    vi.spyOn(api, 'employees').mockResolvedValueOnce([employee]).mockRejectedValueOnce(new Error('Offline'));
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
    vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);

    const { result, rerender } = renderHook(({ period }) => useTimesheetsData(period), { initialProps: { period: august } });
    await waitFor(() => expect(result.current.allEmployees).toHaveLength(1));

    rerender({ period: september });
    await waitFor(() => expect(result.current.loadError).toBe('Offline'));
    expect(result.current.allEmployees).toEqual([]);
    expect(result.current.timesheets).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('preserves the current period after a failed quiet refresh', async () => {
    vi.spyOn(api, 'employees').mockResolvedValueOnce([employee]).mockRejectedValueOnce(new Error('Offline'));
    vi.spyOn(api, 'timesheets').mockResolvedValue([]);
    vi.spyOn(api, 'moduleLeaves').mockResolvedValue([]);
    vi.spyOn(api, 'moduleOvertime').mockResolvedValue([]);
    vi.spyOn(api, 'shiftAssignments').mockResolvedValue([]);

    const { result } = renderHook(() => useTimesheetsData(august));
    await waitFor(() => expect(result.current.allEmployees).toHaveLength(1));
    await act(async () => { await result.current.refresh(true); });

    expect(result.current.allEmployees).toHaveLength(1);
    expect(result.current.loadError).toBe('Offline');
    expect(result.current.refreshing).toBe(false);
  });
});
