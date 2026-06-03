'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, upsertProfile, getProfile, roleAtLeast } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/lib/supabase';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthState {
  user:        User | null;
  session:     Session | null;
  profile:     UserProfile | null;
  role:        UserRole;
  loading:     boolean;
  /** Sign in with Google OAuth (redirects to Google then back to /auth/callback) */
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
  /** Reload profile from DB (call after an admin changes your role) */
  refreshProfile:   () => Promise<void>;
  // Convenience role helpers
  isSuperAdmin: boolean;
  isAdmin:      boolean;
  isManager:    boolean;
  /** Can approve/reject requests, change statuses */
  canApprove:   boolean;
  /** Can delete records */
  canDelete:    boolean;
  /** Can manage employees / sensitive data */
  canManage:    boolean;
  /** True if user has at least the given role */
  hasRole: (minRole: UserRole) => boolean;
}

const defaultState: AuthState = {
  user:             null,
  session:          null,
  profile:          null,
  role:             'viewer',
  loading:          true,
  signInWithGoogle: async () => {},
  signOut:          async () => {},
  refreshProfile:   async () => {},
  isSuperAdmin: false,
  isAdmin:      false,
  isManager:    false,
  canApprove:   false,
  canDelete:    false,
  canManage:    false,
  hasRole: () => false,
};

const AuthContext = createContext<AuthState>(defaultState);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const p = await upsertProfile({
      id:            u.id,
      email:         u.email,
      user_metadata: u.user_metadata,
    });
    setProfile(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    setProfile(p);
  }, [user]);

  // Bootstrap: load session on mount, then listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:  `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const role: UserRole = profile?.role ?? 'viewer';
  const hasRole = (minRole: UserRole) => roleAtLeast(role, minRole);

  const value: AuthState = {
    user,
    session,
    profile,
    role,
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile,
    isSuperAdmin: role === 'super_admin',
    isAdmin:      hasRole('admin'),
    isManager:    hasRole('manager'),
    canApprove:   hasRole('manager'),
    canDelete:    hasRole('admin'),
    canManage:    hasRole('admin'),
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
