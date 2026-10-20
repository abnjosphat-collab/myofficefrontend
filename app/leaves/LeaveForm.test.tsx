import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { LeaveForm } from './LeaveForm';
import type { Leave } from './types';

const base: Leave = {
  id: 'L1', employee_id: 'E1', employee_name: 'Ann Alpha', position: 'Fitter',
  leave_type: 'annual', start_date: '2026-10-20', end_date: '2026-10-22',
  reason: 'Rest', contact_number: '0771234567', status: 'pending',
} as Leave;

const clash: Leave = {
  ...base, id: 'L2', start_date: '2026-10-21', end_date: '2026-10-23', status: 'approved',
};

describe('LeaveForm overlap', () => {
  it('focuses the overlap notice when it refuses the save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    render(
      <ConfirmProvider>
        <LeaveForm open leave={base} leaves={[base, clash]} onOpenChange={() => {}} onSave={onSave} />
      </ConfirmProvider>,
    );
    expect(screen.getByText('This person already has a leave request on these dates')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Update request' }));
    expect(onSave).not.toHaveBeenCalled();
    const focused = document.activeElement as HTMLElement | null;
    expect(focused?.getAttribute('tabindex')).toBe('-1');
    expect(focused?.textContent).toContain('This person already has a leave request on these dates');
  });
});
