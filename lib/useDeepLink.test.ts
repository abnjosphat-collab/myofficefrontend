import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { readStatusParam, useDeepLink } from './useDeepLink';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/leaves',
  useRouter: () => ({ replace }),
}));

describe('useDeepLink', () => {
  it('reads the id and flags once', () => {
    search = 'open=42&sign=approve';
    const { result, rerender } = renderHook(() => useDeepLink({ flags: ['sign'] }));
    expect(result.current.value).toBe('42');
    expect(result.current.flags).toEqual({ sign: 'approve' });
    rerender();
    expect(result.current.value).toBe('42');
  });

  it('treats a missing or empty param as no link', () => {
    search = 'q=ann';
    expect(renderHook(() => useDeepLink()).result.current.value).toBeNull();
    search = 'open=';
    expect(renderHook(() => useDeepLink()).result.current.value).toBeNull();
  });

  it('consume strips only the link params and never refires', () => {
    search = 'q=ann&open=42&sign=approve';
    replace.mockClear();
    const { result, rerender } = renderHook(() => useDeepLink({ flags: ['sign'] }));
    act(() => { result.current.consume(); });
    expect(replace).toHaveBeenCalledWith('/leaves?q=ann', { scroll: false });
    rerender();
    expect(result.current.value).toBeNull();
    expect(result.current.flags).toEqual({ sign: null });
    act(() => { result.current.consume(); });
    expect(replace).toHaveBeenCalledTimes(1);
  });
});

describe('readStatusParam', () => {
  it('returns the status only when it is one of the valid values', () => {
    window.history.replaceState({}, '', '/leaves?status=pending');
    expect(readStatusParam(['all', 'pending', 'approved', 'rejected'])).toBe('pending');
    window.history.replaceState({}, '', '/leaves?status=bogus');
    expect(readStatusParam(['all', 'pending', 'approved', 'rejected'])).toBeNull();
    window.history.replaceState({}, '', '/leaves');
    expect(readStatusParam(['all', 'pending', 'approved', 'rejected'])).toBeNull();
    window.history.replaceState({}, '', '/');
  });
});
