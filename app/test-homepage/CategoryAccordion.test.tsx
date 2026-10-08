// app/test-homepage/CategoryAccordion.test.tsx — the directory's per-category
// collapse: open by default, independently collapsible, searching overrides,
// and the choice persists per device. framer-motion is stubbed so assertions
// run against state changes, not tween timing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Category, Module } from '@/components/app-shell';
import type { ModuleActions } from '@/components/home/ModuleBrowser';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: { div: ({ children, ...rest }: any) => <div {...rest}>{children}</div> },
  useReducedMotion: () => true,
}));

// Imported after the mocks above so the module picks them up.
const { CategoryAccordion } = await import('./CategoryAccordion');

const NullIcon = () => null;

function mod(over: Partial<Module> = {}): Module {
  return { icon: NullIcon, title: 'Module', description: 'Does things', href: '/module', ...over };
}

function cat(id: string, modules: Module[]): Category {
  return { id, title: `Category ${id}`, description: `Description ${id}`, icon: NullIcon, modules };
}

const actions: ModuleActions = {
  favorites: new Set<string>(),
  onToggleFavorite: vi.fn(),
  onQuickView: vi.fn(),
  selectMode: false,
  selected: new Set<string>(),
  onToggleSelected: vi.fn(),
};

const categories = [
  cat('a', [mod({ title: 'Alpha One', href: '/alpha-one' }), mod({ title: 'Alpha Two', href: '/alpha-two' })]),
  cat('b', [mod({ title: 'Beta One', href: '/beta-one' })]),
];

function header(name: string) {
  // The disclosure button's accessible name comes from its title + count text.
  return screen.getByRole('button', { name: new RegExp(name) });
}

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { window.localStorage.clear(); });

describe('CategoryAccordion', () => {
  it('renders every category expanded with its modules by default', () => {
    render(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={false} />);
    expect(header('Category a')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Category b')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Alpha One')).toBeInTheDocument();
    expect(screen.getByText('Beta One')).toBeInTheDocument();
  });

  it('collapses only the clicked category, and re-expands on a second click', async () => {
    const user = userEvent.setup();
    render(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={false} />);

    await user.click(header('Category a'));
    expect(header('Category a')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Alpha One')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha Two')).not.toBeInTheDocument();
    // The untouched category stays open.
    expect(header('Category b')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Beta One')).toBeInTheDocument();

    await user.click(header('Category a'));
    expect(header('Category a')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Alpha One')).toBeInTheDocument();
  });

  it('forces collapsed categories open while searching so matches are never hidden', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={false} />);
    await user.click(header('Category a'));
    expect(header('Category a')).toHaveAttribute('aria-expanded', 'false');

    rerender(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={true} />);
    expect(header('Category a')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Alpha One')).toBeInTheDocument();
  });

  it('persists collapsed categories across remounts', async () => {
    const user = userEvent.setup();
    const first = render(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={false} />);
    await user.click(header('Category b'));
    expect(header('Category b')).toHaveAttribute('aria-expanded', 'false');
    first.unmount();

    render(<CategoryAccordion categories={categories} view="grid" actions={actions} searching={false} />);
    // Restoration runs in an effect after mount, so the category opens first.
    await waitFor(() => expect(header('Category b')).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByText('Beta One')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha One')).toBeInTheDocument();
  });
});
