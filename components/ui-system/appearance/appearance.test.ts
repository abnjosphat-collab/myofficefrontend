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
  it('offers sage and mono starting with sage', () => {
    expect(APPEARANCE_THEMES.map(t => t.id)).toEqual(['sage', 'mono']);
    expect(DEFAULT_APPEARANCE.theme).toBe('sage');
  });

  it('offers light and dark starting light', () => {
    expect(APPEARANCE_DARKNESS.map(d => d.id)).toEqual(['light', 'dark']);
    expect(DEFAULT_APPEARANCE.darkness).toBe('light');
  });

  it('parses the stored pair, migrating retired colour-trial ids by intent', () => {
    const parsed = parseAppearance(JSON.stringify({ version: 1, theme: 'mono', darkness: 'dark' }));
    expect(parsed?.theme).toBe('mono');
    expect(parsed?.darkness).toBe('dark');
    // Retired ids: any dark step becomes mono/dark, anything else sage/light.
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'ocean', darkness: 'dark' }))).toMatchObject({ theme: 'mono', darkness: 'dark' });
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'clay', darkness: 'deep' }))).toMatchObject({ theme: 'mono', darkness: 'dark' });
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'forest', darkness: 'light' }))).toMatchObject({ theme: 'sage', darkness: 'light' });
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'sand', darkness: 'shaded' }))).toMatchObject({ theme: 'sage', darkness: 'light' });
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'neon', darkness: 'pitch' }))).toMatchObject({ theme: 'sage', darkness: 'light' });
    // Unstyled pairs canonicalize too: dark always pairs mono, light always sage.
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'sage', darkness: 'dark' }))).toMatchObject({ theme: 'mono', darkness: 'dark' });
    expect(parseAppearance(JSON.stringify({ version: 1, theme: 'mono', darkness: 'light' }))).toMatchObject({ theme: 'sage', darkness: 'light' });
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

  it('starts light, follows the OS dark mode and the more-contrast request', () => {
    vi.stubGlobal('matchMedia', matchMedia(false, false));
    expect(preferredDarkness()).toBe('light');
    vi.stubGlobal('matchMedia', matchMedia(true, false));
    expect(preferredDarkness()).toBe('dark');
    vi.stubGlobal('matchMedia', matchMedia(false, true));
    expect(preferredDarkness()).toBe('dark');
    vi.stubGlobal('matchMedia', matchMedia(true, true));
    expect(preferredDarkness()).toBe('dark');
  });

  it('starts light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(preferredDarkness()).toBe('light');
  });

  it('fresh installs start on the OS-derived pair', () => {
    vi.stubGlobal('matchMedia', matchMedia(true, false));
    expect(migrateAppearance(store())).toMatchObject({ theme: 'mono', darkness: 'dark' });
    vi.stubGlobal('matchMedia', matchMedia(false, false));
    expect(migrateAppearance(store())).toMatchObject({ theme: 'sage', darkness: 'light' });
  });

  it('a stored choice always beats the OS', () => {
    vi.stubGlobal('matchMedia', matchMedia(true, true));
    const migrated = migrateAppearance(store({ [APPEARANCE_KEY]: JSON.stringify({ version: 1, theme: 'sage', darkness: 'light' }) }));
    expect(migrated.theme).toBe('sage');
    expect(migrated.darkness).toBe('light');
  });
});

describe('effectiveAppearance', () => {
  const stored = { ...DEFAULT_APPEARANCE, theme: 'mono' as const, darkness: 'dark' as const };

  it('applies the stored look for flagged trial users', () => {
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
    applyAppearanceToDocument({ ...DEFAULT_APPEARANCE, theme: 'mono', darkness: 'dark' }, root as unknown as HTMLElement);
    expect(root.dataset['theme']).toBe('mono');
    expect(root.dataset['darkness']).toBe('dark');
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

  it('pre-paints the stored pair', () => {
    const { dataset } = run(JSON.stringify({ version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'mono', darkness: 'dark' }), '/');
    expect(dataset['theme']).toBe('mono');
    expect(dataset['darkness']).toBe('dark');
  });

  it('migrates retired colour-trial records to the canonical pair', () => {
    const { dataset } = run(JSON.stringify({ version: 1, theme: 'ocean', darkness: 'dark' }), '/');
    expect(dataset['theme']).toBe('mono');
    expect(dataset['darkness']).toBe('dark');
  });

  it('derives darkness from the OS when nothing is stored', () => {
    expect(run(null, '/', true, false).dataset).toMatchObject({ theme: 'mono', darkness: 'dark' });
    expect(run(null, '/', false, true).dataset).toMatchObject({ theme: 'mono', darkness: 'dark' });
    expect(run(null, '/', false, false).dataset).toMatchObject({ theme: 'sage', darkness: 'light' });
  });

  it('forces the sage floor on Tools routes', () => {
    const { dataset } = run(JSON.stringify({ version: 1, theme: 'mono', darkness: 'dark' }), '/tools/register');
    expect(dataset['theme']).toBe('sage');
    expect(dataset['darkness']).toBe('light');
  });

  it('falls back to the sage floor on corrupt or versioned-away records', () => {
    expect(run('not json', '/').dataset['theme']).toBe('sage');
    expect(run(JSON.stringify({ version: 2, theme: 'mono' }), '/').dataset['darkness']).toBe('light');
  });
});
