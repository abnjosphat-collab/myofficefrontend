// components/app-shell/ServiceWorkerRegistrar.tsx — invisible client component
// mounted once in AppShell, same "one mount-once effect, works on every page" pattern
// as UsageTracker.tsx. Registers public/sw.js on first mount; the browser handles
// dedup on subsequent mounts (AppShell remounts on every navigation — see
// ActiveNoticesPopup.tsx's note on that — so this runs its effect often, but
// navigator.serviceWorker.register() on an already-registered scope is a cheap no-op).
'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/registerServiceWorker';

export function ServiceWorkerRegistrar() {
  useEffect(() => { registerServiceWorker(); }, []);
  return null;
}
