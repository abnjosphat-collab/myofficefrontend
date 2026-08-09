'use client';
// components/shared/RequireAuth.tsx — gate a page behind "must be signed in",
// no role required (unlike app/admin/page.tsx's isAtLeast('admin') gate, which is
// role-specific and stays hand-rolled there). Wrap the page's real content with
// this instead of AppShell's own chrome doing the check — AppShell itself has no
// auth logic at all, so any page using it is otherwise publicly viewable.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/shared/theme';
import { RefreshCw } from '@/components/shared/theme';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTheme();

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} />
      </div>
    );
  }

  return <>{children}</>;
}
