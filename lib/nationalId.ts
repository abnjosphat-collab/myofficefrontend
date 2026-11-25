// lib/nationalId.ts — national ID normalisation (never validation).
//
// The register holds IDs in many typed shapes ("21 - 275641 v21",
// "21-275641-V21"); this unifies them to upper-case dash-separated form
// ("21-275641-V21") without ever rejecting input: shape-checking the
// official structure is explicitly out of scope (owner decision).
// The backend mirrors this rule on its write paths.
export function normalizeNationalId(raw?: string | null): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  return trimmed
    .toUpperCase()
    .replace(/[\s./_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
