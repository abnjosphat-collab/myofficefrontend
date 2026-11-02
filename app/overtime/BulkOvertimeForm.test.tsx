import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui-system';
import { ApiError } from '@/lib/apiClient';
import { BulkOvertimeForm } from './BulkOvertimeForm';
import { createOT } from './useOvertimeData';
import type { OTRecord } from './types';

const saved: OTRecord = { id: 1, employee_id: 'C001', employee_name: 'Ann Alpha', position: 'Electrician Class 1', overtime_type: 'regular', date: '2026-11-02', status: 'pending' };

vi.mock('@/hooks/useLookups', () => ({ useEmployees: () => [
  { id: 1, employee_id: 'C001', first_name: 'Ann', last_name: 'Alpha', designation: 'Electrician', department: 'Engineering' },
  { id: 2, employee_id: 'C002', first_name: 'Ben', last_name: 'Beta', designation: 'Fitter', department: 'Engineering' },
] }));
vi.mock('./useOvertimeData', async original => ({ ...await original<typeof import('./useOvertimeData')>(), createOT: vi.fn() }));

beforeEach(() => vi.mocked(createOT).mockReset());

async function mount() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  render(<ConfirmProvider><BulkOvertimeForm open initial={[
    { employee_id: 'C001', name: 'Ann Alpha' }, { employee_id: 'C002', name: 'Ben Beta' },
  ]} records={[]} onOpenChange={vi.fn()} onCreated={onCreated} /></ConfirmProvider>);
  await user.click(screen.getByRole('checkbox', { name: /Just enter the hours/ }));
  await user.type(screen.getByLabelText(/^Hours/), '3');
  return { user, onCreated };
}

describe('bulk overtime save outcomes', () => {
  it('refreshes even when no save response was received, without claiming either request is absent', async () => {
    vi.mocked(createOT).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { user, onCreated } = await mount();
    await user.click(screen.getByRole('button', { name: 'Submit 2 requests' }));
    expect(await screen.findByText(/0 submitted, 2 not confirmed/)).toBeVisible();
    expect(onCreated).toHaveBeenCalledOnce();
    expect(createOT).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Submit 2 requests' })).toBeVisible();
  });

  it.each([
    new TypeError('Failed to fetch'),
    new ApiError('Creating overtime failed. Please try again. (ref fixture123)', 500),
    new ApiError('The request timed out. (ref fixture123)', 408),
    new SyntaxError('The save response was unreadable'),
  ])('does not claim an uncertain save definitely failed or automatically replay it: %s', async error => {
    vi.mocked(createOT).mockResolvedValueOnce(saved).mockRejectedValueOnce(error);
    const { user, onCreated } = await mount();
    await user.click(screen.getByRole('button', { name: 'Submit 2 requests' }));
    expect(await screen.findByText(/1 submitted, 1 not confirmed/)).toBeVisible();
    expect(screen.getByText(/check.*before.*retry/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit 1 request' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Remove Ann Alpha/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove Ben Beta/ })).toBeVisible();
    expect(createOT).toHaveBeenCalledTimes(2);
    expect(onCreated).toHaveBeenCalledOnce();
    expect(vi.mocked(createOT).mock.calls[0][0]).toMatchObject({ employee_id: 'C001', position: 'Electrician Class 1', hours: 3 });
    if (error instanceof ApiError) expect(screen.getByText(/fixture123/)).toBeVisible();
  });

  it('retains a refused person, shows the server reason and retries only them on explicit submit', async () => {
    vi.mocked(createOT).mockResolvedValueOnce(saved).mockRejectedValueOnce(new ApiError('Position is required (fixture)', 422)).mockResolvedValueOnce({ ...saved, id: 2, employee_id: 'C002', employee_name: 'Ben Beta' });
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: 'Submit 2 requests' }));
    expect(await screen.findByText(/1 submitted, 1 not saved.*Ben Beta: Position is required/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Submit 1 request' }));
    expect(createOT).toHaveBeenCalledTimes(3);
    expect(vi.mocked(createOT).mock.calls.map(([p]) => p.employee_id)).toEqual(['C001', 'C002', 'C002']);
  });
});
