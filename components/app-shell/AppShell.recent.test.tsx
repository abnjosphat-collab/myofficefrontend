// The sidebar shows the favourites only: even when the app has recently opened modules, the sidebar is handed none.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const recent = [{ href: '/leaves', title: 'Leaves' }, { href: '/ppe', title: 'PPE' }];
vi.mock('./useAppShellState', () => ({ useAppShellState: () => ({ recentModules: recent, favoriteModules: [], visibleCategories: [], searchQuery: '', setSearchQuery: () => {}, sidebarOpen: false, sidebarCollapsed: false }) }));
vi.mock('./ShellSidebar', () => ({ ShellSidebar: (props: { recentModules: unknown[]; search?: unknown }) => <div data-testid="sidebar" data-recent={props.recentModules.length} data-search={props.search ? 'yes' : 'no'} /> }));
vi.mock('./ShellTopBar', () => ({ ShellTopBar: () => null }));
vi.mock('./ShellFeedback', () => ({ ShellFeedback: () => null }));
vi.mock('./ShellSettings', () => ({ ShellSettings: () => null }));
vi.mock('./UsageTracker', () => ({ UsageTracker: () => null }));
vi.mock('./ServiceWorkerRegistrar', () => ({ ServiceWorkerRegistrar: () => null }));
vi.mock('./QuickActionsManagePanel', () => ({ QuickActionsManagePanel: () => null }));
vi.mock('./ActiveNoticesPopup', () => ({ ActiveNoticesPopup: () => null }));
vi.mock('@/components/ui-system', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/ui-system')>()),
  useAppearance: () => ({ appearance: { fontSize: 100 } }),
  AppFrame: ({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) => <div>{sidebar}{children}</div>,
}));

import { AppShell } from './AppShell';

describe('AppShell sidebar', () => {
  it('lists favourites only: no recent modules are passed to the sidebar', () => {
    render(<AppShell>page</AppShell>);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-recent', '0');
  });

  it('hands the search to the sidebar (the top bar no longer carries it)', () => {
    render(<AppShell>page</AppShell>);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-search', 'yes');
  });
});
