import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavItem, NavSpotlight } from './Nav';

describe('NavSpotlight', () => {
  it('nests the glyph square inside the pill with a smaller radius', () => {
    render(<NavSpotlight label="Overview" icon="home" href="/tools" />);
    const pill = screen.getByRole('link', { name: 'Overview' });
    expect(pill.className).toContain('rounded-nav');
    const square = pill.querySelector(':scope > span');
    expect(square!.className).toContain('rounded-sm');
    expect(square!.className).not.toContain('rounded-nav');
  });

  it('marks the current destination', () => {
    render(<NavSpotlight label="Overview" icon="home" href="/tools" />);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('NavItem hint (C8)', () => {
  it('shows a muted caption under the label', () => {
    render(<NavItem label="Tools & Equipment" hint="Uses its own sign-in" icon="home" href="/tools" />);
    const link = screen.getByRole('link', { name: /Tools & Equipment/ });
    expect(link).toHaveTextContent('Uses its own sign-in');
  });

  it('hides the caption on the icon-only rail', () => {
    render(<NavItem label="Tools & Equipment" hint="Uses its own sign-in" icon="home" href="/tools" collapsed />);
    expect(screen.queryByText('Uses its own sign-in')).toBeNull();
  });

  it('renders no caption without a hint', () => {
    const { container } = render(<NavItem label="Equipment" icon="home" href="/equipment" />);
    expect(container.querySelector('small')).toBeNull();
  });
});

describe('NavItem', () => {
  it('marks the active destination with the selected fill', () => {
    render(<NavItem label="Equipment" icon="home" active onClick={vi.fn()} />);
    const row = screen.getByRole('button', { name: 'Equipment' });
    expect(row).toHaveAttribute('aria-current', 'page');
    expect(row.className).toContain('bg-action-soft');
  });
});

describe('NavItem collapsed rail', () => {
  it('removes the hidden label from layout and spacing when collapsed', () => {
    render(<NavItem label="Personnel" icon="home" href="/personnel" collapsed />);
    const row = screen.getByRole('link', { name: 'Personnel' });
    // No gap beside a hidden label: the 26px glyph must centre exactly.
    expect(row.className).toContain('gap-0');
    // The label keeps no flex share and leaves layout entirely (no height, no spacing).
    const label = row.querySelector('span[aria-hidden="true"]');
    expect(label).not.toBeNull();
    expect(label!.className).toContain('hidden');
    expect(label!.className).not.toContain('flex-1');
  });

  it('restores the label to layout when expanded', () => {
    render(<NavItem label="Personnel" icon="home" href="/personnel" />);
    const row = screen.getByRole('link', { name: 'Personnel' });
    expect(row.className).toContain('gap-2.5');
    expect(row.className).not.toContain('gap-0');
    const label = row.querySelector('span[aria-hidden="true"]');
    expect(label).toBeNull();
  });

  it('keeps the accessible name on the control when collapsed', () => {
    render(<NavItem label="Personnel" icon="home" href="/personnel" collapsed />);
    expect(screen.getByRole('link', { name: 'Personnel' })).toHaveAttribute('aria-label', 'Personnel');
  });
});

describe('NavSpotlight collapsed rail', () => {
  it('removes the hidden label from layout and spacing when collapsed', () => {
    render(<NavSpotlight label="Overview" icon="home" href="/tools" collapsed />);
    const pill = screen.getByRole('link', { name: 'Overview' });
    expect(pill.className).toContain('gap-0');
    const label = pill.querySelector('strong[aria-hidden="true"]');
    expect(label).not.toBeNull();
    expect(label!.className).toContain('hidden');
  });
});
