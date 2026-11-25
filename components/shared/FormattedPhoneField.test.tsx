import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormattedPhoneField } from './FormattedPhoneField';

function Harness({ initial = '', onCommit = vi.fn() }: { initial?: string; onCommit?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <FormattedPhoneField
      label="Contact number"
      value={value}
      onChange={v => {
        setValue(v);
        onCommit(v);
      }}
      placeholder="Phone number"
    />
  );
}

describe('FormattedPhoneField', () => {
  it('formats while typing and commits canonical on blur', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByLabelText('Contact number');
    await user.type(input, '0778973142');
    expect(input).toHaveValue('+263 77 8973 142');
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith('+263 77 8973 142');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses digits past the shape while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Contact number');
    await user.type(input, '07789731425');
    expect(input).toHaveValue('+263 77 8973 142');
    await user.tab();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the verdict error for malformed input on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Contact number');
    await user.type(input, 'call office');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('call office');
  });

  it('prefers an explicit error prop over the local verdict', () => {
    render(
      <FormattedPhoneField
        label="Contact number"
        value=""
        onChange={() => {}}
        error="Server says no."
      />,
    );
    expect(screen.getByText('Server says no.')).not.toBeNull();
  });
});
