// app/test-homepage/moduleLinks.ts — resolves a notification's module name (e.g.
// "Noticeboard") to its catalogue href ("/noticeboard"). Titles and feed labels
// disagree on punctuation ("Notice Board" vs "Noticeboard"), so both sides are
// normalised before matching. Returns null — never a guessed href — on no match.
import { ALL_MODULES_BY_HREF } from '@/components/app-shell';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

let cache: Map<string, string> | null = null;

function titleMap(): Map<string, string> {
  if (!cache) {
    cache = new Map<string, string>();
    for (const [href, entry] of ALL_MODULES_BY_HREF) {
      if (!cache.has(normalize(entry.module.title))) cache.set(normalize(entry.module.title), href);
    }
  }
  return cache;
}

export function hrefForModuleName(name: string): string | null {
  return titleMap().get(normalize(name)) ?? null;
}
