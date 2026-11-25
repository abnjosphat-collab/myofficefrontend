// lib/useFormattedPhone.ts — kit-agnostic live phone formatting for form fields.
//
// Contract: preview on the client, enforce on the server. While typing, the
// display is reformatted (ZW shapes progressively, everything else through
// AsYouType); on blur the value is committed through the shared verdict, so
// what the parent stores is always canonical or explicitly errored. Submit
// handlers must still verify — this hook never replaces server validation.
import { useEffect, useRef, useState } from 'react';
import { capPhoneDigits, formatPhoneInput, verifyPhoneField } from './phone';
import type { CountryCode } from 'libphonenumber-js/min';

/**
 * Map a caret position through formatting by digit count: the caret stays
 * just after the same digit it followed before formatting. Never invents a
 * position (null in, null out); clamps defensively.
 */
export function mapCaretThroughFormat(
  formatted: string,
  nextRaw: string,
  caret: number | null,
): number | null {
  if (caret == null) return null;
  const clamped = Math.max(0, Math.min(caret, nextRaw.length));
  let digits = 0;
  for (const ch of nextRaw.slice(0, clamped)) if (/\d/.test(ch)) digits++;
  if (digits === 0) return Math.min(clamped, formatted.length);
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === digits) return i + 1;
  }
  return formatted.length;
}

export interface FormattedPhoneOptions {
  /** Canonical value owned by the parent form. */
  value: string;
  onChange: (next: string) => void;
  defaultCountry?: CountryCode;
}

export function useFormattedPhoneField({ value, onChange, defaultCountry = 'ZW' }: FormattedPhoneOptions) {
  const [display, setDisplay] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef(display);
  const lastSent = useRef(value);
  const onChangeRef = useRef(onChange);
  // Sync refs in effects, never during render (react-hooks/refs): the blur
  // commit reads the latest display through displayRef, and handlers call
  // the latest onChange through onChangeRef.
  useEffect(() => {
    displayRef.current = display;
  });
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Follow external resets/autofill; ignore our own echoes.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setDisplay(value);
      setError(null);
    }
  }, [value]);

  const handleChange = (nextRaw: string, caret: number | null = null) => {
    const prev = displayRef.current;
    // Digits past the max never enter the field: the keystroke (or the tail
    // of a paste) is refused up front, per / ; , segment, so a number cannot
    // grow past its shape. The cap only ever removes over-long digits — the
    // formatter below still never drops anything the cap kept.
    const nextRawCapped = capPhoneDigits(nextRaw);
    const cappedCaret = caret == null ? null : Math.min(caret, nextRawCapped.length);
    // Appends at the end are formatted and the caret pinned to the end;
    // deletions and mid-string edits pass through raw (digit-mapped caret),
    // then settle on blur. Never invent a position when none was tracked.
    const appended = nextRawCapped.length > prev.length && nextRawCapped.startsWith(prev);
    const formatted = appended ? formatPhoneInput(nextRawCapped, defaultCountry) : nextRawCapped;
    lastSent.current = formatted;
    setDisplay(formatted);
    onChangeRef.current(formatted);
    if (cappedCaret == null) return null;
    return appended ? formatted.length : mapCaretThroughFormat(formatted, nextRawCapped, cappedCaret);
  };

  const commit = (): string | null => {
    const { canonical, error: verdictError } = verifyPhoneField(displayRef.current);
    if (verdictError) {
      setError(verdictError);
      return verdictError;
    }
    setError(null);
    if (canonical !== displayRef.current) {
      lastSent.current = canonical;
      setDisplay(canonical);
      onChangeRef.current(canonical);
    }
    return null;
  };

  return { display, error, handleChange, handleBlur: commit };
}
