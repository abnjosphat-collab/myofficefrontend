// components/Providers.tsx — client boundary that wraps the server layout
'use client';

import { AuthProvider } from '@/lib/auth-context';
import { GlobalMfaGate } from '@/components/app-shell/mfa-ui';
import { ServiceWorkerRegistrar } from '@/components/app-shell/ServiceWorkerRegistrar';
import { AppearanceProvider, ConfirmProvider, TooltipProvider } from '@/components/ui-system';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistrar />
      {/* Full-screen 2FA prompt, rendered whenever a session exists but hasn't
          cleared its challenge yet — see lib/auth-context.tsx applySession(). */}
      <GlobalMfaGate />
      <AppearanceProvider>
        <TooltipProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </TooltipProvider>
      </AppearanceProvider>
    </AuthProvider>
  );
}
