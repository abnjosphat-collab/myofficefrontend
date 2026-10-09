import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterField } from './RegisterField';
import type { RegisterOption } from './registers';

const options: RegisterOption[] = [
  { value: 'Farai Ncube', description: 'Foreman · Fitters' },
  { value: 'Tendai Banda', blocked: 'On annual leave, 5 Aug to 14 Aug' },
  { value: 'Tendai Moyo', description: 'Artisan' },
];

function Harness({ opts = options, onPick, ...rest }: { opts?: RegisterOption[]; onPick?: (o: RegisterOption) => void } & Partial<React.ComponentProps<typeof RegisterField>>) {
  const [value, setValue] = useState('');
  return <><RegisterField aria-label="Person" value={value} onChange={setValue} onPick={onPick} options={opts} registerName="employees register" {...rest} /><button>next</button></>;
}

describe('RegisterField', () => {
  it('Tab fills the highlighted match and stays on the field; a second Tab moves on', async () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'far');
    await userEvent.tab();
    expect(input).toHaveValue('Farai Ncube');
    expect(input).toHaveFocus();
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ value: 'Farai Ncube' }));
    expect(screen.getByText('From the employees register.')).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'next' })).toHaveFocus();
  });

  it('arrow keys move the highlight and Enter picks it', async () => {
    render(<Harness opts={[{ value: 'Tendai Moyo' }, { value: 'Tendai Zulu' }]} />);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'tend');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('Tendai Zulu');
  });

  it('free text is kept and says it is not on the register', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'Visiting Contractor');
    await userEvent.tab(); // nothing matches: Tab just moves on
    expect(screen.getByRole('button', { name: 'next' })).toHaveFocus();
    expect(input).toHaveValue('Visiting Contractor');
    expect(screen.getByText('Not on the employees register. Kept as typed.')).toBeInTheDocument();
  });

  it('shows a person on leave greyed with the reason, and cannot pick them by click, Enter or Tab', async () => {
    render(<Harness opts={[{ value: 'Tendai Banda', blocked: 'On annual leave, 5 Aug to 14 Aug' }]} />);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'tendai b');
    const row = screen.getByRole('option', { name: /Tendai Banda/ });
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('On annual leave, 5 Aug to 14 Aug')).toBeInTheDocument();
    await userEvent.click(row);
    await userEvent.keyboard('{Enter}');
    expect(input).toHaveValue('tendai b');
    await userEvent.tab();
    expect(input).toHaveValue('tendai b'); // Tab found nothing it may fill, so it moved on
  });

  it('Tab skips a blocked highlighted match for the next one that can be chosen', async () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'tendai');
    await userEvent.tab();
    expect(input).toHaveValue('Tendai Moyo');
  });

  it('a typed name that is exactly a person on leave is flagged as unavailable', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Person' }), 'Tendai Banda');
    expect(screen.getByText('On annual leave, 5 Aug to 14 Aug. Choose someone else.')).toBeInTheDocument();
  });

  it('Escape closes the list without letting the dialog behind it close', async () => {
    const onKey = vi.fn();
    render(<div onKeyDown={onKey}><Harness /></div>);
    const input = screen.getByRole('combobox', { name: 'Person' });
    await userEvent.type(input, 'far');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onKey.mock.calls.some(([e]) => e.key === 'Escape')).toBe(false);
  });

  it('says plainly when the register could not be read, instead of looking as if nothing matched', async () => {
    render(<Harness opts={[]} loadError="boom" />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Person' }), 'x');
    expect(screen.getByText(/could not be read, so typed text is kept as typed/)).toBeInTheDocument();
  });

  it('shows loading and extra notes', () => {
    render(<Harness loading note="Leave could not be checked." />);
    expect(screen.getByText(/Loading the employees register/)).toBeInTheDocument();
    expect(screen.getByText(/Leave could not be checked/)).toBeInTheDocument();
  });
});
