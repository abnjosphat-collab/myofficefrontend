// lib/useDeepLink.ts — read a `?open=<id>` deep link (plus flag params like
// `sign`) once on mount, then consume it so refresh never reopens the dialog.
// Callers must render under <Suspense> (Next requires it for useSearchParams).
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

export function useDeepLink({ param = 'open', flags = [] as string[] }: { param?: string; flags?: string[] } = {}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const consumedRef = useRef(false);
  const [consumed, setConsumed] = useState(false);
  const raw = params?.get(param)?.trim() ?? '';
  const value = !consumed && raw !== '' ? raw : null;
  const flagValues: Record<string, string | null> = {};
  for (const f of flags) {
    const v = params?.get(f)?.trim() ?? '';
    flagValues[f] = !consumed && v !== '' ? v : null;
  }
  // Plain function (no useCallback): the React Compiler owns memoization, and a
  // stale closure is harmless — the ref guard makes consume idempotent.
  const consume = () => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    setConsumed(true);
    const next = new URLSearchParams(params?.toString() ?? '');
    next.delete(param);
    for (const f of flags) next.delete(f);
    const qs = next.toString();
    const target = qs === '' ? pathname : `${pathname}?${qs}`;
    // Strip the URL directly first: router.replace can throw before Next's
    // router initialises (fast local resolution beats hydration), and a
    // failed strip would let refresh reopen the link. The replace call then
    // syncs Next's own cache; if it throws, the URL is already clean and
    // Next re-reads it on the next navigation.
    window.history.replaceState(null, '', target);
    try {
      router.replace(target, { scroll: false });
    } catch {
      /* URL already stripped above. */
    }
  };
  return { value, flags: flagValues, consume };
}

/**
 * Read `?status=` once for a page's mount effect (not render: SSR has no
 * window, so a useState initializer would hydrate differently on the client).
 * Returns the value only when it is one of `valid`, else null (keep default).
 */
export function readStatusParam(valid: readonly string[]): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('status')?.trim() ?? '';
  return raw !== '' && valid.includes(raw) ? raw : null;
}
