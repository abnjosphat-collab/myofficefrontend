import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MachineHistoryView } from './MachineHistoryView';
import type { MachineHistoryPayload } from '../historyTypes';
import type { WorkOrder } from '../../maintenance/types';

vi.mock('../api', () => ({ fetchMachineHistory: vi.fn() }));

import { ApiError } from '@/lib/apiClient';
import { fetchMachineHistory } from '../api';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const wo = (o: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '1', work_order_number: 'WO-00001', equipment_info: 'Crusher One', status: 'pending', priority: 'high',
  progress: 0, date_raised: '2026-10-20', total_time_worked: '2h 30m', job_request_details: 'Replace the worn liner',
  created_at: '', updated_at: '', ...o,
} as WorkOrder);

const payload: MachineHistoryPayload = {
  equipment: { id: 15, equipment_id: 'EQ-015', name: 'Crusher One', status: 'maintenance', category: 'Crushers', location: 'Plant', department: 'Engineering', model: 'C-900', serial_number: 'SN-CRUSH-9', criticality: 'High', commission_date: '2022-03-01' },
  period: { days: 90, start: '2026-07-28', end: '2026-10-26' },
  links_active: true,
  totals: { jobs: 2, open_jobs: 1, breakdowns: 1, schedules: 1, labour_hours: 2.5, spares_cost: 32, downtime_hours: 1.5, counts_by_status: { pending: 1, completed: 1 } },
  jobs: [
    wo({ id: '21', work_order_number: 'WO-00021', status: 'pending', date_raised: '2026-10-20' }),
    wo({ id: '9', work_order_number: 'WO-00009', status: 'completed', priority: 'medium', date_raised: '2026-09-02', total_time_worked: '', job_request_details: 'Quarterly service' }),
  ],
  breakdowns: [
    { id: 44, machine_id: 'CRS-1', machine_name: 'Crusher One', artisan_name: 'T. Banda', department: 'Engineering', location: 'Plant', breakdown_date: '2026-10-05', breakdown_type: 'mechanical', breakdown_nature: 'Bearing failure', status: 'resolved', priority: 'high', downtime_minutes: 90, repair_time_minutes: 60 },
  ],
  schedules: [
    { id: '11', name: 'Weekly crush', equipment_info: 'Crusher One', to_department: 'Engineering', allocated_to: '', authorising_foreman: '', estimated_hours: '', job_request_details: '', job_instructions: '', priority: 'medium', recurrence_type: 'weekly', recurrence_dow: 1, recurrence_dom: 1, recurrence_months: [], specific_dates: [], advance_days: 0, active: true, next_due_date: '2026-10-30', last_generated: '', created_at: '' },
  ],
  spares: [{ name: 'Bearing', quantity: 3, cost: 32, jobs: 1, breakdowns: 1 }],
  measures: {
    pm_on_time: { percent: 50, on_time: 1, total: 2, ids: [9, 21], on_time_ids: [9] },
    downtime: { machine: 'Crusher One', breakdowns: 1, downtime_hours: 1.5, mttr_hours: 1.0, mtbf_days: null, breakdown_ids: [44] },
    repeat_failures: {
      groups_30d: 1, groups_90d: 0,
      groups: [{ machine: 'Crusher One', code: 'Snap', count: 2, window_days: 30, first: '2026-10-01', last: '2026-10-10', ids: [5, 6] }],
    },
  },
};

beforeEach(() => { vi.mocked(fetchMachineHistory).mockReset(); push.mockReset(); });

