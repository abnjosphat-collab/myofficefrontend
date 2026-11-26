// lib/phone.test.ts — frontend verdicts mirror the shared server parser:
// ZW mobiles canonicalize to +263 XX XXXX XXX, landlines/international are
// kept as typed, empty clears, malformed new input is rejected, and an
// unchanged legacy value is preserved with a warning instead of an error.
import { describe, expect, it } from 'vitest';
import {
  canonicalPhoneNumber,
  capPhoneDigits,
  formatPhoneDisplay,
  formatPhoneInput,
  formatSinglePhone,
  isLegacyPhoneValue,
  maxPhoneDigits,
  normalizePhoneField,
  primaryContactPhone,
  verifyPhoneField,
  verifyPhoneNumber,
  whatsappHref,
} from './phone';

describe('formatSinglePhone (canonical grouping +263 XX XXXX XXX)', () => {
  it('groups a local mobile as +263 77 8973 142', () => {
    expect(formatSinglePhone('0778973142')).toBe('+263 77 8973 142');
    expect(formatSinglePhone('+263778973142')).toBe('+263 77 8973 142');
    expect(formatSinglePhone('263778973142')).toBe('+263 77 8973 142');
    expect(formatSinglePhone('778973142')).toBe('+263 77 8973 142');
    expect(formatSinglePhone('077 8973 142')).toBe('+263 77 8973 142');
  });
  it('leaves landlines and international numbers in their shape', () => {
    expect(formatSinglePhone('0242751234')).toBe('0242751234');
    expect(formatSinglePhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
    expect(formatSinglePhone('call office')).toBe('call office');
  });
  it('joins display multiples with a middle dot', () => {
    expect(formatPhoneDisplay('0778973142 / 0712345678')).toBe('+263 77 8973 142 · +263 71 2345 678');
    expect(formatPhoneDisplay('+263778973142')).toBe('+263 77 8973 142');
  });
});

describe('verifyPhoneNumber (one number)', () => {
  it('accepts ZW mobile shapes', () => {
    for (const raw of ['0778973142', '+263778973142', '263778973142', '778973142', ' 077 8973 142 ']) {
      expect(verifyPhoneNumber(raw)).toBe('mobile');
    }
  });
  it('keeps intentional landline and international shapes', () => {
    expect(verifyPhoneNumber('0242751234')).toBe('other');
    expect(verifyPhoneNumber('+44 20 7946 0958')).toBe('other');
    expect(verifyPhoneNumber('00263778973142')).toBe('other');
  });
  it('rejects malformed input', () => {
    for (const raw of ['', 'call office', '0711', '123456789', '+263 77', '07-abc-1234']) {
      expect(verifyPhoneNumber(raw)).toBe('invalid');
    }
  });
});

describe('verifyPhoneField (whole field, server verdicts)', () => {
  it('treats empty as valid', () => {
    expect(verifyPhoneField('')).toEqual({ canonical: '', error: null });
    expect(verifyPhoneField(null)).toEqual({ canonical: '', error: null });
  });
  it('canonicalizes mobiles and keeps the / separator', () => {
    expect(verifyPhoneField('0778973142 / 0712345678')).toEqual({
      canonical: '+263 77 8973 142 / +263 71 2345 678',
      error: null,
    });
  });
  it('keeps an intentional landline alongside a mobile', () => {
    expect(verifyPhoneField('0778973142 / 0242751234')?.error).toBeNull();
  });
  it('rejects malformed new input naming the number', () => {
    const { canonical, error } = verifyPhoneField('0778973142 / call office');
    expect(canonical).toBe('');
    expect(error).toContain('call office');
    expect(error).toContain('+263 77 8973 142');
  });
});

describe('normalizePhoneField (storage)', () => {
  it('canonicalizes mobiles with / separators', () => {
    expect(normalizePhoneField('0771234567;0712345678')).toBe('+263 77 1234 567 / +263 71 2345 678');
  });
  it('preserves intentional landlines instead of forcing +263', () => {
    expect(canonicalPhoneNumber('0242751234')).toBe('0242751234');
  });
});

describe('international numbers (metadata-driven)', () => {
  it('accepts valid foreign numbers the old shapes would miss', () => {
    expect(verifyPhoneNumber('+1 650-253-0000')).toBe('other');
    expect(verifyPhoneNumber('+27 82 123 4567')).toBe('other');
  });
  it('still rejects invalid input the metadata does not know', () => {
    expect(verifyPhoneNumber('+999 123')).toBe('invalid');
    expect(verifyPhoneNumber('123456789')).toBe('invalid');
  });
  it('keeps every previously accepted value accepted', () => {
    for (const raw of ['0778973142', '+263778973142', '263778973142', '778973142',
      '0242751234', '+44 20 7946 0958', '00263778973142']) {
      expect(verifyPhoneNumber(raw)).not.toBe('invalid');
    }
  });
});

describe('formatPhoneInput (as-you-type)', () => {
  it('groups ZW mobiles progressively in canonical 2-4-3', () => {
    expect(formatPhoneInput('0')).toBe('0');
    expect(formatPhoneInput('07')).toBe('+263 7');
    expect(formatPhoneInput('0778')).toBe('+263 77 8');
    expect(formatPhoneInput('0778973')).toBe('+263 77 8973');
    expect(formatPhoneInput('0778973142')).toBe('+263 77 8973 142');
  });
  it('lets the formatter shape landline partials while typing', () => {
    expect(formatPhoneInput('0242')).toBe('(024) 2');
    expect(formatPhoneInput('')).toBe('');
  });
  it('formats international input with the field country', () => {
    expect(formatPhoneInput('+1650')).toBe('+1 650');
    expect(formatPhoneInput('+16502530000')).toBe('+1 650 253 0000');
  });
  it('never throws on garbage', () => {
    expect(() => formatPhoneInput('call office')).not.toThrow();
    expect(() => formatPhoneInput('((((')).not.toThrow();
  });
  it('never drops what the user typed', () => {
    expect(formatPhoneInput('call office')).toBe('call office');
    expect(formatPhoneInput('+263')).toBe('+263');
  });
});

describe('maxPhoneDigits / capPhoneDigits (refuse digits past the shape)', () => {
  it('caps ZW shapes at 9 national digits', () => {
    expect(maxPhoneDigits('077897314')).toBe(10);
    expect(maxPhoneDigits('07789731425')).toBe(10);
    expect(maxPhoneDigits('+263778973142')).toBe(12);
    expect(maxPhoneDigits('+26377897314299')).toBe(12);
    expect(maxPhoneDigits('263778973142')).toBe(12);
    expect(maxPhoneDigits('00263778973142')).toBe(14);
    expect(maxPhoneDigits('778973142')).toBe(9);
  });
  it('caps international numbers at the E.164 15-digit max', () => {
    expect(maxPhoneDigits('+16502530000')).toBe(15);
    expect(maxPhoneDigits('+44 20 7946 0958')).toBe(15);
  });
  it('refuses the extra digits but keeps everything else', () => {
    expect(capPhoneDigits('07789731425')).toBe('0778973142');
    expect(capPhoneDigits('+26377897314299')).toBe('+263778973142');
    expect(capPhoneDigits('+1650253000012345')).toBe('+165025300001234');
    expect(capPhoneDigits('0778973142')).toBe('0778973142');
    expect(capPhoneDigits('')).toBe('');
    expect(capPhoneDigits('call office')).toBe('call office');
  });
  it('caps each / segment on its own so two full numbers still fit', () => {
    expect(capPhoneDigits('07789731425 / 07123456789')).toBe('0778973142 / 0712345678');
  });
});

describe('isLegacyPhoneValue (unchanged legacy input)', () => {
  it('warns on an unchanged legacy value instead of rejecting it', () => {
    expect(isLegacyPhoneValue('call office', 'call office')).toBe(true);
  });
  it('does not warn on valid, empty, or edited values', () => {
    expect(isLegacyPhoneValue('+263 77 8973 142', '+263 77 8973 142')).toBe(false);
    expect(isLegacyPhoneValue('', '')).toBe(false);
    expect(isLegacyPhoneValue(null, 'call office')).toBe(false);
    expect(isLegacyPhoneValue('call office', '0778973142')).toBe(false);
  });
});

describe('telHref / whatsappHref / hasContactPhone (unchanged helpers)', () => {
  it('builds links from the primary number', () => {
    expect(primaryContactPhone('077 8973 142 / 071 234 5678')).toBe('+263 77 8973 142');
  });
  it('builds a wa.me link from a mobile', () => {
    expect(whatsappHref('0778973142')).toBe('https://wa.me/263778973142');
  });
  it('returns empty when the number is not dialable internationally', () => {
    expect(whatsappHref('call office')).toBe('');
    expect(whatsappHref('12345')).toBe('');
  });
});
