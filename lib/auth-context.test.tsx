// lib/auth-context.test.tsx — the session gate's failure mode: needsChallenge()
// throwing once is retried; throwing twice leaves the user signed OUT with a
// retryable notice (never silently signed in past 2FA). Also covers the
// MFA_REQUIRED_EVENT listener that re-runs the gate on a backend MFA 401.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
const getAAL = vi.fn();
const upsertProfile = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => (getSession as (...a: unknown[]) => unknown)(...args),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => (getAAL as (...a: unknown[]) => unknown)(...args),
      },
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
  upsertProfile: (...args: unknown[]) => (upsertProfile as (...a: unknown[]) => unknown)(...args),
  getProfile: vi.fn(),
  roleAtLeast: () => true,
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => (toastError as (...a: unknown[]) => unknown)(...args) },
}));

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { MFA_REQUIRED_EVENT } from '@/lib/mfa';
import { getInputSuggestions, recordInput } from '@/lib/inputHistory';

const SESSION = { user: { id: 'u-1', email: 'a@b.com' }, access_token: 'tok' };

function Probe() {
  const { user, loading, mfaPending } = useAuth();
  if (loading) return <div data-testid="probe">loading</div>;
  if (user) return <div data-testid="probe">user:{user.id}</div>;
  if (mfaPending) return <div data-testid="probe">mfa</div>;
  return <div data-testid="probe">signedout</div>;
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks(); // implementations too: a rejection set in one test must not leak
  getSession.mockResolvedValue({ data: { session: SESSION } });
  upsertProfile.mockResolvedValue({ id: 'u-1', role: 'user' });
  window.localStorage.clear();
});

describe('session-gate challenge-check failure', () => {
  it('retries once after a transient failure, then signs in', async () => {
    getAAL
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('user:u-1'));
    expect(getAAL).toHaveBeenCalledTimes(2);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('stays signed out with a retryable notice when the check keeps failing', async () => {
    getAAL.mockRejectedValue(new Error('auth down'));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('signedout'));
    expect(getAAL).toHaveBeenCalledTimes(2); // initial + exactly one retry
    expect(toastError).toHaveBeenCalledTimes(1);
    const [message, opts] = toastError.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(message).toMatch(/couldn't verify your sign-in security check/);
    expect(opts.action.label).toBe('Retry');

    // The retry action re-runs the gate: once the check works, sign-in proceeds.
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    opts.action.onClick();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('user:u-1'));
  });

  it('signing out removes the departing user typing-history key (F-13)', async () => {
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    function SignOutProbe() {
      const { user, loading, signOut } = useAuth();
      if (loading) return <div data-testid="probe">loading</div>;
      return <button data-testid="signout" onClick={() => { void signOut(); }}>out:{user?.id ?? 'none'}</button>;
    }
    render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('signout')).toHaveTextContent('out:u-1'));
    recordInput('department', 'Engineering');
    expect(getInputSuggestions('department')).toEqual(['Engineering']);
    // Recorded under the signed-in user's key (not the legacy shared one).
    expect(window.localStorage.getItem('oz_inputHistory:u-1')).not.toBeNull();
    fireEvent.click(screen.getByTestId('signout'));
    await waitFor(() => expect(window.localStorage.getItem('oz_inputHistory:u-1')).toBeNull());
  });

  it('re-runs the gate when the backend reports MFA required', async () => {
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('user:u-1'));
    const callsBefore = getAAL.mock.calls.length;

    // The session is really still aal1-for-an-enrolled-user: the re-check finds it.
    getAAL.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    window.dispatchEvent(new CustomEvent(MFA_REQUIRED_EVENT));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('mfa'));
    expect(getAAL.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
