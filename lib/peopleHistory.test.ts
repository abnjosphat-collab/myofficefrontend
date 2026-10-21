import { beforeEach, describe, expect, it } from 'vitest';
import { clearRecentPeople, readRecentPeople, recordRecentPerson } from './peopleHistory';

beforeEach(() => {
  window.localStorage.clear();
});

describe('peopleHistory', () => {
  it('returns newest first and moves re-picks to the front', () => {
    recordRecentPerson('a');
    recordRecentPerson('b');
    recordRecentPerson('a');
    expect(readRecentPeople()).toEqual(['a', 'b']);
  });

  it('respects the limit and ignores blanks', () => {
    recordRecentPerson('  ');
    recordRecentPerson('a');
    recordRecentPerson('b');
    expect(readRecentPeople(1)).toEqual(['b']);
  });

  it('survives a corrupt store', () => {
    window.localStorage.setItem('oz_recentPeople', 'not-json{');
    expect(readRecentPeople()).toEqual([]);
    recordRecentPerson('a');
    expect(readRecentPeople()).toEqual(['a']);
  });

  it('clears', () => {
    recordRecentPerson('a');
    clearRecentPeople();
    expect(readRecentPeople()).toEqual([]);
  });
});
