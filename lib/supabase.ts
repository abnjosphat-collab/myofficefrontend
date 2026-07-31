// lib/supabase.ts — browser Supabase client (auth only; all DB ops go through FastAPI,
// which has its own connection via the backend's supabase_client.py — this file is
// unrelated to that and only powers browser-side auth calls like sign-in/sign-up).
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createClient() throws synchronously on an empty/invalid URL, and this module is
// imported (transitively, via AuthContext) from pages across the app — so a missing
// env var here doesn't just break auth, it crashes prerendering for every page and
// fails the whole Vercel build. Fall back to a syntactically valid placeholder so the
// build always succeeds; real auth still requires NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY to be set in the Vercel project's env vars.
if (!url || !key) {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — ' +
    'browser-side auth (sign-in/sign-up) will not work until they are configured.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-anon-key', {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
});

// ─── Role types ───────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  manager:     'Manager',
  user:        'User',
  viewer:      'Viewer',
};

// Ordered lowest → highest
export const ROLE_ORDER: UserRole[] = ['viewer', 'user', 'manager', 'admin', 'super_admin'];

export function roleAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

export interface UserProfile {
  id:          string;
  email:       string;
  full_name:   string | null;
  avatar_url:  string | null;
  role:        UserRole;
  created_at:  string;
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

/**
 * Fetch or create the user_profiles row for the signed-in user.
 * Called once immediately after OAuth sign-in completes.
 */
export async function upsertProfile(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<UserProfile | null> {
  const email      = user.email ?? '';
  const full_name  = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
  const avatar_url = (user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null) as string | null;

  // Check for existing profile first (most common path after first login)
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) return existing as UserProfile;

  // First ever sign-in → insert new profile; role defaults to 'user' (see DB migration)
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ id: user.id, email, full_name, avatar_url })
    .select()
    .single();

  if (error) {
    console.error('[auth] upsertProfile:', error.message);
    return null;
  }
  return data as UserProfile;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return (data ?? null) as UserProfile | null;
}
