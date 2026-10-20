import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from './Segmented';
import { ConfirmProvider } from '../overlays/Confirm';
import { FormDialog } from '../patterns/FormDialog';
import { Field } from './Field';

const OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'missing', label: 'Missing parts' },
] as const;

describe('Segmented', () => {
  it('reads the chosen option as selected, never as a field', () => {
    render(<Segmented label="Condition" value="good" onValueChange={() => {}} options={OPTIONS} />);
    const chosen = screen.getByRole('button', { name: 'Good' });
    expect(chosen).toHaveAttribute('aria-pressed', 'true');
    // Selected is a filled action pill: unmistakable against the muted track, never textbox-like.
    expect(chosen.className).toContain('aria-pressed:bg-action ');
    expect(chosen.className).toContain('aria-pressed:text-action-ink');
    expect(chosen.className).not.toContain('bg-action-soft');
    expect(chosen.className).not.toContain('shadow');
    const other = screen.getByRole('button', { name: 'Damaged' });
    expect(other).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks a FormDialog dirty when the choice changes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
          <Field label="Condition"><Segmented label="Condition" value="good" onValueChange={() => {}} options={OPTIONS} /></Field>
        </FormDialog>
      </ConfirmProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Damaged' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps toggle-button semantics and height', async () => {
    const onValueChange = vi.fn();
    render(<Segmented label="Condition" value="good" onValueChange={onValueChange} options={OPTIONS} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Missing parts' }));
    expect(onValueChange).toHaveBeenCalledWith('missing');
    expect(screen.getByRole('button', { name: 'Good' }).className).toContain('h-8');
  });
});
