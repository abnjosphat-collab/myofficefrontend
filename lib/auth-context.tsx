// lib/auth-context.tsx — Supabase auth context + role/permission helpers
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile, UserRole, ROLE_ORDER, roleAtLeast, upsertProfile, getProfile } from './supabase';
import { needsChallenge } from './mfa';

// ─── Module permission catalogue ─────────────────────────────────────────────

export const MODULE_ACTIONS: Record<string, string[]> = {
  employees:      ['view', 'edit', 'delete'],
  equipment:      ['view', 'edit', 'delete'],
  inventory:      ['view', 'edit', 'delete'],
  documents:      ['view', 'edit', 'delete'],
  maintenance:    ['view', 'edit', 'approve'],
  breakdowns:     ['view', 'edit'],
  spares:         ['view', 'edit'],
  timesheets:     ['view', 'edit', 'approve'],
  overtime:       ['view', 'approve'],
  leaves:         ['view', 'approve'],
  ppe:            ['view', 'edit', 'approve'],
  sheq:           ['view', 'edit'],
  reports:        ['view', 'export'],
  noticeboard:    ['view', 'post'],
};

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user:    User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  // True from the moment a session exists until its 2FA challenge (if any) is
  // cleared. `user`/`session` stay null the whole time — see the comment on
  // applySession() for why this has to be the single place MFA is enforced.
  mfaPending: boolean;
  completeMfaChallenge: () => Promise<void>;
  signInWithGoogle:  () => Promise<void>;
  signInWithEmail:   (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail:   (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut:           () => Promise<void>;
  refreshProfile:    () => Promise<void>;
  hasPermission:     (module: string, action: string) => boolean;
  isAtLeast:         (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,       setUser]       = useState<User | null>(null);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [session,    setSession]    = useState<Session | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  const loadProfile = async (u: User) => {
    const p = await upsertProfile(u);
    setProfile(p);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    if (p) setProfile(p);
  };

  // The single place a session is allowed to become "signed in". Every path
  // that can produce a session (initial load, password/OAuth sign-in, token
  // refresh, post-challenge elevation) funnels through here so MFA can only
  // be enforced or bypassed in one place, not re-implemented per login form.
  //
  // This used to live as local state in each login form (check needsChallenge()
  // after signInWithPassword, hold a 6-digit-code screen in front of the rest
  // of the UI). That doesn't work: Supabase treats "has a valid session" as
  // signed in regardless of AAL, so the moment signInWithPassword() resolves,
  // this exact onAuthStateChange listener already fires and sets `user` —
  // which flips isLoggedIn everywhere in the app, including inside the login
  // form itself, unmounting the very component holding the "still need a
  // code" state before it ever gets to render it. No error, no failed
  // request — the form component (and its local state) is just gone.
  //
  // Gating here instead means `user`/`session` never become non-null until
  // the challenge clears, so nothing downstream can ever observe a
  // half-authenticated state, independent of which UI triggered the sign-in.
  const applySession = async (next: Session | null) => {
    if (!next) {
      setSession(null); setUser(null); setProfile(null); setMfaPending(false);
      return;
    }
    let requiresChallenge = false;
    try { requiresChallenge = await needsChallenge(); }
    catch { /* if the check itself fails, don't lock the user out */ }

    if (requiresChallenge) {
      setMfaPending(true);
      return; // user/session stay null — nothing is "signed in" yet
    }
    setMfaPending(false);
    setSession(next);
    setUser(next.user);
    await loadProfile(next.user);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session).finally(() => setLoading(false));
    });

    // Live session changes (sign-in, sign-out, token refresh, MFA verify).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called by the global MFA gate after a successful challenge verify. The
  // verify call elevates the client's session to aal2, which should already
  // retrigger the onAuthStateChange listener above — this is a direct,
  // synchronous confirmation so the UI doesn't wait on that firing.
  const completeMfaChallenge = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await applySession(session);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Returns true if user has explicit permission OR is admin/super_admin
  const hasPermission = (module: string, action: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'admin') return true;
    const perms = profile.permissions?.[module] ?? [];
    return perms.includes(action) || perms.includes('*');
  };

  const isAtLeast = (role: UserRole): boolean => {
    if (!profile) return false;
    return ROLE_ORDER.indexOf(profile.role) >= ROLE_ORDER.indexOf(role);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, mfaPending, completeMfaChallenge,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
      refreshProfile, hasPermission, isAtLeast,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export { roleAtLeast };
export type { UserRole, UserProfile };
