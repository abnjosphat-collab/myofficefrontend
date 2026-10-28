// MachineHistoryView jobs stillKey with full motion (real framer module, OS not
// asking): turning the page restarts the table boundary instead of fading rows
// out and in. Separate file: framer's OS-preference listener is a module
// singleton initialised once per file.
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { MachineHistoryView } from './MachineHistoryView';
import type { MachineHistoryPayload } from '../historyTypes';
import type { WorkOrder } from '../../maintenance/types';

vi.mock('../api', () => ({ fetchMachineHistory: vi.fn() }));

import { fetchMachineHistory } from '../api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

const wo = (o: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '1', work_order_number: 'WO-00001', equipment_info: 'Crusher One', status: 'pending', priority: 'high',
  progress: 0, date_raised: '2026-10-20', total_time_worked: '2h 30m', job_request_details: 'Replace the worn liner',
  created_at: '', updated_at: '', ...o,
} as WorkOrder);

const payload: MachineHistoryPayload = {
  equipment: { id: 15, equipment_id: 'EQ-015', name: 'Crusher One', status: 'maintenance', category: 'Crushers', location: 'Plant', department: 'Engineering', model: 'C-900', serial_number: 'SN-CRUSH-9', criticality: 'High', commission_date: '2022-03-01' },
  period: { days: 90, start: '2026-07-28', end: '2026-10-26' },
  links_active: true,
  totals: { jobs: 11, open_jobs: 11, breakdowns: 0, schedules: 0, labour_hours: 2.5, spares_cost: 0, downtime_hours: 0, counts_by_status: { pending: 11 } },
  jobs: Array.from({ length: 11 }, (_, i) => wo({ id: String(100 + i), work_order_number: `WO-00${100 + i}`, date_raised: '2026-10-20' })),
  breakdowns: [],
  schedules: [],
  spares: [],
  measures: {
    pm_on_time: { percent: 50, on_time: 1, total: 2, ids: [9, 21], on_time_ids: [9] },
    downtime: { machine: 'Crusher One', breakdowns: 0, downtime_hours: 0, mttr_hours: 0, mtbf_days: null, breakdown_ids: [] },
    repeat_failures: { groups_30d: 0, groups_90d: 0, groups: [] },
  },
};

beforeEach(() => { vi.mocked(fetchMachineHistory).mockReset(); });

describe('MachineHistoryView jobs stillKey (full motion)', () => {
  it('starts the jobs table over when the page turns (no animation on paging)', async () => {
    vi.mocked(fetchMachineHistory).mockResolvedValue(payload);
    render(<MachineHistoryView equipmentId="15" />);
    await screen.findByText('#WO-00100');
    const page1row = screen.getByText('#WO-00100').closest('tr');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    // A page turn swaps every row key. With stillKey the boundary remounts,
    // so the old page's rows leave synchronously; without it they would
    // linger as exiting nodes and the assertion below would fail.
    expect(page1row?.isConnected).toBe(false);
    expect(screen.getByText('#WO-00110')).toBeInTheDocument();
  });
});
