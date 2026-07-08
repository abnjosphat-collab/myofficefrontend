// components/shared/theme.tsx — Shared light/dark theme system + glass design tokens
// Extracted from the homepage redesign so other pages (e.g. PPE) can opt into the same
// look: glassmorphism cards, an accent-colour palette, letter-by-letter text reveals,
// a pulsing icon, and a themed centered modal. Purely additive — existing pages that
// don't import this are completely unaffected.
'use client';

import { createContext, useContext, useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Hover-intent: distinguishes "just passing over" from "actually wants this open".
 * `openDelay` gates how long the pointer must dwell before `hovering` flips true;
 * `closeDelay` gives a grace window before it flips back false, so a quick mouse
 * slip off the element doesn't instantly collapse/close it.
 */
export function useHoverIntent(openDelay = 0, closeDelay = 400) {
  const [hovering, setHovering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onHoverStart = () => {
    if (timer.current) clearTimeout(timer.current);
    if (openDelay > 0) timer.current = setTimeout(() => setHovering(true), openDelay);
    else setHovering(true);
  };
  const onHoverEnd = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovering(false), closeDelay);
  };

  return { hovering, onHoverStart, onHoverEnd };
}

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
    textSecondary: light ? 'text-gray-500' : 'text-white/55',
    textTertiary: light ? 'text-gray-400' : 'text-white/35',
    textFaint: light ? 'text-gray-400' : 'text-white/40',
    textMuted: light ? 'text-gray-600' : 'text-white/70',
    border: light ? 'border-gray-200' : 'border-white/10',
    divide: light ? 'divide-gray-100' : 'divide-white/10',
    hoverBg: light ? 'hover:bg-gray-100' : 'hover:bg-white/10',
    hoverBgSoft: light ? 'hover:bg-gray-50' : 'hover:bg-white/[0.06]',
    hoverText: light ? 'hover:text-gray-900' : 'hover:text-white',
    groupHoverText: light ? 'group-hover:text-gray-900' : 'group-hover:text-white',
    chipBg: light ? 'bg-gray-100' : 'bg-white/10',
    inputBg: light
      ? 'bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-400'
      : 'bg-white/10 border border-white/10 text-white placeholder-white/40 focus:border-blue-300/50 focus:bg-white/15',
    trendUp: light ? 'text-emerald-600' : 'text-emerald-300',
    trendDown: light ? 'text-rose-600' : 'text-rose-300',
    ring: light ? 'ring-gray-100' : 'ring-slate-900/80',
    scrim: light ? 'bg-gray-900/10' : 'bg-slate-900/50',
    linkText: light ? 'text-blue-600' : 'text-blue-300',
    linkHover: light ? 'hover:text-blue-700' : 'hover:text-blue-200',
    pageBg: light ? 'bg-gray-50' : 'bg-slate-900',
  };
}

export type Theme = { light: boolean; toggle: () => void } & ReturnType<typeof themeClasses>;

export const ThemeContext = createContext<Theme>({ light: true, toggle: () => {}, ...themeClasses(true) });
export const useTheme = () => useContext(ThemeContext);

/** App-wide theme provider — mount once near the root (see components/Providers.tsx). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [light, setLight] = useState(true);
  const value = useMemo(() => ({ light, toggle: () => setLight(l => !l), ...themeClasses(light) }), [light]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
  violet:  { chip: 'bg-violet-50',  icon: 'text-violet-600',  text: 'text-violet-700',  gradient: 'from-violet-500 to-violet-700',   glow: 'hover:shadow-[0_20px_45px_-18px_rgba(124,58,237,0.4)]',   solidGlow: 'shadow-[0_16px_32px_-12px_rgba(124,58,237,0.4)]' },
};

/** RGBA strings for inline colored box-shadows (e.g. a centered modal's 3D glow). */
export const ACCENT_RGBA: Record<Accent, string> = {
  blue: 'rgba(37,99,235,0.35)',
  amber: 'rgba(217,119,6,0.35)',
  indigo: 'rgba(79,70,229,0.35)',
  emerald: 'rgba(5,150,105,0.35)',
  cyan: 'rgba(8,145,178,0.35)',
  violet: 'rgba(124,58,237,0.35)',
};

