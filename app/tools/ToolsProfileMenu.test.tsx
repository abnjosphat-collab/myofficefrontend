import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsProfileMenu } from './ToolsProfileMenu';
import type { WorkspaceAccount } from './prototype';

const account: WorkspaceAccount = { id: 'a1', name: 'Audit Admin', username: 'audit-admin', password: '', role: 'admin', canIssue: false };

function setup(current: WorkspaceAccount | null = account, open = true) {
  const onOpenChange = vi.fn();
  const onSignIn = vi.fn();
  const onSignOut = vi.fn();
  render(<ToolsProfileMenu account={current} open={open} onOpenChange={onOpenChange} onSignIn={onSignIn} onSignOut={onSignOut} duration={0} />);
  return { onOpenChange, onSignIn, onSignOut };
}

describe('ToolsProfileMenu', () => {
  it('reveals identity, access and sign out when open', async () => {
    const user = userEvent.setup();
    const { onSignOut, onOpenChange } = setup();
    expect(screen.getByRole('dialog', { name: 'Your profile' })).toBeInTheDocument();
    expect(screen.getByText('Audit Admin')).toBeInTheDocument();
    expect(screen.getByText('audit-admin')).toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
    expect(screen.getAllByText('Administrator')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('shows the department row only when assigned', () => {
    setup();
    expect(screen.queryByText('Department')).not.toBeInTheDocument();
  });

  it('closes on Escape and outside pointer', () => {
    const { onOpenChange } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    fireEvent.pointerDown(document.body);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('opens the sign-in flow when no account is set', async () => {
    const user = userEvent.setup();
    const { onSignIn } = setup(null, false);
    expect(screen.queryByRole('dialog', { name: 'Your profile' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
