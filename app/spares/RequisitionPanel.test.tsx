import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { RequisitionPanel } from './RequisitionPanel';
import type { ReqHeader, ReqLine, SavedRequisition, Spare } from './types';
import type { ApiListState } from '@/lib/useApiList';

const spare: Spare = {
  id: 1, stock_code: 'S1', description: 'Bolt', current_quantity: 10,
  min_quantity: 1, max_quantity: 100, unit_price: 2, unit_of_measure: 'EA', priority: 'medium',
} as Spare;

const savedItem: SavedRequisition = {
  id: 's1', name: 'Monthly order', saved_at: '2026-10-01',
  header: { requester: 'Saved Ann', reason: 'Saved reason', urgency: 'routine', priority: 'medium', required_for: '' },
  lines: [{ spare_id: 1, stock_code: 'S1', description: 'Bolt', unit_of_measure: 'EA', unit_price: 2, qty: 3 }],
  grand_total: 6,
};

const emptyHeader: ReqHeader = { requester: '', reason: '', urgency: 'routine', priority: 'medium', required_for: '' };

function setup(header: ReqHeader, lines: ReqLine[] = []) {
  const onHeader = vi.fn();
  const onLines = vi.fn();
  const saved: ApiListState<SavedRequisition> = {
    items: [savedItem], loading: false, loaded: true, error: null, errorStatus: null,
    refetch: async () => {}, setItems: () => {},
  };
  render(
    <ConfirmProvider>
      <RequisitionPanel open onOpenChange={() => {}} spares={[spare]} saved={saved} header={header} onHeader={onHeader} lines={lines} onLines={onLines} />
    </ConfirmProvider>,
  );
  return { onHeader, onLines };
}

describe('RequisitionPanel load confirm', () => {
  it('load asks with a non-empty builder', async () => {
    const user = userEvent.setup();
    const { onHeader } = setup({ ...emptyHeader, requester: 'Ann' });
    await user.click(screen.getByRole('button', { name: 'Load' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/Load Monthly order\?/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onHeader).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Load' }));
    const confirm2 = await screen.findByRole('alertdialog');
    await user.click(within(confirm2).getByRole('button', { name: 'Load Monthly order' }));
    expect(onHeader).toHaveBeenCalledWith(savedItem.header);
  });

  it('load is silent when the builder is empty', async () => {
    const user = userEvent.setup();
    const { onHeader } = setup(emptyHeader);
    await user.click(screen.getByRole('button', { name: 'Load' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onHeader).toHaveBeenCalledWith(savedItem.header);
  });
});
