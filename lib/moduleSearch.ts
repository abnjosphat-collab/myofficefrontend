// lib/moduleSearch.ts — the one search over the module catalogue, shared by the
// sidebar dropdown (ShellSearch) and the home grid (app/page.tsx) so both rank
// the same way. Multi-word AND semantics: every word must match somewhere in
// the title, tags or description. Ranked title-first with word-start bonus,
// stable for ties (catalogue order).
import type { Category, Module } from '@/components/app-shell/modules';

/** Lowercased query words; empty query yields []. */
export function searchWords(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function wordStartScore(haystack: string, word: string): number {
  const idx = haystack.indexOf(word);
  if (idx < 0) return 0;
  // A match at a word start ("tool" in "Tools & Equipment") outranks mid-word.
  if (idx === 0 || /[\s\-/&]/.test(haystack[idx - 1])) return 4;
  return 2;
}

/** Rank score for one module, or 0 when any word matches nowhere. Words are
 *  lowercased here so direct callers get the same matching as rankModules. */
export function scoreModule(module: Module, words: string[]): number {
  if (words.length === 0) return 0;
  const title = module.title.toLowerCase();
  const description = module.description.toLowerCase();
  const tags = (module.tags ?? []).map(tag => tag.toLowerCase());
  let score = 0;
  for (const raw of words) {
    const word = raw.toLowerCase();
    const best = Math.max(
      wordStartScore(title, word),
      tags.some(tag => tag.includes(word)) ? 2 : 0,
      description.includes(word) ? 1 : 0,
    );
    if (best === 0) return 0;
    score += best;
  }
  return score;
}

/** Modules matching the query, best first, catalogue order for ties. */
export function rankModules(modules: Module[], query: string): Module[] {
  const words = searchWords(query);
  if (words.length === 0) return modules;
  return modules
    .map((module, index) => ({ module, index, score: scoreModule(module, words) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.module);
}

/** Categories keeping only their matching modules (ranked), dropping empties. */
export function rankCategories(categories: Category[], query: string): Category[] {
  if (searchWords(query).length === 0) return categories;
  return categories
    .map(category => ({ ...category, modules: rankModules(category.modules, query) }))
    .filter(category => category.modules.length > 0);
}

export interface HighlightRun { text: string; mark: boolean }

/** Split text into plain/marked runs for the query words (case-insensitive,
 *  non-overlapping; longest word wins at each position). */
export function splitHighlight(text: string, words: string[]): HighlightRun[] {
  const needles = words.filter(Boolean).map(word => word.toLowerCase()).sort((a, b) => b.length - a.length);
  if (needles.length === 0) return [{ text, mark: false }];
  const lower = text.toLowerCase();
  const runs: HighlightRun[] = [];
  let i = 0;
  let plain = '';
  while (i < text.length) {
    const hit = needles.find(word => lower.startsWith(word, i));
    if (hit) {
      if (plain) { runs.push({ text: plain, mark: false }); plain = ''; }
      runs.push({ text: text.slice(i, i + hit.length), mark: true });
      i += hit.length;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) runs.push({ text: plain, mark: false });
  return runs;
}
