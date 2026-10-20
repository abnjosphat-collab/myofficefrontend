import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { ScheduleForm } from './ScheduleForm';

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [], useEquipment: () => [] }));
vi.mock('./api', () => ({ createSchedule: vi.fn(), updateSchedule: vi.fn() }));

import { createSchedule } from './api';

function setup() {
  const onSaved = vi.fn();
  render(
    <ConfirmProvider>
      <ScheduleForm open schedule={null} onOpenChange={() => {}} onSaved={onSaved} />
    </ConfirmProvider>,
  );
  return { onSaved };
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText(/Schedule name/), { target: { value: 'Weekly check' } });
  fireEvent.change(screen.getByLabelText(/Or type a machine name/), { target: { value: 'Pump A' } });
  await user.click(screen.getByRole('button', { name: 'Add' }));
  fireEvent.change(screen.getByLabelText(/Job request: what to do/), { target: { value: 'Check the seals' } });
}

describe('ScheduleForm numbers', () => {
  beforeEach(() => { vi.mocked(createSchedule).mockClear(); });

  it('clearing days-early leaves it empty', () => {
    setup();
    const advance = screen.getByLabelText(/Raise the work order/);
    fireEvent.change(advance, { target: { value: '' } });
    expect(advance).toHaveValue(null);
  });

  it('submit saves the clamped numbers as before', async () => {
    const user = userEvent.setup();
    vi.mocked(createSchedule).mockResolvedValue({} as never);
    setup();
    await fillRequired(user);
    fireEvent.change(screen.getByLabelText(/Raise the work order/), { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: 'Create schedule' }));
    expect(vi.mocked(createSchedule)).toHaveBeenCalledOnce();
    expect(vi.mocked(createSchedule).mock.calls[0][0]).toMatchObject({ advance_days: 5 });
  });

  it('a cleared days-early saves as 0, an over-large day-of-month clamps to 28', async () => {
    const user = userEvent.setup();
    vi.mocked(createSchedule).mockResolvedValue({} as never);
    setup();
    await fillRequired(user);
    fireEvent.change(screen.getByLabelText(/Raise the work order/), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    fireEvent.change(screen.getByLabelText(/Day of the month/), { target: { value: '99' } });
    await user.click(screen.getByRole('button', { name: 'Create schedule' }));
    expect(vi.mocked(createSchedule)).toHaveBeenCalledOnce();
    expect(vi.mocked(createSchedule).mock.calls[0][0]).toMatchObject({ advance_days: 0, recurrence_dom: 28 });
  });
});
