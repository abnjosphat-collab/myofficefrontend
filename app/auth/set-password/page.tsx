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
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const problems: { password?: string; confirm?: string } = {};
    if (password.length < 6) problems.password = 'Use at least 6 characters.';
    else if (password !== confirm) problems.confirm = 'Enter the same password again.';
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) { setError(updateError.message); return; }
    router.replace(next);
  };

  return (
    <AuthPage>
      <AuthCard title="Set your password" description="Choose a password to finish signing in to MyOffice.">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <Field label="New password" error={fieldErrors.password}><Input type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: undefined })); }} /></Field>
          <Field label="Confirm password" error={fieldErrors.confirm}><Input type="password" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setFieldErrors(f => ({ ...f, confirm: undefined })); }} /></Field>
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
