// A breakdown lookup may finish after the person has edited the form. Only
// the current lookup may fill an untouched downtime field.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { RecordDialog } from './RecordDialog';
import { fetchBreakdownRecords } from './useAvailabilitiesData';
import type { AvailRecord } from './types';

vi.mock('./useAvailabilitiesData', () => ({ fetchBreakdownRecords: vi.fn() }));

type Props = Parameters<typeof RecordDialog>[0];
const EQUIPMENT = [{ id: 1, equipment_id: 'CR-1', name: 'Crusher One' }, { id: 2, equipment_id: 'PU-2', name: 'Pump Two' }];
const rows = (hours: number): AvailRecord[] => [{ id: 'fixture', equipment_id: 1, date: '2026-11-01', operational_hours: 24, breakdown_hours: hours, availability_percentage: 62.5 }];
function deferred() {
  let resolve!: (rows: AvailRecord[]) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<AvailRecord[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount(props: Partial<Props> = {}) {
  const view = (next: Partial<Props> = {}) => <ConfirmProvider><RecordDialog open record={null} equipment={EQUIPMENT} onOpenChange={() => {}} onSave={async () => {}} {...props} {...next} /></ConfirmProvider>;
  return { ...render(view()), view, user: userEvent.setup() };
}
async function choose(user: ReturnType<typeof userEvent.setup>, name = 'Crusher One') {
  await user.click(screen.getByRole('combobox', { name: 'Equipment' }));
  await user.click(screen.getByRole('option', { name }));
}
const downtime = () => screen.getByLabelText(/^Downtime hours/);
const failedHint = /Breakdowns for that day could not be looked up/;

beforeEach(() => vi.mocked(fetchBreakdownRecords).mockReset());

describe('availability downtime prefill', () => {
  it('fills untouched downtime and explains the source', async () => {
    const pending = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValue(pending.promise);
    const { user } = mount();
    await choose(user);
    await act(async () => pending.resolve(rows(9)));
    expect(downtime()).toHaveValue(9);
    expect(screen.getByText(/Downtime filled from the breakdowns recorded on/)).toBeVisible();
  });

  it.each(['3', '0'])('preserves manually entered %s hours when a late lookup arrives', async value => {
    const pending = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValue(pending.promise);
    const { user } = mount();
    await choose(user);
    await user.clear(downtime());
    await user.type(downtime(), value);
    await act(async () => pending.resolve(rows(9)));
    expect(downtime()).toHaveValue(Number(value));
    expect(screen.queryByText(/Downtime filled/)).not.toBeInTheDocument();
  });

  it.each(['success', 'failure'])('ignores an old equipment lookup %s after a newer one completes', async outcome => {
    const old = deferred(); const latest = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { user } = mount();
    await choose(user);
    await choose(user, 'Pump Two');
    await act(async () => latest.resolve(rows(4)));
    await act(async () => { if (outcome === 'success') old.resolve(rows(9)); else old.reject(new Error('Old lookup failed')); });
    expect(downtime()).toHaveValue(4);
    expect(screen.queryByText(failedHint)).not.toBeInTheDocument();
  });

  it('invalidates a pending lookup even when dates change away and back', async () => {
    const old = deferred(); const middle = deferred(); const latest = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValueOnce(old.promise).mockReturnValueOnce(middle.promise).mockReturnValueOnce(latest.promise);
    const { user } = mount();
    await choose(user);
    const date = screen.getByLabelText(/^Date/) as HTMLInputElement;
    const original = date.value;
    fireEvent.change(date, { target: { value: original === '2026-10-01' ? '2026-10-02' : '2026-10-01' } });
    fireEvent.change(date, { target: { value: original } });
    await act(async () => latest.resolve(rows(5)));
    await act(async () => { old.resolve(rows(9)); middle.resolve(rows(7)); });
    expect(downtime()).toHaveValue(5);
  });

  it('invalidates the lookup when the date is cleared', async () => {
    const pending = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValue(pending.promise);
    const { user } = mount();
    await choose(user);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '' } });
    await act(async () => pending.resolve(rows(9)));
    expect(downtime()).toHaveValue(0);
    expect(screen.queryByText(/Downtime filled/)).not.toBeInTheDocument();
  });

  it('ignores the previous opening and permits a fresh lookup after reopening', async () => {
    const old = deferred(); const latest = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
    const { user, view, rerender } = mount();
    await choose(user);
    rerender(view({ open: false }));
    rerender(view());
    await act(async () => old.resolve(rows(9)));
    expect(downtime()).toHaveValue(0);
    expect(screen.queryByText(/Downtime filled/)).not.toBeInTheDocument();
    await choose(user);
    await act(async () => latest.resolve(rows(4)));
    expect(downtime()).toHaveValue(4);
  });

  it('shows a current failure so the person can enter the downtime, then clears that hint on manual entry', async () => {
    vi.mocked(fetchBreakdownRecords).mockRejectedValueOnce(new Error('Current lookup failed'));
    const { user } = mount();
    await choose(user);
    expect(fetchBreakdownRecords).toHaveBeenCalledOnce();
    expect(screen.getByText(failedHint)).toBeVisible();
    await user.clear(downtime());
    await user.type(downtime(), '3');
    expect(screen.queryByText(failedHint)).not.toBeInTheDocument();
  });

  it('keeps the submitted values through a rejected save when a lookup finishes afterwards', async () => {
    const pending = deferred();
    vi.mocked(fetchBreakdownRecords).mockReturnValue(pending.promise);
    const onSave = vi.fn<Props['onSave']>().mockRejectedValue(new Error('Save rejected'));
    const { user } = mount({ onSave });
    await choose(user);
    await user.click(screen.getByRole('button', { name: 'Save record' }));
    expect(await screen.findByText('Save rejected')).toBeVisible();
    await act(async () => pending.resolve(rows(9)));
    expect(downtime()).toHaveValue(0);
    expect(onSave.mock.calls[0][1].breakdown_hours).toBe(0);
  });

  it('keeps editing an existing record manual, without starting a prefill', async () => {
    const { user } = mount({ record: { ...rows(6)[0], id: 11 } });
    expect(downtime()).toHaveValue(6);
    await choose(user, 'Pump Two');
    expect(fetchBreakdownRecords).not.toHaveBeenCalled();
    expect(downtime()).toHaveValue(6);
  });
});
