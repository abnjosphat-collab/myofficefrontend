// lib/registerServiceWorker.ts — registers public/sw.js (app-shell precaching only,
// see that file's own header for the caching-scope rationale). Split into its own
// function, guarded the same way every other browser-only helper in this codebase is
// (lib/prefs.ts, useNotifications.ts) so it's directly callable from a single
// mount-once client component (components/app-shell/ServiceWorkerRegistrar.tsx)
// without duplicating the guard, and directly unit-testable without a DOM.
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Registration failing (unsupported context, blocked, etc.) shouldn't be
    // user-visible or fatal — this is a progressive enhancement, not a requirement
    // for the app to function.
  });
}
