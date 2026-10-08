// app/artisan-timesheets/QuickView.test.tsx — the at-a-glance table: rows and
// totals render, the expander breaks down every overtime record behind a day,
// and standby fills down by hand without touching anything else.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickView, fillStandbyDown } from './QuickView';
import { emptyDayRow } from './calcTotals';
import type { Sources } from './artisanLogic';

const sources: Sources = {
  leaves: [{
    employee_id: 'C001', leave_type: 'annual', start_date: '2026-10-06', end_date: '2026-10-06',
    status: 'approved', reason: 'Family event',
  }],
  overtime: [
    { employee_id: 'C001', overtime_type: 'regular', date: '2026-10-07', start_time: '17:00', end_time: '19:00', status: 'approved', reason: 'Pump seal' },
    { employee_id: 'C001', overtime_type: 'emergency', date: '2026-10-07', start_time: '20:00', end_time: '22:00', status: 'approved', reason: 'Callout' },
  ],
  standbyAssignments: [],
};

const rows = [
  { ...emptyDayRow('2026-10-06'), day_status: 'leave' as const, normal_hrs: 8 },
  { ...emptyDayRow('2026-10-07'), ot_15: 4, sign_in_time: '17:00', sign_out_time: '22:00' },
  { ...emptyDayRow('2026-10-08') },
];

const pendingSources: Sources = {
  leaves: [...sources.leaves, { employee_id: 'C001', leave_type: 'annual', start_date: '2026-10-08', end_date: '2026-10-08', status: 'pending', reason: 'School run' }],
  overtime: [...sources.overtime, { employee_id: 'C001', overtime_type: 'regular', date: '2026-10-08', start_time: '17:00', end_time: '18:30', status: 'pending', reason: 'Evening rounds' }],
  standbyAssignments: [],
};

