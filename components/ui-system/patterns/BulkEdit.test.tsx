// components/ui-system/patterns/BulkEdit.test.tsx — every field starts locked;
// the patch carries only unlocked fields with a value; submitting locked or
// empty explains itself instead of wiping anything.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '../overlays/Confirm';
import { BulkEditDialog, type BulkField } from './BulkEdit';
import { Input } from '../primitives/Input';

const FIELDS: BulkField[] = [
  { key: 'cost_centre', label: 'Cost centre' },
  { key: 'notes', label: 'Notes' },
];

function Harness({ onSubmit }: { onSubmit: (patch: Record<string, unknown>) => Promise<void> }) {
  return (
    <ConfirmProvider>
    <BulkEditDialog open onOpenChange={() => {}} title="Edit 2 records" description="Test dialog." count={2}
      fields={FIELDS} submitLabel="Apply" onSubmit={onSubmit}
      renderControl={(f, value, setValue, locked) => (
        <Input aria-label={f.label} value={String(value ?? '')} disabled={locked} onChange={e => setValue(e.target.value)} />
      )} />
    </ConfirmProvider>
  );
}

describe('BulkEditDialog', () => {
  it('starts with every field locked', () => {
    render(<Harness onSubmit={async () => {}} />);
    expect(screen.getByRole('button', { name: 'Unlock Cost centre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock Notes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cost centre')).toBeDisabled();
  });

  it('sends only unlocked fields with a value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Unlock Cost centre' }));
    await user.type(screen.getByLabelText('Cost centre'), 'Projects');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onSubmit).toHaveBeenCalledWith({ cost_centre: 'Projects' });
  });

  it('refuses to submit with everything locked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const msg = await screen.findByRole('alert');
    expect(msg).toHaveTextContent('Unlock at least one field — locked fields are left alone.');
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses to submit an unlocked-but-empty field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Unlock Notes' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const msg = await screen.findByRole('alert');
    expect(msg).toHaveTextContent('Fill in the unlocked fields, or lock them again.');
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locking again drops the field from the patch', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Unlock Cost centre' }));
    await user.type(screen.getByLabelText('Cost centre'), 'Projects');
    await user.click(screen.getByRole('button', { name: 'Unlock Notes' }));
    await user.type(screen.getByLabelText('Notes'), 'crew B');
    await user.click(screen.getByRole('button', { name: 'Lock Cost centre again' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onSubmit).toHaveBeenCalledWith({ notes: 'crew B' });
  });
});
