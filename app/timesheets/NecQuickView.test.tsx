// app/timesheets/NecQuickView.test.tsx — the period summary names every bucket,
// dims zeros, foots the payable total from the buckets, and stays an honest
// skeleton while loading.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NecQuickView, type NecPeriodTotals } from './NecQuickView';

const totals: NecPeriodTotals = {
  people: 24, actual: 5120.5, reg: 4992, ot15: 312.5, ot20: 0, night: 240, standby: 32, filled: 261, possible: 300,
};

describe('NecQuickView', () => {
  it('names every bucket and foots the payable total', () => {
    render(<NecQuickView totals={totals} loading={false} />);
    expect(screen.getByRole('heading', { name: 'Period at a glance' })).toBeInTheDocument();
    expect(screen.getByText('5120.5h')).toBeInTheDocument();
    expect(screen.getByText('4992.0h')).toBeInTheDocument();
    expect(screen.getByText('312.5h')).toBeInTheDocument();
    // Payable = reg + 1.5× + 2.0× + night + standby (Actual is not added again).
    expect(screen.getByText('5576.5h')).toBeInTheDocument();
    expect(screen.getByText('capped at 208')).toBeInTheDocument();
    expect(screen.getByText('261 of 300 days entered')).toBeInTheDocument();
  });

  it('dims zero buckets instead of hiding them', () => {
    render(<NecQuickView totals={{ ...totals, ot20: 0, standby: 0 }} loading={false} />);
    for (const zero of screen.getAllByText('0.0h')) expect(zero).toHaveClass('text-ink-subtle');
    expect(screen.getByText('312.5h')).not.toHaveClass('text-ink-subtle');
  });

  it('shows a loading skeleton instead of zeroes while loading', () => {
    render(<NecQuickView totals={{ people: 0, actual: 0, reg: 0, ot15: 0, ot20: 0, night: 0, standby: 0, filled: 0, possible: 0 }} loading />);
    expect(screen.getByRole('status', { name: 'Loading period totals' })).toBeInTheDocument();
    expect(screen.queryByText('Payable total')).not.toBeInTheDocument();
  });
});
