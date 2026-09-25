import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WorkOrder } from './types';

vi.mock('@/components/app-shell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/shared/theme', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/shared/theme')>();
  return {
    ...actual,
    useTheme: () => ({ light: true }),
    useConfirm: () => vi.fn().mockResolvedValue(false),
  };
});
vi.mock('@/components/maintenance/CreateWorkOrderModal', () => ({ CreateWorkOrderModal: () => null }));
vi.mock('@/components/maintenance/WorkOrderDetailModal', () => ({ WorkOrderDetailModal: () => null }));
vi.mock('@/components/maintenance/CreateScheduleModal', () => ({ CreateScheduleModal: () => null }));
vi.mock('@/components/maintenance/analytics', () => ({ AnalyticsPanel: () => <div>Analytics panel</div> }));
vi.mock('@/components/shared/DownloadButton', () => ({ DownloadButton: () => <button type="button">Download</button> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const sample: WorkOrder = {
  id: 'wo-1',
  work_order_number: 'WO-00001',
  equipment_info: 'Pump A',
  to_department: 'Engineering',
  to_section: '',
  from_department: '',
  from_section: '',
  date_raised: '2026-09-20',
  time_raised: '08:00',
  account_number: '',
  user_lab_today: '',
  job_type: { operational: false, maintenance: true, mining: false },
  job_request_details: 'Inspect the seal',
  requested_by: 'Sam',
  authorising_foreman: 'Lee',
  authorising_engineer: '',
  allocated_to: 'Alex',
  estimated_hours: '4',
  responsible_foreman: 'Lee',
  job_instructions: '',
  manpower: [],
  work_done_details: '',
  cause_of_failure: '',
  delay_details: '',
  artisan_name: 'Alex',
  artisan_sign: '',
  artisan_date: '',
  foreman_name: '',
  foreman_sign: '',
  foreman_date: '',
  time_work_started: '',
  time_work_finished: '',
  total_time_worked: '',
  overtime_start_time: '',
  overtime_end_time: '',
  overtime_hours: '',
  delay_from_time: '',
  delay_to_time: '',
  total_delay_hours: '',
  status: 'pending',
  priority: 'high',
  progress: 25,
  due_date: '2026-09-18',
  created_at: '2026-09-20T08:00:00Z',
  updated_at: '2026-09-20T08:00:00Z',
  classification: 'planned_maintenance',
};

const getWorkOrders = vi.fn();
const fetchSchedules = vi.fn();
vi.mock('./api', () => ({
  getWorkOrders: (...args: unknown[]) => getWorkOrders(...args),
  createWorkOrder: vi.fn(),
  deleteWorkOrder: vi.fn(),
  uploadStrandedLocalFields: vi.fn().mockResolvedValue(0),
  fetchSchedules: (...args: unknown[]) => fetchSchedules(...args),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  uploadStrandedSchedules: vi.fn().mockResolvedValue(0),
}));

import MaintenancePage from './page';

describe('Maintenance page chrome', () => {
  beforeEach(() => {
    getWorkOrders.mockResolvedValue([sample]);
    fetchSchedules.mockResolvedValue([]);
  });

  it('renders Tools-style register chrome and filters overdue from the glance strip', async () => {
    const user = userEvent.setup();
    render(<MaintenancePage />);

    expect(await screen.findByRole('heading', { name: 'Work Orders' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Work orders/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Schedules' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search work orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New work order' })).toBeInTheDocument();
    expect(screen.getByText('Pump A')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Overdue/ }));
    await waitFor(() => expect(screen.getByText('Overdue work orders')).toBeInTheDocument());
    expect(screen.getByText('Pump A')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Schedules' }));
    expect(await screen.findByText('No recurring schedules yet')).toBeInTheDocument();
  });
});
