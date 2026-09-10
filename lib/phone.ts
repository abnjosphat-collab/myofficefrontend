// lib/phone.ts — normalize employee phone fields that often store two numbers in one
// string ("077… / 071…"). Storage uses "+263 XX XXX XXXX"; display joins multiples with ·.

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
 * Canonical format for one Zimbabwe mobile number: +263 XX XXX XXXX.
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

  if (national && national.length === 9) {
    return `+263 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
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

/** Display multiple numbers with a middle dot — each number canonicalized. */
export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw?.trim()) return '';
  const parts = splitPhoneNumbers(raw).map(formatSinglePhone).filter(Boolean);
  if (parts.length === 0) return raw.trim();
  return parts.join(' · ');
}

/** True when at least one usable number exists. */
export function hasContactPhone(raw?: string | null): boolean {
  return phoneDigits(primaryContactPhone(raw)).length > 0;
}

/** Consistent storage — canonicalize each number, multiples joined with " / ". */
export function normalizePhoneField(raw?: string | null): string {
  const parts = splitPhoneNumbers(raw).map(formatSinglePhone).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.join(' / ');
}
