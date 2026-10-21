import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ConfirmProvider } from '@/components/ui-system';
import { summariseNames, useBulkDelete, type BulkDeleteOptions } from './useBulkDelete';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function Harness({ options, onResult }: { options: BulkDeleteOptions; onResult: (v: boolean) => void }) {
  const { confirmBulkDelete } = useBulkDelete();
  return <button type="button" onClick={async () => onResult(await confirmBulkDelete(options))}>Delete them</button>;
}

const setup = (over: Partial<BulkDeleteOptions> = {}) => {
  const run = vi.fn(async (_id: string | number) => {}); const after = vi.fn(); const onResult = vi.fn();
  render(<ConfirmProvider><Harness options={{ title: 'Delete 3 unmatched PPE records?', message: 'Ann, Bob, Cat. This cannot be undone.', ids: ['a', 'b', 'c'], run, singular: 'PPE record', plural: 'PPE records', after, ...over }} onResult={onResult} /></ConfirmProvider>);
  return { run, after, onResult };
};

describe('useBulkDelete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes every id after confirmation, then reports and refreshes', async () => {
    const user = userEvent.setup();
    const { run, after, onResult } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete them' }));
    expect(run).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledWith('a');
    expect(toast.success).toHaveBeenCalledWith('3 PPE records deleted.');
    expect(toast.error).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('does nothing when cancelled', async () => {
    const user = userEvent.setup();
    const { run, after, onResult } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete them' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(run).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('reports partial failure honestly: ok count, failed count with the first reason, still refreshes', async () => {
    const user = userEvent.setup();
    const { after, onResult } = setup({ run: async (id: string | number) => { if (id !== 'a') throw new Error('Server busy'); } });
    await user.click(screen.getByRole('button', { name: 'Delete them' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(toast.success).toHaveBeenCalledWith('1 PPE record deleted.');
    expect(toast.error).toHaveBeenCalledWith('2 PPE records were not deleted: Server busy');
    expect(after).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('does nothing for an empty id list', async () => {
    const user = userEvent.setup();
    const { run, onResult } = setup({ ids: [] });
    await user.click(screen.getByRole('button', { name: 'Delete them' }));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(run).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(false);
  });
});

describe('summariseNames', () => {
  it('joins a short list and caps a long one', () => {
    expect(summariseNames(['Ann'])).toBe('Ann');
    expect(summariseNames(['Ann', 'Bob'])).toBe('Ann, Bob');
    expect(summariseNames(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('a, b, c, d and 2 more');
  });
});
