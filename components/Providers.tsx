// components/Providers.tsx — client boundary that wraps the server layout
'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider, IconStyleProvider, FontStyleProvider, ConfirmProvider } from '@/components/shared/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <IconStyleProvider>
          <FontStyleProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </FontStyleProvider>
        </IconStyleProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
