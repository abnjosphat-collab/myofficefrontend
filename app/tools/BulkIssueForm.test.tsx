import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkIssueForm } from './BulkIssueForm';

describe('BulkIssueForm footer', () => {
  it('sticks to the dialog bottom over an opaque surface', () => {
    render(<BulkIssueForm tools={[]} employees={[]} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} />);
    const bar = screen.getByRole('button', { name: 'Next' }).closest('div')!;
    expect(bar.className).toContain('sticky');
    expect(bar.className).toContain('bottom-0');
    expect(bar.className).toContain('bg-surface');
  });
});
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

  it('skips tools nobody can use in select-all and offers the shortcut', async () => {
    const user = userEvent.setup();
    const onResolveAction = vi.fn();
    const tools: Tool[] = [
      { ...SEED_TOOLS[0], eligibleEmployees: forEmployees(0) },
      { ...SEED_TOOLS[2], eligibleEmployees: [] },
    ];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} onResolveAction={onResolveAction} />);
    const nobodyBox = screen.getByRole('checkbox', { name: /ENG-RH-03/ });
    expect(nobodyBox).toBeDisabled();
    expect(screen.getByText('Nobody can use it yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select all available' }));
    expect(screen.getByRole('checkbox', { name: /ENG-CD-01/ })).toBeChecked();
    expect(nobodyBox).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Set who can use it' }));
    expect(onResolveAction).toHaveBeenCalledWith('manage-eligibility', expect.objectContaining({ id: 'ENG-RH-03' }));
  });

  it('refused Next focuses the step message', async () => {
    const user = userEvent.setup();
    const tools: Tool[] = [{ ...SEED_TOOLS[0], eligibleEmployees: forEmployees(0) }];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tick at least one available tool.');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  });

  it('empty submit jumps to the failing step and focuses its message', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const tools: Tool[] = [{ ...SEED_TOOLS[0], eligibleEmployees: forEmployees(0) }];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={onSave} />);
    await user.click(screen.getByRole('tab', { name: 'Details' }));
    await user.click(screen.getByRole('button', { name: 'Issue tools' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Tick at least one available tool.');
    expect(screen.getByRole('tab', { name: 'Tools' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
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

describe('BulkIssueForm resolving actions', () => {
  it('offers receive and transfer beside a tool that is out, and record actions on one held for attention', async () => {
    const user = userEvent.setup();
    const onResolveAction = vi.fn();
    const tools: Tool[] = [{ ...SEED_TOOLS[1] }, { ...SEED_TOOLS[8], inspectionDue: ['monthly'] }];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} onResolveAction={onResolveAction} />);
    expect(screen.getByRole('checkbox', { name: /ENG-AG-02/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    expect(onResolveAction).toHaveBeenCalledWith('receive', expect.objectContaining({ id: 'ENG-AG-02' }));
    await user.click(screen.getByRole('button', { name: 'Record check' }));
    expect(onResolveAction).toHaveBeenCalledWith('record-check', expect.objectContaining({ id: 'ENG-IW-09' }));
    await user.click(screen.getByRole('button', { name: 'Record repair' }));
    expect(onResolveAction).toHaveBeenCalledWith('record-repair', expect.objectContaining({ id: 'ENG-IW-09' }));
  });
  it('offers record-check from the conditions step for a picked tool with due checks', async () => {
    const user = userEvent.setup();
    const onResolveAction = vi.fn();
    const tools: Tool[] = [{ ...SEED_TOOLS[0], inspectionDue: ['monthly'] }];
    render(<BulkIssueForm tools={tools} employees={employees} issuerDepartment="Engineering" locationSuggestions={[]} onSave={() => {}} onResolveAction={onResolveAction} />);
    await user.click(screen.getByRole('checkbox', { name: /ENG-CD-01/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Employee' }), { target: { value: PEOPLE[0] } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Record check' }));
    expect(onResolveAction).toHaveBeenCalledWith('record-check', expect.objectContaining({ id: 'ENG-CD-01' }));
  });
});