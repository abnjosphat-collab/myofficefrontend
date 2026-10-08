// components/app-shell/ShellSidebar.test.tsx — the sidebar never promotes,
// reorders, or hides destinations: the current page stays in its lists with
// the active fill, Recent collapses, and category states persist per device.
// Standby stands next to Shifts under Time & Attendance.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShellSidebar } from './ShellSidebar';
import { CATEGORIES } from './modules';
import { Clock, Sun, TooltipProvider } from '@/components/ui-system';

let pathname = '/shifts';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

beforeEach(() => {
  window.localStorage.clear();
  pathname = '/shifts';
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
  });
});
afterEach(() => { window.localStorage.clear(); });

const shifts = { icon: Sun, title: 'Shifts', description: '', href: '/shifts' };
const standby = { icon: Clock, title: 'Standby', description: '', href: '/standby' };
const leaves = { icon: Clock, title: 'Leaves', description: '', href: '/leaves' };
const maintenance = { icon: Clock, title: 'Maintenance', description: '', href: '/maintenance' };
const categories = [
  { id: 'time', title: 'Time & Attendance', description: '', icon: Clock, modules: [leaves, shifts, standby] },
  { id: 'operations', title: 'Operations & Maintenance', description: '', icon: Clock, modules: [maintenance] },
];
const base = {
  open: false, onOpenChange: () => {}, collapsed: false, onToggleCollapsed: () => {},
  favoriteModules: [], recentModules: [], onToggleFavorite: () => {}, visibleCategories: categories,
};

describe('ShellSidebar', () => {
  it('stands Standby next to Shifts under Time & Attendance', () => {
    pathname = '/standby';
    render(<ShellSidebar {...base} visibleCategories={CATEGORIES} />);
    expect(screen.getByRole('button', { name: 'Time & Attendance' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Standby' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Operations & Maintenance' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the current page in its lists with a static brand header', () => {
    render(<ShellSidebar {...base} favoriteModules={[{ module: shifts }]} recentModules={[shifts]} />);
    expect(screen.getByRole('link', { name: 'MyOffice home' })).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Shifts' });
    expect(links).toHaveLength(3);
    for (const link of links) expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('collapses Recent and remembers it across remounts', async () => {
    const user = userEvent.setup();
    const first = render(<ShellSidebar {...base} recentModules={[leaves]} />);
    expect(screen.getByRole('button', { name: 'Recent' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Recent' }));
    expect(screen.getByRole('button', { name: 'Recent' })).toHaveAttribute('aria-expanded', 'false');
    first.unmount();

    render(<ShellSidebar {...base} recentModules={[leaves]} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Recent' })).toHaveAttribute('aria-expanded', 'false'));
  });

  it('remembers a collapsed category even when it holds the current page', async () => {
    const user = userEvent.setup();
    const first = render(<ShellSidebar {...base} />);
    const group = () => screen.getByRole('button', { name: 'Time & Attendance' });
    expect(group()).toHaveAttribute('aria-expanded', 'true');
    await user.click(group());
    expect(group()).toHaveAttribute('aria-expanded', 'false');
    first.unmount();

    render(<ShellSidebar {...base} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Time & Attendance' })).toHaveAttribute('aria-expanded', 'false'));
  });

  it('renders the rail with Home, favourites and an expander when collapsed', () => {
    render(<TooltipProvider><ShellSidebar {...base} collapsed favoriteModules={[{ module: shifts }]} /></TooltipProvider>);
    expect(screen.getByRole('button', { name: 'All modules' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shifts' })).toBeInTheDocument();
  });
});
