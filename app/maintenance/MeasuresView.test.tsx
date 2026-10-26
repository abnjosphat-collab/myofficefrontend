import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeasuresView } from './MeasuresView';
import type { MeasuresPayload, WorkOrder } from './types';

vi.mock('./api', () => ({ fetchMeasures: vi.fn() }));

import { fetchMeasures } from './api';

const wo = (o: Partial<WorkOrder> = {}): WorkOrder => ({
  id: '1', work_order_number: 'WO-00001', equipment_info: 'Pump A', status: 'pending', priority: 'medium',
  progress: 0, date_raised: '2026-10-20', created_at: '', updated_at: '', ...o,
} as WorkOrder);

const orders = [
  wo({ id: '1', work_order_number: 'WO-00001', equipment_info: 'Pump A', status: 'completed' }),
  wo({ id: '2', work_order_number: 'WO-00002', equipment_info: 'Crusher 1', status: 'pending' }),
  wo({ id: '3', work_order_number: 'WO-00003', equipment_info: 'Fan 2', status: 'on-hold' }),
];

const payload: MeasuresPayload = {
  period: { days: 90, weeks: 4, start: '2026-07-28', end: '2026-10-26' },
  pm_on_time: { percent: 50, on_time: 1, total: 2, ids: [1, 2], on_time_ids: [1] },
  backlog_by_age: {
    total: 2,
    buckets: [
      { label: '0-7 days', count: 1, ids: [2] },
      { label: '8-30 days', count: 0, ids: [] },
      { label: '31-90 days', count: 1, ids: [3] },
      { label: 'Over 90 days', count: 0, ids: [] },
      { label: 'Date unknown', count: 0, ids: [] },
    ],
  },
  opened_vs_completed: {
    weeks: [{ week_start: '2026-10-19', opened: 1, completed: 1, opened_ids: [2], completed_ids: [1] }],
    undated_opened: [], undated_completed: [],
  },
  machine_downtime: {
    rows: [{ machine: 'Crusher 1', breakdowns: 2, downtime_hours: 3.0, mttr_hours: 1.0, mtbf_days: 10.0, breakdown_ids: [9] }],
  },
  repeat_failures: {
    groups_30d: 1, groups_90d: 0,
    groups: [{ machine: 'Crusher 1', code: 'Snap', count: 2, window_days: 30, first: '2026-10-01', last: '2026-10-02', ids: [4, 5] }],
  },
  worst_machines: {
    rows: [{ machine: 'Crusher 1', breakdowns: 2, downtime_hours: 3.0, open_jobs: 1, breakdown_ids: [9], work_order_ids: [2] }],
  },
  cost_by_machine: {
    rows: [{ machine: 'Pump A', equipment_id: null, labour_hours: 2.5, spares_cost: 20, jobs: 1, ids: [1] }],
  },
};

beforeEach(() => { vi.mocked(fetchMeasures).mockReset(); });

function setup() {
  const onOpen = vi.fn();
  render(<MeasuresView orders={orders} onOpen={onOpen} />);
  return { onOpen };
}

describe('MeasuresView', () => {
  it('renders the server figures and no Completion tile', async () => {
    vi.mocked(fetchMeasures).mockResolvedValue(payload);
    setup();
    expect(await screen.findByText('PM done on time')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Repeat failures/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Repeat failures' })).toBeInTheDocument();
    expect(screen.queryByText('Completion')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Downtime, MTTR and MTBF per machine' })).toBeInTheDocument();
    expect(screen.getByText(/MTTR 1h/)).toBeInTheDocument();
  });

  it('a figure drills down to exactly the jobs it counts, and a job opens', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMeasures).mockResolvedValue(payload);
    const { onOpen } = setup();
    await user.click(await screen.findByRole('button', { name: '0-7 days: 1 job' }));
    const dialog = screen.getByRole('dialog', { name: 'Backlog: 0-7 days' });
    expect(within(dialog).getByText('#WO-00002')).toBeInTheDocument();
    expect(within(dialog).queryByText('#WO-00001')).not.toBeInTheDocument();
    await user.click(within(dialog).getByText('#WO-00002'));
    expect(onOpen).toHaveBeenCalledWith('2');
  });

  it('says so when counted jobs are not in the loaded list', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMeasures).mockResolvedValue(payload);
    setup();
    await user.click(await screen.findByRole('button', { name: /Crusher 1, Snap: 2 times/ }));
    const dialog = screen.getByRole('dialog', { name: 'Crusher 1 · Snap' });
    expect(within(dialog).getByText('None of the counted jobs are in the loaded list.')).toBeInTheDocument();
  });

  it('breakdown figures link to the Breakdowns page for that machine', async () => {
    vi.mocked(fetchMeasures).mockResolvedValue(payload);
    setup();
    const links = await screen.findAllByRole('link', { name: 'Open the breakdowns for Crusher 1' });
    expect(links.length).toBe(2);
    links.forEach(link => expect(link).toHaveAttribute('href', '/breakdowns?q=Crusher%201'));
  });

  it('no due planned jobs reads as no data, not zero percent', async () => {
    vi.mocked(fetchMeasures).mockResolvedValue({ ...payload, pm_on_time: { percent: null, on_time: 0, total: 0, ids: [], on_time_ids: [] } });
    setup();
    expect(await screen.findByText('No data')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('a failed load is an error with a retry, never zeros', async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMeasures).mockRejectedValueOnce(new Error('down')).mockResolvedValue(payload);
    setup();
    expect(await screen.findByText('The measures could not be loaded.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('PM done on time')).toBeInTheDocument();
    expect(vi.mocked(fetchMeasures)).toHaveBeenCalledTimes(2);
  });
});
