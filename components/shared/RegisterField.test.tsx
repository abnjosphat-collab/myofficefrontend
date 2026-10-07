import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterField, emptyRef, type RegisterOption, type RegisterRef, type RegisterLoad } from './RegisterField';

const OPTIONS: RegisterOption[] = [
  { id: 1, label: 'Compressor 1 (example)', description: 'EX-001' },
  { id: 2, label: 'Compressor 2 (example)', description: 'EX-002', disabled: true, note: 'On annual leave, 5 to 12 Oct (approved)' },
  { id: 3, label: 'Pump A (example)' },
];
let latest: RegisterRef = emptyRef;
function Host({ options = OPTIONS, load, onRetry }: { options?: RegisterOption[]; load?: RegisterLoad; onRetry?: () => void }) {
  const [v, setV] = useState<RegisterRef>(emptyRef);
  const change = (next: RegisterRef) => { latest = next; setV(next); };
  return <RegisterField noun="machine" value={v} onChange={change} options={options} load={load} onRetry={onRetry} />;
}
beforeEach(() => { localStorage.clear(); latest = emptyRef; });

describe('RegisterField', () => {
  it('Tab on the ghost text fills the register entry and stores its id', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('combobox');
    await user.click(input); await user.keyboard('pu'); await user.tab();
    expect(input).toHaveValue('Pump A (example)');
    expect(latest).toEqual({ text: 'Pump A (example)', id: 3 });
    expect(screen.getByText('From register')).toBeInTheDocument();
  });

  it('keeps free text with no id and says so', async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.click(screen.getByRole('combobox')); await user.keyboard('Old boiler');
    expect(latest).toEqual({ text: 'Old boiler', id: null });
    expect(screen.getByText(/Free text: not on the machine register/)).toBeInTheDocument();
  });

  it('editing a picked value drops its id', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('combobox');
    await user.click(input); await user.keyboard('pu'); await user.tab();
    await user.keyboard('x');
    expect(latest.id).toBeNull();
  });

  it('lists a disabled option with its reason and cannot pick it by Enter', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole('combobox');
    await user.click(input); await user.keyboard('compressor 2');
    const option = screen.getByRole('option', { name: /Compressor 2/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/On annual leave/)).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(latest.id).toBeNull();
  });

  it('the ghost skips a disabled option and proposes the first available match', async () => {
    const user = userEvent.setup();
    render(<Host options={[OPTIONS[1], OPTIONS[0]]} />);
    const input = screen.getByRole('combobox');
    await user.click(input); await user.keyboard('comp'); await user.tab();
    expect(latest).toEqual({ text: 'Compressor 1 (example)', id: 1 });
  });

  it('a register that failed to load says so, offers Retry, and still accepts typing', async () => {
    const user = userEvent.setup(); const retry = vi.fn();
    render(<Host options={[]} load="error" onRetry={retry} />);
    expect(screen.getByText(/register could not be loaded/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
    await user.click(screen.getByRole('combobox')); await user.keyboard('Typed anyway');
    expect(latest.text).toBe('Typed anyway');
  });

  it('does not claim the text is free text while the register is still loading', async () => {
    const user = userEvent.setup();
    render(<Host options={[]} load="loading" />);
    await user.click(screen.getByRole('combobox')); await user.keyboard('abc');
    expect(screen.getByText(/Not checked against the machine register yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Free text:/)).not.toBeInTheDocument();
  });
});
