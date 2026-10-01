import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimatedSelect } from './AnimatedSelect';

const options = [
  { value: 'all', label: 'All departments' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Mine Technical Services', label: 'Mine Technical Services' },
];
const shortLabels = { all: 'ALL', Engineering: 'ENG', 'Mine Technical Services': 'MTS' };

describe('AnimatedSelect short labels', () => {
  it('shows the abbreviation on the trigger and full names in the menu', async () => {
    const user = userEvent.setup();
    render(<AnimatedSelect ariaLabel="Department" value="Mine Technical Services" options={options} onChange={() => {}} shortLabels={shortLabels} />);
    const trigger = screen.getByRole('button', { name: 'Department' });
    expect(trigger).toHaveTextContent('MTS');
    expect(trigger).toHaveAttribute('title', 'Mine Technical Services');
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'Mine Technical Services' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument();
  });

  it('falls back to the full label without short labels', () => {
    render(<AnimatedSelect ariaLabel="Department" value="Engineering" options={options} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Department' })).toHaveTextContent('Engineering');
  });

  it('still reports the option value on choose', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AnimatedSelect ariaLabel="Department" value="all" options={options} onChange={onChange} shortLabels={shortLabels} />);
    await user.click(screen.getByRole('button', { name: 'Department' }));
    await user.click(screen.getByRole('option', { name: 'Engineering' }));
    expect(onChange).toHaveBeenCalledWith('Engineering');
  });
});
