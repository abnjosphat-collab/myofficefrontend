import { render as baseRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import type { Tool } from './prototype';
import { RegisterView } from './RegisterView';


const render = (ui: ReactElement) => baseRender(<ConfirmProvider>{ui}</ConfirmProvider>);
const tool = (id: string, name: string, extra: Partial<Tool> = {}): Tool => ({ id, backendId: `b-${id}`, name, make: '', serial: '', category: 'Power tools', kind: 'angle-grinder', status: 'available', location: 'Store', condition: 'Good', department: 'Engineering', eligibleEmployees: [], ...extra }) as Tool;
const tools = [tool('T-1', 'Angle grinder'), tool('T-2', 'Drill'), tool('T-3', 'Megger', { status: 'issued', holder: 'Alex Moyo · E-1' }), tool('T-4', 'Old saw', { archived: true })];
const base = { view: 'list' as const, onSelect: () => {} };

describe('RegisterView', () => {
  it('shows one card per tool in grid view and opens the one clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RegisterView tools={tools} view="grid" onSelect={onSelect} />);
    expect(screen.getAllByRole('button', { name: /Open for details/ })).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /^Drill, T-2/ }));
    expect(onSelect).toHaveBeenCalledWith('T-2');
  });

  it('offers Issue on ready tools and Receive on tools that are out, and nothing on archived ones', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<RegisterView tools={tools} view="grid" onSelect={() => {}} onAction={onAction} />);
    expect(screen.getAllByRole('button', { name: 'Issue' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Receive' })).toHaveLength(1);
    await user.click(screen.getAllByRole('button', { name: 'Issue' })[1]);
    expect(onAction).toHaveBeenCalledWith('issue', expect.objectContaining({ id: 'T-2' }));
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    expect(onAction).toHaveBeenCalledWith('return', expect.objectContaining({ id: 'T-3' }));
  });

  it('shows no quick action without an action handler', () => {
    render(<RegisterView tools={tools} view="grid" onSelect={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Issue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument();
  });

  it('offers nothing to people who cannot archive, or in grid view', () => {
    const { rerender } = render(<RegisterView tools={tools} {...base} />);
    expect(screen.queryByRole('button', { name: /Select to archive/ })).not.toBeInTheDocument();
    rerender(<ConfirmProvider><RegisterView tools={tools} {...base} view="grid" onArchiveMany={async () => {}} /></ConfirmProvider>);
    expect(screen.queryByRole('button', { name: /Select to archive/ })).not.toBeInTheDocument();
  });

  it('ticks several items, asks once more, then archives only those ticked; issued and archived items cannot be ticked', async () => {
    const user = userEvent.setup();
    const onArchiveMany = vi.fn(async () => {});
    render(<RegisterView tools={tools} {...base} onArchiveMany={onArchiveMany} />);
    await user.click(screen.getByRole('button', { name: /Select to archive/ }));
    expect(screen.getByRole('checkbox', { name: 'Select Megger' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select Old saw' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Select Drill' }));
    await user.click(screen.getByRole('button', { name: 'Archive 1' }));
    expect(onArchiveMany).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(onArchiveMany).toHaveBeenCalledWith([expect.objectContaining({ id: 'T-2' })]);
    expect(screen.queryByRole('checkbox', { name: 'Select Drill' })).not.toBeInTheDocument();
  });

  it('selects every eligible item at once', async () => {
    const user = userEvent.setup();
    render(<RegisterView tools={tools} {...base} onArchiveMany={async () => {}} />);
    await user.click(screen.getByRole('button', { name: /Select to archive/ }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText('2 selected')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('Tick the equipment to archive')).toBeVisible();
  });
});
