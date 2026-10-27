import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { fetchWorkOrderById } from '../api';
import { useLinkedBreakdown } from '../useMaintenanceData';
import { PrintJobCardView } from './PrintJobCardView';
import type { WorkOrder } from '../types';

vi.mock('../api', () => ({ fetchWorkOrderById: vi.fn() }));
vi.mock('../useMaintenanceData', () => ({ useLinkedBreakdown: vi.fn() }));

const fetchMock = vi.mocked(fetchWorkOrderById);
const linkedMock = vi.mocked(useLinkedBreakdown);

const order = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '7', work_order_number: 'WO-00007', equipment_info: 'Pump A', status: 'in-progress', priority: 'high',
  progress: 40, allocated_to: 'Alex', artisan_name: 'Alex', date_raised: '2026-10-20', due_date: '2026-10-25',
  to_department: 'Engineering', estimated_hours: '4', job_request_details: 'Inspect the seal',
  requested_by: 'Sam', authorising_foreman: 'Lee', work_done_details: 'Seal replaced.', time_work_started: '08:00',
  time_work_finished: '10:30', total_time_worked: '2h 30m', artisan_date: '2026-10-25',
  artisan_sign: '', foreman_name: '', foreman_sign: '', foreman_date: '', classification: 'planned_maintenance',
  spares_used: [{ id: 's1', name: 'Bearing 6204', quantity: 2, unit_cost: 10 }],
  ...over,
} as WorkOrder);

const show = (id = '7') => render(<ConfirmProvider><PrintJobCardView workOrderId={id} /></ConfirmProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  window.print = vi.fn();
  linkedMock.mockReturnValue({ breakdown: null, loading: false, failed: false, refetch: vi.fn() });
});

describe('PrintJobCardView', () => {
  it('renders the request, the artisan report, the sign-off and the paper signature lines', async () => {
    fetchMock.mockResolvedValue(order());
    show();
    expect(await screen.findByRole('heading', { name: 'Pump A' })).toBeInTheDocument();
    expect(screen.getByText('Job card #WO-00007')).toBeInTheDocument();
    expect(screen.getByText(/In progress · High priority/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Work request' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Artisan report' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foreman sign-off' })).toBeInTheDocument();
    expect(screen.getByText('Seal replaced.')).toBeInTheDocument();
    expect(screen.getByText('Bearing 6204')).toBeInTheDocument();
    expect(screen.getAllByText('Not signed')).toHaveLength(2);
    expect(screen.getAllByText('Signature and date')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Downtime' })).not.toBeInTheDocument();
  });

  it('shows the Problem, Cause, Action and downtime for a breakdown', async () => {
    fetchMock.mockResolvedValue(order({
      classification: 'breakdown', failure_mode: 'Bearing failure', cause_of_failure: 'Wear & tear', corrective_action: 'Replaced component',
    }));
    linkedMock.mockReturnValue({
      breakdown: { id: 31, breakdown_date: '2026-10-20', breakdown_start: '08:00', breakdown_end: '10:00', work_start: '08:30', work_end: '09:30' } as never,
      loading: false, failed: false, refetch: vi.fn(),
    });
    show();
    expect(await screen.findByText('Bearing failure')).toBeInTheDocument();
    expect(screen.getByText('Wear & tear')).toBeInTheDocument();
    expect(screen.getByText('Replaced component')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Downtime' })).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('says so when no downtime is recorded, or the read fails', async () => {
    fetchMock.mockResolvedValue(order({ classification: 'breakdown' }));
    const { rerender } = show();
    expect(await screen.findByText('No downtime recorded yet.')).toBeInTheDocument();
    linkedMock.mockReturnValue({ breakdown: null, loading: false, failed: true, refetch: vi.fn() });
    rerender(<ConfirmProvider><PrintJobCardView workOrderId="7" /></ConfirmProvider>);
    expect(await screen.findByText('The downtime could not be loaded.')).toBeInTheDocument();
  });

  it('prints on the Print button', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(order());
    show();
    await user.click(await screen.findByRole('button', { name: 'Print' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('says so honestly when the job is gone, or the load fails with a retry', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(null);
    const { rerender } = show();
    expect(await screen.findByText('That work order no longer exists')).toBeInTheDocument();
    fetchMock.mockRejectedValue(new Error('nope'));
    rerender(<ConfirmProvider><PrintJobCardView workOrderId="8" /></ConfirmProvider>);
    expect(await screen.findByText('The job card could not be loaded')).toBeInTheDocument();
    fetchMock.mockResolvedValue(order());
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Pump A' })).toBeInTheDocument();
  });
});
