// app/login/page.tsx — standalone sign-in page.
//
// Sign-in has always lived only in the header's AuthMenu dialog (and its trigger is
// hidden on small screens), so nothing could *link* to logging in: a feature that got
// a 401 had nowhere to send the user. This page is that destination —
// /login?next=/maintenance returns you to where you were headed after signing in.
// The 401 toast in lib/apiClient.ts points here.
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/app-shell/AuthMenu';
import { useAuth } from '@/lib/auth-context';

/** Only allow same-app relative paths — a full URL in ?next= would be an open redirect. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

function LoginContent() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { user, loading } = useAuth();

  // Already signed in (e.g. an old tab landed here) — nothing to do, go to the target.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050f1c] p-4">
      <div className="w-full max-w-sm">
        <AuthForm defaultMode="login" redirectTo={next} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050f1c]" />}>
      <LoginContent />
    </Suspense>
  );
}
