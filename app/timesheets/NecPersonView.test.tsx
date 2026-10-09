// app/timesheets/NecPersonView.test.tsx — one NEC person's period on the shared shells: identity and
// authoritative totals, day cards and the quick-view table with per-day NEC buckets, breakdowns behind the
// figures, pending items never counted, and edits through the caller's dialog.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NecPersonView } from './NecPersonView';
import { buildEarlyMorningOtDatesForEmployee, buildModuleOt15ByDateForEmployee, calcEmployeeTotals } from './calcTotals';
import type { Employee, TimesheetEntry } from './types';

const employee: Employee = {
  id: '7', employeeId: 'C007', name: 'Nkosana Moyo', position: 'Fitter',
  department: 'Engineering', email: '', is_active: true, employmentType: 'NEC',
};
const period = { start: new Date(2026, 8, 13), end: new Date(2026, 9, 12) };
const days = [14, 15, 16, 17, 18, 19].map(d => new Date(2026, 8, d));

const entries: TimesheetEntry[] = [
  { id: 1, employee_id: 7, date: '2026-09-14', start_time: '07:00', end_time: '15:00', regular_hours: 8, status: 'work' },
  { id: 2, employee_id: 7, date: '2026-09-15', start_time: '07:00', end_time: '17:00', regular_hours: 8, overtime_hours: 2, status: 'work' },
  { employee_id: 7, date: '2026-09-16', regular_hours: 8, status: 'leave', _auto: 'leave' },
  { id: 3, employee_id: 7, date: '2026-09-17', start_time: '18:00', end_time: '06:00', regular_hours: 8, status: 'work' },
  { id: 4, employee_id: 7, date: '2026-09-19', start_time: '07:00', end_time: '15:00', regular_hours: 8, status: 'work', standby_allowance: true },
];
const leaves = [
  { employee_id: 'C007', leave_type: 'annual', start_date: '2026-09-16', end_date: '2026-09-16', status: 'approved', reason: 'Family event' },
];
const overtime = [
  { employee_id: 'C007', overtime_type: 'regular', date: '2026-09-15', start_time: '15:00', end_time: '17:00', status: 'approved', reason: 'Pump seal' },
  { employee_id: 'C007', overtime_type: 'regular', date: '2026-09-18', start_time: '15:00', end_time: '17:00', status: 'pending', reason: 'Evening rounds' },
];

const props = () => {
  const moduleOt15ByDate = buildModuleOt15ByDateForEmployee(employee.employeeId, overtime);
  const earlyMorningOtDates = buildEarlyMorningOtDatesForEmployee(employee.employeeId, overtime);
  const totals = calcEmployeeTotals(employee.id, entries, {
    periodDates: ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'],
    applyRegFloorWithoutAbsent: true, moduleOt15ByDate, earlyMorningOtDates,
  });
  return {
    employee, period, days, entries, approvedLeaves: leaves, approvedOvertime: overtime, totals,
    onEditDay: vi.fn(), onDownload: vi.fn(),
  };
};

beforeEach(() => window.localStorage.clear());

