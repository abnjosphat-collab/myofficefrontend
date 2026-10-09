import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/apiClient';
import type { ToolRegisterRow, WorkOrder, WorkOrderTool } from './types';

const createWorkOrder = vi.fn();
const updateWorkOrder = vi.fn();
const getWorkOrderTools = vi.fn();
const saveWorkOrderTools = vi.fn();
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    createWorkOrder: (...a: unknown[]) => createWorkOrder(...a), updateWorkOrder: (...a: unknown[]) => updateWorkOrder(...a),
    getWorkOrderTools: (...a: unknown[]) => getWorkOrderTools(...a), saveWorkOrderTools: (...a: unknown[]) => saveWorkOrderTools(...a),
  };
});
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/hooks/useLookups', () => ({ useEquipment: () => [{ id: 1, name: 'Crusher 3', equipment_id: 'CR-3' }], useEmployees: () => [] }));

const tools: ToolRegisterRow[] = [
  { id: 't1', register_number: 'PP-UG-0001', name: 'Torque wrench', make_model: 'Gedore', category: 'Hand tools', equipment_kind: 'hand-tool', department: 'Engineering', status: 'overdue', holder: 'T. Banda', expected_return_at: '2026-08-12T00:00:00Z', inspection_due: [], condition: 'Good' },
  { id: 't2', register_number: 'PP-UG-0002', name: 'Socket set', make_model: null, category: 'Hand tools', equipment_kind: 'hand-tool', department: 'Engineering', status: 'available', holder: null, expected_return_at: null, inspection_due: [], condition: 'Good' },
];
let toolsRegister: { items: ToolRegisterRow[]; loading: boolean; loaded: boolean; error: string | null } = { items: tools, loading: false, loaded: true, error: null };
vi.mock('./useRegisters', () => ({
  usePersonOptions: () => ({
    assignable: [{ value: 'Farai Ncube' }, { value: 'Tendai Banda', blocked: 'On annual leave, 5 Aug to 14 Aug' }],
    anyone: [{ value: 'Farai Ncube' }, { value: 'Tendai Banda' }], leaveError: null,
  }),
  useToolsRegister: () => ({ ...toolsRegister, refetch: vi.fn(), setItems: vi.fn(), errorStatus: null }),
}));

// cmdk (the equipment combobox) needs these in jsdom.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();

const { WorkOrderForm } = await import('./WorkOrderForm');

const existing = { id: '7', work_order_number: 'WO-00007', equipment_info: 'Crusher 3', to_department: 'Engineering', allocated_to: 'Farai Ncube', job_request_details: 'Replace bearing', priority: 'medium', estimated_hours: '2', date_raised: '2026-08-01', version: 2 } as unknown as WorkOrder;

const fillNew = async () => {
  await userEvent.click(screen.getByRole('combobox', { name: 'Add a machine from the equipment register' }));
  await userEvent.click(await screen.findByText('Crusher 3'));
  await userEvent.type(screen.getByLabelText(/Allocated to/), 'far');
  await userEvent.tab();
  await userEvent.type(screen.getByPlaceholderText('Describe exactly what the artisan has to do'), 'Replace the drive bearing');
};
const addTool = async (text: string) => {
  await userEvent.type(screen.getByRole('combobox', { name: 'Add a tool' }), text);
  await userEvent.tab();
};

beforeEach(() => {
  [createWorkOrder, updateWorkOrder, getWorkOrderTools, saveWorkOrderTools, toast.error, toast.success, toast.warning].forEach(f => f.mockReset());
  toolsRegister = { items: tools, loading: false, loaded: true, error: null };
  createWorkOrder.mockImplementation(async (b: Record<string, unknown>) => ({ ...b, id: 'new-1' }));
});

