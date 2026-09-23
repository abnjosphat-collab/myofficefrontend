import { describe, expect, it } from 'vitest';
import { parseToolsPreferences } from './toolsPreferences';

describe('Tools preferences', () => {
  it('rejects malformed storage without breaking the workspace', () => {
    expect(parseToolsPreferences('{broken')).toBeNull();
  });

  it('clamps text size and restores required sections', () => {
    const result = parseToolsPreferences(JSON.stringify({ appearance: 'dark', options: { order: [], hidden: ['register'], font: 'unknown', fontSize: 999, equipmentIcons: 'iconoir', guidance: false, intro: false } }));
    expect(result).toMatchObject({ appearance: 'dark', options: { order: ['overview', 'register'], hidden: [], font: 'inter', fontSize: 130, equipmentIcons: 'iconoir', guidance: false, intro: false } });
  });
});
