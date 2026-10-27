// lib/api.test.ts — authFetch(): the single helper that attaches the signed-in
// user's Supabase token to write requests across the whole app. Mocks the supabase
// module so we can drive the session state, and captures what headers fetch() sees.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Control what supabase.auth.getSession() returns per-test.
const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

import { authFetch, isMutationInFlight } from '@/lib/api';

describe('authFetch', () => {
  let captured: { url: string; headers: Headers } | null;

  beforeEach(() => {
    captured = null;
    getSession.mockReset();
    // Stub global fetch to capture what authFetch passes through.
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      captured = { url, headers: new Headers(init.headers) };
      return new Response('{}', { status: 200 });
    });
  });

  it('attaches a Bearer token when a session exists', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'abc123' } } });
    await authFetch('http://x/api/thing', { method: 'POST' });
    expect(captured!.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('omits Authorization when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await authFetch('http://x/api/thing', { method: 'POST' });
    expect(captured!.headers.get('Authorization')).toBeNull();
  });

  it('preserves existing headers alongside the auth header', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'xyz' } } });
    await authFetch('http://x/api/thing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(captured!.headers.get('Content-Type')).toBe('application/json');
    expect(captured!.headers.get('Authorization')).toBe('Bearer xyz');
  });

  it('passes the URL and method through unchanged', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const res = await authFetch('http://x/api/thing', { method: 'DELETE' });
    expect(captured!.url).toBe('http://x/api/thing');
    expect(res.status).toBe(200);
  });

  it('reports a write in flight until it settles, so background ticks skip it', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    let release!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(r => { release = r; }));
    expect(isMutationInFlight()).toBe(false);
    const pending = authFetch('http://x/api/thing', { method: 'POST', body: '{}' });
    await Promise.resolve();
    expect(isMutationInFlight()).toBe(true);
    release(new Response('{}', { status: 200 }));
    await pending;
    expect(isMutationInFlight()).toBe(false);
  });

  it('releases the counter when a write fails', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal('fetch', async () => { throw new Error('No connection'); });
    await expect(authFetch('http://x/api/thing', { method: 'PATCH', body: '{}' })).rejects.toThrow('No connection');
    expect(isMutationInFlight()).toBe(false);
  });

  it.each([undefined, 'GET', 'HEAD'])('never counts a %s read as a mutation', async method => {
    getSession.mockResolvedValue({ data: { session: null } });
    let release!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(r => { release = r; }));
    const pending = authFetch('http://x/api/thing', method === undefined ? {} : { method });
    await Promise.resolve();
    expect(isMutationInFlight()).toBe(false);
    release(new Response('{}', { status: 200 }));
    await pending;
  });
});
