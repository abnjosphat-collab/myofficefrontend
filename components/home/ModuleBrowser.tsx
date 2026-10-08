// components/home/ModuleBrowser.tsx — the module directory on the home page: each category as a labelled section, each module as a quiet
// card (or a compact row) that is one real link. The card shows the module, one line of what it is, and a star when it is a favourite;
// pinning to favourites and the quick view live in one "more" menu on the card, so nothing else competes with the name.
// A "select several, add to favourites" mode is kept for pinning many at once.
'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Button, Dialog, Glyph, Icon, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, StatusBadge, Tag, cn } from '@/components/ui-system';
import { trackModuleUsage, type Category, type Module } from '@/components/app-shell';

export interface ModuleActions {
  favorites: Set<string>;
  onToggleFavorite: (href: string) => void;
  onQuickView: (module: Module) => void;
  selectMode: boolean;
  selected: Set<string>;
  onToggleSelected: (href: string) => void;
}

// Exported for the TestHomepage concept's per-category accordion; the home page
// itself keeps composing it through ModuleBrowser below. Zero behavior change.
export function ModuleTile({ module, row, actions }: { module: Module; row: boolean; actions: ModuleActions }) {
  const favorite = actions.favorites.has(module.href);
  const selected = actions.selected.has(module.href);
  const titleClasses = "text-left font-display text-title font-semibold leading-snug text-ink outline-none after:absolute after:inset-0 after:rounded-card after:content-['']";
  const title = actions.selectMode
    ? <button type="button" aria-pressed={selected} onClick={() => actions.onToggleSelected(module.href)} className={titleClasses}>{module.title}</button>
    : <Link href={module.href} onClick={() => trackModuleUsage(module.href)} className={titleClasses}>{module.title}</Link>;

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-card border bg-surface p-3.5 shadow-card transition-[border-color,box-shadow,transform] duration-[var(--mo-duration-base)] hover:-translate-y-px hover:border-line-strong hover:shadow-card-hover motion-reduce:hover:translate-y-0',
        'has-[a:focus-visible]:shadow-ring has-[button[aria-pressed]:focus-visible]:shadow-ring',
        row && 'items-center py-2.5',
        selected ? 'border-action bg-action-soft/60' : 'border-line',
      )}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-action-soft text-action"><Glyph as={module.icon} size="lg" weight="navigation" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5">
          {title}
          {favorite && !actions.selectMode && <Icon name="starred" size="xs" weight="emphasis" className="shrink-0 text-warning" label="Favourite" />}
          {actions.selectMode && selected && <StatusBadge tone="brand" icon="check">Selected</StatusBadge>}
        </span>
        <span className={cn('mt-0.5 block font-sans text-body-sm text-ink-muted', row ? 'truncate' : 'line-clamp-2')}>{module.description}</span>
      </span>
      {!actions.selectMode && (
        <Menu>
          <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" className="relative z-10 -mr-1 -mt-0.5 shrink-0" label={`More for ${module.title}`} /></MenuTrigger>
          <MenuContent>
            <MenuItem icon="starred" onSelect={() => { actions.onToggleFavorite(module.href); toast(favorite ? 'Removed from favourites.' : `${module.title} was pinned to favourites.`); }}>{favorite ? 'Remove from favourites' : 'Add to favourites'}</MenuItem>
            <MenuItem icon="eye" onSelect={() => actions.onQuickView(module)}>Quick view</MenuItem>
          </MenuContent>
        </Menu>
      )}
    </div>
  );
}

function CategorySection({ category, row, actions }: { category: Category; row: boolean; actions: ModuleActions }) {
  return (
    <section id={category.id} aria-labelledby={`cat-${category.id}`} className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex items-baseline gap-x-3 gap-y-0.5 border-b border-line-subtle pb-2">
        <h3 id={`cat-${category.id}`} className="shrink-0 font-display text-title font-semibold text-ink">{category.title}<span className="ml-2 font-sans text-caption font-normal text-ink-muted tabular">{category.modules.length}</span></h3>
        <p className="min-w-0 flex-1 truncate font-sans text-body-sm text-ink-muted">{category.description}</p>
      </div>
      <div className={row ? 'flex flex-col gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4'}>
        {category.modules.map(module => <ModuleTile key={module.href} module={module} row={row} actions={actions} />)}
      </div>
    </section>
  );
}

export function ModuleBrowser({ categories, view, actions }: { categories: Category[]; view: 'grid' | 'list'; actions: ModuleActions }) {
  return <div className="flex flex-col gap-8">{categories.map(category => <CategorySection key={category.id} category={category} row={view === 'list'} actions={actions} />)}</div>;
}

export function QuickViewDialog({ module, onClose }: { module: Module | null; onClose: () => void }) {
  return (
    <Dialog open={module !== null} onOpenChange={open => { if (!open) onClose(); }} title={module?.title ?? 'Module'} description={module?.description} size="sm" footer={module && (
      <Button asChild variant="primary" onClick={() => trackModuleUsage(module.href)}><Link href={module.href}>Open module</Link></Button>
    )}>
      {module && (
        <div className="flex flex-col gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-control bg-action-soft text-action"><Glyph as={module.icon} size="xl" weight="navigation" /></span>
          {module.tags && module.tags.length > 0 ? (
            <div>
              <p className="mb-1.5 font-sans text-caption text-ink-muted">Covers</p>
              <div className="flex flex-wrap gap-1.5">{module.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
            </div>
          ) : <p className="font-sans text-body-sm text-ink-muted">Open the module to see its records.</p>}
        </div>
      )}
    </Dialog>
  );
}
