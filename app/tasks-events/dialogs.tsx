// app/tasks-events/dialogs.tsx — create/edit an event or task, and the details view with its progress comments.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, FormDialog, Input, Notice, Select, StatusBadge, Textarea, LoadingPulse, Fact, FactList, DetailActions } from '@/components/ui-system';
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
            <StatusBadge tone={item.status === 'completed' ? 'success' : 'warning'} icon={item.status === 'completed' ? 'success' : 'pending'}>{item.status === 'completed' ? 'Completed' : 'Pending'}</StatusBadge>
            <StatusBadge tone={TYPE_TONE[item.task_type] ?? 'neutral'}>{item.task_type}</StatusBadge>
            <StatusBadge tone={PRIORITY_TONE[item.priority] ?? 'neutral'}>{item.priority}</StatusBadge>
            {isOverdue(item) && <StatusBadge tone="danger" icon="warning">Overdue</StatusBadge>}
          </div>
          <FactList>
            <Fact label="Date">{item.event_date ? fmtDate(item.event_date) : 'Not set'}</Fact>
            <Fact label="Due date">{item.due_date ? fmtDate(item.due_date) : 'Not set'}</Fact>
            <Fact label="Responsible">{item.responsible_people?.length ? item.responsible_people.join(', ') : 'Unassigned'}</Fact>
            <Fact label="Completed by">{item.completed_by || 'Not completed'}</Fact>
          </FactList>
          {item.description && <div><h3 className="font-sans text-caption text-ink-muted">Description</h3><p className="mt-1 whitespace-pre-wrap rounded-control bg-surface-subtle p-3 font-sans text-body text-ink [overflow-wrap:anywhere]">{item.description}</p></div>}
          <section aria-labelledby="te-comments" className="flex flex-col gap-3">
            <h3 id="te-comments" className="font-sans text-label font-semibold text-ink">Progress comments</h3>
            {state === 'loading' && <LoadingPulse compact label="Loading progress comments" />}
            {state === 'error' && <Notice tone="danger" title="Comments could not be loaded" action={<Button size="sm" icon="refresh" onClick={load}>Try again</Button>}>{error}</Notice>}
            {state === 'ready' && (comments.length === 0
              ? <p className="font-sans text-body-sm text-ink-muted">No comments yet.</p>
              : (
                <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                  {comments.map(c => (
                    <li key={c.id} className="rounded-control bg-surface-subtle p-3">
                      <div className="flex items-center justify-between gap-2"><span className="font-sans text-label font-medium text-ink">{c.author || 'Someone'}</span><span className="font-sans text-caption text-ink-muted">{fmtDateTime(c.created_at)}</span></div>
                      <p className="mt-0.5 font-sans text-body text-ink [overflow-wrap:anywhere]">{c.text}</p>
                    </li>
                  ))}
                </ul>
              ))}
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); post(); }}>
              <Input aria-label="Add a progress update" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a progress update" />
              <Button type="submit" variant="primary" pending={posting} disabled={!draft.trim()}>Post</Button>
            </form>
          </section>
        </div>
      )}
    </Dialog>
  );
}
