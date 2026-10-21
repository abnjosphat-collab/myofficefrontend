// lib/peopleHistory.ts — the employees this device picked lately, newest first, as
// register row ids (stable across renames; resolvable against the live options so
// archived or departed people never resurface). Device-level like inputHistory:
// the same browser already shares search text and typed history.
'use client';

const KEY = 'oz_recentPeople';
const CAP = 25;

const read = (): string[] => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
};

export const readRecentPeople = (limit = 8): string[] => read().slice(0, Math.max(0, limit));

export const recordRecentPerson = (rowId: string): void => {
  const id = rowId.trim();
  if (id === '') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([id, ...read().filter(v => v !== id)].slice(0, CAP)));
  } catch {
    // Recent people are a convenience; a full or blocked store must not break picking.
  }
};

export const clearRecentPeople = (): void => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // See above.
  }
};
