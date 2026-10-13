import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsProfileMenu } from './ToolsProfileMenu';
import type { WorkspaceAccount } from './prototype';

const account: WorkspaceAccount = { id: 'a1', name: 'Audit Admin', username: 'audit-admin', password: '', role: 'admin', canIssue: false };

function setup(current: WorkspaceAccount | null = account) {
  const onSignIn = vi.fn();
  const onSignOut = vi.fn();
  render(<ToolsProfileMenu account={current} onSignIn={onSignIn} onSignOut={onSignOut} />);
  return { onSignIn, onSignOut };
}

describe('ToolsProfileMenu', () => {
  it('reveals identity, access and sign out when opened', async () => {
    const user = userEvent.setup();
    const { onSignOut } = setup();
    expect(screen.queryByText('Audit Admin')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Account: Audit Admin' }));
    expect(screen.getByText('Audit Admin')).toBeInTheDocument();
    expect(screen.getByText('audit-admin')).toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.queryByText('Department')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('shows the department row when one is assigned', async () => {
    const user = userEvent.setup();
    setup({ ...account, role: 'issuer', department: 'Engineering' });
    await user.click(screen.getByRole('button', { name: 'Account: Audit Admin' }));
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Account: Audit Admin' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Audit Admin')).not.toBeInTheDocument();
  });

  it('opens the sign-in flow when no account is set', async () => {
    const user = userEvent.setup();
    const { onSignIn } = setup(null);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });
});
