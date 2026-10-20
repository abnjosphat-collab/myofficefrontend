import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShiftTimeRange } from './ShiftTimeRange';
import type { ShiftTimePreset } from '@/lib/shiftTimePresets';
import { ConfirmProvider, FormDialog } from '@/components/ui-system';

const BUILTIN: ShiftTimePreset[] = [
  ['07:00', '17:00'], ['04:00', '06:00'], ['17:00', '19:00'], ['17:00', '18:00'], ['17:00', '20:00'],
  ['17:00', '19:30'], ['04:00', '07:00'], ['04:00', '06:30'],
].map(([start, end], i) => ({ id: `b${i}`, label: `${start.slice(0, 2)}-${end.slice(0, 2)}${end.endsWith('30') ? ':30' : ''}`, description: `Range · ${start} – ${end}`, start, end }));

beforeEach(() => { localStorage.clear(); });

describe('ShiftTimeRange', () => {
  it('shows five shifts as one-tap chips and the rest in a More shifts menu', async () => {
    render(<ShiftTimeRange start="" end="" onChange={() => {}} builtin={BUILTIN} />);
    const group = screen.getByRole('group', { name: 'Quick shift times' });
    const names = within(group).getAllByRole('button').map(b => b.textContent?.trim());
    expect(names.slice(0, 5)).toEqual(['07-17', '04-06', '17-19', '17-18', '17-20']);
    expect(names).toContain('More shifts');
    expect(names).not.toContain('17-19:30');
  });

  it('applies a shift picked from the menu', async () => {
    const onChange = vi.fn();
    render(<ShiftTimeRange start="" end="" onChange={onChange} builtin={BUILTIN} />);
    await userEvent.click(screen.getByRole('button', { name: /More shifts/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Range · 17:00 – 19:30' }));
    expect(onChange).toHaveBeenCalledWith('17:00', '19:30');
  });

  it('keeps the selected shift visible as a chip even when it lives in the menu', () => {
    render(<ShiftTimeRange start="17:00" end="19:30" onChange={() => {}} builtin={BUILTIN} />);
    const chip = screen.getByRole('button', { name: '17-19:30' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('a quick-shift chip marks a FormDialog dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <ShiftTimeRange start="" end="" onChange={() => {}} builtin={BUILTIN} />
        </FormDialog>
      </ConfirmProvider>
    );
    await user.click(screen.getByRole('button', { name: '07-17' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows no menu when every shift fits', () => {
    render(<ShiftTimeRange start="" end="" onChange={() => {}} builtin={BUILTIN.slice(0, 4)} />);
    expect(screen.queryByRole('button', { name: /More shifts/ })).toBeNull();
  });
});
