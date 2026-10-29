// app/tools/ToolsFrame.tsx — the frame around every Tools screen: the shared sidebar and top bar (the same ones the rest of
// the app uses) over the floor backdrop. The sidebar lists the sections with workspace search pinned at its top, the top
// bar holds the section title, the department scope, notifications, settings and the account. Feedback floats bottom-right.
'use client';

import { useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  AppFrame, DestinationSearch, IconButton, NavItem, Select, SidebarFrame, TopBar,
  floatingActionClass,
  type SelectOption, type as typeRoles,
} from '@/components/ui-system';
import { AnimatedText } from '@/components/shared/floor/motion';
import { ToolsBrand } from './ToolsBrand';
import { ToolsNotifications } from './ToolsNotifications';
import { ToolsProfileMenu } from './ToolsProfileMenu';
import { Icon, type IconMeaning } from '@/components/ui-system';
import { abbreviateDepartment } from './prototype';
import { tabs, type ToolsWorkspace } from './useToolsWorkspace';

// One glyph component per meaning, cached so a destination keeps one identity between renders (NavItem takes
// a component). The glyphs are the app-wide set — Tools uses the same icons as every other module.
const TAB_MEANINGS: Record<string, IconMeaning> = { home: 'home', box: 'equipment', out: 'recipients', user: 'employees', check: 'compliance', toolbox: 'task', history: 'history', upload: 'upload', accounts: 'accounts', analytics: 'analytics', edit: 'edit' };
const navGlyphs = new Map<IconMeaning, ElementType>();
function navGlyph(tabIcon: string): ElementType {
  const meaning = TAB_MEANINGS[tabIcon] ?? 'app';
  let glyph = navGlyphs.get(meaning);
  if (!glyph) { glyph = function NavGlyphIcon() { return <Icon name={meaning} size={18} />; }; navGlyphs.set(meaning, glyph); }
  return glyph;
}
function SearchGlyph() { return <Icon name="search" size={18} />; }
export function ToolsFrame({ w, children }: { w: ToolsWorkspace; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { tab, visibleTabs, sidebarNav, sidebarCollapsed, department, departmentOptions, search, currentAccount } = w;
  const current = tabs.find(item => item.value === tab) ?? tabs[0];
  const go = (value: typeof tab) => { w.setTab(value); w.setStatus('all'); w.setSearch(''); w.track('opened section', tabs.find(item => item.value === value)?.label); };
  const departmentChoices: SelectOption[] = departmentOptions.map(option => ({ value: option.value, label: option.label }));
  const results = useMemo(() => w.workspaceSearchResults.map(result => ({ ...result, icon: result.icon })), [w.workspaceSearchResults]);

  const nav = (
    <>
      {/* G3: fixed order, like the sections nav — recency reordering moved items under the pointer. */}
      {sidebarCollapsed && (
        <NavItem label="Search" icon={SearchGlyph} active={false} collapsed onClick={() => { w.setSidebarCollapsed(false); requestAnimationFrame(() => w.searchRef.current?.focus()); }} onNavigate={() => undefined} />
      )}
      {sidebarNav.iconsOpen && visibleTabs.map(item => (
        <NavItem key={item.value} label={item.label} icon={navGlyph(item.icon)} active={item.value === tab}
          collapsed={sidebarCollapsed} onClick={() => go(item.value)} onNavigate={() => setNavOpen(false)} />
      ))}
    </>
  );

  return (
    <>
    <AppFrame
      sidebar={(
        <SidebarFrame
          open={navOpen}
          onOpenChange={setNavOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => w.setSidebarCollapsed(value => !value)}
          label="Tools navigation"
          spotlight={<ToolsBrand compact={sidebarCollapsed} />}
          search={(
            <DestinationSearch
              value={search}
              onValueChange={w.setSearch}
              results={results}
              onChoose={result => { const original = w.workspaceSearchResults.find(item => item.id === result.id); if (original) w.chooseSearchResult(original); }}
              placeholder="Search equipment, people, documents or settings…"
              label="Search the Tools workspace"
              shortcutHint="/"
              inputRef={w.searchRef}
            />
          )}
          onSearchExpand={() => { w.setSidebarCollapsed(false); requestAnimationFrame(() => w.searchRef.current?.focus()); }}
          strip={<><IconButton icon="sidebar" label="Open navigation" variant="ghost" onClick={() => setNavOpen(true)} /><IconButton icon="search" label="Search" variant="ghost" onClick={() => setNavOpen(true)} /><h1 className="font-sans text-body-sm font-semibold text-ink sm:hidden">{current.label}</h1></>}
          drawerBrand={<strong className="font-sans text-body-sm text-ink">Equipment E-System</strong>}
        >
          {nav}
        </SidebarFrame>
      )}
      topBar={(
        <TopBar
          start={<AnimatedText as="h1" text={current.label} className={`hidden sm:inline-block ${typeRoles.pageTitle}`} />}
          end={(
            <>
              <Select className="w-28 sm:w-44" aria-label="Department" value={departmentChoices.some(o => o.value === department) ? department : departmentChoices[0]?.value ?? 'all'}
                onValueChange={value => { w.setDepartment(value); w.clearFilters(); }} options={departmentChoices}
                triggerLabel={option => abbreviateDepartment(option.label)} title="Department scope: filters every section, counts and notifications." />
              <ToolsNotifications counts={w.counts} unread={w.unreadNotifications} unavailable={w.sourceState.notifications.error} loading={w.sourceState.notifications.loading}
                onRetry={w.retryWorkspace} onViewed={w.markNotificationsViewed}
                onShowOverdue={() => w.filterTo('overdue', 'loans')} onShowInspection={() => w.setTab('compliance')} onShowAccounts={() => w.setTab('accounts')} onShowFeedback={() => w.setTab('feedback')} onShowToolbox={() => w.setTab('toolbox')} />
              <IconButton icon="settings" label="Settings" variant="ghost" onClick={() => w.setModal({ kind: 'customize' })} />
              <ToolsProfileMenu account={currentAccount} onSignIn={() => w.setModal({ kind: 'auth' })} onSignOut={() => w.signOut()} />
            </>
          )}
        />
      )}
    >
      <div className="relative isolate flex min-h-[calc(100dvh-140px)] flex-col gap-5">
        {children}
      </div>
    </AppFrame>
    <IconButton icon="chat" label="Send feedback" variant="shell" size="lg" tooltipSide="left" className={floatingActionClass} onClick={() => w.setModal({ kind: 'feedback' })} />
    </>
  );
}
