import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ConfirmProvider } from '@/components/ui-system';
import { useConfirmDelete, type ConfirmDeleteOptions } from './useConfirmDelete';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function Harness({ options, onResult }: { options: ConfirmDeleteOptions; onResult: (v: boolean) => void }) {
  const confirmDelete = useConfirmDelete();
  return <button type="button" onClick={async () => onResult(await confirmDelete(options))}>Delete it</button>;
}

const setup = (over: Partial<ConfirmDeleteOptions> = {}) => {
  const run = vi.fn(async () => {}); const after = vi.fn(); const onResult = vi.fn();
  render(<ConfirmProvider><Harness options={{ title: 'Delete this work order?', what: 'The work order', done: 'Work order deleted.', run, after, ...over }} onResult={onResult} /></ConfirmProvider>);
  return { run, after, onResult };
};

describe('useConfirmDelete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes only after confirmation, then reports and refreshes', async () => {
    const user = userEvent.setup();
    const { run, after, onResult } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete it' }));
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(run).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Work order deleted.');
    expect(after).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('does nothing when cancelled', async () => {
    const user = userEvent.setup();
    const { run, onResult } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete it' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(run).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('names what was not deleted, and does not refresh, when the delete fails', async () => {
    const user = userEvent.setup();
    const { after, onResult } = setup({ run: async () => { throw new Error('Server busy'); } });
    await user.click(screen.getByRole('button', { name: 'Delete it' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(toast.error).toHaveBeenCalledWith('The work order was not deleted: Server busy');
    expect(toast.success).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
