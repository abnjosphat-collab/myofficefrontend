import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MultiSelectFilter } from './MultiSelectFilter';

const OPTIONS = [
  { value: 'safety_shoes', label: 'Safety Shoes', count: 72 },
  { value: 'safety_helmet', label: 'Safety Helmet', count: 5 },
  { value: 'boots', label: 'boots', count: 5 },
];

function Harness() {
  const [value, setValue] = useState<string[]>([]);
  const [mode, setMode] = useState<'include' | 'exclude'>('include');
  return <MultiSelectFilter label="PPE types" unit="types" options={OPTIONS} value={value} onChange={setValue} mode={mode} onModeChange={setMode} allLabel="All types" />;
}

describe('MultiSelectFilter', () => {
  it('shows All, then N selected, then Excluding N', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /PPE types filter: All types/ }));
    await user.click(await screen.findByRole('checkbox', { name: /Safety Shoes/ }));
    await user.click(await screen.findByRole('checkbox', { name: /boots/ }));
    expect(screen.getByRole('button', { name: /PPE types filter: 2 types/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All except these' }));
    expect(screen.getByRole('button', { name: /PPE types filter: Excluding 2/ })).toBeInTheDocument();
  });

  it('lists every option with its count, including unknown values', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /PPE types filter/ }));
    expect(await screen.findByRole('checkbox', { name: /Safety Shoes \(72\)/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /boots \(5\)/ })).toBeInTheDocument();
  });

  it('removes via chips and resets the whole filter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /PPE types filter/ }));
    await user.click(await screen.findByRole('checkbox', { name: /Safety Shoes/ }));
    await user.click(await screen.findByRole('checkbox', { name: /boots/ }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Remove Safety Shoes' }));
    expect(screen.getByRole('button', { name: /PPE types filter: 1 types/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: /PPE types filter: All types/ })).toBeInTheDocument();
  });

  it('snaps the chip row sideways on phones (CSS only)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: /PPE types filter/ }));
    await user.click(await screen.findByRole('checkbox', { name: /Safety Shoes/ }));
    const chips = container.querySelector('ul[aria-label="PPE types, filtered"]') as HTMLElement;
    expect(chips.className).toContain('max-sm:snap-x');
    expect(chips.className).toContain('max-sm:overflow-x-auto');
    expect(chips.className).toContain('[&>*]:max-sm:snap-start');
  });

  it('clears from inside the popover without touching the mode', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /PPE types filter/ }));
    await user.click(await screen.findByRole('checkbox', { name: /Safety Shoes/ }));
    await user.click(screen.getByRole('button', { name: 'All except these' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: /PPE types filter: All types/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All except these' })).toHaveAttribute('aria-pressed', 'true');
  });
});
