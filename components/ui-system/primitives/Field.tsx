'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { AnimatedIcon } from '../motion/AnimatedIcon';
import { Presence } from '../motion/Presence';
import { FIRST_ERROR_EVENT } from '../patterns/focusFirstError';

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

/**
 * The error icon: wiggles once when a refused submit lands focus inside its
 * own field (the `mo:first-error` event carries the focused control; only the
 * field that contains it answers, so the first error wiggles alone). Static
 * otherwise — and always static under reduced motion.
 */
function ErrorWiggle() {
  const [trigger, setTrigger] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const onFirstError = (event: Event) => {
      const target = (event as CustomEvent<HTMLElement>).detail;
      const host = ref.current?.closest('[data-field]');
      if (target instanceof HTMLElement && host?.contains(target)) setTrigger(t => t + 1);
    };
    window.addEventListener(FIRST_ERROR_EVENT, onFirstError);
    return () => window.removeEventListener(FIRST_ERROR_EVENT, onFirstError);
  }, []);
  return (
    <span ref={ref} data-wiggle-trigger={trigger} className="mt-0.5 inline-flex">
      <AnimatedIcon name="warning" effect="wiggle" trigger={trigger} size="xs" weight="emphasis" />
    </span>
  );
}
const optionalMark = <span aria-hidden="true" className="ml-1.5 font-normal text-ink-muted"> Optional</span>;

/**
 * The validation message: fades in with a 2 px rise, fades out with no
 * height jump — space for one line is always reserved, so clearing an error
 * never moves the controls below it.
 */
function FieldError({ id, error }: { id: string; error: ReactNode }) {
  return (
    <div className="min-h-[1.25rem]">
      <Presence visible={!!error} fadeOnly rise={2}>
        {error ? (
          <p id={id} role="alert" className={errorText}>
            <ErrorWiggle />
            <span>{error}</span>
          </p>
        ) : null}
      </Presence>
    </div>
  );
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
      <div data-field="" className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={ids.inputId} className={cn(labelText, labelClassName)}>
          {label}
          {required && requiredMark}
          {optional && optionalMark}
        </label>
        {children}
        {description && <p id={ids.descriptionId} className={hintText}>{description}</p>}
        <FieldError id={ids.errorId} error={error} />
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
    <div role="group" data-field="" aria-labelledby={labelId} aria-describedby={describedBy} className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span id={labelId} className={labelText}>
        {label}
        {required && requiredMark}
        {optional && optionalMark}
      </span>
      {children}
      {description && <p id={descriptionId} className={hintText}>{description}</p>}
      <FieldError id={errorId} error={error} />
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
