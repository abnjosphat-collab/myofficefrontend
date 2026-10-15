import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkIssueForm } from './BulkIssueForm';
import { PEOPLE, type Employee, type Tool } from './prototype';
import { TEST_TOOLS as SEED_TOOLS } from './testFixtures';

const employees: Employee[] = PEOPLE.map((label, index) => {
  const [name, employeeNumber] = label.split(' · ');
  return { id: String(index), backendId: `b${index}`, employeeNumber, name, department: 'Engineering', active: true };
});
const forEmployees = (...idx: number[]) => idx.map(i => ({ id: `b${i}`, employeeNumber: employees[i].employeeNumber, name: employees[i].name, department: 'Engineering' }));

describe('BulkIssueForm borrower step', () => {
  it('lists only borrowers eligible for every picked tool, and says who is missing', async () => {
    const user = userEvent.setup();
    const tools: Tool[] = [
      { ...SEED_TOOLS[0], eligibleEmployees: forEmployees(0) },
      { ...SEED_TOOLS[2], eligibleEmployees: forEmployees(0, 1) },
    ];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: /ENG-CD-01/ }));
    await user.click(screen.getByRole('checkbox', { name: /ENG-RH-03/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('status')).toHaveTextContent('Only eligible borrowers are listed');
    expect(screen.getByRole('status')).toHaveTextContent('3 people are not trained');
    const options = screen.getByRole('listbox', { name: 'Employee suggestions' });
    expect(options).toHaveTextContent('Alex Morgan');
    expect(options).not.toHaveTextContent('Jordan Ellis');
  });

  it('issues to an eligible borrower with no location or job', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const tools: Tool[] = [{ ...SEED_TOOLS[0], eligibleEmployees: forEmployees(0) }];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={onSave} />);
    await user.click(screen.getByRole('checkbox', { name: /ENG-CD-01/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Expected return'), { target: { value: '2050-10-01T16:00' } });
    await user.click(screen.getByRole('button', { name: 'Issue 1 tool' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ toolIds: ['ENG-CD-01'], person: PEOPLE[0], location: '' });
  });
});
