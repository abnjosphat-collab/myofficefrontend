import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { updateWorkOrder } from './api';
import { ForemanSignoff } from './ForemanSignoff';
import { SchedulesView } from './SchedulesView';
import { WorkOrderDetail } from './WorkOrderDetail';
import type { MaintenanceSchedule, WorkOrder } from './types';

vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useLookups', () => ({ useLookupList: () => [], useEmployees: () => [], useEquipment: () => [], useSpares: () => [] }));
vi.mock('./api', () => ({ updateWorkOrder: vi.fn(), recordBreakdownForWorkOrder: vi.fn(), createWorkOrder: vi.fn(), deleteSchedule: vi.fn(), updateSchedule: vi.fn() }));
vi.mock('./useMaintenanceData', () => ({ useLinkedBreakdown: () => ({ breakdown: null, loading: false, failed: false, refetch: vi.fn() }) }));

const authMock = vi.mocked(useAuth);

const order = (over: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '7', work_order_number: 'WO-00007', equipment_info: 'Pump A', status: 'completed', priority: 'medium',
  progress: 100, allocated_to: 'Alex', artisan_name: 'Alex', date_raised: '2026-10-20', due_date: '2026-10-25',
  foreman_name: '', foreman_sign: '', foreman_date: '', notes: '', updated_at: '2026-10-25T10:00:00Z',
  ...over,
} as WorkOrder);

const schedule = (over: Partial<MaintenanceSchedule> = {}): MaintenanceSchedule => ({
  id: '3', name: 'Weekly check', equipment_info: 'Pump A', to_department: 'Engineering', allocated_to: 'Alex',
  authorising_foreman: 'Lee', estimated_hours: '2', job_request_details: 'Check the seals', job_instructions: '',
  priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [],
  specific_dates: [], advance_days: 1, active: true, next_due_date: '2026-11-02',
  ...over,
} as MaintenanceSchedule);

const listOf = (items: MaintenanceSchedule[]) => ({
  items, setItems: vi.fn(), loading: false, loaded: true, error: null, errorStatus: null, updatedAt: null, refetch: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  authMock.mockReturnValue({ scope: null, user: null, profile: null } as never);
});

describe('SchedulesView roles (M8)', () => {
  it('shows Raise now to everyone but Pause, Delete and edit to managers only', () => {
    const props = { list: listOf([schedule()]), orders: [], onEdit: vi.fn(), onNew: vi.fn(), onRaised: vi.fn() };
    const { rerender } = render(<ConfirmProvider><SchedulesView {...props} canManage={false} /></ConfirmProvider>);
    expect(screen.getByRole('button', { name: 'Raise now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete the schedule Weekly check' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit the schedule Weekly check' })).not.toBeInTheDocument();
    rerender(<ConfirmProvider><SchedulesView {...props} canManage /></ConfirmProvider>);
    expect(screen.getByRole('button', { name: 'Raise now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete the schedule Weekly check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit the schedule Weekly check' })).toBeInTheDocument();
  });

  it('offers the first schedule to managers only', () => {
    const props = { list: listOf([]), orders: [], onEdit: vi.fn(), onNew: vi.fn(), onRaised: vi.fn() };
    const { rerender } = render(<ConfirmProvider><SchedulesView {...props} canManage={false} /></ConfirmProvider>);
    expect(screen.queryByRole('button', { name: 'Create the first schedule' })).not.toBeInTheDocument();
    rerender(<ConfirmProvider><SchedulesView {...props} canManage /></ConfirmProvider>);
    expect(screen.getByRole('button', { name: 'Create the first schedule' })).toBeInTheDocument();
  });
});

describe('ForemanSignoff roles (M8)', () => {
  it('shows the sign-off form to a manager and saves the whole block', async () => {
    const user = userEvent.setup();
    vi.mocked(updateWorkOrder).mockResolvedValue(order() as never);
    render(<ConfirmProvider><ForemanSignoff order={order()} onSaved={vi.fn()} canManage /></ConfirmProvider>);
    expect(screen.getByLabelText(/Foreman name/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Foreman name/), { target: { value: 'Lee Jones' } });
    await user.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    expect(vi.mocked(updateWorkOrder)).toHaveBeenCalledOnce();
    expect(vi.mocked(updateWorkOrder).mock.calls[0][1]).toMatchObject({ foreman_name: 'Lee Jones' });
  });

  it('shows the sign-off read-only to anyone else, and the save carries no foreman fields', async () => {
    const user = userEvent.setup();
    vi.mocked(updateWorkOrder).mockResolvedValue(order() as never);
    render(<ConfirmProvider><ForemanSignoff order={order()} onSaved={vi.fn()} canManage={false} /></ConfirmProvider>);
    expect(screen.getByText('Only a manager account can sign off.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Foreman name/)).not.toBeInTheDocument();
    expect(screen.getByText('Not signed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    expect(vi.mocked(updateWorkOrder)).toHaveBeenCalledOnce();
    const body = vi.mocked(updateWorkOrder).mock.calls[0][1] as Record<string, unknown>;
    expect(body).toMatchObject({ status: 'completed', progress: 100 });
    expect('foreman_name' in body).toBe(false);
    expect('foreman_sign' in body).toBe(false);
    expect('foreman_date' in body).toBe(false);
  });
});

describe('WorkOrderDetail roles (M8)', () => {
  const props = () => ({ order: order(), onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onSaved: vi.fn(), onDone: vi.fn() });

  it('offers Delete to a manager, and a print link to everyone', () => {
    render(<ConfirmProvider><WorkOrderDetail {...props()} canManage /></ConfirmProvider>);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Print job card' }).getAttribute('href')).toBe('/maintenance/print?open=7');
  });

  it('hides Delete from anyone else but keeps the print link', () => {
    render(<ConfirmProvider><WorkOrderDetail {...props()} canManage={false} /></ConfirmProvider>);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Print job card' }).getAttribute('href')).toBe('/maintenance/print?open=7');
  });
});
