'use client';

import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query. Server and first client render use `serverValue`, so hydration never mismatches.
 * Environments without matchMedia (tests that do not mock it) also read `serverValue`; tests that care mock
 * matchMedia and observe the real value.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    notify => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

/** The persistent sidebar layout. 821px and up, the same breakpoint Tools uses to turn its sidebar into a strip. */
export const DESKTOP_QUERY = '(min-width: 821px)';
