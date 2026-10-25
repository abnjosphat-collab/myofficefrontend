// Appearance contract — the one validated, versioned record for typeface, text
// size, helpful hints, colour theme and darkness, shared by Tools and every
// other MyOffice route.
// Module view/filter/layout preferences stay separate (see usePersistentState).
//
// Migration precedence (first valid wins):
//   1. shared `myoffice_appearance_v1`
//   2. Tools `myoffice.tools.preferences.v1` appearance fields
//   3. legacy MyOffice `oz_bodyFont` / `oz_fontScale`
//   4. defaults (Inter, 100%, hints on, sage, OS-derived darkness)
// Unsupported legacy fonts (system, sora, anything unknown) map to Inter;
// legacy scale presets map to the nearest supported 5% step; records written
// before themes existed stay on sage and light, so nobody's look changes.
//
// Themes stay dark unless the profile carries the trial flag: see
// effectiveAppearance. The Tools routes always render the sage floor.

export const APPEARANCE_KEY = 'myoffice_appearance_v1';
const TOOLS_PREFS_KEY = 'myoffice.tools.preferences.v1'; // read-only migration bridge
const LEGACY_FONT_KEY = 'oz_bodyFont';
const LEGACY_SCALE_KEY = 'oz_fontScale';

export type AppearanceFont = 'inter' | 'manrope' | 'jakarta';

/** Six colour themes. Sage is the default floor every route renders without a choice. */
export type AppearanceTheme = 'sage' | 'forest' | 'ocean' | 'clay' | 'slate' | 'sand';

/** Four darkness steps. Fresh installs derive theirs from the OS (see preferredDarkness). */
export type AppearanceDarkness = 'light' | 'shaded' | 'dark' | 'deep';

export type Appearance = {
  version: 1;
  font: AppearanceFont;
  /** 85–130, in 5% steps. Applied through typography tokens (--mo-text-scale). */
  fontSize: number;
  /** Show contextual help hints. */
  guidance: boolean;
  theme: AppearanceTheme;
  darkness: AppearanceDarkness;
};

export const DEFAULT_APPEARANCE: Appearance = { version: 1, font: 'inter', fontSize: 100, guidance: true, theme: 'sage', darkness: 'light' };

export const APPEARANCE_THEMES: ReadonlyArray<{ id: AppearanceTheme; label: string; description: string }> = [
  { id: 'sage', label: 'Sage', description: 'The default green-grey floor' },
  { id: 'forest', label: 'Forest', description: 'Deeper green tints' },
  { id: 'ocean', label: 'Ocean', description: 'Cool blue-grey tints' },
  { id: 'clay', label: 'Clay', description: 'Warm earthen tints' },
  { id: 'slate', label: 'Slate', description: 'Neutral grey, no hue' },
  { id: 'sand', label: 'Sand', description: 'Warm pale tints' },
];

export const APPEARANCE_DARKNESS: ReadonlyArray<{ id: AppearanceDarkness; label: string; description: string }> = [
  { id: 'light', label: 'Light', description: 'Bright pages, dark text' },
  { id: 'shaded', label: 'Shaded', description: 'Soft grey pages, dark text' },
  { id: 'dark', label: 'Dark', description: 'Dark pages, light text' },
  { id: 'deep', label: 'Deeper dark', description: 'Darkest pages, strongest contrast' },
];

const THEMES = new Set<string>(APPEARANCE_THEMES.map(theme => theme.id));
const DARKNESS = new Set<string>(APPEARANCE_DARKNESS.map(step => step.id));
export const FONT_SIZE_MIN = 85;
export const FONT_SIZE_MAX = 130;
export const FONT_SIZE_STEP = 5;

export const APPEARANCE_FONTS: ReadonlyArray<{ id: AppearanceFont; label: string; description: string; cssVar: string }> = [
  { id: 'inter', label: 'Inter', description: 'Clear and precise', cssVar: '--font-inter' },
  { id: 'manrope', label: 'Manrope', description: 'Soft and open', cssVar: '--font-manrope' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', description: 'Modern and warm', cssVar: '--font-jakarta' },
];

const FONTS = new Set<string>(APPEARANCE_FONTS.map(font => font.id));

export function clampFontSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_APPEARANCE.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n / FONT_SIZE_STEP) * FONT_SIZE_STEP));
}

/** Legacy font id → shared font. Unknown ids (system, sora, …) become Inter. */
export function mapLegacyFont(value: unknown): AppearanceFont {
  return typeof value === 'string' && FONTS.has(value) ? (value as AppearanceFont) : 'inter';
}

/** Stored theme id → known theme. Unknown ids become sage. */
export function mapTheme(value: unknown): AppearanceTheme {
  return typeof value === 'string' && THEMES.has(value) ? (value as AppearanceTheme) : 'sage';
}

/** Stored darkness id → known step. Unknown ids become light. */
export function mapDarkness(value: unknown): AppearanceDarkness {
  return typeof value === 'string' && DARKNESS.has(value) ? (value as AppearanceDarkness) : 'light';
}

/** The darkness a fresh install starts on: deepest for more contrast, dark for dark OS, else light. Never throws. */
export function preferredDarkness(): AppearanceDarkness {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
    if (window.matchMedia('(prefers-contrast: more)').matches) return 'deep';
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  } catch {
    return 'light';
  }
}

/** The stored choice gated for render: trial-flagged users keep theirs, everyone else and every Tools route stay on sage and light. Pure. */
export function effectiveAppearance(stored: Appearance, gate: { flagged: boolean; toolsRoute: boolean }): Appearance {
  if (gate.flagged && !gate.toolsRoute) return stored;
  return { ...stored, theme: 'sage', darkness: 'light' };
}

