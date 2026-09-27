import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { SHEQFormData } from './types';
import { useSheqInspectionData } from './useSheqInspectionData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const inspection = (id: string): SHEQFormData => ({
  id,
  inspectors: 'Audit User',
  title: 'Workshop inspection',
  place: 'Workshop',
  date: '2026-09-27',
  time: '09:00',
  department: 'Engineering',
  section: 'mechanical',
  findings: [],
  hodName: '',
  sheqOfficialName: '',
  status: 'submitted',
  before_photos: [],
  after_photos: [],
  createdAt: '2026-09-27T09:00:00Z',
  updatedAt: '2026-09-27T09:00:00Z',
});

describe('SHEQ inspection loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exposes an initial failure and recovers on retry', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Supabase is waking up'))
      .mockResolvedValueOnce([inspection('recovered')]);

    const { result } = renderHook(() => useSheqInspectionData());
    await act(async () => result.current.load());

    expect(result.current.loadError).toBe('Supabase is waking up');
    expect(result.current.inspections).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Failed to load inspections');

    await act(async () => result.current.load());
    expect(result.current.loadError).toBe('');
    expect(result.current.inspections[0]?.id).toBe('recovered');
  });

  it('preserves loaded inspections when a quiet refresh fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([inspection('existing')])
      .mockRejectedValueOnce(new Error('Service unavailable'));

    const { result } = renderHook(() => useSheqInspectionData());
    await act(async () => result.current.load());
    await act(async () => result.current.load(true));

    expect(result.current.inspections[0]?.id).toBe('existing');
    expect(result.current.loadError).toBe('Service unavailable');
    expect(result.current.refreshing).toBe(false);
  });

  it('ignores an older response after a newer load succeeds', async () => {
    let resolveOlder: (value: SHEQFormData[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([inspection('current')]);

    const { result } = renderHook(() => useSheqInspectionData());
    act(() => { void result.current.load(); });
    await act(async () => result.current.load());
    expect(result.current.inspections[0]?.id).toBe('current');

    await act(async () => resolveOlder([inspection('older')]));
    expect(result.current.inspections[0]?.id).toBe('current');
  });
});
