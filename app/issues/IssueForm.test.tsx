import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueForm } from './IssueForm';
import type { Spare } from './types';

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [], invalidateSparesCache: () => {} }));
vi.mock('./useIssuesData', () => ({ createIssue: vi.fn() }));

import { createIssue } from './useIssuesData';

const SPARE: Spare = { id: 1, stock_code: 'S1', description: 'Bearing', unit_price: 12.5, current_quantity: 10 };

function setup() {
  const onRecorded = vi.fn(async () => {});
  render(<IssueForm spares={[SPARE]} sparesError={null} onRetrySpares={() => {}} defaultIssuedBy="" onRecorded={onRecorded} />);
  return { onRecorded };
}

describe('IssueForm numbers', () => {
  it('clearing the quantity leaves it empty instead of snapping to 0', () => {
    setup();
    const qty = screen.getByLabelText('Quantity, item 1');
    fireEvent.change(qty, { target: { value: '' } });
    expect(qty).toHaveValue(null);
  });

  it('typing 5 shows 5, not 05', () => {
    setup();
    const qty = screen.getByLabelText('Quantity, item 1');
    fireEvent.change(qty, { target: { value: '' } });
    fireEvent.change(qty, { target: { value: '5' } });
    expect(qty).toHaveValue(5);
  });

  it('submit saves the same numbers as before', async () => {
    const user = userEvent.setup();
    vi.mocked(createIssue).mockResolvedValue({ stock: [], stock_warnings: [] } as never);
    setup();
    fireEvent.change(screen.getByLabelText(/Issued to/), { target: { value: 'Ann Alpha' } });
    fireEvent.change(screen.getByLabelText('Description, item 1'), { target: { value: 'Bearing' } });
    fireEvent.change(screen.getByLabelText('Quantity, item 1'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Unit cost, item 1'), { target: { value: '12.5' } });
    await user.click(screen.getByRole('button', { name: 'Record issue' }));
    expect(vi.mocked(createIssue)).toHaveBeenCalledOnce();
    expect((vi.mocked(createIssue).mock.calls[0][0] as { items: unknown }).items).toEqual([
      { stock_code: null, description: 'Bearing', qty: 3, unit: 'UN', unit_price: 12.5 },
    ]);
  });

  it('links the quantity alert to its input', async () => {
    const user = userEvent.setup();
    setup();
    fireEvent.change(screen.getByLabelText(/Issued to/), { target: { value: 'Ann Alpha' } });
    fireEvent.change(screen.getByLabelText('Description, item 1'), { target: { value: 'Bearing' } });
    fireEvent.change(screen.getByLabelText('Quantity, item 1'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Record issue' }));
    const alert = await screen.findByText('Quantity must be more than 0.');
    const qty = screen.getByLabelText('Quantity, item 1');
    expect(alert).toHaveAttribute('id');
    expect(qty).toHaveAttribute('aria-describedby', alert.id);
    await waitFor(() => expect(qty).toHaveFocus());
  });

  it('links the add-item alert from the items list and focuses it when nothing else is wrong', async () => {
    const user = userEvent.setup();
    setup();
    fireEvent.change(screen.getByLabelText(/Issued to/), { target: { value: 'Ann Alpha' } });
    await user.click(screen.getByRole('button', { name: 'Record issue' }));
    const alert = await screen.findByText('Add at least one item, with a stock code or a description.');
    expect(alert).toHaveAttribute('id', 'issue-items-error');
    const list = alert.closest('section')?.querySelector('ul');
    expect(list).toHaveAttribute('aria-describedby', 'issue-items-error');
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it('empty submit focuses the first invalid field', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Record issue' }));
    await waitFor(() => expect(screen.getByLabelText(/Issued to/)).toHaveFocus());
  });
});
