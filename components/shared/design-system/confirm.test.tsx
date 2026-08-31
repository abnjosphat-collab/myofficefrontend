import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { ConfirmProvider, useConfirm } from './confirm';

// useConfirm() only works inside <ConfirmProvider>; this harness calls confirm()
// on mount so each test can just await the dialog appearing, then interact with it.
function Harness({ onResolve, options }: { onResolve: (v: boolean) => void; options: Parameters<ReturnType<typeof useConfirm>>[0] }) {
  const confirm = useConfirm();
  useEffect(() => {
    confirm(options).then(onResolve);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderConfirm(options: Parameters<ReturnType<typeof useConfirm>>[0]) {
  const onResolve = vi.fn();
  render(
    <ConfirmProvider>
      <Harness onResolve={onResolve} options={options} />
    </ConfirmProvider>
  );
  return { onResolve };
}

describe('ConfirmProvider / useConfirm', () => {
  it('renders the title and message once confirm() is called', async () => {
    renderConfirm({ title: 'Delete this record?', message: 'This cannot be undone.' });
    expect(await screen.findByText('Delete this record?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('defaults focus to the Cancel button, not Confirm — an accidental Enter must not complete a destructive action', async () => {
    renderConfirm({ title: 'Delete this record?', destructive: true });
    const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancelButton).toHaveFocus());
  });

  it('resolves true and closes when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderConfirm({ title: 'Delete this record?', destructive: true, confirmLabel: 'Delete' });
    await screen.findByText('Delete this record?');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.queryByText('Delete this record?')).not.toBeInTheDocument());
  });

  it('resolves false and closes on Cancel click', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderConfirm({ title: 'Delete this record?' });
    await screen.findByText('Delete this record?');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(false));
  });

  it('resolves false on Escape', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderConfirm({ title: 'Delete this record?' });
    await screen.findByText('Delete this record?');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(false));
  });

  it('resolves false when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onResolve, } = renderConfirm({ title: 'Delete this record?' });
    await screen.findByText('Delete this record?');

    const dialog = screen.getByRole('alertdialog');
    // The backdrop is the first child of the dialog container (the animated overlay div).
    await user.click(dialog.firstElementChild as Element);

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(false));
  });

  it('uses default labels when none are supplied, and the destructive default label is "Delete"', async () => {
    renderConfirm({ title: 'Delete this record?', destructive: true });
    await screen.findByText('Delete this record?');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('uses "Confirm" as the default label for a non-destructive confirmation', async () => {
    renderConfirm({ title: 'Save changes?' });
    await screen.findByText('Save changes?');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('throws a clear error if useConfirm() is called outside a ConfirmProvider', () => {
    function Bare() {
      useConfirm();
      return null;
    }
    // Suppress React's expected error-boundary console.error noise for this one assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow('useConfirm must be used within <ConfirmProvider>');
    spy.mockRestore();
  });
});
