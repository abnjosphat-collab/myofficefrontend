// lib/phone.ts — normalize employee phone fields that often store two numbers in one string ("077… / 071…"). Storage uses "+263 XX XXXX XXX"; display joins multiples with ·.
// Single phone truth for the frontend: Zimbabwe instant rules first (offline,
// byte-identical to the server parser), then metadata-driven international
// validation/formatting via libphonenumber-js (/min subset).
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

/** Split a phone field that may contain multiple numbers. */
export function splitPhoneNumbers(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[/;,]|(?:\s+or\s+)|(?:\s+and\s+)/i)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Digits only — used for parsing and tel: links. */
export function phoneDigits(raw?: string | null): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Canonical format for one Zimbabwe mobile number: +263 XX XXXX XXX.
 * Accepts local 07…, +263…, or 263… / bare 9-digit mobile. Other values are trimmed only.
 */
export function formatSinglePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const d = phoneDigits(trimmed);
  if (!d) return trimmed;

  let national: string | null = null;
  if (d.length === 12 && d.startsWith('263')) {
    national = d.slice(3);
  } else if (d.length === 10 && d.startsWith('0')) {
    national = d.slice(1);
  } else if (d.length === 9 && d.startsWith('7')) {
    national = d;
  }

  if (national && national.length === 9 && national.startsWith('7')) {
    return `+263 ${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6)}`;
  }

  return trimmed.replace(/\s+/g, ' ');
}

/** First number — use for leave/overtime contact fields and tel: links. */
export function primaryContactPhone(raw?: string | null): string {
  const parts = splitPhoneNumbers(raw);
  if (parts.length === 0) return '';
  return formatSinglePhone(parts[0]);
}

/** Safe tel: href from a possibly multi-number field. */
export function telHref(raw?: string | null): string {
  const digits = phoneDigits(primaryContactPhone(raw));
  return digits ? `tel:+${digits}` : '';
}

/**
 * WhatsApp (wa.me) link for the primary number, or '' when it isn't a dialable
 * international number (E.164: leading +, 10–15 digits). Zimbabwe mobiles always
 * qualify; short notes like "call office" never do.
 */
export function whatsappHref(raw?: string | null): string {
  const primary = primaryContactPhone(raw).trim();
  if (!primary.startsWith('+')) return '';
  const digits = phoneDigits(primary);
  if (digits.length < 10 || digits.length > 15) return '';
  return `https://wa.me/${digits}`;
}

/** Display multiple numbers with a middle dot — each number canonicalized. */
export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw?.trim()) return '';
  const parts = splitPhoneNumbers(raw).map(canonicalPhoneNumber).filter(Boolean);
  if (parts.length === 0) return raw.trim();
  return parts.join(' · ');
}

/** True when at least one usable number exists. */
export function hasContactPhone(raw?: string | null): boolean {
  return phoneDigits(primaryContactPhone(raw)).length > 0;
}

/** Consistent storage — canonicalize each number, multiples joined with " / ". */
export function normalizePhoneField(raw?: string | null): string {
  const parts = splitPhoneNumbers(raw).map(canonicalPhoneNumber).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.join(' / ');
}
/** One number's verdict against the shared server parser. */
export type PhoneNumberVerdict = 'mobile' | 'other' | 'invalid';

/**
 * Classify one trimmed number. ZW mobiles canonicalize to +263; landlines and
 * international numbers in an intentional shape are kept as typed; anything
 * else is malformed and rejected on new input.
 */
export function verifyPhoneNumber(raw: string): PhoneNumberVerdict {
  const trimmed = raw.trim();
  if (!trimmed) return 'invalid';
  const d = trimmed.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('263')) {
    return d.slice(3).startsWith('7') ? 'mobile' : 'other';
  }
  if (d.length === 10 && d.startsWith('0')) {
    return d.slice(1).startsWith('7') ? 'mobile' : 'other';
  }
  if (d.length === 9) return d.startsWith('7') ? 'mobile' : 'invalid';
  // International numbers: metadata-driven validation. Anything the metadata
  // confirms is kept as typed ('other'); the shape checks below stay as a
  // safety net for unusual-but-intentional input.
  try {
    const parsed = parsePhoneNumberFromString(trimmed, 'ZW');
    if (parsed && parsed.isValid()) return 'other';
  } catch {
    /* fall through to legacy checks */
  }
  if (/^\+[1-9][\d\s().-]{7,18}$/.test(trimmed) && d.length >= 8 && d.length <= 15) return 'other';
  if (/^00\d{10,13}$/.test(d)) return 'other';
  return 'invalid';
}

/**
 * Max digits for one number while typing. E.164 carries at most 15 digits,
 * so nothing valid is longer; Zimbabwe shapes cap earlier because the
 * national part is always 9 digits (263→12, 0→10, bare 7…→9, with partial
 * prefixes allowed while the number is still being typed). Only the storage
 * separators (/ ; ,) start a new budget — spaces, dashes and parentheses are
 * intra-number formatting, and the verdict (not the cap) still owns validity.
 */
