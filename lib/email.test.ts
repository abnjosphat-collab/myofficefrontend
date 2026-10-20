import { describe, expect, it } from 'vitest';
import { isEmailLike } from './email';

describe('isEmailLike', () => {
  it('accepts ordinary addresses', () => {
    expect(isEmailLike('a@x.com')).toBe(true);
    expect(isEmailLike('  rudo.moyo@mine.co.zw  ')).toBe(true);
  });

  it('rejects non-addresses', () => {
    expect(isEmailLike('rudo')).toBe(false);
    expect(isEmailLike('rudo@mine')).toBe(false);
    expect(isEmailLike('@x.com')).toBe(false);
  });

  it('says empty is not an address (call sites treat empty as optional, not invalid)', () => {
    expect(isEmailLike('')).toBe(false);
    expect(isEmailLike(null)).toBe(false);
  });
});