describe('the work order form picks from the registers', () => {
  it('fills the artisan with Tab and cannot fill someone on leave', async () => {
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    const artisan = screen.getByLabelText(/Allocated to/);
    await userEvent.type(artisan, 'ten');
    expect(screen.getByText('On annual leave, 5 Aug to 14 Aug')).toBeInTheDocument();
    await userEvent.tab();
    expect(artisan).toHaveValue('ten'); // nothing it may fill, so Tab moved on
  });

  it('raises a work order with a tool from the register, kept by its register number, and warns about it', async () => {
    saveWorkOrderTools.mockResolvedValue([]);
    const onChanged = vi.fn();
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={onChanged} />);
    await fillNew();
    await addTool('torq');
    expect(screen.getByRole('list', { name: 'Tools needed' })).toHaveTextContent('Torque wrench');
    expect(screen.getByText(/Overdue to T\. Banda, back 12 Aug/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a tool' }), 'Big hammer{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Raise work order' }));
    await waitFor(() => expect(saveWorkOrderTools).toHaveBeenCalledWith('new-1', [
      { tool_register_number: 'PP-UG-0001', tool_name: 'Torque wrench', note: null },
      { tool_register_number: null, tool_name: 'Big hammer', note: null },
    ]));
    expect(createWorkOrder).toHaveBeenCalledWith(expect.objectContaining({ allocated_to: 'Farai Ncube' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Work order raised.'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('a name typed out in full that is on the register is kept as that tool', async () => {
    saveWorkOrderTools.mockResolvedValue([]);
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    await fillNew();
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a tool' }), 'socket set{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Raise work order' }));
    await waitFor(() => expect(saveWorkOrderTools).toHaveBeenCalledWith('new-1', [{ tool_register_number: 'PP-UG-0002', tool_name: 'Socket set', note: null }]));
  });

  it('says so when the work order was raised but its tools were not saved', async () => {
    saveWorkOrderTools.mockRejectedValue(new ApiError('relation "work_order_tools" does not exist', 500));
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    await fillNew();
    await addTool('socket');
    await userEvent.click(screen.getByRole('button', { name: 'Raise work order' }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('The tools list was not saved on 1')));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the server refusing a person on leave and keeps what was typed', async () => {
    createWorkOrder.mockRejectedValue(new ApiError('Tendai Banda is on Annual leave until 2026-08-14.', 409, { code: 'person_on_leave', people: [{ name: 'Tendai Banda' }] }));
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    await fillNew();
    await userEvent.click(screen.getByRole('button', { name: 'Raise work order' }));
    expect(await screen.findByText(/Tendai Banda is on Annual leave until 2026-08-14/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe exactly what the artisan has to do')).toHaveValue('Replace the drive bearing');
  });

  it('editing loads the tools, locks the list while loading, and saves only when they changed', async () => {
    let release: (t: WorkOrderTool[]) => void = () => {};
    getWorkOrderTools.mockReturnValue(new Promise<WorkOrderTool[]>(r => { release = r; }));
    updateWorkOrder.mockResolvedValue({ ...existing, version: 3 });
    saveWorkOrderTools.mockResolvedValue([]);
    render(<WorkOrderForm open order={existing} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Add a tool' })).toBeDisabled();
    release([{ tool_register_number: 'PP-UG-0001', tool_name: 'Torque wrench', note: null }]);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Add a tool' })).toBeEnabled());
    expect(screen.getByRole('list', { name: 'Tools needed' })).toHaveTextContent('Torque wrench');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateWorkOrder).toHaveBeenCalled());
    expect(saveWorkOrderTools).not.toHaveBeenCalled(); // tools untouched: nothing to save
  });

  it('editing: a tools list that failed to load is never replaced, and the work order itself still saves', async () => {
    getWorkOrderTools.mockRejectedValue(new ApiError('relation "work_order_tools" does not exist', 500));
    updateWorkOrder.mockResolvedValue({ ...existing, version: 3 });
    render(<WorkOrderForm open order={existing} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    expect(await screen.findByText('The tools on this work order could not be loaded')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Add a tool' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateWorkOrder).toHaveBeenCalled());
    expect(saveWorkOrderTools).not.toHaveBeenCalled();
  });

  it('removing a tool from an existing work order saves the shorter list', async () => {
    getWorkOrderTools.mockResolvedValue([{ tool_register_number: 'PP-UG-0001', tool_name: 'Torque wrench', note: null }]);
    updateWorkOrder.mockResolvedValue({ ...existing, version: 3 });
    saveWorkOrderTools.mockResolvedValue([]);
    render(<WorkOrderForm open order={existing} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Torque wrench' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(saveWorkOrderTools).toHaveBeenCalledWith('7', []));
  });

  it('a Tools register that cannot be read says so and still accepts typed tools', async () => {
    toolsRegister = { items: [], loading: false, loaded: false, error: 'Tools register unavailable' };
    render(<WorkOrderForm open order={null} allOrders={[]} onOpenChange={vi.fn()} onChanged={vi.fn()} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a tool' }), 'Hammer');
    expect(screen.getByText(/Tools register could not be read, so typed text is kept as typed/)).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('list', { name: 'Tools needed' })).toHaveTextContent('Hammer');
  });
});
