import { afterEach, describe, expect, it, vi } from 'vitest';
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
    await user.type(screen.getByRole('combobox'), 'seal');
    expect(screen.queryByText('BRG-1')).not.toBeInTheDocument();
    // Highlight splits the code into marked/unmarked runs: SEAL is marked, -9 is not.
    expect(screen.getByText('SEAL', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText('1 match')).toBeInTheDocument();
    await user.clear(screen.getByRole('combobox'));
    expect(screen.getByText('2 parts in the catalogue')).toBeInTheDocument();
  });

  it('marks the matched words in code and description', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('combobox'), 'seal');
    const marks = screen.getAllByText((_, el) => el?.tagName === 'MARK');
    expect(marks.map(m => m.textContent).sort()).toEqual(['SEAL', 'Seal']);
  });

  it('offers Add to issue per row only when onAdd is given', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    setup({ onAdd });
    const adds = screen.getAllByRole('button', { name: 'Add to issue' });
    expect(adds).toHaveLength(2);
    await user.click(adds[0]);
    expect(onAdd).toHaveBeenCalledWith(SPARES[0]);
  });

  it('shows no Add buttons without onAdd', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Add to issue' })).not.toBeInTheDocument();
  });

  // jsdom's navigator.clipboard is getter-only: stub it with defineProperty and restore after each test.
  const CLIPBOARD_DESCRIPTOR = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
  afterEach(() => {
    if (CLIPBOARD_DESCRIPTOR) Object.defineProperty(window.navigator, 'clipboard', CLIPBOARD_DESCRIPTOR);
  });

  it('copies the code through the clipboard API', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    setup();
    await user.click(screen.getByRole('button', { name: 'Copy code BRG-1' }));
    expect(writeText).toHaveBeenCalledWith('BRG-1');
  });

  it('falls back when the clipboard API is missing', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, 'clipboard', { value: undefined, configurable: true });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand as never;
    setup();
    await user.click(screen.getByRole('button', { name: 'Copy code BRG-1' }));
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('arrow keys move the active option and Enter adds it', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    setup({ onAdd });
    const box = screen.getByRole('combobox');
    await user.type(box, '{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0].id);
    await user.type(box, '{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await user.type(box, '{ArrowUp}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.type(box, '{Enter}');
    expect(onAdd).toHaveBeenCalledWith(SPARES[0]);
  });

  it('Enter with no active option adds nothing', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    setup({ onAdd });
    await user.type(screen.getByRole('combobox'), '{Enter}');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('no match suggests trying the other field', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('combobox'), 'gearbox');
    expect(screen.getByText(/try words from the name/)).toBeInTheDocument();
  });

  it('no match explains itself and offers to clear', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('combobox'), 'gearbox');
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
