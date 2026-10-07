import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/apiClient';
import type { WorkOrder } from './types';

const updateWorkOrder = vi.fn();
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, updateWorkOrder: (...a: unknown[]) => updateWorkOrder(...a) };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/shared/PersonInput', () => ({ PersonInput: ({ value }: { value: string }) => <input aria-label="Foreman name" readOnly value={value} /> }));
vi.mock('./SignOffField', () => ({ SignOffField: () => <span>signature</span> }));
vi.mock('./PhraseField', () => ({ PhraseField: ({ value }: { value: string }) => <span>{value}</span> }));
vi.mock('@/components/shared/RecentChoices', () => ({ rememberChoice: vi.fn() }));

const { ForemanSignoff } = await import('./ForemanSignoff');

const order = { id: '7', status: 'in-progress', progress: 40, notes: '', foreman_name: 'F. Ncube', foreman_sign: 'data:x', foreman_date: '2026-10-02', version: 3, updated_at: '2026-10-02T08:00:00Z' } as unknown as WorkOrder;
const theirs = { ...order, status: 'on-hold', version: 4, updated_at: '2026-10-02T09:30:00Z' } as WorkOrder;
const conflict = new ApiError('This work order was changed by someone else since you opened it.', 409, { code: 'version_conflict', current: theirs });

describe('a save that loses the race', () => {
  beforeEach(() => updateWorkOrder.mockReset());

  it('sends the loaded version, and on a conflict keeps the form and offers both ways out', async () => {
    updateWorkOrder.mockRejectedValueOnce(conflict);
    const onSaved = vi.fn();
    render(<ForemanSignoff order={order} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    expect(updateWorkOrder).toHaveBeenCalledWith('7', expect.objectContaining({ progress: 40 }), 3);
    expect(await screen.findByText('Someone else saved this work order first')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Foreman name')).toHaveValue('F. Ncube'); // nothing typed is lost

    updateWorkOrder.mockResolvedValueOnce({ ...order, version: 5 });
    await userEvent.click(screen.getByRole('button', { name: 'Keep mine and save' }));
    await waitFor(() => expect(updateWorkOrder).toHaveBeenLastCalledWith('7', expect.anything(), 4)); // their version, so it now goes through
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 5 })));
  });

  it('"Use theirs" hands back the server copy and saves nothing', async () => {
    updateWorkOrder.mockRejectedValueOnce(conflict);
    const onSaved = vi.fn();
    render(<ForemanSignoff order={order} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Use theirs, discard mine' }));
    expect(onSaved).toHaveBeenCalledWith(theirs);
    expect(updateWorkOrder).toHaveBeenCalledTimes(1);
  });

  it('any other failure is still shown as a failure', async () => {
    updateWorkOrder.mockRejectedValueOnce(new ApiError('Server exploded', 500));
    render(<ForemanSignoff order={order} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save foreman sign-off' }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.queryByText('Someone else saved this work order first')).not.toBeInTheDocument();
  });
});
