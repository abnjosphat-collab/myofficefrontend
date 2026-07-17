// components/app-shell/AuthMenu.tsx — real Supabase/Google auth, ported from the
// legacy components/Header.tsx (do not edit Header.tsx — it's still used by
// PageShell until every page has migrated off it). Visual design re-skinned to
// match the homepage shell's compact avatar-button chrome instead of Header's
// dark navbar buttons; the auth logic itself (signIn/signUp/signOut, role badge)
// is unchanged.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogIn, LogOut, Settings, Shield, UserPlus } from '@/components/shared/theme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/shared/theme';
import { SecurityPanel } from './mfa-ui';
// Role metadata is defined once in lib/roles.ts (labels + semantic badge colors) —
// this used to keep its own copy. ROLE_BADGE keeps role colors semantic (manager
// stays blue), independent of the app's brand color.
import { ROLE_BADGE as ROLE_STYLES, ROLE_LABELS } from '@/lib/roles';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AuthForm({ defaultMode = 'login', onClose }: { defaultMode?: 'login' | 'signup'; onClose?: () => void }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your full name'); return;
    }
    setLoading(true);
    const result = mode === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, name);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // If this account has 2FA enrolled, AuthContext holds user/session at null
    // until the challenge clears — GlobalMfaGate (mounted at the root) reacts
    // to that on its own. Reloading here isn't optional UX polish: it's what
    // makes AuthContext re-derive from a clean mount instead of racing this
    // dialog's own close against the auth-state listener that's about to fire
    // from the same sign-in. See applySession() in lib/auth-context.tsx.
    onClose?.();
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-[#2A4D69]/10 p-6">
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <div className="h-10 w-10 rounded-full bg-[#2A4D69] flex items-center justify-center text-white font-bold font-heading text-sm">O</div>
        </div>
        <h2 className="text-lg font-bold text-[#2A4D69] font-heading">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="text-xs text-[#6B7B8E] mt-1">{mode === 'login' ? 'Sign in to access MyOffice' : 'Join your team on MyOffice'}</p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg border border-[#2A4D69]/20 hover:border-[#2A4D69]/40 hover:bg-[#2A4D69]/05 transition-all duration-200 text-sm font-medium text-[#1a1a2e] mb-4"
      >
        {googleLoading ? <div className="h-4 w-4 border-2 border-[#2A4D69]/30 border-t-[#2A4D69] rounded-full animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#2A4D69]/10" />
        <span className="text-xs text-[#6B7B8E]">or with email</span>
        <div className="flex-1 h-px bg-[#2A4D69]/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-[#2A4D69]">Full name</Label>
            <Input type="text" placeholder="As on official documents" value={name} onChange={e => setName(e.target.value)} className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm" required />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#2A4D69]">Email address</Label>
          <Input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#2A4D69]">Password</Label>
          <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} className="border-[#2A4D69]/20 focus:border-[#2A4D69] text-sm" required minLength={6} />
        </div>
        {error && <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full bg-[#2A4D69] hover:bg-[#1e3a52] text-white font-semibold mt-1">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'login' ? 'Signing in…' : 'Creating account…'}
            </span>
          ) : mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
        <p className="text-center text-xs text-[#6B7B8E] pt-1">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-[#2A4D69] font-semibold hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}

// ─── AuthMenu — the shell's avatar/login slot ───────────────────────────────
export function AuthMenu() {
  const { user, profile, loading, signOut, isAtLeast } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const t = useTheme();

  const isLoggedIn = !!user;
  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initials = displayName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = profile?.avatar_url ?? null;
  const role = profile?.role ?? 'user';
  const isAdmin = isAtLeast('admin');

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  if (loading) {
    return <div className={`h-7 w-16 rounded-lg ${t.chipBg} animate-pulse`} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-1.5">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" className={`hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.hoverText} ${t.glassSoft} transition-colors`}>
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">Sign In</DialogTitle>
            <AuthForm defaultMode="login" onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 transition-all hover:brightness-110">
              <UserPlus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Get Started</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
            <DialogTitle className="sr-only">Create Account</DialogTitle>
            <AuthForm defaultMode="signup" />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {isAdmin && (
        <Link href="/admin" className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_STYLES[role]} transition-opacity hover:opacity-80`}>
          <Shield className="h-3 w-3" /> {ROLE_LABELS[role]}
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className={`h-8 w-8 hidden sm:flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`} title="Admin panel">
          <Settings className="h-4 w-4" />
        </Link>
      )}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            title="Security & two-factor auth"
            className={`h-8 w-8 hidden sm:flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">Security</DialogTitle>
          <SecurityPanel onDone={() => setSecurityOpen(false)} />
        </DialogContent>
      </Dialog>
      <button
        onClick={handleLogout}
        type="button"
        title="Sign out"
        className={`h-8 w-8 hidden sm:flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
      <button className={`flex items-center gap-1.5 h-11 pl-2 pr-2.5 ${t.hoverBg} transition-colors`} type="button">
        <Avatar className="h-7 w-7 ring-1 ring-white/10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-[11px] font-medium">{initials}</AvatarFallback>
        </Avatar>
        <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint} hidden lg:block`} />
      </button>
    </div>
  );
}
