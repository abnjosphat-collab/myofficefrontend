// components/Providers.test.tsx — F-15: one MotionConfig reducedMotion="user"
// around the app, so every framer-motion surface honours the OS reduce-motion
// setting. ActiveNoticesPopup is the surface that needs it: it is the only
// animated component without its own useReducedMotion check.
//
// The assertions use useReducedMotionConfig — the hook motion components
// themselves consult (context "never" forces animation, "user" follows the
// OS). The OS-reduce-asked case lives in Providers.reduced-motion.test.tsx:
// framer's OS-preference listener is a module singleton, so both values
// cannot be tested in one file.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/app-shell/mfa-ui', () => ({ GlobalMfaGate: () => null }));
vi.mock('@/components/app-shell/ServiceWorkerRegistrar', () => ({ ServiceWorkerRegistrar: () => null }));
vi.mock('@/components/ui-system', () => ({
  AppearanceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  ConfirmProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/shared/floor/FloorProvider', () => ({
  FloorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const motionConfigSeen: Array<{ reducedMotion?: string }> = [];
vi.mock('framer-motion', async (importOriginal) => {
  const orig = await importOriginal<typeof import('framer-motion')>();
  // Capture the props but render the real MotionConfig, so the context it
  // provides (which useReducedMotionConfig reads) behaves as in the app.
  const Capturing = ({ children, ...rest }: { children: ReactNode; reducedMotion?: 'user' | 'never' | 'always' }) => {
    motionConfigSeen.push(rest);
    const Orig = orig.MotionConfig;
    return <Orig {...rest}>{children}</Orig>;
  };
  return { ...orig, MotionConfig: Capturing };
});

import { Providers } from '@/components/Providers';
import { useReducedMotionConfig } from 'framer-motion';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
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

describe('Providers motion config (F-15)', () => {
  it('wraps the app in MotionConfig reducedMotion="user"', () => {
    motionConfigSeen.length = 0;
    render(<Providers><ReduceProbe /></Providers>);
    expect(screen.getByTestId('reduce')).toBeInTheDocument();
    expect(motionConfigSeen.length).toBeGreaterThan(0);
    expect(motionConfigSeen[0].reducedMotion).toBe('user');
  });

  it('leaves motion on when the OS does not ask', () => {
    render(<Providers><ReduceProbe /></Providers>);
    expect(screen.getByTestId('reduce')).toHaveTextContent('false');
  });
});
