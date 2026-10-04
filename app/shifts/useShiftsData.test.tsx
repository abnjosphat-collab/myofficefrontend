import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useShiftsData } from './useShiftsData';
import type { ShiftAssignment } from './types';

vi.mock('@/lib/apiClient', () => {
  class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }
  return { ApiError, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

const assignment = (id: number): ShiftAssignment => ({ id, employee_id: `E-${id}`, employee_name: 'Audit Employee', shift_type: '5-2', cycle_start_date: '2026-09-28', on_days: 5, off_days: 2, is_active: true, day_overrides: [] });

describe('shift roster loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports an assignment failure instead of an empty roster', async () => {
    vi.mocked(api.get).mockImplementation((async (path: string) => { if (path.startsWith('/api/standby')) throw new Error('Supabase is waking up'); return []; }) as never);
    const { result } = renderHook(() => useShiftsData());
    await waitFor(() => expect(result.current.assignments.loading).toBe(false));
    expect(result.current.assignments.error).toBe('Supabase is waking up');
    expect(result.current.assignments.loaded).toBe(false);
    expect(result.current.assignments.items).toEqual([]);
  });

  it('keeps the roster when only the leave context fails, and says so', async () => {
    vi.mocked(api.get).mockImplementation((async (path: string) => { if (path.startsWith('/api/leaves')) throw new Error('Leaves unavailable'); return [assignment(2)]; }) as never);
    const { result } = renderHook(() => useShiftsData());
    await waitFor(() => expect(result.current.assignments.items[0]?.id).toBe(2));
    await waitFor(() => expect(result.current.leaves.loading).toBe(false));
    expect(result.current.leaves.error).toBe('Leaves unavailable');
    expect(result.current.assignments.error).toBeNull();
  });
});
