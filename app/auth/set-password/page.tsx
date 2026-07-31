// app/auth/set-password/page.tsx — landing page for invite/password-reset
// links. auth/callback exchanges the emailed code for a session (so a valid
// session already exists by the time someone lands here) then redirects here
// instead of straight into the app, since an invited user has no password
// yet and a recovery link implies they want to replace their old one.
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) { setError(updateError.message); return; }
    router.replace(next);
  };

  const inputCls = 'w-full h-11 rounded-xl px-4 text-sm text-white bg-white/[0.06] border border-white/10 placeholder-white/40 outline-none transition-colors focus:bg-white/[0.09] focus:border-brand-300/40';

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050f1c] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-full bg-[#86BBD8] flex items-center justify-center text-[#1e3a52] font-bold text-lg font-heading">
            O
          </div>
          <h1 className="text-white text-lg font-semibold">Set your password</h1>
          <p className="text-white/50 text-sm text-center">Choose a password to finish signing in to MyOffice.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" autoFocus placeholder="New password" value={password}
            onChange={e => setPassword(e.target.value)} minLength={6} required className={inputCls} />
          <input type="password" placeholder="Confirm password" value={confirm}
            onChange={e => setConfirm(e.target.value)} minLength={6} required className={inputCls} />

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050f1c]" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
