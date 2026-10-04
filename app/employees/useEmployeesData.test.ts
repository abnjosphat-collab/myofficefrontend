import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { loadEmployees } from './useEmployeesData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));

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
});
