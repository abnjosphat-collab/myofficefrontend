// app/page.tsx — Ozech MyOffice Enterprise ERP Dashboard
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ClipboardCheck, Activity, Shield, Search, LayoutGrid, Bookmark, Sparkles,
  SlidersHorizontal, Palette, PanelLeftClose, Bell, ShieldAlert,
  ChevronLeft, ChevronRight, ChevronDown, X,
  ArrowUpRight, ArrowDownRight, ArrowRight, Check, Eye, EyeOff, Maximize2, Plus,
  Pause, Play, CheckSquare, Square,
} from '@/components/shared/theme';
import {
  useTheme, Collapse, AnimatedText, PulsingIcon, CenterModal, GlowCard, InfoCard, EmptyState, StatCard, StatStrip,
  CardIconButton, staggerContainer, fadeUp, ACCENT, ACCENT_RGBA, ACCENT_HEX, rgbaFromHexSafe, SPACING, type Accent,
} from '@/components/shared/theme';
import {
  AppShell, useAppShell, CATEGORIES, QUICK_ACTIONS, trackModuleUsage, useDashboardData,
  TOTAL_MODULES, TOTAL_CATEGORIES, type Module, type QuickAction,
} from '@/components/app-shell';

// ─── Dashboard-only data (not shell chrome) ─────────────────────────────────
// KPI values are live — see useDashboardData (components/app-shell/useDashboardData.ts),
// which derives them from the existing /api/employees, /api/maintenance/work-orders,
// /api/equipment and /api/breakdowns endpoints. No hardcoded numbers, no fabricated
// trend percentages (there's no historical snapshot to compute a real trend from yet).

interface KPIItem { id: string; title: string; value: string; icon: React.ElementType; accent: Accent }

