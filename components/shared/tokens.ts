// Shared glassmorphism design tokens — import these instead of repeating strings in every page

// ── Form inputs ───────────────────────────────────────────────────────────────
export const GIN =
  'w-full px-3 py-2 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 focus:bg-white/[0.10] text-sm focus:outline-none transition-all';

export const LBL =
  'text-[11px] text-white/50 uppercase tracking-wider font-medium mb-1';

export const GLASS_INPUT =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all';

export const GLASS_LABEL = 'text-xs font-medium text-white/55 mb-1 block';

export const GLASS_TEXTAREA =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.11] transition-all resize-none';

export const GLASS_SELECT =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/[0.07] border border-white/[0.12] text-white focus:outline-none focus:border-white/30 transition-all cursor-pointer';

// ── Buttons ───────────────────────────────────────────────────────────────────
export const PRIMARY_BTN =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none';

export const SECONDARY_BTN =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] transition-all';

export const DANGER_BTN =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all disabled:opacity-60';

// ── Brand colours ─────────────────────────────────────────────────────────────
export const BRAND = {
  primary: '#2A4D69',
  skyBlue: '#86BBD8',
  seafoam: '#78C0A6',
  slate:   '#6B7B8E',
  amber:   '#F5A623',
  violet:  '#9B87B5',
} as const;
