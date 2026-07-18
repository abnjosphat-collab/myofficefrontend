// components/shared/design-system/tokens.ts — light/dark theme tokens, the accent
// palette, and the type/spacing/radius scale. This is the canonical source every
// page should read colors and sizing from — see MyOffice-Design-System.docx.
'use client';

import { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';

// ─── Glass surface classes (dark mode — frosted cards over photo/dark background) ──

const GLASS = 'bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12]';
const GLASS_SOFT = 'bg-white/[0.05] backdrop-blur-xl border border-white/10';
const SHADOW_AMBIENT = 'shadow-[0_1px_1px_rgba(0,0,0,0.08),0_16px_32px_-20px_rgba(0,0,0,0.55)]';

// ─── Light theme ("white mode") equivalents ─────────────────────────────────

const LIGHT_GLASS = 'bg-white border border-gray-200';
const LIGHT_GLASS_SOFT = 'bg-white border border-gray-100';
const LIGHT_SHADOW = 'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_16px_-10px_rgba(0,0,0,0.08)]';

export function themeClasses(light: boolean) {
  return {
    glass: light ? LIGHT_GLASS : GLASS,
    glassSoft: light ? LIGHT_GLASS_SOFT : GLASS_SOFT,
    shadow: light ? LIGHT_SHADOW : SHADOW_AMBIENT,
    textPrimary: light ? 'text-gray-900' : 'text-white',
    // Light-mode text/icons were washing out (gray-400/500 read as faint gray, not
    // black) — darkened one step each for legibility. Dark mode is unchanged.
    textSecondary: light ? 'text-gray-600' : 'text-white/55',
    textTertiary: light ? 'text-gray-500' : 'text-white/35',
    textFaint: light ? 'text-gray-500' : 'text-white/40',
    textMuted: light ? 'text-gray-700' : 'text-white/70',
    border: light ? 'border-gray-200' : 'border-white/10',
    divide: light ? 'divide-gray-100' : 'divide-white/10',
    hoverBg: light ? 'hover:bg-gray-100' : 'hover:bg-white/10',
    hoverBgSoft: light ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]',
    hoverText: light ? 'hover:text-gray-900' : 'hover:text-white',
    groupHoverText: light ? 'group-hover:text-gray-900' : 'group-hover:text-white',
    chipBg: light ? 'bg-gray-100' : 'bg-white/10',
    inputBg: light
      ? 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-brand-400'
      : 'bg-white/10 border border-white/10 text-white placeholder-white/40 focus:border-brand-300/50 focus:bg-white/15',
    trendUp: light ? 'text-emerald-600' : 'text-emerald-300',
    trendDown: light ? 'text-rose-600' : 'text-rose-300',
    ring: light ? 'ring-gray-100' : 'ring-slate-900/80',
    scrim: light ? 'bg-gray-900/10' : 'bg-slate-900/50',
    linkText: light ? 'text-brand-600' : 'text-brand-300',
    linkHover: light ? 'hover:text-brand-700' : 'hover:text-brand-200',
    pageBg: light ? 'bg-gray-50' : 'bg-slate-900',
  };
}

export type Theme = { light: boolean; toggle: () => void } & ReturnType<typeof themeClasses>;

export const ThemeContext = createContext<Theme>({ light: true, toggle: () => {}, ...themeClasses(true) });
export const useTheme = () => useContext(ThemeContext);

/** App-wide theme provider — mount once near the root (see components/Providers.tsx). */
export const THEME_KEY = 'myoffice_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts light on the server and on the first client render so hydration matches
  // the prerendered HTML; the inline script in app/layout.tsx has already set the
  // real theme on <html> before paint, so there's no flash — this effect just
  // brings React's state into line with it.
  const [light, setLight] = useState(true);
  useEffect(() => {
    if (localStorage.getItem(THEME_KEY) === 'dark') setLight(false);
  }, []);

  const value = useMemo(() => ({
    light,
    toggle: () => setLight(l => {
      const next = !l;
      localStorage.setItem(THEME_KEY, next ? 'light' : 'dark');
      return next;
    }),
    ...themeClasses(light),
  }), [light]);
  // Reflect the current mode onto the root element so plain CSS (globals.css) can branch
  // on it too — e.g. native <select>/<option> styling, which can't read React context.
  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    // ALSO toggle the `.dark` class. globals.css defines the entire dark palette
    // (--background, --card, --popover, --border, every --sidebar-*) under a
    // `.dark` selector, but nothing ever added that class — so `body { bg-background }`
    // stayed near-white in dark mode. All the glass surfaces are translucent white
    // meant to sit on a dark page, so on a white body they washed out and the violet
    // ambient glows bled through: the whole app went flat purple.
    document.documentElement.classList.toggle('dark', !light);
  }, [light]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Body-typeface preference (one-click font switcher), persisted ────────────────
