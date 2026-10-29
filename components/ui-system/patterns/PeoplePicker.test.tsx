// components/ui-system/patterns/PeoplePicker.test.tsx — the shared employee
// pickers: one person calls back with the register record, several people pile up
// as chips, a duplicate name resolves by employee ID, and every shape is typed into
// the box: the rest of the name is written in after the caret and Tab takes it.
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonNameInput, PersonPicker, PeoplePicker, lookupName, resolvePersonId, type EmployeeOption, type PickedPerson } from './PeoplePicker';
import { clearRecentPeople, recordRecentPerson } from '@/lib/peopleHistory';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C001', first_name: 'Ann', last_name: 'Alpha', designation: 'Electrician' },
    { id: 2, employee_id: 'C009', first_name: 'Zed', last_name: 'Zulu', designation: 'Artisan' },
    { id: 3, employee_id: 'C017', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter' },
    { id: 4, employee_id: '.............', first_name: 'Dot', last_name: 'ty', designation: 'Driver' },
  ],
}));

beforeEach(() => {
  clearRecentPeople();
});

const completion = () => document.querySelector('[data-name-completion]');

describe('lookupName', () => {
  it('prefers the full name, then first + last, then the ID', () => {
    expect(lookupName({ id: 1, full_name: 'Full Name' } as never)).toBe('Full Name');
    expect(lookupName({ id: 1, first_name: 'Ann', last_name: 'Alpha' } as never)).toBe('Ann Alpha');
    expect(lookupName({ id: 1, employee_id: 'C001' } as never)).toBe('C001');
    expect(lookupName({ id: 1, employee_id: '...' } as never)).toBe('No mine number');
  });
});

describe('PersonPicker', () => {
  it('writes the rest of the name after the caret, and Tab picks that person and moves on', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<><PersonPicker name="" onPick={onPick} label="Official" /><input aria-label="Next field" /></>);
    await user.type(screen.getByRole('combobox', { name: 'Official' }), 'ze');
    expect(completion()).toHaveTextContent('d Zulu');
    await user.tab();
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C009' }));
    expect(screen.getByRole('textbox', { name: 'Next field' })).toHaveFocus();
  });

  it('finds a person by surname or mine number and names them before Tab takes them', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<PersonPicker name="" onPick={onPick} label="Official" />);
    const box = screen.getByRole('combobox', { name: 'Official' });
    await user.type(box, 'zulu');
    expect(completion()).toHaveTextContent('Zed Zulu');
    await user.clear(box);
    await user.type(box, 'c00');
    const rows = screen.getAllByRole('option').map(o => o.textContent ?? '');
    expect(rows.some(r => /Ann Alpha/.test(r)) && rows.some(r => /Zed Zulu/.test(r))).toBe(true);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('calls back with the register record for a clicked suggestion', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<PersonPicker name="" onPick={onPick} label="Official" />);
    await user.type(screen.getByRole('combobox', { name: 'Official' }), 'z');
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C009' }));
  });

  it('puts back text that names nobody, and picks nobody when emptied', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<><PersonPicker name="Zed Zulu" onPick={onPick} label="Official" /><input aria-label="Next field" /></>);
    const box = screen.getByRole('combobox', { name: 'Official' });
    expect(box).toHaveValue('Zed Zulu');
    await user.clear(box);
    await user.type(box, 'nobody here');
    expect(screen.getByText('No employee matches.')).toBeInTheDocument();
    await user.click(screen.getByRole('textbox', { name: 'Next field' }));
    expect(box).toHaveValue('Zed Zulu');
    expect(onPick).not.toHaveBeenCalled();
    await user.clear(box);
    await user.click(screen.getByRole('textbox', { name: 'Next field' }));
    expect(onPick).toHaveBeenCalledWith(null);
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

  it('tells two people with the same name apart by designation', async () => {
    const user = userEvent.setup();
    render(<PersonPicker name="" onPick={() => {}} label="Official" />);
    await user.type(screen.getByRole('combobox', { name: 'Official' }), 'ann');
    const rows = screen.getAllByRole('option', { name: /Ann Alpha/ }).map(o => o.textContent ?? '');
    expect(rows).toHaveLength(2);
    expect(rows.join(' ')).toMatch(/Electrician/);
    expect(rows.join(' ')).toMatch(/Fitter/);
  });

  it('reads a dot-only register number as missing, not as dots', async () => {
    const user = userEvent.setup();
    render(<PersonPicker name="" onPick={() => {}} label="Official" />);
    await user.type(screen.getByRole('combobox', { name: 'Official' }), 'dot');
    const row = screen.getByRole('option', { name: /Dot ty/ });
    expect(row).toHaveTextContent('Driver');
    expect(row).toHaveTextContent('No mine number');
    expect(row.textContent).not.toContain('...');
  });

  it('remembers a pick and offers recent people first in an empty box, once each', async () => {
    const user = userEvent.setup();
    render(<PersonPicker name="" onPick={() => {}} label="Official" />);
    await user.type(screen.getByRole('combobox', { name: 'Official' }), 'zed');
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(window.localStorage.getItem('oz_recentPeople')).toContain('"2"');
    recordRecentPerson('1');
    render(<PersonPicker name="" onPick={() => {}} label="Second" />);
    await user.click(screen.getByRole('combobox', { name: 'Second' }));
    const rows = screen.getAllByRole('option').map(o => o.textContent ?? '');
    expect(rows[0]).toMatch(/Ann Alpha/);
    expect(rows[1]).toMatch(/Zed Zulu/);
    expect(rows.filter(r => /Zed Zulu/.test(r)).length).toBe(1);
  });

  it('drops recent people who left the register', async () => {
    const user = userEvent.setup();
    recordRecentPerson('999');
    render(<PersonPicker name="" onPick={() => {}} label="Official" />);
    await user.click(screen.getByRole('combobox', { name: 'Official' }));
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});

