// app/auth/set-password/page.tsx — landing page for invite/password-reset links. auth/callback exchanges the emailed code for a
// session (so a valid session already exists by the time someone lands here) then redirects here instead of straight into the app,
// since an invited user has no password yet and a recovery link implies they want to replace their old one.
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, Field, Input, Notice, useRefusedSubmit } from '@/components/ui-system';
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
  const [showPassword, setShowPassword] = useState(false);
  const { formRef, refused } = useRefusedSubmit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const problems: { password?: string; confirm?: string } = {};
    if (password.length < 6) problems.password = 'Use at least 6 characters.';
    else if (password !== confirm) problems.confirm = 'Enter the same password again.';
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) { refused(); return; }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      router.replace(next);
    } catch (e) { setError(e instanceof Error ? e.message : 'Password not saved. Check your connection and try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthPage>
      <AuthCard title="Set your password" description="Choose a password to finish signing in to MyOffice.">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <Field label="New password" error={fieldErrors.password}>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} className="pr-16" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: undefined })); }} />
              <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(s => !s)} className="focus-ring absolute inset-y-0 right-0 rounded-control px-3 font-sans text-caption font-medium text-ink-muted hover:text-ink">{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </Field>
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
