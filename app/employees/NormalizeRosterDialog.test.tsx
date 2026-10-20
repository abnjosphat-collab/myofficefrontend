import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '@/components/ui-system';
import { NormalizeRosterDialog } from './NormalizeRosterDialog';
import type { Employee } from './types';

vi.mock('./useEmployeesData', () => ({
  bulkNormalizeEmployees: vi.fn(),
}));

import { bulkNormalizeEmployees } from './useEmployeesData';

const employees: Employee[] = [
  { id: 1, employee_id: 'E1', first_name: 'Ann', last_name: 'Alpha', phone: '0771234567', designation: '', section: '', archived: false } as Employee,
];

describe('NormalizeRosterDialog confirm', () => {
  it('run asks with the count', async () => {
    const user = userEvent.setup();
    vi.mocked(bulkNormalizeEmployees).mockResolvedValue({ succeeded: 1, failed: 0 } as never);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <ConfirmProvider>
        <NormalizeRosterDialog open employees={employees} onOpenChange={onOpenChange} onComplete={onComplete} />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Normalise 1 record' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText(/Normalise 1 record\?/)).toBeInTheDocument();
    expect(within(confirm).getByText(/Phone: 1/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Normalise 1 record' }));
    expect(vi.mocked(bulkNormalizeEmployees)).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancel runs nothing', async () => {
    const user = userEvent.setup();
    vi.mocked(bulkNormalizeEmployees).mockClear();
    render(
      <ConfirmProvider>
        <NormalizeRosterDialog open employees={employees} onOpenChange={() => {}} onComplete={async () => {}} />
      </ConfirmProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Normalise 1 record' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(vi.mocked(bulkNormalizeEmployees)).not.toHaveBeenCalled();
  });
});
