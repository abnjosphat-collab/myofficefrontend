// lib/registerServiceWorker.ts — registers the generated service worker (`app/sw.js/route.ts`, policy in
// `lib/serviceWorkerSource.ts`) and surfaces a waiting update without ever applying it on its own.
//
// Update path: the worker file carries a build stamp, so a new deployment is a new worker. The browser checks for it
// on navigation, and this module also checks when the app returns to the foreground and hourly. A new worker
// installs and then WAITS (the worker does not call skipWaiting). When one is waiting while an older one controls the
// page, `UPDATE_READY_EVENT` is dispatched; the UI offers "Reload", and only `applyServiceWorkerUpdate()` activates
// it. The documents and data themselves always come from the network, so reopening or navigating the app already
// delivers the new code; the prompt only covers a window that has been open across a deployment.
//
// Browser-only and safe to call from several mount-once components: registration is idempotent.

/** Dispatched on `window` when a newer version has installed and is waiting to take over. */
export const UPDATE_READY_EVENT = 'myoffice:update-ready';

const HOURLY = 60 * 60 * 1000;
let started = false;
let waiting: ServiceWorker | null = null;

function announce(registration: ServiceWorkerRegistration): void {
  // Only an *update* is worth announcing: on first install there is no controlling worker and nothing to replace.
  if (!registration.waiting || !navigator.serviceWorker.controller) return;
  waiting = registration.waiting;
  window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT));
}

/** Register the worker once and start watching for updates. Failures are silent: this is progressive enhancement. */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (started) return;
  started = true;

  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(registration => {
    announce(registration);
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => { if (installing.state === 'installed') announce(registration); });
    });
    const check = () => { registration.update().catch(() => { /* offline or transient: try again next time */ }); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.setInterval(check, HOURLY);
  }).catch(() => {
    // Registration failing (unsupported context, blocked, etc.) is not user-visible or fatal.
    started = false;
  });
}

/**
 * Activate the waiting version and reload once it controls the page. Call only from an explicit user action
 * ("Reload"); the app must never do this by itself. No-op when nothing is waiting.
 */
export function applyServiceWorkerUpdate(): void {
  if (!waiting || typeof window === 'undefined') return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
