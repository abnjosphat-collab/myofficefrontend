import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OptionChecklist } from './OptionChecklist';

const OPTIONS = [
  { value: 'shoes', label: 'Safety Shoes', description: 'Bata Industrial' },
  { value: 'helmet', label: 'Safety Helmet' },
  { value: 'overalls', label: 'Protective Overall', description: 'Acid-proof' },
];

function Harness({ initial = [] as string[] }: { initial?: string[] }) {
  const [value, setValue] = useState(initial);
  return <OptionChecklist label="PPE types" options={OPTIONS} value={value} onChange={setValue} emptyText="No type matches." />;
}

describe('OptionChecklist', () => {
  it('toggles values and reports the count', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText(/Nobody picked yet\./)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Safety Shoes/ }));
    expect(screen.getByText(/1 picked\./)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Safety Helmet/ }));
    expect(screen.getByText(/2 picked\./)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Safety Shoes/ }));
    expect(screen.getByText(/1 picked\./)).toBeInTheDocument();
  });

  it('searches label, description and value', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('searchbox', { name: 'Search PPE types' }), 'acid');
    expect(screen.queryByRole('checkbox', { name: /Safety Shoes/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Protective Overall/ })).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Search PPE types' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search PPE types' }), 'zzz');
    expect(screen.getByText('No type matches.')).toBeInTheDocument();
  });

  it('selects all filtered and removes via chips', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('searchbox', { name: 'Search PPE types' }), 'safety');
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));
    expect(screen.getByText(/2 picked\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Safety Shoes' }));
    expect(screen.getByText(/1 picked\./)).toBeInTheDocument();
  });

  it('shows the raw value for a pick outside the options', () => {
    render(<Harness initial={['boots']} />);
    expect(screen.getByRole('button', { name: 'Remove boots' })).toBeInTheDocument();
  });
});
