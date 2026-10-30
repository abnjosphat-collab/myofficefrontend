// lib/useDepartmentSwitch.ts — the Engineering | Mining register switch.
// Managers (and up) with no department limit can flip between the Engineering
// register and the Mining register; a department-limited account is pinned to
// its department and never sees the switch. The choice is remembered in
// localStorage and mirrored to ?department= so it survives reloads and shares.
// (Reads window.location directly instead of useSearchParams so pages need no
// extra Suspense boundary.)
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

export const MINING_DEPARTMENT = 'Mining';
const STORAGE_KEY = 'myoffice.department-view';

export type DepartmentView = 'Engineering' | 'Mining';

function readUrlDepartment(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('department');
}

export function useDepartmentSwitch() {
  const { department: pinnedDepartment, isAtLeast } = useAuth();
  const router = useRouter();
  const canSwitch = isAtLeast('manager') && !pinnedDepartment;
  const pinnedMining = pinnedDepartment === MINING_DEPARTMENT;

  const [view, setViewState] = useState<DepartmentView>(() => {
    if (typeof window === 'undefined') return 'Engineering';
    if (readUrlDepartment() === MINING_DEPARTMENT) return 'Mining';
    try {
      return window.localStorage.getItem(STORAGE_KEY) === MINING_DEPARTMENT ? 'Mining' : 'Engineering';
    } catch {
      return 'Engineering';
    }
  });

  // A Mining-limited account is always pinned; anyone else without manager+
  // can only ever see Engineering (the server refuses ?department= for them).
  const active: DepartmentView = pinnedMining ? 'Mining' : canSwitch ? view : 'Engineering';
  const param = pinnedDepartment ?? (active === 'Mining' ? MINING_DEPARTMENT : undefined);

  // Keep ?department= in step with the switch so the URL always says which
  // register is on screen. Pinned and switched alike carry the param, so
  // every data call is built the same way with no special-casing.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (param) params.set('department', param);
    else params.delete('department');
    if ((readUrlDepartment() ?? undefined) !== param) {
      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

  const setActive = useCallback((next: DepartmentView) => {
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode — the switch still works for this visit */ }
    setViewState(next);
  }, []);

  return { active, param, canSwitch, pinnedDepartment: pinnedDepartment ?? null, setActive };
}
