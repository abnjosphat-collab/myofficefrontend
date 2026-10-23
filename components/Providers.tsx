// components/Providers.tsx — client boundary that wraps the server layout
'use client';

import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/lib/auth-context';
import { GlobalMfaGate } from '@/components/app-shell/mfa-ui';
import { ServiceWorkerRegistrar } from '@/components/app-shell/ServiceWorkerRegistrar';
import { AppearanceProvider, ConfirmProvider, TooltipProvider } from '@/components/ui-system';
import { FloorProvider } from '@/components/shared/floor/FloorProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistrar />
      {/* Full-screen 2FA prompt, rendered whenever a session exists but hasn't
          cleared its challenge yet — see lib/auth-context.tsx applySession(). */}
      <GlobalMfaGate />
      {/* One MotionConfig for the app (F-15): framer-motion's default is
          reducedMotion="never", which animated past the OS setting. */}
      <MotionConfig reducedMotion="user">
        <AppearanceProvider>
          <TooltipProvider>
            <ConfirmProvider><FloorProvider>{children}</FloorProvider></ConfirmProvider>
          </TooltipProvider>
        </AppearanceProvider>
      </MotionConfig>
    </AuthProvider>
  );
}
