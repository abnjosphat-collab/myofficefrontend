// app/ppe/PPEBulkIssueForm.test.tsx — one shared item for a crew: an empty submit names the people list and the item,
// a full submit posts one record per person with each person's register details, and a partial failure keeps the
// refused people with the reason while the saved ones leave.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { todayLocal } from '@/lib/dates';
import { PPEBulkIssueForm } from './PPEBulkIssueForm';
import { createPPERecord } from './usePPEData';
import type { PPERecord } from './types';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Welder', department: 'MAINTENANCE', section: 'Mechanical' },
    { id: 2, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'MAINTENANCE', section: 'Mechanical' },
  ],
}));
vi.mock('./usePPEData', () => ({ createPPERecord: vi.fn(async () => ({})) }));
const createMock = vi.mocked(createPPERecord);

beforeEach(() => { createMock.mockClear(); });

const show = (records: PPERecord[] = []) => {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  render(<ConfirmProvider><PPEBulkIssueForm open records={records} matrix={{}} onOpenChange={onOpenChange} onCreated={onCreated} /></ConfirmProvider>);
  return { onOpenChange, onCreated };
};
const pick = async (user: ReturnType<typeof userEvent.setup>, who: RegExp) => {
  await user.click(screen.getByRole('checkbox', { name: who }));
};

describe('PPEBulkIssueForm', () => {
  it('names the people list and the item on an empty submit, and posts nothing', async () => {
    const user = userEvent.setup();
    const { onCreated } = show();
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(await screen.findByText('Add at least one employee.')).toBeVisible();
    expect(await screen.findByText('Enter the item or brand.')).toBeVisible();
    expect(createMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('posts one record per person with each person\u2019s register details, then closes', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onCreated } = show();
    await pick(user, /Dee Delta/);
    await pick(user, /Ann Alpha/);
    expect(screen.getByRole('button', { name: 'Issue to 2 people' })).toBeVisible();
    await user.type(screen.getByLabelText(/^Item or brand/), 'Visor');
    await user.click(screen.getByRole('button', { name: 'Issue to 2 people' }));
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ employee_id: 'C400', employee_name: 'Dee Delta', position: 'Welder', mine_section: 'Mechanical', item_name: 'Visor' }));
    expect(createMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', mine_section: 'Mechanical' }));
    expect(onCreated).toHaveBeenCalledTimes(1);
    // The form holds the saved check before closing.
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('keeps refused people with the reason while the saved ones leave', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValueOnce({} as never);
    createMock.mockRejectedValueOnce(new Error('Ann Alpha already has helmet recorded as issued today (record #3).'));
    const { onCreated } = show();
    await pick(user, /Dee Delta/);
    await pick(user, /Ann Alpha/);
    await user.type(screen.getByLabelText(/^Item or brand/), 'Visor');
    await user.click(screen.getByRole('button', { name: 'Issue to 2 people' }));
    expect(await screen.findByText(/1 issued, 1 not saved/)).toBeVisible();
    expect(await screen.findByText(/Ann Alpha already has helmet/)).toBeVisible();
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox', { name: /Ann Alpha/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Dee Delta/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Issue to 1 person' })).toBeVisible();
  });

  it('warns when someone already holds the item issued today, without blocking the save', async () => {
    const user = userEvent.setup();
    const held: PPERecord = { id: '3', employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', department: 'MAINTENANCE', ppe_type: 'helmet', item_name: 'Old', size: '', issue_date: todayLocal(), expiry_date: null, condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: 'Mechanical' };
    show([held]);
    await pick(user, /Ann Alpha/);
    expect(await screen.findByText('Some of these people already hold this item')).toBeVisible();
    await user.type(screen.getByLabelText(/^Item or brand/), 'Visor');
    await user.click(screen.getByRole('button', { name: 'Issue to 1 person' }));
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
