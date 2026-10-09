import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermitsField } from './PermitsField';
import type { WorkOrder } from './types';

function Harness({ initial = {}, onChange }: { initial?: NonNullable<WorkOrder['permits']>; onChange?: (v: NonNullable<WorkOrder['permits']>) => void }) {
  const [v, setV] = useState(initial);
  return <PermitsField value={v} onChange={n => { setV(n); onChange?.(n); }} />;
}

describe('PermitsField', () => {
  it('ticking a permit asks for its reference and says the job cannot start without it', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByLabelText('Reference')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hot work' }));
    expect(screen.getByText('Reference needed before the job can start.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Reference/), 'HW-9');
    expect(screen.queryByText('Reference needed before the job can start.')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ hot_work: { required: true, reference: 'HW-9' } });
  });

  it('unticking removes the permit completely', async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ hot_work: { required: true, reference: 'HW-9' } }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hot work' }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('"Other permit" asks what permit it is', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other permit' }));
    await userEvent.type(screen.getByLabelText('What permit'), 'Crane lift plan');
    expect(onChange).toHaveBeenLastCalledWith({ other: { required: true, reference: '', label: 'Crane lift plan' } });
  });
});
