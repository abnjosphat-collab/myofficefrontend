// app/overtime/OTBulkEditDialog.test.tsx — bulk edit can move a crew's start and
// end time together; the pair is sent as start_time/end_time and a half-filled or
// zero-length pair never reaches the server.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { OTBulkEditDialog, toBulkOTPatch } from './OTBulkEditDialog';
import { bulkEditOT } from './useOvertimeData';
import type { OTRecord } from './types';

vi.mock('./useOvertimeData', async importOriginal => ({
  ...(await importOriginal<typeof import('./useOvertimeData')>()),
  bulkEditOT: vi.fn(),
}));

const records = [{ id: 1, status: 'pending' }, { id: 2, status: 'pending' }] as unknown as OTRecord[];

describe('toBulkOTPatch', () => {
  it('turns the times pair into start_time and end_time', () => {
    expect(toBulkOTPatch({ times: { start: '17:00', end: '20:30' }, notes: 'crew B' }))
      .toEqual({ start_time: '17:00', end_time: '20:30', notes: 'crew B' });
  });

  it('passes other fields through untouched when times are not being changed', () => {
    expect(toBulkOTPatch({ cost_centre: 'Projects' })).toEqual({ cost_centre: 'Projects' });
  });

  it('accepts an overnight shift', () => {
    expect(toBulkOTPatch({ times: { start: '22:00', end: '06:00' } })).toEqual({ start_time: '22:00', end_time: '06:00' });
  });

  it('refuses half a pair and a zero-length window', () => {
    expect(() => toBulkOTPatch({ times: { start: '17:00', end: '' } })).toThrow('both a start and an end');
    expect(() => toBulkOTPatch({ times: { start: '17:00', end: '17:00' } })).toThrow('no hours were worked');
  });
});

describe('OTBulkEditDialog times', () => {
  beforeEach(() => {
    vi.mocked(bulkEditOT).mockReset();
    vi.mocked(bulkEditOT).mockResolvedValue({ succeeded: 2, failed: 0, errors: [], updated: [] });
  });

  it('unlocks the times, shows the duration and sends the new pair for every selected request', async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    render(<ConfirmProvider><OTBulkEditDialog open records={records} onOpenChange={() => {}} onApplied={onApplied} /></ConfirmProvider>);

    expect(screen.getByLabelText('Start and end time')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Unlock Start and end time' }));
    fireEvent.change(screen.getByLabelText(/^Start time/), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/^End time/), { target: { value: '21:30' } });
    expect(screen.getByText('3.5 hours')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply to selected' }));
    await waitFor(() => expect(bulkEditOT).toHaveBeenCalledWith([1, 2], { start_time: '18:00', end_time: '21:30' }));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
  });

  it('explains a half-filled pair instead of saving', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><OTBulkEditDialog open records={records} onOpenChange={() => {}} onApplied={() => {}} /></ConfirmProvider>);

    await user.click(screen.getByRole('button', { name: 'Unlock Start and end time' }));
    fireEvent.change(screen.getByLabelText(/^Start time/), { target: { value: '18:00' } });
    await user.click(screen.getByRole('button', { name: 'Apply to selected' }));

    expect(await screen.findByText(/both a start and an end time/)).toBeInTheDocument();
    expect(bulkEditOT).not.toHaveBeenCalled();
  });
});
