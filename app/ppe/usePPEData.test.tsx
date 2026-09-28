import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { usePPEData } from './usePPEData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const record = (id: string) => ({
  id, employee_id: `E-${id}`, employee_name: `Employee ${id}`, position: 'Fitter', department: 'MAINTENANCE',
  ppe_type: 'helmet', item_name: 'Helmet', size: 'M', issue_date: '2026-01-01', expiry_date: '2028-01-01',
  condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: 'Mechanical',
});
const stats = { total_records: 1, unique_employees: 1, status_breakdown: { active: 1 }, condition_breakdown: { good: 1 }, expiring_soon: 0, expired: 0 };
const employees = [{ employee_id: 'E-1', first_name: 'Test', last_name: 'Employee', designation: 'Fitter', department: 'MAINTENANCE', section: 'Mechanical' }];

describe('PPE data loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial records failure and recovers without a false empty register', async () => {
    let recordsAttempt = 0;
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/api/ppe/matrix') return {};
      if (path === '/api/ppe') {
        recordsAttempt += 1;
        if (recordsAttempt === 1) throw new Error('Supabase is waking up');
        return [record('recovered')];
      }
      if (path === '/api/ppe/stats/summary') return stats;
      if (path === '/api/employees/') return employees;
      throw new Error(`Unexpected path ${path}`);
    });

    const { result } = renderHook(() => usePPEData());
    await waitFor(() => expect(result.current.recordsError).toBe('Supabase is waking up'));
    expect(result.current.records).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load PPE records: Supabase is waking up');

    await act(async () => result.current.refresh());
    expect(result.current.records[0]?.id).toBe('recovered');
    expect(result.current.recordsError).toBe('');
  });

  it('preserves loaded records when a quiet refresh fails', async () => {
    let failRecords = false;
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/api/ppe/matrix') return {};
      if (path === '/api/ppe') {
        if (failRecords) throw new Error('Service unavailable');
        return [record('existing')];
      }
      if (path === '/api/ppe/stats/summary') return stats;
      if (path === '/api/employees/') return employees;
      throw new Error(`Unexpected path ${path}`);
    });

    const { result } = renderHook(() => usePPEData());
    await waitFor(() => expect(result.current.records[0]?.id).toBe('existing'));
    failRecords = true;
    await act(async () => result.current.refresh(true));

    expect(result.current.records[0]?.id).toBe('existing');
    expect(result.current.recordsError).toBe('Service unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('keeps the register usable while reporting independent supporting-source failures', async () => {
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/api/ppe/matrix') return {};
      if (path === '/api/ppe') return [record('usable')];
      if (path === '/api/ppe/stats/summary') throw new Error('Stats unavailable');
      if (path === '/api/employees/') throw new Error('Personnel unavailable');
      throw new Error(`Unexpected path ${path}`);
    });

    const { result } = renderHook(() => usePPEData());
    await waitFor(() => expect(result.current.records[0]?.id).toBe('usable'));

    expect(result.current.statsError).toBe('Stats unavailable');
    expect(result.current.employeesError).toBe('Personnel unavailable');
    expect(result.current.stats).toBeNull();
  });

  it('ignores an older load after a newer request succeeds', async () => {
    let resolveOlder: ((value: unknown[]) => void) | undefined;
    let recordsAttempt = 0;
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/api/ppe/matrix') return {};
      if (path === '/api/ppe') {
        recordsAttempt += 1;
        if (recordsAttempt === 1) return new Promise(resolve => { resolveOlder = resolve; });
        return [record('current')];
      }
      if (path === '/api/ppe/stats/summary') return stats;
      if (path === '/api/employees/') return employees;
      throw new Error(`Unexpected path ${path}`);
    });

    const { result } = renderHook(() => usePPEData());
    await act(async () => result.current.refresh());
    expect(result.current.records[0]?.id).toBe('current');

    await act(async () => resolveOlder?.([record('older')]));
    expect(result.current.records[0]?.id).toBe('current');
  });

  it('reports a matrix failure and clears it after retry', async () => {
    let failMatrix = true;
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/api/ppe/matrix') {
        if (failMatrix) throw new Error('Matrix unavailable');
        return { helmet: 36 };
      }
      if (path === '/api/ppe') return [record('one')];
      if (path === '/api/ppe/stats/summary') return stats;
      if (path === '/api/employees/') return employees;
      throw new Error(`Unexpected path ${path}`);
    });

    const { result } = renderHook(() => usePPEData());
    await waitFor(() => expect(result.current.matrixError).toBe('Matrix unavailable'));
    failMatrix = false;
    await act(async () => result.current.refreshMatrix());

    expect(result.current.matrixError).toBe('');
    expect(result.current.matrix.helmet).toBe(36);
  });
});
