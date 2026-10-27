import { describe, expect, it } from 'vitest';
import { scanText } from '../scripts/export-consistency.mjs';

const rules = (rel: string, text: string): string[] =>
  (scanText(rel, text) as Array<{ rule: string }>).map(f => f.rule);

describe('export-consistency export-icon-only', () => {
  it('flags iconOnly on either trigger outside a table row', () => {
    expect(rules('a.tsx', `<DownloadButton data={d} columns={c} filename="x" iconOnly />`)).toContain('export-icon-only');
    expect(rules('a.tsx', `<ExportButton label="Export Excel" onPress={run} iconOnly={true} />`)).toContain('export-icon-only');
    expect(rules('a.tsx', `<ExportButton label="Export Excel" onPress={run} iconOnly={dense} />`)).toContain('export-icon-only');
  });

  it('allows iconOnly inside rowActions and an explicit iconOnly={false}', () => {
    expect(rules('a.tsx', `rowActions={r => <DownloadButton data={d} columns={c} filename="x" iconOnly />}`)).toEqual([]);
    expect(rules('a.tsx', `renderExpanded={r => <ExportButton label="E" onPress={run} iconOnly />}`)).toEqual([]);
    expect(rules('a.tsx', `<DownloadButton data={d} columns={c} filename="x" iconOnly={false} />`)).toEqual([]);
  });

  it('ignores MoreMenu iconOnly and commented-out triggers', () => {
    expect(rules('a.tsx', `<MoreMenu label="Add items" iconOnly={false} items={items} />`)).toEqual([]);
    expect(rules('a.tsx', `// <DownloadButton data={d} columns={c} filename="x" iconOnly />`)).toEqual([]);
  });

  it('reads past > inside props when finding the tag end', () => {
    const tag = `<DownloadButton data={rows as unknown as Record<string, unknown>[]} columns={c} filename="x" iconOnly />`;
    expect(rules('a.tsx', tag)).toContain('export-icon-only');
  });
});
