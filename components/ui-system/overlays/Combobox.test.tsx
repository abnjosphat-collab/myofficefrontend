import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from './Combobox';
import { ConfirmProvider } from './Confirm';
import { FormDialog } from '../patterns/FormDialog';
import { Field } from '../primitives/Field';
import { getInputSuggestions, recordInput } from '@/lib/inputHistory';

const OPTIONS: ComboboxOption[] = [
  { value: 'eng', label: 'Engineering' },
  { value: 'ops', label: 'Operations' },
];

function Harness({ allowCustomValue = false, historyKey, onValueChange }: { allowCustomValue?: boolean; historyKey?: string; onValueChange: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Combobox aria-label="Department" value={value} allowCustomValue={allowCustomValue} historyKey={historyKey}
      placeholder="Search department…" searchPlaceholder="Search department…"
      options={OPTIONS}
      onValueChange={next => { setValue(next); onValueChange(next); }} />
  );
}

beforeEach(() => { window.localStorage.clear(); });

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Department' }));
  await screen.findByPlaceholderText('Search department…');
}

function searchBox() {
  return screen.getByPlaceholderText('Search department…');
}

function DialogHarness({ onOpenChange }: { onOpenChange: (next: boolean) => void }) {
  const [value, setValue] = useState('');
  return (
    <ConfirmProvider>
      <FormDialog open onOpenChange={onOpenChange} title="Add" submitLabel="Save" onSubmit={async () => {}}>
        <Field label="Department">
          <Combobox aria-label="Department" value={value} options={OPTIONS} searchPlaceholder="Search department…" onValueChange={setValue} />
        </Field>
      </FormDialog>
    </ConfirmProvider>
  );
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

  it('Tab takes the highlighted suggestion, not the raw text', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness allowCustomValue onValueChange={onValueChange} />);
    await open(user);
    await user.type(searchBox(), 'engi');
    await user.tab();
    expect(onValueChange).toHaveBeenCalledWith('eng');
    await waitFor(() => expect(screen.queryByPlaceholderText('Search department…')).not.toBeInTheDocument());
  });

  it('Tab with nothing typed moves on without committing', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await open(user);
    await user.tab();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('with historyKey, previously committed values are offered back first', async () => {
    const user = userEvent.setup();
    recordInput('y-test', 'North Shaft');
    recordInput('y-test', 'Engineering');
    render(<Harness allowCustomValue historyKey="y-test" onValueChange={() => {}} />);
    await open(user);
    const list = screen.getByRole('listbox');
    const names = within(list).getAllByRole('option').map(option => option.textContent);
    expect(names[0]).toContain('North Shaft');
    // Already an option: offered once, not doubled.
    expect(names.filter(name => name?.includes('Engineering'))).toHaveLength(1);
  });

  it('with historyKey, committing a value remembers it for next time', async () => {
    const user = userEvent.setup();
    render(<Harness allowCustomValue historyKey="y-test" onValueChange={() => {}} />);
    await open(user);
    await user.type(searchBox(), 'Zebra');
    await user.tab();
    expect(getInputSuggestions('y-test')).toEqual(['Zebra']);
  });

  it('search typing alone does not mark the dialog dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    await open(user);
    await user.type(searchBox(), 'eng');
    await user.keyboard('{Escape}'); // closes the list, not the dialog
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('a committed pick marks the dialog dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DialogHarness onOpenChange={onOpenChange} />);
    await open(user);
    await user.click(screen.getByRole('option', { name: 'Operations' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows recentOptions first under a Recent heading, without repeating them', async () => {
    const user = userEvent.setup();
    render(
      <Combobox aria-label="Department" value="" onValueChange={() => {}} options={OPTIONS}
        recentOptions={[{ value: 'ops', label: 'Operations' }]} searchPlaceholder="Search department…" />,
    );
    await open(user);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const rows = screen.getAllByRole('option').map(o => o.textContent ?? '');
    expect(rows[0]).toMatch(/Operations/);
    expect(rows.filter(r => /Operations/.test(r)).length).toBe(1);
  });

  it('shows no Recent heading without recentOptions', async () => {
    const user = userEvent.setup();
    render(
      <Combobox aria-label="Department" value="" onValueChange={() => {}} options={OPTIONS}
        searchPlaceholder="Search department…" />,
    );
    await open(user);
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
  });
});
