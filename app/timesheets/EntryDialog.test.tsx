import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { EntryDialog } from './EntryDialog';
import type { Employee, TimesheetEntry } from './types';

const employee = { id: '7', employeeId: 'E7', name: 'Ann Alpha' } as Employee;
// A Wednesday: a plain work day with no holiday notice.
const date = new Date('2026-10-21T12:00:00');
const saved: TimesheetEntry = { employee_id: 7, date: '2026-10-21', regular_hours: 10, status: 'work', start_time: '07:00', end_time: '17:00', callout_overtime_hours: 2.5, callout_count: 2 };

function setup(entry?: TimesheetEntry) {
  const onSave = vi.fn(async (_data: object) => {});
  render(
    <ConfirmProvider>
      <EntryDialog employee={employee} date={date} entry={entry} onSave={onSave} onClose={() => {}} />
    </ConfirmProvider>,
  );
  return { onSave };
}

describe('EntryDialog callouts', () => {
  it('offers no callout inputs, and no callout section for a day without callouts', () => {
    setup();
    expect(screen.queryByLabelText('Callout hours')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Number of callouts')).not.toBeInTheDocument();
    expect(screen.queryByText('Callout overtime')).not.toBeInTheDocument();
  });

  it('shows stored callouts read-only and keeps them on save', async () => {
    const user = userEvent.setup();
    const { onSave } = setup(saved);
    expect(screen.getByText('Callout overtime')).toBeInTheDocument();
    expect(screen.getByText('2.50h')).toBeInTheDocument();
    const count = screen.getByText('Number of callouts').closest('div')?.querySelector('dd');
    expect(count).toHaveTextContent('2');
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ callout_overtime_hours: 2.5, callout_count: 2 });
  });
});
