// components/shared/design-system/primitives.tsx — shared React components built
// on top of tokens.ts/motion.ts/color.ts. See MyOffice-Design-System.docx Section 10
// for a quick-reference table of what each of these is for.
'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode, type ElementType, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus } from './icons';
import { useTheme, ACCENT, ACCENT_RGBA, type Accent } from './tokens';
import { hexToRgba } from './color';
import { fadeTextVariant, iconPop } from './motion';

// ─── useScrollEdgeFlash / ScrollEdgeGlow — the sidebar's "hit the top/bottom of
// the list" gradient flash (`SidebarNavigation.tsx`), extracted so any other
// scrollable list can get the same depth cue. Wire `onScroll` onto the
// scrollable element and render `<ScrollEdgeGlow edge={edge} />` (top) /
// `edge="bottom"` inside it, positioned `sticky top-0`/`sticky bottom-0` at
// the respective end — see `SelectField`/`Combobox` below for the reference
// usage inside a portal-rendered dropdown panel.
export function useScrollEdgeFlash() {
  const [edge, setEdge] = useState<'top' | 'bottom' | null>(null);
  const flash = useCallback((e: 'top' | 'bottom') => {
    setEdge(e);
    window.setTimeout(() => setEdge(prev => (prev === e ? null : prev)), 550);
  }, []);
  const onScroll = useCallback((ev: React.UIEvent<HTMLElement>) => {
    const el = ev.currentTarget;
    if (el.scrollTop <= 0) flash('top');
    else if (el.scrollHeight - el.scrollTop - el.clientHeight <= 1) flash('bottom');
  }, [flash]);
  return { edge, onScroll };
}

export function ScrollEdgeGlow({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`pointer-events-none sticky ${edge === 'top' ? 'top-0 -mb-6' : 'bottom-0 -mt-6'} left-0 right-0 h-6 z-10`}
        style={{ background: edge === 'top' ? `linear-gradient(to bottom, ${ACCENT_RGBA.blue}, transparent)` : `linear-gradient(to top, ${ACCENT_RGBA.blue}, transparent)` }}
      />
    </AnimatePresence>
  );
}

// (The former custom `SmartphoneFilled` SVG was removed — the "call"/phone-number
// affordance now uses the shared icon module's `Phone` glyph (Phosphor DeviceMobile,
// a solid smartphone at the default 'fill' weight), so it participates in the global
// solid/outline toggle like every other icon instead of being a hardcoded solid SVG.)

