// components/Providers.tsx — client boundary that wraps the server layout
'use client';

import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/shared/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthProvider>
  );
}
