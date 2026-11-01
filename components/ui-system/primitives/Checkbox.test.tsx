import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('toggles exactly once inside a consumer-owned label', async () => {
    const changed = vi.fn();
    render(<label><Checkbox onChange={changed} />Issue the complete set</label>);
    await userEvent.click(screen.getByText('Issue the complete set'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('keeps native keyboard, label and uncontrolled behaviour', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Night shift" />);
    const input = screen.getByRole('checkbox', { name: 'Night shift' });
    await user.click(screen.getByText('Night shift'));
    expect(input).toBeChecked();
    input.focus();
    await user.keyboard(' ');
    expect(input).not.toBeChecked();
  });

  it('preserves controlled state, disabled state, indeterminate and the native ref', async () => {
    const ref = createRef<HTMLInputElement>();
    const view = render(<Checkbox ref={ref} aria-label="Select all" checked={false} indeterminate disabled />);
    const input = screen.getByRole('checkbox');
    expect(ref.current).toBe(input);
    expect(ref.current?.indeterminate).toBe(true);
    await userEvent.click(input);
    expect(input).not.toBeChecked();
    view.rerender(<Checkbox ref={ref} aria-label="Select all" checked onChange={() => {}} />);
    expect(input).toBeChecked();
    expect(ref.current?.indeterminate).toBe(false);
  });
});
