import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { applyMatrixAll, applyMatrixType, fetchAllEmployees, fetchPPEEvents, fetchPPERecords, postPPEEvent, setMatrixInterval, toEventBody, usePPEEvents, usePPEMatrix } from './usePPEData';
import { PPE_MATRIX_DEFAULTS } from './ppeMeta';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn(), patch: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

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

  it('requests the matrix for one department when asked', async () => {
    vi.mocked(api.get).mockResolvedValue({ gumboots: 3 });
    const { result } = renderHook(() => usePPEMatrix('Mining'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/api/ppe/matrix?department=Mining');
    expect(result.current.matrix.gumboots).toBe(3);
  });

  it('sends the department with saves and applies', async () => {
    vi.mocked(api.put).mockResolvedValue({ updated: 1 });
    vi.mocked(api.post).mockResolvedValue({ updated: 1, total_updated: 1 });
    await setMatrixInterval('gumboots', 3, 'Mining');
    expect(vi.mocked(api.put)).toHaveBeenCalledWith('/api/ppe/matrix', { ppe_type: 'gumboots', interval_months: 3, department: 'Mining' });
    await applyMatrixType('gumboots', 'Mining');
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/ppe/matrix/gumboots/apply?department=Mining', {});
    await applyMatrixAll('Mining');
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/ppe/matrix/apply-all?department=Mining', {});
  });

  it('omits the department for company-wide calls', async () => {
    vi.mocked(api.put).mockResolvedValue({ updated: 2 });
    vi.mocked(api.post).mockResolvedValue({ updated: 2, total_updated: 2 });
    await setMatrixInterval('vest', 3);
    expect(vi.mocked(api.put)).toHaveBeenCalledWith('/api/ppe/matrix', { ppe_type: 'vest', interval_months: 3, department: null });
    await applyMatrixType('vest');
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/ppe/matrix/vest/apply', {});
  });

  it('rejects an invalid events response instead of returning a false empty log', async () => {
    vi.mocked(api.get).mockResolvedValue({ rows: [] });
    await expect(fetchPPEEvents('Mining')).rejects.toThrow('invalid response');
  });

  it('fetches the log for one department when asked', async () => {
    const events = [{ id: 'e1', kind: 'issue', employee_id: 'C1', ppe_type: 'jacket', quantity: 2, department: 'Mining', record_id: 7, idempotency_key: 'k1', evidence: {}, result: {}, actor: 'm@x.com' }];
    vi.mocked(api.get).mockResolvedValue(events);
    await expect(fetchPPEEvents('Mining')).resolves.toEqual(events);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/api/ppe/events?department=Mining');
  });

  it('loads the log through the hook and stays quiet until enabled', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const { result, rerender } = renderHook(({ enabled }) => usePPEEvents('Mining', enabled), { initialProps: { enabled: false } });
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/api/ppe/events?department=Mining');
  });

  it('builds an atomic issue body with a fresh idempotency key and posts it', async () => {
    vi.mocked(api.post).mockResolvedValue({ record_id: 7, duplicate: false });
    const body = toEventBody({ employee_id: 'C1', ppe_type: 'jacket', issue_date: '2026-02-02', quantity: 2 });
    expect(body).toMatchObject({ kind: 'issue', employee_id: 'C1', ppe_type: 'jacket', quantity: 2, issue_date: '2026-02-02' });
    expect(typeof body.idempotency_key).toBe('string');
    expect(body.idempotency_key.length).toBeGreaterThan(0);
    const res = await postPPEEvent(body, 'Mining');
    expect(res).toEqual({ record_id: 7, duplicate: false });
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/ppe/events?department=Mining', body);
  });

  it('defaults the issue quantity to one whole item', async () => {
    const body = toEventBody({ employee_id: 'C1', ppe_type: 'jacket', issue_date: '2026-02-02' });
    expect(body.quantity).toBe(1);
  });
});
