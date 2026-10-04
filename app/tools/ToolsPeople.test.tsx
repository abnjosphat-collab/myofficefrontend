import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Employee, Tool } from './prototype';
import { ToolsPeople } from './ToolsPeople';

vi.mock('./ToolsIcon', () => ({ ToolsIcon: () => <span aria-hidden="true" /> }));

const employees: Employee[] = [
  { id: 'employee-2', backendId: 'employee-2', employeeNumber: 'M-2', name: 'Mina Dube', department: 'Mining', active: true },
  { id: 'employee-1', backendId: 'employee-1', employeeNumber: 'E-1', name: 'Alex Moyo', department: 'Engineering', active: true },
];
const tools: Tool[] = [{ id: 'ENG-01', backendId: 'tool-1', name: 'Angle grinder', make: 'Makita', serial: 'S-1', category: 'Power tools', kind: 'angle-grinder', status: 'available', location: 'Store', condition: 'Good', department: 'Engineering', eligibleEmployees: [] }];

describe('ToolsPeople', () => {
  it('groups the employee register by department', async () => {
    render(<ToolsPeople employees={employees} tools={tools} competencies={[]} search="" canManage onAdd={()=>{}} onIssue={()=>{}} onSaveCompetency={async()=>{}}/>);
    // Tiles emerge with a short entrance animation; await the settled visible state.
    await waitFor(() => expect(screen.getByRole('heading',{name:'Engineering'})).toBeVisible());
    await waitFor(() => expect(screen.getByRole('heading',{name:'Mining'})).toBeVisible());
    await waitFor(() => expect(screen.getByRole('button',{name:'View Alex Moyo'})).toBeVisible());
    await waitFor(() => expect(screen.getByRole('button',{name:'View Mina Dube'})).toBeVisible());
  });

  it('saves all three tool-specific eligibility requirements from employee details', async () => {
    const user = userEvent.setup();
    const onSaveCompetency = vi.fn(async()=>{});
    render(<ToolsPeople employees={[employees[1]]} tools={tools} competencies={[]} search="" canManage onAdd={()=>{}} onIssue={()=>{}} onSaveCompetency={onSaveCompetency}/>);
    await user.click(screen.getByRole('button',{name:'View Alex Moyo'}));
    await user.click(screen.getByRole('checkbox',{name:'Trained'}));
    await user.click(screen.getByRole('checkbox',{name:'Qualified'}));
    await user.click(screen.getByRole('checkbox',{name:'Authorized'}));
    await user.click(screen.getByRole('button',{name:'Save'}));
    expect(onSaveCompetency).toHaveBeenCalledWith({employee_id:'employee-1',tool_id:'tool-1',trained:true,qualified:true,authorized:true});
  });
});
