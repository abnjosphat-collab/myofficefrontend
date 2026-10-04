// lib/useDebouncedValue.ts — the value after it has stopped changing for `delay` ms. Use it for search boxes that
// drive a server request, so typing a word sends one request, not one per keystroke.
'use client';

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
