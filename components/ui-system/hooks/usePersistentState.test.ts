import { beforeEach, describe, expect, it } from 'vitest';
import { asString, oneOf, readStored, storeValue } from './usePersistentState';

describe('oneOf', () => {
  it('keeps a stored choice only when it is still offered', () => {
    const validate = oneOf(['cards', 'table'] as const);
    expect(validate('table')).toBe('table');
    expect(validate('grid')).toBeUndefined();
    expect(validate(null)).toBeUndefined();
    expect(validate(42)).toBeUndefined();
  });
});

describe('asString', () => {
  it('keeps a remembered free-text value and drops blanks and non-strings', () => {
    expect(asString('Main workshop')).toBe('Main workshop');
    expect(asString('')).toBeUndefined();
    expect(asString('   ')).toBeUndefined();
    expect(asString(null)).toBeUndefined();
    expect(asString(42)).toBeUndefined();
  });
});

describe('readStored/storeValue', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('round-trips a remembered value', () => {
    storeValue('test.last-place', 'North pit');
    expect(readStored('test.last-place', asString, '')).toBe('North pit');
  });

  it('falls back when nothing was stored, the JSON is corrupt, or the value is invalid', () => {
    expect(readStored('test.missing', asString, 'fallback')).toBe('fallback');
    window.localStorage.setItem('test.corrupt', '{oops');
    expect(readStored('test.corrupt', asString, 'fallback')).toBe('fallback');
    window.localStorage.setItem('test.blank', JSON.stringify('  '));
    expect(readStored('test.blank', asString, 'fallback')).toBe('fallback');
  });

  it('ignores a legacy raw (non-JSON) value instead of crashing', () => {
    window.localStorage.setItem('test.legacy', 'Edson Moyo');
    expect(readStored('test.legacy', asString, '')).toBe('');
  });
});
