// app/artisan-timesheets/CommentField.tsx — the day's comments: the text shows in the cell (cut off with an ellipsis, in full as its
// tooltip) and a click opens a dialog to edit it. Saving writes it to the row; cancelling leaves the row as it was.
'use client';

import { useState } from 'react';
import { Button, Dialog, Field, Icon, Textarea, cn, useDismissGuard } from '@/components/ui-system';

export function CommentField({ value, onChange, dateLabel }: { value: string; onChange: (value: string) => void; dateLabel: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const { guardClose } = useDismissGuard({ when: draft !== value, message: 'The comment is not saved yet.' });
  const close = () => guardClose(() => setOpen(false));
  return (
    <>
      <button type="button" title={value || undefined} aria-label={`Comments for ${dateLabel}${value ? `: ${value}` : ', none'}`} onClick={() => { setDraft(value); setOpen(true); }}
        className={cn('focus-ring flex w-full min-w-48 items-center gap-1 rounded-control px-2 py-1 text-left font-sans text-caption hover:bg-surface-subtle', value ? 'text-ink' : 'text-ink-muted')}>
        {value ? <span className="truncate">{value}</span> : <><Icon name="edit" size="xs" /><span>Add a note</span></>}
      </button>
      <Dialog open={open} onOpenChange={o => { if (!o) close(); }} size="md" title={`Comments, ${dateLabel}`} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { onChange(draft); setOpen(false); }}>Save comment</Button></>}>
        <Field label="Comments" optional><Textarea rows={6} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Shift notes, callout details, leave reason" /></Field>
      </Dialog>
    </>
  );
}
