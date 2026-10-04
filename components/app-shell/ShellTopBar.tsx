// components/app-shell/ShellTopBar.tsx — the one top bar: menu (below lg), brand, destination search,
// then Feedback, notifications, settings and the account. No theme / icon-style / design switches.
'use client';

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { DestinationSearch, IconButton, TopBar, type DestinationResult } from '@/components/ui-system';
import { clearSearchHistory, getSearchHistory, trackSearch } from '@/lib/usage';
import type { Category, Module } from './modules';
import { AccountMenu } from './AccountMenu';
import Link from 'next/link';
import { ShellFeedback } from './ShellFeedback';
import { ShellNotifications } from './ShellNotifications';

type ModuleResult = DestinationResult & { href?: string; recentQuery?: string };

const toResult = (module: Module, category: Category): ModuleResult => ({
  id: module.href,
  href: module.href,
  kind: category.title,
  title: module.title,
  subtitle: module.description,
  icon: module.icon,
});

function ModuleSearch({ inputRef, onFocusCapture, ...props }: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onValueChange: (value: string) => void;
  results: ModuleResult[];
  idleResults: ModuleResult[];
  onClearIdle: () => void;
  onChoose: (result: ModuleResult) => void;
  onFocusCapture: () => void;
}) {
  return (
    <div onFocusCapture={onFocusCapture}>
      <DestinationSearch inputRef={inputRef} label="Search modules and pages" placeholder="Search modules and pages" hint="Searches module names and descriptions." {...props} />
    </div>
  );
}

export function ShellTopBar({
  searchQuery, onSearchChange, mobileSearchOpen, onMobileSearchChange, onOpenSettings, visibleCategories,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  mobileSearchOpen: boolean;
  onMobileSearchChange: (open: boolean) => void;
  onOpenSettings: () => void;
  visibleCategories: Category[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const matches = useMemo<ModuleResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return visibleCategories
      .flatMap(category => category.modules
        .filter(module => module.title.toLowerCase().includes(query) || module.description.toLowerCase().includes(query))
        .map(module => toResult(module, category)))
      .slice(0, 8);
  }, [searchQuery, visibleCategories]);

  const recent = useMemo<ModuleResult[]>(
    () => history.map(query => ({ id: `recent:${query}`, kind: 'Recent', title: query, icon: 'history' as const, recentQuery: query })),
    [history],
  );

  const refreshHistory = useCallback(() => setHistory(getSearchHistory(6)), []);

  const choose = useCallback((result: ModuleResult) => {
    if (result.recentQuery) {
      onSearchChange(result.recentQuery);
      requestAnimationFrame(() => (mobileSearchOpen ? mobileInputRef : inputRef).current?.focus());
      return;
    }
    if (searchQuery.trim()) trackSearch(searchQuery, matches.length);
    if (result.href) router.push(result.href);
    onSearchChange('');
    onMobileSearchChange(false);
  }, [mobileSearchOpen, matches.length, onMobileSearchChange, onSearchChange, router, searchQuery]);

  const searchProps = {
    value: searchQuery,
    onValueChange: onSearchChange,
    results: matches,
    idleResults: recent,
    onClearIdle: () => { clearSearchHistory(); refreshHistory(); },
    onChoose: choose,
    onFocusCapture: refreshHistory,
  };

  return (
    <TopBar
      start={<Link href="/" className="focus-ring rounded-control px-1 py-0.5 font-sans text-title font-medium tracking-tight text-ink">MyOffice</Link>}
      center={<ModuleSearch inputRef={inputRef} {...searchProps} />}
      end={(
        <>
          <IconButton
            icon="search"
            label={mobileSearchOpen ? 'Close search' : 'Search'}
            pressed={mobileSearchOpen}
            onClick={() => onMobileSearchChange(!mobileSearchOpen)}
            variant="shell"
            size="shell"
            className="md:hidden"
          />
          <ShellFeedback />
          <ShellNotifications />
          <IconButton icon="settings" label="Settings" variant="shell" size="shell" onClick={onOpenSettings} />
          <AccountMenu onOpenSettings={onOpenSettings} />
        </>
      )}
      below={mobileSearchOpen && <div className="border-t border-line-subtle px-3 py-2 md:hidden"><ModuleSearch inputRef={mobileInputRef} {...searchProps} /></div>}
    />
  );
}
