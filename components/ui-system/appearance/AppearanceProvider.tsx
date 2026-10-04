'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, applyAppearanceToDocument, persistAppearance, type Appearance } from './appearance';
import { getAppearanceSnapshot, getServerAppearanceSnapshot, setAppearance, subscribeAppearance } from './appearanceStore';

type AppearanceContextValue = {
  appearance: Appearance;
  /** True once the stored preference has been read on the client (false during SSR / first paint). */
  ready: boolean;
  update: (patch: Partial<Omit<Appearance, 'version'>>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: DEFAULT_APPEARANCE,
  ready: false,
  update: () => {},
  reset: () => {},
});

const noopSubscribe = () => () => {};

/**
 * Owns the shared appearance record. Mount once at the root (components/Providers.tsx).
 * The pre-paint bootstrap has already applied the saved values; this provider keeps
 * <html> in sync, migrates legacy sources into the shared key once, and follows other tabs.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearanceSnapshot, getServerAppearanceSnapshot);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    applyAppearanceToDocument(appearance);
    // One-time migration: if only legacy sources existed, write the shared record.
    try {
      if (window.localStorage.getItem(APPEARANCE_KEY) === null) persistAppearance(window.localStorage, appearance);
    } catch { /* storage unavailable: appearance still applies for this session */ }
  }, [appearance]);

  const update = useCallback((patch: Partial<Omit<Appearance, 'version'>>) => setAppearance({ ...getAppearanceSnapshot(), ...patch }), []);
  const reset = useCallback(() => setAppearance({ ...DEFAULT_APPEARANCE }), []);

  const value = useMemo(() => ({ appearance, ready, update, reset }), [appearance, ready, update, reset]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
