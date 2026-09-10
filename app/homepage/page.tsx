// app/homepage/page.tsx — radical visual trial: an editorial, black-and-white
// "operating index" alternative to the violet/glass dashboard, restyled to read as
// an ERP application shell rather than a marketing page — a custom monochrome nav
// rail (page-local; components/app-shell/SidebarNavigation.tsx is untouched) drives
// collapsible category sections in the main content. Self-contained on purpose:
// fonts, palette, layout and copy all live in this one file so the trial can be
// judged (and deleted) without touching the shared design system, the real
// homepage, or any other route. Deliberately does NOT reuse PageHero/InfoCard/
// GlowCard/ACCENT — this is page-local neutral styling, evaluating a contrasting
// direction, not a design-system change.
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Playfair_Display, IBM_Plex_Sans, Space_Grotesk, Work_Sans } from 'next/font/google';
import { useTheme, ArrowRight, ChevronDown } from '@/components/shared/theme';
import { AppShell, useAppShell, type Module, type Category } from '@/components/app-shell';

// next/font/google, called at module scope (the one place it's allowed) — returns a
// ready-to-use `.className` that sets font-family directly, so no CSS variable or
// globals.css change is needed to keep this scoped to just the elements that use it.
// Ordinary editorial/body copy stays on Plus Jakarta Sans throughout, per the
// original brief — only the sidebar's own font is switchable, via SIDEBAR_FONTS below.
const editorialDisplay = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'] });

// Three ERP-appropriate body/UI font candidates, swapped live via a small switcher —
// applied to the whole page's body copy (headings stay on Playfair Display, the
// one constant across every choice, for editorial contrast).
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

type PageFontId = 'ibmPlex' | 'spaceGrotesk' | 'workSans';
const PAGE_FONTS: { id: PageFontId; label: string; className: string }[] = [
  // IBM Plex Sans — designed by IBM for enterprise software UI; the most literal
  // "ERP-like" choice, and the trial's default.
  { id: 'ibmPlex', label: 'IBM Plex', className: ibmPlexSans.className },
  // Space Grotesk — geometric/systematic, common in technical dashboards.
  { id: 'spaceGrotesk', label: 'Space Grotesk', className: spaceGrotesk.className },
  // Work Sans — a plain, neutral grotesque; reads as "internal tool," not a brand.
  { id: 'workSans', label: 'Work Sans', className: workSans.className },
];

// Three representative, clearly-labelled operational prompts — not live data. Kept
// as a small local constant so the black "Today's focus" panel below stays simple.
const TODAYS_FOCUS = [
  'Review overdue maintenance work orders before the week closes out.',
  'Confirm PPE compliance ahead of the next safety walk.',
  'Clear pending leave and overtime approvals before payroll cutoff.',
];

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// Shared neutral palette shape, threaded through every sub-component below instead
// of each one re-deriving it from useTheme() — one light/dark branch, in one place.
interface Palette { ink: string; inkMuted: string; inkFaint: string; hair: string; hoverSurface: string; cardBg: string; light: boolean }

// ─── One module = a real bordered, rounded-corner card (not a flat divided row) ──

function ModuleCard({ module, p }: { module: Module; p: Palette }) {
  const metric = module.metrics?.[0];
  return (
    <Link
      href={module.href}
      className={`group flex items-start justify-between gap-3 rounded-xl border ${p.hair} ${p.cardBg} p-4 transition-colors ${p.hoverSurface} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
    >
      <div className="min-w-0 flex items-start gap-2.5">
        <module.icon className={`h-4 w-4 mt-0.5 shrink-0 ${p.inkFaint}`} aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`${p.ink} font-semibold text-[14.5px] tracking-tight group-hover:underline underline-offset-4 decoration-1`}>
              {module.title}
            </h4>
            {module.badge && (
              <span className={`text-[10px] ${p.inkFaint} border ${p.hair} rounded-full px-1.5 py-px leading-tight`}>{module.badge}</span>
            )}
          </div>
          <p className={`${p.inkMuted} text-[12.5px] mt-0.5 leading-relaxed`}>{module.description}</p>
          {metric && (
            <p className={`text-[11px] ${p.inkFaint} tabular-nums mt-1.5`}>
              {metric.value} <span className="uppercase tracking-wide">{metric.label}</span>
            </p>
          )}
        </div>
      </div>
      <ArrowRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${p.inkFaint} transition-transform group-hover:translate-x-0.5`} aria-hidden="true" />
    </Link>
  );
}

// ─── One category = index number, editorial heading, collapsible card grid ─────

