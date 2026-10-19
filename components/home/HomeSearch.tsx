// components/home/HomeSearch.tsx — the homepage search: the same module catalogue
// ranking as the sidebar search, plus quick actions, in one centered field with
// typeahead suggestions that navigate. Wired to the shared shell query so typing
// here also filters the module grid below; choosing a result navigates and clears.
// While empty, an aria-hidden overlay types example searches over the field.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SEARCH_EXAMPLES, useTypewriterPlaceholder } from './useTypewriterPlaceholder';
import { DestinationSearch, type DestinationResult } from '@/components/ui-system';
import { clearSearchHistory, getSearchHistory, trackSearch } from '@/lib/usage';
import { rankModules, rankQuickActions, searchWords } from '@/lib/moduleSearch';
import { ALL_MODULES_BY_HREF, QUICK_ACTIONS, type Category, type Module, type QuickAction } from '@/components/app-shell/modules';

type HomeResult = DestinationResult & { href?: string; recentQuery?: string };

const toModuleResult = (module: Module, category: Category): HomeResult => ({
  id: module.href,
  href: module.href,
  kind: category.title,
  title: module.title,
  subtitle: module.description,
  icon: module.icon,
});

const toActionResult = (action: QuickAction): HomeResult => ({
  id: `action:${action.id}`,
  href: action.href,
  kind: 'Action',
  title: action.label,
  subtitle: ALL_MODULES_BY_HREF.get(action.href)?.module.title
    ? `In ${ALL_MODULES_BY_HREF.get(action.href)?.module.title}`
    : undefined,
  icon: action.icon,
});

export function HomeSearch({ value, onValueChange, visibleCategories }: {
  value: string;
  onValueChange: (value: string) => void;
  visibleCategories: Category[];
}) {
  const router = useRouter();
  const [history, setHistory] = useState<string[]>([]);
  const idle = value.trim() === '';
  const typed = useTypewriterPlaceholder(SEARCH_EXAMPLES, idle);

  const matches = useMemo<HomeResult[]>(() => {
    if (searchWords(value).length === 0) return [];
    const modules = visibleCategories
      .flatMap(category => rankModules(category.modules, value).map(module => toModuleResult(module, category)))
      .slice(0, 8);
    const actions = rankQuickActions(QUICK_ACTIONS, value).slice(0, 4).map(toActionResult);
    return [...modules, ...actions];
  }, [value, visibleCategories]);

  const recent = useMemo<HomeResult[]>(
    () => history.map(query => ({ id: `recent:${query}`, kind: 'Recent', title: query, icon: 'history' as const, recentQuery: query })),
    [history],
  );

  const refreshHistory = useCallback(() => setHistory(getSearchHistory(6)), []);

  const choose = useCallback((result: HomeResult) => {
    if (result.recentQuery) {
      onValueChange(result.recentQuery);
      return;
    }
    if (value.trim()) trackSearch(value, matches.length);
    if (result.href) router.push(result.href);
    onValueChange('');
  }, [matches.length, onValueChange, router, value]);

  return (
    <div className="relative mx-auto w-full max-w-2xl" onFocusCapture={refreshHistory}>
      <DestinationSearch
        label="Search MyOffice"
        placeholder=""
        hint="Searches module names, descriptions, tags and quick actions."
        value={value}
        onValueChange={onValueChange}
        results={matches}
        idleResults={recent}
        onClearIdle={() => { clearSearchHistory(); refreshHistory(); }}
        onChoose={choose}
      />
      {idle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 right-3 flex select-none items-center overflow-hidden whitespace-nowrap pl-9 font-sans text-body text-ink-subtle"
        >
          <span className="truncate">{typed}</span>
          <span className="typewriter-caret ml-px shrink-0" />
        </span>
      )}
    </div>
  );
}
