// components/app-shell/auth/AuthForm.tsx — sign in or create an account (email and password, or Google). The behaviour is unchanged
// from the old account menu: a successful sign-in is a full document navigation, which keeps AuthContext deriving from a clean mount (the
// MFA race fix, see applySession() in lib/auth-context.tsx). When the account has 2FA, AuthContext holds the session back and the
// root-level GlobalMfaGate takes over.
'use client';

import { useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function AuthForm({ defaultMode = 'login', onClose, redirectTo }: {
  defaultMode?: 'login' | 'signup'; onClose?: () => void;
  /** Where to land after signing in. Defaults to reloading the current URL; /login passes its ?next= target. */
  redirectTo?: string;
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => { setGoogleLoading(true); await signInWithGoogle(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setLoading(true);
    const result = mode === 'login' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password, name);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onClose?.();
    if (redirectTo) window.location.replace(redirectTo);
    else window.location.reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Button fullWidth pending={googleLoading} onClick={handleGoogleSignIn}>
        {!googleLoading && <GoogleIcon />}{googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      <div className="flex items-center gap-3" role="separator" aria-label="or">
        <span className="h-px flex-1 bg-line" /><span className="font-sans text-caption text-ink-muted">or with email</span><span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === 'signup' && <Field label="Full name"><Input type="text" autoComplete="name" placeholder="As on official documents" value={name} onChange={e => setName(e.target.value)} required /></Field>}
        <Field label="Email address"><Input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></Field>
        {error && <Notice tone="danger" title={mode === 'login' ? 'Could not sign in' : 'Could not create the account'}>{error}</Notice>}
        <Button type="submit" variant="primary" fullWidth pending={loading}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
      </form>
      <p className="text-center font-sans text-body-sm text-ink-muted">
        {mode === 'login' ? 'No account yet? ' : 'Already have an account? '}
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="focus-ring rounded-xs font-medium text-action hover:underline">
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
