import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { PacheduReport } from './types';
import { createPacheduReport, deletePacheduReport, updatePacheduReport, usePacheduData } from './usePacheduData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const report = (id: string) => ({ id, location: 'Workshop', date: '2026-09-27', status: 'submitted' }) as PacheduReport;
const many = (n: number, from = 0) => Array.from({ length: n }, (_, i) => report(`r${from + i}`));

describe('Pachedu data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads every page, not just the first 1000 rows', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(many(1000)).mockResolvedValueOnce(many(5, 1000));
    const { result } = renderHook(() => usePacheduData());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.reports).toHaveLength(1005);
    expect(vi.mocked(api.get).mock.calls.map(c => c[0])).toEqual(['/api/pachedu/?limit=1000&offset=0', '/api/pachedu/?limit=1000&offset=1000']);
  });

  it('reports an initial failure as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([report('recovered')]);
    const { result } = renderHook(() => usePacheduData());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.reports[0]?.id).toBe('recovered');
  });

  it('lets write failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('nope'));
    await expect(createPacheduReport({})).rejects.toThrow('nope');
    await expect(updatePacheduReport('1', {})).rejects.toThrow('nope');
    await expect(deletePacheduReport('1')).rejects.toThrow('nope');
  });
});
