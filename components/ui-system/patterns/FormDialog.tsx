'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { SAVE_CHECK_MS } from '../motion/presets';
import { Button } from '../primitives/Button';
import { MarkDirtyProvider } from '../primitives/Field';
import { Dialog, type DialogProps } from '../overlays/Dialog';
import { Notice } from './DataRegion';
import { useRefusedSubmit } from './focusFirstError';
import { useDismissGuard } from './FormGuard';

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
  /**
   * Unsaved-work flag, owned by the form. When omitted the dialog tracks it
   * itself (typed input plus custom-control commits); pass it explicitly when
   * "unsaved" means something the dialog cannot see (picked-but-unstored files).
   */
  dirty?: boolean;
  /** Shared-element zoom id (the New button's): the form grows out of it and shrinks back. Omit for the plain open. */
  zoomId?: string;
}

/**
 * The one create/edit dialog: a real <form> (Enter submits), a primary action wired to it, a pending
 * state that blocks double submit and dismissal, and a save failure shown inline without losing input.
 * Children are the fields; lay them out in a grid (`grid grid-cols-1 gap-4 sm:grid-cols-2`) or a stack.
 */
export function FormDialog({ open, onOpenChange, title, description, size = 'md', submitLabel, onSubmit, onSaved, secondaryAction, dirty: dirtyProp, zoomId, children }: FormDialogProps) {
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
  }, []);
  // A refused submit (validation failed in the fields) moves focus to the
  // first invalid field after the errors paint; thrown errors keep the
  // banner scroll below.
  const { formRef, refused } = useRefusedSubmit();
  // Unsaved work: typed input (bubbled change events, except search boxes
  // and picker search text) plus custom-control commits via useMarkDirty.
  const [autoDirty, setAutoDirty] = useState(false);
  useEffect(() => { if (open) { setAutoDirty(false); setSaved(false); } }, [open]);
  const markDirty = useCallback(() => setAutoDirty(true), []);
  const markIfData = (event: FormEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-combobox-search]')) return;
    if (target instanceof HTMLInputElement && target.type === 'search') return;
    setAutoDirty(true);
  };
  const isDirty = dirtyProp ?? autoDirty;
  const { guardClose } = useDismissGuard({ when: isDirty, message: 'Entries in this form are not saved yet.' });
  // A long form can be scrolled away from the message: bring a new save failure into view.
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [error]);

  const close = (next: boolean) => {
    if (saving) return;
    if (!next) setError(null);
    if (!next) {
      guardClose(() => onOpenChange(next));
      return;
    }
    onOpenChange(next);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await onSubmit();
      if (result === false) { refused(); return; }
      // The check shows before the dialog leaves (held 0.25 s, within the
      // 0.3 s budget); dismissal and double submit stay blocked meanwhile.
      setSaved(true);
      await new Promise(resolve => { holdTimer.current = setTimeout(resolve, SAVE_CHECK_MS); });
      holdTimer.current = null;
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
      zoomId={zoomId}
      title={title}
      description={description}
      size={size}
      footer={(
        <>
          {secondaryAction}
          <Button onClick={() => close(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} pending={saving && !saved} success={saved}>{submitLabel}</Button>
        </>
      )}
    >
      <form id={formId} ref={formRef} noValidate onSubmit={submit} onChange={markIfData} className="flex flex-col gap-4">
        {error && <div ref={errorRef}><Notice tone="danger" title="Could not save">{error}</Notice></div>}
        <MarkDirtyProvider value={markDirty}>{children}</MarkDirtyProvider>
      </form>
    </Dialog>
  );
}
