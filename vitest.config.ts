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
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
  },
});
