// app/shifts/DutyStrip.test.tsx — the roster names this week's duty officials with
// scope, dates and contact actions; empty and failed loads stay honest.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DutyStrip } from './DutyStrip';
import type { DutyEntry } from '@/app/standby/types';

const entries: DutyEntry[] = [
  { id: 1, employee_id: 'C100', employee_name: 'Dee Delta', phone: '0779999999', department: null, date_from: '2026-10-05', date_to: '2026-10-11' },
  { id: 2, employee_id: 'C200', employee_name: 'Eli Eng', department: 'Engineering', date_from: '2026-10-08', date_to: '2026-10-20' },
];

const base = {
  items: entries, loaded: true, loading: false, error: null, onRetry: () => {},
  employees: [], today: '2026-10-07', onNew: () => {}, onEdit: () => {},
};

describe('DutyStrip', () => {
  it('names the officials covering the week with scope, dates and contact', () => {
    render(<DutyStrip {...base} />);
    expect(screen.getByRole('heading', { name: 'Duty officials' })).toBeInTheDocument();
    expect(screen.getByText('Mine-wide')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Dee Delta/ })).toHaveAttribute('href', 'tel:+263779999999');
    expect(screen.getByRole('link', { name: /WhatsApp Dee Delta/ })).toHaveAttribute('href', 'https://wa.me/263779999999');
  });

  it('edits and names officials through the callers', async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    const onEdit = vi.fn();
    render(<DutyStrip {...base} onNew={onNew} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Name official' }));
    expect(onNew).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: "Edit Dee Delta's duty stint" }));
    expect(onEdit).toHaveBeenCalledWith(entries[0]);
  });

  it('says plainly when nobody is named for the week', () => {
    render(<DutyStrip {...base} items={[]} />);
    expect(screen.getByText('No duty official named for this week.')).toBeInTheDocument();
  });

  it('shows a failed load as a failure with a retry, and nothing while loading', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<DutyStrip {...base} loaded={false} loading error={null} items={[]} />);
    expect(screen.queryByRole('heading', { name: 'Duty officials' })).not.toBeInTheDocument();
    rerender(<DutyStrip {...base} loaded={false} loading={false} error="Service unavailable (fixture)" onRetry={onRetry} />);
    expect(screen.getByText('Duty officials could not be loaded')).toBeInTheDocument();
    expect(screen.queryByText('No duty official named for this week.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
