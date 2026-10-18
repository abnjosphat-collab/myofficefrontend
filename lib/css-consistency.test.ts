import { describe, expect, it } from 'vitest';
import { classSegments, scanText } from '../scripts/css-consistency.mjs';

const rules = (rel: string, text: string, isTsx = true): string[] =>
  (scanText(rel, text, isTsx) as Array<{ rule: string }>).map(f => f.rule);

describe('css-consistency competing-classes', () => {
  it('flags two background utilities in one string', () => {
    expect(rules('a.tsx', `<div className="flex bg-red-500 bg-blue-500" />`)).toContain('competing-classes');
  });

  it('flags two text colors in one string, including across variants', () => {
    expect(rules('a.tsx', `<div className="text-ink text-danger" />`)).toContain('competing-classes');
    expect(rules('a.tsx', `<div className="md:text-ink md:text-danger" />`)).toContain('competing-classes');
  });

  it('accepts size+color pairings, type roles and variant splits', () => {
    expect(rules('a.tsx', `<div className="font-sans text-body text-ink" />`)).toEqual([]);
    expect(rules('a.tsx', `<div className="text-caption text-ink-muted" />`)).toEqual([]);
    expect(rules('a.tsx', `<div className="bg-red-500 md:bg-blue-500" />`)).toEqual([]);
    expect(rules('a.tsx', `<div className="border-b-2 border-transparent" />`)).toEqual([]);
  });

  it('does not confuse ternary branches for one conflicting string', () => {
    const line = 'className={`flex ${on ? \'bg-red-500 text-ink\' : \'bg-blue-500 text-ink\'}`}';
    expect(rules('a.tsx', `<div ${line} />`)).toEqual([]);
  });

  it('does not flag competing utilities across cn() arguments', () => {
    expect(rules('a.tsx', `<div className={cn('text-ink', active && 'text-danger')} />`)).toEqual([]);
  });
});

describe('css-consistency segments', () => {
  it('splits template interpolations into static parts plus quoted branches', () => {
    expect(classSegments('`flex ${on ? \'bg-a\' : \'bg-b\'} gap-2`')).toEqual(['flex ', 'bg-a', 'bg-b', ' gap-2']);
  });
});

describe('css-consistency no-hex-in-tsx', () => {
  it('flags styling hex but allows brand, PWA meta and canvas helpers', () => {
    expect(rules('a.tsx', `<div style={{ color: '#ff0000' }} />`)).toContain('no-hex-in-tsx');
    expect(rules('a.tsx', `<path fill="#4285F4" />`)).toEqual([]);
    expect(rules('a.tsx', `themeColor: "#f4f6f5",`)).toEqual([]);
    expect(rules('lib/sops/exportPdf.ts', `const c = '#111827';`, false)).toEqual([]);
  });
});

describe('css-consistency no-dark-variant', () => {
  it('flags dark: utilities but not type annotations', () => {
    expect(rules('a.tsx', `<div className="bg-white dark:bg-black" />`)).toContain('no-dark-variant');
    expect(rules('a.tsx', `function T({ dark }: { dark: boolean }) {`)).toEqual([]);
  });
});

describe('css-consistency no-emoji-icon', () => {
  it('flags glyph icons in markup but not in comments', () => {
    expect(rules('a.tsx', `<span>★</span>`)).toContain('no-emoji-icon');
    expect(rules('a.tsx', `// close (Escape, outside, ✕)`)).toEqual([]);
    expect(rules('a.tsx', `/** Intercept (Escape, outside, ✕). */`)).toEqual([]);
  });

  it('honours the two deferred owner exceptions but flags the same glyphs elsewhere', () => {
    expect(rules('app/documents/FileBrowser.tsx', `<span>★</span>`)).toEqual([]);
    expect(rules('app/services/page.tsx', `<span>✓</span>`)).toEqual([]);
    expect(rules('a.tsx', `<span>✓</span>`)).toContain('no-emoji-icon');
  });
});

describe('css-consistency theme-utility ratchet', () => {
  it('flags -[var(--mo-…)] where a theme utility exists', () => {
    expect(rules('a.tsx', `<div className="bg-[var(--mo-surface-raised)]" />`)).toContain('no-var-utility');
    expect(rules('a.tsx', `<div className="border-[var(--mo-line-subtle)]" />`)).toContain('no-var-utility');
    expect(rules('a.tsx', `<div className="bg-surface-raised border-line-subtle" />`)).toEqual([]);
  });

  it('leaves var() arbitrary values with no theme utility alone', () => {
    expect(rules('a.tsx', `<div className="ring-[var(--mo-focus)]" />`)).toEqual([]);
    expect(rules('a.tsx', `<div className="bg-[var(--mo-future-token)]" />`)).toEqual([]);
  });

  it('flags z-[var(--mo-z-…)]', () => {
    expect(rules('a.tsx', `<div className="z-[var(--mo-z-dialog)]" />`)).toContain('no-var-z');
    expect(rules('a.tsx', `<div className="z-dialog" />`)).toEqual([]);
  });

  it('flags raw text-[Npx]/[Nrem] but not other arbitrary sizes', () => {
    expect(rules('a.tsx', `<div className="text-[10px]" />`)).toContain('no-px-text');
    expect(rules('a.tsx', `<div className="text-[0.6875rem]" />`)).toContain('no-px-text');
    expect(rules('a.tsx', `<div className="size-[13px] gap-[3px]" />`)).toEqual([]);
  });

  it('accepts the text-readout size+color pairing', () => {
    expect(rules('a.tsx', `<dd className="floor-meter text-readout font-medium leading-none text-ink" />`)).toEqual([]);
  });
});
