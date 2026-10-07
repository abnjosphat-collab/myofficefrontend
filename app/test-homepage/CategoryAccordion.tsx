// app/test-homepage/CategoryAccordion.tsx — the module directory as collapsible
// per-category sections. Every category starts open; each collapses on its own
// and the choice persists per device. Searching overrides collapse so matches
// are never hidden inside a closed group. Tiles are the home page's own
// ModuleTile, so favourite/quick-view/select behave identically.
'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon, usePersistentState, cn } from '@/components/ui-system';
import { ModuleTile, type ModuleActions } from '@/components/home/ModuleBrowser';
import type { Category } from '@/components/app-shell';

const COLLAPSED_KEY = 'myoffice_test_homepage_collapsed';

export function CategoryAccordion({
  categories,
  view,
  actions,
  searching,
}: {
  categories: Category[];
  view: 'grid' | 'list';
  actions: ModuleActions;
  searching: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.25;
  const [collapsed, setCollapsed] = usePersistentState<string[]>(COLLAPSED_KEY, [], raw =>
    (Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : undefined));

  const toggle = (id: string) => setCollapsed(
    collapsed.includes(id) ? collapsed.filter(c => c !== id) : [...collapsed, id],
  );

  return (
    <div className="flex flex-col gap-6">
      {categories.map(category => {
        const expanded = searching || !collapsed.includes(category.id);
        return (
          <section key={category.id} id={category.id} aria-labelledby={`cat-${category.id}`} className="flex scroll-mt-24 flex-col gap-3">
            <button
              type="button"
              onClick={() => toggle(category.id)}
              aria-expanded={expanded}
              aria-controls={`cat-panel-${category.id}`}
              className="focus-ring flex min-w-0 items-center gap-2 rounded-control border-b border-line-subtle pb-2 text-left"
            >
              <Icon
                name="chevron-right"
                size="sm"
                className={cn('shrink-0 text-ink-subtle transition-transform duration-[var(--mo-duration-base)]', expanded && 'rotate-90')}
              />
              <span id={`cat-${category.id}`} className="shrink-0 font-display text-title font-semibold text-ink">
                {category.title}
                <span className="ml-2 font-sans text-caption font-normal text-ink-muted tabular">{category.modules.length}</span>
              </span>
              <span className="min-w-0 flex-1 truncate font-sans text-body-sm text-ink-muted">{category.description}</span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`cat-panel-${category.id}`}
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration }}
                >
                  <div className={view === 'list' ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4'}>
                    {category.modules.map(module => (
                      <ModuleTile key={module.href} module={module} row={view === 'list'} actions={actions} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
