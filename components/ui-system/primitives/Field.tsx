'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';

type FieldIds = { inputId: string; descriptionId: string; errorId: string; hasError: boolean; hasDescription: boolean; isRequired: boolean };
const FieldContext = createContext<FieldIds | null>(null);

/** Attributes a control needs to join its Field (id, aria-describedby, aria-invalid, aria-required). */
export function useFieldProps(): { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: true; 'aria-required'?: true } {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  const describedBy = [ctx.hasDescription && ctx.descriptionId, ctx.hasError && ctx.errorId].filter(Boolean).join(' ');
  return { id: ctx.inputId, 'aria-describedby': describedBy || undefined, 'aria-invalid': ctx.hasError ? true : undefined, 'aria-required': ctx.isRequired ? true : undefined };
}

const MarkDirtyContext = createContext<() => void>(() => {});

/**
 * Custom controls (Select, Combobox, Segmented, TagField, …) call this when
 * they commit a value, so a FormDialog notices changes that emit no native
 * input event. A no-op outside a FormDialog, so non-form uses are unaffected.
 */
export function useMarkDirty(): () => void {
  return useContext(MarkDirtyContext);
}

export const MarkDirtyProvider = MarkDirtyContext.Provider;

/** One label / hint / error rhythm, shared by Field and FieldGroup so they cannot drift apart. */
const labelText = 'font-sans text-label font-medium text-ink';
const hintText = 'font-sans text-caption text-ink-muted';
const errorText = 'flex items-start gap-1.5 font-sans text-caption font-medium text-danger';
const requiredMark = <span aria-hidden="true" className="ml-0.5 text-danger">*</span>;
const optionalMark = <span aria-hidden="true" className="ml-1.5 font-normal text-ink-muted"> Optional</span>;

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
  /** Extra classes for the label itself (sr-only where the label stays programmatic but the design has no room for it). */
  labelClassName?: string;
  children: ReactNode;
}

/**
 * Label + control + description + validation, wired for assistive technology.
 * The child control (Input, Textarea, NativeSelect, Select, Combobox…) picks up
 * its id and aria attributes through useFieldProps(). For a group of controls
 * (a Segmented choice, a checkbox row, read-only values) that cannot take a
 * <label>, use FieldGroup instead.
 */
export function Field({ label, description, error, required, optional, className, labelClassName, children }: FieldProps) {
  const base = useId();
  const ids: FieldIds = {
    inputId: `${base}-control`,
    descriptionId: `${base}-desc`,
    errorId: `${base}-error`,
    hasError: Boolean(error),
    hasDescription: Boolean(description),
    isRequired: Boolean(required),
  };
  return (
    <FieldContext.Provider value={ids}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={ids.inputId} className={cn(labelText, labelClassName)}>
          {label}
          {required && requiredMark}
          {optional && optionalMark}
        </label>
        {children}
        {description && <p id={ids.descriptionId} className={hintText}>{description}</p>}
        {error && (
          <p id={ids.errorId} role="alert" className={errorText}>
            <Icon name="warning" size="xs" weight="emphasis" className="mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export interface FieldGroupProps {
  label: ReactNode;
  /** Supporting hint shown beneath the group. */
  description?: ReactNode;
  /** Validation message for the group as a whole. */
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Label + description + validation for a GROUP of controls (a Segmented choice,
 * a row of checkboxes, read-only values) that cannot take a <label htmlFor>.
 * Same rhythm as Field; the group is named through role="group" and its hint
 * and error are referenced, so nothing is read out unlabelled.
 */
export function FieldGroup({ label, description, error, required, optional, className, children }: FieldGroupProps) {
  const base = useId();
  const labelId = `${base}-group-label`;
  const descriptionId = `${base}-group-desc`;
  const errorId = `${base}-group-error`;
  const describedBy = [description ? descriptionId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={describedBy} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span id={labelId} className={labelText}>
        {label}
        {required && requiredMark}
        {optional && optionalMark}
      </span>
      {children}
      {description && <p id={descriptionId} className={hintText}>{description}</p>}
      {error && (
        <p id={errorId} role="alert" className={errorText}>
          <Icon name="warning" size="xs" weight="emphasis" className="mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
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
