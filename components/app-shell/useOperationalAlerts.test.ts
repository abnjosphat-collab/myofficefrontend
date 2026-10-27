import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth-context';
import { fetchRemoteEvents, type EnrichedUsageEvent } from '@/lib/usage';
import { fetchOrNull } from './fetchOrNull';
import { useOperationalAlerts } from './useOperationalAlerts';

vi.mock('./fetchOrNull', () => ({ fetchOrNull: vi.fn() }));
vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('./useDashboardData', () => ({ timeAgo: (iso: string | null | undefined) => iso ?? '' }));
vi.mock('@/lib/usage', () => ({ fetchRemoteEvents: vi.fn() }));

const fetchMock = vi.mocked(fetchOrNull);
const authMock = vi.mocked(useAuth);
const remoteMock = vi.mocked(fetchRemoteEvents);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' || role === 'admin' } as never);
  remoteMock.mockResolvedValue([]);
  fetchMock.mockImplementation((async (url: string) => {
    if (url.includes('/password-reset-requests')) {
      return [{ id: 'r1', identifier: 'a@x.com', created_at: '2026-10-17T10:00:00Z' }];
    }
    return [];
  }) as never);
});

describe('useOperationalAlerts password requests', () => {
  it('surfaces pending reset asks to an admin', async () => {
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const item = result.current.alerts.find(a => a.id === 'pw-r1');
    expect(item?.action).toBe('Password reset requested — a@x.com');
    expect(item?.module).toBe('Users');
    expect(item?.status).toBe('pending');
    expect(result.current.failed).toBe(false);
  });

  it('does not fetch reset asks for a manager', async () => {
    authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' } as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/password-reset-requests'))).toBe(false);
    expect(result.current.alerts.some(a => a.id.startsWith('pw-'))).toBe(false);
    expect(result.current.failed).toBe(false);
  });
});

describe('useOperationalAlerts link map (U3.1)', () => {
  it('gives every alert id-prefix its destination href', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      const u = String(url);
      if (u.includes('/password-reset-requests')) return [{ id: 'r1', identifier: 'a@x.com', created_at: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/leaves')) return [{ id: 11, employee_name: 'Ann', leave_type: 'annual', total_days: 2, applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/overtime')) return [{ id: 22, employee_name: 'Bob', date: '2026-10-18', applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/sheq')) return [{ id: 33, status: 'open', title: 'Guard rail', date: '2026-10-17' }];
      if (u.includes('/api/maintenance/work-orders')) return [{ id: 44, work_order_number: 'WO-1', due_date: '2020-01-01', requested_by: 'Cy' }];
      if (u.includes('/api/tasks-events')) return [{ id: 55, task_type: 'Task', title: 'Fix pump', due_date: '2020-01-01', responsible_people: ['Dan'] }];
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const hrefOf = (id: string) => result.current.alerts.find(a => a.id === id)?.href;
    expect(hrefOf('pw-r1')).toBe('/admin');
    expect(hrefOf('leave-11')).toBe('/leaves?open=11&sign=approve');
    expect(hrefOf('ot-22')).toBe('/overtime?open=22&sign=approve');
    expect(hrefOf('sheq-33')).toBe('/sheq_inspection?open=33');
    expect(hrefOf('wo-overdue-44')).toBe('/maintenance?open=44');
    expect(hrefOf('te-overdue-55')).toBe('/tasks-events?open=55');
  });

  it('labels only the approval items as "Review and sign"', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      const u = String(url);
      if (u.includes('/api/leaves')) return [{ id: 11, employee_name: 'Ann', leave_type: 'annual', total_days: 2, applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/overtime')) return [{ id: 22, employee_name: 'Bob', date: '2026-10-18', applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/sheq')) return [{ id: 33, status: 'open', title: 'Guard rail', date: '2026-10-17' }];
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const labelOf = (id: string) => result.current.alerts.find(a => a.id === id)?.actionLabel;
    expect(labelOf('leave-11')).toBe('Review and sign');
    expect(labelOf('ot-22')).toBe('Review and sign');
    expect(labelOf('sheq-33')).toBeUndefined();
  });
});

