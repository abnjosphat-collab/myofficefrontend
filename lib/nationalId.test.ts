import { describe, expect, it } from 'vitest';
import { normalizeNationalId } from './nationalId';

describe('normalizeNationalId (normalize-only, never rejects)', () => {
  it('unifies shapes to upper-case dash-separated form', () => {
    expect(normalizeNationalId('21 - 275641 v21')).toBe('21-275641-V21');
    expect(normalizeNationalId('21-275641-V21')).toBe('21-275641-V21');
    expect(normalizeNationalId('21/275641/v21')).toBe('21-275641-V21');
  });
  it('never rejects or validates shape', () => {
    expect(normalizeNationalId('whatever')).toBe('WHATEVER');
    expect(normalizeNationalId('')).toBe('');
    expect(normalizeNationalId(null)).toBe('');
  });
});
