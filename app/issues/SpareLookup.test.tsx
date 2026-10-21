import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpareLookup, type LookupSpare } from './SpareLookup';

const SPARES: LookupSpare[] = [
  { stock_code: 'BRG-1', description: 'Bearing 6204', unit_price: 12.5, current_quantity: 3, category: 'Bearings' },
  { stock_code: 'SEAL-9', description: 'Seal kit', unit_price: 30, current_quantity: 0, category: 'Seals' },
];

function setup(over: Partial<Parameters<typeof SpareLookup>[0]> = {}) {
  const onRetry = vi.fn();
  render(<SpareLookup spares={SPARES} loading={false} loaded error={null} onRetry={onRetry} {...over} />);
  return { onRetry };
}

describe('SpareLookup', () => {
  it('lists the catalogue with code, price, category and stock', () => {
    setup();
    expect(screen.getByText('2 parts in the catalogue')).toBeInTheDocument();
    expect(screen.getByText('BRG-1')).toBeInTheDocument();
    expect(screen.getByText('Bearing 6204')).toBeInTheDocument();
    expect(screen.getByText('Bearings')).toBeInTheDocument();
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('typing narrows to the matches, and clearing the search restores the list', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('searchbox'), 'seal');
    expect(screen.queryByText('BRG-1')).not.toBeInTheDocument();
    expect(screen.getByText('SEAL-9')).toBeInTheDocument();
    expect(screen.getByText('1 match')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByText('2 parts in the catalogue')).toBeInTheDocument();
  });

  it('no match explains itself and offers to clear', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('searchbox'), 'gearbox');
    expect(screen.getByText('No spare matches')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    expect(screen.getByText('2 parts in the catalogue')).toBeInTheDocument();
  });

  it('a failed catalogue says so with a retry, and loading shows the pulse', async () => {
    const { onRetry } = setup({ loaded: false, error: 'Server busy' });
    expect(screen.getByText('The spare catalogue could not be loaded')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    setup({ loaded: false, loading: true, error: null });
    expect(screen.getByText('Loading the spare catalogue')).toBeInTheDocument();
  });
});
