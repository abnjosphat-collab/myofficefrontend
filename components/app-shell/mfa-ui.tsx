// components/app-shell/mfa-ui.tsx — the two MFA (authenticator-app / TOTP) UI flows:
//   • SecurityPanel — enroll / disable 2FA (reached from the account menu)
//   • MfaChallenge  — the 6-digit prompt shown during sign-in for enrolled users
// Both are thin shells over lib/mfa.ts (Supabase does the crypto), built from the UI system. Requires MFA enabled in the Supabase dashboard.
'use client';

import { useEffect, useState } from 'react';
import { Button, Field, Input, Notice, Spinner } from '@/components/ui-system';
import {
  enroll, verifyEnrollment, challengeAndVerify, unenroll,
  getVerifiedFactor, type EnrollResult,
} from '@/lib/mfa';
import { useAuth } from '@/lib/auth-context';
import { AuthCard, AuthPage } from './auth/AuthLayout';

const CODE_RE = /^\d{6}$/;

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/mfa.*not enabled|factor.*not enabled|unsupported/i.test(m)) {
    return 'Two-factor auth is not enabled for this project yet. Ask an admin to turn on TOTP in the Supabase dashboard.';
  }
  if (/invalid.*code|totp|verification/i.test(m)) return 'That code was not accepted. Check your authenticator app and try again.';
  return m;
}

// ─── SecurityPanel — manage 2FA for the signed-in user ───────────────────────
export function SecurityPanel({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [pending, setPending] = useState<EnrollResult | null>(null); // mid-enrollment
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const f = await getVerifiedFactor();
        setEnrolled(!!f);
        setFactorId(f?.id ?? null);
      } catch (e) { setError(errMsg(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const startEnroll = async () => {
    setError(''); setNotice(''); setBusy(true);
    try { setPending(await enroll()); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const confirmEnroll = async () => {
    if (!pending || !CODE_RE.test(code)) { setError('Enter the 6-digit code from your app.'); return; }
    setError(''); setBusy(true);
    try {
      await verifyEnrollment(pending.factorId, code);
      setEnrolled(true); setFactorId(pending.factorId); setPending(null); setCode('');
      setNotice('Two-factor authentication is now on.');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    if (!factorId) return;
    setError(''); setBusy(true);
    try {
      await unenroll(factorId);
      setEnrolled(false); setFactorId(null);
      setNotice('Two-factor authentication has been turned off.');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-body-sm text-ink-muted">Two-factor authentication with an authenticator app.</p>
      {loading ? (
        <p role="status" className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Spinner />Checking status…</p>
      ) : pending ? (
        <div className="flex flex-col gap-3">
          <p className="font-sans text-body text-ink">Scan this QR code in Google Authenticator, Authy, 1Password or similar, then enter the 6-digit code it shows.</p>
          <div className="flex justify-center">
            {/* Supabase returns an SVG data URI; shown at a fixed size */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.qrCode} alt="Authenticator QR code" width={176} height={176} className="rounded-control border border-line bg-white" />
          </div>
          <p className="break-all text-center font-sans text-caption text-ink-muted">Can&apos;t scan? Key in this secret: <span className="font-mono text-ink">{pending.secret}</span></p>
          <Field label="6-digit code"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="text-center tracking-[0.4em]" /></Field>
          {error && <Notice tone="danger" title="Not verified">{error}</Notice>}
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" pending={busy} onClick={confirmEnroll}>Verify and enable</Button>
            <Button disabled={busy} onClick={() => { setPending(null); setCode(''); setError(''); }}>Cancel</Button>
          </div>
        </div>
      ) : enrolled ? (
        <div className="flex flex-col gap-3">
          <Notice tone="info" icon="shield" title="2FA is active on your account.">{notice || 'You will be asked for a code each time you sign in.'}</Notice>
          {error && <Notice tone="danger" title="Not turned off">{error}</Notice>}
          <Button variant="danger" fullWidth pending={busy} onClick={disable}>Disable 2FA</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-sans text-body text-ink">Add a second step at sign-in using an authenticator app. Recommended for admin and manager accounts.</p>
          {notice && <p role="status" className="font-sans text-body-sm text-success">{notice}</p>}
          {error && <Notice tone="danger" title="Could not start">{error}</Notice>}
          <Button variant="primary" fullWidth pending={busy} onClick={startEnroll}>Enable 2FA</Button>
        </div>
      )}
      {onDone && <Button variant="ghost" onClick={onDone}>Close</Button>}
    </div>
  );
}

// ─── MfaChallenge — the 6-digit gate shown during sign-in ────────────────────
export function MfaChallenge({ onVerified, onCancel }: { onVerified: () => void; onCancel?: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try { const f = await getVerifiedFactor(); setFactorId(f?.id ?? null); }
      catch { /* fall through; the error shows on submit */ }
      finally { setReady(true); }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) { setError('No authenticator is set up on this account.'); return; }
    if (!CODE_RE.test(code)) { setError('Enter the 6-digit code from your app.'); return; }
    setError(''); setBusy(true);
    try { await challengeAndVerify(factorId, code); onVerified(); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthCard title="Two-factor verification" description="Enter the 6-digit code from your authenticator app." headingId="mfa-title">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="6-digit code"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" autoFocus value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="text-center text-body tracking-[0.5em]" /></Field>
        {error && <Notice tone="danger" title="Not verified">{error}</Notice>}
        <Button type="submit" variant="primary" fullWidth pending={busy} disabled={!ready}>Verify</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </form>
    </AuthCard>
  );
}

// ─── GlobalMfaGate — the single enforcement point for 2FA ────────────────────
// Mounted once, at the root (see components/Providers.tsx). AuthContext holds user/session at null for as long as mfaPending is
// true (see applySession() in lib/auth-context.tsx for why the check lives there and not in each login form). This component only
// renders what that state says; it is not itself part of the enforcement.
export function GlobalMfaGate() {
  const { mfaPending, completeMfaChallenge } = useAuth();
  if (!mfaPending) return null;
  return <AuthPage><MfaChallenge onVerified={completeMfaChallenge} /></AuthPage>;
}
