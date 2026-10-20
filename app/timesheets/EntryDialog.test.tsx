import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { EntryDialog } from './EntryDialog';
import type { Employee } from './types';

const employee = { id: '7', employeeId: 'E7', name: 'Ann Alpha' } as Employee;
// A Wednesday: a plain work day with no holiday notice.
const date = new Date('2026-10-21T12:00:00');

function setup() {
  const onSave = vi.fn(async (_data: object) => {});
  render(
    <ConfirmProvider>
      <EntryDialog employee={employee} date={date} onSave={onSave} onClose={() => {}} />
    </ConfirmProvider>,
  );
  return { onSave };
}

describe('EntryDialog callouts', () => {
  it('shows the callout error on the callout field and focuses it', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText('Callout hours'), { target: { value: '25' } });
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    expect(await screen.findByText('Callout hours cannot be more than 24 in a day.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText('Callout hours')).toHaveFocus());
  });

  it('a cleared callout field saves as none', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText('Callout hours'), { target: { value: '' } });
    expect(screen.getByLabelText('Callout hours')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Number of callouts'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ callout_overtime_hours: 0, callout_count: 0 });
  });
});
