// lib/inputHistory.test.ts — the form-field autofill store (lib/inputHistory.ts):
// record → suggest → substring filter → per-field cap → dedupe → clear.
// jsdom provides window/localStorage.
import { describe, it, expect, beforeEach } from 'vitest';
import { recordInput, getInputSuggestions, clearInputHistory, clearInputHistoryForUser, setInputHistoryUser } from '@/lib/inputHistory';

beforeEach(() => {
  window.localStorage.clear();
  setInputHistoryUser(null);
});

describe('recordInput / getInputSuggestions', () => {
  it('records a value and offers it back', () => {
    recordInput('department', 'Engineering');
    expect(getInputSuggestions('department')).toEqual(['Engineering']);
  });

  it('keeps history per-field independent', () => {
    recordInput('department', 'Engineering');
    recordInput('location', 'Plant A');
    expect(getInputSuggestions('department')).toEqual(['Engineering']);
    expect(getInputSuggestions('location')).toEqual(['Plant A']);
  });

  it('returns newest first', () => {
    recordInput('department', 'Engineering');
    recordInput('department', 'Finance');
    recordInput('department', 'Safety');
    expect(getInputSuggestions('department')).toEqual(['Safety', 'Finance', 'Engineering']);
  });

  it('de-dupes case-insensitively, newest wins position', () => {
    recordInput('department', 'Engineering');
    recordInput('department', 'Finance');
    recordInput('department', 'engineering');
    expect(getInputSuggestions('department')).toEqual(['engineering', 'Finance']);
  });

  it('trims and ignores blanks / too-short / too-long values', () => {
    recordInput('department', '  Engineering  ');
    recordInput('department', 'x');            // too short (<2)
    recordInput('department', '');             // blank
    recordInput('department', 'y'.repeat(200)); // too long (>120)
    expect(getInputSuggestions('department')).toEqual(['Engineering']);
  });

  it('filters by case-insensitive substring query', () => {
    recordInput('department', 'Engineering');
    recordInput('department', 'Finance');
    recordInput('department', 'Field Services');
    expect(getInputSuggestions('department', 'fi')).toEqual(['Field Services', 'Finance']);
    expect(getInputSuggestions('department', 'eng')).toEqual(['Engineering']);
    expect(getInputSuggestions('department', 'zzz')).toEqual([]);
  });

  it('honours the limit argument', () => {
    for (let i = 0; i < 10; i++) recordInput('department', `Dept ${i}`);
    expect(getInputSuggestions('department', '', 3)).toHaveLength(3);
  });

  it('caps stored history at 25 distinct values per field', () => {
    for (let i = 0; i < 40; i++) recordInput('department', `Dept ${i}`);
    const all = getInputSuggestions('department', '', 100);
    expect(all).toHaveLength(25);
    // newest kept, oldest evicted
    expect(all[0]).toBe('Dept 39');
    expect(all).not.toContain('Dept 0');
  });

  it('is SSR/empty-safe for unknown fields', () => {
    expect(getInputSuggestions('never-used')).toEqual([]);
  });
});

describe('clearInputHistory', () => {
  it('clears a single field only', () => {
    recordInput('department', 'Engineering');
    recordInput('location', 'Plant A');
    clearInputHistory('department');
    expect(getInputSuggestions('department')).toEqual([]);
    expect(getInputSuggestions('location')).toEqual(['Plant A']);
  });

  it('clears everything when no field given', () => {
    recordInput('department', 'Engineering');
    recordInput('location', 'Plant A');
    clearInputHistory();
    expect(getInputSuggestions('department')).toEqual([]);
    expect(getInputSuggestions('location')).toEqual([]);
  });
});

describe('per-user keys (F-13)', () => {
  it('a second user sees no suggestions from the first', () => {
    setInputHistoryUser('user-a');
    recordInput('department', 'Engineering');
    setInputHistoryUser('user-b');
    expect(getInputSuggestions('department')).toEqual([]);
    recordInput('department', 'Finance');
    // And the first user's history is intact when they return.
    setInputHistoryUser('user-a');
    expect(getInputSuggestions('department')).toEqual(['Engineering']);
  });

  it('clearing removes only the current user key', () => {
    setInputHistoryUser('user-a');
    recordInput('department', 'Engineering');
    setInputHistoryUser('user-b');
    recordInput('department', 'Finance');
    clearInputHistory();
    expect(getInputSuggestions('department')).toEqual([]);
    expect(window.localStorage.getItem('oz_inputHistory:user-a')).not.toBeNull();
  });

  it('clearing a named user key removes it even when signed out', () => {
    setInputHistoryUser('user-a');
    recordInput('department', 'Engineering');
    setInputHistoryUser(null);
    clearInputHistoryForUser('user-a');
    expect(window.localStorage.getItem('oz_inputHistory:user-a')).toBeNull();
  });
});