describe('MachineHistoryView', () => {
  it('renders the machine, the tiles and every section', async () => {
    vi.mocked(fetchMachineHistory).mockResolvedValue(payload);
    render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Crusher One' })).toBeInTheDocument();
    expect(screen.getByText('SN-CRUSH-9')).toBeInTheDocument();
    expect(screen.getByText('Open jobs')).toBeInTheDocument();
    expect(screen.getByText('Labour')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Jobs \(2 jobs, 1 open\)/ })).toBeInTheDocument();
    expect(screen.getByText('#WO-00021')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Breakdowns \(1 breakdown\)/ })).toBeInTheDocument();
    expect(screen.getByText('Bearing failure')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Planned work \(1 schedule\)/ })).toBeInTheDocument();
    expect(screen.getByText('Weekly crush')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Spares \(1 part/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Measures (last 90 days)' })).toBeInTheDocument();
    expect(screen.getByText(/50% \(1 of 2\)/)).toBeInTheDocument();
    expect(screen.queryByText(/matched by machine name/)).not.toBeInTheDocument();
  });

  it('a job row opens the work order and a breakdown row opens the breakdown', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMachineHistory).mockResolvedValue(payload);
    render(<MachineHistoryView equipmentId="15" />);
    await user.click(await screen.findByText('#WO-00021'));
    expect(push).toHaveBeenCalledWith('/maintenance?open=21');
    await user.click(screen.getByText('Bearing failure'));
    expect(push).toHaveBeenCalledWith('/breakdowns?open=44');
  });

  it('long job lists paginate', async () => {
    const user = userEvent.setup();
    const jobs = Array.from({ length: 11 }, (_, i) => wo({ id: String(100 + i), work_order_number: `WO-00${100 + i}`, date_raised: '2026-10-20' }));
    vi.mocked(fetchMachineHistory).mockResolvedValue({ ...payload, jobs, totals: { ...payload.totals, jobs: 11, open_jobs: 11 } });
    render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByText('#WO-00100')).toBeInTheDocument();
    expect(screen.queryByText('#WO-00110')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('#WO-00110')).toBeInTheDocument();
  });

  it('empty sections say so instead of showing empty tables', async () => {
    vi.mocked(fetchMachineHistory).mockResolvedValue({
      ...payload, jobs: [], breakdowns: [], schedules: [], spares: [],
      totals: { ...payload.totals, jobs: 0, open_jobs: 0, breakdowns: 0, schedules: 0, labour_hours: 0, spares_cost: 0, downtime_hours: 0, counts_by_status: {} },
      measures: { pm_on_time: { percent: null, on_time: 0, total: 0, ids: [], on_time_ids: [] }, downtime: null, repeat_failures: { groups_30d: 0, groups_90d: 0, groups: [] } },
    });
    render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByText('No jobs recorded for this machine yet.')).toBeInTheDocument();
    expect(screen.getByText('No breakdowns recorded for this machine yet.')).toBeInTheDocument();
    expect(screen.getByText('No planned work for this machine yet.')).toBeInTheDocument();
    expect(screen.getByText('No spares recorded on this machine yet.')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('No breakdowns in the last 90 days')).toBeInTheDocument();
  });

  it('warns when jobs are matched by name until the links are live', async () => {
    vi.mocked(fetchMachineHistory).mockResolvedValue({ ...payload, links_active: false });
    render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByText('Jobs are matched by machine name until the register links are live.')).toBeInTheDocument();
  });

  it('a failed load is an error with a retry, never zeros', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMachineHistory).mockRejectedValueOnce(new Error('down')).mockResolvedValue(payload);
    render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByText('The machine history could not be loaded.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Crusher One' })).toBeInTheDocument();
    expect(vi.mocked(fetchMachineHistory)).toHaveBeenCalledTimes(2);
  });

  it('an unknown machine says it is not on the register', async () => {
    vi.mocked(fetchMachineHistory).mockRejectedValue(new ApiError('Equipment with ID 999 not found', 404));
    render(<MachineHistoryView equipmentId="999" />);
    expect(await screen.findByText('This machine is not on the register')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the register' })).toHaveAttribute('href', '/equipment');
  });

  it('switching machines never shows the old history', async () => {
    const other: MachineHistoryPayload = {
      ...payload,
      equipment: { ...payload.equipment, id: 16, equipment_id: 'EQ-016', name: 'Mill 3' },
      jobs: [], breakdowns: [], schedules: [], spares: [],
      totals: { jobs: 0, open_jobs: 0, breakdowns: 0, schedules: 0, labour_hours: 0, spares_cost: 0, downtime_hours: 0, counts_by_status: {} },
      measures: {
        pm_on_time: { percent: null, on_time: 0, total: 0, ids: [], on_time_ids: [] },
        downtime: null,
        repeat_failures: { groups_30d: 0, groups_90d: 0, groups: [] },
      },
    };
    vi.mocked(fetchMachineHistory).mockResolvedValueOnce(payload).mockResolvedValue(other);
    const view = render(<MachineHistoryView equipmentId="15" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Crusher One' })).toBeInTheDocument();
    view.rerender(<MachineHistoryView equipmentId="16" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Mill 3' })).toBeInTheDocument();
    expect(screen.queryByText('#WO-00021')).not.toBeInTheDocument();
    expect(vi.mocked(fetchMachineHistory)).toHaveBeenLastCalledWith('16');
  });

  it('repeat groups and job statuses are listed in the measures', async () => {
    vi.mocked(fetchMachineHistory).mockResolvedValue(payload);
    render(<MachineHistoryView equipmentId="15" />);
    const panel = (await screen.findByRole('heading', { name: 'Measures (last 90 days)' })).closest('section') ?? document.body;
    expect(within(panel).getByText('Snap')).toBeInTheDocument();
    expect(within(panel).getByText(/2 times in 30 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/Pending · 1/)).toBeInTheDocument();
  });
});
