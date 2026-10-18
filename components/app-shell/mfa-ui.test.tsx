import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth-context';
import { challengeAndVerify, enroll, getVerifiedFactor, unenroll, verifyEnrollment } from '@/lib/mfa';
import { GlobalMfaGate, MfaChallenge, SecurityPanel } from './mfa-ui';

vi.mock('@/lib/mfa', () => ({
  enroll: vi.fn(), verifyEnrollment: vi.fn(), challengeAndVerify: vi.fn(),
  unenroll: vi.fn(), getVerifiedFactor: vi.fn(),
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: vi.fn() }));

const enrollMock = vi.mocked(enroll);
const verifyEnrollmentMock = vi.mocked(verifyEnrollment);
const challengeMock = vi.mocked(challengeAndVerify);
const unenrollMock = vi.mocked(unenroll);
const verifiedMock = vi.mocked(getVerifiedFactor);
const authMock = vi.mocked(useAuth);

beforeEach(() => {
  vi.resetAllMocks(); // implementations too: a rejection set in one test must not leak into the next
  verifiedMock.mockResolvedValue(null);
  authMock.mockReturnValue({ mfaPending: false, completeMfaChallenge: vi.fn() } as never);
});

describe('SecurityPanel', () => {
  it('enrolls with a QR, a manual secret and a confirming code', async () => {
    enrollMock.mockResolvedValue({ factorId: 'f-1', qrCode: 'data:image/svg+xml,qr', secret: 'ABC123', uri: 'otpauth://x' });
    render(<SecurityPanel />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    await waitFor(() => expect(screen.getByAltText('Authenticator QR code')).toBeInTheDocument());
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and enable' }));
    await waitFor(() => expect(verifyEnrollmentMock).toHaveBeenCalledWith('f-1', '123456'));
    expect(screen.getByText('Two-factor authentication is now on.')).toBeInTheDocument();
  });

  it('explains when the dashboard toggle is off instead of showing SDK text', async () => {
    enrollMock.mockRejectedValue(new Error('MFA factor is not enabled for this project'));
    render(<SecurityPanel />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Enable 2FA' }));
    await waitFor(() => expect(screen.getByText(/not enabled for this project yet/)).toBeInTheDocument());
  });

  it('requires the current code before disabling, then verifies and unenrolls', async () => {
    verifiedMock.mockResolvedValue({ id: 'f-1', status: 'verified' });
    render(<SecurityPanel />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable 2FA' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Disable 2FA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));
    expect(screen.getByText('Enter the 6-digit code from your app to confirm.')).toBeInTheDocument();
    expect(challengeMock).not.toHaveBeenCalled();
    expect(unenrollMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));
    await waitFor(() => expect(challengeMock).toHaveBeenCalledWith('f-1', '654321'));
    expect(unenrollMock).toHaveBeenCalledWith('f-1');
    expect(screen.getByText('Two-factor authentication has been turned off.')).toBeInTheDocument();
  });

  it('keeps 2FA on when the disable code is rejected', async () => {
    verifiedMock.mockResolvedValue({ id: 'f-1', status: 'verified' });
    challengeMock.mockRejectedValue(new Error('Invalid TOTP code'));
    render(<SecurityPanel />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable 2FA' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Disable 2FA' }));
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));
    await waitFor(() => expect(screen.getByText(/not accepted/)).toBeInTheDocument());
    expect(unenrollMock).not.toHaveBeenCalled();
  });
});

describe('MfaChallenge', () => {
  it('validates the code locally before calling the backend', async () => {
    verifiedMock.mockResolvedValue({ id: 'f-1', status: 'verified' });
    const onVerified = vi.fn();
    render(<MfaChallenge onVerified={onVerified} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByText('Enter the 6-digit code from your app.')).toBeInTheDocument();
    expect(challengeMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(challengeMock).toHaveBeenCalledWith('f-1', '123456'));
    expect(onVerified).toHaveBeenCalledTimes(1);
  });

  it('says when the account has no authenticator instead of failing silently', async () => {
    verifiedMock.mockResolvedValue(null);
    render(<MfaChallenge onVerified={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verify' })).toBeEnabled());
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(screen.getByText('No authenticator is set up on this account.')).toBeInTheDocument();
  });
});

describe('GlobalMfaGate', () => {
  it('shows the challenge only while MFA is pending', () => {
    const { rerender } = render(<GlobalMfaGate />);
    expect(screen.queryByText('Two-factor verification')).not.toBeInTheDocument();
    authMock.mockReturnValue({ mfaPending: true, completeMfaChallenge: vi.fn() } as never);
    rerender(<GlobalMfaGate />);
    expect(screen.getByText('Two-factor verification')).toBeInTheDocument();
  });
});
