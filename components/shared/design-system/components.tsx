// components/shared/design-system/components.tsx — reusable, generic UI components
// generalized from patterns proven on the homepage and PPE page. This is the layer
// every migrating page should import from instead of writing its own version of
// "a hero header," "a status pill," "a form field," etc. See the design-system
// migration plan for the full rationale (page-local reinvention is the exception,
// not the default).
'use client';

import { useState, useRef, useEffect, useCallback, useId, type ReactNode, type ElementType, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion } from 'framer-motion';
// Icons come from the shared icon module (Phosphor-backed, solid/outline toggle-aware) —
// not directly from lucide — so shared components render in the same icon family/style
// as the rest of the app.
import { ChevronRight, ChevronDown, Loader2, Check, SearchIcon, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from './icons';
import { useTheme, ACCENT, ACCENT_HEX, SPACING, type Accent } from './tokens';
import { getInputSuggestions, recordInput } from '@/lib/inputHistory';
import { GlowCard, PulsingIcon, AnimatedText, Collapse, CountUp, useScrollEdgeFlash, ScrollEdgeGlow } from './primitives';
import { tileIconItem, tileTextContainer, tileTextItem, staggerContainer, fadeUp } from './motion';

// ─── useCollapseSection — drop-in replacement for the legacy usePageCollapse ────
// Same shape (`sections.expanded.key`, `sections.toggle('key')`) so call sites
// migrating off the old shared hook don't need to change how they read/toggle state.
export function useCollapseSection(initial: Record<string, boolean>) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initial);
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  const allOpen = Object.values(expanded).every(Boolean);
  const toggleAll = () => setExpanded(Object.fromEntries(Object.keys(expanded).map(k => [k, !allOpen])));
  return { expanded, toggle, allOpen, toggleAll };
}

// ─── Spinner / LoadingState — the one shared loading indicator ──────────────────
// Replaces ~53 hand-rolled `border-2 border-t-transparent rounded-full animate-spin`
// divs scattered across pages. Spinner is the bare ring; LoadingState centers it with
// an optional label for a whole-panel loading state.
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin align-[-0.125em] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  const t = useTheme();
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${t.textFaint} ${className}`}>
      <Spinner size={22} className="text-brand-500" />
      {label && <span className="text-[12.5px]">{label}</span>}
    </div>
  );
}

// ─── StatusBadge — generalizes PPE's ConditionBadge/PPEStatusBadge ──────────────
export function StatusBadge({ color, label, dot = false }: { color: string; label: string; dot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}22`, border: `1px solid ${color}40` }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}

// ─── CardIconButton — the small overlay action buttons that float on cards ──────
// A single elegant treatment for the icon buttons that sit on card corners (pin to
// favorites / quick actions, quick-view, dismiss, remove). Replaces the old bare
// `p-1 rounded-md hover:bg` icons with a glassy, bordered control that lifts on hover
// and shows a clear tinted "active" state. Reused across the homepage module cards,
// quick-action cards and anywhere else a card needs corner actions, so they all match.
export function CardIconButton({
  icon: Icon, onClick, title, active = false, activeHex, filled = false,
}: {
  icon: ElementType; onClick: (e: React.MouseEvent) => void; title: string;
  /** Toggle state — when true the button reads as "on" using `activeHex`. */
  active?: boolean;
  /** Accent colour (hex) for the active state; falls back to blue. */
  activeHex?: string;
  /** Render the glyph filled (e.g. a bookmark that's been pinned). */
  filled?: boolean;
}) {
  const t = useTheme();
  const hex = activeHex ?? ACCENT_HEX.blue;
  return (
    <motion.button
      onClick={onClick}
      type="button"
      title={title}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={`h-7 w-7 flex items-center justify-center rounded-lg border backdrop-blur-md transition-colors duration-200 ${
        active ? '' : `${t.glassSoft} ${t.border} ${t.textFaint} ${t.hoverText}`
      }`}
      style={active ? { color: hex, background: `${hex}1f`, borderColor: `${hex}55` } : undefined}
    >
      {/* Phosphor icons are solid-path glyphs (unlike lucide's stroke paths) — forcing
         fill="none" makes them render invisible. Use `weight="fill"` instead to get a
         filled look, and leave the rest to the global solid/outline icon-style toggle. */}
      <Icon className="h-[15px] w-[15px]" weight={filled ? 'fill' : undefined} />
    </motion.button>
  );
}

