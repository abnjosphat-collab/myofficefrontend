// PeopleChecklist.test.tsx — the tick-list picker: search narrows, select-all takes
// the filtered rows, ticks add and unticks remove, the picked strip removes too.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeopleChecklist } from './PeopleChecklist';
import type { PickedPerson } from './PeoplePicker';
import { clearRecentPeople } from '@/lib/peopleHistory';

vi.mock('@/hooks/useLookups', () => ({
  useEmployees: () => [
    { id: 1, employee_id: 'C001', first_name: 'Ann', last_name: 'Alpha', designation: 'Electrician', section: 'Mining' },
    { id: 2, employee_id: 'C009', first_name: 'Zed', last_name: 'Zulu', designation: 'Artisan', section: 'Plant' },
    { id: 3, employee_id: 'C017', first_name: 'Ann', last_name: 'Alpine', designation: 'Fitter', section: 'Mining' },
  ],
}));

beforeEach(() => {
  clearRecentPeople();
});

function Harness({ autocomplete = false, keepFocusOnPick = false }: { autocomplete?: boolean; keepFocusOnPick?: boolean }) {
  const [value, setValue] = useState<PickedPerson[]>([]);
  return <PeopleChecklist label="Employees" value={value} onChange={setValue} autocomplete={autocomplete} keepFocusOnPick={keepFocusOnPick} />;
}

describe('PeopleChecklist', () => {
  it('keeps focus for consecutive Tab selections when opted in, but an empty Tab still advances', async () => {
    const user = userEvent.setup();
    render(<Harness autocomplete keepFocusOnPick />);
    const input = screen.getByRole('combobox', { name: 'Employees' });
    await user.type(input, 'Zed');
    await user.tab();
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /Zed Zulu/ })).toBeChecked();
    await user.type(input, 'Alpha');
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: /Ann Alpha/ })).toBeChecked();
    await user.tab();
    expect(input).not.toHaveFocus();
  });

  it('can complete a name with Tab and add the corresponding employee without submitting', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(e => e.preventDefault());
    render(<form onSubmit={submit}><Harness autocomplete /></form>);
    const input = screen.getByRole('combobox', { name: 'Employees' });
    await user.type(input, 'Zed');
    expect(document.querySelector('[data-name-completion]')).toHaveTextContent('Zulu');
    await user.tab();
    expect(screen.getByRole('checkbox', { name: /Zed Zulu/ })).toBeChecked();
    expect(input).toHaveValue('');
    expect(input).not.toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
    await user.click(input);
    await user.type(input, 'Zed');
    expect(screen.queryByRole('option', { name: /Zed Zulu/ })).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: /Remove Zed Zulu/ })).toBeVisible();
  });

  it('completes by mine number with Enter and respects the section filter', async () => {
    const user = userEvent.setup();
    render(<Harness autocomplete />);
    const input = screen.getByRole('combobox', { name: 'Employees' });
    await user.click(screen.getByRole('combobox', { name: 'Section' }));
    await user.click(screen.getByRole('option', { name: 'Plant' }));
    await user.type(input, 'C009');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('checkbox', { name: /Zed Zulu/ })).toBeChecked();
    expect(input).toHaveFocus();
    await user.type(input, 'Ann');
    expect(screen.queryByRole('option', { name: /Ann/ })).not.toBeInTheDocument();
    await user.clear(input);
    expect(screen.queryByRole('checkbox', { name: /Ann Alpha/ })).not.toBeInTheDocument();
  });

  it('ticks add people and unticks remove them', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: /Zed Zulu/ }));
    expect(screen.getByText(/1 picked\./)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Ann Alpha/ }));
    expect(screen.getByText(/2 picked\./)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Zed Zulu/ }));
    expect(screen.getByText(/1 picked\./)).toBeInTheDocument();
  });

  it('search narrows the list and select-all takes only the filtered rows', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('searchbox', { name: 'Search Employees' }), 'Ann');
    expect(screen.queryByRole('checkbox', { name: /Zed Zulu/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText(/2 picked\./)).toBeInTheDocument();
  });

  it('the picked strip removes one person', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: /Zed Zulu/ }));
    await user.click(screen.getByRole('button', { name: /Remove Zed Zulu/ }));
    expect(screen.getByText(/Nobody picked yet\./)).toBeInTheDocument();
  });

  it('section filter narrows the list', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'Section' }));
    await user.click(screen.getByRole('option', { name: 'Plant' }));
    expect(screen.queryByRole('checkbox', { name: /Ann Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Zed Zulu/ })).toBeInTheDocument();
  });

  it('says so when nobody matches', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('searchbox', { name: 'Search Employees' }), 'Nobodyhere');
    expect(screen.getByText('No employee matches.')).toBeInTheDocument();
  });
});
