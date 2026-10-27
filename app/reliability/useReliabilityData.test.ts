import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllPages } from '@/lib/paged';
import { useReliabilityData } from './useReliabilityData';

vi.mock('@/lib/paged', () => ({ getAllPages: vi.fn(), unwrapRows: (x: unknown) => x }));

describe('useReliabilityData background refresh', () => {
  beforeEach(() => vi.resetAllMocks());

  it('re-reads on the background tick without flipping loading, silently through a first failure', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(getAllPages).mockResolvedValueOnce([{ equipment_name: 'Pump A' }]);
      const { result } = renderHook(() => useReliabilityData());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.loaded).toBe(true);
      expect(result.current.recordCount).toBe(1);
      vi.mocked(getAllPages).mockResolvedValue([{ equipment_name: 'Pump A' }, { equipment_name: 'Pump B' }]);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.recordCount).toBe(2);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      vi.mocked(getAllPages).mockRejectedValue(new Error('Down'));
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.recordCount).toBe(2);
      expect(result.current.error).toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(result.current.error).toBe('Down');
      expect(result.current.recordCount).toBe(2);
    } finally { vi.useRealTimers(); }
  });
});
