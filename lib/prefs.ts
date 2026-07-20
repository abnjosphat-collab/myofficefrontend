// lib/prefs.ts — small, SSR-safe store for user layout preferences that don't have their
// own provider (theme/font/font-size each already have one). Centralizes the localStorage
// keys so they aren't scattered string literals, and exposes typed get/set + a change event
// so open panels and consuming hooks stay in sync.

export type ModuleView = 'grid' | 'list';

const KEYS = {
  defaultView: 'oz_defaultView',        // grid | list — default for module/record listings
  defaultExpanded: 'oz_defaultExpanded', // '1' | '0' — start collapsible sections open?
  prefsSeen: 'oz_prefsSeen',            // '1' once the first-run setup has been shown
} as const;

const EVENT = 'oz-prefs-changed';

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeRaw(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key } }));
  } catch { /* storage unavailable — non-fatal */ }
}

export function getDefaultView(): ModuleView {
  return readRaw(KEYS.defaultView) === 'list' ? 'list' : 'grid';
}
export function setDefaultView(v: ModuleView) { writeRaw(KEYS.defaultView, v); }

/** Whether collapsible sections should start expanded. Default false (start collapsed). */
export function getDefaultExpanded(): boolean {
  return readRaw(KEYS.defaultExpanded) === '1';
}
export function setDefaultExpanded(v: boolean) { writeRaw(KEYS.defaultExpanded, v ? '1' : '0'); }

export function hasSeenPrefs(): boolean { return readRaw(KEYS.prefsSeen) === '1'; }
export function markPrefsSeen() { writeRaw(KEYS.prefsSeen, '1'); }

/** Subscribe to any pref change (fired by the setters above). Returns an unsubscribe fn. */
export function onPrefsChange(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
