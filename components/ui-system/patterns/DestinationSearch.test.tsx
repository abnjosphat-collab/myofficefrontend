import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationSearch, type DestinationResult } from './DestinationSearch';

const HITS: DestinationResult[] = [
  { id: 'a', kind: 'Page', title: 'Artisan Timesheets', icon: () => null },
  { id: 'n', kind: 'Page', title: 'NEC Timesheets', icon: () => null },
];

function Harness() {
  const [value, setValue] = useState('');
  return <DestinationSearch value={value} onValueChange={setValue} results={HITS} onChoose={() => {}} label="Search modules and pages" />;
}

describe('DestinationSearch focus', () => {
  it('Escape with the popover open closes it and keeps the text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Search modules and pages' });
    await user.type(box, 'timesheet');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box).toHaveValue('timesheet');
  });

  it('clearing one shared search does not reopen its popover when the other is typed into next', async () => {
    const user = userEvent.setup();
    const Pair = () => {
      const [value, setValue] = useState('');
      return (<>
        <DestinationSearch value={value} onValueChange={setValue} results={HITS} onChoose={() => {}} label="First search" />
        <DestinationSearch value={value} onValueChange={setValue} results={HITS} onChoose={() => {}} label="Second search" />
      </>);
    };
    render(<Pair />);
    const first = screen.getByRole('combobox', { name: 'First search' });
    const second = screen.getByRole('combobox', { name: 'Second search' });
    await user.type(first, 'timesheet');
    await user.keyboard('{Escape}');
    expect(first).toHaveValue('timesheet');
    await user.click(screen.getAllByRole('button', { name: 'Clear search' })[0]);
    expect(first).toHaveValue('');
    await user.type(second, 'leave');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('a second fill without a focus event reopens the popover, so Escape keeps the text (home search race)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Search modules and pages' }) as HTMLInputElement;
    await user.type(box, 'timesheet');
    await user.keyboard('{Escape}');
    expect(box).toHaveValue('timesheet');
    // A fill dispatches change but no focus event when DOM focus never left the input (Playwright fill, paste, autofill).
    fireEvent.change(box, { target: { value: 'artisan timesheets' } });
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(box).toHaveValue('artisan timesheets');
    expect(box).toHaveAttribute('aria-expanded', 'false');
  });
});
