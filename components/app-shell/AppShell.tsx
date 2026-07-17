// components/app-shell/AppShell.tsx — the shared page wrapper: homepage's own
// background/header/sidebar/footer chrome, extracted so every page can use it in
// place of components/PageShell.tsx (which still wraps Header/Footer/wallpaper for
// pages not yet migrated). No wallpaper here, per the homepage's design.
'use client';

import { useMemo, useEffect } from 'react';
import { Bookmark, X } from '@/components/shared/theme';
import {
  useTheme, CenterModal, DEFAULT_BG_ACCENT, bgLayersFromHex,
} from '@/components/shared/theme';
import { TopNavigation } from './TopNavigation';
import { SidebarNavigation } from './SidebarNavigation';
import { BottomBar } from './BottomBar';
import { UsageTracker } from './UsageTracker';
import { useAppShellState } from './useAppShellState';
import { AppShellContext } from './context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const s = useAppShellState();
  const bgAccent = DEFAULT_BG_ACCENT;
  const bgLayers = useMemo(() => bgLayersFromHex(bgAccent), []);

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

  return (
    <AppShellContext.Provider value={s}>
    <UsageTracker />
    <div
      className="relative flex h-screen flex-col"
      style={{ background: t.light ? bgLayers.light : bgLayers.darkWash }}
    >
      <TopNavigation
        onMenuToggle={() => s.setSidebarOpen(!s.sidebarOpen)}
        searchQuery={s.searchQuery}
        onSearchChange={s.setSearchQuery}
        mobileSearchOpen={s.mobileSearchOpen}
        setMobileSearchOpen={s.setMobileSearchOpen}
        onCustomize={() => s.setCustomizeOpen(true)}
        accentHex={bgAccent}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarNavigation
          isOpen={s.sidebarOpen}
          onClose={() => s.setSidebarOpen(false)}
          collapsed={s.sidebarCollapsed}
          onToggleCollapsed={() => s.setSidebarCollapsed(!s.sidebarCollapsed)}
          favoriteModules={s.favoriteModules}
          accentHex={bgAccent}
          onToggleFavorite={s.toggleFavorite}
        />

        <main className={`flex-1 overflow-y-auto transition-[margin] duration-300 ${s.sidebarCollapsed ? 'lg:ml-[76px]' : 'lg:ml-64'} pb-9`}>
          {children}
        </main>
      </div>

      <BottomBar
        sidebarCollapsed={s.sidebarCollapsed}
        onOpenCustomize={() => s.setCustomizeOpen(true)}
        onToggleSidebarCollapsed={() => s.setSidebarCollapsed(!s.sidebarCollapsed)}
        onResetCustomizations={s.resetCustomizations}
      />

      <CenterModal
        open={s.customizeOpen}
        onClose={() => s.setCustomizeOpen(false)}
        title="Customize"
        subtitle="Manage your pinned favorites"
        accent="violet"
        width="max-w-lg"
      >
        <>
          {s.favoriteModules.length === 0 ? (
            <p className={`text-[13px] ${t.textFaint} p-5`}>No favorites pinned yet — hover a module on the homepage and tap the bookmark icon.</p>
          ) : (
            <div className="p-5 space-y-1">
              {s.favoriteModules.map(({ module }) => (
                <div key={module.href} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${t.hoverBgSoft}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    <Bookmark className="h-3.5 w-3.5 shrink-0 text-brand-400" fill="currentColor" />
                    <span className={`text-[13px] ${t.textMuted} truncate`}>{module.title}</span>
                  </span>
                  <button
                    onClick={() => s.toggleFavorite(module.href)}
                    type="button"
                    title="Remove from favorites"
                    className={`p-1 rounded ${t.hoverBg} text-rose-500 hover:text-rose-400 transition-colors shrink-0`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      </CenterModal>
    </div>
    </AppShellContext.Provider>
  );
}