/** Legacy scale preset → nearest supported percentage. */
export function mapLegacyScale(value: unknown): number {
  switch (value) {
    case 'small': return 95;
    case 'large': return 110;
    case 'xlarge': return 115;
    default: return 100;
  }
}

export function parseAppearance(raw: string | null): Appearance | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Appearance> | null;
    if (!value || value.version !== 1) return null;
    return {
      version: 1,
      font: mapLegacyFont(value.font),
      fontSize: clampFontSize(value.fontSize),
      guidance: value.guidance !== false,
      theme: mapTheme(value.theme),
      darkness: mapDarkness(value.darkness),
    };
  } catch {
    return null; // corrupt storage → caller falls through to the next source
  }
}

function parseToolsAppearance(raw: string | null): Pick<Appearance, 'font' | 'fontSize' | 'guidance'> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { options?: { font?: unknown; fontSize?: unknown; guidance?: unknown } } | null;
    const source = value?.options;
    if (!source || typeof source !== 'object') return null;
    if (!FONTS.has(source.font as string) && !Number.isFinite(source.fontSize as number) && typeof source.guidance === 'undefined') return null;
    return {
      font: mapLegacyFont(source.font),
      fontSize: clampFontSize(source.fontSize),
      guidance: source.guidance !== false,
    };
  } catch {
    return null;
  }
}

export type AppearanceStore = Pick<Storage, 'getItem' | 'setItem'>;

/** Resolve the effective appearance from every known source. Never throws. */
export function migrateAppearance(storage: AppearanceStore | null | undefined): Appearance {
  if (!storage) return { ...DEFAULT_APPEARANCE };
  let shared: string | null = null;
  let tools: string | null = null;
  let legacyFont: string | null = null;
  let legacyScale: string | null = null;
  try {
    shared = storage.getItem(APPEARANCE_KEY);
    tools = storage.getItem(TOOLS_PREFS_KEY);
    legacyFont = storage.getItem(LEGACY_FONT_KEY);
    legacyScale = storage.getItem(LEGACY_SCALE_KEY);
  } catch {
    return { ...DEFAULT_APPEARANCE }; // unavailable storage → safe defaults
  }
  const fromShared = parseAppearance(shared);
  if (fromShared) return fromShared;
  const fromTools = parseToolsAppearance(tools);
  if (fromTools) return { version: 1, theme: 'sage', darkness: 'light', ...fromTools };
  if (legacyFont !== null || legacyScale !== null) {
    return {
      version: 1,
      font: mapLegacyFont(legacyFont),
      fontSize: legacyScale === null ? DEFAULT_APPEARANCE.fontSize : mapLegacyScale(legacyScale),
      guidance: true,
      theme: 'sage',
      darkness: 'light',
    };
  }
  return { ...DEFAULT_APPEARANCE, darkness: preferredDarkness() };
}

export function persistAppearance(storage: AppearanceStore | null | undefined, appearance: Appearance): void {
  if (!storage) return;
  try {
    storage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch { /* non-fatal: storage full or blocked */ }
}

/** Write the appearance onto <html> so every subtree and portal inherits it. */
export function applyAppearanceToDocument(appearance: Appearance, root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement): void {
  if (!root) return;
  root.dataset.font = appearance.font;
  root.dataset.guidance = appearance.guidance ? 'on' : 'off';
  root.dataset.theme = appearance.theme;
  root.dataset.darkness = appearance.darkness;
  root.style.setProperty('--mo-text-scale', String(clampFontSize(appearance.fontSize) / 100));
}

/**
 * Pre-paint bootstrap, inlined into <head> by app/layout.tsx so the first paint
 * already uses the saved typeface, text size, theme and darkness (no flash, no
 * layout jump). It reads only the shared v1 record; legacy sources are migrated
 * on mount by AppearanceProvider. With nothing stored, darkness follows the OS
 * (deeper for more contrast, dark for dark mode, else light); Tools routes always
 * pre-paint the sage floor. Kept in agreement with parseAppearance by appearance.test.ts.
 */
export const APPEARANCE_BOOTSTRAP = `(function(){try{var r=document.documentElement,a=null;try{a=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)})||'null');}catch(e){a=null;}var ok=a&&a.version===1;var f=ok&&${JSON.stringify([...FONTS])}.indexOf(a.font)>=0?a.font:'inter';var n=ok?Number(a.fontSize):NaN;n=isFinite(n)?Math.min(${FONT_SIZE_MAX},Math.max(${FONT_SIZE_MIN},Math.round(n/${FONT_SIZE_STEP})*${FONT_SIZE_STEP})):100;var g=ok&&a.guidance===false?'off':'on';var th=ok&&${JSON.stringify([...THEMES])}.indexOf(a.theme)>=0?a.theme:'sage';var osDark=false,osContrast=false;try{if(window.matchMedia){osContrast=window.matchMedia('(prefers-contrast: more)').matches;osDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}}catch(e){}var dk=ok&&${JSON.stringify([...DARKNESS])}.indexOf(a.darkness)>=0?a.darkness:(osContrast?'deep':osDark?'dark':'light');var tools=false;try{tools=typeof location!=='undefined'&&location.pathname.indexOf('/tools')===0;}catch(e){}if(tools){th='sage';dk='light';}r.dataset.font=f;r.dataset.guidance=g;r.dataset.theme=th;r.dataset.darkness=dk;r.style.setProperty('--mo-text-scale',String(n/100));}catch(e){}})();`;
