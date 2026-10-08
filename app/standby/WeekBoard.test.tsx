// app/standby/WeekBoard.test.tsx — the standby week shows each rotation's holder
// and crew with working contact actions, the full sequence until the cycle
// restarts, covers holding in place of absent members, leave warnings with a
// shortcut to name cover, and the week's duty officials. Empty states stay honest.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekBoard } from './WeekBoard';
import type { LeaveRecord } from '@/app/shifts/types';
import type { DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';

const rotation: StandbyRotation = {
  id: 1, name: 'Electrical', section: 'Electrical', is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C001', employee_name: 'Ann Alpha', phone: '0771111111', designation: 'Electrician', crew: [{ employee_id: 'C010', employee_name: 'Crew One', phone: '0771010101' }] },
    { employee_id: 'C002', employee_name: 'Bob Beta', phone: '0772222222' },
    { employee_id: 'C003', employee_name: 'Cy Gamma' },
  ],
};

const dutyRotation: DutyRotation = {
  id: 7, name: 'Mine-wide duty', department: null, is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C101', employee_name: 'Off One' },
    { employee_id: 'C102', employee_name: 'Off Two' },
  ],
};

const duty: DutyEntry[] = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', phone: '0779999999', department: null, date_from: '2026-10-05', date_to: '2026-10-11' },
  { id: 2, employee_id: 'C200', employee_name: 'Eli Eng', department: 'Engineering', date_from: '2026-10-08', date_to: '2026-10-20' },
];

const cover: RotationCover = {
  id: 1, kind: 'standby', rotation_id: 1,
  absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha',
  cover_employee_id: 'C009', cover_employee_name: 'Zed Zulu', cover_phone: '0779090909',
  date_from: '2026-10-06', date_to: '2026-10-12', reason: 'leave',
};

const leave: LeaveRecord = {
  id: 1, employee_id: 'C001', employee_name: 'Ann Alpha', leave_type: 'Annual',
  start_date: '2026-10-10', end_date: '2026-10-12', status: 'approved',
};

const base = {
  rotations: [rotation], dutyRotations: [] as DutyRotation[], duty: [] as DutyEntry[],
  covers: [] as RotationCover[], leaves: [], leavesLoaded: true,
  employees: [], anchor: '2026-10-07', onCover: () => {},
};