const INTRO_SLIDES: { icon: React.ElementType; accent: Accent; title: string; description: string }[] = [
  { icon: LayoutGrid,  accent: 'blue',    title: 'Welcome to MyOffice', description: 'One workspace for personnel, operations, safety, inventory and analytics.' },
  { icon: Search,      accent: 'cyan',    title: 'Find anything, instantly', description: 'Use the search bar up top to jump straight to any module, employee or document.' },
  { icon: Bookmark,    accent: 'violet',  title: 'Make it yours', description: 'Hover a module tile and tap the bookmark icon to pin it to Favorites in the left pane.' },
  { icon: Sparkles,    accent: 'amber',   title: 'One-click quick actions', description: 'Tap the + icon on any module to pin it as a Quick Action — or just use it often and MyOffice will suggest it automatically.' },
  { icon: SlidersHorizontal, accent: 'indigo', title: 'Customize your dashboard', description: 'Click Customize in the top bar to manage your pinned favorites.' },
  { icon: Palette,     accent: 'violet',  title: 'Consistent everywhere', description: 'This same header, sidebar and footer follow you to every module in MyOffice.' },
  { icon: PanelLeftClose, accent: 'indigo', title: 'Navigate the left pane', description: 'Browse every module by category, collapse the sidebar to a slim rail, and check System Status or Tips further down.' },
  { icon: Bell,        accent: 'cyan',    title: 'Stay in the loop', description: 'The bar at the very bottom of the page has notifications, feedback and quick settings — always one click away.' },
  { icon: ShieldAlert, accent: 'emerald', title: 'Stay ahead of safety', description: 'Track PPE, inspections and compliance in real time from the Safety & Compliance hub.' },
];

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ data, index }: { data: KPIItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeInOut', delay: index * 0.22 }}
    >
      <StatCard
        icon={data.icon}
        accent={data.accent}
        label={data.title}
        value={data.value}
      />
    </motion.div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

function QuickActionCard({ action, onRemove }: { action: QuickAction; onRemove?: () => void }) {
  const Icon = action.icon;
  const a = ACCENT[action.accent];
  const t = useTheme();
  return (
    // Explicit initial/animate (not just inherited `variants`) — quick actions the user
    // just pinned mount well after the grid's own stagger-in has already settled (the
    // favorites/quick-actions localStorage read happens in a post-mount effect), and a
    // child that only declares `variants` without its own initial/animate can get stuck
    // at the "hidden" variant forever once the parent stops re-issuing "show".
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="relative group">
      <GlowCard color={ACCENT_HEX[action.accent]} surface={`${t.glassSoft} rounded-xl`}>
        <Link href={action.href} onClick={() => trackModuleUsage(action.href)} className="flex items-center gap-3 p-3.5">
          <div className="h-9 w-9 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Icon className={`h-5 w-5 ${a.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`text-[13px] font-medium ${t.textMuted} ${t.groupHoverText} transition-colors truncate block`}>{action.label}</span>
            {action.auto && <span className={`text-[9.5px] font-medium ${t.textFaint} uppercase tracking-wide`}>Frequently used</span>}
          </div>
        </Link>
      </GlowCard>
      {onRemove && (
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <CardIconButton
            icon={X}
            title={action.auto ? 'Dismiss suggestion' : 'Remove from quick actions'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────────────
// Built on the shared InfoCard primitive (components/shared/design-system) — the
// favorite/quick-action/quick-view buttons overlaid below are the homepage-specific
// customization InfoCard's `children`/`badge` slots don't cover, since they float
// outside the card's own hover-glow surface.

function ModuleCard({
  module, accent, onQuickView, isFavorite, onToggleFavorite, isQuickAction, onToggleQuickAction, accentHex,
  selectMode = false, isSelected = false, onToggleSelected,
}: {
  module: Module; accent: Accent; onQuickView: () => void; isFavorite: boolean; onToggleFavorite: () => void;
  isQuickAction: boolean; onToggleQuickAction: () => void; accentHex: string;
  /** Multi-select-to-favorites mode (homepage toolbar) — when true, the card toggles
   * selection instead of navigating, and shows a checkbox instead of the usual
   * bookmark/quick-action/quick-view action row. */
  selectMode?: boolean; isSelected?: boolean; onToggleSelected?: () => void;
}) {
  const primaryMetric = module.metrics?.[0];
  const t = useTheme();
  // Richer accent wash than the old 0.05/0.09 — the tiles read washed-out while
  // scrolling; the tint plus GlowCard's `elevated` rest-lift makes each module
  // visibly a raised, tinted object before any hover.
  const tileBase = rgbaFromHexSafe(accentHex, t.light ? 0.09 : 0.14);

  return (
    <div className="relative group">
      <InfoCard
        icon={module.icon}
        elevated
        aspect="aspect-[16/9]"
        accentColor={accentHex}
        href={selectMode ? undefined : module.href}
        onClick={selectMode ? onToggleSelected : () => trackModuleUsage(module.href)}
        title={module.title}
        description={module.description}
        metricValue={primaryMetric?.value}
        metricLabel={primaryMetric?.label}
        className={selectMode && isSelected ? 'ring-2 ring-brand-400/60' : ''}
        style={{ backgroundColor: tileBase, cursor: selectMode ? 'pointer' : undefined }}
        badge={module.badge && (
          <span className={`text-[9px] font-medium ${t.textFaint} ${t.chipBg} rounded-full px-1.5 py-0.5 tabular-nums`}>
            {module.badge}
          </span>
        )}
      />
      {selectMode ? (
        <div className="absolute top-2 right-2">
          <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
            isSelected ? 'bg-brand-500 text-white' : `${t.chipBg} ${t.textFaint}`
          }`}>
            {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </div>
        </div>
      ) : (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 transition-all">
          <CardIconButton
            icon={Bookmark}
            active={isFavorite}
            activeHex={ACCENT_HEX.blue}
            filled={isFavorite}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onToggleFavorite();
              toast(isFavorite ? 'Removed from Favorites' : `Pinned “${module.title}” to Favorites`);
            }}
          />
          <CardIconButton
            icon={isQuickAction ? Check : Plus}
            active={isQuickAction}
            activeHex={ACCENT_HEX.amber}
            title={isQuickAction ? 'Remove from quick actions' : 'Add to quick actions'}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onToggleQuickAction();
              toast(isQuickAction ? 'Removed from Quick Actions' : `Added “${module.title}” to Quick Actions`);
            }}
          />
          <CardIconButton
            icon={Maximize2}
            title="Quick view"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(); }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Category Section ───────────────────────────────────────────────────────

function CategorySection({
  category, isExpanded, onToggle, onQuickView, favorites, onToggleFavorite, quickActions, onToggleQuickAction, accentHex,
  selectMode, selectedHrefs, onToggleSelected,
}: {
  category: typeof CATEGORIES[0]; isExpanded: boolean; onToggle: () => void; onQuickView: (m: Module, accent: Accent) => void;
  favorites: Set<string>; onToggleFavorite: (href: string) => void;
  quickActions: Set<string>; onToggleQuickAction: (href: string) => void; accentHex: string;
  selectMode: boolean; selectedHrefs: Set<string>; onToggleSelected: (href: string) => void;
}) {
  const a = ACCENT[category.accent];
  const t = useTheme();
  const visuallyExpanded = isExpanded;
  return (
    <motion.div
      variants={fadeUp}
      id={category.id}
      className={`${t.glass} rounded-2xl ${t.shadow} scroll-mt-24 overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 ${t.hoverBgSoft} text-left group transition-colors`}
        type="button"
      >
        <div className="h-8 w-8 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <category.icon className={`h-5 w-5 ${a.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className={`font-semibold ${t.textPrimary} text-[14px] tracking-tight`}>{category.title}</h3>
            <span className={`text-[11px] font-medium ${t.textTertiary} tabular-nums`}>{category.modules.length} modules</span>
            {category.growth && (
              <span className={`text-[11px] font-medium ${t.trendUp} bg-emerald-400/15 rounded-full px-1.5 py-0.5`}>{category.growth}</span>
            )}
          </div>
          <p className={`text-[12px] ${t.textSecondary} mt-0.5`}>{category.description}</p>
        </div>
        <ChevronDown className={`h-4 w-4 ${t.textFaint} transition-transform shrink-0 ${visuallyExpanded ? 'rotate-180' : ''}`} />
      </button>

      <Collapse open={visuallyExpanded}>
        <div className={`px-4 pb-4 pt-1 border-t ${t.border}`}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={visuallyExpanded ? 'show' : 'hidden'}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4"
          >
            {category.modules.map(module => (
              <motion.div key={module.href} variants={fadeUp}>
                <ModuleCard
                  module={module}
                  accent={category.accent}
                  onQuickView={() => onQuickView(module, category.accent)}
                  isFavorite={favorites.has(module.href)}
                  onToggleFavorite={() => onToggleFavorite(module.href)}
                  isQuickAction={quickActions.has(module.href)}
                  onToggleQuickAction={() => onToggleQuickAction(module.href)}
                  accentHex={accentHex}
                  selectMode={selectMode}
                  isSelected={selectedHrefs.has(module.href)}
                  onToggleSelected={() => onToggleSelected(module.href)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Collapse>
    </motion.div>
  );
}

// ─── Module quick-view content (inside popup modal) ─────────────────────────

function ModuleQuickView({ module, accent }: { module: Module; accent: Accent }) {
  const a = ACCENT[accent];
  const t = useTheme();
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className={`${SPACING.cardPad} space-y-4`}>
      <InfoCard
        variant="header"
        icon={module.icon}
        accentColor={ACCENT_HEX[accent]}
        title={module.title}
        description={module.description}
        animateText={false}
      />

      {module.metrics && (
        <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-2">
          {module.metrics.map((m, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -2 }} className={`rounded-lg ${t.chipBg} ${t.shadow} ${a.glow} transition-shadow duration-300 p-2 text-center`}>
              <p className={`text-base font-bold ${t.textPrimary} tabular-nums leading-none`}>{m.value}</p>
              <p className={`text-[9px] ${t.textTertiary} uppercase tracking-wide mt-1`}>{m.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {module.tags && (
        <motion.div variants={fadeUp}>
          <p className={`text-[10px] font-semibold ${t.textTertiary} uppercase tracking-wider mb-1.5`}>Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {module.tags.map(tag => (
              <span key={tag} className={`text-[10.5px] font-medium ${t.textMuted} ${t.chipBg} rounded-full px-2 py-0.5`}>{tag}</span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
        <Link
          href={module.href}
          onClick={() => trackModuleUsage(module.href)}
          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-gradient-to-br ${a.gradient} text-white text-[11.5px] font-semibold ${a.solidGlow} ${a.glow} hover:brightness-110 transition-all duration-300 ease-out`}
        >
          Open module <ArrowRight className="h-3 w-3" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Intro slides — a brief, auto-advancing welcome carousel ────────────────

function IntroSlides() {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);
  const t = useTheme();

  const next = () => setIndex(i => (i + 1) % INTRO_SLIDES.length);
  const prev = () => setIndex(i => (i - 1 + INTRO_SLIDES.length) % INTRO_SLIDES.length);

  useEffect(() => {
    if (hidden || paused) return;
    const id = setInterval(next, 25_000);
    return () => clearInterval(id);
  }, [hidden, paused]);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        type="button"
        className={`flex items-center gap-1.5 text-[12px] font-medium ${t.textFaint} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 mt-10 mb-2 transition-colors`}
      >
        <Eye className="h-3.5 w-3.5" /> Show intro slides
      </button>
    );
  }

  const slide = INTRO_SLIDES[index];
  const a = ACCENT[slide.accent];

  return (
    <div className={`relative flex items-center gap-3 mt-10 mb-4 px-4 py-3 rounded-xl border ${t.border}`}>
      <button onClick={prev} type="button" title="Previous slide" className={`shrink-0 p-1.5 rounded-full ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}>
        <ChevronLeft className="h-4 w-4" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          <PulsingIcon className="h-9 w-9 flex items-center justify-center shrink-0">
            <slide.icon className={`h-6 w-6 ${a.icon}`} />
          </PulsingIcon>
          <div className="min-w-0">
            <p className={`text-[14px] font-semibold ${t.textPrimary}`}>{slide.title}</p>
            <AnimatedText as="p" trigger="mount" text={slide.description} className={`text-[12.5px] ${t.textSecondary} mt-0.5 max-w-lg leading-relaxed`} />
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={next} type="button" title="Next slide" className={`shrink-0 p-1.5 rounded-full ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}>
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        {INTRO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            title={`Slide ${i + 1}`}
            type="button"
            className={`h-1.5 rounded-full transition-all ${i === index ? '' : t.chipBg}`}
            style={{ width: i === index ? 16 : 6, background: i === index ? ACCENT_RGBA[slide.accent] : undefined }}
          />
        ))}
        <button onClick={() => setPaused(p => !p)} className={`ml-1 p-1 rounded-md ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`} type="button" title={paused ? 'Resume auto-advance' : 'Pause to keep reading'}>
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setHidden(true)} className={`p-1 rounded-md ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`} type="button" title="Hide intro slides">
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Header ────────────────────────────────────────────────────────

function DashboardHeader() {
  const [now, setNow] = useState<Date | null>(null);
  const t = useTheme();
  const { stats: liveStats } = useDashboardData();

  useEffect(() => {
    setNow(new Date());
    const intervalId = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const dateLabel = now?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeLabel = now?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-9">
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 mb-4 text-[12px] font-medium ${t.textFaint}`}>
        <span className={t.trendUp}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </span>
        </span>
        {now && (
          <>
            <span className={t.textTertiary}>·</span>
            <span>{dateLabel}, {timeLabel}</span>
          </>
        )}
        <span className={t.textTertiary}>·</span>
        <span>FY2026 Q3</span>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`font-heading text-[32px] sm:text-[42px] leading-[1.08] font-semibold tracking-tight ${t.textPrimary} ${t.light ? '' : '[text-shadow:0_2px_24px_rgba(0,0,0,0.35)]'}`}
      >
        Your business, unified.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className={`${t.textSecondary} text-[15px] mt-3 max-w-xl leading-relaxed`}
      >
        Personnel, operations, safety, inventory and analytics — one modern ERP, built to run your entire organisation from a single, elegant workspace.
      </motion.p>

      <IntroSlides />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        transition={{ delayChildren: 0.9 }}
        className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-7"
      >
        {[
          { label: 'Modules', value: TOTAL_MODULES, suffix: '' },
          { label: 'Departments', value: TOTAL_CATEGORIES, suffix: '' },
          { label: 'Team members', value: liveStats.employeeCount ?? 0, suffix: '' },
          { label: 'Open Breakdowns', value: liveStats.openBreakdowns ?? 0, suffix: '' },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} className="flex items-baseline gap-2 relative">
            {i > 0 && (
              <motion.span
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
                className="absolute -left-4 top-0.5 bottom-0.5 w-px origin-top"
                style={{ background: t.light ? '#e5e7eb' : 'rgba(255,255,255,0.1)' }}
              />
            )}
            <span className={`text-[20px] font-semibold ${t.textPrimary} tracking-tight tabular-nums`}>
              {/* Dissolve / emerge: the final figure fades in out of a soft blur rather
                 than ticking up — re-keyed on the value so live-loaded stats re-emerge. */}
              <motion.span
                key={stat.value}
                initial={{ opacity: 0, filter: 'blur(10px)', y: 6 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 0.7, delay: 0.9 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {stat.value}{stat.suffix}
              </motion.span>
            </span>
            <span className={`text-[12px] ${t.textFaint}`}>{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Dashboard content — lives inside <AppShell>, consumes shell state via context ──

function DashboardContent() {
  const t = useTheme();
  const s = useAppShell();
  const { stats: liveStats, loading: statsLoading } = useDashboardData();
  const kpiData: KPIItem[] = [
    { id: 'employees', title: 'Total Employees', value: statsLoading ? '…' : (liveStats.employeeCount ?? '—').toString(), icon: Users, accent: 'blue' },
    { id: 'orders', title: 'Active Work Orders', value: statsLoading ? '…' : (liveStats.activeWorkOrders ?? '—').toString(), icon: ClipboardCheck, accent: 'amber' },
    { id: 'equipment', title: 'Equipment Available', value: statsLoading ? '…' : (liveStats.equipmentAvailablePct !== null ? `${liveStats.equipmentAvailablePct}%` : '—'), icon: Activity, accent: 'emerald' },
    { id: 'breakdowns', title: 'Open Breakdowns', value: statsLoading ? '…' : (liveStats.openBreakdowns ?? '—').toString(), icon: Shield, accent: 'indigo' },
  ];
  const [quickView, setQuickView] = useState<{ module: Module; accent: Accent } | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );

  const toggleCategory = (id: string) => setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  const allExpanded = Object.values(expandedMap).every(Boolean);
  const toggleAll = () => setExpandedMap(Object.fromEntries(CATEGORIES.map(c => [c.id, !allExpanded])));

  // ── Multi-select-to-favorites: pick several module tiles at once, then pin them
  // all in a single action instead of tapping the bookmark icon on each one. ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedHrefs, setSelectedHrefs] = useState<Set<string>>(new Set());
  const toggleSelectMode = () => { setSelectMode(v => !v); setSelectedHrefs(new Set()); };
  const toggleSelected = (href: string) => setSelectedHrefs(prev => {
    const next = new Set(prev);
    next.has(href) ? next.delete(href) : next.add(href);
    return next;
  });
  const confirmAddSelectedToFavorites = () => {
    s.addFavorites(Array.from(selectedHrefs));
    setSelectMode(false);
    setSelectedHrefs(new Set());
  };

  const filteredCategories = useMemo(() => {
    if (!s.searchQuery) return CATEGORIES;
    const query = s.searchQuery.toLowerCase();
    return CATEGORIES.map(cat => ({
      ...cat,
      modules: cat.modules.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags?.some(tag => tag.toLowerCase().includes(query))
      ),
    })).filter(cat => cat.modules.length > 0);
  }, [s.searchQuery]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);

  const visibleActions: QuickAction[] = [
    ...QUICK_ACTIONS,
    ...s.customQuickActions,
    ...s.frequentQuickActions,
  ];

  const accentHex = '#7c3aed';

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Search Results Banner */}
      <AnimatePresence>
        {s.searchQuery && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-6 px-4 py-3 ${t.glassSoft} rounded-xl flex items-center justify-between overflow-hidden`}
          >
            <p className={`text-[13px] ${t.textMuted}`}>
              <span className={`font-semibold ${t.textPrimary}`}>{totalResults}</span> module{totalResults === 1 ? '' : 's'} matching "<span className="font-medium">{s.searchQuery}</span>"
            </p>
            <button onClick={() => s.setSearchQuery('')} className={`text-[13px] ${t.linkText} ${t.linkHover} font-medium`} type="button">
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!s.searchQuery && <DashboardHeader />}

      {/* KPIs */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {kpiData.map((kpi, i) => <KPICard key={kpi.id} data={kpi} index={i} />)}
      </motion.div>

      {/* Quick Actions */}
      {!s.searchQuery && visibleActions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className={`text-[13px] font-semibold ${t.textSecondary} uppercase tracking-wider`}>Quick Actions</h3>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleActions.map(action => (
              <QuickActionCard
                key={action.id}
                action={action}
                onRemove={action.removable ? () => s.toggleQuickAction(action.href) : undefined}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3" id="modules">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`text-[15px] font-semibold ${t.textPrimary} tracking-tight`}>ERP Modules</h3>
            <p className={`text-[13px] ${t.textSecondary} mt-0.5`}>Organise and access your business operations</p>
          </div>
          {!s.searchQuery && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={toggleSelectMode}
                className={`flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-1.5 transition-colors ${
                  selectMode ? `${ACCENT.blue.chip} ${ACCENT.blue.text}` : `${t.textMuted} ${t.hoverText} ${t.glassSoft}`
                }`}
                type="button"
              >
                {selectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {selectMode ? 'Cancel selection' : 'Select modules'}
              </button>
              <button
                onClick={toggleAll}
                className={`flex items-center gap-1.5 text-[12px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} rounded-lg px-2.5 py-1.5 transition-colors`}
                type="button"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${allExpanded ? 'rotate-180' : ''}`} />
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          )}
        </div>

        {filteredCategories.length === 0 ? (
          <div className={`${t.glass} rounded-2xl overflow-hidden`}>
            <EmptyState icon={Search} title="No modules found" message="Try adjusting your search terms" />
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {filteredCategories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                isExpanded={s.searchQuery ? true : (expandedMap[category.id] ?? true)}
                onToggle={() => toggleCategory(category.id)}
                onQuickView={(module, accent) => setQuickView({ module, accent })}
                favorites={s.favoriteHrefs}
                onToggleFavorite={s.toggleFavorite}
                quickActions={s.quickActionHrefs}
                onToggleQuickAction={s.toggleQuickAction}
                accentHex={accentHex}
                selectMode={selectMode}
                selectedHrefs={selectedHrefs}
                onToggleSelected={toggleSelected}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Bulk "add selected to favorites" confirm bar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 ${t.glass} ${t.shadow} rounded-2xl px-4 py-2.5`}
          >
            <span className={`text-[13px] font-medium ${t.textPrimary}`}>
              {selectedHrefs.size === 0 ? 'Tap modules to select them' : `${selectedHrefs.size} module${selectedHrefs.size === 1 ? '' : 's'} selected`}
            </span>
            <button
              onClick={toggleSelectMode}
              className={`text-[12.5px] font-medium ${t.textMuted} ${t.hoverText} transition-colors`}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={confirmAddSelectedToFavorites}
              disabled={selectedHrefs.size === 0}
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold text-white rounded-lg px-3 py-1.5 bg-gradient-to-br ${ACCENT.blue.gradient} ${ACCENT.blue.solidGlow} hover:brightness-110 transition-all disabled:opacity-40`}
              type="button"
            >
              <Bookmark className="h-3.5 w-3.5" /> Add to Favorites
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CenterModal
        open={!!quickView}
        onClose={() => setQuickView(null)}
        title={quickView?.module.title ?? ''}
        subtitle="Module quick view"
        accent={quickView?.accent ?? 'blue'}
      >
        {quickView && <ModuleQuickView module={quickView.module} accent={quickView.accent} />}
      </CenterModal>

      <style>{`
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
