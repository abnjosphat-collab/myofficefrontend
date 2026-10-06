import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './Confirm';

function Harness({ options, onResult }: { options: ConfirmOptions; onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return <button onClick={async () => onResult(await confirm(options))}>Open</button>;
}

function setup(options: ConfirmOptions) {
  const onResult = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmProvider>
      <Harness options={options} onResult={onResult} />
    </ConfirmProvider>,
  );
  return { user, onResult };
}

const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Open' }));
const DELETE_OPTIONS: ConfirmOptions = { title: 'Delete this work order?', message: 'This cannot be undone.', destructive: true };

describe('Confirm dialog', () => {
  it('is not shown until asked for', () => {
    setup(DELETE_OPTIONS);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the title and message, labelled for assistive tech', async () => {
    const { user } = setup(DELETE_OPTIONS);
    await open(user);
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this work order?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('puts focus on Cancel, not on the destructive action', async () => {
    const { user } = setup(DELETE_OPTIONS);
    await open(user);
    await screen.findByRole('alertdialog');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveFocus();
  });

  it('Enter on the default focus cancels a destructive confirm', async () => {
    const { user, onResult } = setup(DELETE_OPTIONS);
    await open(user);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves true only when the confirm button is pressed', async () => {
    const { user, onResult } = setup(DELETE_OPTIONS);
    await open(user);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves false on Cancel', async () => {
    const { user, onResult } = setup(DELETE_OPTIONS);
    await open(user);
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('resolves false on Escape', async () => {
    const { user, onResult } = setup(DELETE_OPTIONS);
    await open(user);
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('ignores a backdrop click: only Cancel or Escape dismiss it, so a stray click cannot answer a destructive question', async () => {
    const { user, onResult } = setup(DELETE_OPTIONS);
    await open(user);
    await screen.findByRole('alertdialog');
    const overlay = document.querySelector('[data-state="open"].fixed.inset-0');
    expect(overlay).not.toBeNull();
    await user.click(overlay as Element);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('uses Delete as the destructive default label and Confirm otherwise, and honours custom labels', async () => {
    const first = setup({ title: 'Sure?' });
    await open(first.user);
    expect(await screen.findByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await first.user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('custom labels replace the defaults', async () => {
    const { user } = setup({ title: 'Archive?', confirmLabel: 'Archive', cancelLabel: 'Keep it' });
    await open(user);
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('describes the dialog by its title when there is no message', async () => {
    const { user } = setup({ title: 'Sign out?' });
    await open(user);
    expect(await screen.findByRole('alertdialog')).toHaveAccessibleDescription('Sign out?');
  });

  it('a second confirm while one is open cancels the first', async () => {
    const results: boolean[] = [];
    function Twice() {
      const confirm = useConfirm();
      return (
        <>
          <button onClick={async () => { results.push(await confirm({ title: 'First' })); }}>One</button>
          <button onClick={async () => { results.push(await confirm({ title: 'Second' })); }}>Two</button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<ConfirmProvider><Twice /></ConfirmProvider>);
    await user.click(screen.getByRole('button', { name: 'One' }));
    await screen.findByRole('alertdialog', { name: 'First' });
    // Radix makes the page inert while open, so trigger the second request programmatically.
    (screen.getByRole('button', { name: 'Two', hidden: true }) as HTMLButtonElement).click();
    await screen.findByRole('alertdialog', { name: 'Second' });
    expect(results).toEqual([false]);
  });

  it('useConfirm outside the provider fails loudly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Harness options={{ title: 'x' }} onResult={() => {}} />)).toThrow(/ConfirmProvider/);
    spy.mockRestore();
  });
});