describe('NecPersonView', () => {
  it('heads the period with the person and the authoritative totals', () => {
    const p = props();
    render(<NecPersonView {...p} />);
    expect(screen.getByRole('heading', { name: /Nkosana Moyo/ })).toBeInTheDocument();
    expect(screen.getByText('C007')).toBeInTheDocument();
    // Actual 40.0h, Reg floored to 208, OT 2.0h, night 13.0h (12 roster + 1 OT past 18:00), standby 8.0h → payable 231.0h.
    expect(screen.getByText('40.0h')).toBeInTheDocument();
    expect(screen.getByText('231.0h')).toBeInTheDocument();
    expect(screen.getAllByText('Regular floored to 208 (no absence this period).')).toHaveLength(2);
  });

  it('opens on the quick-view table with per-day buckets and period feet', () => {
    const p = props();
    render(<NecPersonView {...p} />);
    const table = screen.getByRole('table', { name: /Nkosana Moyo's days/ });
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual([
      'Date', 'Day', 'Status', 'Normal', 'OT 1.5', 'OT 2.0', 'Night', 'Standby', 'In', 'Out', '',
    ]);
    expect(screen.getByText('Period totals')).toBeInTheDocument();
    // The standby day flags SB; the night roster shows its 12h allowance in the row, 13.0h in the foot with the OT hour past 18:00.
    expect(screen.getByText('SB')).toBeInTheDocument();
    expect(screen.getAllByText('12.0')).toHaveLength(1);
    const table2 = screen.getByRole('table', { name: /Nkosana Moyo's days/ });
    const foot2 = within(table2).getByText('Period totals').closest('tr')!;
    expect(within(foot2).getAllByRole('cell')[3]).toHaveTextContent('13.0');
  });

  it('breaks a day down to its overtime record, leave and holiday lines', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NecPersonView {...p} />);
    await user.click(screen.getByRole('button', { name: 'Show the breakdown for 15 Sept 2026' }));
    expect(screen.getByText('Pump seal')).toBeInTheDocument();
    expect(screen.getByText('15:00–17:00 (2.0h)')).toBeInTheDocument();
    expect(screen.getByText('Public holiday: Munhumutapa Day.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show the breakdown for 16 Sept 2026' }));
    expect(screen.getByText(/Leave: Annual Leave 2026-09-16 → 2026-09-16/)).toBeInTheDocument();
    expect(screen.getByText(/Family event/)).toBeInTheDocument();
  });

  it('flags pending overtime without counting it', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NecPersonView {...p} />);
    // The pending-only day carries the warning badge …
    const row = screen.getByRole('button', { name: 'Add an entry for 18 Sept 2026' }).closest('tr')!;
    expect(within(row).getByText('Pending')).toBeInTheDocument();
    // … its breakdown names the record as awaiting approval …
    await user.click(screen.getByRole('button', { name: 'Show the breakdown for 18 Sept 2026' }));
    expect(screen.getByText('Awaiting approval — not counted in the hours above.')).toBeInTheDocument();
    expect(screen.getByText('Evening rounds')).toBeInTheDocument();
    // … the pending-only day carries no hours …
    expect(within(row).getAllByText('0.0')).toHaveLength(4);
    // … and the 1.5× foot stands at the approved 2.0h only.
    const table = screen.getByRole('table', { name: /Nkosana Moyo's days/ });
    const foot = within(table).getByText('Period totals').closest('tr')!;
    expect(within(foot).getAllByRole('cell')[1]).toHaveTextContent('2.0');
  });

  it('edits a day through the caller and downloads the person', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NecPersonView {...p} />);
    await user.click(screen.getByRole('button', { name: 'Edit 15 Sept 2026' }));
    expect(p.onEditDay).toHaveBeenCalledWith(days[1], entries[1]);
    await user.click(screen.getByRole('button', { name: 'Add an entry for 18 Sept 2026' }));
    expect(p.onEditDay).toHaveBeenCalledWith(days[4], undefined);
    await user.click(screen.getByRole('button', { name: 'Download this person' }));
    expect(p.onDownload).toHaveBeenCalledTimes(1);
  });

  it('cards every day with its hours, badges and edit buttons', async () => {
    const user = userEvent.setup();
    const p = props();
    render(<NecPersonView {...p} />);
    await user.click(screen.getByRole('tab', { name: 'Day cards' }));
    // The leave day names its leave and its 8h; the empty day owns up to having nothing.
    const leaveCard = screen.getByRole('article', { name: /Wed, 16 Sept 2026/ });
    expect(within(leaveCard).getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('No entry yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add entry' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Edit day' })[0]);
    expect(p.onEditDay).toHaveBeenCalledTimes(1);
    // A derived day carries the not-saved dot.
    expect(screen.getByText('Not saved yet')).toBeInTheDocument();
  });
});
