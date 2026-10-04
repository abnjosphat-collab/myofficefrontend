'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import { Dialog, type DialogProps } from '../overlays/Dialog';
import { Notice } from './DataRegion';

export interface FormDialogProps extends Pick<DialogProps, 'open' | 'onOpenChange' | 'title' | 'description' | 'size'> {
  submitLabel: string;
  /**
   * Save. Throw to show the message inside the dialog (input is kept); return `false` when validation
   * failed and the fields are already showing their own errors; otherwise the dialog closes.
   */
  onSubmit: () => Promise<boolean | void>;
  children: ReactNode;
  /** Called after the dialog has closed because of a successful save. */
  onSaved?: () => void;
  /** Extra footer action shown before Cancel (for example a sign-off). */
  secondaryAction?: ReactNode;
}

/**
 * The one create/edit dialog: a real <form> (Enter submits), a primary action wired to it, a pending
 * state that blocks double submit and dismissal, and a save failure shown inline without losing input.
 * Children are the fields; lay them out in a grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`) or a stack.
 */
export function FormDialog({ open, onOpenChange, title, description, size = 'md', submitLabel, onSubmit, onSaved, secondaryAction, children }: FormDialogProps) {
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // A long form can be scrolled away from the message: bring a new save failure into view.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [error]);

  const close = (next: boolean) => {
    if (saving) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onSubmit();
      if (result === false) return;
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The changes could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      dismissible={!saving}
      title={title}
      description={description}
      size={size}
      footer={(
        <>
          {secondaryAction}
          <Button onClick={() => close(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} pending={saving}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {error && <div ref={errorRef}><Notice tone="danger" title="Could not save">{error}</Notice></div>}
        {children}
      </form>
    </Dialog>
  );
}
