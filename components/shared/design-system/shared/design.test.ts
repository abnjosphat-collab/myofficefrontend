import { afterEach, describe, expect, it } from 'vitest';
import { DESIGN_KEY, readDesignLanguage } from './design';

afterEach(() => localStorage.removeItem(DESIGN_KEY));

describe('design preference', () => {
  it('opens Dallaglio for accounts without a saved choice', () => {
    localStorage.removeItem(DESIGN_KEY);
    expect(readDesignLanguage()).toBe('dallaglio');
  });

  it('respects an explicit Classic choice', () => {
    localStorage.setItem(DESIGN_KEY, 'classic');
    expect(readDesignLanguage()).toBe('classic');
  });
});
