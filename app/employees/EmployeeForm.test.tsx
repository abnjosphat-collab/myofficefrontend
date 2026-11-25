// The adapted register form: names and IDs canonicalise on blur and on save,
// malformed phone numbers are rejected with a field error naming the number.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { EmployeeForm } from './EmployeeForm';
import type { Employee, EmployeeFormData } from './types';

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ scope: null }) }));

const show = (node: React.ReactElement) => render(<ConfirmProvider>{node}</ConfirmProvider>);

const person = (o: Partial<EmployeeFormData> = {}): EmployeeFormData => ({
  employee_id: 'C1007', first_name: 'John', last_name: 'Doe', id_number: '08-1234567-A-08',
  email: '', phone: '+263 77 1234 567', address: '', date_of_engagement: '',
  designation: 'Fitter', employee_class: '', employment_type: 'NEC', supervisor: '',
  section: '', department: '', grade: '', qualifications: [], drivers_license_class: '',
  offences: [], awards_recognition: [], other_positions: [], previous_employer: '',
  archived: false, ...o,
});

/** A register row for dropdown sources: same person with a database id. */
const staffer = (o: Partial<EmployeeFormData> = {}): Employee => ({ id: 1, ...person(o) });

/** onSave typed like the form prop so the saved payload is typed, not any. */
const saving = () => vi.fn(async (_data: EmployeeFormData, _id?: number | null) => {});

describe('EmployeeForm (validation + autoformat)', () => {
  it('canonicalises names and IDs on save', async () => {
    const user = userEvent.setup();
    const onSave = saving();
    show(<EmployeeForm open employee={null} all={[staffer()]} onOpenChange={() => {}} onSave={onSave} />);
    await user.type(screen.getByRole('textbox', { name: 'Mine number' }), 'C1165');
    await user.type(screen.getByRole('textbox', { name: 'First name' }), 'mercy');
    await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'mazarire');
    await user.type(screen.getByRole('textbox', { name: 'ID number' }), '21 - 275641 v21');
    await user.click(screen.getByRole('combobox', { name: 'Designation' }));
    await user.click(await screen.findByRole('option', { name: 'Fitter' }));
    await user.click(screen.getByRole('combobox', { name: 'Employment type' }));
    await user.click(await screen.findByRole('option', { name: 'NEC' }));
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [data] = onSave.mock.calls[0];
    expect(data.first_name).toBe('Mercy');
    expect(data.last_name).toBe('Mazarire');
    expect(data.id_number).toBe('21-275641-V21');
  });

  it('rejects a malformed phone with a field error and saves nothing', async () => {
    const user = userEvent.setup();
    const onSave = saving();
    show(<EmployeeForm open employee={null} all={[staffer()]} onOpenChange={() => {}} onSave={onSave} />);
    await user.type(screen.getByRole('textbox', { name: 'Mine number' }), 'C1165');
    await user.type(screen.getByRole('textbox', { name: 'First name' }), 'Mercy');
    await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Mazarire');
    await user.type(screen.getByRole('textbox', { name: 'ID number' }), '08-1234567-A-08');
    await user.type(screen.getByRole('textbox', { name: 'Phone' }), 'call office');
    await user.click(screen.getByRole('combobox', { name: 'Designation' }));
    await user.click(await screen.findByRole('option', { name: 'Fitter' }));
    await user.click(screen.getByRole('combobox', { name: 'Employment type' }));
    await user.click(await screen.findByRole('option', { name: 'NEC' }));
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    expect(await screen.findByText(/is not a valid phone number/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
