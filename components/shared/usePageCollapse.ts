'use client';

import { useState, useCallback, useMemo } from 'react';

export interface PageCollapseState {
  expanded: Record<string, boolean>;
  toggle: (key: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  anyExpanded: boolean;
  allExpanded: boolean;
  /** Returns { open, onToggle } props to spread onto a GlassPanel or HeroPanel */
  panel: (key: string) => { open: boolean; onToggle: () => void };
}

/**
 * Manages collapse/expand state for all named sections on a page.
 *
 * By default every section starts COLLAPSED regardless of the initial values
 * you pass — giving every module page a clean, compact first load.
 * Pass { defaultCollapsed: false } to honour the initial booleans instead.
 *
 * Usage:
 *   const s = usePageCollapse({ hero: false, stats: false, records: false });
 *   <MasterCollapseButton collapse={s} />
 *   <HeroPanel {...s.panel('hero')} title="…" />
 *   <GlassPanel {...s.panel('stats')} title="…" />
 */
export function usePageCollapse(
  initial: Record<string, boolean>,
  opts: { defaultCollapsed?: boolean } = {},
): PageCollapseState {
  const { defaultCollapsed = true } = opts;
  const init = defaultCollapsed
    ? Object.fromEntries(Object.keys(initial).map(k => [k, false]))
    : initial;
  const [expanded, setExpanded] = useState<Record<string, boolean>>(init);

  const toggle = useCallback((key: string) => {
    setExpanded(p => ({ ...p, [key]: !p[key] }));
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(p => Object.fromEntries(Object.keys(p).map(k => [k, true])));
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(p => Object.fromEntries(Object.keys(p).map(k => [k, false])));
  }, []);

  const anyExpanded = useMemo(() => Object.values(expanded).some(Boolean), [expanded]);
  const allExpanded = useMemo(() => Object.values(expanded).every(Boolean), [expanded]);

  const panel = useCallback((key: string) => ({
    open: !!expanded[key],
    onToggle: () => setExpanded(p => ({ ...p, [key]: !p[key] })),
  }), [expanded]);

  return { expanded, toggle, expandAll, collapseAll, anyExpanded, allExpanded, panel };
}
