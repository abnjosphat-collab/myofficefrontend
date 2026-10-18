import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ signInWithGoogle: vi.fn(), signInWithEmail: vi.fn(), signUpWithEmail: vi.fn() }),
}));

const postMock = vi.fn();
vi.mock('@/lib/apiClient', () => ({
  api: { post: (...args: unknown[]) => (postMock as (...a: unknown[]) => unknown)(...args) },
}));

describe('AuthForm password reset request', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({});
  });

  it('asks for the email before sending', () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    expect(screen.getByText('Enter your email address first.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('posts the request through the shared client and confirms it was sent', async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/api/admin/password-reset-requests', { email: 'a@x.com' });
    expect(screen.getByRole('status')).toHaveTextContent('Request sent');
  });

  it('says when the request could not be sent', async () => {
    postMock.mockRejectedValueOnce(new Error('offline'));
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await waitFor(() => expect(screen.getByText('The request could not be sent. Check your connection and try again.')).toBeInTheDocument());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('surfaces a server refusal instead of a false success', async () => {
    // The old raw fetch never looked at the response status: a 429 or 500 still
    // showed "Request sent". The shared client throws, so the refusal is shown.
    postMock.mockRejectedValueOnce(new Error('Too many requests'));
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'a@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await waitFor(() => expect(screen.getByText('The request could not be sent. Check your connection and try again.')).toBeInTheDocument());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
