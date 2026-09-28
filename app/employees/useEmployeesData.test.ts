import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { loadEmployees, useEmployeesData } from './useEmployeesData';
import type { Employee } from './types';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const employee = (id: number): Employee => ({ id, employee_id: `E-${id}`, first_name: 'Audit', last_name: `Employee ${id}`, archived: false } as Employee);

describe('personnel registry loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the roster and passes a cancellable request signal', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    await expect(loadEmployees(100)).resolves.toEqual([]);
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('ends a stalled load with a retryable error', async () => {
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(() => {}));

    await expect(loadEmployees(5)).rejects.toThrow('Please retry');
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]?.signal?.aborted).toBe(true);
  });

  it('rejects a malformed successful response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ rows: [] });
    await expect(loadEmployees(100)).rejects.toThrow('unexpected response');
  });

  it('preserves the roster when a quiet refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([employee(1)]).mockRejectedValueOnce(new Error('Service unavailable'));
    const { result } = renderHook(() => useEmployeesData());
    await waitFor(() => expect(result.current.employees).toHaveLength(1));
    await act(async () => { await result.current.reload(true); });
    expect(result.current.employees[0]?.id).toBe(1);
    expect(result.current.error).toBe('Service unavailable');
  });

  it('ignores an older response after a newer reload completes', async () => {
    let resolveOlder: (value: Employee[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([employee(2)]);
    const { result } = renderHook(() => useEmployeesData());
    await act(async () => { await result.current.reload(); });
    expect(result.current.employees[0]?.id).toBe(2);
    await act(async () => { resolveOlder([employee(1)]); });
    expect(result.current.employees[0]?.id).toBe(2);
  });
});
