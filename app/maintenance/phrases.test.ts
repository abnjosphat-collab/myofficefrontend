import { describe, expect, it } from 'vitest';
import { suggestCompletions } from './phrases';

describe('suggestCompletions', () => {
  it('offers words that start with the last word typed, applied to the text', () => {
    const s = suggestCompletions('Replaced the bear');
    expect(s[0]).toEqual({ label: 'bearing', next: 'Replaced the bearing ' });
    expect(s.map(x => x.label)).toContain('bearings');
  });
  it('offers nothing for a one-letter word, an exact match or empty text', () => {
    expect(suggestCompletions('b')).toEqual([]);
    expect(suggestCompletions('belt', ['belt'])).toEqual([]);
    expect(suggestCompletions('')).toEqual([]);
  });
  it('after a space, offers the phrases that start with everything typed so far', () => {
    const s = suggestCompletions('preventive ');
    expect(s).toEqual([{ label: 'preventive maintenance completed', next: 'preventive maintenance completed ' }]);
    expect(suggestCompletions('Belt ')).toEqual([{ label: 'belt worn out', next: 'Belt worn out ' }, { label: 'belt slipping', next: 'Belt slipping ' }]);
  });
  it('limits how many it offers', () => { expect(suggestCompletions('re', undefined, 2)).toHaveLength(2); });
});
