// components/ui-system/patterns/PeoplePicker.test.tsx — the shared employee
// pickers: one person calls back with the register record, several people pile up
// as chips, and a duplicate name resolves by employee ID, not by label order.
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonPicker, PeoplePicker, lookupName, resolvePersonId, type EmployeeOption, type PickedPerson } from './PeoplePicker';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C001', first_name: 'Ann', last_name: 'Alpha', designation: 'Electrician' },
    { id: 2, employee_id: 'C009', first_name: 'Zed', last_name: 'Zulu', designation: 'Artisan' },
    { id: 3, employee_id: 'C017', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter' },
  ],
}));

describe('lookupName', () => {
  it('prefers the full name, then first + last, then the ID', () => {
    expect(lookupName({ id: 1, full_name: 'Full Name' } as never)).toBe('Full Name');
    expect(lookupName({ id: 1, first_name: 'Ann', last_name: 'Alpha' } as never)).toBe('Ann Alpha');
    expect(lookupName({ id: 1, employee_id: 'C001' } as never)).toBe('C001');
  });
});

describe('PersonPicker', () => {
  it('calls back with the register record for the chosen person', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<PersonPicker name="" onPick={onPick} label="Official" />);
    await user.click(screen.getByRole('combobox', { name: 'Official' }));
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C009' }));
  });

  it('pins a duplicate name to the stored employee ID', () => {
    const options: EmployeeOption[] = [
      { id: '1', label: 'Ann Alpha', description: 'C001', employee: { id: 1, employee_id: 'C001' } },
      { id: '3', label: 'Ann Alpha', description: 'C017', employee: { id: 3, employee_id: 'C017' } },
    ];
    expect(resolvePersonId(options, 'Ann Alpha', 'C017')).toBe('3');
    expect(resolvePersonId(options, 'Ann Alpha')).toBe('1');
    expect(resolvePersonId(options, 'Ann Alpha', '3')).toBe('3');
    expect(resolvePersonId(options, 'Nobody')).toBe('');
  });

  it('shows the stored name as the placeholder', () => {
    render(<PersonPicker name="Zed Zulu" onPick={() => {}} label="Official" />);
    expect(screen.getByRole('combobox', { name: 'Official' })).toHaveTextContent('Zed Zulu');
  });
});

describe('PeoplePicker', () => {
  function Harness({ single = false }: { single?: boolean }) {
    const [value, setValue] = useState<PickedPerson[]>([]);
    return <PeoplePicker label="Employees" value={value} onChange={setValue} single={single} />;
  }

  it('adds chosen people as chips and removes one on request', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Employees' }));
    await user.click(screen.getAllByRole('option', { name: /Ann Alpha/ })[0]);
    await user.click(screen.getByRole('combobox', { name: 'Employees' }));
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Ann Alpha');
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Zed Zulu');
    await user.click(screen.getByRole('button', { name: /Remove Zed Zulu/ }));
    expect(screen.queryByText('Zed Zulu')).not.toBeInTheDocument();
  });

  it('hides the search once one person is chosen in single mode', async () => {
    const user = userEvent.setup();
    render(<Harness single />);
    await user.click(screen.getByRole('combobox', { name: 'Employees' }));
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(screen.queryByRole('combobox', { name: 'Employees' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Zed Zulu');
  });
});
