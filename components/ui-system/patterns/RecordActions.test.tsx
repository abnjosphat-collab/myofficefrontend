import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailActions, RowActions } from './RecordActions';
import { Button } from '../primitives/Button';

const footer = (ui: React.ReactNode) => render(<footer>{ui}</footer>).container.querySelector('footer')!;
const names = (el: HTMLElement) => within(el).getAllByRole('button').map(b => b.textContent?.trim());

describe('DetailActions', () => {
  it('orders Delete, Close, then Edit as the primary action, with Delete set apart', async () => {
    const onDelete = vi.fn(), onClose = vi.fn(), onEdit = vi.fn();
    const el = footer(<DetailActions onDelete={onDelete} onClose={onClose} onEdit={onEdit} editLabel="Edit notice" />);
    expect(names(el)).toEqual(['Delete', 'Close', 'Edit notice']);
    const [del, , edit] = within(el).getAllByRole('button');
    expect(del.className).toContain('mr-auto');
    expect(edit.className).toContain('bg-action');
    await userEvent.click(edit); await userEvent.click(del);
    expect(onEdit).toHaveBeenCalledOnce(); expect(onDelete).toHaveBeenCalledOnce();
  });

  it('lets the dialog\'s own actions take the primary slot, with Edit as a plain button', () => {
    const el = footer(
      <DetailActions onDelete={() => {}} onClose={() => {}} onEdit={() => {}}>
        <Button variant="primary">Approve</Button>
      </DetailActions>,
    );
    expect(names(el)).toEqual(['Delete', 'Close', 'Edit', 'Approve']);
    expect(within(el).getByRole('button', { name: 'Edit' }).className).not.toContain('bg-action ');
  });

  it('leaves out what the dialog does not offer', () => {
    expect(names(footer(<DetailActions onClose={() => {}} />))).toEqual(['Close']);
    expect(names(footer(<DetailActions onDelete={() => {}} deleteLabel="Remove" onEdit={() => {}} />))).toEqual(['Remove', 'Edit']);
  });
});

describe('RowActions', () => {
  it('names each button after the record', async () => {
    const onEdit = vi.fn(), onDelete = vi.fn();
    render(<RowActions subject="requisition RQ-12" onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit requisition RQ-12' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete requisition RQ-12' }));
    expect(onEdit).toHaveBeenCalledOnce(); expect(onDelete).toHaveBeenCalledOnce();
  });

  it('says Remove when asked', () => {
    render(<RowActions subject="Tariro Moyo" onDelete={() => {}} deleteVerb="Remove" />);
    expect(screen.getByRole('button', { name: 'Remove Tariro Moyo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
  });
});

describe('DetailActions primary="edit"', () => {
  it('keeps Edit as the main action and puts the extra actions before it', () => {
    const el = footer(<DetailActions onDelete={() => {}} onClose={() => {}} onEdit={() => {}} primary="edit"><Button icon="cart">Add to requisition</Button></DetailActions>);
    expect(names(el)).toEqual(['Delete', 'Close', 'Add to requisition', 'Edit']);
    expect(within(el).getByRole('button', { name: 'Edit' }).className).toContain('bg-action');
  });
});
