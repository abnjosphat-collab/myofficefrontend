'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Per-device preference (view mode, sidebar collapsed, sort…) persisted to localStorage.
 *
 * - `validate` receives whatever was stored and must return a valid value or `undefined`;
 *   corrupt or outdated data silently falls back to `initial`.
 * - Reads on mount (SSR-safe: the first render always uses `initial`).
 * - Storage failures (private mode, quota) never throw.
 * - Do NOT use for typeface / text size — that is the shared Appearance record.
 */
export function usePersistentState<T>(key: string, initial: T, validate: (raw: unknown) => T | undefined): [T, (next: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const validateRef = useRef(validate);
  useEffect(() => { validateRef.current = validate; });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = validateRef.current(JSON.parse(raw));
        if (parsed !== undefined) setValue(parsed);
      }
    } catch { /* corrupt JSON or blocked storage: keep the initial value */ }
    setReady(true);
  }, [key]);

  const update = useCallback((next: T) => {
    setValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* non-fatal */ }
  }, [key]);

  return [value, update, ready];
}

/** Validator for a closed set of string choices. */
export function oneOf<T extends string>(choices: readonly T[]) {
  return (raw: unknown): T | undefined => (typeof raw === 'string' && (choices as readonly string[]).includes(raw) ? (raw as T) : undefined);
}
