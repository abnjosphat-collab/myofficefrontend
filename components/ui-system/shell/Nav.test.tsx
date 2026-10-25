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
