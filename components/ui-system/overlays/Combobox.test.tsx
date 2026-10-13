import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from './Combobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'eng', label: 'Engineering' },
  { value: 'ops', label: 'Operations' },
];

function Harness({ allowCustomValue = false, onValueChange }: { allowCustomValue?: boolean; onValueChange: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Combobox aria-label="Department" value={value} allowCustomValue={allowCustomValue}
      placeholder="Search department…" searchPlaceholder="Search department…"
      options={OPTIONS}
      onValueChange={next => { setValue(next); onValueChange(next); }} />
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Department' }));
  await screen.findByPlaceholderText('Search department…');
}

function searchBox() {
  return screen.getByPlaceholderText('Search department…');
}

describe('Combobox', () => {
  it('selects an option by click and shows its label', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await open(user);
    await user.click(screen.getByRole('option', { name: 'Operations' }));
    expect(onValueChange).toHaveBeenCalledWith('ops');
    await waitFor(() => expect(screen.queryByPlaceholderText('Search department…')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveTextContent('Operations');
  });

  it('filters options as you type', async () => {
    const user = userEvent.setup();
    render(<Harness onValueChange={() => {}} />);
    await open(user);
    await user.type(searchBox(), 'eng');
    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Operations' })).not.toBeInTheDocument();
  });

  it('without free text, an unmatched query shows the empty message and no commit row', async () => {
    const user = userEvent.setup();
    render(<Harness onValueChange={() => {}} />);
    await open(user);
    await user.type(searchBox(), 'Zebra');
    expect(screen.getByText('No matches.')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Use / })).not.toBeInTheDocument();
  });

  it('with free text, an unmatched query offers a Use row that commits the typed text', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'Zebra');
    const list = screen.getByRole('listbox');
    expect(within(list).queryByRole('option', { name: 'Engineering' })).not.toBeInTheDocument();
    expect(within(list).queryByText('No matches.')).not.toBeInTheDocument();
    await user.click(within(list).getByRole('option', { name: 'Use “Zebra”' }));
    expect(onValueChange).toHaveBeenCalledWith('Zebra');
    await waitFor(() => expect(screen.queryByPlaceholderText('Search department…')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveTextContent('Zebra');
  });

  it('with free text, Enter with only the Use row showing commits the typed text', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'Zebra');
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('Zebra');
  });

  it('with free text, Enter with matches showing still picks the highlighted option', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'engi');
    expect(screen.getByRole('option', { name: 'Use “engi”' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('eng');
  });

  it('with free text, Tab commits the typed text (Tab-to-complete)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'Zebra');
    await user.tab();
    expect(onValueChange).toHaveBeenCalledWith('Zebra');
    await waitFor(() => expect(screen.queryByPlaceholderText('Search department…')).not.toBeInTheDocument());
  });

  it('with free text, an exact match offers no Use row (Enter picks the option)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'Engineering');
    expect(screen.queryByRole('option', { name: /Use / })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('eng');
  });

  it('with free text, a value outside the options still shows on the trigger', () => {
    const onValueChange = vi.fn();
    render(
      <Combobox aria-label="Department" value="Zebra" allowCustomValue options={OPTIONS} onValueChange={onValueChange} />,
    );
    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveTextContent('Zebra');
  });
});
