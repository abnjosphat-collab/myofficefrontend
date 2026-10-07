// app/test-homepage/DirectorySection.tsx — the full module catalogue under the
// briefing: visible by default, collapsible as a whole, and collapsible per
// category inside. Tiles are the home page's own ModuleTile via the concept's
// CategoryAccordion; while the shell search is active everything opens itself
// and shows only matches.
'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, EmptyState, Icon, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, ViewToggle, VIEW_GRID_LIST, cn } from '@/components/ui-system';
import { type ModuleActions } from '@/components/home/ModuleBrowser';
import type { Category } from '@/components/app-shell';
import { CategoryAccordion } from './CategoryAccordion';

export function DirectorySection({
  categories,
  view,
  onViewChange,
  actions,
  moduleCount,
  categoryCount,
  searching,
  onClearSearch,
  selectMode,
  onToggleSelectMode,
}: {
  categories: Category[];
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  actions: ModuleActions;
  moduleCount: number;
  categoryCount: number;
  searching: boolean;
  onClearSearch: () => void;
  selectMode: boolean;
  onToggleSelectMode: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.25;
  // The directory is the page's body, so it starts visible; the collapse is for
  // readers who navigate by sidebar or search instead. Search and select mode
  // always expand it.
  const [open, setOpen] = useState(true);
  const expanded = open || searching || selectMode;

  return (
    <section id="modules" aria-labelledby="modules-heading" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={expanded}
          aria-controls="module-directory"
          className="focus-ring group flex min-w-0 items-center gap-2 rounded-control text-left"
        >
          <Icon
            name="chevron-right"
            size="sm"
            className={cn('shrink-0 text-ink-subtle transition-transform duration-[var(--mo-duration-base)]', expanded && 'rotate-90')}
          />
          <span className="min-w-0">
            <span id="modules-heading" className="block font-display text-section font-semibold text-ink">
              {searching ? 'Matching modules' : 'Browse all modules'}
            </span>
            <span className="block font-sans text-body-sm text-ink-muted">
              {moduleCount} modules in {categoryCount} categories.
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onValueChange={onViewChange} options={VIEW_GRID_LIST} />
          <Menu>
            <MenuTrigger asChild><IconButton icon="more-vertical" variant="outline" label="More ways to work with modules" /></MenuTrigger>
            <MenuContent><MenuItem icon="check" onSelect={onToggleSelectMode}>{selectMode ? 'Stop selecting' : 'Select several to favourite'}</MenuItem></MenuContent>
          </Menu>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="module-directory"
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration }}
          >
            {categories.length === 0 ? (
              <EmptyState
                icon="search"
                title="No modules found"
                description="Try a different search."
                action={<Button onClick={onClearSearch}>Clear search</Button>}
              />
            ) : (
              <CategoryAccordion categories={categories} view={view} actions={actions} searching={searching} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
