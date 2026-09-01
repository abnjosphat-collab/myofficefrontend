// lib/sections.ts — the Mechanical/Electrical/Civil/Instrumentation employee-section
// categorization, canonically defined in app/employees/page.tsx and since re-implemented
// (with small drift — e.g. overtime's Electrical hex diverged from employees') in
// app/overtime/page.tsx, app/pto/page.tsx and components/safety/index.tsx. This is the
// shared extraction: new call sites (e.g. app/ppe) should import from here rather than
// add a 5th copy. The 4 existing duplicates aren't migrated here — out of scope for
// whichever feature prompted this file; migrate one opportunistically when it's next
// touched, the same way calcX.ts extraction happens elsewhere in this app.
import { ACCENT_HEX } from '@/components/shared/theme';

/** Stable display order for the section groups. */
export const SECTION_ORDER = ['Mechanical', 'Electrical', 'Civil', 'Instrumentation'];

export const SECTION_COLORS: Record<string, string> = {
  Mechanical: ACCENT_HEX.blue, Electrical: ACCENT_HEX.amber, Civil: ACCENT_HEX.emerald, Instrumentation: ACCENT_HEX.violet,
};

// Case/whitespace-insensitive canonicalization — source data has inconsistent casing
// ("Electrical" vs "electrical "), so every display label AND every color lookup for a
// section must go through this so the same real-world section always reads as one group.
export function normalizeSection(section?: string): string {
  const s = (section || '').trim();
  if (!s) return 'Unassigned';
  const canonical = SECTION_ORDER.find(c => c.toLowerCase() === s.toLowerCase());
  return canonical ?? s;
}

// A stable, non-arbitrary color for a section outside the 4 predefined ones — hashed
// from the shared ACCENT_HEX brand palette so the same unlisted section name always
// gets the same color rather than a new one per render.
const GROUP_PALETTE = [ACCENT_HEX.blue, ACCENT_HEX.amber, ACCENT_HEX.emerald, ACCENT_HEX.violet, ACCENT_HEX.cyan, ACCENT_HEX.indigo];
export function sectionColor(section?: string): string {
  const s = normalizeSection(section);
  if (s === 'Unassigned') return '#94a3b8';
  if (SECTION_COLORS[s]) return SECTION_COLORS[s];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
}
