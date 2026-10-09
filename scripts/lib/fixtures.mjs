// Shared fixtures for authenticated-render checks: a fake Supabase session (no real sign-in, no live data).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const env = Object.fromEntries(fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const supabaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const storageKey = `sb-${supabaseUrl.hostname.split('.')[0]}-auth-token`;
const now = Math.floor(Date.now() / 1000);
const user = { id: '00000000-0000-4000-8000-000000000009', aud: 'authenticated', role: 'authenticated', email: 'shell-check@example.invalid', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Shell Check' }, created_at: new Date().toISOString() };
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ aud: 'authenticated', exp: now + 3600, iat: now, sub: user.id, email: user.email, role: 'authenticated', aal: 'aal1' })}.fixture`;
const session = { access_token: token, refresh_token: 'fixture', expires_in: 3600, expires_at: now + 3600, token_type: 'bearer', user };


export { chromium };

/** New browser context signed in as a fixture admin. `api(route)` handles every /api/** request. */
export async function fixtureContext(browser, api, viewport = { width: 1440, height: 900 }, { serviceWorkers = 'block', ...contextOptions } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers, ...contextOptions });
  await context.addInitScript(([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); }, [storageKey, session]);
  await context.route(`${supabaseUrl.origin}/**`, async route => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/rest/v1/user_profiles') {
      const profile = { id: user.id, email: user.email, full_name: 'Shell Check', avatar_url: null, role: 'admin', is_active: true, created_at: user.created_at };
      // .single()/.maybeSingle() ask PostgREST for one object; list queries get an array.
      const wantsObject = /vnd\.pgrst\.object/.test(route.request().headers()['accept'] ?? '');
      return route.fulfill({ status: 200, contentType: wantsObject ? 'application/vnd.pgrst.object+json' : 'application/json', headers: { 'content-range': '0-0/1' }, body: JSON.stringify(wantsObject ? profile : [profile]) });
    }
    if (pathname === '/auth/v1/user') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await context.route('**/api/**', api);
  return context;
}

export const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Mock API: `data[pathname]` is the body (or a function (request) => body | {status, body}); unknown paths return []. */
export function makeHandler(data, calls) {
  return async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    calls.push({ method: request.method(), pathname, query: new URL(request.url()).search, body: request.method() === 'GET' ? null : safeJson(request) });
    const entry = data[`${request.method()} ${pathname}`] ?? data[pathname];
    const value = typeof entry === 'function' ? entry(request, calls) : entry;
    if (value === undefined) return json(route, []);
    if (value && typeof value === 'object' && '__status' in value) return route.fulfill({ status: value.__status, contentType: 'application/json', body: JSON.stringify(value.body ?? { detail: 'error' }) });
    return json(route, value);
  };
}
const safeJson = request => { try { return request.postDataJSON(); } catch { return null; } };
