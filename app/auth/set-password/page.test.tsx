import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SetPasswordPage from './page';

const { replaceMock, updateMock } = vi.hoisted(() => ({ replaceMock: vi.fn(), updateMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: () => '/' }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { updateUser: updateMock } } }));
// Presentational chrome only (canvases would need WebGL); the form underneath is real.
vi.mock('@/components/app-shell/auth/AuthLayout', () => ({
  AuthPage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AuthCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('set-password', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    updateMock.mockReset();
    updateMock.mockResolvedValue({ error: null });
  });

  it('settles the button and says so when the save throws', async () => {
    updateMock.mockRejectedValueOnce(new Error('offline (fixture)'));
    render(<SetPasswordPage />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass12' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'newpass12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
    await waitFor(() => expect(screen.getByText('offline (fixture)')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save password and continue' })).not.toBeDisabled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('still enforces the 6-character minimum without calling the backend', () => {
    render(<SetPasswordPage />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('the Show toggle reveals the new password and Hide masks it again', () => {
    render(<SetPasswordPage />);
    const field = screen.getByLabelText('New password');
    expect(field).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(field).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(field).toHaveAttribute('type', 'password');
  });
});
