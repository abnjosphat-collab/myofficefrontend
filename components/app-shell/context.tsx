// components/app-shell/context.tsx — exposes AppShell's state (favorites, quick
// actions, search query, sidebar state) to page content nested inside <AppShell>,
// so pages like the homepage's module grid don't need to re-derive their own copy.
'use client';

import { createContext, useContext } from 'react';
import type { AppShellState } from './useAppShellState';

export const AppShellContext = createContext<AppShellState | null>(null);

export function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell() must be called from within <AppShell>');
  return ctx;
}
