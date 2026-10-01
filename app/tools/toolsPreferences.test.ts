import { describe, expect, it } from 'vitest';
import { parseToolsPreferences } from './toolsPreferences';

describe('Tools preferences', () => {
  it('rejects malformed storage without breaking the workspace', () => {
    expect(parseToolsPreferences('{broken')).toBeNull();
  });

  it('clamps text size and restores required sections', () => {
    const result = parseToolsPreferences(JSON.stringify({ appearance: 'dark', options: { order: [], hidden: ['register'], font: 'unknown', fontSize: 999, equipmentIcons: 'iconoir', guidance: false, intro: false } }));
    expect(result).toMatchObject({ options: { order: ['register'], hidden: [], font: 'inter', fontSize: 130, guidance: false, guide: true } });
  });

  it('silently migrates stored overview sections to the register', () => {
    const result = parseToolsPreferences(JSON.stringify({ view: 'list', sidebarCollapsed: true, overviewOpen: false, options: { order: ['overview', 'register'], hidden: ['overview'], font: 'inter', fontSize: 100, guidance: true, guide: true } }));
    expect(result).toMatchObject({ view: 'list', sidebarCollapsed: true, options: { order: ['register'], hidden: [] } });
    expect(result).not.toHaveProperty('overviewOpen');
  });
});
