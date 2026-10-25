import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardData } from './useDashboardData';
import { useOperationalAlerts } from './useOperationalAlerts';
import { useNoticeAlerts } from './useNoticeAlerts';
import { useNotifications, type Notification } from './useNotifications';

vi.mock('./useDashboardData', () => ({ useDashboardData: vi.fn() }));
vi.mock('./useOperationalAlerts', () => ({
  useOperationalAlerts: vi.fn(),
  OP_GROUPS: ['pw', 'leave', 'overtime', 'sheq', 'workorders', 'tasks'],
}));
vi.mock('./useNoticeAlerts', () => ({ useNoticeAlerts: vi.fn() }));

const dashMock = vi.mocked(useDashboardData);
const opMock = vi.mocked(useOperationalAlerts);
const noticeMock = vi.mocked(useNoticeAlerts);
const reloadDash = vi.fn();
const reloadOp = vi.fn();
const reloadNotices = vi.fn();

const item = (id: string, group: Notification['group']) => ({
  id, group, action: id, module: 'M', icon: (() => null) as never,
  time: '', timestamp: 1, status: 'normal' as const, href: '/x',
});

const OP_TOTALS = {
  pw: { total: 1, shown: 1 }, leave: { total: 7, shown: 5 }, overtime: { total: 0, shown: 0 },
  sheq: { total: 2, shown: 2 }, workorders: { total: 0, shown: 0 }, tasks: { total: 3, shown: 3 },
  feedback: { total: 0, shown: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  dashMock.mockReturnValue({
    stats: { employeeCount: null, activeWorkOrders: null, equipmentAvailablePct: null, openBreakdowns: null },
    activity: [item('wo-1', 'activity')], loading: false, activityFailed: false,
    sources: [
      { source: 'activity-workorders', label: 'Work order activity', ok: true },
      { source: 'activity-breakdowns', label: 'Breakdown activity', ok: false },
    ],
    reloadSource: reloadDash,
  });
  opMock.mockReturnValue({
    alerts: [item('leave-1', 'leave'), item('leave-2', 'leave')], loading: false, failed: false, totals: OP_TOTALS,
    sources: [
      { source: 'leave', label: 'Leave approvals', ok: true },
      { source: 'overtime', label: 'Overtime approvals', ok: false },
    ],
    reloadSource: reloadOp,
  });
  noticeMock.mockReturnValue({
    notices: [], alerts: [item('notice-1', 'notices')], loading: false, failed: false,
    sources: [{ source: 'notices', label: 'Notices', ok: true }], reload: reloadNotices,
  });
});

describe('useNotifications totals and merge (U3.2)', () => {
  it('merges backlog totals with the unsliced notice count', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.totals.leave).toEqual({ total: 7, shown: 5 });
    expect(result.current.totals.sheq).toEqual({ total: 2, shown: 2 });
    expect(result.current.totals.notices).toEqual({ total: 1, shown: 1 });
  });

  it('orders approvals first, then notices, then activity', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications.map(n => n.id)).toEqual(['leave-1', 'leave-2', 'notice-1', 'wo-1']);
  });

  it('marks one row read on click and all on mark-all', async () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.unreadCount).toBe(4);
    act(() => { result.current.markRead(['leave-1']); });
    await waitFor(() => expect(result.current.unreadCount).toBe(3));
    expect(result.current.notifications.find(n => n.id === 'leave-1')?.unread).toBe(false);
    act(() => { result.current.markAllRead(); });
    await waitFor(() => expect(result.current.unreadCount).toBe(0));
  });
});

describe('useNotifications failures and retry (U3.3)', () => {
  it('merges failed sources in feed order', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.failedSources).toEqual([
      { source: 'overtime', label: 'Overtime approvals', ok: false },
      { source: 'activity-breakdowns', label: 'Breakdown activity', ok: false },
    ]);
  });

  it('routes each retry to the hook that owns the source', () => {
    const { result } = renderHook(() => useNotifications());
    result.current.retry('overtime');
    result.current.retry('notices');
    result.current.retry('activity-breakdowns');
    expect(reloadOp).toHaveBeenCalledWith('overtime');
    expect(reloadNotices).toHaveBeenCalledTimes(1);
    expect(reloadDash).toHaveBeenCalledWith('activity-breakdowns');
  });

  it('ignores an unknown source key', () => {
    const { result } = renderHook(() => useNotifications());
    result.current.retry('bogus');
    expect(reloadOp).not.toHaveBeenCalled();
    expect(reloadDash).not.toHaveBeenCalled();
    expect(reloadNotices).not.toHaveBeenCalled();
  });
});
