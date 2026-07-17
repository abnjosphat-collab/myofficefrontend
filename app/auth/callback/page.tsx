// app/auth/callback/page.tsx — handles Google OAuth PKCE code exchange
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { needsChallenge } from '@/lib/mfa';
import { MfaChallenge } from '@/components/app-shell/mfa-ui';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mfa, setMfa] = useState<{ next: string } | null>(null); // 2FA required before redirect

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        if (error) { console.error('[auth/callback]', error.message); router.replace(next); return; }
        // OAuth exchange succeeded; if the account has 2FA enrolled the session is
        // still aal1 — gate the redirect behind the 6-digit code.
        try {
          if (await needsChallenge()) { setMfa({ next }); return; }
        } catch { /* proceed if the check itself errors */ }
        router.replace(next);
      });
    } else {
      router.replace('/');
    }
  }, [router, searchParams]);

  if (mfa) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#050f1c] p-4">
        <div className="w-full max-w-sm">
          <MfaChallenge onVerified={() => router.replace(mfa.next)} />
        </div>
      </div>
    );
  }

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
