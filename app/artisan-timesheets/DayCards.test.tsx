// app/artisan-timesheets/DayCards.test.tsx — the day cards show system hours as
// read-only text (no hour inputs anywhere) and only standby, sign times and
// notes are editable. A hand-set standby toggle is flagged so refresh keeps it.
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayCards } from './DayCards';
import type { AutoPopulateSources } from './autoPopulate';
import { emptyDayRow } from './calcTotals';

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: null, profile: null }) }));

const rows = [
  { ...emptyDayRow('2026-10-06'), day_status: 'leave' as const, normal_hrs: 8 },
  { ...emptyDayRow('2026-10-07'), ot_15: 2 },
  { ...emptyDayRow('2026-10-08') },
  { ...emptyDayRow('2026-09-15'), ot_20: 8 },
];

const emptySources: AutoPopulateSources = { leaves: [], overtime: [], standbyAssignments: [] };
const pendingSources: AutoPopulateSources = {
  leaves: [
    { employee_id: 'C001', leave_type: 'annual', start_date: '2026-10-08', end_date: '2026-10-08', status: 'pending', reason: 'School run' },
    { employee_id: 'C001', leave_type: 'sick', start_date: '2026-10-09', end_date: '2026-10-09', status: 'pending', reason: 'Clinic' },
  ],
  overtime: [
    { employee_id: 'C001', overtime_type: 'regular', date: '2026-10-08', start_time: '17:00', end_time: '19:00', status: 'pending', reason: 'Evening rounds' },
  ],
  standbyAssignments: [],
};

describe('DayCards', () => {
  it('shows hours as read-only text with overtime heroed, and no hour inputs', () => {
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={() => {}} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    // Summary heroes the month's OT 1.5×; the OT day headlines its own OT.
    expect(screen.getByText('2.00h OT')).toBeInTheDocument();
    expect(screen.getAllByText('Overtime @ 1.5×')).toHaveLength(2);
    // Leave day shows its 8h normal line; summary carries the leave-only normal total.
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Normal (leave only)')).toBeInTheDocument();
    expect(screen.getByText('No hours recorded.')).toBeInTheDocument();
    // Holidays are named so the artisan can see why OT 2.0× appeared.
    expect(screen.getByText('Munhumutapa Day')).toBeInTheDocument();
  });

  it('toggles standby by hand and flags it so refresh keeps it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={onChange} />);
    const boxes = screen.getAllByRole('checkbox', { name: /On standby/ });
    expect(boxes).toHaveLength(4);

    await user.click(boxes[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next[1].on_standby).toBe(true);
    expect(next[1]._standbyManual).toBe(true);
    expect(next[0].on_standby).toBe(false);
    expect(next[2].on_standby).toBe(false);
  });

  it('locks standby off on leave days', () => {
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={() => {}} />);
    const boxes = screen.getAllByRole('checkbox', { name: /On standby/ });
    expect(boxes[0]).toBeDisabled(); // the leave day
    expect(boxes[1]).toBeEnabled();
  });

  it('still allows switching a stale standby off a leave day', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const stale = [{ ...rows[0], on_standby: true }];
    render(<DayCards rows={stale} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: /On standby/ });
    expect(box).toBeEnabled();
    await user.click(box);
    expect(onChange.mock.calls[0][0][0].on_standby).toBe(false);
  });

  it('edits sign-in times', () => {
    const onChange = vi.fn();
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={onChange} />);
    const inputs = screen.getAllByLabelText(/Sign in time/);
    fireEvent.change(inputs[0], { target: { value: '07:30' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].sign_in_time).toBe('07:30');
  });

  it('flags items awaiting approval and excludes them from the totals', () => {
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={pendingSources} year={2026} month={10} reuseSignatures={[]} onChange={() => {}} />);
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    expect(screen.getByText('Annual + 2.00h overtime')).toBeInTheDocument();
    expect(screen.getByText('Excludes 2.00h overtime and 2 leave days awaiting approval — counted once approved.')).toBeInTheDocument();
    // The approved figures stand untouched by the pending items.
    expect(screen.getByText('2.00h OT')).toBeInTheDocument();
  });

  it('foots standby days for the Pay office instead of standby hours', () => {
    render(<DayCards rows={rows} employeeName="Ann Alpha" employeeMineNo="C001" sources={emptySources} year={2026} month={10} reuseSignatures={[]} onChange={() => {}} />);
    expect(screen.getByText('0 days')).toBeInTheDocument();
    expect(screen.queryByText(/Standby @/)).not.toBeInTheDocument();
  });
});
