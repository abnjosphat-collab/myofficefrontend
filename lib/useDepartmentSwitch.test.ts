// lib/useDepartmentSwitch.test.ts — the Engineering | Mining register switch.
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const authState = { department: null as string | null, role: 'manager' };
vi.mock('./auth-context', () => ({
  useAuth: () => ({
    department: authState.department,
    isAtLeast: (role: string) => (role === 'manager' ? authState.role !== 'staff' && authState.role !== 'viewer' : true),
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { useDepartmentSwitch } from './useDepartmentSwitch';

beforeEach(() => {
  authState.department = null;
  authState.role = 'manager';
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('useDepartmentSwitch', () => {
  it('starts on Engineering for a manager with no department limit', () => {
    const { result } = renderHook(() => useDepartmentSwitch());
    expect(result.current.active).toBe('Engineering');
    expect(result.current.param).toBeUndefined();
    expect(result.current.canSwitch).toBe(true);
    expect(result.current.pinnedDepartment).toBeNull();
  });

  it('flips to Mining and back, sending ?department=Mining on the Mining side', () => {
    const { result } = renderHook(() => useDepartmentSwitch());
    act(() => { result.current.setActive('Mining'); });
    expect(result.current.active).toBe('Mining');
    expect(result.current.param).toBe('Mining');
    act(() => { result.current.setActive('Engineering'); });
    expect(result.current.active).toBe('Engineering');
    expect(result.current.param).toBeUndefined();
  });

  it('remembers the choice across mounts', () => {
    const first = renderHook(() => useDepartmentSwitch());
    act(() => { first.result.current.setActive('Mining'); });
    first.unmount();
    const second = renderHook(() => useDepartmentSwitch());
    expect(second.result.current.active).toBe('Mining');
  });

  it('starts on Mining when the URL already says so', () => {
    window.history.replaceState({}, '', '/?department=Mining');
    const { result } = renderHook(() => useDepartmentSwitch());
    expect(result.current.active).toBe('Mining');
    expect(result.current.param).toBe('Mining');
  });

  it('pins a Mining-limited account: no switch, param carried like a switch', () => {
    authState.department = 'Mining';
    const { result } = renderHook(() => useDepartmentSwitch());
    expect(result.current.active).toBe('Mining');
    expect(result.current.param).toBe('Mining');
    expect(result.current.canSwitch).toBe(false);
    expect(result.current.pinnedDepartment).toBe('Mining');
  });

  it('keeps a non-manager on Engineering with no switch', () => {
    authState.role = 'viewer';
    const { result } = renderHook(() => useDepartmentSwitch());
    expect(result.current.canSwitch).toBe(false);
    act(() => { result.current.setActive('Mining'); });
    expect(result.current.active).toBe('Engineering');
    expect(result.current.param).toBeUndefined();
  });
});
