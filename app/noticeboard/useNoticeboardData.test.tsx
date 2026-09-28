import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { useNoticeboardData } from './useNoticeboardData';
import type { Notice, NoticeFilters } from './types';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const filters: NoticeFilters = { category: 'all', priority: 'all', status: 'all', department: 'all', is_pinned: null };
const notice = (id: string, title = 'Safety update'): Notice => ({
  id, title, content: 'Audit fixture', date: '2026-09-28', category: 'General', priority: 'Medium', status: 'Active',
  is_pinned: false, requires_acknowledgment: false, author: 'Audit User', department: 'General', expires_at: '',
  target_audience: 'All Employees', notification_type: 'General Announcement', attachments: [], created_at: '2026-09-28T08:00:00Z',
});

describe('noticeboard loading', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('performs one initial request', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([notice('one')]);
    renderHook(() => useNoticeboardData(filters, ''));
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('preserves loaded notices when a quiet refresh fails', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([notice('one')]).mockRejectedValueOnce(new Error('Service unavailable'));
    const { result } = renderHook(() => useNoticeboardData(filters, ''));
    await act(async () => { await vi.runAllTimersAsync(); });
    await act(async () => { await result.current.refresh(true); });
    expect(result.current.data[0]?.id).toBe('one');
    expect(result.current.loadError).toBe('Service unavailable');
  });

  it('ignores a slower response from an older search', async () => {
    let resolveOlder: (value: Notice[]) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOlder = resolve; }))
      .mockResolvedValueOnce([notice('current', 'Current result')]);
    const { result, rerender } = renderHook(({ search }) => useNoticeboardData(filters, search), { initialProps: { search: 'old' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    rerender({ search: 'current' });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.data[0]?.id).toBe('current');
    await act(async () => { resolveOlder([notice('older')]); });
    expect(result.current.data[0]?.id).toBe('current');
  });
});
