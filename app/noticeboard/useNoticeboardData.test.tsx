import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { archiveNotice, createNotice, deleteNotice, getAllNotices, noticesPath, togglePin, useNoticeboardData } from './useNoticeboardData';
import type { Notice, NoticeFilters, NoticeFormData } from './types';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const filters: NoticeFilters = { category: 'all', priority: 'all', status: 'all', department: 'all', is_pinned: null };
const notice = (id: string, title = 'Safety update'): Notice => ({
  id, title, content: 'Audit fixture', date: '2026-09-28', category: 'General', priority: 'Medium', status: 'Active',
  is_pinned: false, requires_acknowledgment: false, author: 'Audit User', department: 'General', expires_at: '',
  target_audience: 'All Employees', notification_type: 'General Announcement', attachments: [], created_at: '2026-09-28T08:00:00Z',
});

describe('noticesPath', () => {
  it('sends nothing for unset filters and encodes the ones that are set', () => {
    expect(noticesPath(filters, '')).toBe('/api/notices');
    expect(noticesPath({ ...filters, category: 'Safety', is_pinned: true }, '  fire drill ')).toBe('/api/notices?category=Safety&is_pinned=true&search=fire+drill');
    expect(noticesPath({ ...filters, is_pinned: false }, '')).toBe('/api/notices?is_pinned=false');
  });
});

describe('noticeboard loading', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(() => vi.useRealTimers());

  it('performs one initial request', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([notice('one')]);
    const { result } = renderHook(() => useNoticeboardData(filters, ''));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('reports a failure as an error, not an empty board, and keeps loaded notices through a failed refresh', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([notice('one')]).mockRejectedValueOnce(new Error('Service unavailable'));
    const { result } = renderHook(() => useNoticeboardData(filters, ''));
    await waitFor(() => expect(result.current.notices[0]?.id).toBe('one'));
    await act(async () => result.current.refetch());
    expect(result.current.notices[0]?.id).toBe('one');
    expect(result.current.error).toBe('Service unavailable');
  });

  it('sends one request per finished search, not one per keystroke', async () => {
    vi.mocked(api.get).mockResolvedValue([notice('x')]);
    const { result, rerender } = renderHook(({ search }) => useNoticeboardData(filters, search), { initialProps: { search: '' } });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    vi.useFakeTimers();
    for (const search of ['f', 'fi', 'fir', 'fire']) { rerender({ search }); await act(async () => { await vi.advanceTimersByTimeAsync(100); }); }
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    vi.useRealTimers();
    const urls = vi.mocked(api.get).mock.calls.map(c => c[0]);
    expect(urls).toEqual(['/api/notices', '/api/notices?search=fire']);
  });
});

describe('getAllNotices (used by the shell bell)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends the filters it is given and rejects a non-list response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([notice('a')]);
    expect(await getAllNotices({ status: 'Active' })).toHaveLength(1);
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe('/api/notices?status=Active');
    vi.mocked(api.get).mockResolvedValueOnce({ detail: 'x' });
    await expect(getAllNotices()).rejects.toThrow('unexpected response');
  });
});

describe('noticeboard writes', () => {
  beforeEach(() => vi.resetAllMocks());

  it('lets failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Forbidden'));
    await expect(createNotice({} as NoticeFormData)).rejects.toThrow('nope');
    await expect(deleteNotice('1')).rejects.toThrow('Forbidden');
  });

  it('flips the pin and archives with the right payloads', async () => {
    vi.mocked(api.patch).mockResolvedValue({});
    await togglePin('7', true);
    await archiveNotice('7');
    expect(vi.mocked(api.patch).mock.calls).toEqual([['/api/notices/7', { is_pinned: false }], ['/api/notices/7', { status: 'Archived' }]]);
  });
});
