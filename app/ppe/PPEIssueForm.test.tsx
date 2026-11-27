// app/ppe/PPEIssueForm.test.tsx — the person comes only from the register picker: no typed ID/name/position
// inputs, an empty submit names the picker, and re-linking an unmatched record saves the new register number.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { PPEIssueForm } from './PPEIssueForm';
import type { EmployeeWithPPE, PPERecord } from './types';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Welder', department: 'MAINTENANCE', section: 'Mechanical' },
    { id: 2, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter', department: 'MAINTENANCE', section: 'Mechanical' },
    { id: 95, first_name: 'Sam', last_name: 'Fixture', designation: 'Rigger Class 1', department: 'Engineering', section: 'Mechanical' },
  ],
}));

const issue = (over: Partial<PPERecord> = {}): PPERecord => ({
  id: '9', employee_id: 'TBA2', employee_name: 'Tafadzwa  Matangira', position: 'Maintenance Engineer', department: 'MAINTENANCE',
  ppe_type: 'helmet', item_name: 'Boots', size: '', issue_date: '2026-10-01', expiry_date: null, condition: 'good',
  status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: 'Management', ...over,
});
const holder = (over: Partial<EmployeeWithPPE> = {}): EmployeeWithPPE => ({
  employee_id: 'TBA2', employee_name: 'Tafadzwa  Matangira', position: 'Maintenance Engineer', section: 'Management',
  records: [issue()], ...over,
});

describe('PPEIssueForm person-pick', () => {
  it('issues an OSFA helmet from a numberless employee card', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={null} prefill={null}
      employee={holder({ employee_db_id: 95, employee_id: '', employee_name: 'Sam Fixture', records: [] })}
      matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    expect(screen.getByText('No mine number')).toBeVisible();
    expect(screen.getByLabelText(/^Size/)).toHaveValue('OSFA');
    await user.type(screen.getByLabelText(/^Item or brand/), 'Hard hat');
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ employee_db_id: 95, employee_id: '', ppe_type: 'helmet', size: 'OSFA' }),
      undefined,
    );
  });

  it('selects a numberless person by name and applies the cap lamp belt default', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={null} prefill={null} employee={null}
      matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    await user.type(screen.getByRole('combobox', { name: 'Pick an employee' }), 'Sam');
    await user.click(screen.getByRole('option', { name: /Sam Fixture/ }));
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(screen.getByRole('option', { name: 'Cap Lamp Belt' }));
    expect(screen.getByLabelText(/^Size/)).toHaveValue('OSFA');
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(screen.getByRole('option', { name: 'Safety Shoes' }));
    expect(screen.getByLabelText(/^Size/)).toHaveValue('');
    await user.click(screen.getByRole('combobox', { name: 'PPE type' }));
    await user.click(screen.getByRole('option', { name: 'Cap Lamp Belt' }));
    await user.type(screen.getByLabelText(/^Item or brand/), 'Lamp belt');
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ employee_db_id: 95, employee_id: '', ppe_type: 'Cap_lamp_belt', size: 'OSFA' }),
      undefined,
    );
  });

  it('offers no typed person inputs and names the picker on an empty submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={null} prefill={null} employee={null} matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    expect(screen.queryByLabelText(/^Employee ID/)).toBeNull();
    expect(screen.queryByLabelText(/^Full name/)).toBeNull();
    expect(screen.queryByLabelText(/^Position/)).toBeNull();
    expect(screen.queryByLabelText(/^Mine section/)).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Pick an employee' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(await screen.findByText('Pick the person from the register.')).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the picked person as facts and saves the register number', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={null} prefill={null} employee={null} matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    // The new-issue picker starts with the caret in its box; type and pick straight from it.
    await user.keyboard('dee');
    await user.click(screen.getByRole('option', { name: /Dee Delta/ }));
    const facts = document.querySelector('dl[aria-label="Person"]')?.textContent ?? '';
    expect(facts).toContain('C400');
    expect(facts).toContain('Dee Delta');
    expect(facts).toContain('Welder');
    expect(facts).toContain('Mechanical');
    await user.type(screen.getByLabelText(/^Item or brand/), 'Visor');
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 'C400', employee_name: 'Dee Delta', position: 'Welder', mine_section: 'Mechanical' }),
      undefined,
    );
  });

  it('re-links an unmatched record to the picked register number', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={issue()} prefill={null} employee={holder({ unmatched: true })} matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    expect(screen.getByRole('combobox', { name: 'Re-link to the right person' })).toBeVisible();
    expect(document.querySelector('dl[aria-label="Person"]')?.textContent ?? '').toContain('TBA2');
    await user.type(screen.getByRole('combobox', { name: 'Re-link to the right person' }), 'ann');
    await user.click(screen.getByRole('option', { name: /Ann Alpha/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C100', employee_name: 'Ann Alpha' }), '9');
  });

  it('keeps the person on a matched edit unless changed', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    const rec = issue({ employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', mine_section: 'Mechanical' });
    render(<ConfirmProvider><PPEIssueForm open record={rec} prefill={null} employee={holder({ employee_id: 'C100', employee_name: 'Ann Alpha', position: 'Fitter', section: 'Mechanical', records: [rec] })} matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    expect(screen.getByRole('combobox', { name: 'Person' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C100' }), '9');
  });
});

describe('PPEIssueForm premature failure', () => {
  it('marks an issue as a premature failure and saves what failed', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(<ConfirmProvider><PPEIssueForm open record={null} prefill={null} employee={null} matrix={{}} onOpenChange={() => {}} onSave={onSave} /></ConfirmProvider>);
    await user.keyboard('dee');
    await user.click(screen.getByRole('option', { name: /Dee Delta/ }));
    await user.type(screen.getByLabelText(/^Item or brand/), 'Gumboots');
    expect(screen.queryByLabelText(/^What failed/)).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: /Premature failure/ }));
    await user.type(screen.getByLabelText(/^What failed/), 'Sole split after three weeks');
    await user.click(screen.getByRole('button', { name: 'Issue PPE' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ premature_failure: true, failure_reason: 'Sole split after three weeks' }), undefined);
  });

  it('opens an edit with the premature mark and what failed already filled', () => {
    const record = issue({ premature_failure: true, failure_reason: 'Torn at the knee' });
    render(<ConfirmProvider><PPEIssueForm open record={record} prefill={null} employee={holder({ records: [record] })} matrix={{}} onOpenChange={() => {}} onSave={async () => {}} /></ConfirmProvider>);
    expect(screen.getByRole('checkbox', { name: /Premature failure/ })).toBeChecked();
    expect(screen.getByLabelText(/^What failed/)).toHaveValue('Torn at the knee');
  });
});
