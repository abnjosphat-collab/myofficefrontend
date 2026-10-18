import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolsAccountAccess, ToolsAuth } from './ToolsAuth';
import type { WorkspaceAccount } from './prototype';

const account = (overrides: Partial<WorkspaceAccount> = {}): WorkspaceAccount => ({
  id: 'acc-1', name: 'Rudo Moyo', username: 'rudo', password: '', role: 'viewer',
  department: 'Engineering', canIssue: false, approvalRoles: [], ...overrides,
});

const accessProps = (overrides = {}) => ({
  accounts: [account()], departments: ['Engineering'], requestUsernames: [] as string[],
  onUpdateRole: () => {}, onSetPassword: async () => true, ...overrides,
});

const authProps = (overrides = {}) => ({
  accounts: [], currentAccount: null, onCreate: () => {}, onLogin: async () => true as const,
  onLogout: () => {}, onCancel: () => {}, onRequestReset: async () => true, onChangePassword: async () => true as const,
  ...overrides,
});

describe('ToolsAccountAccess password reset', () => {
  it('opens an inline set-password form for the chosen account', () => {
    render(<ToolsAccountAccess {...accessProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    expect(screen.getByLabelText('New password for Rudo Moyo')).toBeInTheDocument();
  });

  it('refuses a short password inline without calling the backend', () => {
    const onSetPassword = vi.fn(async () => true);
    render(<ToolsAccountAccess {...accessProps({ onSetPassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    fireEvent.change(screen.getByLabelText('New password for Rudo Moyo'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
    expect(onSetPassword).not.toHaveBeenCalled();
  });

  it('sends the new password and closes the form on success', async () => {
    const onSetPassword = vi.fn(async () => true);
    render(<ToolsAccountAccess {...accessProps({ onSetPassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    fireEvent.change(screen.getByLabelText('New password for Rudo Moyo'), { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(onSetPassword).toHaveBeenCalledWith('acc-1', 'newpass12'));
    await waitFor(() => expect(screen.queryByLabelText('New password for Rudo Moyo')).not.toBeInTheDocument());
  });

  it('keeps the form open when the backend refuses, so the admin can retry', async () => {
    const onSetPassword = vi.fn(async () => false);
    render(<ToolsAccountAccess {...accessProps({ onSetPassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    fireEvent.change(screen.getByLabelText('New password for Rudo Moyo'), { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(onSetPassword).toHaveBeenCalled());
    expect(screen.getByLabelText('New password for Rudo Moyo')).toBeInTheDocument();
  });

  it('cancel closes the form without calling the backend', () => {
    const onSetPassword = vi.fn(async () => true);
    render(<ToolsAccountAccess {...accessProps({ onSetPassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('New password for Rudo Moyo')).not.toBeInTheDocument();
    expect(onSetPassword).not.toHaveBeenCalled();
  });

  it('badges the accounts that asked for a reset, matching names case-insensitively', () => {
    const { rerender } = render(<ToolsAccountAccess {...accessProps({ requestUsernames: ['RUDO'] })} />);
    expect(screen.getByText('Reset requested')).toBeInTheDocument();
    rerender(<ToolsAccountAccess {...accessProps({ requestUsernames: ['someone-else'] })} />);
    expect(screen.queryByText('Reset requested')).not.toBeInTheDocument();
  });
});

describe('ToolsAuth sign-in', () => {
  it('asks for the username before sending a reset request', () => {
    const onRequestReset = vi.fn(async () => true);
    render(<ToolsAuth {...authProps({ onRequestReset })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    expect(screen.getByText('Enter your username or email first.')).toBeInTheDocument();
    expect(onRequestReset).not.toHaveBeenCalled();
  });

  it('sends the reset request and confirms it was sent', async () => {
    const onRequestReset = vi.fn(async () => true);
    render(<ToolsAuth {...authProps({ onRequestReset })} />);
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'rudo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await waitFor(() => expect(onRequestReset).toHaveBeenCalledWith('rudo'));
    expect(screen.getByRole('status')).toHaveTextContent('Request sent');
  });

  it('stays on the button when the request fails, so the user can retry', async () => {
    const onRequestReset = vi.fn(async () => false);
    render(<ToolsAuth {...authProps({ onRequestReset })} />);
    fireEvent.change(screen.getByLabelText('Username or email'), { target: { value: 'rudo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await waitFor(() => expect(onRequestReset).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Forgot your password?' })).toBeInTheDocument();
  });
});

describe('ToolsAuth profile change password', () => {
  const profileProps = (overrides = {}) => authProps({ currentAccount: account(), ...overrides });

  it('validates before calling the backend', () => {
    const onChangePassword = vi.fn(async () => true as const);
    render(<ToolsAuth {...profileProps({ onChangePassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your current password.');
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpass12' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 6 characters.');
    expect(onChangePassword).not.toHaveBeenCalled();
  });

  it('sends both passwords and closes the form on success', async () => {
    const onChangePassword = vi.fn(async () => true as const);
    render(<ToolsAuth {...profileProps({ onChangePassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'oldpass12' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(onChangePassword).toHaveBeenCalledWith('oldpass12', 'newpass12'));
    await waitFor(() => expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument());
  });

  it('shows the backend refusal inline and keeps the form open', async () => {
    const onChangePassword = vi.fn(async () => 'The current password is incorrect.');
    render(<ToolsAuth {...profileProps({ onChangePassword })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'wrongpass12' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The current password is incorrect.'));
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
  });
});
