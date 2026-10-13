// lib/sections.ts — Mechanical / Electrical / Planning employee-section categorization.
// Legacy Civil and Instrumentation values are mapped on read so old records group
// correctly until migrated via the Employees form.
// G7: sectionColor/SECTION_COLORS/GROUP_PALETTE deleted (no consumer; charts read chartColor directly).

/** Stable display order for the section groups. */
export const SECTION_ORDER: string[] = ['Management', 'Mechanical', 'Electrical', 'Planning'];

/** Legacy section names → current canonical section (keys are lowercased). */
const SECTION_ALIASES: Record<string, string> = {
  civil: 'Planning',
  instrumentation: 'Electrical',
};

// Case/whitespace-insensitive canonicalization — source data has inconsistent casing
// ("Electrical" vs "electrical "), so every display label for a section must go
// through this so the same real-world section always reads as one group.
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
