import { describe, expect, it } from 'vitest';
import { ICON_BY_MEANING, ICON_MEANINGS } from './icon-meanings';

describe('icon meanings', () => {
  it('gives every meaning exactly one glyph', () => {
    for (const meaning of ICON_MEANINGS) {
      expect(ICON_BY_MEANING[meaning], `meaning without a glyph: ${meaning}`).toBeDefined();
    }
    expect(Object.keys(ICON_BY_MEANING)).toHaveLength(ICON_MEANINGS.length);
  });

  it('has a minus glyph for negative table states', () => {
    expect(ICON_BY_MEANING['minus']).toBeDefined();
    expect(ICON_MEANINGS).toContain('minus');
  });
});
