import { describe, it, expect, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { Field } from '@/components/ui-system';
import { SuggestField } from './SuggestField';

function Harness({ error, required = false }: { error?: string; required?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <Field label="Location" required={required} description="Where it happened" error={error}>
      <SuggestField historyKey="h3-test" placeholder="Bay" value={value} onChange={setValue} />
    </Field>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('SuggestField', () => {
  it('forwards the Field error state to the input (invalid + describedby + red border)', () => {
    render(<Harness error="Enter the location." />);
    const input = screen.getByRole('combobox', { name: 'Location' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const described = describedBy.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
    expect(described).toContain('Enter the location.');
    // The red border follows from aria-invalid via controlClasses'
    // aria-[invalid=true]:border-danger rule — no separate class to assert.
  });

  it('exposes the Field required state to assistive technology', () => {
    render(<Harness required />);
    expect(screen.getByRole('combobox', { name: 'Location' })).toHaveAttribute('aria-required', 'true');
  });

  it('leaves the input unmarked when the Field has no error', () => {
    render(<Harness />);
    expect(screen.getByRole('combobox', { name: 'Location' })).not.toHaveAttribute('aria-invalid');
  });
});
