// app/shifts/DutyStrip.test.tsx — the roster names this week's effective duty
// officials per scope (overrides win over the rosters, covers apply to either)
// with dates and contact actions; empty, degraded and failed loads stay honest.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DutyStrip } from './DutyStrip';
import type { DutyEntry, DutyRotation, RotationCover } from '@/app/standby/types';

const rotation: DutyRotation = {
  id: 7, name: 'Mine-wide duty', department: null, is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C101', employee_name: 'Off One', phone: '0771111111' },
    { employee_id: 'C102', employee_name: 'Off Two' },
  ],
};

const entries: DutyEntry[] = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', phone: '0779999999', department: null, date_from: '2026-10-08', date_to: '2026-10-09' },
  { id: 2, employee_id: 'C200', employee_name: 'Eli Eng', department: 'Engineering', date_from: '2026-10-08', date_to: '2026-10-20' },
];

const cover: RotationCover = {
  id: 1, kind: 'duty', rotation_id: 7,
  absent_employee_id: 'C101', absent_employee_name: 'Off One',
  cover_employee_id: 'C009', cover_employee_name: 'Zed Zulu', cover_phone: '0779090909',
  date_from: '2026-10-07', date_to: '2026-10-07', reason: 'leave',
};

const base = {
  items: [] as DutyEntry[], dutyRotations: [rotation], covers: [] as RotationCover[],
  loaded: true, loading: false, error: null, degraded: false, onRetry: () => {},
  employees: [], today: '2026-10-07', onNew: () => {}, onEdit: () => {},
};

describe('DutyStrip', () => {
  it('names the effective officials with scope, dates and contact', () => {
    render(<DutyStrip {...base} />);
    expect(screen.getByRole('heading', { name: 'Duty officials' })).toBeInTheDocument();
    expect(screen.getAllByText('Mine-wide').length).toBeGreaterThan(0);
    expect(screen.getByText('Off One')).toBeInTheDocument();
    expect(screen.getByText('Off Two')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Off One/ })).toHaveAttribute('href', 'tel:+263771111111');
  });

  it('lets an explicit override win, and edits it through the caller', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<DutyStrip {...base} items={[entries[0]]} onEdit={onEdit} />);
    expect(screen.getByText('Dee Delta')).toBeInTheDocument();
    expect(screen.getByText('Override')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Edit Dee Delta's duty stint" }));
    expect(onEdit).toHaveBeenCalledWith(entries[0]);
    expect(screen.queryByRole('button', { name: "Edit Off One's duty stint" })).not.toBeInTheDocument();
  });

  it('shows who holds in place of the official', () => {
    render(<DutyStrip {...base} covers={[cover]} />);
    expect(screen.getByText(/holding for Off One/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Zed Zulu/ })).toHaveAttribute('href', 'tel:+263779090909');
  });

  it('names new officials through the caller', async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<DutyStrip {...base} onNew={onNew} />);
    await user.click(screen.getByRole('button', { name: 'Name official' }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('says plainly when nobody answers for the week', () => {
    render(<DutyStrip {...base} dutyRotations={[]} />);
    expect(screen.getByText('No duty official named for this week.')).toBeInTheDocument();
  });

  it('degrades to explicitly named officials when rosters fail', () => {
    render(<DutyStrip {...base} items={entries} degraded />);
    expect(screen.getByText(/showing explicitly named officials only/)).toBeInTheDocument();
    expect(screen.getByText('Dee Delta')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Off One')).not.toBeInTheDocument();
  });

  it('shows a failed load as a failure with a retry, and nothing while loading', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<DutyStrip {...base} loaded={false} loading error={null} items={[]} />);
    expect(screen.queryByRole('heading', { name: 'Duty officials' })).not.toBeInTheDocument();
    rerender(<DutyStrip {...base} loaded={false} loading={false} error="Service unavailable (fixture)" onRetry={onRetry} />);
    expect(screen.getByText('Duty officials could not be loaded')).toBeInTheDocument();
    expect(screen.queryByText('No duty official named for this week.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
