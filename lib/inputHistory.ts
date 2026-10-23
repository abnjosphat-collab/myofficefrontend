// lib/inputHistory.ts — remembers values a user has typed into named form fields so
// they can be offered back as autofill suggestions. localStorage-backed, capped, and
// SSR-safe (mirrors the patterns in lib/usage.ts). Keyed by a stable field name so
// "department", "location", etc. each accumulate their own history across the app.
// Keyed by account first: one browser never offers the previous signed-in
// person's phrases to the next (F-13). The pre-F-13 shared key survives only
// as the signed-out fallback.

const KEY = 'oz_inputHistory';
const KEY_PREFIX = 'oz_inputHistory:';
const MAX_PER_FIELD = 25; // most-recent distinct values kept per field

let currentUserId: string | null = null;

/** The signed-in account whose history is read and written; null when signed out. Set by AuthProvider. */
export function setInputHistoryUser(userId: string | null) {
  currentUserId = userId;
}

const keyFor = (userId: string | null) => (userId ? `${KEY_PREFIX}${userId}` : KEY);

type Store = Record<string, string[]>; // field -> values, newest first

function read(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(keyFor(currentUserId));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj as Store : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(currentUserId), JSON.stringify(store));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Record a value the user entered into `field`. Trims, de-dupes (case-insensitive,
 *  newest wins), ignores blanks and very short/very long values. */
export function recordInput(field: string, value: string) {
  const v = (value ?? '').trim();
  if (!field || v.length < 2 || v.length > 120) return;
  const store = read();
  const existing = store[field] ?? [];
  const deduped = existing.filter(x => x.toLowerCase() !== v.toLowerCase());
  deduped.unshift(v);
  store[field] = deduped.slice(0, MAX_PER_FIELD);
  write(store);
}

/** Suggestions for `field`: recent values, optionally filtered by a case-insensitive
 *  prefix/substring match against `query`, newest first. */
export function getInputSuggestions(field: string, query = '', limit = 8): string[] {
  const values = read()[field] ?? [];
  const q = query.trim().toLowerCase();
  const matched = q ? values.filter(v => v.toLowerCase().includes(q)) : values;
  return matched.slice(0, limit);
}

/** Wipe history for one field, or all fields if none given (e.g. a settings "clear").
 *  A full clear also removes the legacy shared key, which may hold pre-F-13 phrases. */
export function clearInputHistory(field?: string) {
  if (typeof window === 'undefined') return;
  if (!field) {
    try { window.localStorage.removeItem(keyFor(currentUserId)); window.localStorage.removeItem(KEY); } catch { /* noop */ }
    return;
  }
  const store = read();
  delete store[field];
  write(store);
}

/** Remove one account's whole history, even after sign-out cleared the current user
 *  (the id is captured before the session goes away). Also removes the legacy
 *  shared key. Other accounts' keys are left alone. */
export function clearInputHistoryForUser(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    if (userId) window.localStorage.removeItem(keyFor(userId));
    window.localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
