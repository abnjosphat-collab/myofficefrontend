// lib/auth-context.tsx — Supabase auth context + role/permission helpers
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, UserProfile, UserRole, roleAtLeast, upsertProfile, getProfile } from './supabase';
import { profileScope, profileDepartment, profileModules } from './scope';
import { needsChallenge, MFA_REQUIRED_EVENT } from './mfa';
import { clearInputHistoryForUser, setInputHistoryUser } from './inputHistory';
import { invalidateAllLookupCaches } from '@/hooks/useLookups';

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
  isAtLeast:         (role: UserRole) => boolean;
  // The account's section limit (lib/scope.ts), or null when not limited.
  scope:             string | null;
  department:        string | null;
  modules:           string[] | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,       setUser]       = useState<User | null>(null);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [session,    setSession]    = useState<Session | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  // Typing history is keyed by account (F-13): point the store at the
  // signed-in user, or back at the shared fallback when signed out.
  // The shared lookup caches are dropped on an account change for the same
  // reason: cached rows may be the previous account's section slice.
  const lastUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = user?.id ?? null;
    setInputHistoryUser(id);
    if (lastUserId.current !== undefined && lastUserId.current !== id) invalidateAllLookupCaches();
    lastUserId.current = id;
  }, [user]);

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
    try {
      requiresChallenge = await needsChallenge();
    } catch {
      // One retry: a transient network/Auth blip must not decide this check.
      try {
        requiresChallenge = await needsChallenge();
      } catch {
        // Still unknown: never silently continue signed in (that would wave
        // an enrolled user past 2FA) — stay signed OUT with a retryable
        // notice instead of locking the user out cold.
        toast.error("We couldn't verify your sign-in security check.", {
          action: {
            label: 'Retry',
            onClick: () => { void applySession(next); },
          },
        });
        setMfaPending(false);
        return; // user/session stay null — nothing is "signed in" yet
      }
    }

    if (requiresChallenge) {
      // Clear any stale session too: when the gate re-trips on an
      // already-signed-in user (backend MFA 401), leaving user/session
      // set would keep the app fetching with an aal1 token the backend
      // now rejects. (On the initial gate they are already null.)
      setMfaPending(true);
      setSession(null); setUser(null); setProfile(null);
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

    // The backend's MFA gate (401 + X-Auth-Reason: mfa_required) reaches us
    // via apiClient, which runs outside the React tree — re-run the session
    // gate so the 6-digit prompt appears instead of a raw 401 failure.
    const onMfaRequired = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await applySession(session);
    };
    window.addEventListener(MFA_REQUIRED_EVENT, onMfaRequired);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(MFA_REQUIRED_EVENT, onMfaRequired);
    };
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
      options: {
        data: { full_name: name },
        // Explicit, matching signInWithGoogle below — without this the confirmation
        // email uses whatever default redirect is configured in the Supabase
        // dashboard, which may not be /auth/callback. That page is now the one place
        // that explicitly handles the hash-based tokens this kind of email link
        // carries (detectSessionInUrl is off — see lib/supabase.ts), so confirmation
        // needs to land there too, not wherever the dashboard default happens to be.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Typing history leaves the device with the user (F-13): clear their
    // key before the session (and the id) is gone.
    clearInputHistoryForUser(user?.id ?? '');
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAtLeast = (role: UserRole): boolean => {
    if (!profile) return false;
    return roleAtLeast(profile.role, role);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, mfaPending, completeMfaChallenge,
      signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
      refreshProfile, isAtLeast, scope: profileScope(profile), department: profileDepartment(profile), modules: profileModules(profile),
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
