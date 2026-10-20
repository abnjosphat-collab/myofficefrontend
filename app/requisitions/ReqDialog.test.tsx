import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { ReqDialog } from './page';
import type { Requisition } from './types';

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [] }));
vi.mock('@/lib/useApiList', () => ({ useApiList: () => ({ items: [] }) }));
vi.mock('./useRequisitionsData', () => ({ apiCreate: vi.fn(), apiUpdate: vi.fn(), apiDelete: vi.fn(), useRequisitionsData: () => ({}) }));

import { apiCreate } from './useRequisitionsData';

function setup(req?: Requisition) {
  const onSaved = vi.fn();
  render(
    <ConfirmProvider>
      <ReqDialog req={req} open onOpenChange={() => {}} onSaved={onSaved} />
    </ConfirmProvider>,
  );
  return { onSaved };
}

describe('ReqDialog numbers', () => {
  it('clearing qty and cost leaves them empty', () => {
    setup();
    const qty = screen.getByLabelText(/Qty \(item 1\)/);
    fireEvent.change(qty, { target: { value: '' } });
    expect(qty).toHaveValue(null);
    const cost = screen.getByLabelText(/Unit cost \(item 1\)/);
    fireEvent.change(cost, { target: { value: '' } });
    expect(cost).toHaveValue(null);
  });

  it('submit saves the same numbers as before', async () => {
    const user = userEvent.setup();
    vi.mocked(apiCreate).mockResolvedValue({} as never);
    setup();
    fireEvent.change(screen.getByLabelText(/Requester/), { target: { value: 'Ann Alpha' } });
    fireEvent.change(screen.getByLabelText(/Description \(item 1\)/), { target: { value: 'Bolt' } });
    fireEvent.change(screen.getByLabelText(/Qty \(item 1\)/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Unit cost \(item 1\)/), { target: { value: '12.5' } });
    await user.click(screen.getByRole('button', { name: 'Create requisition' }));
    expect(vi.mocked(apiCreate)).toHaveBeenCalledOnce();
    expect((vi.mocked(apiCreate).mock.calls[0][0] as { items: unknown }).items).toEqual([
      { description: 'Bolt', cost_per_unit: 12.5, quantity: 3, reason: '' },
    ]);
  });

  it('an edit opens with the stored numbers as text', () => {
    const req = {
      id: 'r1', requisitionNumber: 'REQ-1', date: '2026-10-10', requester: 'Ann', section: 'Mechanical',
      required_for: '', priority: 'Medium', status: 'Draft', notes: '',
      items: [{ description: 'Bolt', costPerUnit: 5, quantity: 2, reason: '' }],
    } as Requisition;
    setup(req);
    expect(screen.getByLabelText(/Qty \(item 1\)/)).toHaveValue(2);
    expect(screen.getByLabelText(/Unit cost \(item 1\)/)).toHaveValue(5);
  });
});