// Four modern options; each maps to a next/font/google CSS variable set up in
// app/layout.tsx (System skips the webfont entirely — it's the OS's own UI font,
// which is what the whole app rendered as before Inter was ever wired up, and the
// look this defaults back to). Headings stay on Montserrat regardless — see the
// h1–h6 rule in globals.css — this only ever changes body/paragraph copy.
export type FontChoice = 'system' | 'inter' | 'manrope' | 'jakarta' | 'sora';
const FONT_KEY = 'oz_bodyFont';

export const FONT_OPTIONS: { id: FontChoice; label: string; cssVar: string | null; sample: string }[] = [
  { id: 'system', label: 'System',      cssVar: null,               sample: 'ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { id: 'inter',  label: 'Inter',       cssVar: 'var(--font-body)', sample: 'var(--font-body)' },
  { id: 'manrope', label: 'Manrope',    cssVar: 'var(--font-manrope)', sample: 'var(--font-manrope)' },
  { id: 'jakarta', label: 'Jakarta Sans', cssVar: 'var(--font-jakarta)', sample: 'var(--font-jakarta)' },
  { id: 'sora',   label: 'Sora',        cssVar: 'var(--font-sora)', sample: 'var(--font-sora)' },
];

type FontStyleContextValue = { font: FontChoice; setFont: (f: FontChoice) => void };
const FontStyleContext = createContext<FontStyleContextValue>({ font: 'system', setFont: () => {} });
export const useFontStyle = () => useContext(FontStyleContext);

/** App-wide body-typeface provider — mount once near the root (components/Providers.tsx).
 *  Sets the `--font-active` CSS variable globals.css's `body` rule reads, so switching
 *  is instant and every page shares exactly one typeface at a time (the thing that was
 *  broken before: some elements had an explicit font, most silently fell back). */
export function FontStyleProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontChoice>('system');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_KEY) as FontChoice | null;
      if (saved && FONT_OPTIONS.some(o => o.id === saved)) setFontState(saved);
    } catch { /* storage unavailable — keep default */ }
  }, []);
  useEffect(() => {
    const opt = FONT_OPTIONS.find(o => o.id === font);
    // Set on <body> itself, not <html> — Tailwind v4's @theme engine treats any
    // `--font-*`-prefixed custom property as a non-inheriting theme token, so a value
    // set on the root element never reaches descendants. Setting it directly on the
    // element the `body { font-family: var(--font-active, …) }` rule targets sidesteps
    // that entirely (no inheritance needed).
    document.body.style.setProperty('--font-active', opt?.cssVar ?? 'ui-sans-serif, system-ui, -apple-system, sans-serif');
    document.documentElement.dataset.font = font;
  }, [font]);
  const setFont = (f: FontChoice) => {
    setFontState(f);
    try { localStorage.setItem(FONT_KEY, f); } catch { /* non-fatal */ }
  };
  const value = useMemo<FontStyleContextValue>(() => ({ font, setFont }), [font]);
  return <FontStyleContext.Provider value={value}>{children}</FontStyleContext.Provider>;
}

// ─── Accent colour palette (shared across pages for consistent theming) ────

export type Accent = 'blue' | 'amber' | 'indigo' | 'emerald' | 'cyan' | 'violet';

