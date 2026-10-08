// components/MyOfficeAccessBoundary.tsx — the gate in front of every MyOffice module: a quiet check while the session loads, then the
// sign-in card for anyone who is not signed in. Tools & Equipment and the sign-in pages are public (lib/accessPaths.ts).
'use client';

import { usePathname } from 'next/navigation';
import { LoadingPulse } from '@/components/ui-system';
import { AuthForm } from '@/components/app-shell/auth/AuthForm';
import { AuthCard, AuthPage } from '@/components/app-shell/auth/AuthLayout';
import { useAuth } from '@/lib/auth-context';
import { isPublicWorkspacePath } from '@/lib/accessPaths';

export function MyOfficeAccessBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (isPublicWorkspacePath(pathname)) return <>{children}</>;

  if (loading) {
    return <LoadingPulse screen label="Checking MyOffice access" />;
  }

  if (!user) {
    return (
      <AuthPage back>
        <AuthCard title="Sign in to MyOffice" description="Tools & Equipment stays open as its own workspace. The other modules need an authorised account." headingId="myoffice-access-title">
          <AuthForm defaultMode="login" redirectTo={pathname} />
        </AuthCard>
      </AuthPage>
    );
  }

  return <>{children}</>;
}