export function maxPhoneDigits(segment: string): number {
  const trimmed = segment.trim();
  const d = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    if (d.startsWith('263') || '263'.startsWith(d)) return 12;
    return 15;
  }
  let rest = d;
  let offset = 0;
  if (rest.startsWith('00')) {
    offset = 2;
    rest = rest.slice(2);
  }
  if (rest === '' || '263'.startsWith(rest) || rest.startsWith('263')) return offset + 12;
  if (rest.startsWith('0')) return offset + 10;
  if (/^7\d*$/.test(rest)) return offset + 9;
  return 15;
}

/** Drop digits past the max for each / ; , segment, keeping formatting and separators. */
export function capPhoneDigits(raw: string): string {
  return raw
    .split(/([/;,])/)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      const max = maxPhoneDigits(part);
      let kept = 0;
      return [...part]
        .filter(ch => {
          if (!/\d/.test(ch)) return true;
          if (kept >= max) return false;
          kept++;
          return true;
        })
        .join('');
    })
    .join('');
}

/**
 * Live formatting while typing. Zimbabwe mobile shapes (local 07…, +263…,
 * 00263…, bare 9-digit) use the canonical 2-4-3 grouping progressively, no
 * matter how much of the number is typed yet; everything else goes through
 * AsYouType so switching the field country formats correctly. Never throws;
 * never drops what the user typed (the verdict owns rejection).
 */
export function formatPhoneInput(raw: string, defaultCountry: CountryCode = 'ZW'): string {
  // NB: only the emptiness check trims. Formatting sees the raw text so a
  // just-typed trailing space survives (trimming first would eat it and the
  // field would swallow spaces while typing).
  if (!raw.trim()) return '';
  const trimmed = raw;
  const d = trimmed.replace(/\D/g, '');
  let rest = d;
  if (rest.startsWith('00')) rest = rest.slice(2);
  let national: string | null = null;
  if (rest.startsWith('263')) {
    const n = rest.slice(3);
    if (/^\d{0,9}$/.test(n) && (n === '' || n.startsWith('7'))) national = n;
  } else if (rest.startsWith('0')) {
    const n = rest.replace(/^0+/, '');
    if (/^\d{0,9}$/.test(n) && (n === '' || n.startsWith('7'))) national = n;
  } else if (/^\d{0,9}$/.test(rest) && (rest === '' || rest.startsWith('7'))) {
    national = rest;
  }
  if (national) {
    const p1 = national.slice(0, 2);
    const p2 = national.slice(2, 6);
    const p3 = national.slice(6, 9);
    return `+263${p1 ? ' ' + p1 : ''}${p2 ? ' ' + p2 : ''}${p3 ? ' ' + p3 : ''}`;
  }
  try {
    // Never drop what the user typed: formatting may only add characters
    // (spaces, dashes, parentheses, a country prefix). If it eats anything
    // the user typed (e.g. spaces in notes like "call office"), keep the raw
    // text so the verdict, not the formatter, owns rejection.
    const formatted = new AsYouType(defaultCountry).input(trimmed);
    const inDigits = trimmed.replace(/\D/g, '');
    const outDigits = formatted.replace(/\D/g, '');
    if (formatted && outDigits.length >= inDigits.length
        && formatted.length >= trimmed.length) return formatted;
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Collapse one number: mobiles canonicalize, intentional others keep their shape. */
export function canonicalPhoneNumber(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return verifyPhoneNumber(trimmed) === 'mobile' ? formatSinglePhone(trimmed) : trimmed;
}

/**
 * Field-level verdict matching the server: empty is valid; every number must
 * be mobile-shaped or an intentional landline/international value, joined
 * with " / ". Malformed new input is rejected with a field error naming the
 * number.
 */
export function verifyPhoneField(raw?: string | null): { canonical: string; error: string | null } {
  if (!raw?.trim()) return { canonical: '', error: null };
  const parts = splitPhoneNumbers(raw);
  for (const part of parts) {
    if (verifyPhoneNumber(part) === 'invalid') {
      return { canonical: '', error: `"${part.trim()}" is not a valid phone number. Use e.g. +263 77 8973 142, with / between several numbers.` };
    }
  }
  return { canonical: parts.map(canonicalPhoneNumber).join(' / '), error: null };
}

/**
 * A stored value that predates the shared parser: unchanged legacy input is
 * preserved with a correction warning (never silently rewritten), while any
 * new or edited value must pass verification.
 */
export function isLegacyPhoneValue(stored: string | null | undefined, current: string): boolean {
  if (!stored?.trim()) return false;
  if ((current ?? '').trim() !== stored.trim()) return false;
  return verifyPhoneField(stored).error !== null;
}