describe('WeekBoard', () => {
  it('shows the stint holder, crew and contact actions', () => {
    render(<WeekBoard {...base} />);
    expect(screen.getByRole('heading', { name: 'Electrical' })).toBeInTheDocument();
    expect(screen.getByText(/Stint 1 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Ann Alpha/ })).toHaveAttribute('href', 'tel:+263771111111');
    expect(screen.getByRole('link', { name: /WhatsApp Ann Alpha/ })).toHaveAttribute('href', 'https://wa.me/263771111111');
    expect(screen.getByText('Crew One')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Crew One/ })).toHaveAttribute('href', 'tel:+263771010101');
  });

  it('rotates the holder as the anchor moves across stints', () => {
    const { rerender } = render(<WeekBoard {...base} />);
    expect(screen.getByText(/Stint 1 of 3/)).toBeInTheDocument();
    rerender(<WeekBoard {...base} anchor="2026-10-12" />);
    expect(screen.getByText(/Stint 2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Bob Beta/ })).toBeInTheDocument();
  });

  it('lays out the full sequence until the cycle restarts', () => {
    render(<WeekBoard {...base} />);
    const strip = screen.getByRole('list', { name: /Electrical sequence/ });
    expect(within(strip).getByText('Now')).toBeInTheDocument();
    expect(within(strip).getByText('Bob Beta')).toBeInTheDocument();
    expect(within(strip).getByText('Cy Gamma')).toBeInTheDocument();
    expect(within(strip).getByText(/Cycle restarts with Ann Alpha on 26 Oct 2026/)).toBeInTheDocument();
  });

  it('prefers the live register phone over the stored snapshot', () => {
    const employees = [{ employee_id: 'C001', phone: '0719999999', section: 'Winding', department: 'Engineering' }];
    render(<WeekBoard {...base} employees={employees} />);
    expect(screen.getByRole('link', { name: /Call Ann Alpha/ })).toHaveAttribute('href', 'tel:+263719999999');
    expect(screen.getByText(/Electrical · Engineering/)).toBeInTheDocument();
  });

  it('says plainly when a rotation has not started or has no members', () => {
    render(<WeekBoard {...base} anchor="2026-09-30" />);
    expect(screen.getByText(/Starts /)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Call Ann Alpha/ })).not.toBeInTheDocument();
    render(<WeekBoard {...base} rotations={[{ ...rotation, id: 2, members: [] }]} />);
    expect(screen.getByText(/No members yet/)).toBeInTheDocument();
  });

  it('shows who holds in place of the holder with the cover contact', () => {
    render(<WeekBoard {...base} covers={[cover]} />);
    expect(screen.getByText(/holding in place of Ann Alpha/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Zed Zulu/ })).toHaveAttribute('href', 'tel:+263779090909');
  });

  it('warns on leave overlapping the stint with a shortcut to name cover', async () => {
    const user = userEvent.setup();
    const onCover = vi.fn();
    render(<WeekBoard {...base} leaves={[leave]} leavesLoaded onCover={onCover} />);
    expect(screen.getByText(/On approved leave/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Name cover' }));
    expect(onCover).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'standby', rotation_id: 1, absent_employee_id: 'C001',
      date_from: '2026-10-10', date_to: '2026-10-11', reason: 'Leave',
    }));
  });

  it('hides leave warnings while leave records are still loading', () => {
    render(<WeekBoard {...base} leaves={[leave]} leavesLoaded={false} />);
    expect(screen.queryByText(/On approved leave/)).not.toBeInTheDocument();
  });

  it('marks a crew member away on leave with their dates', () => {
    const crewLeave: LeaveRecord = { ...leave, id: 2, employee_id: 'C010', employee_name: 'Crew One', start_date: '2026-10-07', end_date: '2026-10-07' };
    render(<WeekBoard {...base} leaves={[crewLeave]} />);
    expect(screen.getByText('On leave')).toBeInTheDocument();
    expect(screen.getByText('07 Oct 2026')).toBeInTheDocument();
  });

  it('shows the duty roster week with its own sequence and restart', () => {
    render(<WeekBoard {...base} rotations={[]} dutyRotations={[dutyRotation]} />);
    expect(screen.getByRole('heading', { name: 'Mine-wide duty' })).toBeInTheDocument();
    expect(screen.getAllByText('Off One').length).toBeGreaterThan(0);
    const strip = screen.getByRole('list', { name: /Mine-wide duty sequence/ });
    expect(within(strip).getByText(/Cycle restarts with Off One on 19 Oct 2026/)).toBeInTheDocument();
  });

  it('lets an explicitly named official win over the roster for their dates', () => {
    render(<WeekBoard {...base} rotations={[]} dutyRotations={[dutyRotation]} duty={duty} />);
    expect(screen.getByText('Override')).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByRole('link', { name: /Call Dee Delta/ })).toHaveAttribute('href', 'tel:+263779999999');
    expect(screen.getByRole('heading', { name: 'Explicitly named' })).toBeInTheDocument();
  });

  it('lists explicitly named officials with scope and contact', () => {
    render(<WeekBoard {...base} duty={duty} />);
    expect(screen.getByText('Mine-wide')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Dee Delta/ })).toHaveAttribute('href', 'tel:+263779999999');
  });

  it('stays honest with no rotations and no officials', () => {
    render(<WeekBoard {...base} rotations={[]} />);
    expect(screen.getByText('No standby rotations yet')).toBeInTheDocument();
    expect(screen.getByText('No duty official named for this week.')).toBeInTheDocument();
  });
});
