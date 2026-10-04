/** Dallaglio semantic tokens — Tools language, independent of Classic glass. */

export const DALLAGLIO_LIGHT = {
  glass: 'bg-[var(--d-surface,#fff)] border border-[var(--d-line,#ccd7d1)]',
  glassSoft: 'bg-[var(--d-surface,#fff)] border border-[var(--d-line,#ccd7d1)]',
  glassPopover: 'bg-[var(--d-surface,#fff)] border border-[var(--d-line,#ccd7d1)]',
  shadow: 'shadow-[0_3px_10px_-7px_rgba(41,38,55,0.22)]',
  textPrimary: 'text-[var(--d-ink,#1b2923)]',
  textSecondary: 'text-[var(--d-ink-muted,#5b6d64)]',
  textTertiary: 'text-[var(--d-ink-muted,#5b6d64)]',
  textFaint: 'text-[var(--d-ink-subtle,#5b6d64)]',
  textMuted: 'text-[var(--d-ink-muted,#5b6d64)]',
  border: 'border-[var(--d-line,#ccd7d1)]',
  divide: 'divide-[var(--d-line,#ccd7d1)]',
  hoverBg: 'hover:bg-[var(--d-soft,#e2e9e5)]',
  hoverBgSoft: 'hover:bg-[var(--d-canvas,#f4f6f5)]',
  hoverText: 'hover:text-[var(--d-accent,#233b31)]',
  groupHoverText: 'group-hover:text-[var(--d-accent,#233b31)]',
  chipBg: 'bg-[var(--d-soft,#e2e9e5)]',
  inputBg: 'bg-[var(--d-canvas,#f4f6f5)] border border-[var(--d-line,#ccd7d1)] text-[var(--d-ink,#1b2923)] placeholder-[var(--d-ink-muted,#5b6d64)] focus:bg-[var(--d-surface,#fff)] focus:border-[var(--d-accent,#233b31)]',
  trendUp: 'text-[var(--d-success,#27705a)]',
  trendDown: 'text-[var(--d-danger,#c73b46)]',
  ring: 'ring-[var(--d-accent-soft,#e0ebe5)]',
  scrim: 'bg-[rgba(27,22,43,0.38)]',
  linkText: 'text-[var(--d-accent,#233b31)]',
  linkHover: 'hover:text-[#2c4d40]',
  pageBg: 'bg-[var(--d-canvas,#f4f6f5)]',
  cta: 'bg-[var(--d-accent,#233b31)] text-[var(--d-accent-ink,#fff)] hover:brightness-105 shadow-[0_3px_9px_rgba(118,82,197,0.18)]',
  ctaDanger: 'bg-[var(--d-danger,#c73b46)] text-white hover:brightness-105',
} as const;

export const DALLAGLIO_DARK = {
  glass: 'bg-[var(--d-surface,#111113)] border border-[var(--d-line,#2d2d32)]',
  glassSoft: 'bg-[var(--d-surface,#111113)] border border-[var(--d-line,#2d2d32)]',
  glassPopover: 'bg-[var(--d-surface,#111113)] border border-[var(--d-line,#2d2d32)]',
  shadow: 'shadow-[0_3px_10px_-7px_rgba(0,0,0,0.55)]',
  textPrimary: 'text-[var(--d-ink,#f7f7f8)]',
  textSecondary: 'text-[var(--d-ink-muted,#aaaab2)]',
  textTertiary: 'text-[var(--d-ink-muted,#aaaab2)]',
  textFaint: 'text-[var(--d-ink-subtle,#aaaab2)]',
  textMuted: 'text-[var(--d-ink-muted,#aaaab2)]',
  border: 'border-[var(--d-line,#2d2d32)]',
  divide: 'divide-[var(--d-line,#2d2d32)]',
  hoverBg: 'hover:bg-[var(--d-soft,#1b1b1f)]',
  hoverBgSoft: 'hover:bg-[var(--d-soft,#1b1b1f)]',
  hoverText: 'hover:text-[var(--d-accent,#f7f7f8)]',
  groupHoverText: 'group-hover:text-[var(--d-accent,#f7f7f8)]',
  chipBg: 'bg-[var(--d-soft,#1b1b1f)]',
  inputBg: 'bg-[var(--d-canvas,#09090b)] border border-[var(--d-line,#2d2d32)] text-[var(--d-ink,#f7f7f8)] placeholder-[var(--d-ink-muted,#aaaab2)] focus:bg-[var(--d-surface,#111113)] focus:border-[var(--d-accent,#f7f7f8)]',
  trendUp: 'text-[var(--d-success,#91d4b8)]',
  trendDown: 'text-[var(--d-danger,#e08a90)]',
  ring: 'ring-[var(--d-accent-soft,#202024)]',
  scrim: 'bg-black/55',
  linkText: 'text-[var(--d-accent,#f7f7f8)]',
  linkHover: 'hover:text-white',
  pageBg: 'bg-[var(--d-canvas,#09090b)]',
  cta: 'bg-[var(--d-accent,#f7f7f8)] text-[var(--d-accent-ink,#111113)] hover:bg-white shadow-[0_3px_9px_rgba(255,255,255,0.12)]',
  ctaDanger: 'bg-[var(--d-danger,#c73b46)] text-white hover:brightness-105',
} as const;

/** Returns semantic utility classes for the active Dallaglio color scheme. */
export function dallaglioClasses(light: boolean) {
  return light ? { ...DALLAGLIO_LIGHT } : { ...DALLAGLIO_DARK };
}