/**
 * Hover-intent: distinguishes "just passing over" from "actually wants this open".
 * `openDelay` gates how long the pointer must dwell before `hovering` flips true;
 * `closeDelay` gives a grace window before it flips back false, so a quick mouse
 * slip off the element doesn't instantly collapse/close it.
 *
 * NOTE: not currently used anywhere — the homepage's category/sidebar disclosure
 * tried hover-expand via this hook and reverted to click-only because it fought
 * with mouse-wheel scrolling over a scrollable list (see design doc Section 5).
 * Kept for a future non-scrolling hover-reveal case; don't reintroduce it on a
 * scrollable list/tree without re-solving that conflict first.
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

/**
 * Fades text in as a whole block. `trigger="hover"` (default) relies on an ancestor
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
    <Tag variants={fadeTextVariant} className={className} {...mountProps}>
      {text}
    </Tag>
  );
}

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

// ─── GlowCard — reusable elevated glass tile with a colored hover shadow ────
// The one shared "elegant card" primitive: glass surface, a neutral ambient shadow at
// rest, and a colored 3D glow that fades in on hover (driven by a hex color) instead of
// a colored border or stripe. Use this for ANY per-item card that needs a hover-lift
// affordance — do not hand-roll `hover:-translate-y-*` + custom shadow classes on a
// plain <div>; every such card in the app should be a GlowCard.
//
// PITFALL (seen twice already — see app/pachedu and app/employees history): don't stack
// a heavy `border-l-4`/`border-t-2` accent border in saturated color on top of a
// GlowCard just to show a per-item status/category color. The bold border visually
// drowns out the subtle glow/lift, defeating the point of using GlowCard at all. Prefer
// passing that status color as `color` (it becomes the hover glow tint) and, only if a
// persistent at-rest cue is truly needed, use a thin `border-l-2`/`border-t-2` at reduced
// opacity (~40-50%) instead of the full-strength border-l-4/border-2 default.
//
// Use this for any per-item card that needs an accent color that doesn't fit the
// 6-value ACCENT enum (e.g. per-type hex palettes).
export function GlowCard({
  color, className = '', surface, onClick, onHoverStart, onHoverEnd, forceGlow = false, elevated = false, style, children,
}: {
  color: string; className?: string; onClick?: () => void; children: ReactNode;
  /** Optional passthrough if a caller also needs raw hover state (e.g. to expand content on hover). */
  onHoverStart?: () => void; onHoverEnd?: () => void;
  /** Shows the hover glow at rest too — for persistent states (e.g. an alert) that shouldn't need a hover to be visible. */
  forceGlow?: boolean;
  /** Vivid rest shadows: a deeper drop shadow plus a hint of the card's accent glow
   * before any hover, so tiles read as raised, tappable objects while scanning the
   * grid. Position at rest is unchanged — only the hover moves the card. */
  elevated?: boolean;
  /** Override the default `glassSoft rounded-lg` surface (e.g. a heavier `glass rounded-2xl` panel-style card). */
  surface?: string;
  /** Static inline style passthrough (e.g. a per-item `borderTopColor`) — merged with, not
   * replacing, the animated `boxShadow`/`y` this component already manages. */
  style?: CSSProperties;
}) {
  const t = useTheme();
  return (
    <motion.div
      onClick={onClick}
      style={style}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      initial="rest"
      animate={forceGlow ? 'hover' : 'rest'}
      whileHover="hover"
      whileTap={onClick ? { scale: 0.985 } : undefined}
      variants={{
        rest: {
          y: 0,
          boxShadow: [
            `inset 0 1.5px 0 0 ${t.light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.14)'}`,
            `inset 0 -1.5px 0 0 ${t.light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.5)'}`,
            `inset 1px 0 0 0 ${t.light ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
            `inset -1px 0 0 0 ${t.light ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)'}`,
            elevated
              ? `0 10px 24px -8px ${t.light ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.60)'}`
              : `0 4px 10px -4px ${t.light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.4)'}`,
            elevated ? `0 16px 34px -14px ${hexToRgba(color, t.light ? 0.32 : 0.42)}` : '0 26px 48px -18px rgba(0,0,0,0)',
          ].join(', '),
        },
        hover: {
          y: forceGlow ? 0 : elevated ? -6 : -5,
          boxShadow: [
            `inset 0 1.5px 0 0 ${t.light ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.22)'}`,
            `inset 0 -1.5px 0 0 ${t.light ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.6)'}`,
            `inset 1px 0 0 0 ${t.light ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.1)'}`,
            `inset -1px 0 0 0 ${t.light ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.4)'}`,
            `0 10px 40px 4px ${hexToRgba(color, 0.28)}`,
            `0 26px 48px -18px ${hexToRgba(color, 0.4)}`,
          ].join(', '),
          // The lift (`y`) should feel immediate — it's the primary "this is
          // interactive" cue. The glow (`boxShadow`) fades in slowly on its own
          // schedule, and any text-emerge animation inside the card (see
          // fadeTextVariant in motion.ts) is delayed further still — the three
          // should read as a sequence, not one single simultaneous jump.
          transition: {
            y: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            boxShadow: { duration: 1.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] },
          },
        },
      }}
      transition={{ duration: 0.25 }}
      className={`${surface ?? `${t.glassSoft} rounded-lg`} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── CountUp — plays once on mount (or when `value` changes), after an optional delay.
// Promoted from the homepage hero stat strip so any page's KPI/metric numbers can use
// the same eased count-up instead of a plain static number.
export function CountUp({ value, suffix = '', delay = 0, duration = 1 }: { value: number; suffix?: string; delay?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const decimals = Number.isInteger(value) ? 0 : (String(value).split('.')[1]?.length ?? 0);

  useEffect(() => {
    let raf: number;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }
      const progress = Math.min(1, elapsed);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, duration]);

  return <>{display.toFixed(decimals)}{suffix}</>;
}

// ─── EmptyState — the "nothing here yet" block every records panel across the app
// was hand-rolling (icon in a chip, title, message, optional CTA). One definition.
export function EmptyState({
  icon: Icon, title, message, action,
}: {
  icon: ElementType; title: string; message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const t = useTheme();
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className={`${t.chipBg} p-4 rounded-2xl mb-3`}><Icon className={`h-7 w-7 ${t.textFaint}`} /></div>
      <div className={`text-sm font-medium ${t.textMuted}`}>{title}</div>
      {message && <div className={`text-xs mt-1 mb-4 max-w-xs ${t.textFaint}`}>{message}</div>}
      {action && (
        <button type="button" onClick={action.onClick}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
          <Plus className="h-3.5 w-3.5" /> {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Themed centered modal (replaces ad-hoc slide-overs / dark-only modals) ─
// Radix's headless Dialog primitives sit underneath the exact same visual output
// this had before (2026-08-29, UI foundation hardening plan, Phase 3 — see
// audit/07-ui-polish-findings.md) — no call site needs to change, and there is no
// visual diff, only new behavior: real focus trapping, Escape-to-close, portal
// rendering, and role="dialog"/aria-modal, none of which this had previously.
// `asChild` on Dialog.Overlay/Content/Title composes Radix's behavior directly onto
// the existing motion.div/h2 elements rather than adding a wrapper that would
// change the DOM shape (and therefore the CSS this file already relies on).
export function CenterModal({
  open, onClose, title, subtitle, accent = 'violet', width = 'max-w-md', children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  accent?: Accent; width?: string; children: ReactNode;
}) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* No Dialog.Description — subtitle (when present) isn't a fixed
                  element Radix's Slot can compose onto (AnimatedText doesn't forward
                  refs/extra props), so aria-describedby is explicitly suppressed
                  rather than left to warn about a missing one. */}
              <Dialog.Content
                asChild
                aria-describedby={undefined}
                onEscapeKeyDown={e => {
                  // Radix's Escape handling runs on a document-level listener
                  // independent of React's synthetic event bubble chain — a
                  // descendant field calling stopPropagation on its own onKeyDown
                  // does NOT reach this (confirmed empirically: it did not stop the
                  // modal closing before this fix). The correct interception point is
                  // here. If Escape's target is a field that owns its own open
                  // dropdown (SelectField/Combobox/PredictiveInput all set
                  // aria-expanded="true" on themselves while open), let that field's
                  // own handler close just its dropdown and cancel the modal's
                  // default close-on-Escape for this one keypress; a second Escape
                  // (now aria-expanded="false") closes the modal normally.
                  const target = e.target as HTMLElement | null;
                  if (target?.getAttribute('aria-expanded') === 'true') e.preventDefault();
                }}
              >
                <motion.div
                  className={`relative w-full ${width} max-h-[85vh] ${t.glass} rounded-xl ${t.shadow} flex flex-col overflow-hidden focus:outline-none`}
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
                    <Dialog.Close asChild>
                      <button
                        className={`absolute top-2.5 right-2.5 h-10 w-10 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
                        type="button"
                        aria-label="Close"
                        title="Close"
                      >
                        <X className="h-5 w-5 pointer-events-none" />
                      </button>
                    </Dialog.Close>
                    <Dialog.Title asChild>
                      <h2 className={`relative font-semibold ${t.textPrimary} text-[13px] tracking-tight pr-14`}>{title}</h2>
                    </Dialog.Title>
                    {subtitle && (
                      <AnimatedText
                        as="p"
                        trigger="mount"
                        text={subtitle}
                        className={`relative ${t.textSecondary} text-[11px] mt-0.5 pr-14`}
                      />
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">{children}</div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