export const ACCENT: Record<Accent, {
  chip: string; icon: string; text: string; gradient: string; glow: string; solidGlow: string;
}> = {
  blue:    { chip: 'bg-blue-50',    icon: 'text-blue-600',    text: 'text-blue-700',    gradient: 'from-blue-500 to-blue-700',       glow: 'hover:shadow-[0_20px_45px_-18px_rgba(37,99,235,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(37,99,235,0.4)]' },
  amber:   { chip: 'bg-amber-50',   icon: 'text-amber-600',   text: 'text-amber-700',   gradient: 'from-amber-500 to-amber-700',     glow: 'hover:shadow-[0_20px_45px_-18px_rgba(217,119,6,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(217,119,6,0.4)]' },
  indigo:  { chip: 'bg-indigo-50',  icon: 'text-indigo-600',  text: 'text-indigo-700',  gradient: 'from-indigo-500 to-indigo-700',   glow: 'hover:shadow-[0_20px_45px_-18px_rgba(79,70,229,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(79,70,229,0.4)]' },
  emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-700', glow: 'hover:shadow-[0_20px_45px_-18px_rgba(5,150,105,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(5,150,105,0.4)]' },
  cyan:    { chip: 'bg-cyan-50',    icon: 'text-cyan-600',    text: 'text-cyan-700',    gradient: 'from-cyan-500 to-cyan-700',       glow: 'hover:shadow-[0_20px_45px_-18px_rgba(8,145,178,0.4)]',    solidGlow: 'shadow-[0_16px_32px_-12px_rgba(8,145,178,0.4)]' },
  // "violet" is the app's default brand/action accent — it reads from the central
  // `brand` color scale (globals.css --brand-*), so it and every page swept to
  // `brand-*` share ONE definition. Re-theme by editing --brand-* in one place.
  violet:  { chip: 'bg-brand-50',   icon: 'text-brand-600',   text: 'text-brand-700',   gradient: 'from-brand-500 to-brand-700',     glow: 'hover:shadow-[0_20px_45px_-18px_rgba(147,51,234,0.45)]',  solidGlow: 'shadow-[0_16px_32px_-12px_rgba(147,51,234,0.45)]' },
};

/** RGBA strings for inline colored box-shadows (e.g. a centered modal's 3D glow). */
export const ACCENT_RGBA: Record<Accent, string> = {
  blue: 'rgba(37,99,235,0.35)',
  amber: 'rgba(217,119,6,0.35)',
  indigo: 'rgba(79,70,229,0.35)',
  emerald: 'rgba(5,150,105,0.35)',
  cyan: 'rgba(8,145,178,0.35)',
  violet: 'rgba(147,51,234,0.35)',
};

/** Hex equivalents of ACCENT_RGBA, for callers that need a plain hex (e.g. GlowCard/glowShadow). */
export const ACCENT_HEX: Record<Accent, string> = {
  blue: '#2563eb', amber: '#d97706', indigo: '#4f46e5',
  emerald: '#059669', cyan: '#0891b2', violet: '#9333ea',
};

// ─── Type scale ──────────────────────────────────────────────────────────────
// Named steps mapped to the exact pixel values already in use on the homepage
// (see MyOffice-Design-System.docx Section 2). Use these instead of guessing a
// Tailwind step or picking a new arbitrary text-[Npx] value.
export const TYPE_SCALE = {
  caption: 'text-[10.5px]',  // module-card descriptions, tips body copy
  label: 'text-[11px]',      // uppercase section headers, badges
  body: 'text-[12.5px]',     // card titles, row copy, quick-view descriptions
  input: 'text-[13px]',      // search/text inputs, category titles
  title: 'text-[14px]',      // section/category titles, nav wordmark
  subtitle: 'text-[15px]',   // hero subtitle paragraph
  stat: 'text-[20px]',       // hero stat numbers
  statLarge: 'text-[28px]',  // KPI card value
  hero: 'text-[32px] sm:text-[42px]', // hero title
} as const;

// ─── Spacing / radius scale ──────────────────────────────────────────────────
// The app's actual working increments (see MyOffice-Design-System.docx Section 11
// "Cheat Sheet") rather than the full default Tailwind spacing scale.
export const SPACING = {
  xs: 'gap-1.5',   // icon-row gaps, chip internal padding
  sm: 'gap-2.5',   // sidebar row / card internal gaps
  md: 'gap-3',     // module-grid gaps
  lg: 'gap-4',     // section gaps
  section: 'space-y-3', // vertical rhythm between stacked sections
  /** Standard comfortable padding for any "info display" card (module tiles, quick-view
   * popup cards, etc.) — keeps text clear of the card edge on every side. Reuse this
   * instead of picking a one-off p-* value per card. */
  cardPad: 'p-4',
  /** Standard gap between a card's title and its description line underneath it. */
  cardTextGap: 'mt-1',
} as const;

export const RADIUS = {
  input: 'rounded',        // search input
  chip: 'rounded-md',      // icon buttons, small chips
  tile: 'rounded-lg',      // module tiles, text inputs
  panel: 'rounded-xl',     // panels, modal inner surfaces
  card: 'rounded-2xl',     // category cards, sidebar rows
  pill: 'rounded-full',    // toggle circles, avatars, badges
} as const;
