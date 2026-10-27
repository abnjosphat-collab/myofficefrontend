// MotionProvider: reducedMotion="user" + the smooth default transition, with
// an opt-in "always" for the gallery's simulated reduce-motion switch.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const seen: Array<{ reducedMotion?: string; transition?: unknown }> = [];
vi.mock('framer-motion', async (importOriginal) => {
  const orig = await importOriginal<typeof import('framer-motion')>();
  const Capturing = ({ children, ...rest }: { children: ReactNode }) => {
    seen.push(rest as { reducedMotion?: string });
    const Orig = orig.MotionConfig;
    return <Orig {...rest}>{children}</Orig>;
  };
  return { ...orig, MotionConfig: Capturing };
});

import { MotionProvider } from './MotionProvider';

describe('MotionProvider', () => {
  it('follows the OS with the smooth default', () => {
    seen.length = 0;
    render(<MotionProvider>app</MotionProvider>);
    expect(seen[0].reducedMotion).toBe('user');
    expect(seen[0].transition).toEqual({ type: 'spring', visualDuration: 0.3, bounce: 0 });
  });

  it('forces reduced motion when asked (gallery simulation)', () => {
    seen.length = 0;
    render(<MotionProvider motion="always">preview</MotionProvider>);
    expect(seen[0].reducedMotion).toBe('always');
  });
});