describe('useOperationalAlerts totals and groups (U3.2)', () => {
  it('counts the backlog behind each slice', async () => {
    const leaves = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1, employee_name: `E${i}`, leave_type: 'annual', total_days: 1, applied_date: '2026-10-17T10:00:00Z',
    }));
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/leaves')) return leaves;
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals.leave).toEqual({ total: 7, shown: 5 });
    expect(result.current.alerts.filter(a => a.id.startsWith('leave-'))).toHaveLength(5);
    expect(result.current.totals.overtime).toEqual({ total: 0, shown: 0 });
  });

  it('reports a failed source as an empty backlog with failed set', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/leaves')) return null;
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
    expect(result.current.totals.leave).toEqual({ total: 0, shown: 0 });
  });

  it('counts a dateless item in its total but not in shown', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/leaves')) return [{ id: 1, employee_name: 'Ann', leave_type: 'annual', total_days: 1 }];
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals.leave).toEqual({ total: 1, shown: 0 });
    expect(result.current.alerts.some(a => a.id === 'leave-1')).toBe(false);
  });

  it('tags every alert with its bell group', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      const u = String(url);
      if (u.includes('/password-reset-requests')) return [{ id: 'r1', identifier: 'a@x.com', created_at: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/leaves')) return [{ id: 11, employee_name: 'Ann', leave_type: 'annual', total_days: 2, applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/overtime')) return [{ id: 22, employee_name: 'Bob', date: '2026-10-18', applied_date: '2026-10-17T10:00:00Z' }];
      if (u.includes('/api/sheq')) return [{ id: 33, status: 'open', title: 'Guard rail', date: '2026-10-17' }];
      if (u.includes('/api/maintenance/work-orders')) return [{ id: 44, work_order_number: 'WO-1', due_date: '2020-01-01', requested_by: 'Cy' }];
      if (u.includes('/api/tasks-events')) return [{ id: 55, task_type: 'Task', title: 'Fix pump', due_date: '2020-01-01', responsible_people: ['Dan'] }];
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const groupOf = (id: string) => result.current.alerts.find(a => a.id === id)?.group;
    expect(groupOf('pw-r1')).toBe('pw');
    expect(groupOf('leave-11')).toBe('leave');
    expect(groupOf('ot-22')).toBe('overtime');
    expect(groupOf('sheq-33')).toBe('sheq');
    expect(groupOf('wo-overdue-44')).toBe('workorders');
    expect(groupOf('te-overdue-55')).toBe('tasks');
  });
});

