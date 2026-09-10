import { describe, it, expect } from 'vitest';
import {
  primaryContactPhone,
  splitPhoneNumbers,
  telHref,
  formatPhoneDisplay,
  formatSinglePhone,
  hasContactPhone,
  normalizePhoneField,
} from './phone';

describe('formatSinglePhone', () => {
  it('formats local and international Zimbabwe mobiles consistently', () => {
    expect(formatSinglePhone('0771234567')).toBe('+263 77 123 4567');
    expect(formatSinglePhone('077 123 4567')).toBe('+263 77 123 4567');
    expect(formatSinglePhone('+263773907726')).toBe('+263 77 390 7726');
    expect(formatSinglePhone('263779135536')).toBe('+263 77 913 5536');
    expect(formatSinglePhone('773907726')).toBe('+263 77 390 7726');
  });
  it('leaves non-mobile values trimmed', () => {
    expect(formatSinglePhone('call office')).toBe('call office');
  });
});

describe('splitPhoneNumbers', () => {
  it('splits on slash, semicolon, and comma', () => {
    expect(splitPhoneNumbers('077 123 4567 / 071 234 5678')).toEqual(['077 123 4567', '071 234 5678']);
    expect(splitPhoneNumbers('0771234567;0712345678')).toEqual(['0771234567', '0712345678']);
    expect(splitPhoneNumbers('0771234567, 0712345678')).toEqual(['0771234567', '0712345678']);
  });
  it('returns empty for blank input', () => {
    expect(splitPhoneNumbers()).toEqual([]);
    expect(splitPhoneNumbers('   ')).toEqual([]);
  });
});

describe('primaryContactPhone', () => {
  it('returns the first canonical number only', () => {
    expect(primaryContactPhone('077 123 4567 / 071 234 5678')).toBe('+263 77 123 4567');
  });
  it('canonicalizes a single number', () => {
    expect(primaryContactPhone('0771234567')).toBe('+263 77 123 4567');
  });
});

describe('telHref', () => {
  it('builds a valid tel link from the primary number', () => {
    expect(telHref('077 123 4567 / 071 234 5678')).toBe('tel:+263771234567');
    expect(telHref('+263773907726')).toBe('tel:+263773907726');
  });
  it('returns empty when no digits', () => {
    expect(telHref('call office')).toBe('');
  });
});

describe('formatPhoneDisplay', () => {
  it('joins multiple canonical numbers with a middle dot', () => {
    expect(formatPhoneDisplay('0771234567 / 0712345678')).toBe('+263 77 123 4567 · +263 71 234 5678');
    expect(formatPhoneDisplay('+263773907726')).toBe('+263 77 390 7726');
  });
});

describe('hasContactPhone', () => {
  it('is true when any number exists', () => {
    expect(hasContactPhone('077 / 071')).toBe(true);
    expect(hasContactPhone('')).toBe(false);
  });
});

describe('normalizePhoneField', () => {
  it('joins multiple numbers with " / " in canonical form', () => {
    expect(normalizePhoneField('0771234567;0712345678')).toBe('+263 77 123 4567 / +263 71 234 5678');
  });
  it('canonicalizes a single number', () => {
    expect(normalizePhoneField('077 123 4567')).toBe('+263 77 123 4567');
    expect(normalizePhoneField('+263773907726')).toBe('+263 77 390 7726');
  });
});
