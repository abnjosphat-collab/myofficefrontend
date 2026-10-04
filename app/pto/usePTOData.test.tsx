import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { PTOReport } from './types';
import { createPTOReport, deletePTOReport, updatePTOReport, usePTOData } from './usePTOData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const report = (id: string) => ({ id, observerName: 'Audit User', workerName: 'Worker', jobTaskObserved: 'Task', date: '2026-09-27', status: 'submitted' }) as PTOReport;

describe('PTO data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports an initial failure as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([report('recovered')]);
    const { result } = renderHook(() => usePTOData());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.reports[0]?.id).toBe('recovered');
  });

  it('keeps loaded reports when a refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([report('existing')]).mockRejectedValueOnce(new Error('Supabase is waking up'));
    const { result } = renderHook(() => usePTOData());
    await waitFor(() => expect(result.current.reports[0]?.id).toBe('existing'));
    await act(async () => result.current.refetch());
    expect(result.current.reports[0]?.id).toBe('existing');
    expect(result.current.error).toBe('Supabase is waking up');
  });

  it('lets write failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('nope'));
    await expect(createPTOReport({})).rejects.toThrow('nope');
    await expect(updatePTOReport('1', {})).rejects.toThrow('nope');
    await expect(deletePTOReport('1')).rejects.toThrow('nope');
  });
});
