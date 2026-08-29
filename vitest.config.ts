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
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx', 'app/**/*.test.ts', 'app/**/*.test.tsx', 'components/**/*.test.ts', 'components/**/*.test.tsx'],
    // Report-only for now (no threshold) — the point right now is making coverage
    // visible instead of guessed, not gating on it. `include` above scopes what
    // actually gets *run*; this scopes what shows up in the coverage report, so a
    // real % is measured against the app's source rather than just the tested files.
    coverage: {
      provider: 'v8',
      // Explicit extensions, not a blanket `app/**` — this tree also holds a couple
      // of deliberately shelved pages (*.disabled, *.paused) and non-code files
      // (README.md, a stray .code-workspace) that aren't real source and choke the
      // coverage parser if swept in.
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/types.ts'],
    },
  },
});
