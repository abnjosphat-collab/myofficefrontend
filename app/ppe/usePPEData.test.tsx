import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { fetchAllEmployees, fetchPPERecords, usePPEMatrix } from './usePPEData';
import { PPE_MATRIX_DEFAULTS } from './ppeMeta';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe('PPE data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects an invalid records response instead of returning a false empty register', async () => {
    vi.mocked(api.get).mockResolvedValue({ rows: [] });
    await expect(fetchPPERecords()).rejects.toThrow('invalid response');
  });

  it('shapes personnel rows and tolerates missing fields', async () => {
    vi.mocked(api.get).mockResolvedValue([{ employee_id: 'C1', first_name: 'Ann', last_name: 'Alpha`', designation: 'fitter', section: 'Mechanical' }, null]);
    const rows = await fetchAllEmployees();
    expect(rows[0]).toMatchObject({ employee_id: 'C1', employee_name: 'Ann Alpha', section: 'Mechanical' });
    expect(rows[1]).toMatchObject({ employee_id: '', employee_name: '' });
  });

  it('overlays the saved matrix on the defaults', async () => {
    vi.mocked(api.get).mockResolvedValue({ helmet: 12 });
    const { result } = renderHook(() => usePPEMatrix());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.matrix.helmet).toBe(12);
    expect(result.current.matrix.vest).toBe(PPE_MATRIX_DEFAULTS.vest);
  });

  it('reports a matrix failure, keeps the defaults usable, and clears the error after a retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Matrix unavailable')).mockResolvedValueOnce({ helmet: 6 });
    const { result } = renderHook(() => usePPEMatrix());
    await waitFor(() => expect(result.current.error).toBe('Matrix unavailable'));
    expect(result.current.matrix).toEqual(PPE_MATRIX_DEFAULTS);
    await act(async () => { await result.current.refetch(); });
    expect(result.current.error).toBeNull();
    expect(result.current.matrix.helmet).toBe(6);
  });
});
