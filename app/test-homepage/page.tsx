// app/test-homepage/page.tsx — TEMPORARY design concept: the homepage reimagined
// as a briefing (verdict → figures → directory).
// Frontend-only, not linked from any nav; delete this folder to remove it.
// Every figure comes from the same real sources as the home page; nothing invented.
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, VIEW_GRID_LIST, useViewPreference } from '@/components/ui-system';
import { AppShell, trackModuleUsage, useAppShell, useDashboardData, type Module } from '@/components/app-shell';
import { useNotifications } from '@/components/app-shell/useNotifications';
import { QuickViewDialog } from '@/components/home/ModuleBrowser';
import { Masthead } from './Masthead';
import { Briefing } from './Briefing';
import { FiguresBand } from './FiguresBand';
import { DirectorySection } from './DirectorySection';
import { opsVerdict } from './verdict';
import { hrefForModuleName } from './moduleLinks';

/** Quiet staggered entrance; renders static when reduced motion is preferred. */
function Reveal({ index, children }: { index: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.24), ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ConceptContent() {
  const s = useAppShell();
  const { stats, loading: statsLoading } = useDashboardData();
  const { notifications, loading: notifLoading, failed: notifFailed } = useNotifications();
  const [view, setView] = useViewPreference('test_homepage_modules', VIEW_GRID_LIST);
  const [quickView, setQuickView] = useState<Module | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const live = !statsLoading && !notifLoading;
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  useEffect(() => {
    if (live && !updatedAt) setUpdatedAt(new Date());
  }, [live, updatedAt]);

  const searching = s.searchQuery.trim().length > 0;
  const filteredCategories = useMemo(() => {
    const query = s.searchQuery.trim().toLowerCase();
    if (!query) return s.visibleCategories;
    return s.visibleCategories
      .map(cat => ({ ...cat, modules: cat.modules.filter(m => m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query) || m.tags?.some(tag => tag.toLowerCase().includes(query))) }))
      .filter(cat => cat.modules.length > 0);
  }, [s.searchQuery, s.visibleCategories]);
  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.modules.length, 0);
  const moduleCount = s.visibleCategories.reduce((n, c) => n + c.modules.length, 0);

  const verdict = useMemo(() => {
    if (!live) return null;
    const critical = notifications.filter(n => n.status === 'critical');
    const pending = notifications.filter(n => n.status === 'pending');
    const top = [...critical, ...pending].find(n => hrefForModuleName(n.module) !== null);
    return opsVerdict({
      openBreakdowns: stats.openBreakdowns,
      activeWorkOrders: stats.activeWorkOrders,
      criticalCount: critical.length,
      pendingCount: pending.length,
      topItem: top ? { href: hrefForModuleName(top.module)!, module: top.module } : null,
      breakdownsHref: hrefForModuleName('Breakdowns'),
      workOrdersHref: hrefForModuleName('Maintenance'),
      failed: notifFailed,
    });
  }, [live, notifications, stats, notifFailed]);

  const toggleSelectMode = () => { setSelectMode(v => !v); setSelected(new Set()); };
  const toggleSelected = (href: string) => setSelected(prev => { const next = new Set(prev); if (next.has(href)) next.delete(href); else next.add(href); return next; });
  const addSelectedToFavourites = () => { s.addFavorites([...selected]); setSelectMode(false); setSelected(new Set()); };

  return (
    <div className="flex flex-col gap-8">
      <Masthead live={live} />
      <h1 className="sr-only">Home concept</h1>

      {searching ? (
        <>
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
            <p role="status" className="font-sans text-body text-ink-muted">
              <strong className="font-semibold text-ink">{totalResults}</strong>{' '}
              {totalResults === 1 ? 'module matches' : 'modules match'} &ldquo;{s.searchQuery}&rdquo;
            </p>
            <Button size="sm" onClick={() => s.setSearchQuery('')}>Clear search</Button>
          </div>
        </>
      ) : (
        <>
          <Reveal index={0}>
            <Briefing verdict={verdict} onReload={() => window.location.reload()} onNavigate={trackModuleUsage} />
          </Reveal>
          <Reveal index={1}>
            <FiguresBand stats={stats} loading={statsLoading} />
          </Reveal>
        </>
      )}

      <Reveal index={2}>
        <DirectorySection
          categories={filteredCategories}
          view={view}
          onViewChange={setView}
          actions={{
            favorites: s.favoriteHrefs,
            onToggleFavorite: s.toggleFavorite,
            onQuickView: setQuickView,
            selectMode,
            selected,
            onToggleSelected: toggleSelected,
          }}
          moduleCount={searching ? totalResults : moduleCount}
          categoryCount={searching ? filteredCategories.length : s.visibleCategories.length}
          searching={searching}
          onClearSearch={() => s.setSearchQuery('')}
          selectMode={selectMode}
          onToggleSelectMode={toggleSelectMode}
        />
      </Reveal>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-4">
        <p className="font-sans text-caption text-ink-subtle">Concept preview — this page isn&rsquo;t linked anywhere.</p>
        <p className="flex items-center gap-3 font-sans text-caption text-ink-muted">
          {updatedAt ? (
            <span>Updated {updatedAt.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}</span>
          ) : (
            <span role="status">Updating…</span>
          )}
          {notifFailed && <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Reload</Button>}
        </p>
      </footer>

      {selectMode && (
        <div className="fixed inset-x-3 bottom-4 z-[var(--mo-z-sticky)] mx-auto w-fit max-w-full">
          <Card padding="sm" className="flex flex-wrap items-center gap-3 shadow-popover">
            <span role="status" className="font-sans text-label font-medium text-ink">{selected.size === 0 ? 'Choose the modules to add' : `${selected.size} ${selected.size === 1 ? 'module' : 'modules'} selected`}</span>
            <Button size="sm" onClick={toggleSelectMode}>Cancel</Button>
            <Button size="sm" variant="primary" icon="starred" disabled={selected.size === 0} onClick={addSelectedToFavourites}>Add to favourites</Button>
          </Card>
        </div>
      )}

      <QuickViewDialog module={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}

export default function TestHomepage() {
  return (
    <AppShell migrated>
      <ConceptContent />
    </AppShell>
  );
}
