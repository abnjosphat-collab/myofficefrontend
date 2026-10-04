// External store for the appearance record, consumed with useSyncExternalStore so
// React reads storage without setState-in-effect and without hydration mismatches
// (the server snapshot is always DEFAULT_APPEARANCE).

import { APPEARANCE_KEY, DEFAULT_APPEARANCE, clampFontSize, migrateAppearance, persistAppearance, type Appearance } from './appearance';

const listeners = new Set<() => void>();
let cache: { signature: string; value: Appearance } = { signature: '\u0000', value: DEFAULT_APPEARANCE };

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

const SOURCE_KEYS = [APPEARANCE_KEY, 'myoffice.tools.preferences.v1', 'oz_bodyFont', 'oz_fontScale'];

/** Stable object identity until a source value changes (required by useSyncExternalStore). */
export function getAppearanceSnapshot(): Appearance {
  const store = storage();
  if (!store) return DEFAULT_APPEARANCE;
  let signature = '';
  try { signature = SOURCE_KEYS.map(key => store.getItem(key) ?? '').join('\u0001'); } catch { return DEFAULT_APPEARANCE; }
  if (signature !== cache.signature) cache = { signature, value: migrateAppearance(store) };
  return cache.value;
}

export function getServerAppearanceSnapshot(): Appearance {
  return DEFAULT_APPEARANCE;
}

export function subscribeAppearance(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === null || SOURCE_KEYS.includes(event.key)) listener(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function setAppearance(next: Appearance): void {
  persistAppearance(storage(), { ...next, version: 1, fontSize: clampFontSize(next.fontSize) });
  listeners.forEach(listener => listener());
}
