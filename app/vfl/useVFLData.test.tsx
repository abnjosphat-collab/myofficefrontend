import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { VFLReport } from './types';
import { createVFLReport, deleteVFLReport, updateVFLReport, useVFLData } from './useVFLData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const report = (id: string): VFLReport => ({
  id, observerName: 'Audit User', designation: 'Supervisor', sectionChoice: 'Mechanical', departmentSection: 'Engineering', date: '2026-09-27', time: '09:00',
  behaviourCategory: 'Safe Behaviour', observationType: 'Safe Behaviour', description: 'Observed safe work', coachingTechnique: 'SBR', actions: [], status: 'submitted', created_at: '2026-09-27T09:00:00Z',
});

describe('VFL data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports an initial failure as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([report('recovered')]);
    const { result } = renderHook(() => useVFLData());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.reports[0]?.id).toBe('recovered');
  });

  it('keeps loaded reports when a refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([report('existing')]).mockRejectedValueOnce(new Error('Supabase is waking up'));
    const { result } = renderHook(() => useVFLData());
    await waitFor(() => expect(result.current.reports[0]?.id).toBe('existing'));
    await act(async () => result.current.refetch());
    expect(result.current.reports[0]?.id).toBe('existing');
    expect(result.current.error).toBe('Supabase is waking up');
  });

  it('lets write failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('nope'));
    await expect(createVFLReport({})).rejects.toThrow('nope');
    await expect(updateVFLReport('1', {})).rejects.toThrow('nope');
    await expect(deleteVFLReport('1')).rejects.toThrow('nope');
  });
});
