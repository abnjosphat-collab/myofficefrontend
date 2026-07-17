// app/auth/callback/page.tsx — handles Google OAuth PKCE code exchange
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

    if (code) {
      // Just exchange the code and go — if this account has 2FA enrolled,
      // AuthContext holds user/session at null until the challenge clears, and
      // GlobalMfaGate (mounted at the root, so it's already on this page too)
      // takes over automatically. It used to gate the redirect locally here,
      // which duplicated the exact race that broke the password-login form —
      // see applySession() in lib/auth-context.tsx.
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) console.error('[auth/callback]', error.message);
        router.replace(next);
      });
    } else {
      router.replace('/');
    }
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
