import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/apiClient';
import type { WorkOrder, WorkOrderMove } from './types';

const getWorkOrderMoves = vi.fn();
const transitionWorkOrder = vi.fn();
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, getWorkOrderMoves: (...a: unknown[]) => getWorkOrderMoves(...a), transitionWorkOrder: (...a: unknown[]) => transitionWorkOrder(...a) };
});
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('./SignOffField', () => ({ SignOffField: ({ onChange }: { onChange: (v: string) => void }) => <button type="button" onClick={() => onChange('data:image/png;base64,SIGNED')}>Draw signature</button> }));

Element.prototype.scrollIntoView = vi.fn(); // the dialog scrolls a new error into view

const { StatusActions } = await import('./StatusActions');

const move = (to: string, over: Partial<WorkOrderMove> = {}): WorkOrderMove => ({ to, needs_reason: false, needs_signature: false, checks_permits: false, min_role: 'user', ...over });
const order = (over: Partial<WorkOrder> = {}) => ({ id: '7', status: 'pending', version: 3, updated_at: 't1', equipment_info: 'Pump A', allocated_to: 'Alex', ...over }) as unknown as WorkOrder;

beforeEach(() => {
  [getWorkOrderMoves, transitionWorkOrder, toast.success, toast.warning, toast.error].forEach(f => f.mockReset());
});

describe('StatusActions', () => {
  it('shows only the moves the server lists, and nothing when there are none', async () => {
    getWorkOrderMoves.mockResolvedValue([move('in-progress', { checks_permits: true })]);
    const { unmount } = render(<StatusActions order={order()} onSaved={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Start work' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete job' })).not.toBeInTheDocument();
    unmount();
    getWorkOrderMoves.mockResolvedValue([]);
    const { container } = render(<StatusActions order={order({ status: 'completed' })} onSaved={vi.fn()} />);
    await waitFor(() => expect(getWorkOrderMoves).toHaveBeenCalledTimes(2));
    expect(container).toBeEmptyDOMElement();
  });

  it('starting is one click, sends the loaded version, and hands back the saved work order', async () => {
    getWorkOrderMoves.mockResolvedValue([move('in-progress', { checks_permits: true })]);
    transitionWorkOrder.mockResolvedValue(order({ status: 'in-progress', version: 4 }));
    const onSaved = vi.fn();
    render(<StatusActions order={order()} onSaved={onSaved} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start work' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ status: 'in-progress', version: 4 })));
    expect(transitionWorkOrder).toHaveBeenCalledWith('7', { to: 'in-progress', version: 3 });
  });

  it('a flagged permit without a reference disables Start and says which one', async () => {
    getWorkOrderMoves.mockResolvedValue([move('in-progress', { checks_permits: true })]);
    render(<StatusActions order={order({ permits: { hot_work: { required: true, reference: '' } } })} onSaved={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Start work' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Add the reference for Hot work before the job can start');
  });

  it('putting on hold asks for a reason first and sends it', async () => {
    getWorkOrderMoves.mockResolvedValue([move('on-hold', { needs_reason: true })]);
    transitionWorkOrder.mockResolvedValue(order({ status: 'on-hold' }));
    render(<StatusActions order={order({ status: 'in-progress' })} onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Put on hold' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Put on hold' }).pop()!); // the dialog's own submit button
    expect(await screen.findByText('Give a reason.')).toBeInTheDocument();
    expect(transitionWorkOrder).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Waiting for the bearing');
    await userEvent.click(screen.getAllByRole('button', { name: 'Put on hold' }).pop()!);
    await waitFor(() => expect(transitionWorkOrder).toHaveBeenCalledWith('7', { to: 'on-hold', version: 3, reason: 'Waiting for the bearing' }));
  });

  it('completing needs the artisan signature and sends it', async () => {
    getWorkOrderMoves.mockResolvedValue([move('completed', { needs_signature: true })]);
    transitionWorkOrder.mockResolvedValue(order({ status: 'completed' }));
    render(<StatusActions order={order({ status: 'in-progress' })} onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Complete job' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Complete job' }).pop()!);
    expect(await screen.findByText('The artisan must sign to complete the job.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Draw signature' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Complete job' }).pop()!);
    await waitFor(() => expect(transitionWorkOrder).toHaveBeenCalledWith('7', { to: 'completed', version: 3, artisan_sign: 'data:image/png;base64,SIGNED' }));
  });

  it('a refusal from the server is shown as it is and nothing is handed back', async () => {
    getWorkOrderMoves.mockResolvedValue([move('in-progress')]);
    transitionWorkOrder.mockRejectedValue(new ApiError('Add the reference for Hot work before starting this job.', 422));
    const onSaved = vi.fn();
    render(<StatusActions order={order()} onSaved={onSaved} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start work' }));
    expect(await screen.findByText('Add the reference for Hot work before starting this job.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('a conflict says someone else changed the job and does not overwrite', async () => {
    getWorkOrderMoves.mockResolvedValue([move('in-progress')]);
    transitionWorkOrder.mockRejectedValue(new ApiError('changed', 409, { code: 'version_conflict', current: order({ version: 5 }) }));
    render(<StatusActions order={order()} onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start work' }));
    expect(await screen.findByText(/Someone else changed this work order first/)).toBeInTheDocument();
  });

  it('says so when the moves could not be loaded, instead of hiding the buttons silently', async () => {
    getWorkOrderMoves.mockRejectedValue(new ApiError('Server exploded', 500));
    render(<StatusActions order={order()} onSaved={vi.fn()} />);
    expect(await screen.findByText(/The status buttons could not be loaded \(Server exploded\)/)).toBeInTheDocument();
  });
});
