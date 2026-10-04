// components/shared/design-system/appearance.ts — one validated, versioned
// appearance contract for font, text size, and helpful guidance (Stage B).
// Tools and the wider app share it; module view/filter/layout prefs stay separate.
//
// Migration precedence (first valid wins):
//   1. shared `myoffice_appearance_v1`
//   2. Tools `myoffice.tools.preferences.v1` appearance fields
//   3. legacy MyOffice `oz_bodyFont` / `oz_fontScale`
//   4. Tools defaults (Inter, 100%, guidance on)
//
// Unsupported legacy fonts (system/sora/anything unknown) map to Inter;
// legacy scale presets map to the nearest supported 5% step.

export const APPEARANCE_KEY = 'myoffice_appearance_v1';
const TOOLS_PREFS_KEY = 'myoffice.tools.preferences.v1'; // read-only bridge; Tools owns this key
const LEGACY_FONT_KEY = 'oz_bodyFont';
const LEGACY_SCALE_KEY = 'oz_fontScale';

export type AppearanceFont = 'inter' | 'manrope' | 'jakarta';

export type Appearance = {
  version: 1;
  font: AppearanceFont;
  /** 85–130 in 5% steps; applied as typography scale (zoom on px-based pages). */
  fontSize: number;
  guidance: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = { version: 1, font: 'inter', fontSize: 100, guidance: true };

const FONTS = new Set(['inter', 'manrope', 'jakarta']);

export function clampFontSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_APPEARANCE.fontSize;
  return Math.min(130, Math.max(85, Math.round(n / 5) * 5));
}

/** Legacy font id → shared font. Unknown ids (system, sora, …) become Inter. */
export function mapLegacyFont(value: unknown): AppearanceFont {
  return value === 'inter' || value === 'manrope' || value === 'jakarta' ? value : 'inter';
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
    const value = JSON.parse(raw) as Partial<Appearance>;
    if (value.version !== 1) return null;
    return {
      version: 1,
      font: mapLegacyFont(value.font),
      fontSize: clampFontSize(value.fontSize),
      guidance: value.guidance !== false,
    };
  } catch {
    return null; // corrupt storage → caller falls through to the next source
  }
}

function parseToolsAppearance(raw: string | null): Pick<Appearance, 'font' | 'fontSize' | 'guidance'> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { options?: { font?: unknown; fontSize?: unknown; guidance?: unknown } };
    const source = value.options;
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
  if (fromTools) return { version: 1, ...fromTools };
  if (legacyFont !== null || legacyScale !== null) {
    return {
      version: 1,
      font: mapLegacyFont(legacyFont),
      fontSize: legacyScale === null ? DEFAULT_APPEARANCE.fontSize : mapLegacyScale(legacyScale),
      guidance: true,
    };
  }
  return { ...DEFAULT_APPEARANCE };
}

export function persistAppearance(storage: AppearanceStore | null | undefined, appearance: Appearance): void {
  if (!storage) return;
  try {
    storage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch { /* non-fatal */ }
}