function CategorySection({ category, index, p, open, onToggle }: {
  category: Category; index: number; p: Palette; open: boolean; onToggle: () => void;
}) {
  return (
    <motion.div
      id={`cat-${category.id}`}
      variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
      className={`rounded-2xl border ${p.hair} ${p.cardBg} overflow-hidden mb-6 last:mb-0 scroll-mt-24`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 text-left px-5 sm:px-6 py-4 transition-colors ${p.hoverSurface} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current`}
      >
        <span className={`text-xs ${p.inkFaint} tabular-nums shrink-0`}>{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <h3 className={`${editorialDisplay.className} text-xl sm:text-2xl ${p.ink} tracking-tight`}>{category.title}</h3>
          <p className={`${p.inkMuted} text-[12.5px] mt-1 leading-relaxed hidden sm:block`}>{category.description}</p>
        </div>
        <span className={`text-[11px] ${p.inkFaint} uppercase tracking-wider shrink-0`}>{category.modules.length} modules</span>
        <ChevronDown className={`h-4 w-4 ${p.inkFaint} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`border-t ${p.hair} px-5 sm:px-6 py-5 grid grid-cols-1 xl:grid-cols-2 gap-3`}>
              {category.modules.map(module => <ModuleCard key={module.href} module={module} p={p} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Custom sidebar — a page-local nav rail with the same monochrome aesthetic as
// the rest of this trial, NOT a modification of components/app-shell/SidebarNavigation.
// Doubles as the expand/collapse control for the index below: a click both toggles
// that category's card grid open/closed and scrolls it into view, the way a real
// ERP's left-hand module tree drives its own content pane. ────────────────────────

function IndexSidebar({ categories, expanded, onToggle, p, fontId, onFontChange }: {
  categories: Category[]; expanded: Record<string, boolean>; onToggle: (id: string) => void; p: Palette;
  fontId: PageFontId; onFontChange: (id: PageFontId) => void;
}) {
  const handleSelect = (id: string) => {
    onToggle(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav aria-label="Operating index categories">
      <div className={`rounded-2xl border ${p.hair} ${p.cardBg} overflow-hidden lg:sticky lg:top-20`}>
        <p className={`text-[10.5px] ${p.inkFaint} uppercase tracking-[0.14em] font-semibold px-4 pt-4 pb-2`}>
          Index
        </p>

        {/* Font switch — trial-only, applies to the whole page's body/UI type in
            the three ERP-appropriate candidates (headings stay on Playfair
            Display). Plain radio-group semantics: one active choice, arrow keys
            move between options, no page reload. */}
        <div role="radiogroup" aria-label="Page font" className={`flex gap-1 px-3 pb-3 ${p.hair} border-b`}>
          {PAGE_FONTS.map(font => (
            <button
              key={font.id}
              type="button"
              role="radio"
              aria-checked={font.id === fontId}
              onClick={() => onFontChange(font.id)}
              title={font.label}
              className={`flex-1 rounded-md px-2 py-1.5 text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current ${
                font.id === fontId
                  ? (p.light ? 'bg-neutral-900 text-neutral-50' : 'bg-neutral-50 text-neutral-900')
                  : `${p.inkFaint} ${p.hoverSurface}`
              }`}
            >
              {font.label}
            </button>
          ))}
        </div>

        <ul>
          {categories.map((category, i) => {
            const isOpen = !!expanded[category.id];
            return (
              <li key={category.id} className={`border-t ${p.hair}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-[13px] transition-colors ${p.hoverSurface} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current ${
                    isOpen ? `${p.ink} font-semibold` : `${p.inkMuted} font-medium`
                  }`}
                >
                  <span className={`text-[10px] ${p.inkFaint} tabular-nums shrink-0`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate">{category.title}</span>
                  <span className={`text-[10px] ${p.inkFaint} tabular-nums shrink-0`}>{category.modules.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function EditorialWelcomeHub() {
  const t = useTheme();
  const light = t.light;
  const s = useAppShell();

  // Neutral, monochrome-only local palette — deliberately NOT t.textPrimary/ACCENT.
  // The app-wide tokens already resolve to grays, but this trial wants its own
  // specific ivory/near-black pairing, distinct from the dashboard's gray-50/slate-900.
  const p: Palette = {
    light,
    ink: light ? 'text-neutral-900' : 'text-neutral-50',
    inkMuted: light ? 'text-neutral-600' : 'text-neutral-400',
    inkFaint: light ? 'text-neutral-500' : 'text-neutral-500',
    hair: light ? 'border-neutral-300' : 'border-neutral-800',
    hoverSurface: light ? 'hover:bg-neutral-100' : 'hover:bg-neutral-900',
    cardBg: light ? 'bg-white' : 'bg-neutral-900/40',
  };
  const pageBg = light ? 'bg-[#faf8f5]' : 'bg-neutral-950';

  const totalModules = useMemo(
    () => s.visibleCategories.reduce((n, c) => n + c.modules.length, 0),
    [s.visibleCategories]
  );

  // Every category open by default (unchanged from the original brief) — this just
  // adds the *ability* to collapse one, via either the sidebar or a section's own
  // chevron; both read/write the same state so they can never fall out of sync.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => Object.fromEntries(s.visibleCategories.map(c => [c.id, true]))
  );
  const toggleCategory = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Trial-only font switch, applied to the whole page below — see PAGE_FONTS above.
  const [pageFontId, setPageFontId] = useState<PageFontId>('ibmPlex');
  const activeFont = PAGE_FONTS.find(f => f.id === pageFontId) ?? PAGE_FONTS[0];

  // Computed once on mount (SSR-safe: server and first client render show no date),
  // not a ticking clock — deliberate restraint, matching "no decorative animation."
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  return (
    <div className={`${activeFont.className} ${pageBg} ${p.ink} min-h-full`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-20">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className={`text-[11px] ${p.inkFaint} uppercase tracking-[0.18em] font-semibold`}
          >
            MyOffice — Operating Index
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={`${editorialDisplay.className} text-[40px] sm:text-[56px] leading-[1.05] tracking-tight mt-4`}
          >
            Your business, in full view.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className={`${p.inkMuted} text-[16px] mt-5 leading-relaxed`}
          >
            Personnel, maintenance, safety, inventory and analytics — every operation MyOffice
            runs, indexed on one page instead of buried behind menus.
          </motion.p>

          {/* Operational context — set in type, not KPI cards */}
          <p className={`text-[12px] ${p.inkFaint} uppercase tracking-wider mt-6 border-t ${p.hair} pt-4`}>
            All systems nominal · {s.visibleCategories.length} categories · {totalModules} modules
            {dateLabel && <> · {dateLabel}</>}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <a
              href="#operating-index"
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                light
                  ? 'bg-neutral-900 text-neutral-50 hover:bg-neutral-800 focus-visible:ring-neutral-900 focus-visible:ring-offset-[#faf8f5]'
                  : 'bg-neutral-50 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-50 focus-visible:ring-offset-neutral-950'
              }`}
            >
              Browse operations <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/visualization"
              className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[13px] font-semibold tracking-wide border ${p.hair} ${p.ink} ${p.hoverSurface} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                light ? 'focus-visible:ring-neutral-900 focus-visible:ring-offset-[#faf8f5]' : 'focus-visible:ring-neutral-50 focus-visible:ring-offset-neutral-950'
              }`}
            >
              View reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* ── Today's focus — a solid black panel, deliberately theme-independent ── */}
        <motion.section
          aria-labelledby="focus-heading"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl bg-neutral-950 text-neutral-50 mt-16 sm:mt-20 px-6 sm:px-10 py-10 sm:py-12"
        >
          <h2 id="focus-heading" className={`${editorialDisplay.className} text-2xl sm:text-3xl tracking-tight`}>
            Today&rsquo;s focus
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-8">
            {TODAYS_FOCUS.map((prompt, i) => (
              <li key={i} className="rounded-xl border border-neutral-800 p-4">
                <span className="text-[11px] text-neutral-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[14px] text-neutral-200 mt-2 leading-relaxed">{prompt}</p>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* ── The operating index — sidebar-driven, collapsible, every module ─── */}
        <section id="operating-index" aria-labelledby="index-heading" className="mt-16 sm:mt-20 scroll-mt-20">
          <h2 id="index-heading" className={`${editorialDisplay.className} text-2xl sm:text-3xl tracking-tight`}>
            The operating index
          </h2>
          <p className={`${p.inkMuted} text-[13px] mt-2 mb-8 max-w-xl leading-relaxed`}>
            Every category, every module — browse the index on the left, or scan the full list.
          </p>

          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 lg:items-start">
            <div className="hidden lg:block">
              <IndexSidebar
                categories={s.visibleCategories} expanded={expanded} onToggle={toggleCategory} p={p}
                fontId={pageFontId} onFontChange={setPageFontId}
              />
            </div>
            <div>
              {s.visibleCategories.map((category, i) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  index={i}
                  p={p}
                  open={!!expanded[category.id]}
                  onToggle={() => toggleCategory(category.id)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HomepageTrial() {
  return (
    <AppShell>
      <EditorialWelcomeHub />
    </AppShell>
  );
}
