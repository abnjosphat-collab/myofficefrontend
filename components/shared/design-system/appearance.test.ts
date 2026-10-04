import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_KEY,
  clampFontSize,
  DEFAULT_APPEARANCE,
  mapLegacyFont,
  mapLegacyScale,
  migrateAppearance,
  parseAppearance,
  persistAppearance,
} from './appearance';

function store(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    snapshot: () => Object.fromEntries(map),
  };
}

describe('appearance contract', () => {
  it('parses a valid shared appearance', () => {
    expect(parseAppearance(JSON.stringify({ version: 1, font: 'manrope', fontSize: 115, guidance: false })))
      .toEqual({ version: 1, font: 'manrope', fontSize: 115, guidance: false });
  });

  it('rejects wrong versions, garbage, and empty input', () => {
    expect(parseAppearance(null)).toBeNull();
    expect(parseAppearance('not json')).toBeNull();
    expect(parseAppearance(JSON.stringify({ version: 2, font: 'inter', fontSize: 100 }))).toBeNull();
    expect(parseAppearance(JSON.stringify({ font: 'inter' }))).toBeNull();
  });

  it('clamps and steps font size to 85–130 in fives', () => {
    expect(clampFontSize(100)).toBe(100);
    expect(clampFontSize(92.5)).toBe(95);
    expect(clampFontSize(107.5)).toBe(110);
    expect(clampFontSize(50)).toBe(85);
    expect(clampFontSize(400)).toBe(130);
    expect(clampFontSize('115')).toBe(115);
    expect(clampFontSize(Number.NaN)).toBe(100);
    expect(clampFontSize(undefined)).toBe(100);
  });

  it('maps unsupported legacy fonts to Inter', () => {
    expect(mapLegacyFont('manrope')).toBe('manrope');
    expect(mapLegacyFont('system')).toBe('inter');
    expect(mapLegacyFont('sora')).toBe('inter');
    expect(mapLegacyFont('comic-sans')).toBe('inter');
    expect(mapLegacyFont(null)).toBe('inter');
  });

  it('maps legacy scale presets to the nearest step', () => {
    expect(mapLegacyScale('small')).toBe(95);
    expect(mapLegacyScale('default')).toBe(100);
    expect(mapLegacyScale('large')).toBe(110);
    expect(mapLegacyScale('xlarge')).toBe(115);
    expect(mapLegacyScale('bogus')).toBe(100);
  });

  it('prefers shared over Tools over legacy over defaults', () => {
    const tools = JSON.stringify({ options: { font: 'jakarta', fontSize: 120, guidance: true } });
    const shared = JSON.stringify({ version: 1, font: 'manrope', fontSize: 105, guidance: false });
    expect(migrateAppearance(store({}))).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance(store({ oz_bodyFont: 'sora', oz_fontScale: 'large' })))
      .toEqual({ version: 1, font: 'inter', fontSize: 110, guidance: true });
    expect(migrateAppearance(store({ 'myoffice.tools.preferences.v1': tools, oz_fontScale: 'small' })))
      .toEqual({ version: 1, font: 'jakarta', fontSize: 120, guidance: true });
    expect(migrateAppearance(store({ [APPEARANCE_KEY]: shared, 'myoffice.tools.preferences.v1': tools })))
      .toEqual({ version: 1, font: 'manrope', fontSize: 105, guidance: false });
  });

  it('skips corrupt entries and falls through to the next source', () => {
    const s = store({
      [APPEARANCE_KEY]: '{broken',
      'myoffice.tools.preferences.v1': 'also broken',
      oz_fontScale: 'xlarge',
    });
    expect(migrateAppearance(s)).toEqual({ version: 1, font: 'inter', fontSize: 115, guidance: true });
  });

  it('survives unavailable storage', () => {
    expect(migrateAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(migrateAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(migrateAppearance(throwing)).toEqual(DEFAULT_APPEARANCE);
    expect(() => persistAppearance(throwing, DEFAULT_APPEARANCE)).not.toThrow();
  });

  it('persists round-trippable appearances', () => {
    const s = store();
    persistAppearance(s, { version: 1, font: 'jakarta', fontSize: 85, guidance: false });
    expect(parseAppearance(s.snapshot()[APPEARANCE_KEY]))
      .toEqual({ version: 1, font: 'jakarta', fontSize: 85, guidance: false });
  });
});
