// components/app-shell/mfa-ui.tsx — the two MFA (authenticator-app / TOTP) UI flows:
//   • SecurityDialog  — enroll / disable 2FA (reached from the avatar area)
//   • MfaChallenge    — the 6-digit prompt shown during sign-in for enrolled users
// Both are thin shells over lib/mfa.ts (Supabase does the crypto). Styling mirrors
// AuthMenu's light auth-card chrome. Requires MFA enabled in the Supabase dashboard.
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  enroll, verifyEnrollment, challengeAndVerify, unenroll,
  getVerifiedFactor, type EnrollResult,
} from '@/lib/mfa';
import { useAuth } from '@/lib/auth-context';

const CODE_RE = /^\d{6}$/;

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/mfa.*not enabled|factor.*not enabled|unsupported/i.test(m)) {
    return 'Two-factor auth is not enabled for this project yet. Ask an admin to turn on TOTP in the Supabase dashboard.';
  }
  if (/invalid.*code|totp|verification/i.test(m)) return 'That code was not accepted — check your authenticator app and try again.';
  return m;
}

// ─── SecurityDialog body — manage 2FA for the signed-in user ─────────────────
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
    try {
      setPending(await enroll());
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const confirmEnroll = async () => {
    if (!pending || !CODE_RE.test(code)) { setError('Enter the 6-digit code from your app.'); return; }
    setError(''); setBusy(true);
    try {
      await verifyEnrollment(pending.factorId, code);
      setEnrolled(true);
      setFactorId(pending.factorId);
      setPending(null);
      setCode('');
      setNotice('Two-factor authentication is now on.');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    if (!factorId) return;
    setError(''); setBusy(true);
    try {
      await unenroll(factorId);
      setEnrolled(false);
      setFactorId(null);
      setNotice('Two-factor authentication has been turned off.');
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-[#2A4D69]/10 p-6">
      <h2 className="text-lg font-bold text-[#2A4D69] font-heading">Security</h2>
      <p className="text-xs text-[#6B7B8E] mt-1 mb-4">Two-factor authentication (authenticator app)</p>

      {loading ? (
        <div className="h-10 flex items-center text-sm text-[#6B7B8E]">
          <div className="h-4 w-4 border-2 border-[#2A4D69]/30 border-t-[#2A4D69] rounded-full animate-spin mr-2" /> Checking status…
        </div>
      ) : pending ? (
        <div className="space-y-3">
          <p className="text-sm text-[#1a1a2e]">Scan this QR code in Google Authenticator, Authy, 1Password, or similar — then enter the 6-digit code it shows.</p>
          {/* Supabase returns an SVG data-URI; render at a fixed size */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.qrCode} alt="Authenticator QR code" width={176} height={176} className="rounded-lg border border-[#2A4D69]/10" />
          </div>
          <p className="text-[11px] text-[#6B7B8E] text-center break-all">
            Can&apos;t scan? Key in this secret: <span className="font-mono text-[#2A4D69]">{pending.secret}</span>
          </p>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#2A4D69]">6-digit code</Label>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm tracking-widest text-center" />
          </div>
          {error && <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={confirmEnroll} className="flex-1 bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold">
              {busy ? 'Verifying…' : 'Verify & enable'}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setPending(null); setCode(''); setError(''); }}>Cancel</Button>
          </div>
        </div>
      ) : enrolled ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 2FA is active on your account.
          </div>
          {notice && <div className="text-emerald-700 text-xs">{notice}</div>}
          {error && <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <Button type="button" variant="outline" disabled={busy} onClick={disable} className="w-full text-red-600 border-red-200 hover:bg-red-50">
            {busy ? 'Disabling…' : 'Disable 2FA'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#1a1a2e]">Add a second step at sign-in using an authenticator app. Recommended for admin and manager accounts.</p>
          {notice && <div className="text-emerald-700 text-xs">{notice}</div>}
          {error && <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <Button type="button" disabled={busy} onClick={startEnroll} className="w-full bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold">
            {busy ? 'Starting…' : 'Enable 2FA'}
          </Button>
        </div>
      )}

      {onDone && (
        <button type="button" onClick={onDone} className="mt-4 w-full text-center text-xs text-[#6B7B8E] hover:text-[#2A4D69]">Close</button>
      )}
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
      try {
        const f = await getVerifiedFactor();
        setFactorId(f?.id ?? null);
      } catch { /* fall through — show error on submit */ }
      finally { setReady(true); }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) { setError('No authenticator is set up on this account.'); return; }
    if (!CODE_RE.test(code)) { setError('Enter the 6-digit code from your app.'); return; }
    setError(''); setBusy(true);
    try {
      await challengeAndVerify(factorId, code);
      onVerified();
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl border border-[#2A4D69]/10 p-6 space-y-3">
      <div className="text-center mb-1">
        <h2 className="text-lg font-bold text-[#2A4D69] font-heading">Two-factor verification</h2>
        <p className="text-xs text-[#6B7B8E] mt-1">Enter the 6-digit code from your authenticator app.</p>
      </div>
      <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" autoFocus
        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-base tracking-[0.5em] text-center" />
      {error && <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
      <Button type="submit" disabled={busy || !ready} className="w-full bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold">
        {busy ? 'Verifying…' : 'Verify'}
      </Button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full text-center text-xs text-[#6B7B8E] hover:text-[#2A4D69]">Cancel</button>
      )}
    </form>
  );
}

// ─── GlobalMfaGate — the single enforcement point for 2FA ────────────────────
// Mounted once, at the root (see components/Providers.tsx). AuthContext holds
// user/session at null for as long as mfaPending is true — see the long
// comment on applySession() in lib/auth-context.tsx for why the check has to
// live there and not in each login form. This component only has to render
// what that state says; it isn't itself part of the enforcement.
export function GlobalMfaGate() {
  const { mfaPending, completeMfaChallenge } = useAuth();
  if (!mfaPending) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050f1c] p-4">
      <div className="w-full max-w-sm">
        <MfaChallenge onVerified={completeMfaChallenge} />
      </div>
    </div>
  );
}
