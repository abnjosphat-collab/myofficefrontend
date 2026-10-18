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

describe('NavItem', () => {
  it('marks the active destination with the selected fill', () => {
    render(<NavItem label="Equipment" icon="home" active onClick={vi.fn()} />);
    const row = screen.getByRole('button', { name: 'Equipment' });
    expect(row).toHaveAttribute('aria-current', 'page');
    expect(row.className).toContain('bg-action-soft');
  });
});
