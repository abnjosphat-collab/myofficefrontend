// app/timesheets/NecQuickView.test.tsx — the period summary folds to one bar with the payable total and opens
// to every bucket, dims zeros, foots the payable total from the buckets, and stays an honest skeleton while loading.
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NecQuickView, type NecPeriodTotals } from './NecQuickView';

const totals: NecPeriodTotals = {
  people: 24, actual: 5120.5, reg: 4992, ot15: 312.5, ot20: 0, night: 240, standby: 32, filled: 261, possible: 300,
};

beforeEach(() => window.localStorage.clear());

describe('NecQuickView', () => {
  it('folds to the payable total and opens to every bucket', async () => {
    const user = userEvent.setup();
    render(<NecQuickView totals={totals} loading={false} />);
    expect(screen.getByText('5576.5h')).toBeInTheDocument();
    expect(screen.queryByText('5120.5h')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show Period at a glance' }));
    expect(screen.getByText('5120.5h')).toBeInTheDocument();
    expect(screen.getByText('4992.0h')).toBeInTheDocument();
    expect(screen.getByText('312.5h')).toBeInTheDocument();
    // Payable = reg + 1.5× + 2.0× + night + standby (Actual is not added again): the bar and the foot agree.
    expect(screen.getAllByText('5576.5h')).toHaveLength(2);
    expect(screen.getByText('capped at 208')).toBeInTheDocument();
    expect(screen.getByText('261 of 300 days entered')).toBeInTheDocument();
  });

  it('dims zero buckets instead of hiding them', async () => {
    const user = userEvent.setup();
    render(<NecQuickView totals={{ ...totals, ot20: 0, standby: 0 }} loading={false} />);
    await user.click(screen.getByRole('button', { name: 'Show Period at a glance' }));
    for (const zero of screen.getAllByText('0.0h')) expect(zero).toHaveClass('text-ink-subtle');
    expect(screen.getByText('312.5h')).not.toHaveClass('text-ink-subtle');
  });

  it('shows a loading skeleton instead of zeroes while loading', () => {
    render(<NecQuickView totals={{ people: 0, actual: 0, reg: 0, ot15: 0, ot20: 0, night: 0, standby: 0, filled: 0, possible: 0 }} loading />);
    expect(screen.getByRole('status', { name: 'Loading period totals' })).toBeInTheDocument();
    expect(screen.queryByText('Payable total')).not.toBeInTheDocument();
  });
});
