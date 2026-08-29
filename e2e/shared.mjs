// e2e/shared.mjs — route discovery shared by anything that runs as a plain Node
// script (smoke.mjs today). NOT imported by visual.spec.ts — @playwright/test's
// test-file transform can't handle this file's use of `import.meta` (confirmed:
// "SyntaxError: Cannot use 'import.meta' outside a module" even for an unrelated
// export). The mocking function both suites actually share lives in mockApi.mjs
// instead, which has no import.meta dependency.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'app');

// Infra routes that render minimal/no content by design (e.g. an auth redirect handler) —
// not user-facing pages, so exclude them from route-based checks.
export const SKIP = new Set(['/auth/callback']);

// ─── Discover routes from app/**/page.tsx (skip route groups and dynamic segments) ──
export function discoverRoutes(dir = APP_DIR, prefix = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith('(') || entry.startsWith('[') || entry.startsWith('_') || entry === 'api') continue;
    const seg = `${prefix}/${entry}`;
    if (readdirSync(full).some(f => f === 'page.tsx' || f === 'page.jsx')) routes.push(seg);
    routes.push(...discoverRoutes(full, seg));
  }
  return routes;
}

export { mockApi } from './mockApi.mjs';
