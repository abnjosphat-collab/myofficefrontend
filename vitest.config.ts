import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Vitest config for unit-testing pure/logic modules (lib/*). jsdom gives us
// window/localStorage for the usage-analytics store; the `@` alias mirrors the
// tsconfig "@/*" -> "./*" mapping so tests import the same way app code does.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Component tests drive real user interactions through Radix (dialogs, selects, menus). A test that takes
    // 1–2 s alone can pass 5 s under coverage instrumentation on a two-core CI runner, so the default made the
    // result depend on machine load. 15 s still fails a test that genuinely hangs.
    testTimeout: 15_000,
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx', 'components/**/*.test.ts', 'components/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Explicit extensions, not a blanket `app/**` — this tree also holds a couple
      // of deliberately shelved pages (*.disabled, *.paused) and non-code files
      // (README.md, a stray .code-workspace) that aren't real source and choke the
      // coverage parser if swept in.
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/types.ts'],
      // A ratchet, not a target: just under the measured figures (18 Oct 2026: 35.71 / 34.82 / 28.12 / 38.97 %),
      // so coverage can only rise. Raise these whenever a change lifts the totals; never lower them to pass.
      thresholds: {
        statements: 35,
        branches: 34,
        functions: 28,
        lines: 38,
      },
    },
  },
});
