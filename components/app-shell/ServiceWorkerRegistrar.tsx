// components/app-shell/ServiceWorkerRegistrar.tsx — invisible client component mounted at the root (Providers) and in
// AppShell. Registers the service worker and, when a newer version is waiting, offers a persistent "Reload" toast.
// It never reloads the page by itself: an open app is only refreshed when the user chooses to (see
// lib/registerServiceWorker.ts for the full update path). The fixed toast id keeps a second mount from stacking toasts.
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { UPDATE_READY_EVENT, applyServiceWorkerUpdate, registerServiceWorker } from '@/lib/registerServiceWorker';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
    const offer = () => toast('A new version of MyOffice is ready', {
      id: 'update-ready',
      description: 'Reload when you are ready. Nothing changes until you do.',
      duration: Infinity,
      action: { label: 'Reload', onClick: applyServiceWorkerUpdate },
    });
    window.addEventListener(UPDATE_READY_EVENT, offer);
    return () => window.removeEventListener(UPDATE_READY_EVENT, offer);
  }, []);
  return null;
}
