import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { getAllPages, unwrapRows } from './paged';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));

const rows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: from + i }));

describe('getAllPages', () => {
  beforeEach(() => vi.resetAllMocks());

  it('keeps asking until a short page arrives and returns every row', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(rows(3)).mockResolvedValueOnce(rows(3, 3)).mockResolvedValueOnce(rows(1, 6));
    const all = await getAllPages<{ id: number }>('/api/things/', { pageSize: 3 });
    expect(all).toHaveLength(7);
    expect(vi.mocked(api.get).mock.calls.map(c => c[0])).toEqual(['/api/things/?limit=3&offset=0', '/api/things/?limit=3&offset=3', '/api/things/?limit=3&offset=6']);
  });

  it('stops after one request when the first page is short', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(rows(2));
    expect(await getAllPages('/api/things/', { pageSize: 5 })).toHaveLength(2);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('appends to an existing query string', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);
    await getAllPages('/api/things?active=1', { pageSize: 5 });
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe('/api/things?active=1&limit=5&offset=0');
  });

  it('fails instead of returning a partial list when a later page fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(rows(3)).mockRejectedValueOnce(new Error('boom'));
    await expect(getAllPages('/api/things/', { pageSize: 3 })).rejects.toThrow('boom');
  });

  it('rejects a response that is not a list', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ detail: 'x' } as never);
    await expect(getAllPages('/api/things/', { pageSize: 3 })).rejects.toThrow('unexpected response');
  });

  it('reads rows out of a wrapped response with pick and keeps paging', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: rows(2), success: true }).mockResolvedValueOnce({ data: rows(1, 2), success: true });
    const all = await getAllPages<{ id: number }>('/api/things/', { pageSize: 2, pick: unwrapRows });
    expect(all.map(r => r.id)).toEqual([0, 1, 2]);
  });

  it('rejects a wrapped response that has no rows', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ message: 'Breakdowns Management API', endpoints: {} } as never);
    await expect(getAllPages('/api/things/', { pageSize: 2, pick: unwrapRows, label: 'Things' })).rejects.toThrow('Things returned an invalid response.');
  });

  it('names the source in the invalid-response error when given a label', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({} as never);
    await expect(getAllPages('/api/things/', { pageSize: 3, label: 'Things' })).rejects.toThrow('Things returned an invalid response.');
  });

  it('fails rather than silently stopping at the safety cap', async () => {
    vi.mocked(api.get).mockResolvedValue(rows(2));
    await expect(getAllPages('/api/things/', { pageSize: 2 })).rejects.toThrow('cannot load completely');
  });
});
