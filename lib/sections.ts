// lib/sections.ts — Mechanical / Electrical / Planning employee-section categorization.
// Legacy Civil and Instrumentation values are mapped on read so old records group
// correctly until migrated via the Employees form.
import { ACCENT_HEX } from '@/components/shared/theme';

/** Stable display order for the section groups. */
export const SECTION_ORDER: string[] = ['Management', 'Mechanical', 'Electrical', 'Planning'];

/** Legacy section names → current canonical section (keys are lowercased). */
const SECTION_ALIASES: Record<string, string> = {
  civil: 'Planning',
  instrumentation: 'Electrical',
};

export const SECTION_COLORS: Record<string, string> = {
  Management: ACCENT_HEX.indigo,
  Mechanical: ACCENT_HEX.blue,
  Electrical: ACCENT_HEX.amber,
  Planning: ACCENT_HEX.emerald,
  // Legacy — kept so unmigrated rows still color consistently
  Civil: ACCENT_HEX.emerald,
  Instrumentation: ACCENT_HEX.violet,
};

// Case/whitespace-insensitive canonicalization — source data has inconsistent casing
// ("Electrical" vs "electrical "), so every display label AND every color lookup for a
// section must go through this so the same real-world section always reads as one group.
export function normalizeSection(section?: string): string {
  const s = (section || '').trim();
  if (!s) return 'Unassigned';
  const alias = SECTION_ALIASES[s.toLowerCase()];
  if (alias) return alias;
  const canonical = SECTION_ORDER.find(c => c.toLowerCase() === s.toLowerCase());
  return canonical ?? s;
}

/** Dropdown options for the Employees form. */
export function sectionSelectOptions(current?: string | null): { value: string; label: string }[] {
  const normalized = normalizeSection(current ?? undefined);
  const opts: { value: string; label: string }[] = SECTION_ORDER.map(s => ({ value: s, label: s }));
  if (normalized && normalized !== 'Unassigned' && !SECTION_ORDER.includes(normalized)) {
    opts.unshift({ value: normalized, label: `${normalized} (legacy)` });
  }
  return [{ value: '', label: 'None' }, ...opts];
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
