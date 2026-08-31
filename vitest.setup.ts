import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts doesn't set test.globals, so @testing-library/react's own
// auto-cleanup (which only registers if it finds afterEach on globalThis) never
// fires — without this, each render test leaves its DOM tree mounted for the next
// test, and queries like getByRole start matching leftover elements from prior tests.
afterEach(cleanup);
