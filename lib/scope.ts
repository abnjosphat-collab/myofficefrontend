// lib/scope.ts — the viewer's section limit ("Projects", …), or null when the
// account is not limited. The server enforces it on every scoped read; the
// browser only makes it obvious (a quiet label, fixed filters, honest empty
// states). The value lives in user_profiles.permissions.scope and reaches the
// browser on the already-fetched profile row — no extra request.

/** The section limit on a profile row, or null when unlimited or malformed. */
export type AccountLimit =
  | { kind: 'section'; value: string }
  | { kind: 'department'; value: string };

export function profileLimit(
  profile: { permissions?: Record<string, unknown> | null } | null | undefined,
): AccountLimit | null {
  const raw = profile?.permissions?.scope;
  if (typeof raw === 'string') {
    const value = raw.trim();
    return value ? { kind: 'section', value } : null;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    if (typeof rec.kind === 'string' && (rec.kind === 'section' || rec.kind === 'department')) {
      const value = str(rec.value);
      return value ? { kind: rec.kind, value } : null;
    }
    const dept = str(rec.department);
    if (dept) return { kind: 'department', value: dept };
    const section = str(rec.section);
    if (section) return { kind: 'section', value: section };
  }
  return null;
}

export function profileDepartment(
  profile: { permissions?: Record<string, unknown> | null } | null | undefined,
): string | null {
  const limit = profileLimit(profile);
  return limit?.kind === 'department' ? limit.value : null;
}

export function profileModules(
  profile: { permissions?: Record<string, unknown> | null } | null | undefined,
): string[] | null {
  const raw = profile?.permissions?.modules;
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return null;
  return raw.filter((m): m is string => typeof m === 'string' && m.startsWith('/') && !/\s/.test(m));
}

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
