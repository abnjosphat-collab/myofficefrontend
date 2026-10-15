// components/app-shell/ShellSearch.tsx — destination search over the module catalogue. Rendered at the top of the
// sidebar (desktop panel and mobile drawer), not in the top bar: one home for search in every shell.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DestinationSearch, type DestinationResult } from '@/components/ui-system';
import { clearSearchHistory, getSearchHistory, trackSearch } from '@/lib/usage';
import type { Category, Module } from './modules';

type ModuleResult = DestinationResult & { href?: string; recentQuery?: string };

const toResult = (module: Module, category: Category): ModuleResult => ({
  id: module.href,
  href: module.href,
  kind: category.title,
  title: module.title,
  subtitle: module.description,
  icon: module.icon,
});

export function ShellSearch({ value, onValueChange, visibleCategories, focusSignal = 0 }: {
  value: string;
  onValueChange: (value: string) => void;
  visibleCategories: Category[];
  /** Each bump focuses the field (the collapsed rail's search button expands first, then bumps this). */
  focusSignal?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => { if (focusSignal > 0) inputRef.current?.focus(); }, [focusSignal]);

  const matches = useMemo<ModuleResult[]>(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return visibleCategories
      .flatMap(category => category.modules
        .filter(module => module.title.toLowerCase().includes(query) || module.description.toLowerCase().includes(query))
        .map(module => toResult(module, category)))
      .slice(0, 8);
  }, [value, visibleCategories]);

  const recent = useMemo<ModuleResult[]>(
    () => history.map(query => ({ id: `recent:${query}`, kind: 'Recent', title: query, icon: 'history' as const, recentQuery: query })),
    [history],
  );

  const refreshHistory = useCallback(() => setHistory(getSearchHistory(6)), []);

  const choose = useCallback((result: ModuleResult) => {
    if (result.recentQuery) {
      onValueChange(result.recentQuery);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (value.trim()) trackSearch(value, matches.length);
    if (result.href) router.push(result.href);
    onValueChange('');
  }, [matches.length, onValueChange, router, value]);

  return (
    <div onFocusCapture={refreshHistory}>
      <DestinationSearch
        inputRef={inputRef}
        label="Search modules and pages"
        placeholder="Search modules and pages"
        hint="Searches module names and descriptions."
        value={value}
        onValueChange={onValueChange}
        results={matches}
        idleResults={recent}
        onClearIdle={() => { clearSearchHistory(); refreshHistory(); }}
        onChoose={choose}
      />
    </div>
  );
}
