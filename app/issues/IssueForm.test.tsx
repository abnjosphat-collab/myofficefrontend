import { createRef, type Ref } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueForm, type IssueFormHandle } from './IssueForm';
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

describe('IssueForm collapse and lookup handle (U7)', () => {
  const SPARE_ROW = { stock_code: 'S1', description: 'Bearing', unit_of_measure: 'EA', unit_price: 12.5 };

  function setupC(over: Record<string, unknown> = {}, ref?: Ref<IssueFormHandle>) {
    const onRecorded = vi.fn(async () => {});
    const onActivity = vi.fn();
    render(
      <IssueForm
        spares={[SPARE]} sparesError={null} onRetrySpares={() => {}} defaultIssuedBy="" onRecorded={onRecorded}
        collapsible onActivity={onActivity} ref={ref} {...over}
      />,
    );
    return { onRecorded, onActivity };
  }

  it('starts collapsed behind the one-line summary', () => {
    setupC();
    expect(screen.getByRole('button', { name: 'New issue — 0 items to nobody yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record issue' })).not.toBeInTheDocument();
  });

  it('summary opens, Collapse closes', async () => {
    const user = userEvent.setup();
    setupC();
    await user.click(screen.getByRole('button', { name: /New issue —/ }));
    expect(screen.getByRole('button', { name: 'Record issue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(screen.queryByRole('button', { name: 'Record issue' })).not.toBeInTheDocument();
  });

  it('a force-open bump opens the panel', () => {
    const { rerender } = render(
      <IssueForm spares={[SPARE]} sparesError={null} onRetrySpares={() => {}} defaultIssuedBy="" onRecorded={async () => {}} collapsible forceOpenSignal={0} />,
    );
    expect(screen.queryByRole('button', { name: 'Record issue' })).not.toBeInTheDocument();
    rerender(
      <IssueForm spares={[SPARE]} sparesError={null} onRetrySpares={() => {}} defaultIssuedBy="" onRecorded={async () => {}} collapsible forceOpenSignal={1} />,
    );
    expect(screen.getByRole('button', { name: 'Record issue' })).toBeInTheDocument();
  });

  it('fires onActivity once on the first edit', async () => {
    const user = userEvent.setup();
    const { onActivity } = setupC();
    await user.click(screen.getByRole('button', { name: /New issue —/ }));
    fireEvent.change(screen.getByLabelText(/Issued to/), { target: { value: 'Ann' } });
    await waitFor(() => expect(onActivity).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText(/Issued to/), { target: { value: 'Ann Alpha' } });
    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  it('addSpare opens the panel and fills the first free row with the picker mapping', () => {
    const ref = createRef<IssueFormHandle>();
    setupC({}, ref);
    act(() => { ref.current?.addSpare(SPARE_ROW); });
    expect(screen.getByRole('button', { name: 'Record issue' })).toBeInTheDocument();
    expect(screen.getByLabelText('Description, item 1')).toHaveValue('Bearing');
    expect(screen.getByLabelText('Unit cost, item 1')).toHaveValue(12.5);
  });

  it('addSpare appends when every row is used', () => {
    const ref = createRef<IssueFormHandle>();
    setupC({}, ref);
    act(() => { ref.current?.addSpare(SPARE_ROW); });
    act(() => { ref.current?.addSpare({ ...SPARE_ROW, stock_code: 'S2', description: 'Seal' }); });
    expect(screen.getByLabelText('Description, item 2')).toHaveValue('Seal');
  });

  it('addSpare falls back to UN without a unit of measure', () => {
    const ref = createRef<IssueFormHandle>();
    setupC({}, ref);
    act(() => { ref.current?.addSpare({ stock_code: 'S1', description: 'Bearing', unit_price: 12.5 }); });
    expect(screen.getByLabelText('Description, item 1')).toHaveValue('Bearing');
  });
});
