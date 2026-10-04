import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { createBreakdown, insightQuery, updateBreakdown, useBreakdownInsights } from './useBreakdownsData';
import { emptyForm } from './breakdownLogic';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }, ApiError: class extends Error { status = 0; } }));

describe('insightQuery', () => {
  it('leaves out empty and "all" values, and never sends the "open" pseudo-status', () => {
    expect(insightQuery({ from: '2026-09-01', department: 'all', status: 'open', priority: 'critical', location: '' })).toBe('date_from=2026-09-01&priority=critical');
    expect(insightQuery({ status: 'resolved', type: 'electrical', machineId: 'M1' })).toBe('machine_id=M1&status=resolved&breakdown_type=electrical');
  });
});

describe('writes', () => {
  beforeEach(() => vi.resetAllMocks());
  it('sends the machine ID and nature on create and edit', async () => {
    const form = { ...emptyForm('2026-09-10'), machine_name: 'Winder', machine_id: 'W1', breakdown_nature: 'Seal leak', breakdown_description: 'Leak', artisan_name: 'Ann', location: 'Shaft' };
    await createBreakdown(form); await updateBreakdown(7, form);
    expect(api.post).toHaveBeenCalledWith('/api/breakdowns/', expect.objectContaining({ machine_id: 'W1', breakdown_nature: 'Seal leak' }));
    expect(api.patch).toHaveBeenCalledWith('/api/breakdowns/7', expect.objectContaining({ breakdown_nature: 'Seal leak' }));
  });
});

describe('useBreakdownInsights', () => {
  beforeEach(() => vi.resetAllMocks());
  it('loads, reports a failure instead of an empty result, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service down')).mockResolvedValueOnce({ success: true, summary: {} });
    const { result } = renderHook(() => useBreakdownInsights('priority=high'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.error).toBe('Service down'));
    expect(result.current.data).toBeNull();
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
  });
  it('refuses a response that says it was not successful', async () => {
    vi.mocked(api.get).mockResolvedValue({ success: false });
    const { result } = renderHook(() => useBreakdownInsights(''));
    await waitFor(() => expect(result.current.error).toMatch(/unavailable/));
  });
  it('starts from nothing when the filters change', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, n: 1 }).mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ q }) => useBreakdownInsights(q), { initialProps: { q: 'a=1' } });
    await waitFor(() => expect(result.current.data).not.toBeNull());
    rerender({ q: 'a=2' });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
