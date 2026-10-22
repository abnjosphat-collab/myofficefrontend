import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOrNull } from './fetchOrNull';
import { useDashboardData } from './useDashboardData';

vi.mock('./fetchOrNull', () => ({ fetchOrNull: vi.fn() }));

const fetchMock = vi.mocked(fetchOrNull);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockImplementation((async (url: string) => {
    const u = String(url);
    if (u.includes('/api/maintenance/work-orders?limit=6')) {
      return [{ id: 7, work_order_number: 'WO-7', job_request_details: 'Fix belt', created_at: '2026-10-17T10:00:00Z', status: 'pending', requested_by: 'Ann' }];
    }
    if (u.includes('/api/breakdowns/get-breakdowns')) {
      return [{ id: 9, machine_name: 'Pump 3', created_at: '2026-10-17T10:00:00Z', priority: 'high', artisan_name: 'Bob' }];
    }
    if (u.includes('/api/employees')) return [];
    if (u.includes('/summary')) return { pending: 0, in_progress: 0 };
    if (u.includes('/api/equipment')) return [];
    if (u.includes('/overview')) return { metrics: {} };
    return [];
  }) as never);
});

describe('useDashboardData activity link map (U3.1)', () => {
  it('links work-order and breakdown activity to their records', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const hrefOf = (id: string) => result.current.activity.find(a => a.id === id)?.href;
    expect(hrefOf('wo-7')).toBe('/maintenance?open=7');
    expect(hrefOf('bd-9')).toBe('/breakdowns?open=9');
    expect(result.current.activityFailed).toBe(false);
  });
});

describe('useDashboardData sources and retry (U3.3)', () => {
  const mockFeeds = (bd: () => unknown) => fetchMock.mockImplementation((async (url: string) => {
    const u = String(url);
    if (u.includes('/api/maintenance/work-orders?limit=6')) {
      return [{ id: 7, work_order_number: 'WO-7', job_request_details: 'Fix belt', created_at: '2026-10-17T10:00:00Z', status: 'pending', requested_by: 'Ann' }];
    }
    if (u.includes('/api/breakdowns/get-breakdowns')) return bd();
    if (u.includes('/api/employees')) return [];
    if (u.includes('/summary')) return { pending: 0, in_progress: 0 };
    if (u.includes('/api/equipment')) return [];
    if (u.includes('/overview')) return { metrics: {} };
    return [];
  }) as never);

  it('reports the two bell-feeding endpoints', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sources).toEqual([
      { source: 'activity-workorders', label: 'Work order activity', ok: true },
      { source: 'activity-breakdowns', label: 'Breakdown activity', ok: true },
    ]);
  });

  it('names the failed feed when breakdowns cannot be read', async () => {
    mockFeeds(() => null);
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activityFailed).toBe(true);
    expect(result.current.sources[1]).toEqual({ source: 'activity-breakdowns', label: 'Breakdown activity', ok: false });
    expect(result.current.activity.some(a => a.id === 'bd-9')).toBe(false);
  });

  it('reloadSource re-fires only that feed and keeps the other answers', async () => {
    const box: { bd: unknown } = { bd: null };
    mockFeeds(() => box.bd);
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsFor = (part: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(part)).length;
    box.bd = [{ id: 9, machine_name: 'Pump 3', created_at: '2026-10-17T10:00:00Z', priority: 'high', artisan_name: 'Bob' }];
    await act(async () => { await result.current.reloadSource('activity-breakdowns'); });
    await waitFor(() => expect(result.current.activity.some(a => a.id === 'bd-9')).toBe(true));
    expect(callsFor('/api/breakdowns/get-breakdowns')).toBe(2);
    expect(callsFor('/api/maintenance/work-orders?limit=6')).toBe(1);
    expect(callsFor('/api/employees')).toBe(1);
    expect(result.current.activityFailed).toBe(false);
  });
});
