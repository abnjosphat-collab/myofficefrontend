// components/app-shell/useAppShellState.ts — shell-wide state (sidebar, favorites,
// quick actions, usage tracking) shared by every page via AppShell. Extracted from
// app/page.tsx's HomePage component so it isn't re-created per page.
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Accent } from '@/components/shared/theme';
import { useAuth } from '@/lib/auth-context';
import {
  CATEGORIES, ALL_MODULES_BY_HREF,
  USAGE_KEY, AUTO_QA_DISMISSED_KEY, BUILTIN_QA_DISMISSED_KEY, MANUAL_QA_KEY, FAVORITES_KEY, SIDEBAR_COLLAPSED_KEY,
  QUICK_ACTIONS,
  FREQUENT_THRESHOLD, FREQUENT_LIMIT,
  readJSON, writeJSON,
  type Module, type QuickAction, type Category,
} from './modules';

export function useAppShellState() {
  const { isAtLeast } = useAuth();
  // The one role-gated category (Finance & Accounting, manager+) filtered out here
  // so every derived list below (favorites, quick actions, the grid itself) can't
  // surface it to someone who shouldn't see it — computed once instead of patching
  // each of the 4 consumers independently.
  const visibleCategories: Category[] = useMemo(
    () => CATEGORIES.filter(c => !c.minRole || isAtLeast(c.minRole)),
    [isAtLeast]
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Persisted preference (a Settings-panel option) rather than pure UI state — a
  // user who collapses the sidebar expects it to stay collapsed next session.
  const setSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) =>
    setSidebarCollapsedState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      writeJSON(SIDEBAR_COLLAPSED_KEY, next);
      return next;
    });

  // localStorage-backed — start with a server-safe default, populate post-mount (see
  // app/page.tsx's original comment: avoids a client/server hydration mismatch).
  const [favoriteHrefs, setFavoriteHrefs] = useState<Set<string>>(
    () => new Set(visibleCategories.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href)))
  );
  const [quickActionHrefs, setQuickActionHrefs] = useState<Set<string>>(new Set());
  const [dismissedAutoHrefs, setDismissedAutoHrefs] = useState<Set<string>>(new Set());
  const [dismissedBuiltinIds, setDismissedBuiltinIds] = useState<Set<string>>(new Set());
  const [quickActionsManageOpen, setQuickActionsManageOpen] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const defaultFavorites = visibleCategories.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href));
    const saved = readJSON<string[]>(FAVORITES_KEY, defaultFavorites);
    // New featured modules (e.g. Tools & Equipment) should appear in the sidebar
    // Favorites list even when the user already has a persisted set.
    const withoutSuspendedPortableTools = saved.filter(href => href !== '/portable-tools');
    const merged = Array.from(new Set([...withoutSuspendedPortableTools, ...defaultFavorites.filter(href => !withoutSuspendedPortableTools.includes(href) && href === '/tools')]));
    if (merged.length !== saved.length) writeJSON(FAVORITES_KEY, merged);
    setFavoriteHrefs(new Set(merged));
    setQuickActionHrefs(new Set(readJSON<string[]>(MANUAL_QA_KEY, [])));
    setDismissedAutoHrefs(new Set(readJSON<string[]>(AUTO_QA_DISMISSED_KEY, [])));
    setDismissedBuiltinIds(new Set(readJSON<string[]>(BUILTIN_QA_DISMISSED_KEY, [])));
    setUsageCounts(readJSON<Record<string, number>>(USAGE_KEY, {}));
    setSidebarCollapsedState(readJSON<boolean>(SIDEBAR_COLLAPSED_KEY, false));
    // Deliberately mount-only (see comment above) — visibleCategories is read for its
    // value at that moment, not tracked reactively, same tradeoff as everything else here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refresh = () => setUsageCounts(readJSON<Record<string, number>>(USAGE_KEY, {}));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Persisted directly inside the action — a mount-effect keyed on this state would
  // race the load effect above and clobber whatever was just restored.
  const toggleFavorite = (href: string) => setFavoriteHrefs(prev => {
    const next = new Set(prev);
    next.has(href) ? next.delete(href) : next.add(href);
    writeJSON(FAVORITES_KEY, Array.from(next));
    return next;
  });
  /** Bulk-add — powers the homepage's "select multiple modules, favorite them in
   * one go" flow, so pinning several modules is a single localStorage write
   * instead of N separate toggles. */
  const addFavorites = (hrefs: string[]) => setFavoriteHrefs(prev => {
    const next = new Set(prev);
    hrefs.forEach(h => next.add(h));
    writeJSON(FAVORITES_KEY, Array.from(next));
    return next;
  });
  const toggleQuickAction = (href: string) => setQuickActionHrefs(prev => {
    const next = new Set(prev);
    next.has(href) ? next.delete(href) : next.add(href);
    writeJSON(MANUAL_QA_KEY, Array.from(next));
    return next;
  });
  const dismissAutoAction = (href: string) => setDismissedAutoHrefs(prev => {
    const next = new Set(prev).add(href);
    writeJSON(AUTO_QA_DISMISSED_KEY, Array.from(next));
    return next;
  });
  const restoreAutoAction = (href: string) => setDismissedAutoHrefs(prev => {
    const next = new Set(prev);
    next.delete(href);
    writeJSON(AUTO_QA_DISMISSED_KEY, Array.from(next));
    return next;
  });
  const setBuiltinQuickActionVisible = (id: string, visible: boolean) => setDismissedBuiltinIds(prev => {
    const next = new Set(prev);
    visible ? next.delete(id) : next.add(id);
    writeJSON(BUILTIN_QA_DISMISSED_KEY, Array.from(next));
    return next;
  });
  /** Remove any quick-action card from the homepage row (built-in, pin, or auto suggestion). */
  const removeQuickAction = (action: QuickAction) => {
    if (action.auto) {
      dismissAutoAction(action.href);
      return;
    }
    if (action.builtin || QUICK_ACTIONS.some(b => b.id === action.id)) {
      setBuiltinQuickActionVisible(action.id, false);
      return;
    }
    if (quickActionHrefs.has(action.href)) {
      toggleQuickAction(action.href);
    }
  };

  /** Settings-panel action: wipes favorites/quick-actions/usage back to the
   * app's defaults. Local-only (no server-side preferences exist), so this is
   * a straightforward, fully-reversible localStorage reset. */
  const resetCustomizations = () => {
    const defaultFavorites = visibleCategories.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href));
    writeJSON(FAVORITES_KEY, defaultFavorites);
    writeJSON(MANUAL_QA_KEY, []);
    writeJSON(AUTO_QA_DISMISSED_KEY, []);
    writeJSON(BUILTIN_QA_DISMISSED_KEY, []);
    writeJSON(USAGE_KEY, {});
    setFavoriteHrefs(new Set(defaultFavorites));
    setQuickActionHrefs(new Set());
    setDismissedAutoHrefs(new Set());
    setDismissedBuiltinIds(new Set());
    setUsageCounts({});
  };

  const favoriteModules = useMemo(() => {
    const result: { module: Module; accent: Accent }[] = [];
    for (const cat of visibleCategories) {
      for (const mod of cat.modules) {
        if (favoriteHrefs.has(mod.href)) result.push({ module: mod, accent: cat.accent });
      }
    }
    return result;
  }, [favoriteHrefs, visibleCategories]);

  const customQuickActions = useMemo(() => {
    const result: QuickAction[] = [];
    for (const cat of visibleCategories) {
      for (const mod of cat.modules) {
        if (quickActionHrefs.has(mod.href)) {
          result.push({ id: mod.href, icon: mod.icon, label: mod.title, href: mod.href, accent: cat.accent, removable: true });
        }
      }
    }
    return result;
  }, [quickActionHrefs, visibleCategories]);

  // Builtin hrefs are deliberately NOT excluded here. A module the user actually
  // leans on (Maintenance, say) used to be permanently ineligible just because a
  // static builtin already pointed at it, so the heaviest-used module in the app
  // could never earn a "Frequently used" card. Consumers dedupe by href instead and
  // let the earned card replace the builtin — see visibleActions in app/page.tsx.
  const frequentQuickActions = useMemo(() => {
    return Object.entries(usageCounts)
      .filter(([href, count]) =>
        count >= FREQUENT_THRESHOLD &&
        !quickActionHrefs.has(href) &&
        !dismissedAutoHrefs.has(href) &&
        ALL_MODULES_BY_HREF.has(href)
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, FREQUENT_LIMIT)
      .map(([href]): QuickAction => {
        const entry = ALL_MODULES_BY_HREF.get(href)!;
        return { id: href, icon: entry.module.icon, label: entry.module.title, href, accent: entry.accent, removable: true, auto: true };
      });
  }, [usageCounts, quickActionHrefs, dismissedAutoHrefs]);

  const visibleQuickActions = useMemo(() => {
    const earned = [...customQuickActions, ...frequentQuickActions];
    const claimed = new Set(earned.map(a => a.href));
    const builtins = QUICK_ACTIONS.filter(
      a => !claimed.has(a.href) && !dismissedBuiltinIds.has(a.id),
    );
    return [...builtins, ...earned];
  }, [customQuickActions, frequentQuickActions, dismissedBuiltinIds]);

  return {
    visibleCategories,
    sidebarOpen, setSidebarOpen,
    sidebarCollapsed, setSidebarCollapsed,
    mobileSearchOpen, setMobileSearchOpen,
    searchQuery, setSearchQuery,
    customizeOpen, setCustomizeOpen,
    favoriteHrefs, favoriteModules, toggleFavorite, addFavorites,
    quickActionHrefs, customQuickActions, toggleQuickAction,
    dismissedAutoHrefs, dismissAutoAction, restoreAutoAction,
    dismissedBuiltinIds, setBuiltinQuickActionVisible,
    removeQuickAction, visibleQuickActions,
    quickActionsManageOpen, setQuickActionsManageOpen,
    frequentQuickActions,
    resetCustomizations,
  };
}

export type AppShellState = ReturnType<typeof useAppShellState>;
