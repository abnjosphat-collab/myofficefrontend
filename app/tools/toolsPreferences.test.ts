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

  it('opens the register as a list unless someone chose the grid themselves', () => {
    const base = { sidebarCollapsed: false, options: { order: ['register'], hidden: [], font: 'inter', fontSize: 100 } };
    expect(parseToolsPreferences(JSON.stringify({ ...base, view: 'grid' }))?.view).toBe('list');
    expect(parseToolsPreferences(JSON.stringify({ ...base, view: 'grid', viewChosen: true }))?.view).toBe('grid');
    expect(parseToolsPreferences(JSON.stringify({ ...base, view: 'list', viewChosen: true }))?.view).toBe('list');
  });
  it('shows the Archive and Deactivate buttons unless someone switched them off', () => {
    expect(parseToolsPreferences(JSON.stringify({ options: { order: ['register'], font: 'inter', fontSize: 100 } }))?.options.showRemoval).toBe(true);
    expect(parseToolsPreferences(JSON.stringify({ options: { order: ['register'], font: 'inter', fontSize: 100, showRemoval: false } }))?.options.showRemoval).toBe(false);
  });

  it('silently migrates stored overview sections to the register', () => {
    const result = parseToolsPreferences(JSON.stringify({ view: 'list', sidebarCollapsed: true, overviewOpen: false, options: { order: ['overview', 'register'], hidden: ['overview'], font: 'inter', fontSize: 100, guidance: true, guide: true } }));
    expect(result).toMatchObject({ view: 'list', sidebarCollapsed: true, options: { order: ['register'], hidden: [] } });
    expect(result).not.toHaveProperty('overviewOpen');
  });
});
