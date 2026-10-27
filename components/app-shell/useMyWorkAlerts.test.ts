import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth-context';
import { fetchOrNull } from './fetchOrNull';
import { buildMyWorkItems, myIdentities, normPerson, useMyWorkAlerts, type MyWorkRow } from './useMyWorkAlerts';

vi.mock('./fetchOrNull', () => ({ fetchOrNull: vi.fn() }));
vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));

const fetchMock = vi.mocked(fetchOrNull);
const authMock = vi.mocked(useAuth);

const row = (over: Partial<MyWorkRow> & { id: number | string }): MyWorkRow => ({
  work_order_number: `WO-${over.id}`, equipment_info: 'Pump A', status: 'pending',
  due_date: '2099-01-01', allocated_to: 'Alex Moyo', date_raised: '2026-10-20',
  ...over,
});

describe('normPerson and myIdentities', () => {
  it('collapses spacing and case so "Alex  Moyo" meets "alex moyo"', () => {
    expect(normPerson('Alex  Moyo')).toBe('alex moyo');
    expect(normPerson(null)).toBe('');
    expect(normPerson(undefined)).toBe('');
  });

  it('identifies the caller by name and full email, dropping blanks', () => {
    expect(myIdentities('Alex Moyo', 'alex@mine.test')).toEqual(new Set(['alex moyo', 'alex@mine.test']));
    expect(myIdentities(null, null)).toEqual(new Set());
  });
});

describe('buildMyWorkItems', () => {
  const me = new Set(['alex moyo']);

  it('keeps only open jobs allocated to the caller', () => {
    const { items, total, shown } = buildMyWorkItems([
      row({ id: 1 }),
      row({ id: 2, allocated_to: 'Lee Jones', artisan_name: 'Alex Moyo' }),
      row({ id: 3, allocated_to: 'Lee Jones', artisan_name: '' }),
      row({ id: 4, allocated_to: 'Alex' }),
      row({ id: 5, status: 'completed' }),
      row({ id: 6, status: 'cancelled' }),
      row({ id: 7, status: 'not-done' }),
    ], me);
    expect(items.map(i => i.id)).toEqual(['wo-mine-1', 'wo-mine-2']);
    expect(total).toBe(2);
    expect(shown).toBe(2);
  });

  it('keeps the server answer when the caller has no identity yet', () => {
    const { items, total } = buildMyWorkItems([row({ id: 1 }), row({ id: 3, allocated_to: 'Lee Jones' })], new Set());
    expect(items.map(i => i.id)).toEqual(['wo-mine-1', 'wo-mine-3']);
    expect(total).toBe(2);
  });

  it('marks an overdue job critical and a future one pending', () => {
    const { items } = buildMyWorkItems([
      row({ id: 1, due_date: '2020-01-01' }),
      row({ id: 2, due_date: '2099-01-01' }),
    ], me);
    expect(items[0]).toMatchObject({ status: 'critical', href: '/maintenance?open=1', group: 'mywork' });
    expect(items[0].action).toContain('Your work order is overdue');
    expect(items[1]).toMatchObject({ status: 'pending', href: '/maintenance?open=2', group: 'mywork' });
    expect(items[1].action).toContain('Work order assigned to you');
  });

  it('shows five at most but counts the whole backlog', () => {
    const rows = Array.from({ length: 7 }, (_, i) => row({ id: i + 1 }));
    const { items, total, shown } = buildMyWorkItems(rows, me);
    expect(total).toBe(7);
    expect(items).toHaveLength(5);
    expect(shown).toBe(5);
  });

  it('counts a dateless job in the backlog but drops it from the slice', () => {
    const rows = [row({ id: 1 }), row({ id: 2, due_date: null, date_raised: null, created_at: null })];
    const { items, total, shown } = buildMyWorkItems(rows, me);
    expect(total).toBe(2);
    expect(items.map(i => i.id)).toEqual(['wo-mine-1']);
    expect(shown).toBe(1);
  });

  it('reads a non-list answer as an empty backlog', () => {
    expect(buildMyWorkItems(null, me)).toEqual({ items: [], total: 0, shown: 0 });
    expect(buildMyWorkItems({}, me)).toEqual({ items: [], total: 0, shown: 0 });
  });
});

describe('useMyWorkAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockReturnValue({ user: null, profile: null, loading: false } as never);
    fetchMock.mockResolvedValue([]);
  });

  it('fetches nothing until someone is signed in', async () => {
    const { result } = renderHook(() => useMyWorkAlerts());
    expect(result.current.alerts).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads the signed-in person\'s jobs from the mine slice', async () => {
    authMock.mockReturnValue({
      user: { email: 'alex@mine.test', user_metadata: {} }, profile: { full_name: 'Alex Moyo' }, loading: false,
    } as never);
    fetchMock.mockResolvedValue([row({ id: 1 }), row({ id: 2, allocated_to: 'Lee Jones' })]);
    const { result } = renderHook(() => useMyWorkAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/maintenance/work-orders?mine=true');
    expect(result.current.alerts.map(a => a.id)).toEqual(['wo-mine-1']);
    expect(result.current.total).toEqual({ total: 1, shown: 1 });
    expect(result.current.failed).toBe(false);
    expect(result.current.sources).toEqual([{ source: 'mywork', label: 'Assigned to me', ok: true }]);
  });

  it('reports a failed load as failed, with a retry that refires', async () => {
    authMock.mockReturnValue({
      user: { email: 'alex@mine.test', user_metadata: {} }, profile: { full_name: 'Alex Moyo' }, loading: false,
    } as never);
    fetchMock.mockResolvedValue(null);
    const { result } = renderHook(() => useMyWorkAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
    expect(result.current.sources).toEqual([{ source: 'mywork', label: 'Assigned to me', ok: false }]);
    fetchMock.mockResolvedValue([row({ id: 1 })]);
    await act(async () => { await result.current.reloadSource(); });
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(result.current.alerts.map(a => a.id)).toEqual(['wo-mine-1']);
  });
});