// ─── StatTile — generalizes PPE's hero KPI chips / a clickable stat strip item ──
// Numeric values animate with the same eased CountUp the homepage hero uses, so every
// page's hero stats share that "living dashboard" feel; string values (e.g. "4.2h",
// "✓", "87%") render as-is.
export function StatTile({
  icon: Icon, color, value, label, onClick,
}: {
  icon: React.ElementType; color: string; value: string | number; label: string; onClick?: () => void;
}) {
  const t = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${t.hoverBg} transition-all disabled:cursor-default group`}
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className={`text-base font-bold ${t.textPrimary} tabular-nums`}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </span>
      <span className={`text-xs ${t.textMuted} transition-colors`}>{label}</span>
    </button>
  );
}

// ─── ProgressBar — generalizes PPE's compliance bar ─────────────────────────────
export function ProgressBar({
  value, color, label, showValue = true,
}: {
  value: number; color: string; label?: string; showValue?: boolean;
}) {
  const t = useTheme();
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between text-[11px] mb-1">
          {label && <span className={t.textSecondary}>{label}</span>}
          {showValue && <span className={`font-semibold ${t.textPrimary} tabular-nums`}>{value}%</span>}
        </div>
      )}
      <div className={`h-1.5 rounded-full ${t.chipBg} overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full" style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─── AutofillInput — text input that remembers & suggests recent entries ────────
// A drop-in text input backed by a native <datalist>, populated from the values the
// user has previously typed into fields sharing the same `field` key (lib/inputHistory).
// Records the committed value on blur. Native datalist means browser-style suggestions
// with zero custom dropdown/positioning code, and it composes with FormField like any
// other input. Use for free-text fields that repeat a lot (department, location,
// section, designation, machine/artisan name) — not for selects, dates, or unique IDs.
export function AutofillInput({
  field, value, onChange, placeholder, type = 'text', required, className, onBlur,
}: {
  /** Stable history key — values are grouped and suggested per key (e.g. "department"). */
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  onBlur?: () => void;
}) {
  const t = useTheme();
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Refresh suggestions as the user types (prefix/substring filtered).
  useEffect(() => { setSuggestions(getInputSuggestions(field, value)); }, [field, value]);
  return (
    <>
      <input
        list={listId}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { recordInput(field, value); onBlur?.(); }}
        autoComplete="off"
        className={className ?? `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`}
      />
      <datalist id={listId}>
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}

// ─── FormField / FormActions — promoted verbatim from PPE's page-local versions ─
export function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  const t = useTheme();
  return (
    <div>
      {/* textSecondary (gray-600), not textFaint (gray-500) — field labels read as
          washed-out grey on light backgrounds otherwise. */}
      <label className={`text-xs font-medium ${t.textSecondary} mb-1 block`}>
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FormActions({
  onCancel, submitting, submitLabel, accent = 'violet',
}: {
  onCancel: () => void; submitting?: boolean; submitLabel: string; accent?: Accent;
}) {
  const t = useTheme();
  return (
    <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
      <button type="button" onClick={onCancel}
        className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>
        Cancel
      </button>
      <PrimaryButton type="submit" size="md" fullWidth accent={accent} submitting={submitting} icon={Check}>
        {submitLabel}
      </PrimaryButton>
    </div>
  );
}

// ─── PrimaryButton — the one canonical CTA (gradient + brightness hover). Every
// page's "New X" / "Add Y" header action and every modal's submit button should use
// this instead of hand-rolling the gradient class string per page.
export function PrimaryButton({
  icon: Icon, children, onClick, type = 'button', disabled, submitting, accent = 'violet', size = 'sm', fullWidth = false, className = '',
}: {
  icon?: ElementType; children: ReactNode; onClick?: () => void; type?: 'button' | 'submit';
  disabled?: boolean; submitting?: boolean; accent?: Accent; size?: 'sm' | 'md'; fullWidth?: boolean; className?: string;
}) {
  const a = ACCENT[accent];
  // `md` needs explicit horizontal padding — without it, a non-fullWidth button's
  // inline-flex content (icon/spinner + label) butts against the pill's rounded
  // edges and longer labels visually overflow/overlap the button shape.
  const sizeCls = size === 'md' ? 'py-2.5 px-5 rounded-xl text-sm' : 'h-8 px-3 rounded-lg text-[13px]';
  return (
    <motion.button
      type={type} onClick={onClick} disabled={disabled || submitting}
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      className={`${fullWidth ? 'flex-1' : ''} inline-flex items-center justify-center gap-1.5 ${sizeCls} font-semibold text-white bg-gradient-to-br ${a.gradient} ${a.solidGlow} hover:brightness-110 transition-all disabled:opacity-50 ${className}`}
    >
      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </motion.button>
  );
}

// ─── CollapsibleHeader — the icon/title/chevron-toggle panel header used at the top
// of nearly every records/filter/section panel across the app. `children` renders as
// trailing actions before the toggle chevron (search box, sort select, "+ Add" button…).
export function CollapsibleHeader({
  icon: Icon, title, sub, open, onToggle, children,
}: {
  icon: ElementType; title: string; sub?: string; open: boolean; onToggle: () => void; children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border} flex-wrap gap-2`}>
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <Icon className="h-4 w-4 text-brand-400 shrink-0" />
        <span className={`font-semibold text-sm ${t.textPrimary}`}>{title}</span>
        {sub && <span className={`text-xs ${t.textFaint}`}>{sub}</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {children}
        <button type="button" onClick={onToggle} title={open ? 'Collapse' : 'Expand'}
          className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}

// ─── GroupSection — the homepage's category-accordion pattern, generalized. Use this
// on any LIST page whose records read better grouped-and-summarized than as one flat
// list (staff by section, equipment by area, spares by category…). It gives that page
// the homepage's exact information structure: a collapsible glass panel per group, an
// accent-colored icon, a headcount, optional summary chips, and a staggered grid of
// items inside — instead of a single undifferentiated scroll.
//
// The caller supplies the grouping + the item cards (each wrapped in its own
// `<motion.div variants={fadeUp}>` so items reveal in sequence, matching the homepage).
export function GroupSection({
  icon: Icon, accentHex, title, count, countLabel = 'items', description, summary,
  open, onToggle, gridClassName = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4', children,
}: {
  icon?: ElementType;
  /** Accent color for the group (e.g. a section's assigned hex) — tints the icon. */
  accentHex: string;
  title: string;
  count?: number;
  countLabel?: string;
  description?: string;
  /** Optional trailing header content (e.g. mini stat chips summarizing the group). */
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Layout for the items inside — defaults to the standard 1/2/3-col card grid. */
  gridClassName?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <motion.div variants={fadeUp} className={`${t.glass} rounded-2xl ${t.shadow} scroll-mt-24 overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 ${t.hoverBgSoft} text-left group transition-colors`}
        type="button"
      >
        {Icon && (
          <div className="h-8 w-8 flex items-center justify-center shrink-0 rounded-lg group-hover:scale-105 transition-transform"
            style={{ background: `${accentHex}1a` }}>
            <Icon className="h-5 w-5" style={{ color: accentHex }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className={`font-semibold ${t.textPrimary} text-[14px] tracking-tight`}>{title}</h3>
            {count !== undefined && (
              <span className={`text-[11px] font-medium ${t.textTertiary} tabular-nums`}>{count} {countLabel}</span>
            )}
          </div>
          {description && <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>{description}</p>}
        </div>
        {summary && <div className="flex items-center gap-2 shrink-0">{summary}</div>}
        <ChevronDown className={`h-4 w-4 ${t.textFaint} transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      <Collapse open={open}>
        <div className={`px-4 pb-4 pt-1 border-t ${t.border}`}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={open ? 'show' : 'hidden'}
            className={`${gridClassName} mt-4`}
          >
            {children}
          </motion.div>
        </div>
      </Collapse>
    </motion.div>
  );
}

// ─── Subsection — a second grouping level nested inside a GroupSection (e.g.
// Underground → Fitters/Riggers/Boilermakers by trade). Deliberately lighter
// than GroupSection — no separate glass card, just an indented header row +
// Collapse — since it already sits inside one; mirrors how the sidebar nests
// modules under a category without wrapping each in its own panel. Adopted
// from the employees-page trial (grouping by `designation` as a stand-in
// trade/subsection field) — only show these when grouping actually
// consolidates records (2+ members in at least one subgroup); otherwise a
// flat list of individually-unique labels is just noise, not organization.
export function Subsection({
  label, color, count, countLabel, open, onToggle, gridClassName = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4', children,
}: {
  label: string;
  /** Accent color for the subsection dot — typically the parent group's color. */
  color: string;
  count: number;
  countLabel?: string;
  open: boolean;
  onToggle: () => void;
  /** Layout for the items inside — defaults to the standard 1/2/3-col card grid. */
  gridClassName?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <div>
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left ${t.hoverBgSoft} transition-colors group`}>
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
        <span className={`text-[12.5px] font-semibold ${t.textSecondary} tracking-tight`}>{label}</span>
        <span className={`text-[11px] ${t.textTertiary} tabular-nums`}>{count}{countLabel ? ` ${countLabel}` : ''}</span>
        <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint} ml-auto transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      <Collapse open={open}>
        <div className={`${gridClassName} pt-2 pb-1 pl-4`}>
          {children}
        </div>
      </Collapse>
    </div>
  );
}

// ─── InfoRow — the standard label/value key-value pair used throughout every
// RecordCard's expanded detail (ID numbers, dates, departments…). Was
// hand-copied per-page (employees, equipment, inventory, drivers,
// contractors, ppe each had their own identical local copy) — promoted here
// so every page shares one implementation instead of six drifting copies.
export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  const t = useTheme();
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div>
      {/* Value in textPrimary (near-black), not textMuted — a key/value pair reads as
          "faint label, sharp value". The muted grey looked washed-out next to the
          polished homepage cards. */}
      <div className={`text-sm font-medium ${t.textPrimary}`}>{value || '—'}</div>
    </div>
  );
}

// ─── SummaryItem — one line of a RecordCard's always-visible summary (icon +
// label + value), e.g. "# Mine No.: C1234". Pass `color` to tint the icon
// with the record's own accent color (section/status color) instead of flat
// grey — flat-grey summary icons next to a vividly accent-colored record
// title/badges read as inconsistent "some icons pop, some don't" (this was
// flagged and fixed on the employees page); default (no `color`) falls back
// to the muted `textFaint` tone for contexts that want it de-emphasized.
export function SummaryItem({ icon: Icon, label, value, color, strokeWidth }: {
  icon: ElementType; label: string; value?: string; color?: string; strokeWidth?: number;
}) {
  const t = useTheme();
  if (!value) return null;
  return (
    <span className="flex items-start gap-1.5 min-w-0">
      <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${color ? '' : t.textFaint}`} strokeWidth={strokeWidth} style={color ? { color } : undefined} />
      <span className="min-w-0 truncate"><span className={t.textFaint}>{label}: </span>{value}</span>
    </span>
  );
}

