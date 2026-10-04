'use client';

import { useSyncExternalStore } from 'react';

/** Subscribe to a CSS media query. Server and first client render use `serverValue`, so hydration never mismatches. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    notify => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** The persistent sidebar layout. 821px and up, the same breakpoint Tools uses to turn its sidebar into a strip. */
export const DESKTOP_QUERY = '(min-width: 821px)';
