// components/app-shell/useRouteSidebarCollapsed.ts — one route's temporary claim on the sidebar: collapsed while
// the route is mounted (Documents brings its own folder tree, so the shell sidebar would be a second navigation),
// released when it unmounts. Never persisted and never fights the person: their own toggle clears it.
'use client';

import { useEffect } from 'react';
import { useAppShell } from './context';

export function useRouteSidebarCollapsed(): void {
  const { setSidebarForceCollapsed } = useAppShell();
  useEffect(() => {
    setSidebarForceCollapsed(true);
    return () => setSidebarForceCollapsed(false);
  }, [setSidebarForceCollapsed]);
}
