// components/app-shell/fetchOrNull.ts — the shell's background reads (homepage figures, activity feed, operational
// alerts). It waits out a slow or waking service (up to a minute and a half), attaches the session token when there
// is one (harmless on open endpoints, required on gated ones), and returns null when the endpoint cannot be read,
// so callers can tell "unavailable" (null) from "nothing to show" (an empty list). One definition for both hooks.
'use client';

import { authFetch } from '@/lib/api';
import { ApiError } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';

export async function fetchOrNull<T>(url: string): Promise<T | null> {
  try {
    return await retryTransient(async () => {
      const r = await authFetch(url);
      if (!r.ok) throw new ApiError(`HTTP ${r.status}`, r.status);
      return (await r.json()) as T;
    }, { maxWaitMs: 90_000 });
  } catch {
    return null;
  }
}
