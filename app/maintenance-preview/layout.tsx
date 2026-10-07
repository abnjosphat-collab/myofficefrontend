// app/maintenance-preview/layout.tsx — shell and shared example state for the whole preview.
'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { PreviewProvider } from './store';

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <AppShell migrated><PreviewProvider>{children}</PreviewProvider></AppShell>;
}
