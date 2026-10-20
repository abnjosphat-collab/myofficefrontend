import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { UnitDrawer } from './UnitDrawer';
import type { Compressor } from './types';

const compressor: Compressor = {
  id: 1, name: 'C-1', model: 'M', capacity: '7 bar', location: 'Pit',
  status: 'running', total_running_hours: 120.5, total_loaded_hours: 90,
} as Compressor;
const previous = { total_running_hours: 100, total_loaded_hours: 80, date: '2026-10-01' };

function setup() {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => {});
  render(
    <ConfirmProvider>
      <UnitDrawer compressor={compressor} previous={previous} previousUnavailable={false} previousLoading={false}
        dateLabel="Fri 10 Oct" recordedToday={false} onClose={onClose} onSave={onSave} onStatus={async () => {}} onHistory={() => {}} />
    </ConfirmProvider>,
  );
  return { onClose, onSave };
}

describe('UnitDrawer guard', () => {
  it('asks before discarding a changed reading', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.clear(screen.getByLabelText(/Running hours/));
    await user.type(screen.getByLabelText(/Running hours/), '121');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('The reading is not saved yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes silently when pristine', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a cleared reading explains itself instead of refusing silently', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.clear(screen.getByLabelText(/Running hours/));
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByText('Enter the running-hours reading.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
