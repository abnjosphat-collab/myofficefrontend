import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { QuickCloseDialog, type QuickCloseRequest } from './QuickCloseDialog';
import type { WorkOrder } from './types';

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [], useEquipment: () => [], useLookupList: () => [] }));
vi.mock('./api', () => ({ closeWorkOrder: vi.fn(), bulkCloseWorkOrders: vi.fn() }));

import { bulkCloseWorkOrders, closeWorkOrder } from './api';

const wo = (o: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '1', work_order_number: 'WO-00001', equipment_info: 'Pump A', status: 'pending', priority: 'medium',
  progress: 0, date_raised: '2026-10-20', created_at: '', updated_at: '2026-10-26T08:00:00+00:00', ...o,
} as WorkOrder);

function setup(request: QuickCloseRequest) {
  const onClosed = vi.fn(); const onBulkClosed = vi.fn(); const onStale = vi.fn();
  render(
    <ConfirmProvider>
      <QuickCloseDialog request={request} onOpenChange={() => {}} onClosed={onClosed} onBulkClosed={onBulkClosed} onStale={onStale} />
    </ConfirmProvider>,
  );
  return { onClosed, onBulkClosed, onStale };
}

describe('QuickCloseDialog', () => {
  beforeEach(() => { vi.mocked(closeWorkOrder).mockClear(); vi.mocked(bulkCloseWorkOrders).mockClear(); });

  it('a breakdown asks for its Problem, Cause and Action, and an empty submit explains without calling', async () => {
    const user = userEvent.setup();
    setup({ kind: 'single', order: wo({ classification: 'breakdown' }) });
    expect(screen.getByRole('dialog', { name: /WO-00001/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Problem/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cause/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Action taken/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close work order' }));
    expect(screen.getByText('Say what was done.')).toBeInTheDocument();
    expect(screen.getByText('Say what caused the breakdown.')).toBeInTheDocument();
    expect(screen.getByText('Say what action fixed it.')).toBeInTheDocument();
    expect(vi.mocked(closeWorkOrder)).not.toHaveBeenCalled();
  });

  it('a filled close sends the note, the times and the row version', async () => {
    const user = userEvent.setup();
    vi.mocked(closeWorkOrder).mockResolvedValue(wo({ status: 'completed' }));
    const { onClosed } = setup({ kind: 'single', order: wo() });
    fireEvent.change(screen.getByLabelText(/Work done/), { target: { value: 'Seal replaced.' } });
    fireEvent.change(screen.getByLabelText('Started'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('Finished'), { target: { value: '10:30' } });
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close work order' }));
    expect(vi.mocked(closeWorkOrder)).toHaveBeenCalledOnce();
    expect(vi.mocked(closeWorkOrder).mock.calls[0]).toEqual(['1', expect.objectContaining({
      work_done_details: 'Seal replaced.', time_work_started: '08:00', time_work_finished: '10:30',
      expected_updated_at: '2026-10-26T08:00:00+00:00',
    })]);
    expect(onClosed).toHaveBeenCalledOnce();
  });

  it('hours mode sends total hours instead of times', async () => {
    const user = userEvent.setup();
    vi.mocked(closeWorkOrder).mockResolvedValue(wo({ status: 'completed' }));
    setup({ kind: 'single', order: wo() });
    fireEvent.change(screen.getByLabelText(/Work done/), { target: { value: 'Checked.' } });
    await user.click(screen.getByRole('button', { name: 'Hours' }));
    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '2.5' } });
    await user.click(screen.getByRole('button', { name: 'Close work order' }));
    expect(vi.mocked(closeWorkOrder).mock.calls[0][1]).toMatchObject({ total_hours: 2.5 });
    expect(vi.mocked(closeWorkOrder).mock.calls[0][1]).not.toHaveProperty('time_work_started');
  });

  it('a bulk close names who cannot join and sends only the rest', async () => {
    const user = userEvent.setup();
    vi.mocked(bulkCloseWorkOrders).mockResolvedValue({ closed: [1], skipped: [] });
    const { onBulkClosed } = setup({ kind: 'bulk', orders: [wo({ id: '1' }), wo({ id: '2', work_order_number: 'WO-00002', status: 'completed' }), wo({ id: '3', work_order_number: 'WO-00003', classification: 'breakdown' })] });
    expect(screen.getByText(/2 selected jobs cannot close in this batch/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Work done/), { target: { value: 'Routine check done.' } });
    await user.click(screen.getByRole('button', { name: 'Hours' }));
    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '0.5' } });
    await user.click(screen.getByRole('button', { name: 'Close 1 work order' }));
    expect(vi.mocked(bulkCloseWorkOrders)).toHaveBeenCalledOnce();
    expect(vi.mocked(bulkCloseWorkOrders).mock.calls[0][0]).toMatchObject({ ids: ['1'], work_done_details: 'Routine check done.', total_hours: 0.5 });
    expect(onBulkClosed).toHaveBeenCalledOnce();
    expect(within(screen.getByRole('dialog')).queryByLabelText(/Artisan name/)).toBeNull();
  });
});
