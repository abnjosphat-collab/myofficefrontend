// e2e/auth-gate.spec.ts — asserts every real page route's signed-out behavior,
// modeled on ozech's e2e/auth-gate.spec.ts pattern (route-discovery-based, found
// during the 2026-08-30 UI-consistency/ozech-comparison audit).
//
// This is NOT a copy of ozech's exact assertion, though — that project's
// convention is "every route redirects a signed-out visitor to /login," which
// myoffice's own auth model doesn't match. Traced directly (see components below)
// before writing this file:
//   - components/shared/RequireAuth.tsx is used by exactly ONE page (app/pachedu)
//     — it redirects a signed-out visitor to /login. This is the one route that
//     matches ozech's pattern.
//   - Every other AppShell-based route renders its full shell and content
//     regardless of auth state; sign-out surfaces via components/app-shell/
//     AuthMenu.tsx's "Sign In" button (hidden sm:flex — clears this suite's
//     1440x1000 viewport's sm breakpoint), not a redirect. Real data protection
//     happens at the API/401 layer (lib/apiClient.ts), not the page shell.
//   - app/admin/page.tsx is a third, hand-rolled pattern (see its own
//     `if (loading) ... if (!profile) ...` gate): renders the shell, blank main
//     content, no redirect, no crash, no data leak.
//   - app/login/page.tsx and app/auth/set-password/page.tsx have no AppShell/
//     AuthMenu at all — standalone full-screen forms (sign-in, and the
//     invite/recovery-link landing page respectively; the latter requires a
//     real session already established by auth/callback, so a raw signed-out
//     visit doesn't behave like an ordinary route either).
//
// Route discovery is inlined here rather than imported from e2e/shared.mjs,
// same reason visual.spec.ts inlines its own route-independent setup: shared.mjs
// uses import.meta.url, which @playwright/test's transform can't load from a
// .spec.ts file (confirmed error: "SyntaxError: Cannot use 'import.meta' outside
// a module"). See shared.mjs's own header comment for the same constraint.
import { test, expect, type Page } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mockApi } from './mockApi.mjs';

// Skip the first-run "Welcome — set your preferences" modal (same trick
// visual.spec.ts's preparePage() uses) — without this, the modal sits on top of
// the topbar's Sign In button, which is otherwise present in the DOM but not
// visible/interactable, and every route's assertion below fails on that alone
// rather than on anything auth-related.
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('oz_prefsSeen', '1'); } catch { /* ignore */ }
  });
}

// A dev server (and even a fresh CI production server) lazily/first-hit-compiles
// each route — 55+ sequential first-visits in this suite are far more exposed to
// that than visual.spec.ts's 4 pages. Confirmed directly: the default 30s timeout
// produced a spurious net::ERR_ABORTED on every route in one run; 60s was enough.
test.setTimeout(60_000);

const APP_DIR = join(__dirname, '..', 'app');

function discoverRoutes(dir: string = APP_DIR, prefix = ''): string[] {
  const routes: string[] = [];
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

// Named exceptions to the default "shell renders, Sign In button visible" case —
// each gets its own dedicated test below instead of the generic sweep.
const REDIRECTS_TO_LOGIN = new Set(['/pachedu']);
const NO_SHELL = new Set(['/login', '/auth/callback', '/auth/set-password']);

const allRoutes = discoverRoutes();
const defaultRoutes = allRoutes.filter(r => !REDIRECTS_TO_LOGIN.has(r) && !NO_SHELL.has(r));

test('route discovery finds a reasonable number of routes', () => {
  // Sanity floor, not a real app assertion — catches the walker itself breaking
  // (e.g. an app/ restructure) rather than a real regression.
  expect(allRoutes.length).toBeGreaterThan(50);
});

for (const path of defaultRoutes) {
  test(`${path} — signed-out visitor sees the shell + Sign In, not a crash`, async ({ page }) => {
    await skipOnboarding(page);
    await page.route('**/api/**', mockApi);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    const response = await page.goto(path, { waitUntil: 'load' });
    expect(response?.status(), `${path} responded with an error status`).toBeLessThan(400);
    await page.waitForTimeout(500);

    expect(errors, `${path} threw a pageerror for a signed-out visitor: ${errors[0]}`).toHaveLength(0);
    await expect(
      page.getByRole('button', { name: /Sign In/i }),
      `${path} didn't show the Sign In control for a signed-out visitor`
    ).toBeVisible();
  });
}

test('/pachedu redirects a signed-out visitor to /login', async ({ page }) => {
  await skipOnboarding(page);
  await page.route('**/api/**', mockApi);
  await page.goto('/pachedu', { waitUntil: 'load' });
  await expect(page).toHaveURL(/\/login(\?|$)/);
});

test('/login does not redirect away and renders the sign-in form', async ({ page }) => {
  await skipOnboarding(page);
  await page.route('**/api/**', mockApi);
  await page.goto('/login', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
});

test('/admin shows no user-management content for a signed-out visitor', async ({ page }) => {
  // Frontend half of this gate's defense-in-depth — the real enforcement is the
  // backend's require_role('admin') dependency (app/auth.py), not this page shell.
  await skipOnboarding(page);
  await page.route('**/api/**', mockApi);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const response = await page.goto('/admin', { waitUntil: 'load' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForTimeout(500);
  expect(errors).toHaveLength(0);
  await expect(page.getByRole('button', { name: /Add User|Invite/i })).not.toBeVisible();
});
