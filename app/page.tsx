// app/page.tsx — MyOffice home: a title, the live operations figures, then the module directory. Shortcuts are the Favourites in the
// sidebar and categories are its groups, so neither is repeated here. Tips are one tap away instead of a standing banner.
// Every figure on this page comes from real records or from the module list itself; nothing is invented.
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, EmptyState, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, Popover, PopoverContent, PopoverTrigger, PageHeader, VIEW_GRID_LIST, ViewToggle, useViewPreference,
} from '@/components/ui-system';
import { AppShell, useAppShell, useDashboardData, type Module } from '@/components/app-shell';
import { ModuleBrowser, QuickViewDialog } from '@/components/home/ModuleBrowser';
import { Snapshot } from '@/components/home/Snapshot';

/** The current date and time, shown quietly under the title. */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  // The server and the browser disagree on "now"; the text is correct once the browser renders it.
  return <time suppressHydrationWarning dateTime={now.toISOString()}>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, {now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}</time>;
}

function Tips() {
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" icon="help">Tips</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <h2 className="font-display text-title font-semibold text-ink">Getting around</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 font-sans text-body-sm text-ink-muted">
          <li>Search from the top bar to jump to any module.</li>
          <li>Open a module&apos;s menu to pin it to Favourites in the sidebar.</li>
          <li>Feedback, notifications and settings are in the top bar.</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function HomeContent() {
  const s = useAppShell();
  const { stats, loading: statsLoading } = useDashboardData();
  const [view, setView] = useViewPreference('home_modules', VIEW_GRID_LIST);
  const [quickView, setQuickView] = useState<Module | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const toggleSelectMode = () => { setSelectMode(v => !v); setSelected(new Set()); };
  const toggleSelected = (href: string) => setSelected(prev => { const next = new Set(prev); if (next.has(href)) next.delete(href); else next.add(href); return next; });
  const addSelectedToFavourites = () => { s.addFavorites([...selected]); setSelectMode(false); setSelected(new Set()); };

  return (
    <div className="flex flex-col gap-8">
      {searching ? (
        <>
          <h1 className="sr-only">Home</h1>
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
            <p role="status" className="font-sans text-body text-ink-muted"><strong className="font-semibold text-ink">{totalResults}</strong> {totalResults === 1 ? 'module matches' : 'modules match'} “{s.searchQuery}”</p>
            <Button size="sm" onClick={() => s.setSearchQuery('')}>Clear search</Button>
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Home" description="Your modules and a live snapshot of operations." meta={<Clock />} actions={<Tips />} />
          <Snapshot stats={stats} loading={statsLoading} />
        </>
      )}

      <section id="modules" aria-labelledby="modules-heading" className="flex scroll-mt-24 flex-col gap-4">
        {!searching && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="modules-heading" className="font-display text-section font-semibold text-ink">All modules</h2><p className="font-sans text-body-sm text-ink-muted">{moduleCount} modules in {s.visibleCategories.length} categories.</p></div>
              <div className="flex items-center gap-2">
                <ViewToggle value={view} onValueChange={setView} options={VIEW_GRID_LIST} />
                <Menu>
                  <MenuTrigger asChild><IconButton icon="more-vertical" variant="outline" label="More ways to work with modules" /></MenuTrigger>
                  <MenuContent><MenuItem icon="check" onSelect={toggleSelectMode}>{selectMode ? 'Stop selecting' : 'Select several to favourite'}</MenuItem></MenuContent>
                </Menu>
              </div>
            </div>
          </>
        )}
        {filteredCategories.length === 0 ? (
          <EmptyState icon="search" title="No modules found" description="Try a different search." action={<Button onClick={() => s.setSearchQuery('')}>Clear search</Button>} />
        ) : (
          <ModuleBrowser
            categories={filteredCategories}
            view={view}
            actions={{ favorites: s.favoriteHrefs, onToggleFavorite: s.toggleFavorite, onQuickView: setQuickView, selectMode, selected, onToggleSelected: toggleSelected }}
          />
        )}
      </section>

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

export default function HomePage() {
  return (
    <AppShell migrated>
      <HomeContent />
    </AppShell>
  );
}
