import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CompetencyRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import { ToolsPeople } from './ToolsPeople';

vi.mock('./ToolsIcon', () => ({ ToolsIcon: () => <span aria-hidden="true" /> }));

const employees: Employee[] = [
  { id: 'employee-2', backendId: 'employee-2', employeeNumber: 'M-2', name: 'Mina Dube', department: 'Mining', active: true },
  { id: 'employee-1', backendId: 'employee-1', employeeNumber: 'E-1', name: 'Alex Moyo', jobTitle: 'Fitter', department: 'Engineering', active: true },
];
const tool = (id: string, backendId: string, name: string, category = 'Power tools'): Tool => ({ id, backendId, name, make: '', serial: '', category, kind: 'angle-grinder', status: 'available', location: 'Store', condition: 'Good', department: 'Engineering', eligibleEmployees: [] }) as Tool;
const tools: Tool[] = [tool('ENG-01', 'tool-1', 'Angle grinder'), tool('ENG-02', 'tool-2', 'Welding machine', 'Welding')];
const approved = (over: Partial<CompetencyRecord>): CompetencyRecord => ({ id: 'r1', employee_id: 'employee-1', tool_id: 'tool-1', trained: true, qualified: true, authorized: true, authorized_by: 'Edson Mavhondo', updated_at: '2026-10-06T00:00:00Z', ...over }) as CompetencyRecord;
const ready = { state: 'ready' as const, onRetry: () => {} };
const props = { search: '', canManage: true, onAdd: () => {}, onIssue: () => {} };

describe('ToolsPeople', () => {
  it('groups the employee register by department, each person a heading that opens', async () => {
    render(<ToolsPeople {...props} employees={employees} tools={tools} competencies={[]} approvals={ready} onSaveCompetency={async () => {}} />);
    expect(screen.getByRole('heading', { name: 'Engineering' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mining' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Alex Moyo/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('lists the equipment a person is eligible for and who authorised it, once opened', async () => {
    const user = userEvent.setup();
    render(<ToolsPeople {...props} employees={[employees[1]]} tools={tools} competencies={[approved({})]} approvals={ready} onSaveCompetency={async () => {}} />);
    const summary = screen.getByRole('button', { name: /Alex Moyo/ });
    expect(within(summary).getByText('1 equipment')).toBeVisible();
    await user.click(summary);
    const list = screen.getByRole('list', { name: 'Equipment Alex Moyo is eligible for' });
    expect(within(list).getByText('Angle grinder')).toBeVisible();
    expect(within(list).getByText(/authorised by Edson Mavhondo/)).toBeVisible();
    expect(within(list).queryByText('Welding machine')).not.toBeInTheDocument();
  });

  it('adds equipment picked from the searchable list, recorded under the named authoriser', async () => {
    const user = userEvent.setup();
    const onSaveCompetency = vi.fn(async () => {});
    render(<ToolsPeople {...props} employees={[employees[1]]} tools={tools} competencies={[approved({})]} approvals={ready} onSaveCompetency={onSaveCompetency} />);
    await user.click(screen.getByRole('button', { name: /Alex Moyo/ }));
    const authoriser = screen.getByRole('textbox', { name: 'Authorised by' });
    expect(authoriser).toHaveValue('Edson Mavhondo');
    await user.type(screen.getByRole('combobox', { name: 'Add equipment' }), 'weld');
    await user.keyboard('{Tab}');
    expect(onSaveCompetency).toHaveBeenCalledWith({ employee_id: 'employee-1', tool_id: 'tool-2', trained: true, qualified: true, authorized: true, authorized_by: 'Edson Mavhondo' });
  });

  it('removes eligibility only after a second confirmation', async () => {
    const user = userEvent.setup();
    const onSaveCompetency = vi.fn(async () => {});
    render(<ToolsPeople {...props} employees={[employees[1]]} tools={tools} competencies={[approved({})]} approvals={ready} onSaveCompetency={onSaveCompetency} />);
    await user.click(screen.getByRole('button', { name: /Alex Moyo/ }));
    await user.click(screen.getByRole('button', { name: 'Remove Angle grinder from Alex Moyo' }));
    expect(onSaveCompetency).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, remove' }));
    expect(onSaveCompetency).toHaveBeenCalledWith({ employee_id: 'employee-1', tool_id: 'tool-1', trained: false, qualified: false, authorized: false });
  });

  it('shows each piece of equipment with the people eligible for it', async () => {
    const user = userEvent.setup();
    render(<ToolsPeople {...props} employees={employees} tools={tools} competencies={[approved({})]} approvals={ready} onSaveCompetency={async () => {}} />);
    await user.click(screen.getByRole('button', { name: 'By equipment' }));
    expect(screen.getByRole('heading', { name: 'Power tools' })).toBeVisible();
    const row = screen.getByRole('button', { name: /Angle grinder/ });
    expect(within(row).getByText('1 person')).toBeVisible();
    await user.click(row);
    expect(within(screen.getByRole('list', { name: 'People eligible for Angle grinder' })).getByText('Alex Moyo')).toBeVisible();
    expect(within(screen.getByRole('button', { name: /Welding machine/ })).getByText('0 people')).toBeVisible();
  });

  it('does not call a failed load "no equipment": it says the approvals are unknown and offers a retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ToolsPeople {...props} employees={[employees[1]]} tools={tools} competencies={[]} approvals={{ state: 'failed', message: 'An unexpected error occurred.', onRetry }} onSaveCompetency={async () => {}} />);
    expect(screen.getByText('The approvals could not be loaded')).toBeVisible();
    expect(within(screen.getByRole('button', { name: /Alex Moyo/ })).getByText('Approvals unknown')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Alex Moyo/ }));
    expect(screen.queryByText(/Not eligible for any equipment/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Add equipment' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('still saves all three requirements from the detailed approvals', async () => {
    const user = userEvent.setup();
    const onSaveCompetency = vi.fn(async () => {});
    render(<ToolsPeople {...props} employees={[employees[1]]} tools={tools} competencies={[]} approvals={ready} onSaveCompetency={onSaveCompetency} />);
    await user.click(screen.getByRole('button', { name: /Alex Moyo/ }));
    await user.click(screen.getByRole('button', { name: 'Detailed approvals' }));
    const dialog = await screen.findByRole('dialog');
    const row = within(dialog).getByText(/ENG-01 · Angle grinder/).closest('article') as HTMLElement;
    await user.click(within(row).getByRole('checkbox', { name: 'Trained' }));
    await user.click(within(row).getByRole('checkbox', { name: 'Qualified' }));
    await user.click(within(row).getByRole('checkbox', { name: 'Authorized' }));
    await user.click(within(row).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaveCompetency).toHaveBeenCalledWith({ employee_id: 'employee-1', tool_id: 'tool-1', trained: true, qualified: true, authorized: true }));
  });
});
