// components/Providers.tsx — client boundary that wraps the server layout
'use client';

import { AuthProvider } from '@/lib/auth-context';
import { GlobalMfaGate } from '@/components/app-shell/mfa-ui';
import { ThemeProvider, IconStyleProvider, FontStyleProvider, FontScaleProvider, ConfirmProvider } from '@/components/shared/theme';
import { ServiceWorkerRegistrar } from '@/components/app-shell/ServiceWorkerRegistrar';
import { AppearanceProvider, ConfirmProvider as UiConfirmProvider, TooltipProvider } from '@/components/ui-system';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistrar />
      {/* Full-screen 2FA prompt, rendered whenever a session exists but hasn't
          cleared its challenge yet — see lib/auth-context.tsx applySession(). */}
      <GlobalMfaGate />
      <ThemeProvider>
        <IconStyleProvider>
          <FontStyleProvider>
            <FontScaleProvider>
              <ConfirmProvider>
                <AppearanceProvider>
                  <TooltipProvider>
                    <UiConfirmProvider>{children}</UiConfirmProvider>
                  </TooltipProvider>
                </AppearanceProvider>
              </ConfirmProvider>
            </FontScaleProvider>
          </FontStyleProvider>
        </IconStyleProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