describe('QuickView', () => {
  it('renders every day with its computed figures and month totals', () => {
    render(<QuickView rows={rows} employeeMineNo="C001" sources={sources} onChange={() => {}} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map(h => h.textContent)).toEqual([
      'Date', 'Day', 'Status', 'Normal', 'OT 1.5', 'OT 2.0', 'Standby', 'In', 'Out', '',
    ]);
    expect(screen.getByText('Totals')).toBeInTheDocument();
    // Month OT 1.5× total in the foot; day OT in the row.
    expect(screen.getAllByText('4.00')).toHaveLength(2);
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
  });

  it('expands a day to every overtime record behind it, plus leave and holiday lines', async () => {
    const user = userEvent.setup();
    render(<QuickView rows={rows} employeeMineNo="C001" sources={sources} onChange={() => {}} />);
    // Only the leave day and the OT day have anything to break down.
    const expanders = screen.getAllByRole('button', { name: /breakdown for/ });
    expect(expanders).toHaveLength(2);

    await user.click(expanders[1]);
    expect(screen.getByText('Pump seal')).toBeInTheDocument();
    expect(screen.getByText(/17:00–19:00/)).toBeInTheDocument();
    expect(screen.getByText(/20:00–22:00/)).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();

    await user.click(expanders[0]);
    expect(screen.getByText(/Family event/)).toBeInTheDocument();
  });

  it('toggles standby by hand and flags it so refresh keeps it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuickView rows={rows} employeeMineNo="C001" sources={sources} onChange={onChange} />);
    const boxes = screen.getAllByRole('checkbox', { name: /Standby on/ });
    await user.click(boxes[1]);
    const next = onChange.mock.calls[0][0];
    expect(next[1].on_standby).toBe(true);
    expect(next[1]._standbyManual).toBe(true);
    expect(next[0].on_standby).toBe(false);
    expect(next[2].on_standby).toBe(false);
  });

  it('locks standby off on leave days but still allows switching it off', () => {
    render(<QuickView rows={rows} employeeMineNo="C001" sources={sources} onChange={() => {}} />);
    const boxes = screen.getAllByRole('checkbox', { name: /Standby on/ });
    expect(boxes[0]).toBeDisabled(); // the leave day
    expect(boxes[1]).toBeEnabled();
  });

  it('marks overtime on leave as not counted in the breakdown', async () => {
    const user = userEvent.setup();
    const leaveRows = [{ ...emptyDayRow('2026-10-06'), day_status: 'leave' as const, normal_hrs: 8 }];
    const clashSources: Sources = {
      leaves: sources.leaves,
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-10-06', start_time: '17:00', end_time: '19:00', status: 'approved', reason: 'Callout' }],
      standbyAssignments: [],
    };
    render(<QuickView rows={leaveRows} employeeMineNo="C001" sources={clashSources} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /breakdown for/ }));
    expect(screen.getByText(/no overtime on leave/)).toBeInTheDocument();
  });

  it('fills standby down to the end of the month from the handle', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onRows = rows.map((r, i) => (i === 0 ? { ...r, on_standby: true } : r));
    render(<QuickView rows={onRows} employeeMineNo="C001" sources={sources} onChange={onChange} />);
    await user.click(screen.getAllByRole('button', { name: /Copy standby down/ })[0]);
    const next = onChange.mock.calls[0][0];
    expect(next.map((r: (typeof rows)[number]) => r.on_standby)).toEqual([true, true, true]);
    expect(next[1]._standbyManual).toBe(true);
    expect(next[2]._standbyManual).toBe(true);
  });

  it('keeps In and Out after the Standby column in every row', () => {
    render(<QuickView rows={rows} employeeMineNo="C001" sources={sources} onChange={() => {}} />);
    const cells = within(screen.getAllByRole('row')[2]).getAllByRole('cell');
    // Day, Status, Normal, OT 1.5, OT 2.0, Standby, In, Out, expand.
    expect(cells).toHaveLength(9);
    expect(within(cells[5]).getByRole('checkbox', { name: /Standby on/ })).toBeInTheDocument();
    expect(cells[6]).toHaveTextContent('17:00');
    expect(cells[7]).toHaveTextContent('22:00');
  });

  it('shows pending items in warning semantics without counting them', async () => {
    const user = userEvent.setup();
    render(<QuickView rows={rows} employeeMineNo="C001" sources={pendingSources} onChange={() => {}} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Excludes 1.50h overtime and 1 leave day awaiting approval — counted once approved.')).toBeInTheDocument();
    // The approved totals stand untouched by the pending items.
    expect(screen.getAllByText('4.00')).toHaveLength(2);
    // The pending-only day gains a breakdown too.
    const expanders = screen.getAllByRole('button', { name: /breakdown for/ });
    expect(expanders).toHaveLength(3);
    await user.click(expanders[2]);
    expect(screen.getByText('Awaiting approval — not counted in the hours above.')).toBeInTheDocument();
    expect(screen.getByText('Evening rounds')).toBeInTheDocument();
    expect(screen.getByText(/Leave requested: Annual Leave/)).toBeInTheDocument();
  });

  it('foots the standby days instead of standby hours', () => {
    const standbyRows = [{ ...rows[0], on_standby: true }, rows[1], { ...rows[2], on_standby: true }];
    render(<QuickView rows={standbyRows} employeeMineNo="C001" sources={sources} onChange={() => {}} />);
    expect(screen.getByText('days on standby')).toBeInTheDocument();
  });

  it('marks overtime on a public holiday as not counted in the breakdown', async () => {
    const user = userEvent.setup();
    const holidayRows = [{ ...emptyDayRow('2026-02-21') }];
    const holidaySources: Sources = {
      leaves: [],
      overtime: [{ employee_id: 'C001', overtime_type: 'regular', date: '2026-02-21', start_time: '17:00', end_time: '19:00', status: 'approved', reason: 'Callout' }],
      standbyAssignments: [],
    };
    render(<QuickView rows={holidayRows} employeeMineNo="C001" sources={holidaySources} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: /breakdown for/ }));
    expect(screen.getByText(/not counted/)).toBeInTheDocument();
  });
});

describe('fillStandbyDown', () => {
  it('copies the source toggle down the range and flags each row hand-set', () => {
    const next = fillStandbyDown(rows, 0, 2);
    expect(next[1].on_standby).toBe(false);
    expect(next[1]._standbyManual).toBe(true);
    const on = fillStandbyDown([{ ...rows[0], on_standby: true }, ...rows.slice(1)], 0, 1);
    expect(on[1].on_standby).toBe(true);
    expect(on[2].on_standby).toBe(false);
  });

  it('ignores empty and out-of-range fills', () => {
    expect(fillStandbyDown(rows, 1, 1)).toBe(rows);
    expect(fillStandbyDown(rows, 2, 1)).toBe(rows);
    expect(fillStandbyDown(rows, -1, 2)).toBe(rows);
    expect(fillStandbyDown(rows, 0, 99)).toHaveLength(3);
  });

  it('never copies standby onto a leave day, and clears a stale one', () => {
    const duty = { ...emptyDayRow('2026-10-07'), on_standby: true };
    const leave = { ...emptyDayRow('2026-10-08'), day_status: 'leave' as const, normal_hrs: 8 };
    const next = fillStandbyDown([duty, leave], 0, 1);
    expect(next[0].on_standby).toBe(true);
    expect(next[1].on_standby).toBe(false);
    expect(next[1]).toBe(leave); // already off — left untouched, not dirtied
    const stale = { ...leave, on_standby: true };
    expect(fillStandbyDown([duty, stale], 0, 1)[1].on_standby).toBe(false);
  });
});
