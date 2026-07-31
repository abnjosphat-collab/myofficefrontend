// app/auth/callback/page.tsx — handles both Supabase auth link formats that land
// here: Google OAuth's PKCE `?code=` (exchangeCodeForSession) and invite/password-
// reset emails' implicit-flow `#access_token=...&type=...` hash (setSession). Both
// are handled explicitly and synchronously in this component on purpose —
// lib/supabase.ts turns detectSessionInUrl OFF specifically so nothing processes
// the hash in the background before this code decides where "signed in" should
// route to. See the comment there for the bug that caused (same race class as the
// MFA-gate fix in auth-context.tsx: a background listener beat this page's own
// logic to setting `user`/`session`, so an invite silently signed in and landed on
// the homepage instead of the set-password screen it was supposed to show first).
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    // Invite/recovery links land here with a session but no password set (invite)
    // or an old password the user wants to replace (recovery) — send them to set
    // one instead of straight into the app.
    const routeAfterAuth = (type: string | null) => {
      if (type === 'invite' || type === 'recovery') {
        router.replace(`/auth/set-password?next=${encodeURIComponent(next)}`);
      } else {
        router.replace(next);
      }
    };

    if (code) {
      // PKCE flow — Google OAuth today. If this account has 2FA enrolled,
      // AuthContext holds user/session at null until the challenge clears, and
      // GlobalMfaGate (mounted at the root, so it's already on this page too)
      // takes over automatically.
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) { console.error('[auth/callback]', error.message); router.replace('/'); return; }
        routeAfterAuth(searchParams.get('type'));
      });
      return;
    }

    // Implicit flow — Supabase's default invite/password-reset email template.
    // Tokens and `type` are in the hash fragment, which useSearchParams() can't see
    // (it only reads the query string) and detectSessionInUrl is off, so nothing
    // else will touch this — read and establish the session here, explicitly.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) { console.error('[auth/callback]', error.message); router.replace('/'); return; }
        routeAfterAuth(hashParams.get('type'));
      });
      return;
    }

    router.replace('/');
  }, [router, searchParams]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050f1c]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-[#86BBD8] flex items-center justify-center text-[#1e3a52] font-bold text-lg font-heading animate-pulse">
          O
        </div>
        <div className="h-6 w-6 border-2 border-white/20 border-t-[#86BBD8] rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050f1c]" />}>
      <CallbackHandler />
    </Suspense>
  );
}
