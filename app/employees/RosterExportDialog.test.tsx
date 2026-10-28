// B4s2: the organised-roster export shows the check, then closes; a failed
// export says why and stays open.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterExportDialog } from './RosterExportDialog';
import { exportRosterExcel } from './exportRoster';
import type { Employee } from './types';

vi.mock('./exportRoster', async actual => {
  const mod = await actual<typeof import('./exportRoster')>();
  return { ...mod, exportRosterExcel: vi.fn(), exportRosterPdf: vi.fn() };
});

const employees = [
  { id: 1, employee_id: 'E-1', first_name: 'A', last_name: 'B', section: 'Engineering', profession: 'Fitter' },
  { id: 2, employee_id: 'E-2', first_name: 'C', last_name: 'D', section: 'Mining', profession: 'Driver' },
] as unknown as Employee[];

describe('RosterExportDialog success', () => {
  it('shows the check on the Download button, then closes', async () => {
    const user = userEvent.setup();
    vi.mocked(exportRosterExcel).mockResolvedValueOnce(undefined as unknown as void);
    const onOpenChange = vi.fn();
    render(<RosterExportDialog open employees={employees} onOpenChange={onOpenChange} />);
    const download = screen.getByRole('button', { name: 'Download' });
    await user.click(download);
    // The success check replaces the download icon while the hold runs.
    await vi.waitFor(() => expect(download.querySelector('[data-motion-swap="replace"]')).toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 3000 });
  });

  it('a failed export says why and stays open, with no check', async () => {
    const user = userEvent.setup();
    vi.mocked(exportRosterExcel).mockRejectedValueOnce(new Error('disk full (fixture)'));
    const onOpenChange = vi.fn();
    render(<RosterExportDialog open employees={employees} onOpenChange={onOpenChange} />);
    const download = screen.getByRole('button', { name: 'Download' });
    await user.click(download);
    expect(await screen.findByText('disk full (fixture)')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(download.querySelector('[data-motion-swap="replace"]')).not.toBeInTheDocument();
  });
});
