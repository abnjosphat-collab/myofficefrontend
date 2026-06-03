// lib/auth-context.tsx — Supabase auth context + role/permission helpers
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile, UserRole, ROLE_ORDER, roleAtLeast, upsertProfile, getProfile } from './supabase';

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
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User) => {
    const p = await upsertProfile(u);
    setProfile(p);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    if (p) setProfile(p);
  };

  useEffect(() => {
    // Initial session restore
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user).finally(() => setLoading(false));
      else setLoading(false);
    });

    // Live session changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      user, profile, session, loading,
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
