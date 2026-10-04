import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { SHEQFormData } from './types';
import { createInspection, deleteInspection, updateInspection, useSheqInspectionData } from './useSheqInspectionData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const inspection = (id: string): SHEQFormData => ({
  id, inspectors: 'Audit User', title: 'Monthly audit', place: 'Workshop', date: '2026-09-27', time: '09:00', department: 'Engineering', section: 'mechanical', findings: [],
  hodName: '', sheqOfficialName: '', status: 'draft', before_photos: [], after_photos: [], createdAt: '2026-09-27T09:00:00Z', updatedAt: '2026-09-27T09:00:00Z',
});

describe('SHEQ inspection data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports an initial failure as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([inspection('recovered')]);
    const { result } = renderHook(() => useSheqInspectionData());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.inspections[0]?.id).toBe('recovered');
  });

  it('keeps loaded inspections when a refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([inspection('existing')]).mockRejectedValueOnce(new Error('Supabase is waking up'));
    const { result } = renderHook(() => useSheqInspectionData());
    await waitFor(() => expect(result.current.inspections[0]?.id).toBe('existing'));
    await act(async () => result.current.refetch());
    expect(result.current.inspections[0]?.id).toBe('existing');
    expect(result.current.error).toBe('Supabase is waking up');
  });

  it('lets write failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('nope'));
    await expect(createInspection({})).rejects.toThrow('nope');
    await expect(updateInspection('1', {})).rejects.toThrow('nope');
    await expect(deleteInspection('1')).rejects.toThrow('nope');
  });
});
