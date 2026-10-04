'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';

type FieldIds = { inputId: string; descriptionId: string; errorId: string; hasError: boolean; hasDescription: boolean };
const FieldContext = createContext<FieldIds | null>(null);

/** Attributes a control needs to join its Field (id, aria-describedby, aria-invalid). */
export function useFieldProps(): { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: true } {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  const describedBy = [ctx.hasDescription && ctx.descriptionId, ctx.hasError && ctx.errorId].filter(Boolean).join(' ');
  return { id: ctx.inputId, 'aria-describedby': describedBy || undefined, 'aria-invalid': ctx.hasError ? true : undefined };
}

export interface FieldProps {
  label: ReactNode;
  /** Supporting hint shown beneath the control. */
  description?: ReactNode;
  /** Validation message. Its presence marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Mark the field as optional in the label instead of marking required ones. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + description + validation, wired for assistive technology.
 * The child control (Input, Textarea, NativeSelect, Select, Combobox…) picks up
 * its id and aria attributes through useFieldProps().
 */
export function Field({ label, description, error, required, optional, className, children }: FieldProps) {
  const base = useId();
  const ids: FieldIds = {
    inputId: `${base}-control`,
    descriptionId: `${base}-desc`,
    errorId: `${base}-error`,
    hasError: Boolean(error),
    hasDescription: Boolean(description),
  };
  return (
    <FieldContext.Provider value={ids}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={ids.inputId} className="font-sans text-label font-medium text-ink">
          {label}
          {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
          {optional && <span className="ml-1.5 font-normal text-ink-muted">Optional</span>}
        </label>
        {children}
        {description && <p id={ids.descriptionId} className="font-sans text-caption text-ink-muted">{description}</p>}
        {error && (
          <p id={ids.errorId} role="alert" className="flex items-start gap-1.5 font-sans text-caption font-medium text-danger">
            <Icon name="warning" size="xs" weight="emphasis" className="mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Shared look for text-entry controls and select triggers. */
export const controlClasses = [
  'focus-ring w-full min-w-0 rounded-control border border-line-control bg-surface-raised px-3 font-sans text-body text-ink',
  'placeholder:text-ink-subtle',
  'transition-[border-color,box-shadow] duration-[var(--mo-duration-base)] ease-standard',
  'hover:border-line-strong focus-visible:border-focus',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:border-danger',
  'read-only:bg-surface-subtle',
].join(' ');
