import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useTrainingData } from './useTrainingData';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn() } }));

describe('training data loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows a failed certification request as unavailable, not an empty register', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ compliance_rate: 88, total_tracked: 4, non_compliant: 1 })
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTrainingData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.registerUnavailable).toBe(true);
    expect(result.current.error).toContain('certifications: Network unavailable');
    expect(result.current.compliance.compliance_rate).toBe(88);
    expect(result.current.complianceUnavailable).toBe(false);
  });

  it('keeps loaded certifications when a separate report fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([{ id: 1, certification_name: 'First aid' }])
      .mockRejectedValueOnce(new Error('Report unavailable'))
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTrainingData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.certs).toHaveLength(1);
    expect(result.current.registerUnavailable).toBe(false);
    expect(result.current.complianceUnavailable).toBe(true);
    expect(result.current.error).toContain('compliance: Report unavailable');
  });

  it('re-reads on the background tick without UI flags, silently through a first failure', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(api.get)
        .mockResolvedValueOnce([{ id: 1, certification_name: 'First aid' }])
        .mockResolvedValueOnce({ compliance_rate: 88, total_tracked: 4, non_compliant: 1 })
        .mockResolvedValueOnce([]);
      const { result } = renderHook(() => useTrainingData());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.loading).toBe(false);
      expect(result.current.updatedAt).toBeInstanceOf(Date);
      vi.mocked(api.get)
        .mockResolvedValueOnce([{ id: 1, certification_name: 'First aid' }, { id: 2, certification_name: 'Rigging' }])
        .mockResolvedValueOnce({ compliance_rate: 90, total_tracked: 4, non_compliant: 0 })
        .mockResolvedValueOnce([]);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.certs).toHaveLength(2);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBe('');
      vi.mocked(api.get).mockRejectedValue(new Error('Down'));
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.certs).toHaveLength(2);
      expect(result.current.error).toBe('');
      expect(result.current.registerUnavailable).toBe(false);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.error).toContain('certifications');
      expect(result.current.certs).toHaveLength(2);
    } finally { vi.useRealTimers(); }
  });
});
