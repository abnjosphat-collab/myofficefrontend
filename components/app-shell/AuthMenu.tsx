// components/app-shell/AuthMenu.tsx — real Supabase/Google auth, ported from the
// legacy components/Header.tsx (do not edit Header.tsx — it's still used by
// PageShell until every page has migrated off it). Visual design re-skinned to
// match the homepage shell's compact avatar-button chrome instead of Header's
// dark navbar buttons; the auth logic itself (signIn/signUp/signOut, role badge)
// is unchanged.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogIn, LogOut, Settings, Shield, SlidersHorizontal, UserPlus } from '@/components/shared/theme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

export function AuthForm({ defaultMode = 'login', onClose, redirectTo }: {
  defaultMode?: 'login' | 'signup'; onClose?: () => void;
  /** Where to land after a successful sign-in. Defaults to reloading the current URL —
   * the /login page passes its ?next= target instead. Either way it's a full document
   * navigation, which is what keeps AuthContext re-deriving from a clean mount (the
   * MFA race fix — see applySession() in lib/auth-context.tsx). */
  redirectTo?: string;
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const t = useTheme();
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
    if (redirectTo) window.location.replace(redirectTo);
    else window.location.reload();
  };

  return (
    <div className={`${t.glass} ${t.shadow} rounded-2xl p-6`}>
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold font-heading text-sm">O</div>
        </div>
        <h2 className={`text-lg font-bold font-heading ${t.textPrimary}`}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className={`text-xs mt-1 ${t.textFaint}`}>{mode === 'login' ? 'Sign in to access MyOffice' : 'Join your team on MyOffice'}</p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className={`w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-lg border ${t.border} ${t.hoverBgSoft} transition-all duration-200 text-sm font-medium ${t.textPrimary} mb-4`}
      >
        {googleLoading ? <div className="h-4 w-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className={`flex-1 h-px ${t.border} border-t`} />
        <span className={`text-xs ${t.textFaint}`}>or with email</span>
        <div className={`flex-1 h-px ${t.border} border-t`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1">
            <Label className={`text-xs font-medium ${t.textMuted}`}>Full name</Label>
            <Input type="text" placeholder="As on official documents" value={name} onChange={e => setName(e.target.value)} className={`text-sm ${t.inputBg}`} required />
          </div>
        )}
        <div className="space-y-1">
          <Label className={`text-xs font-medium ${t.textMuted}`}>Email address</Label>
          <Input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} className={`text-sm ${t.inputBg}`} required />
        </div>
        <div className="space-y-1">
          <Label className={`text-xs font-medium ${t.textMuted}`}>Password</Label>
          <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} className={`text-sm ${t.inputBg}`} required minLength={6} />
        </div>
        {error && <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 text-white font-semibold mt-1">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'login' ? 'Signing in…' : 'Creating account…'}
            </span>
          ) : mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
        <p className={`text-center text-xs pt-1 ${t.textFaint}`}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className={`font-semibold hover:underline ${t.linkText}`}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  );
}

// ─── AuthMenu — the shell's avatar/login slot ───────────────────────────────
export function AuthMenu({ onPreferences }: { onPreferences?: () => void }) {
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
      {/* Controlled from a DropdownMenuItem below, not a DialogTrigger inside the menu —
          nesting a Dialog trigger inside a menu item races the menu's own close-on-select
          against the dialog opening. */}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
          <DialogTitle className="sr-only">Security</DialogTitle>
          <SecurityPanel onDone={() => setSecurityOpen(false)} />
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* The trigger itself stays visible at every breakpoint — unlike the old separate
              admin/security/sign-out icon buttons, which were `hidden sm:flex` and simply
              disappeared on mobile with no other way to reach them. */}
          <button className={`flex items-center gap-1.5 h-11 pl-2 pr-2.5 rounded-lg ${t.hoverBg} transition-colors`} type="button" title={displayName}>
            <Avatar className="h-7 w-7 ring-1 ring-white/10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-[11px] font-medium">{initials}</AvatarFallback>
            </Avatar>
            <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint} hidden lg:block`} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9 ring-1 ring-white/10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-xs font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="px-2 pb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_STYLES[role]}`}>
              <Shield className="h-3 w-3" /> {ROLE_LABELS[role]}
            </span>
          </div>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin"><Settings className="h-4 w-4" /> Admin panel</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onPreferences?.()}>
            <SlidersHorizontal className="h-4 w-4" /> Preferences
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSecurityOpen(true)}>
            <Shield className="h-4 w-4" /> Security &amp; two-factor auth
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