// ─── RecordCard — THE universal "list record" card. Carries the exact same visual
// language as the homepage module tiles — GlowCard lift/glow, a bare accent-coloured
// icon that pops on hover (tileIconItem), a heading-font (Montserrat, via the <h4>)
// title — but sized for a data record and expandable in place. Every list page
// (employees, equipment, inventory, spares…) should render its records with this so
// they all read as one system instead of each hand-rolling its own card.
//
//   • `summary`  — always-visible rows under the header (key facts at a glance).
//   • `children` — the expandable detail; when provided, a chevron reveals it via the
//                   shared Collapse (same animation as GroupSection / the homepage).
//   • `actions`  — rendered at the foot of the expanded area (e.g. Edit / Delete).
//   • `headerActions` — always-visible controls in the header, left of the chevron
//                   (e.g. a primary "Issue PPE" button that must be reachable without
//                   expanding).
//   • `open`/`onToggle` — optional CONTROLLED expand state. Omit both for the default
//                   self-managed (uncontrolled) behavior; pass both when a parent needs
//                   to drive it (e.g. an Expand-all / Collapse-all control across cards).
//                   Expansion is CLICK-ONLY — never wire it to hover (a hover-expand felt
//                   twitchy on the PPE page and was removed).
export function RecordCard({
  icon: Icon, accentHex, title, subtitle, badges, summary, actions, headerActions, children,
  defaultOpen = false, open: controlledOpen, onToggle,
}: {
  icon: ElementType;
  accentHex: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  headerActions?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const t = useTheme();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined && onToggle !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const toggle = isControlled ? onToggle! : () => setInternalOpen(o => !o);
  const expandable = !!children;
  return (
    <GlowCard color={accentHex} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <motion.div variants={tileIconItem} className="shrink-0 mt-0.5">
            <Icon className="h-5 w-5" style={{ color: accentHex }} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h4 className={`font-semibold text-[14px] leading-tight tracking-tight truncate ${t.textPrimary}`}>{title}</h4>
            {subtitle && <p className={`text-xs mt-0.5 truncate ${t.textMuted}`}>{subtitle}</p>}
            {badges && <div className="flex items-center gap-1.5 mt-2 flex-wrap">{badges}</div>}
          </div>
          {(headerActions || expandable) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {headerActions}
              {expandable && (
                <button type="button" onClick={toggle} title={open ? 'Show less' : 'Expand details'}
                  className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>
        {summary && <div className="mt-3">{summary}</div>}
      </div>
      {expandable && (
        <Collapse open={open}>
          <div className={`px-4 pb-4 border-t ${t.border} pt-3 space-y-3`}>
            {children}
            {actions && <div className="flex gap-2 pt-1">{actions}</div>}
          </div>
        </Collapse>
      )}
    </GlowCard>
  );
}

// ─── StatCard — generalizes the homepage KPICard: an elevated glass tile (via
// GlowCard, so it shares the exact same hover-lift as every other card in the app)
// with an icon+label row, a big value, and an optional trend indicator.
export function StatCard({
  icon: Icon, accent = 'violet', label, value, trend,
}: {
  icon: ElementType; accent?: Accent; label: string; value: string | number;
  trend?: { direction: 'up' | 'down'; label: string };
}) {
  const t = useTheme();
  const a = ACCENT[accent];
  const trendColor = trend?.direction === 'up' ? t.trendUp : t.trendDown;
  return (
    <GlowCard color={ACCENT_HEX[accent]} className="p-3.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${a.icon}`} />
        <p className={`${t.textSecondary} text-[11px] font-medium uppercase tracking-wide truncate`}>{label}</p>
      </div>
      <p className={`text-[28px] leading-none font-bold ${t.textPrimary} tracking-tight tabular-nums`}>{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-medium ${trendColor}`}>
          {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          <span>{trend.label}</span>
        </div>
      )}
    </GlowCard>
  );
}

// ─── StatStrip — the homepage hero's grouped stat row (value + label, separated by
// thin vertical dividers, numbers count up on mount). Use as an alternative to a grid
// of StatTiles inside a PageHero when the stats read better as one flowing line.
export function StatStrip({ items }: { items: { label: string; value: number; suffix?: string }[] }) {
  const t = useTheme();
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      {items.map((stat, i) => (
        <div key={stat.label} className="flex items-baseline gap-2 relative">
          {i > 0 && (
            <span className="absolute -left-4 top-0.5 bottom-0.5 w-px" style={{ background: t.light ? '#e5e7eb' : 'rgba(255,255,255,0.1)' }} />
          )}
          <span className={`text-[20px] font-semibold ${t.textPrimary} tracking-tight tabular-nums`}>
            <CountUp value={stat.value} suffix={stat.suffix} />
          </span>
          <span className={`text-[12px] ${t.textFaint}`}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SearchInput — the TopNavigation search recipe, generalized ─────────────────
export function SearchInput({
  value, onChange, placeholder = 'Search…', className = '', autoFocus,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean;
}) {
  const t = useTheme();
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint}`} />
      <input
        type="search"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Without this, browsers apply their own autofill heuristics to a bare
        // <input type="search"> and can offer a saved value (e.g. the user's
        // login email) — most visibly right after a nearby form submission
        // (like an approval) refocuses the page.
        autoComplete="off"
        name="search"
        className={`w-full h-8 pl-8 pr-3 rounded-lg text-[13px] ${t.inputBg} focus:outline-none focus:shadow-[0_6px_20px_-6px_rgba(59,130,246,0.25)] transition-all duration-300`}
      />
    </div>
  );
}

// ─── SelectField — THE canonical dropdown. Before this, every page hand-rolled a
// `<select className="… t.inputBg …">` and the sizing drifted into 4+ different
// height/padding/radius/font combinations across the app. Use this instead of a raw
// <select> anywhere.
//
// It is a fully-custom (not native <select>) dropdown so the OPEN option list is
// on-brand: the app's own font, theme colours, hover/selected states — a native
// <select>'s option list is OS-rendered and can't be themed (wrong font, no dark mode).
// The panel renders through a PORTAL to document.body (fixed-positioned from the
// trigger) so no ancestor's overflow-hidden can clip it, and it's keyboard-accessible
// (Enter/Space/↓ to open, ↑/↓ to move, Enter to pick, Esc to close).
//
// Two sizes ONLY, chosen by role — never hand-pick a third:
//   • `filter` — compact, for filter/sort bars (matches SearchInput's h-8 / text-[13px]).
//   • `form`   — comfortable, for add/edit modal fields (h-9 / text-sm).
//
// `options` accepts either `string[]` (value === label) or `{value,label}[]`.
export function SelectField({
  value, onChange, options, size = 'form', placeholder, title, disabled, className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (string | { value: string; label: string })[];
  size?: 'form' | 'filter';
  /** Shown (muted) when no option is selected, e.g. "All Statuses". */
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null);
  const { edge: scrollEdge, onScroll: onListScroll } = useScrollEdgeFlash();

  const opts = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = opts.find(o => o.value === value);
  const selectedIndex = opts.findIndex(o => o.value === value);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < 240 && r.top > spaceBelow;
    setPos({ top: above ? r.top : r.bottom, left: r.left, width: r.width, above });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    const on = () => reposition();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open, reposition, selectedIndex]);

  const commit = (v: string) => { onChange(v); setOpen(false); btnRef.current?.focus(); };

  const sizeCls = size === 'filter' ? 'h-8 pl-2.5 pr-8 text-[13px] rounded-lg' : 'h-9 pl-3 pr-8 text-sm rounded-lg';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'Escape') { setOpen(false); return; }
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, opts.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (opts[active]) commit(opts[active].value); }
        }}
        className={`w-full flex items-center text-left outline-none cursor-pointer transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px disabled:hover:translate-y-0 disabled:hover:shadow-none ${sizeCls} ${t.inputBg} disabled:opacity-50 disabled:cursor-default`}
      >
        <span className={`truncate ${selected ? '' : t.textFaint}`}>{selected ? selected.label : (placeholder ?? '')}</span>
      </button>
      <ChevronDown className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${t.textFaint} transition-transform ${open ? 'rotate-180' : ''}`} />

      {mounted && open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            style={{
              position: 'fixed',
              top: pos.above ? undefined : pos.top + 4,
              bottom: pos.above ? window.innerHeight - pos.top + 4 : undefined,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className={`rounded-lg overflow-hidden ${t.glass} ${t.shadow} max-h-60 overflow-y-auto py-1`}
            onScroll={onListScroll}
          >
            {scrollEdge === 'top' && <ScrollEdgeGlow edge="top" />}
            {opts.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseDown={e => { e.preventDefault(); commit(o.value); }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center justify-between gap-2 transition-colors ${i === active ? t.chipBg : ''} ${o.value === value ? `font-medium ${t.textPrimary}` : t.textMuted}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" />}
              </button>
            ))}
            {scrollEdge === 'bottom' && <ScrollEdgeGlow edge="bottom" />}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

// ─── Combobox — THE canonical searchable picker (autocomplete). Renders its dropdown
// panel through a PORTAL to document.body with fixed positioning, so NO ancestor's
// `overflow-hidden`/`overflow-auto` can ever clip it (that was the "dropdown gets cut
// off" bug on the issues page). Replaces the hand-rolled ComboField / SparePicker /
// SearchableDropdown / ColumnSelector, which each reimplemented this slightly
// differently and all clipped inside overflow-hidden cards.
//
// The caller owns filtering (pass already-filtered `options` derived from `value`) and
// owns what "selecting" means via `onSelect`. Use `renderOption` for rich rows
// (e.g. a mono stock-code + description); otherwise the default renders label + sub.
export interface ComboOption { value: string; label: string; sub?: string }

export function Combobox({
  value, onChange, onSelect, options, size = 'form', placeholder, title, disabled,
  className = '', inputClassName = '', loading = false, emptyText, renderOption, onFocusLoad, minWidth,
}: {
  value: string;
  /** Fires on every keystroke (free-text) — caller re-filters `options` from this. */
  onChange: (text: string) => void;
  /** Fires when an option is chosen (click / Enter / Tab). */
  onSelect: (opt: ComboOption) => void;
  options: ComboOption[];
  size?: 'form' | 'filter';
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  /** Extra classes appended to the <input> itself (e.g. `font-mono` for codes). */
  inputClassName?: string;
  loading?: boolean;
  emptyText?: string;
  renderOption?: (opt: ComboOption, active: boolean) => ReactNode;
  /** Optional lazy-load hook fired on first focus (e.g. fetch the option list on demand). */
  onFocusLoad?: () => void;
  /** Minimum panel width in px (panel defaults to the input's width). */
  minWidth?: number;
}) {
  const t = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null);
  const { edge: scrollEdge, onScroll: onListScroll } = useScrollEdgeFlash();

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelMax = 240;
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < Math.min(panelMax, 220) && r.top > spaceBelow;
    setPos({ top: above ? r.top : r.bottom, left: r.left, width: r.width, above });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const on = () => reposition();
    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
  }, [open, reposition]);

  useEffect(() => { setActive(0); }, [options.length]);

  const commit = (opt: ComboOption) => { onSelect(opt); setOpen(false); };
  const sizeCls = size === 'filter' ? 'h-8 px-2.5 text-[13px] rounded-lg' : 'h-9 px-3 text-sm rounded-lg';
  const showPanel = open && (loading || options.length > 0 || !!emptyText);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        className={`w-full outline-none transition-all duration-300 hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-px focus:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.45)] focus:-translate-y-px disabled:hover:translate-y-0 disabled:hover:shadow-none ${sizeCls} ${t.inputBg} ${inputClassName}`}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { onFocusLoad?.(); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); return; }
          if (!showPanel || options.length === 0) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, options.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (options[active]) commit(options[active]); }
          else if (e.key === 'Tab') { e.preventDefault(); commit(options[active] || options[0]); }
        }}
      />
      {mounted && showPanel && pos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.above ? undefined : pos.top + 4,
            bottom: pos.above ? window.innerHeight - pos.top + 4 : undefined,
            left: pos.left,
            width: Math.max(pos.width, minWidth ?? 0),
            zIndex: 9999,
          }}
          className={`rounded-xl overflow-hidden ${t.glass} ${t.shadow} max-h-60 overflow-y-auto`}
          onMouseDown={e => e.preventDefault()}
          onScroll={onListScroll}
        >
          {scrollEdge === 'top' && <ScrollEdgeGlow edge="top" />}
          {loading && <div className={`px-3 py-2 text-xs ${t.textFaint} flex items-center gap-2`}><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>}
          {!loading && options.length === 0 && emptyText && <div className={`px-3 py-3 text-xs text-center ${t.textFaint}`}>{emptyText}</div>}
          {options.map((o, i) => (
            <button
              key={`${o.value}-${i}`}
              type="button"
              onMouseDown={e => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors border-b ${t.border} last:border-0 ${i === active ? t.chipBg : ''}`}
            >
              {renderOption ? renderOption(o, i === active) : (
                <div className="flex items-center justify-between gap-2">
                  <span className={t.textMuted}>{o.label}</span>
                  {o.sub && <span className={`text-[10px] ${t.textFaint} ml-2 shrink-0`}>{o.sub}</span>}
                </div>
              )}
            </button>
          ))}
          {scrollEdge === 'bottom' && <ScrollEdgeGlow edge="bottom" />}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── ViewToggle — list/grid (or any N-way) icon-button toggle ───────────────────
