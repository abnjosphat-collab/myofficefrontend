// components/Providers.reduced-motion.test.tsx — F-15 companion: with the OS
// asking for reduced motion, the app's MotionProvider (MotionConfig
// reducedMotion="user") must report reduce-motion to motion components.
// Separate file from Providers.test.tsx because framer's OS-preference
// listener is a module singleton initialised once per file.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/app-shell/mfa-ui', () => ({ GlobalMfaGate: () => null }));
vi.mock('@/components/app-shell/ServiceWorkerRegistrar', () => ({ ServiceWorkerRegistrar: () => null }));
vi.mock('@/components/ui-system', async () => {
  // The real MotionProvider (the wiring under test); the neighbouring
  // providers are passthroughs so this file observes motion config only.
  const { MotionProvider } = await import('@/components/ui-system/motion/MotionProvider');
  return {
    AppearanceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    ConfirmProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    MotionProvider,
  };
});
vi.mock('@/components/shared/floor/FloorProvider', () => ({
  FloorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('framer-motion', async (importOriginal) => {
  // Real module, unmodified: this test observes true framer behaviour.
  return await importOriginal<typeof import('framer-motion')>();
});

import { Providers } from '@/components/Providers';
import { useReducedMotionConfig } from 'framer-motion';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

function ReduceProbe() {
  const reduce = useReducedMotionConfig();
  return <div data-testid="reduce">{String(reduce)}</div>;
}

describe('Providers motion config with OS reduce-motion (F-15)', () => {
  it('reports reduce-motion when the OS asks for it', () => {
    render(<Providers><ReduceProbe /></Providers>);
    expect(screen.getByTestId('reduce')).toHaveTextContent('true');
  });
});
