// components/app-shell/ShellSidebar.tsx — the navigation, built from the UI system and laid out as the Tools
// sidebar: the current destination is promoted to the spotlight pill at the top; below it a bordered panel lists
// Home, the favourites and every module by category; a Hide/Show toggle closes the panel. Same destinations,
// favourites, usage tracking and role filtering as before. Below 821 px it becomes an icon strip plus a drawer.
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  DESKTOP_QUERY, Icon, IconButton, NavGroup, NavHeading, NavItem, NavSpotlight, SidebarFrame, useMediaQuery, usePersistentState, cn,
} from '@/components/ui-system';
import { trackModuleUsage, type Category, type Module } from './modules';
import { ShellBrand } from './ShellBrand';

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

export function ShellSidebar({
  open, onOpenChange, collapsed, onToggleCollapsed, favoriteModules, recentModules, onToggleFavorite, visibleCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  favoriteModules: { module: Module }[];
  recentModules: Module[];
  onToggleFavorite: (href: string) => void;
  visibleCategories: Category[];
}) {
  const pathname = usePathname();
  const desktop = useMediaQuery(DESKTOP_QUERY, true);
  const rail = collapsed && desktop;
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // The destination list can be hidden (persisted per device), as the Tools "Hide" toggle does.
  const [listOpen, setListOpen] = usePersistentState<boolean>('myoffice_nav_open', true, raw => (typeof raw === 'boolean' ? raw : undefined));

  const modules = visibleCategories.flatMap(c => c.modules);
  const current = modules.find(m => isActive(pathname, m.href));
  const activeCategoryId = visibleCategories.find(c => c.modules.some(m => isActive(pathname, m.href)))?.id;
  const home = pathname === '/';
  const close = () => onOpenChange(false);
  const go = (href: string) => () => { trackModuleUsage(href); close(); };
  const favourites = favoriteModules.filter(({ module }) => module.href !== current?.href);
  const recent = recentModules.filter(m => m.href !== current?.href);

  const spotlight = (compact: boolean) => current
    ? <NavSpotlight label={current.title} icon={current.icon} href={current.href} collapsed={compact} onNavigate={go(current.href)} />
    : <NavSpotlight label="Home" icon="home" href="/" collapsed={compact} current={home} onNavigate={close} />;

  const footer = (
    <button
      type="button"
      aria-expanded={listOpen}
      aria-label={listOpen ? 'Hide navigation list' : 'Show navigation list'}
      onClick={() => setListOpen(!listOpen)}
      className="focus-ring touch-target flex min-h-8 w-full items-center justify-center gap-2 rounded-b-[16px] font-sans text-caption font-semibold text-ink-muted transition-colors duration-[var(--mo-duration-base)] hover:bg-soft hover:text-action"
    >
      <Icon name={listOpen ? 'chevron-up' : 'chevron-down'} size="xs" />
      {!rail && <span>{listOpen ? 'Hide' : 'Show'}</span>}
    </button>
  );

  const list = !listOpen ? null : rail ? (
    <>
      {!(home && !current) && <NavItem label="Home" icon="home" href="/" active={home} collapsed onNavigate={close} />}
      {favourites.map(({ module }) => <NavItem key={module.href} label={module.title} icon={module.icon} href={module.href} active={isActive(pathname, module.href)} collapsed onNavigate={go(module.href)} />)}
      <NavItem label="All modules" icon="app" collapsed onClick={onToggleCollapsed} />
    </>
  ) : (
    <>
      {(current || !home) && <NavItem label="Home" icon="home" href="/" active={home} onNavigate={close} />}
      <NavHeading
        action={favourites.length > 0 && (
          <IconButton icon={editing ? 'check' : 'edit'} label={editing ? 'Done editing favourites' : 'Edit favourites'} size="sm" pressed={editing} onClick={() => setEditing(v => !v)} />
        )}
      >
        Favourites
      </NavHeading>
      {favoriteModules.length === 0 ? (
        <p className="px-[11px] py-1.5 font-sans text-caption text-ink-muted">Pin a module from the home page to keep it here.</p>
      ) : favourites.map(({ module }) => (
        <NavItem
          key={module.href}
          label={module.title}
          icon={module.icon}
          href={module.href}
          active={isActive(pathname, module.href)}
          onNavigate={go(module.href)}
          trailing={editing && <IconButton icon="close" label={`Remove ${module.title} from favourites`} size="sm" variant="danger" onClick={() => onToggleFavorite(module.href)} />}
          className={cn(editing && 'pr-10')}
        />
      ))}

      {recent.length > 0 && (
        <>
          <NavHeading>Recent</NavHeading>
          {recent.map(module => (
            <NavItem
              key={module.href}
              label={module.title}
              icon={module.icon}
              href={module.href}
              active={isActive(pathname, module.href)}
              onNavigate={go(module.href)}
            />
          ))}
        </>
      )}

      <NavHeading>All modules</NavHeading>
      {visibleCategories.map(category => (
        <NavGroup
          key={category.id}
          label={category.title}
          icon={category.icon}
          open={expanded[category.id] ?? category.id === activeCategoryId}
          onOpenChange={next => setExpanded(prev => ({ ...prev, [category.id]: next }))}
        >
          {category.modules.map(module => (
            <NavItem key={module.href} label={module.title} icon={module.icon} href={module.href} active={isActive(pathname, module.href)} onNavigate={go(module.href)} />
          ))}
        </NavGroup>
      ))}
    </>
  );

  return (
    <SidebarFrame
      open={open}
      onOpenChange={onOpenChange}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      spotlight={spotlight(rail)}
      footer={footer}
      drawerBrand={<ShellBrand />}
      strip={(
        <>
          <IconButton icon="sidebar" label="Open navigation" variant="shell" size="shell" onClick={() => onOpenChange(true)} className="shrink-0" />
          {spotlight(true)}
          {!(home && !current) && <NavItem label="Home" icon="home" href="/" active={home} collapsed className="w-auto min-w-9 shrink-0 px-2 pointer-coarse:min-w-11" />}
          {favourites.map(({ module }) => (
            <NavItem key={module.href} label={module.title} icon={module.icon} href={module.href} active={isActive(pathname, module.href)} collapsed onNavigate={go(module.href)} className="w-auto min-w-9 shrink-0 px-2 pointer-coarse:min-w-11" />
          ))}
        </>
      )}
    >
      {list}
    </SidebarFrame>
  );
}
