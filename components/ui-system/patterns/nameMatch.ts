// components/ui-system/patterns/nameMatch.ts — how a typed name finds people: which suggestions show, in what order, and what
// completes inline. Pure, so every name field ranks the same way and the rules are tested without a screen.

export interface NameSuggestion {
  /** What a pick stores (a register row id, or the name itself for free-text fields). */
  value: string;
  /** The full name, written into the box when picked. */
  label: string;
  /** Under the name: mine number and designation. */
  description?: string;
  /** Other things the person can be found by (the mine number). Matched by prefix, never completed inline. */
  keywords?: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * How well one suggestion fits the query, lower is better, null for no match.
 * 0: the name starts with what was typed ("ann al" → Ann Alpha), the only kind that completes inline.
 * 1: every typed word starts a word of the name, in any order ("alpha" or "alp an" → Ann Alpha).
 * 2: the mine number starts with it ("c00" → C001), ignoring dashes and spaces.
 * 3: the name merely contains it.
 */
export function nameScore(s: NameSuggestion, query: string): number | null {
  const q = norm(query);
  if (!q) return null;
  const label = norm(s.label);
  if (label.startsWith(q)) return 0;
  const words = label.split(' ');
  const used = new Set<number>();
  const allPrefix = q.split(' ').every(token => {
    const at = words.findIndex((w, i) => !used.has(i) && w.startsWith(token));
    if (at < 0) return false;
    used.add(at);
    return true;
  });
  if (allPrefix) return 1;
  const cq = compact(query);
  if (cq && (s.keywords ?? []).some(k => compact(k).startsWith(cq))) return 2;
  if (label.includes(q)) return 3;
  return null;
}

/**
 * The suggestions for a query, best first. With nothing typed, the recent people (in their recent order).
 * Ties keep recent people first, then go alphabetical.
 */
export function rankNames(options: readonly NameSuggestion[], query: string, recent: readonly string[] = [], limit = 8): NameSuggestion[] {
  const recentRank = new Map(recent.map((v, i) => [v, i] as const));
  if (!norm(query)) {
    return options.filter(o => recentRank.has(o.value)).sort((a, b) => recentRank.get(a.value)! - recentRank.get(b.value)!).slice(0, limit);
  }
  const scored: { o: NameSuggestion; score: number }[] = [];
  for (const o of options) {
    const score = nameScore(o, query);
    if (score !== null) scored.push({ o, score });
  }
  const r = (v: string) => recentRank.get(v) ?? Number.MAX_SAFE_INTEGER;
  scored.sort((a, b) => a.score - b.score || r(a.o.value) - r(b.o.value) || a.o.label.localeCompare(b.o.label));
  return scored.slice(0, limit).map(x => x.o);
}

/** The rest of the name to draw after what was typed, when the name starts with it; '' otherwise. Case is the name's own. */
export function inlineCompletion(label: string, typed: string): string {
  if (!typed || typed.length >= label.length) return '';
  return label.toLowerCase().startsWith(typed.toLowerCase()) ? label.slice(typed.length) : '';
}

/**
 * A comma list of names ("Ann Alpha, Ze"): the part being typed is the last one. Returns what comes before it (kept as is) and
 * the part itself, so a pick replaces only the last name.
 */
export function lastListPart(text: string): { head: string; part: string } {
  const at = text.lastIndexOf(',');
  if (at < 0) return { head: '', part: text };
  const rest = text.slice(at + 1);
  const lead = rest.length - rest.trimStart().length;
  return { head: text.slice(0, at + 1 + lead), part: rest.trimStart() };
}
