// app/auth/set-password/page.tsx — landing page for invite/password-reset links. auth/callback exchanges the emailed code for a
// session (so a valid session already exists by the time someone lands here) then redirects here instead of straight into the app,
// since an invited user has no password yet and a recovery link implies they want to replace their old one.
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, Field, Input, Notice } from '@/components/ui-system';
import { AuthCard, AuthPage } from '@/components/app-shell/auth/AuthLayout';

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

  return (
    <AuthPage>
      <AuthCard title="Set your password" description="Choose a password to finish signing in to MyOffice.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Field label="New password"><Input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /></Field>
          <Field label="Confirm password"><Input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required /></Field>
          {error && <Notice tone="danger" title="Password not saved">{error}</Notice>}
          <Button type="submit" variant="primary" fullWidth pending={submitting}>Save password and continue</Button>
        </form>
      </AuthCard>
    </AuthPage>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-canvas" />}>
      <SetPasswordForm />
    </Suspense>
  );
}
