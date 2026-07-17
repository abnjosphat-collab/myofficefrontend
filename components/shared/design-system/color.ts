// components/shared/design-system/color.ts — the one hex/rgba color-math module.
// Previously this logic existed twice: `hexToRgba` here, and a near-identical
// hand-rolled parser (`hexToRgbTuple`/`blendRgb`/`rgbaString`/`isValidHex`/
// `rgbaFromHexSafe`) duplicated inside app/page.tsx purely to support the
// background-accent wash. Consolidated here so there is exactly one hex parser.

/** Default accent used whenever a caller passes an invalid/missing hex. Aligned with
 *  the app's richer-purple brand accent (ACCENT_HEX.violet) so the background wash and
 *  the action color share the same purple. */
export const DEFAULT_BG_ACCENT = '#9333ea';

export function hexToRgbTuple(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isValidHex(hex: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex);
}

/** Blends an [r,g,b] tuple toward white or black, 0–1 strength. */
export function blendRgb([r, g, b]: [number, number, number], target: 'white' | 'black', amount: number): [number, number, number] {
  const t = target === 'white' ? 255 : 0;
  const mix = (c: number) => Math.round(c + (t - c) * amount);
  return [mix(r), mix(g), mix(b)];
}

export function rgbString([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

export function rgbaString([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Converts a `#rrggbb`/`#rgb` hex string directly to an `rgba(...)` string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  return rgbaString(hexToRgbTuple(hex), alpha);
}

/** rgba() for a hex accent, falling back to `DEFAULT_BG_ACCENT` if the value isn't a valid hex. */
export function rgbaFromHexSafe(hex: string, alpha: number): string {
  const safe = isValidHex(hex) ? hex : DEFAULT_BG_ACCENT;
  return hexToRgba(safe, alpha);
}

/** Colored 3D drop-shadow for an arbitrary hex accent (e.g. per-record type colors that don't fit the 6-value ACCENT enum). */
export function glowShadow(hex: string, alpha = 0.32): string {
  return `0 16px 32px -14px ${hexToRgba(hex, alpha)}`;
}

/** Derives the light-mode page gradient and dark-mode wash from any hex accent. */
export function bgLayersFromHex(hex: string) {
  const safe = isValidHex(hex) ? hex : DEFAULT_BG_ACCENT;
  const rgb = hexToRgbTuple(safe);
  const light = `linear-gradient(160deg, ${rgbString(blendRgb(rgb, 'white', 0.96))} 0%, ${rgbString(blendRgb(rgb, 'white', 0.90))} 45%, ${rgbString(blendRgb(rgb, 'white', 0.93))} 100%)`;
  const darkBase = blendRgb(rgb, 'black', 0.6);
  const darkDeep = blendRgb(rgb, 'black', 0.75);
  const darkWash = `linear-gradient(to bottom, ${rgbaString(darkBase, 0.68)}, ${rgbaString(darkBase, 0.46)}, ${rgbaString(darkDeep, 0.8)})`;
  return { light, darkWash };
}
