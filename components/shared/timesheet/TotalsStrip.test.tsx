// components/shared/timesheet/TotalsStrip.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TotalsStrip } from './TotalsStrip';

describe('TotalsStrip', () => {
  it('labels every figure and stands the hero out', () => {
    render(<TotalsStrip label="Month totals" figures={[
      { value: '12.50h', label: 'Overtime @ 1.5×', hero: true },
      { value: '0.00h', label: 'Overtime @ 2.0×' },
    ]} />);
    const section = screen.getByRole('region', { name: 'Month totals' });
    expect(section).toBeInTheDocument();
    const hero = screen.getByText('12.50h');
    expect(hero.className).toContain('text-metric');
    expect(screen.getByText('0.00h').className).not.toContain('text-metric');
    expect(screen.getByText('Overtime @ 2.0×')).toBeInTheDocument();
  });

  it('renders the foot and footnote when given', () => {
    render(<TotalsStrip label="Period at a glance" figures={[{ value: '3', label: 'People' }]}
      foot={<p>Payable total 100.0h</p>} footnote="2 records still awaiting approval." />);
    expect(screen.getByText('Payable total 100.0h')).toBeInTheDocument();
    expect(screen.getByText('2 records still awaiting approval.')).toBeInTheDocument();
  });

  it('folds to one bar with the headline and opens on demand', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(<TotalsStrip label="Period totals" figures={[{ value: '40.0h', label: 'Actual hours' }]}
      footnote="Regular floored to 208." collapsible={{ expanded: false, onToggle, headline: <span>Payable 231.0h</span> }} />);
    expect(screen.getByText('Payable 231.0h')).toBeInTheDocument();
    expect(screen.queryByText('40.0h')).not.toBeInTheDocument();
    expect(screen.queryByText('Regular floored to 208.')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show Period totals' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<TotalsStrip label="Period totals" figures={[{ value: '40.0h', label: 'Actual hours' }]}
      footnote="Regular floored to 208." collapsible={{ expanded: true, onToggle, headline: <span>Payable 231.0h</span> }} />);
    expect(screen.getByText('40.0h')).toBeInTheDocument();
    expect(screen.getByText('Regular floored to 208.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Period totals' })).toHaveAttribute('aria-expanded', 'true');
  });
});
