// app/standby/MonthBoard.test.tsx — the month view names each day's standby
// holder and duty official with cover and leave markers; selecting a day
// unfolds the full detail with contacts.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthBoard } from './MonthBoard';
import type { LeaveRecord } from '@/app/shifts/types';
import type { DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';

const rotation: StandbyRotation = {
  id: 1, name: 'Electrical', section: 'Electrical', is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C001', employee_name: 'Ann Alpha', phone: '0771111111', crew: [{ employee_id: 'C010', employee_name: 'Crew One' }] },
    { employee_id: 'C002', employee_name: 'Bob Beta' },
  ],
};

const dutyRotation: DutyRotation = {
  id: 7, name: 'Mine-wide duty', department: null, is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [{ employee_id: 'C101', employee_name: 'Off One', phone: '0771111112' }],
};

const duty: DutyEntry[] = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', department: null, date_from: '2026-10-08', date_to: '2026-10-09' },
];

const cover: RotationCover = {
  id: 1, kind: 'standby', rotation_id: 1,
  absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha',
  cover_employee_id: 'C009', cover_employee_name: 'Zed Zulu',
  date_from: '2026-10-06', date_to: '2026-10-06', reason: 'leave',
};

const leave: LeaveRecord = {
  id: 1, employee_id: 'C001', employee_name: 'Ann Alpha', leave_type: 'Annual',
  start_date: '2026-10-10', end_date: '2026-10-12', status: 'approved',
};

const base = {
  rotations: [rotation], dutyRotations: [dutyRotation], duty,
  covers: [cover], leaves: [leave], leavesLoaded: true,
  employees: [], today: '2026-10-08',
};

describe('MonthBoard', () => {
  it('names each day holder and official with cover and leave markers', () => {
    render(<MonthBoard {...base} />);
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    const grid = screen.getByRole('table');
    expect(within(grid).getAllByText('Ann Alpha').length).toBeGreaterThan(0);
    expect(within(grid).getAllByText('Off One').length).toBeGreaterThan(0);
    expect(within(grid).getAllByText('Cover').length).toBeGreaterThan(0);
    expect(within(grid).getAllByText('Leave').length).toBeGreaterThan(0);
  });

  it('unfolds the selected day with crew and contacts', async () => {
    const user = userEvent.setup();
    render(<MonthBoard {...base} />);
    await user.click(screen.getByRole('button', { name: /\b8 Oct 2026/ }));
    const detail = screen.getByRole('region', { name: /Detail for 8 Oct 2026/ });
    expect(within(detail).getByText('Crew One')).toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: /Call Ann Alpha/ })).toHaveAttribute('href', 'tel:+263771111111');
    expect(within(detail).getByText('Dee Delta')).toBeInTheDocument();
  });

  it('moves between months and back to today', async () => {
    const user = userEvent.setup();
    render(<MonthBoard {...base} />);
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
  });

  it('stays honest with no rotations', () => {
    render(<MonthBoard {...base} rotations={[]} />);
    expect(screen.getByText('No standby rotations yet')).toBeInTheDocument();
  });

  it('says plainly when a day has nobody on standby or duty', async () => {
    const user = userEvent.setup();
    render(<MonthBoard {...base} />);
    await user.click(screen.getByRole('button', { name: /30 Sept 2026/ }));
    const detail = screen.getByRole('region', { name: /Detail for 30 Sept 2026/ });
    expect(within(detail).getByText('Nobody stands standby on this day.')).toBeInTheDocument();
    expect(within(detail).getByText('No duty official named for this day.')).toBeInTheDocument();
  });
});
