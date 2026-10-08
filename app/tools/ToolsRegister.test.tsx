import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Tool } from './prototype';
import { ToolsRegister } from './ToolsRegister';

vi.mock('./ToolsIcon', () => ({ ToolsIcon: () => <span aria-hidden="true" /> }));

const tool = (id: string, name: string, extra: Partial<Tool> = {}): Tool => ({ id, backendId: `b-${id}`, name, make: '', serial: '', category: 'Power tools', kind: 'angle-grinder', status: 'available', location: 'Store', condition: 'Good', department: 'Engineering', eligibleEmployees: [], ...extra }) as Tool;
const tools = [tool('T-1', 'Angle grinder'), tool('T-2', 'Drill'), tool('T-3', 'Megger', { status: 'issued', holder: 'Alex Moyo · E-1' }), tool('T-4', 'Old saw', { archived: true })];
const base = { view: 'list' as const, onSelect: () => {}, onAction: () => {} };

describe('ToolsRegister bulk archive', () => {
  it('offers nothing to people who cannot archive, or in grid view', () => {
    const { rerender } = render(<ToolsRegister tools={tools} {...base} />);
    expect(screen.queryByRole('button', { name: /Select to archive/ })).not.toBeInTheDocument();
    rerender(<ToolsRegister tools={tools} {...base} view="grid" onArchiveMany={async () => {}} />);
    expect(screen.queryByRole('button', { name: /Select to archive/ })).not.toBeInTheDocument();
  });

  it('ticks several items, asks once more, then archives only those ticked; issued and archived items cannot be ticked', async () => {
    const user = userEvent.setup();
    const onArchiveMany = vi.fn(async () => {});
    render(<ToolsRegister tools={tools} {...base} onArchiveMany={onArchiveMany} />);
    await user.click(screen.getByRole('button', { name: /Select to archive/ }));
    expect(screen.getByRole('checkbox', { name: 'Select Megger' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select Old saw' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Select Drill' }));
    await user.click(screen.getByRole('button', { name: 'Archive 1' }));
    expect(onArchiveMany).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, archive' }));
    expect(onArchiveMany).toHaveBeenCalledWith([expect.objectContaining({ id: 'T-2' })]);
    expect(screen.queryByRole('checkbox', { name: 'Select Drill' })).not.toBeInTheDocument();
  });

  it('selects every eligible item at once', async () => {
    const user = userEvent.setup();
    render(<ToolsRegister tools={tools} {...base} onArchiveMany={async () => {}} />);
    await user.click(screen.getByRole('button', { name: /Select to archive/ }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText('2 selected')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('Tick the equipment to archive')).toBeVisible();
  });
});
