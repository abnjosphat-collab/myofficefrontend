import { describe, expect, it } from 'vitest';
import { scanText } from '../scripts/refresh-consistency.mjs';

const rules = (rel: string, text: string): string[] =>
  (scanText(rel, text) as Array<{ rule: string }>).map(f => f.rule);

describe('refresh-consistency refresh-button', () => {
  it('flags a header-style refresh button anywhere unlisted', () => {
    expect(rules('app/x/page.tsx', `<IconButton icon="refresh" label="Refresh things" variant="shell" onClick={() => list.refetch()} />`)).toContain('refresh-button');
    expect(rules('app/x/page.tsx', `<Button icon="refresh" onClick={() => setTick(n => n + 1)}>Refresh</Button>`)).toContain('refresh-button');
    expect(rules('app/x/page.tsx', `<IconButton icon='refresh' label="Refresh" onClick={r} />`)).toContain('refresh-button');
  });

  it('allows error-state Try again and Retry labels', () => {
    expect(rules('app/x/page.tsx', `<Button size="sm" icon="refresh" onClick={() => r()}>Try again</Button>`)).toEqual([]);
    expect(rules('app/x/page.tsx', `<Button size="sm" icon="refresh" onClick={() => r('a')}>\n  Retry spares\n</Button>`)).toEqual([]);
    expect(rules('app/error-shared.tsx', `<Button icon="refresh" onClick={retry}>Try again</Button>`)).toEqual([]);
  });

  it('allows the named do-more controls and ignores tests and comments', () => {
    expect(rules('app/ppe/MatrixDialog.tsx', `<Button icon="refresh" onClick={recalc}>Recalculate all types</Button>`)).toEqual([]);
    expect(rules('app/overtime/insights/AnalysisGate.tsx', `<IconButton icon="refresh" label="Run the analysis again" onClick={r} />`)).toEqual([]);
    expect(rules('app/x/page.tsx', `// <IconButton icon="refresh" label="Refresh" onClick={r} />`)).toEqual([]);
  });

  it('reads past > inside props when finding the tag end', () => {
    const tag = `<Button icon="refresh" disabled={n as unknown as number > 0} onClick={r}>Refresh</Button>`;
    expect(rules('app/x/page.tsx', tag)).toContain('refresh-button');
  });
});
