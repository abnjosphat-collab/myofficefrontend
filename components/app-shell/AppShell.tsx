// components/app-shell/AppShell.tsx — the shared page frame for every module route, built only from
// the UI system (components/ui-system). One appearance, one top bar (Feedback, notifications and
// settings live there), a sidebar that is a drawer below lg, and no bottom status bar. The document
// scrolls; there is no inner scroll container.
//
// `migrated` is true for routes that already use the UI system. Routes that have not migrated yet
// still render their own spacing and get the saved text size through CSS zoom on their content only
// (never on the shell); the flag and that zoom go away with the last legacy route.
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AppFrame, Button, Dialog, IconButton, useAppearance } from '@/components/ui-system';
import { ShellSidebar } from './ShellSidebar';
import { ShellTopBar } from './ShellTopBar';
import { ShellSettings } from './ShellSettings';
import { UsageTracker } from './UsageTracker';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';
import { useAppShellState } from './useAppShellState';
import { AppShellContext } from './context';
import { QuickActionsManagePanel } from './QuickActionsManagePanel';
import { ActiveNoticesPopup } from './ActiveNoticesPopup';

export function AppShell({ children, migrated = false }: { children: ReactNode; migrated?: boolean }) {
  const s = useAppShellState();
  const { appearance } = useAppearance();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // App-wide: clicking anywhere in a date/time input opens the native picker (not just
  // the tiny calendar glyph). Delegated so it covers every page's date fields without
  // each one wiring its own onClick. showPicker() needs a user gesture — a click is one.
  useEffect(() => {
    const PICKABLE = ['date', 'time', 'month', 'week', 'datetime-local'];
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLInputElement && PICKABLE.includes(el.type) && !el.disabled && !el.readOnly) {
        const anyEl = el as HTMLInputElement & { showPicker?: () => void };
        if (typeof anyEl.showPicker === 'function') {
          try { anyEl.showPicker(); } catch { /* not allowed in this context — ignore */ }
        }
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const legacyZoom = !migrated && appearance.fontSize !== 100 ? appearance.fontSize / 100 : undefined;

  return (
    <AppShellContext.Provider value={s}>
      <UsageTracker />
      <ServiceWorkerRegistrar />
      <AppFrame
        contained={migrated}
        topBar={(
          <ShellTopBar
            searchQuery={s.searchQuery}
            onSearchChange={s.setSearchQuery}
            mobileSearchOpen={s.mobileSearchOpen}
            onMobileSearchChange={s.setMobileSearchOpen}
            onOpenSettings={() => setSettingsOpen(true)}
            visibleCategories={s.visibleCategories}
          />
        )}
        sidebar={(
          <ShellSidebar
            open={s.sidebarOpen}
            onOpenChange={s.setSidebarOpen}
            collapsed={s.sidebarCollapsed}
            onToggleCollapsed={() => s.setSidebarCollapsed(!s.sidebarCollapsed)}
            favoriteModules={s.favoriteModules}
            recentModules={s.recentModules}
            onToggleFavorite={s.toggleFavorite}
            visibleCategories={s.visibleCategories}
          />
        )}
      >
        {legacyZoom ? <div style={{ zoom: legacyZoom }}>{children}</div> : children}
      </AppFrame>

      <Dialog
        open={s.customizeOpen}
        onOpenChange={s.setCustomizeOpen}
        title="Customise favourites"
        description="Manage the modules pinned to your sidebar."
        size="sm"
        footer={<Button onClick={() => s.setCustomizeOpen(false)}>Done</Button>}
      >
        {s.favoriteModules.length === 0 ? (
          <p className="font-sans text-body text-ink-muted">Nothing pinned yet. Use the bookmark on a module card on the home page.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {s.favoriteModules.map(({ module }) => (
              <li key={module.href} className="flex items-center justify-between gap-2 rounded-control border border-line-subtle bg-surface px-3 py-2">
                <span className="min-w-0 truncate font-sans text-body text-ink">{module.title}</span>
                <IconButton icon="close" variant="danger" size="sm" label={`Remove ${module.title} from favourites`} onClick={() => s.toggleFavorite(module.href)} />
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <ShellSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sidebarCollapsed={s.sidebarCollapsed}
        onSidebarCollapsedChange={s.setSidebarCollapsed}
        onResetCustomizations={s.resetCustomizations}
      />
      <QuickActionsManagePanel open={s.quickActionsManageOpen} onClose={() => s.setQuickActionsManageOpen(false)} />
      <ActiveNoticesPopup />
    </AppShellContext.Provider>
  );
}
