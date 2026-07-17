// lib/api.ts — authenticated fetch helper.
//
// The backend now requires a signed-in user's Bearer token on every write
// endpoint (POST/PUT/PATCH/DELETE) — previously only app/leaves/page.tsx
// attached one, and only for the approve/reject action. Every other write
// call across the app sent no token at all, which now fails with a 401.
//
// authFetch() is a drop-in replacement for fetch() that automatically
// attaches the current Supabase session's access token (the same call
// leaves.tsx already used — `supabase.auth.getSession()` — just generalized
// and reusable instead of copy-pasted per page). GET/read calls don't need
// this; only use it for writes.
import { supabase } from './supabase';

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
