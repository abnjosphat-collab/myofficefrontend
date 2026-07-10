// components/app-shell/useAppShellState.ts — shell-wide state (sidebar, favorites,
// quick actions, usage tracking) shared by every page via AppShell. Extracted from
// app/page.tsx's HomePage component so it isn't re-created per page.
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Accent } from '@/components/shared/theme';
import {
  CATEGORIES, QUICK_ACTIONS, ALL_MODULES_BY_HREF,
  USAGE_KEY, AUTO_QA_DISMISSED_KEY, MANUAL_QA_KEY, FAVORITES_KEY,
  FREQUENT_THRESHOLD, FREQUENT_LIMIT,
  readJSON, writeJSON,
  type Module, type QuickAction,
} from './modules';

export function useAppShellState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // localStorage-backed — start with a server-safe default, populate post-mount (see
  // app/page.tsx's original comment: avoids a client/server hydration mismatch).
  const [favoriteHrefs, setFavoriteHrefs] = useState<Set<string>>(
    () => new Set(CATEGORIES.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href)))
  );
  const [quickActionHrefs, setQuickActionHrefs] = useState<Set<string>>(new Set());
  const [dismissedAutoHrefs, setDismissedAutoHrefs] = useState<Set<string>>(new Set());
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const defaultFavorites = CATEGORIES.flatMap(c => c.modules.filter(m => m.featured).map(m => m.href));
    setFavoriteHrefs(new Set(readJSON<string[]>(FAVORITES_KEY, defaultFavorites)));
    setQuickActionHrefs(new Set(readJSON<string[]>(MANUAL_QA_KEY, [])));
    setDismissedAutoHrefs(new Set(readJSON<string[]>(AUTO_QA_DISMISSED_KEY, [])));
    setUsageCounts(readJSON<Record<string, number>>(USAGE_KEY, {}));
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

  const favoriteModules = useMemo(() => {
    const result: { module: Module; accent: Accent }[] = [];
    for (const cat of CATEGORIES) {
      for (const module of cat.modules) {
        if (favoriteHrefs.has(module.href)) result.push({ module, accent: cat.accent });
      }
    }
    return result;
  }, [favoriteHrefs]);

  const customQuickActions = useMemo(() => {
    const result: QuickAction[] = [];
    for (const cat of CATEGORIES) {
      for (const module of cat.modules) {
        if (quickActionHrefs.has(module.href)) {
          result.push({ id: module.href, icon: module.icon, label: module.title, href: module.href, accent: cat.accent, removable: true });
        }
      }
    }
    return result;
  }, [quickActionHrefs]);

  const frequentQuickActions = useMemo(() => {
    const builtinHrefs = new Set(QUICK_ACTIONS.map(a => a.href));
    return Object.entries(usageCounts)
      .filter(([href, count]) =>
        count >= FREQUENT_THRESHOLD &&
        !builtinHrefs.has(href) &&
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

  return {
    sidebarOpen, setSidebarOpen,
    sidebarCollapsed, setSidebarCollapsed,
    mobileSearchOpen, setMobileSearchOpen,
    searchQuery, setSearchQuery,
    customizeOpen, setCustomizeOpen,
    favoriteHrefs, favoriteModules, toggleFavorite,
    quickActionHrefs, customQuickActions, toggleQuickAction,
    dismissedAutoHrefs, dismissAutoAction,
    frequentQuickActions,
  };
}

export type AppShellState = ReturnType<typeof useAppShellState>;