/** Hex equivalents of ACCENT_RGBA, for callers that need a plain hex (e.g. GlowCard/glowShadow). */
export const ACCENT_HEX: Record<Accent, string> = {
  blue: '#2563eb', amber: '#d97706', indigo: '#4f46e5',
  emerald: '#059669', cyan: '#0891b2', violet: '#7c3aed',
};

/** Converts a `#rrggbb`/`#rgb` hex string to an `rgba(...)` string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Colored 3D drop-shadow for an arbitrary hex accent (e.g. per-record type colors that don't fit the 6-value ACCENT enum). */
export function glowShadow(hex: string, alpha = 0.32): string {
  return `0 16px 32px -14px ${hexToRgba(hex, alpha)}`;
}

// ─── GlowCard — reusable elevated glass tile with a colored hover shadow ────
// The one shared "elegant card" primitive: glass surface, a neutral ambient shadow at
// rest, and a colored 3D glow that fades in on hover (driven by a hex color) instead of
// a colored border or stripe. Use this for any per-item card that needs an accent color
// that doesn't fit the 6-value ACCENT enum (e.g. per-type hex palettes).
export function GlowCard({
  color, className = '', onClick, children,
}: {
  color: string; className?: string; onClick?: () => void; children: ReactNode;
}) {
  const t = useTheme();
  return (
    <motion.div
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={onClick ? { scale: 0.985 } : undefined}
      variants={{
        rest: { y: 0, boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
        hover: { y: -3, boxShadow: `0 20px 40px -16px ${hexToRgba(color, 0.38)}` },
      }}
      transition={{ duration: 0.25 }}
      className={`${t.glassSoft} rounded-lg ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Motion variants ─────────────────────────────────────────────────────────

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Collapsible primitive (smooth height animation) ────────────────────────

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

// ─── Letter-by-letter animated text ─────────────────────────────────────────

const letterContainer = {
  rest: {},
  hover: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const letterItem = {
  rest: { opacity: 0, y: 4 },
  hover: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Animates text in letter-by-letter. `trigger="hover"` (default) relies on an ancestor
 * motion component driving `whileHover="hover"`/variants propagation (e.g. a hover card).
 * `trigger="mount"` self-plays once when the component mounts (e.g. inside a modal/popup
 * that mounts fresh each time it opens).
 */
export function AnimatedText({
  text, className, as = 'p', trigger = 'hover',
}: {
  text: string; className: string; as?: 'h4' | 'p' | 'h2'; trigger?: 'hover' | 'mount';
}) {
  const Tag = motion[as] as typeof motion.p;
  const mountProps = trigger === 'mount' ? { initial: 'rest', animate: 'hover' } : {};
  return (
    <Tag variants={letterContainer} className={className} aria-label={text} {...mountProps}>
      <span aria-hidden="true">
        {text.split('').map((ch, i) => (
          <motion.span key={i} variants={letterItem} className="inline-block whitespace-pre">
            {ch}
          </motion.span>
        ))}
      </span>
    </Tag>
  );
}

// ─── Pulsing icon (pops in on mount, then breathes periodically) ───────────

const iconPop = {
  hidden: { scale: 0.5, rotate: -8, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 16, delay: 0.15 } },
};

export function PulsingIcon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <motion.div variants={iconPop} className={className}>
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
        className="flex items-center justify-center"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Themed centered modal (replaces ad-hoc slide-overs / dark-only modals) ─

export function CenterModal({
  open, onClose, title, subtitle, accent = 'blue', width = 'max-w-md', children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  accent?: Accent; width?: string; children: ReactNode;
}) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${width} max-h-[85vh] ${t.glass} rounded-xl ${t.shadow} flex flex-col overflow-hidden`}
            style={{ boxShadow: `0 24px 60px -20px ${ACCENT_RGBA[accent]}, 0 8px 24px -10px rgba(0,0,0,0.3)` }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <div className={`relative px-5 py-4 border-b ${t.border} shrink-0 overflow-hidden`}>
              <div
                className={`absolute -top-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.gradient} opacity-[0.18] blur-2xl pointer-events-none`}
              />
              <button
                onClick={onClose}
                className={`absolute top-4 right-4 p-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
                type="button"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className={`relative font-semibold ${t.textPrimary} text-[13px] tracking-tight pr-10`}>{title}</h2>
              {subtitle && (
                <AnimatedText
                  as="p"
                  trigger="mount"
                  text={subtitle}
                  className={`relative ${t.textSecondary} text-[11px] mt-0.5 pr-10`}
                />
              )}
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
