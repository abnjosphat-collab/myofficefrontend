import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth-context';
import { fetchOrNull } from './fetchOrNull';
import { useOperationalAlerts } from './useOperationalAlerts';

vi.mock('./fetchOrNull', () => ({ fetchOrNull: vi.fn() }));
vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('./useDashboardData', () => ({ timeAgo: (iso: string | null | undefined) => iso ?? '' }));

const fetchMock = vi.mocked(fetchOrNull);
const authMock = vi.mocked(useAuth);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReturnValue({ isAtLeast: (role: string) => role === 'manager' || role === 'admin' } as never);
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
