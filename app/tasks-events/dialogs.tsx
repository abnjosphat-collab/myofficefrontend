// app/tasks-events/dialogs.tsx — create/edit an event or task, and the details view with its progress comments.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, FormDialog, Input, Notice, Select, StatusBadge, Textarea, LoadingPulse, Fact, FactList, FactSection, DetailActions } from '@/components/ui-system';
import { fmtDate, fmtDateTime } from '@/components/shared/utils';
import { PeoplePicker } from './PeoplePicker';
import { addComment, listComments } from './useTasksEventsData';
import { PRIORITIES, TASK_TYPES, type TaskComment, type TaskEvent, type TaskEventFormData } from './types';
import { PRIORITY_TONE, TYPE_TONE, isOverdue } from './meta';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const blank = (): TaskEventFormData => ({ title: '', description: '', task_type: 'Task', event_date: '', due_date: '', responsible_people: [], priority: 'Medium' });
const fromItem = (i: TaskEvent): TaskEventFormData => ({ title: i.title, description: i.description || '', task_type: i.task_type, event_date: i.event_date || '', due_date: i.due_date || '', responsible_people: i.responsible_people || [], priority: i.priority });

export function ItemFormDialog({ open, item, onOpenChange, onSave }: {
  open: boolean; item: TaskEvent | null; onOpenChange: (open: boolean) => void; onSave: (id: number | null, data: TaskEventFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<TaskEventFormData>(blank);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, item?.id), () => { setTouched(false); setForm(item ? fromItem(item) : blank()); });
  const set = <K extends keyof TaskEventFormData>(k: K, v: TaskEventFormData[K]) => setForm(f => ({ ...f, [k]: v }));
  const noTitle = !form.title.trim();

  const submit = async () => {
    setTouched(true);
    if (noTitle) return false;
    await onSave(item?.id ?? null, { ...form, title: form.title.trim() });
    toast.success(item ? 'Updated.' : 'Added to the board.');
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={item ? 'Edit event or task' : 'New event or task'} submitLabel={item ? 'Save changes' : 'Add to the board'} onSubmit={submit} size="md">
      <div className="flex flex-col gap-4">
        <Field label="Title" required error={touched && noTitle ? 'Enter a title.' : undefined}><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs doing?" /></Field>
        <Field label="Description" optional><Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select aria-label="Type" value={form.task_type} onValueChange={v => set('task_type', v)} options={TASK_TYPES.map(v => ({ value: v, label: v }))} /></Field>
          <Field label="Priority"><Select aria-label="Priority" value={form.priority} onValueChange={v => set('priority', v)} options={PRIORITIES.map(v => ({ value: v, label: v }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" optional><Input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} /></Field>
          <Field label="Due date" optional><Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></Field>
        </div>
        <PeoplePicker value={form.responsible_people} onChange={v => set('responsible_people', v)} />
      </div>
    </FormDialog>
  );
}

export function ItemDetailsDialog({ item, author, onClose, onEdit, onDelete, onToggle }: {
  item: TaskEvent | null; author: string; onClose: () => void; onEdit: (i: TaskEvent) => void; onDelete: (i: TaskEvent) => void; onToggle: (i: TaskEvent) => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const id = item?.id ?? null;

  const load = useCallback(async () => {
    if (id === null) return;
    setState('loading');
    try { setComments(await listComments(id)); setState('ready'); } catch (e) { setError((e as Error).message); setState('error'); }
  }, [id]);
  useEffect(() => { setComments([]); setDraft(''); if (id !== null) load(); }, [id, load]);

  const post = async () => {
    if (!item || !draft.trim()) return;
    setPosting(true);
    try { const created = await addComment(item.id, draft.trim(), author); setComments(p => [...p, created]); setDraft(''); }
    catch (e) { toast.error(`The comment was not posted: ${(e as Error).message}`); }
    finally { setPosting(false); }
  };

  return (
    <Dialog
      open={!!item}
      onOpenChange={o => { if (!o) onClose(); }}
      title={item?.title ?? 'Event or task'}
      size="lg"
      footer={item && (
        <DetailActions onDelete={() => onDelete(item)} onEdit={() => onEdit(item)}>
          <Button variant="primary" icon={item.status === 'completed' ? 'undo' : 'check'} onClick={() => onToggle(item)}>{item.status === 'completed' ? 'Reopen' : 'Mark complete'}</Button>
        </DetailActions>
      )}
    >
      {item && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={item.status === 'completed' ? 'success' : isOverdue(item) ? 'danger' : 'info'}>{item.status === 'completed' ? 'Completed' : isOverdue(item) ? 'Overdue' : 'Open'}</StatusBadge>
            <StatusBadge tone={TYPE_TONE[item.task_type]}>{item.task_type}</StatusBadge>
            <StatusBadge tone={PRIORITY_TONE[item.priority]}>{item.priority} priority</StatusBadge>
          </div>
          <FactList>
            <Fact label="Date">{item.event_date ? fmtDate(item.event_date) : ''}</Fact>
            <Fact label="Due date">{item.due_date ? fmtDate(item.due_date) : ''}</Fact>
            <Fact label="Responsible">{(item.responsible_people || []).join(', ')}</Fact>
            {item.completed_at && <Fact label="Completed">{fmtDateTime(item.completed_at)}</Fact>}
          </FactList>
          {item.description && (
            <FactSection title="Description"><p className="whitespace-pre-wrap font-sans text-body text-ink">{item.description}</p></FactSection>
          )}
          <FactSection title="Progress comments">
              {state === 'loading' && <LoadingPulse compact label="Loading comments" />}
              {state === 'error' && <Notice tone="danger" title="Comments did not load">{error} <Button variant="ghost" size="sm" onClick={load}>Try again</Button></Notice>}
              {state === 'ready' && comments.length === 0 && <p className="font-sans text-body-sm text-ink-muted">No comments yet. Add the first note below.</p>}
              {comments.length > 0 && (
                <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {comments.map(c => (
                    <li key={c.id} className="rounded-control border border-line bg-surface-subtle px-3 py-2">
                      <p className="whitespace-pre-wrap font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{c.text}</p>
                      <p className="mt-1 font-sans text-caption text-ink-muted">{c.author || 'Someone'} · {fmtDateTime(c.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-2">
                <Field label="Add a progress update" labelClassName="sr-only"><Textarea rows={2} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write an update" /></Field>
                <Button variant="primary" onClick={post} disabled={!draft.trim() || posting}>{posting ? 'Posting…' : 'Post'}</Button>
              </div>
          </FactSection>
        </div>
      )}
    </Dialog>
  );
}
