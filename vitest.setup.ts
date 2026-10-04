import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unit tests assert settled structure, behavior, and visibility — not animation
// timing, which is verified in the browser instead. Rendering every test in the
// genuine reduced-motion configuration keeps rAF-driven entrances deterministic
// under parallel workers instead of timing-sensitive.
vi.mock('framer-motion', async importOriginal => {
  const mod = await importOriginal<typeof import('framer-motion')>();
  return { ...mod, useReducedMotion: () => true };
});

// vitest.config.ts doesn't set test.globals, so @testing-library/react's own
// auto-cleanup (which only registers if it finds afterEach on globalThis) never
// fires — without this, each render test leaves its DOM tree mounted for the next
// test, and queries like getByRole start matching leftover elements from prior tests.
afterEach(cleanup);
