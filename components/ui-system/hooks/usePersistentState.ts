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

/** Validator for a free-text "last used" value (a remembered name, place or reference). Blank stored values fall back. */
export function asString(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
}

/** One-shot localStorage read for "last used" form fields. Dialog-mounted forms only render on the client after hydration, so a synchronous read in a state initializer is safe; server-side it returns `fallback`. Corrupt, blocked or invalid data also falls back. */
export function readStored<T>(key: string, validate: (raw: unknown) => T | undefined, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return validate(JSON.parse(raw)) ?? fallback;
  } catch { return fallback; }
}

/** One-shot localStorage write to pair with {@link readStored}. Failures (private mode, quota) never throw. */
export function storeValue(key: string, value: unknown): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* non-fatal */ }
}