describe('PeoplePicker', () => {
  function Harness({ single = false }: { single?: boolean }) {
    const [value, setValue] = useState<PickedPerson[]>([]);
    return <PeoplePicker label="Employees" value={value} onChange={setValue} single={single} />;
  }

  it('adds people as chips by typing, and removes one on request', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Employees' });
    await user.type(box, 'ann');
    await user.keyboard('{Enter}');
    expect(box).toHaveValue('');
    await user.type(box, 'zed');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Ann Alpha');
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Zed Zulu');
    await user.click(screen.getByRole('button', { name: /Remove Zed Zulu/ }));
    expect(screen.queryByText('Zed Zulu')).not.toBeInTheDocument();
  });

  it('hides the box once one person is chosen in single mode', async () => {
    const user = userEvent.setup();
    render(<Harness single />);
    await user.type(screen.getByRole('combobox', { name: 'Employees' }), 'z');
    await user.click(screen.getByRole('option', { name: /Zed Zulu/ }));
    expect(screen.queryByRole('combobox', { name: 'Employees' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Employees' })).toHaveTextContent('Zed Zulu');
  });
});

describe('PersonNameInput', () => {
  function Harness({ multiple = false, onPick }: { multiple?: boolean; onPick?: (e: unknown) => void }) {
    const [value, setValue] = useState('');
    return <><PersonNameInput aria-label="Inspectors" value={value} onChange={setValue} multiple={multiple} onPick={onPick} /><input aria-label="Next field" /></>;
  }

  it('keeps a name that is not on the register', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'Inspectors' });
    await user.type(box, 'Visitor Jones');
    await user.tab();
    expect(box).toHaveValue('Visitor Jones');
  });

  it('completes with Tab and hands over the register record', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const box = screen.getByRole('combobox', { name: 'Inspectors' });
    await user.type(box, 'zed z');
    await user.tab();
    expect(box).toHaveValue('Zed Zulu');
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ employee_id: 'C009' }));
  });

  it('completes the last name of a comma list', async () => {
    const user = userEvent.setup();
    render(<Harness multiple />);
    const box = screen.getByRole('combobox', { name: 'Inspectors' });
    await user.type(box, 'ze');
    await user.keyboard('{Enter}');
    await user.type(box, 'dot');
    await user.keyboard('{Enter}');
    expect(box).toHaveValue('Zed Zulu, Dot ty, ');
  });
});
