import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeePicker, type PickerChoice } from './ToolsEmployeePicker';

vi.mock('./ToolsIcon', () => ({ ToolsIcon: () => <span aria-hidden="true" /> }));

const choices: PickerChoice[] = [
  { label: 'Alex Moyo · C1', detail: 'Fitter Class 1 · Engineering' },
  { label: 'Beth Dube · C2', detail: 'Electrician Class 2 · Engineering' },
  { label: 'Carl Nkomo · C3', detail: 'Boilermaker Assistant · Engineering' },
];
function Harness({ onSelect = () => {}, items = choices }: { onSelect?: (value: string) => void; items?: PickerChoice[] }) {
  const [value, setValue] = useState('');
  return <EmployeePicker label="Employee" choices={items} value={value} onChange={setValue} onSelect={onSelect} emptyMessage="Nobody is eligible." />;
}

describe('EmployeePicker', () => {
  it('lists every eligible person up front with their job title, and says how many there are', () => {
    render(<Harness />);
    const list = screen.getByRole('listbox', { name: 'Employee suggestions' });
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(within(list).getByText(/Electrician Class 2/)).toBeVisible();
    expect(screen.getByText('3 eligible')).toBeVisible();
  });

  it('narrows as you type, by name, number or job title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', { name: 'Employee' }), 'boiler');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Carl Nkomo');
  });

  it('takes the top match with Tab or Enter and keeps the whole list in view with that person ticked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole('combobox', { name: 'Employee' });
    await user.type(input, 'be');
    await user.keyboard('{Tab}');
    expect(input).toHaveValue('Beth Dube · C2');
    expect(onSelect).toHaveBeenCalledWith('Beth Dube · C2');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('moves with the arrow keys and picks with a click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Employee' });
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input).toHaveValue('Carl Nkomo · C3');
    await user.click(within(screen.getByRole('listbox')).getByText('Alex Moyo'));
    expect(input).toHaveValue('Alex Moyo · C1');
  });

  it('explains why the list is empty, and when a search matches no one', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness items={[]} />);
    expect(screen.getByText('Nobody is eligible.')).toBeVisible();
    unmount();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', { name: 'Employee' }), 'zzz');
    expect(screen.getByText(/No eligible person matches/)).toBeVisible();
  });
});