export function ViewToggle<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; icon: React.ElementType; label: string }[];
}) {
  const t = useTheme();
  return (
    <div className={`flex items-center ${t.glassSoft} rounded-lg p-0.5`}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
            value === opt.value ? `${ACCENT.violet.chip} ${ACCENT.violet.text}` : `${t.textFaint} ${t.hoverText}`
          }`}
        >
          <opt.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// ─── ListItemCard — generalizes PPE's PPEItemCard/DueItemsList row ──────────────
export function ListItemCard({
  color, icon: Icon, iconColor, title, subtitle, rows, badges, onClick, onEdit, onDelete,
}: {
  color: string;
  icon: React.ElementType; iconColor?: string;
  title: string; subtitle?: string;
  rows?: { label: string; value: ReactNode; valueClassName?: string }[];
  badges?: ReactNode;
  onClick?: () => void; onEdit?: () => void; onDelete?: () => void;
}) {
  const t = useTheme();
  return (
    <GlowCard color={color} onClick={onClick} className={`group ${t.hoverBgSoft} overflow-hidden`}>
      <div className="px-3.5 pt-3.5 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.div
            variants={{ rest: { scale: 1 }, hover: { scale: 1.08, transition: { duration: 0.25 } } }}
            className={`p-2 rounded-lg shrink-0 ${t.chipBg}`}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: iconColor ?? color }} />
          </motion.div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${t.textPrimary} leading-tight truncate`}>{title}</p>
            {subtitle && <AnimatedText as="p" text={subtitle} className={`text-xs ${t.textSecondary} mt-0.5`} />}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
            {onEdit && (
              <button type="button" title="Edit" onClick={onEdit}
                className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-brand-500 transition-all`}>
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button type="button" title="Delete" onClick={onDelete}
                className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="px-3.5 pb-3.5 space-y-1.5 text-xs">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between">
              <span className={t.textFaint}>{row.label}</span>
              <span className={row.valueClassName ?? `${t.textMuted} font-medium`}>{row.value}</span>
            </div>
          ))}
          {badges && <div className="flex justify-between items-center pt-0.5">{badges}</div>}
        </div>
      )}
      {!rows?.length && badges && (
        <div className="px-3.5 pb-3.5 flex items-center gap-1.5">{badges}</div>
      )}
    </GlowCard>
  );
}

// ─── PageHero — generalizes PPE's hero block ────────────────────────────────────
export function PageHero({
  icon: Icon, accent = 'violet', crumbs, title, description, actions, statsOpen, children,
}: {
  icon: React.ElementType; accent?: Accent;
  crumbs?: string[]; title: string; description?: string;
  actions?: ReactNode;
  statsOpen?: boolean; children?: ReactNode;
}) {
  const t = useTheme();
  const a = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <PulsingIcon className={`p-2.5 rounded-xl shrink-0 ${a.chip} border ${t.border}`}>
            <Icon className={`h-5 w-5 ${a.icon}`} />
          </PulsingIcon>
          <div className="min-w-0">
            {crumbs && crumbs.length > 0 && (
              <nav className={`flex items-center gap-1.5 text-xs ${t.textFaint} mb-0.5`}>
                {crumbs.map((crumb, i) => (
                  <span key={crumb} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    <span className={i === crumbs.length - 1 ? `${t.textMuted} font-medium` : ''}>{crumb}</span>
                  </span>
                ))}
              </nav>
            )}
            <h1 className={`text-xl font-bold ${t.textPrimary} font-heading tracking-tight`}>{title}</h1>
            {description && (
              <AnimatedText as="p" trigger="mount" text={description} className={`text-xs ${t.textFaint} mt-0.5`} />
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children && (
        <Collapse open={!!statsOpen}>
          <div className={`border-t ${t.border} px-6 py-3 space-y-3`}>{children}</div>
        </Collapse>
      )}
    </motion.div>
  );
}

// ─── InfoCard — the app's primary "information display tile," generalized from the
// homepage module card + quick-view popup header. Any card whose job is "show an icon,
// an optional badge/metric, a title, and a short description" should build on this
// instead of re-hand-rolling the icon-row/title/description block per page — it's what
// gives every info tile across the ERP the same emerge-on-hover text and GlowCard lift,
// regardless of which page or module it lives on.
//
// Customization escape hatches: `variant="tile"` (default, fixed-aspect grid tile — module
// cards, dashboards) vs `variant="header"` (horizontal icon+text row, no aspect ratio —
// modal/quick-view headers, list headers). `children` renders below the description for
// anything a specific card needs on top (metrics grid, tags, a CTA button, badges…).
export function InfoCard({
  icon: Icon, iconColor, accentColor, badge, metricValue, metricLabel, title, description,
  variant = 'tile', aspect = 'aspect-[3/2]', href, onClick, animateText = true, elevated = false, children, className = '', style,
}: {
  icon: ElementType; iconColor?: string; accentColor: string; badge?: ReactNode;
  metricValue?: ReactNode; metricLabel?: string; title: string; description?: string;
  /** Rest-state lift + accent glow before hover — see GlowCard's `elevated`. */
  elevated?: boolean;
  variant?: 'tile' | 'header';
  /** Only used by variant="tile" — the fixed width:height ratio of the grid tile. */
  aspect?: string;
  href?: string; onClick?: () => void;
  /** Set false for a modal/quick-view header that should show its description immediately
   * rather than waiting for a hover (there's nothing to hover before the modal is even open). */
  animateText?: boolean;
  children?: ReactNode; className?: string;
  /** Escape hatch for per-card inline styling (e.g. a subtle accent-tinted background). */
  style?: CSSProperties;
}) {
  const t = useTheme();

  const descriptionEl = description && (
    <AnimatedText
      as="p"
      trigger={animateText ? 'hover' : 'mount'}
      text={description}
      className={`text-[10.5px] ${t.textTertiary} ${SPACING.cardTextGap} ${variant === 'tile' ? 'mb-1 line-clamp-1' : ''} leading-snug`}
    />
  );

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <PulsingIcon className="h-9 w-9 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6" style={{ color: iconColor ?? accentColor }} />
        </PulsingIcon>
        <div className="min-w-0">
          <h3 className={`font-medium ${t.textPrimary} text-[12.5px] tracking-tight truncate`}>{title}</h3>
          {descriptionEl}
        </div>
        {badge}
      </div>
    );
  }

  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <motion.div variants={tileIconItem} className="shrink-0">
          <Icon className="h-[18px] w-[18px]" style={{ color: iconColor ?? accentColor }} />
        </motion.div>
        {badge}
      </div>
      <motion.div variants={tileTextContainer}>
        {metricValue !== undefined && (
          <motion.p variants={tileTextItem} className={`text-base font-bold ${t.textPrimary} tabular-nums leading-none`}>
            {metricValue}
            {metricLabel && <span className={`text-[9px] font-medium ${t.textTertiary} uppercase tracking-wide ml-1.5 align-middle`}>{metricLabel}</span>}
          </motion.p>
        )}
        <h4 className={`font-medium ${t.textMuted} text-[12.5px] mt-1 leading-snug line-clamp-1`}>{title}</h4>
        {descriptionEl}
      </motion.div>
      {children}
    </>
  );

  const surfaceCls = `flex flex-col justify-between ${aspect} ${t.glassSoft} rounded-lg ${SPACING.cardPad} ${className}`;

  return (
    <GlowCard color={accentColor} surface="rounded-lg" elevated={elevated}>
      {href ? (
        <Link href={href} onClick={onClick} className={surfaceCls} style={style}>{inner}</Link>
      ) : (
        <div onClick={onClick} className={surfaceCls} style={style}>{inner}</div>
      )}
    </GlowCard>
  );
}
