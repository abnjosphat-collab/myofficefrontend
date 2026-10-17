import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/apiClient';
import { TakeLieuLeaveDialog } from './TakeLieuLeaveDialog';
import type { OTRecord } from './types';

vi.mock('@/lib/apiClient', () => ({ api: { post: vi.fn(), get: vi.fn() } }));

const record = (): OTRecord => ({
  id: 7, employee_name: 'Ann Alpha', employee_id: 'E1', position: 'Fitter',
  overtime_type: 'regular', date: '2026-10-10', start_time: '17:00', end_time: '20:00',
  status: 'approved', payout_method: 'lieu',
});

describe('TakeLieuLeaveDialog', () => {
  beforeEach(() => { vi.mocked(api.post).mockReset(); });

  it('defaults both days to the overtime date and records the taken range', async () => {
    const user = userEvent.setup();
    const onTaken = vi.fn();
    vi.mocked(api.post).mockResolvedValue({ created: true, leave: { id: 9, start_date: '2026-10-12', end_date: '2026-10-12', status: 'approved' } });
    render(<TakeLieuLeaveDialog record={record()} open onOpenChange={() => {}} onTaken={onTaken} />);
    expect(screen.getByLabelText('First day')).toHaveValue('2026-10-10');
    fireEvent.change(screen.getByLabelText('First day'), { target: { value: '2026-10-12' } });
    fireEvent.change(screen.getByLabelText('Last day'), { target: { value: '2026-10-12' } });
    await user.click(screen.getByRole('button', { name: 'Record leave taken' }));
    expect(api.post).toHaveBeenCalledWith('/api/overtime/7/take-as-leave', { start_date: '2026-10-12', end_date: '2026-10-12' });
    expect(onTaken).toHaveBeenCalledOnce();
  });

  it('refuses a backwards range without calling the server', async () => {
    const user = userEvent.setup();
    const onTaken = vi.fn();
    render(<TakeLieuLeaveDialog record={record()} open onOpenChange={() => {}} onTaken={onTaken} />);
    fireEvent.change(screen.getByLabelText('First day'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByLabelText('Last day'), { target: { value: '2026-10-12' } });
    await user.click(screen.getByRole('button', { name: 'Record leave taken' }));
    expect(api.post).not.toHaveBeenCalled();
    expect(onTaken).not.toHaveBeenCalled();
    expect(await screen.findByText('The leave cannot end before it starts.')).not.toBeNull();
  });
});
