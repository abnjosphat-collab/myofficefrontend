// app/standby/CoverDialog.test.tsx — naming cover validates the roster, both
// people, and the dates; a preset from a leave warning arrives prefilled; a
// valid save posts the cover payload.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoverDialog } from './CoverDialog';
import type { DutyRotation, StandbyRotation } from './types';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C001', first_name: 'Ann', last_name: 'Alpha', phone: '0771111111', designation: 'Electrician', department: 'Engineering' },
    { id: 2, employee_id: 'C009', first_name: 'Zed', last_name: 'Zulu', phone: '0779090909', designation: 'Artisan', department: 'Engineering' },
  ],
}));

const standby: StandbyRotation[] = [
  { id: 1, name: 'Electrical', section: 'Electrical', is_active: true, week_length_days: 7, cycle_start_date: '2026-10-05', members: [] },
];
const duty: DutyRotation[] = [
  { id: 7, name: 'Mine-wide duty', department: null, is_active: true, week_length_days: 7, cycle_start_date: '2026-10-05', members: [] },
];

const base = {
  open: true, cover: null, standbyRotations: standby, dutyRotations: duty,
  onOpenChange: () => {}, onSave: async () => {},
};

describe('CoverDialog', () => {
  it('refuses an empty save and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CoverDialog {...base} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Name cover' }));
    expect(screen.getByText('Choose the rotation this cover belongs to.')).toBeInTheDocument();
    expect(screen.getByText('Choose who is away.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('arrives prefilled from a leave-warning preset', () => {
    render(<CoverDialog
      {...base}
      preset={{ kind: 'standby', rotation_id: 1, absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha', date_from: '2026-10-10', date_to: '2026-10-11', reason: 'Leave' }}
    />);
    expect(screen.getByRole('combobox', { name: 'Away' })).toHaveTextContent('Ann Alpha');
    expect(screen.getByDisplayValue('2026-10-10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Leave')).toBeInTheDocument();
  });

  it('saves the cover once both people are picked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CoverDialog
      {...base} onSave={onSave}
      preset={{ kind: 'standby', rotation_id: 1, absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha', date_from: '2026-10-10', date_to: '2026-10-11', reason: 'Leave' }}
    />);
    await user.click(screen.getByRole('combobox', { name: 'Holding in their place' }));
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    await user.click(screen.getByRole('button', { name: 'Name cover' }));
    expect(onSave).toHaveBeenCalledWith(null, expect.objectContaining({
      kind: 'standby', rotation_id: 1,
      absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha',
      cover_employee_id: 'C009', cover_employee_name: 'Zed Zulu',
      date_from: '2026-10-10', date_to: '2026-10-11', reason: 'Leave',
    }));
  });

  it('refuses cover in place of yourself', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CoverDialog
      {...base} onSave={onSave}
      preset={{ kind: 'standby', rotation_id: 1, absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha', date_from: '2026-10-10', date_to: '2026-10-11' }}
    />);
    await user.click(screen.getByRole('combobox', { name: 'Holding in their place' }));
    await user.click(screen.getByRole('option', { name: /Ann Alpha/ }));
    await user.click(screen.getByRole('button', { name: 'Name cover' }));
    expect(screen.getByText('Nobody holds in place of themselves.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