describe('useOperationalAlerts sources and retry (U3.3)', () => {
  it('lists all eight sources as asked for an admin', async () => {
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sources).toEqual([
      { source: 'pw', label: 'Password resets', ok: true },
      { source: 'leave', label: 'Leave approvals', ok: true },
      { source: 'overtime', label: 'Overtime approvals', ok: true },
      { source: 'sheq', label: 'SHEQ follow-ups', ok: true },
      { source: 'workorders', label: 'Overdue work orders', ok: true },
      { source: 'signoff', label: 'Waiting for sign-off', ok: true },
      { source: 'tasks', label: 'Overdue tasks', ok: true },
      { source: 'feedback', label: 'Feedback', ok: true },
    ]);
  });

  it('omits the unasked password source for a manager, without an error', async () => {
    authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' } as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sources.map(s => s.source)).toEqual(['leave', 'overtime', 'sheq', 'workorders', 'signoff', 'tasks']);
    expect(result.current.failed).toBe(false);
  });

  it('marks a failed source not-ok', async () => {
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/overtime')) return null;
      if (String(url).includes('/password-reset-requests')) return [];
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failed).toBe(true);
    expect(result.current.sources.find(s => s.source === 'overtime')).toEqual(
      { source: 'overtime', label: 'Overtime approvals', ok: false },
    );
  });

  it('reloadSource re-fires only that source and picks up its rows', async () => {
    let overtimeAnswer: unknown = [];
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/overtime')) return overtimeAnswer;
      return [];
    }) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsFor = (part: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(part)).length;
    expect(callsFor('/api/overtime')).toBe(1);
    overtimeAnswer = [{ id: 22, employee_name: 'Bob', date: '2026-10-18', applied_date: '2026-10-17T10:00:00Z' }];
    await act(async () => { await result.current.reloadSource('overtime'); });
    await waitFor(() => expect(result.current.alerts.some(a => a.id === 'ot-22')).toBe(true));
    expect(callsFor('/api/overtime')).toBe(2);
    expect(callsFor('/api/leaves')).toBe(1);
    expect(result.current.totals.overtime).toEqual({ total: 1, shown: 1 });
  });

  it('a retry that fails again keeps the old rows and still names the source', async () => {
    fetchMock.mockImplementation((async () => []) as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    fetchMock.mockImplementation((async (url: string) => {
      if (String(url).includes('/api/leaves')) return null;
      return [];
    }) as never);
    await act(async () => { await result.current.reloadSource('leave'); });
    await waitFor(() => expect(result.current.sources.find(s => s.source === 'leave')?.ok).toBe(false));
    expect(result.current.failed).toBe(true);
  });

  it('reloading an unasked source fetches nothing', async () => {
    authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' } as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    fetchMock.mockClear();
    await act(async () => { await result.current.reloadSource('pw'); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useOperationalAlerts feedback', () => {
  const twoAccounts: EnrichedUsageEvent[] = [
    { type: 'feedback', ts: new Date('2026-10-24T10:00:00Z').getTime(), page: '/ppe', rating: 5, text: 'Love it', sessionId: 's1', userEmail: 'a@x.com', anonymous: false },
    { type: 'feedback', ts: new Date('2026-10-23T10:00:00Z').getTime(), page: '/overtime', rating: 0, text: 'Confusing', sessionId: 's2', userEmail: 'b@x.com', anonymous: false },
    { type: 'page_view', ts: new Date('2026-10-24T10:00:00Z').getTime(), path: '/x', sessionId: 's1', userEmail: 'a@x.com', anonymous: false },
  ];

  it('surfaces recent feedback from every account to an admin', async () => {
    remoteMock.mockResolvedValue(twoAccounts);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const items = result.current.alerts.filter(a => a.group === 'feedback');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ module: 'Feedback', status: 'pending', href: '/usage-analyzer#feedback', user: 'a@x.com' });
    expect(result.current.totals.feedback).toEqual({ total: 2, shown: 2 });
    expect(result.current.failed).toBe(false);
  });

  it('does not fetch feedback for a manager', async () => {
    authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' } as never);
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(remoteMock).not.toHaveBeenCalled();
    expect(result.current.alerts.some(a => a.group === 'feedback')).toBe(false);
    expect(result.current.sources.map(s => s.source)).not.toContain('feedback');
  });
});
describe('useOperationalAlerts sign-off and overdue slices (M8)', () => {
  // The two work-order URLs share a prefix; the slice flags tell them apart.
  const bySlice = (overdue: unknown[], signoff: unknown[]) =>
    (async (url: string) => {
      const u = String(url);
      if (u.includes('awaiting_signoff=true')) return signoff;
      if (u.includes('overdue=true')) return overdue;
      return [];
    });

  it('surfaces completed-but-unsigned jobs as sign-off alerts', async () => {
    fetchMock.mockImplementation(bySlice([], [
      { id: 44, work_order_number: 'WO-1', status: 'completed', foreman_sign: '', completed_at: '2026-10-25T10:00:00Z' },
      { id: 45, work_order_number: 'WO-2', status: 'completed', foreman_sign: 'data:image/png,AAA', completed_at: '2026-10-25T10:00:00Z' },
      { id: 46, work_order_number: 'WO-3', status: 'pending', foreman_sign: '', date_raised: '2026-10-25' },
    ]));
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const item = result.current.alerts.find(a => a.id === 'wo-signoff-44');
    expect(item?.action).toBe('Work order waiting for sign-off — #WO-1');
    expect(item?.group).toBe('signoff');
    expect(item?.href).toBe('/maintenance?open=44');
    expect(item?.status).toBe('pending');
    expect(result.current.alerts.some(a => a.id === 'wo-signoff-45')).toBe(false);
    expect(result.current.alerts.some(a => a.id === 'wo-signoff-46')).toBe(false);
    expect(result.current.totals.signoff).toEqual({ total: 1, shown: 1 });
    expect(result.current.failed).toBe(false);
  });

  it('keeps terminal jobs out of the overdue slice but counts postponed ones', async () => {
    fetchMock.mockImplementation(bySlice([
      { id: 1, work_order_number: 'WO-1', status: 'completed', due_date: '2020-01-01' },
      { id: 2, work_order_number: 'WO-2', status: 'cancelled', due_date: '2020-01-01' },
      { id: 3, work_order_number: 'WO-3', status: 'not-done', due_date: '2020-01-01' },
      { id: 4, work_order_number: 'WO-4', status: 'postponed', due_date: '2020-01-01' },
      { id: 5, work_order_number: 'WO-5', status: 'pending' },
    ], []));
    const { result } = renderHook(() => useOperationalAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals.workorders).toEqual({ total: 1, shown: 1 });
    expect(result.current.alerts.find(a => a.id === 'wo-overdue-4')?.status).toBe('critical');
  });
});
