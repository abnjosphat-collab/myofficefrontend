import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceCards, type ChoiceCardOption } from './ChoiceCards';

const OPTIONS: ChoiceCardOption[] = [
  { value: 'times', title: 'Same times for everyone', description: 'Everyone selected gets that shift.' },
  { value: 'role', title: 'Standard shift for each role', description: 'Each person gets their own.' },
];

function Harness({ onValueChange, initial = 'times' }: { onValueChange: (v: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ChoiceCards label="How are the hours set?" value={value} onValueChange={v => { setValue(v); onValueChange(v); }} options={OPTIONS} />;
}

describe('ChoiceCards', () => {
  it('labels the group visibly and links it for assistive technology', () => {
    render(<Harness onValueChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'How are the hours set?' });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('How are the hours set?')).toBeVisible();
    expect(screen.getByRole('radio', { name: /Same times for everyone/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Standard shift for each role/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('selects a card on click', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await user.click(screen.getByRole('radio', { name: /Standard shift for each role/ }));
    expect(onValueChange).toHaveBeenCalledWith('role');
    expect(screen.getByRole('radio', { name: /Standard shift for each role/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves and selects with the arrow keys (roving tabindex)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    const first = screen.getByRole('radio', { name: /Same times for everyone/ });
    const second = screen.getByRole('radio', { name: /Standard shift for each role/ });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenCalledWith('role');
    expect(second).toHaveFocus();
  });

  it('marks selection by more than colour', () => {
    render(<Harness onValueChange={() => {}} />);
    const selected = screen.getByRole('radio', { name: /Same times for everyone/ });
    const unselected = screen.getByRole('radio', { name: /Standard shift for each role/ });
    expect(selected.className).toContain('bg-action-soft');
    expect(unselected.className).not.toContain('bg-action-soft');
    // The check badge fills in on the selected card only (a shape change, not just a tint).
    expect(selected.querySelector('span[aria-hidden="true"]')?.className).toContain('bg-action ');
    expect(unselected.querySelector('span[aria-hidden="true"]')?.className).not.toContain('bg-action ');
  });

  it('renders the footer under the description', () => {
    render(<ChoiceCards label="How?" value="role" onValueChange={() => {}} options={[{ ...OPTIONS[1], footer: '3 people × 10 h' }]} />);
    expect(screen.getByText('3 people × 10 h')).toBeInTheDocument();
  });
});
