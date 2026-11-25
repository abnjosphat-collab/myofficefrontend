'use client';

import { useLayoutEffect, useRef } from 'react';
import { Field, Input } from '@/components/ui-system';
import { useFormattedPhoneField } from '@/lib/useFormattedPhone';

interface FormattedPhoneFieldProps {
  label: string;
  value: string;
  onChange: (canonical: string) => void;
  error?: string | null;
  description?: string;
  optional?: boolean;
  required?: boolean;
  placeholder?: string;
  defaultCountry?: import('libphonenumber-js/min').CountryCode;
  autoComplete?: string;
  disabled?: boolean;
}

/**
 * Phone input with as-you-type formatting and shared verdict errors.
 * Typing reformats (ZW shapes progressively, everything else through the
 * field country) and the caret is pinned through the reformat so typing at
 * the end never jumps; on blur the canonical value is committed. Server-side
 * verification still applies.
 */
export function FormattedPhoneField({
  label, value, onChange, error, description, optional, required,
  placeholder = '+263 77 8973 142', defaultCountry = 'ZW',
  autoComplete = 'tel', disabled,
}: FormattedPhoneFieldProps) {
  const { display, error: localError, handleChange, handleBlur } = useFormattedPhoneField({ value, onChange, defaultCountry });
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (pendingCaret.current != null && el && document.activeElement === el) {
      try {
        el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      } catch {
        /* non-text inputs or hidden elements: leave the caret alone */
      }
    }
    pendingCaret.current = null;
  });
  return (
    <Field label={label} optional={optional} required={required} error={error ?? localError ?? undefined} description={description}>
      <Input
        ref={inputRef}
        aria-label={label}
        value={display}
        onChange={e => {
          pendingCaret.current = handleChange(e.target.value, e.target.selectionStart);
        }}
        onBlur={handleBlur}
        inputMode="tel"
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  );
}
