import { describe, it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PredictiveInput, type PredictiveInputProps } from './PredictiveInput';

// PredictiveInput is a controlled component (value/onChange props) — this wrapper
// gives each test a real, typeable input instead of a frozen `value`.
function Controlled(props: Omit<PredictiveInputProps, 'value' | 'onChange'> & { initialValue?: string }) {
  const [value, setValue] = useState(props.initialValue ?? '');
  return <PredictiveInput {...props} value={value} onChange={setValue} />;
}

beforeEach(() => {
  localStorage.clear();
});

describe('PredictiveInput', () => {
  it('associates its visible caption with the control via a real label (single-line)', () => {
    render(<Controlled historyKey="k1" label="Location" />);
    expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
  });

  it('associates its visible caption with the control via a real label (multiline)', () => {
    render(<Controlled historyKey="k2" label="Notes" multiline />);
    expect(screen.getByRole('combobox', { name: 'Notes' })).toBeInTheDocument();
  });

  it('falls back to an aria-label from the placeholder when there is no visible caption', () => {
    render(<Controlled historyKey="k3" placeholder="Search parts" />);
    expect(screen.getByRole('combobox', { name: 'Search parts' })).toBeInTheDocument();
  });

  it('respects an externally supplied id instead of generating one', () => {
    render(<Controlled historyKey="k4" label="Location" id="custom-id" />);
    expect(screen.getByRole('combobox', { name: 'Location' })).toHaveAttribute('id', 'custom-id');
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    render(<Controlled historyKey="k5" label="Location" />);
    const input = screen.getByRole('combobox', { name: 'Location' });
    await user.type(input, 'Bay 3');
    expect(input).toHaveValue('Bay 3');
  });

  it('shows a seeded hint in the dropdown once the field is focused', async () => {
    const user = userEvent.setup();
    render(<Controlled historyKey="k6" label="Location" hints={['Bay 1', 'Bay 2']} />);
    await user.click(screen.getByRole('combobox', { name: 'Location' }));
    expect(await screen.findByRole('option', { name: 'Bay 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bay 2' })).toBeInTheDocument();
  });

  it('Tab accepts the inline ghost-text suggestion', async () => {
    const user = userEvent.setup();
    render(<Controlled historyKey="k7" label="Location" hints={['Bay 12']} />);
    const input = screen.getByRole('combobox', { name: 'Location' });
    await user.type(input, 'Bay');
    await waitFor(() => expect(screen.getByText('Tab')).toBeInTheDocument());
    await user.tab();
    expect(input).toHaveValue('Bay 12');
  });

  it('clicking a suggestion commits it and saves it to history', async () => {
    const user = userEvent.setup();
    render(<Controlled historyKey="k8" label="Location" hints={['Bay 12']} />);
    await user.click(screen.getByRole('combobox', { name: 'Location' }));
    const option = await screen.findByRole('option', { name: 'Bay 12' });
    await user.click(option);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('prd_hist_k8') ?? '[]');
      expect(stored).toEqual([expect.objectContaining({ value: 'Bay 12', count: 1 })]);
    });
  });

  it('blurring after typing a value commits it to history', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Controlled historyKey="k9" label="Location" />
        <button type="button">elsewhere</button>
      </>
    );
    const input = screen.getByRole('combobox', { name: 'Location' });
    await user.type(input, 'Workshop A');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('prd_hist_k9') ?? '[]');
      expect(stored).toEqual([expect.objectContaining({ value: 'Workshop A', count: 1 })]);
    }, { timeout: 1000 });
  });

  it('a value used repeatedly outranks a more recent one-off value in suggestions', async () => {
    const now = Date.now();
    localStorage.setItem('prd_hist_k10', JSON.stringify([
      { value: 'Frequent Spot', count: 5, lastUsed: now - 10_000 },
      { value: 'Recent Spot', count: 1, lastUsed: now },
    ]));
    const user = userEvent.setup();
    render(<Controlled historyKey="k10" label="Location" />);
    await user.click(screen.getByRole('combobox', { name: 'Location' }));
    const options = await screen.findAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual(['Frequent Spot', 'Recent Spot']);
  });

  it('migrates a legacy plain string[] history to the counted shape on load', async () => {
    localStorage.setItem('prd_hist_k11', JSON.stringify(['Old Value A', 'Old Value B']));
    const user = userEvent.setup();
    render(<Controlled historyKey="k11" label="Location" />);
    await user.click(screen.getByRole('combobox', { name: 'Location' }));
    expect(await screen.findByRole('option', { name: 'Old Value A' })).toBeInTheDocument();
  });

  it('does not show a listbox when disabled', async () => {
    render(<Controlled historyKey="k12" label="Location" hints={['Bay 1']} disabled />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders the error message when supplied', () => {
    render(<Controlled historyKey="k13" label="Location" error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
});
