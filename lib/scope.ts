// lib/scope.ts — the viewer's section limit ("Projects", …), or null when the
// account is not limited. The server enforces it on every scoped read; the
// browser only makes it obvious (a quiet label, fixed filters, honest empty
// states). The value lives in user_profiles.permissions.scope and reaches the
// browser on the already-fetched profile row — no extra request.

/** The section limit on a profile row, or null when unlimited or malformed. */
export function profileScope(
  profile: { permissions?: Record<string, unknown> | null } | null | undefined,
): string | null {
  const raw = profile?.permissions?.scope;
  if (typeof raw !== 'string') return null;
  return raw.trim() || null;
}

/** Trial flags on a profile row (`permissions.features`), or [] when absent or malformed. */
export function profileFeatures(
  profile: { permissions?: Record<string, unknown> | null } | null | undefined,
): string[] {
  const raw = profile?.permissions?.features;
  if (!Array.isArray(raw)) return [];
  return raw.filter((flag): flag is string => typeof flag === 'string');
}
