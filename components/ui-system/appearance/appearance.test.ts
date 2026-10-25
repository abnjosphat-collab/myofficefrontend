import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APPEARANCE_DARKNESS,
  APPEARANCE_KEY,
  APPEARANCE_THEMES,
  DEFAULT_APPEARANCE,
  applyAppearanceToDocument,
  effectiveAppearance,
  migrateAppearance,
  parseAppearance,
  preferredDarkness,
  APPEARANCE_BOOTSTRAP,
} from './appearance';

afterEach(() => { vi.unstubAllGlobals(); });

const store = (entries: Record<string, string> = {}) => {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => { map.set(key, value); },
  };
};

describe('appearance themes', () => {
  it('offers six colour themes starting with sage', () => {
    expect(APPEARANCE_THEMES.map(t => t.id)).toEqual(['sage', 'forest', 'ocean', 'clay', 'slate', 'sand']);
    expect(DEFAULT_APPEARANCE.theme).toBe('sage');
  });

  it('offers four darkness steps starting light', () => {
    expect(APPEARANCE_DARKNESS.map(d => d.id)).toEqual(['light', 'shaded', 'dark', 'deep']);
    expect(DEFAULT_APPEARANCE.darkness).toBe('light');
  });

  it('parses stored theme and darkness, defaulting unknown values', () => {
    const parsed = parseAppearance(JSON.stringify({ version: 1, theme: 'ocean', darkness: 'dark' }));
    expect(parsed?.theme).toBe('ocean');
    expect(parsed?.darkness).toBe('dark');
    const odd = parseAppearance(JSON.stringify({ version: 1, theme: 'neon', darkness: 'pitch' }));
    expect(odd?.theme).toBe('sage');
    expect(odd?.darkness).toBe('light');
  });

  it('keeps old records on sage and light (their look never changes)', () => {
    const parsed = parseAppearance(JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true }));
    expect(parsed?.theme).toBe('sage');
    expect(parsed?.darkness).toBe('light');
  });
});

describe('preferredDarkness', () => {
  const matchMedia = (dark: boolean, contrast: boolean) =>
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme') ? dark : query.includes('prefers-contrast') ? contrast : false,
      media: query,
    }));

  it('starts light, follows the OS dark mode, and deepens for more contrast', () => {
    vi.stubGlobal('matchMedia', matchMedia(false, false));
    expect(preferredDarkness()).toBe('light');
    vi.stubGlobal('matchMedia', matchMedia(true, false));
    expect(preferredDarkness()).toBe('dark');
    vi.stubGlobal('matchMedia', matchMedia(false, true));
    expect(preferredDarkness()).toBe('deep');
    vi.stubGlobal('matchMedia', matchMedia(true, true));
    expect(preferredDarkness()).toBe('deep');
  });

  it('starts light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(preferredDarkness()).toBe('light');
  });

  it('fresh installs start on the OS-derived darkness', () => {
    vi.stubGlobal('matchMedia', matchMedia(true, false));
    expect(migrateAppearance(store())?.darkness).toBe('dark');
  });

  it('a stored choice always beats the OS', () => {
    vi.stubGlobal('matchMedia', matchMedia(true, true));
    const migrated = migrateAppearance(store({ [APPEARANCE_KEY]: JSON.stringify({ version: 1, theme: 'clay', darkness: 'light' }) }));
    expect(migrated.theme).toBe('clay');
    expect(migrated.darkness).toBe('light');
  });
});

describe('effectiveAppearance', () => {
  const stored = { ...DEFAULT_APPEARANCE, theme: 'ocean' as const, darkness: 'dark' as const };

  it('applies the stored theme for flagged trial users', () => {
    expect(effectiveAppearance(stored, { flagged: true, toolsRoute: false })).toEqual(stored);
  });

  it('stays dark (sage, light) for everyone else', () => {
    expect(effectiveAppearance(stored, { flagged: false, toolsRoute: false })).toEqual({ ...stored, theme: 'sage', darkness: 'light' });
  });

  it('keeps the Tools sage floor even for flagged users', () => {
    expect(effectiveAppearance(stored, { flagged: true, toolsRoute: true })).toEqual({ ...stored, theme: 'sage', darkness: 'light' });
  });
});

describe('applyAppearanceToDocument', () => {
  it('writes theme and darkness datasets', () => {
    const root = document.createElement('div');
    applyAppearanceToDocument({ ...DEFAULT_APPEARANCE, theme: 'forest', darkness: 'deep' }, root as unknown as HTMLElement);
    expect(root.dataset['theme']).toBe('forest');
    expect(root.dataset['darkness']).toBe('deep');
  });
});

describe('APPEARANCE_BOOTSTRAP', () => {
  const run = (stored: string | null, path: string, dark = false, contrast = false) => {
    const dataset: Record<string, string> = {};
    const props: Record<string, string> = {};
    const root = { dataset, style: { setProperty: (k: string, v: string) => { props[k] = v; } } };
    const fn = new Function(
      'document', 'localStorage', 'window', 'location',
      `${APPEARANCE_BOOTSTRAP}; return undefined;`,
    );
    fn(
      { documentElement: root },
      { getItem: () => stored },
      { matchMedia: (q: string) => ({ matches: q.includes('prefers-color-scheme') ? dark : q.includes('prefers-contrast') ? contrast : false }) },
      { pathname: path },
    );
    return { dataset, props };
  };

  it('pre-paints the stored theme and darkness', () => {
    const { dataset } = run(JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'ocean', darkness: 'dark' }), '/');
    expect(dataset['theme']).toBe('ocean');
    expect(dataset['darkness']).toBe('dark');
  });

  it('derives darkness from the OS when nothing is stored', () => {
    expect(run(null, '/', true, false).dataset['darkness']).toBe('dark');
    expect(run(null, '/', false, true).dataset['darkness']).toBe('deep');
    expect(run(null, '/', false, false).dataset['darkness']).toBe('light');
  });

  it('forces the sage floor on Tools routes', () => {
    const { dataset } = run(JSON.stringify({ version: 1, theme: 'clay', darkness: 'deep' }), '/tools/register');
    expect(dataset['theme']).toBe('sage');
    expect(dataset['darkness']).toBe('light');
  });

  it('falls back to the sage floor on corrupt or versioned-away records', () => {
    expect(run('not json', '/').dataset['theme']).toBe('sage');
    expect(run(JSON.stringify({ version: 2, theme: 'ocean' }), '/').dataset['darkness']).toBe('light');
  });
});
