import { describe, expect, it } from 'vitest';
import { rankCategories, rankModules, scoreModule, searchWords, splitHighlight } from './moduleSearch';
import type { Category, Module } from '@/components/app-shell/modules';

const mod = (overrides: Partial<Module> & { title: string }): Module => ({
  icon: 'box' as never, description: '', href: `/${overrides.title}`, ...overrides,
});
const cat = (id: string, modules: Module[]): Category => ({
  id, title: id, description: '', icon: 'box' as never, modules,
});

describe('searchWords', () => {
  it('lowercases and splits on whitespace', () => {
    expect(searchWords('  Leave  Balances ')).toEqual(['leave', 'balances']);
    expect(searchWords('   ')).toEqual([]);
  });
});

describe('scoreModule', () => {
  it('requires every word to match somewhere (AND)', () => {
    const m = mod({ title: 'Overtime', description: 'Callouts and hours', tags: ['pay'] });
    expect(scoreModule(m, ['overtime'])).toBeGreaterThan(0);
    expect(scoreModule(m, ['overtime', 'hours'])).toBeGreaterThan(0);
    expect(scoreModule(m, ['overtime', 'banana'])).toBe(0);
  });

  it('ranks title word-start above mid-word, tags and description', () => {
    const inTitleStart = mod({ title: 'Tools & Equipment', description: 'x' });
    const inTitleMid = mod({ title: 'Powertools hire', description: 'x' });
    const inTags = mod({ title: 'Workshop', description: 'x', tags: ['tools'] });
    const inDesc = mod({ title: 'Workshop', description: 'all about tools' });
    const scores = [inTitleStart, inTitleMid, inTags, inDesc].map(m => scoreModule(m, ['tools']));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });

  it('matches case-insensitively and scores nothing for an empty word list', () => {
    expect(scoreModule(mod({ title: 'Leaves' }), ['LEAVES'])).toBeGreaterThan(0);
    expect(scoreModule(mod({ title: 'Leaves' }), [])).toBe(0);
  });
});

describe('rankModules', () => {
  it('returns the input untouched for a blank query', () => {
    const modules = [mod({ title: 'B' }), mod({ title: 'A' })];
    expect(rankModules(modules, '  ')).toBe(modules);
  });

  it('orders best-first and keeps catalogue order for ties', () => {
    const modules = [
      mod({ title: 'Workshop register', description: 'tools' }),
      mod({ title: 'Tools & Equipment', description: 'x' }),
      mod({ title: 'Hand tools', description: 'x' }),
    ];
    expect(rankModules(modules, 'tools').map(m => m.title)).toEqual([
      'Tools & Equipment', 'Hand tools', 'Workshop register',
    ]);
  });
});

describe('rankCategories', () => {
  it('drops empty categories and ranks modules within each', () => {
    const categories = [
      cat('a', [mod({ title: 'Unrelated' })]),
      cat('b', [mod({ title: 'Overtime analysis', description: 'x' }), mod({ title: 'Overtime', description: 'x' })]),
    ];
    const ranked = rankCategories(categories, 'overtime');
    expect(ranked.map(c => c.id)).toEqual(['b']);
    expect(ranked[0].modules.map(m => m.title)).toEqual(['Overtime analysis', 'Overtime']);
  });
});

describe('splitHighlight', () => {
  it('marks case-insensitive matches and keeps the rest plain', () => {
    expect(splitHighlight('Tools & Equipment', ['tools'])).toEqual([
      { text: 'Tools', mark: true }, { text: ' & Equipment', mark: false },
    ]);
  });

  it('prefers the longest word at each position and never overlaps', () => {
    expect(splitHighlight('overtime', ['time', 'overtime'])).toEqual([
      { text: 'overtime', mark: true },
    ]);
  });

  it('returns one plain run for no words or no match', () => {
    expect(splitHighlight('abc', [])).toEqual([{ text: 'abc', mark: false }]);
    expect(splitHighlight('abc', ['zzz'])).toEqual([{ text: 'abc', mark: false }]);
  });
});
