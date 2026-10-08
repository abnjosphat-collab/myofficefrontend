// app/standby/WeekBoard.test.tsx — the standby week shows each rotation's holder
// and crew with working contact actions, the sequence with the current stint
// marked, and the week's duty officials. Empty states stay honest.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { WeekBoard } from './WeekBoard';
import type { DutyEntry, StandbyRotation } from './types';

const rotation: StandbyRotation = {
  id: 1, name: 'Electrical', section: 'Electrical', is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C001', employee_name: 'Ann Alpha', phone: '0771111111', designation: 'Electrician', crew: [{ employee_id: 'C010', employee_name: 'Crew One', phone: '0771010101' }] },
    { employee_id: 'C002', employee_name: 'Bob Beta', phone: '0772222222' },
    { employee_id: 'C003', employee_name: 'Cy Gamma' },
  ],
};

const duty: DutyEntry[] = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', phone: '0779999999', department: null, date_from: '2026-10-05', date_to: '2026-10-11' },
  { id: 2, employee_id: 'C200', employee_name: 'Eli Eng', department: 'Engineering', date_from: '2026-10-08', date_to: '2026-10-20' },
];

describe('WeekBoard', () => {
  it('shows the stint holder, crew and contact actions', () => {
    render(<WeekBoard rotations={[rotation]} duty={duty} employees={[]} anchor="2026-10-07" />);
    expect(screen.getByRole('heading', { name: 'Electrical' })).toBeInTheDocument();
    expect(screen.getByText(/Stint 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/next: Bob Beta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Ann Alpha/ })).toHaveAttribute('href', 'tel:+263771111111');
    expect(screen.getByRole('link', { name: /WhatsApp Ann Alpha/ })).toHaveAttribute('href', 'https://wa.me/263771111111');
    expect(screen.getByText('Crew One')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Crew One/ })).toHaveAttribute('href', 'tel:+263771010101');
  });

  it('rotates the holder as the anchor moves across stints', () => {
    const { rerender } = render(<WeekBoard rotations={[rotation]} duty={[]} employees={[]} anchor="2026-10-07" />);
    expect(screen.getByText(/Stint 1 of 3/)).toBeInTheDocument();
    rerender(<WeekBoard rotations={[rotation]} duty={[]} employees={[]} anchor="2026-10-12" />);
    expect(screen.getByText(/Stint 2 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Bob Beta/ })).toBeInTheDocument();
  });

  it('marks the current stint in the sequence strip', () => {
    render(<WeekBoard rotations={[rotation]} duty={[]} employees={[]} anchor="2026-10-07" />);
    const strip = screen.getByRole('list', { name: /Electrical sequence/ });
    const current = within(strip).getByText('1. Ann Alpha');
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(strip).getByText('2. Bob Beta')).not.toHaveAttribute('aria-current');
  });

  it('prefers the live register phone over the stored snapshot', () => {
    const employees = [{ employee_id: 'C001', phone: '0719999999', section: 'Winding', department: 'Engineering' }];
    render(<WeekBoard rotations={[rotation]} duty={[]} employees={employees} anchor="2026-10-07" />);
    expect(screen.getByRole('link', { name: /Call Ann Alpha/ })).toHaveAttribute('href', 'tel:+263719999999');
    expect(screen.getByText(/Electrical · Engineering/)).toBeInTheDocument();
  });

  it('says plainly when a rotation has not started or has no members', () => {
    render(<WeekBoard rotations={[rotation]} duty={[]} employees={[]} anchor="2026-09-30" />);
    expect(screen.getByText(/Starts /)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Call Ann Alpha/ })).not.toBeInTheDocument();
    render(<WeekBoard rotations={[{ ...rotation, id: 2, members: [] }]} duty={[]} employees={[]} anchor="2026-10-07" />);
    expect(screen.getByText(/No members yet/)).toBeInTheDocument();
  });

  it('lists the week\u2019s duty officials with scope and contact', () => {
    render(<WeekBoard rotations={[rotation]} duty={duty} employees={[]} anchor="2026-10-07" />);
    expect(screen.getByText('Mine-wide')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Dee Delta/ })).toHaveAttribute('href', 'tel:+263779999999');
  });

  it('stays honest with no rotations and no officials', () => {
    render(<WeekBoard rotations={[]} duty={[]} employees={[]} anchor="2026-10-07" />);
    expect(screen.getByText('No standby rotations yet')).toBeInTheDocument();
    expect(screen.getByText('No duty official named for this week.')).toBeInTheDocument();
  });
});
