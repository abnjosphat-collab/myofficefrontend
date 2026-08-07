// app/tasks-events/page.tsx — manager-only Events & Tasks board: post upcoming
// events and to-do items in one list, check them off when done, see a
// completion-rate breakdown per task type. Hidden from the nav (modules.ts's
// `minRole`) and rejected server-side (the whole /api/tasks-events router is
// gated in main.py); this page guard is defense-in-depth #2, same pattern as
// app/accounting/page.tsx.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import {
  useTheme, accentText, PageHero, StatTile, GlowCard, ProgressBar, ACCENT_HEX,
  PrimaryButton, CenterModal, FormField, SelectField, SearchInput, StatusBadge, EmptyState, useConfirm,
} from '@/components/shared/theme';
import {
  ListTodo, Plus, Trash2, CalendarClock, Check, RotateCcw, Clock, Pencil, AlertTriangle,
} from '@/components/shared/theme';
import { fmtDate, fmtDateTime } from '@/components/shared/utils';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { EmployeeMultiPicker } from '@/components/shared/EmployeeMultiPicker';
import {
  useTasksEventsData, createTaskEvent, updateTaskEvent, deleteTaskEvent,
  completeTaskEvent, reopenTaskEvent, listComments, addComment,
} from './useTasksEventsData';
import { TASK_TYPES, PRIORITIES, type TaskEvent, type TaskEventFormData, type TaskComment } from './types';

const TYPE_COLOR: Record<string, string> = {
  Event: ACCENT_HEX.blue, Task: ACCENT_HEX.violet, Meeting: ACCENT_HEX.cyan, Deadline: ACCENT_HEX.amber,
};
const PRIORITY_COLOR: Record<string, string> = {
  Low: ACCENT_HEX.cyan, Medium: ACCENT_HEX.amber, High: '#f43f5e',
};

const blankForm = (): TaskEventFormData => ({
  title: '', description: '', task_type: 'Task', event_date: '', due_date: '', responsible_people: [], priority: 'Medium',
});
const isOverdue = (item: TaskEvent) => item.status === 'pending' && !!item.due_date && new Date(item.due_date) < new Date(new Date().toDateString());

// ─── Form modal (create + edit) ────────────────────────────────────────────

function FormModal({ open, onClose, onSaved, initialData }: {
  open: boolean; onClose: () => void; onSaved: () => void; initialData: TaskEvent | null;
}) {
  const mode = initialData ? 'edit' : 'create';
  const [form, setForm] = useState<TaskEventFormData>(blankForm());
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TaskEventFormData>(k: K, v: TaskEventFormData[K]) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title, description: initialData.description || '', task_type: initialData.task_type,
        event_date: initialData.event_date || '', due_date: initialData.due_date || '',
        responsible_people: initialData.responsible_people || [], priority: initialData.priority,
      });
    } else setForm(blankForm());
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (mode === 'edit' && initialData) {
        await updateTaskEvent(initialData.id, form);
        toast.success('Updated');
      } else {
        await createTaskEvent(form);
        toast.success('Added to the board');
      }
      onSaved();
      onClose();
    } catch (err) { toast.error((err as Error).message || 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <CenterModal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Event / Task' : 'New Event / Task'} accent="violet" width="max-w-lg">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <FormField label="Title" required>
          <input autoFocus value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="What needs doing?" className="w-full h-9 rounded-lg px-3 text-sm outline-none bg-white/10" />
        </FormField>
        <FormField label="Description">
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none bg-white/10 resize-none" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <SelectField value={form.task_type} onChange={v => set('task_type', v)} options={[...TASK_TYPES]} />
          </FormField>
          <FormField label="Priority">
            <SelectField value={form.priority} onChange={v => set('priority', v)} options={[...PRIORITIES]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date">
            <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
              className="w-full h-9 rounded-lg px-3 text-sm outline-none bg-white/10" />
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="w-full h-9 rounded-lg px-3 text-sm outline-none bg-white/10" />
          </FormField>
        </div>
        <EmployeeMultiPicker
          label="Responsible People"
          value={form.responsible_people.map(name => ({ id: name, employee_id: name, name }))}
          onAdd={p => set('responsible_people', form.responsible_people.includes(p.name) ? form.responsible_people : [...form.responsible_people, p.name])}
          onRemove={id => set('responsible_people', form.responsible_people.filter(n => n !== id))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <PrimaryButton type="submit" submitting={saving}>{mode === 'edit' ? 'Save' : 'Add'}</PrimaryButton>
        </div>
      </form>
    </CenterModal>
  );
}

// ─── Details modal (read-only view + comments) ─────────────────────────────

function DetailsModal({ item, open, onClose, onEdit, onDelete, onToggle }: {
  item: TaskEvent | null; open: boolean; onClose: () => void; onEdit: (i: TaskEvent) => void; onDelete: (i: TaskEvent) => void; onToggle: (i: TaskEvent) => void;
}) {
  const t = useTheme();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (!open || !item) { setComments([]); return; }
    setLoadingComments(true);
    listComments(item.id).then(setComments).catch(() => setComments([])).finally(() => setLoadingComments(false));
  }, [open, item]);

  if (!item) return null;

  const handlePost = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const created = await addComment(item.id, draft.trim(), profile?.email || profile?.id);
      setComments(prev => [...prev, created]);
      setDraft('');
    } catch (err) { toast.error((err as Error).message || 'Could not post comment'); }
    finally { setPosting(false); }
  };

  return (
    <CenterModal open={open} onClose={onClose} title={item.title} accent="violet" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge color={item.status === 'completed' ? ACCENT_HEX.emerald : ACCENT_HEX.amber} label={item.status === 'completed' ? 'Completed' : 'Pending'} dot />
          <StatusBadge color={TYPE_COLOR[item.task_type] || ACCENT_HEX.violet} label={item.task_type} />
          <StatusBadge color={PRIORITY_COLOR[item.priority] || ACCENT_HEX.amber} label={item.priority} />
          {isOverdue(item) && <StatusBadge color="#f43f5e" label="Overdue" />}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date', val: item.event_date ? fmtDate(item.event_date) : '—' },
            { label: 'Due Date', val: item.due_date ? fmtDate(item.due_date) : '—' },
            { label: 'Responsible', val: item.responsible_people?.length ? item.responsible_people.join(', ') : 'Unassigned' },
            { label: 'Completed By', val: item.completed_by || '—' },
          ].map(({ label, val }) => (
            <div key={label} className={`${t.chipBg} rounded-xl p-3`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>{label}</span>
              <span className={`text-sm ${t.textMuted}`}>{val}</span>
            </div>
          ))}
        </div>

        {item.description && (
          <div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>Description</span>
            <div className={`${t.chipBg} rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${t.textMuted}`}>{item.description}</div>
          </div>
        )}

        <div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${t.textFaint}`}>Progress Comments</span>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
            {loadingComments ? (
              <p className={`text-xs ${t.textFaint}`}>Loading…</p>
            ) : comments.length === 0 ? (
              <p className={`text-xs ${t.textFaint}`}>No comments yet.</p>
            ) : comments.map(c => (
              <div key={c.id} className={`${t.chipBg} rounded-xl p-2.5`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-semibold ${t.textPrimary}`}>{c.author || 'Someone'}</span>
                  <span className={`text-[10px] ${t.textFaint}`}>{fmtDateTime(c.created_at)}</span>
                </div>
                <p className={`text-sm ${t.textMuted}`}>{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a progress update…"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePost(); } }}
              className="flex-1 h-9 rounded-lg px-3 text-sm outline-none bg-white/10" />
            <PrimaryButton onClick={handlePost} submitting={posting} disabled={!draft.trim()}>Post</PrimaryButton>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Close</button>
          <button type="button" onClick={() => { onToggle(item); onClose(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br hover:brightness-110 ${item.status === 'completed' ? 'from-slate-500 to-slate-700' : 'from-emerald-500 to-emerald-700'}`}>
            {item.status === 'completed' ? 'Reopen' : 'Mark Complete'}
          </button>
          <button type="button" onClick={() => { onEdit(item); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-amber-500 to-amber-700 hover:brightness-110">Edit</button>
          <button type="button" onClick={() => { onDelete(item); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110">Delete</button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'completed';

function TasksEventsContent() {
  const t = useTheme();
  const { profile, loading: authLoading, isAtLeast } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const { items, loading, refresh } = useTasksEventsData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskEvent | null>(null);
  const [viewing, setViewing] = useState<TaskEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Defense-in-depth #2 — the nav hides the tile and the backend router rejects
  // the API for anyone below manager, but a direct URL visit still needs this.
  useEffect(() => {
    if (!authLoading && profile && !isAtLeast('manager')) router.replace('/');
  }, [authLoading, profile, isAtLeast, router]);

  if (authLoading || !profile) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <div className={`h-8 w-8 border-2 ${t.border} border-t-brand-500 rounded-full animate-spin`} />
      </main>
    );
  }
  if (!isAtLeast('manager')) return null;

  const pending = items.filter(i => i.status === 'pending');
  const completed = items.filter(i => i.status === 'completed');
  const overdueCount = items.filter(isOverdue).length;

  const byType = useMemo(() => {
    const groups = new Map<string, { total: number; completed: number }>();
    for (const i of items) {
      const g = groups.get(i.task_type) || { total: 0, completed: 0 };
      g.total += 1;
      if (i.status === 'completed') g.completed += 1;
      groups.set(i.task_type, g);
    }
    return Array.from(groups.entries()).map(([type, g]) => ({
      type, total: g.total, completed: g.completed,
      pct: g.total ? Math.round((g.completed / g.total) * 100) : 0,
    }));
  }, [items]);

  const pieData = useMemo(() => [
    { name: 'Completed', value: completed.length, color: ACCENT_HEX.emerald },
    { name: 'Pending', value: pending.length, color: ACCENT_HEX.amber },
  ].filter(d => d.value > 0), [completed.length, pending.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i =>
      (statusFilter === 'all' || i.status === statusFilter) &&
      (typeFilter === 'all' || i.task_type === typeFilter) &&
      (priorityFilter === 'all' || i.priority === priorityFilter) &&
      (!overdueOnly || isOverdue(i)) &&
      (!q || i.title.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
    );
  }, [items, statusFilter, typeFilter, priorityFilter, overdueOnly, search]);

  const exportColumns: DLColumn[] = [
    { key: 'title', label: 'Title' },
    { key: 'task_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'event_date', label: 'Date', format: v => v ? fmtDate(v as string) : '' },
    { key: 'due_date', label: 'Due Date', format: v => v ? fmtDate(v as string) : '' },
    { key: 'responsible_people', label: 'Responsible', format: v => Array.isArray(v) ? v.join(', ') : '' },
    { key: 'completed_by', label: 'Completed By' },
  ];

  const toggle = async (item: TaskEvent) => {
    try {
      if (item.status === 'completed') await reopenTaskEvent(item.id);
      else await completeTaskEvent(item.id, profile.email || profile.id);
      await refresh();
    } catch (err) { toast.error((err as Error).message || 'Could not update'); }
  };

  const handleDelete = async (item: TaskEvent) => {
    if (!await confirm({ title: `Delete "${item.title}"?`, destructive: true })) return;
    try { await deleteTaskEvent(item.id); await refresh(); toast.success('Deleted'); }
    catch (err) { toast.error((err as Error).message || 'Could not delete'); }
  };

  return (
    <main className="max-w-[1100px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ListTodo}
        accent="violet"
        crumbs={['Manager Tools', 'Events & Tasks']}
        title="Events & Tasks"
        actions={
          <>
            <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={exportColumns} filename={exportFilename('events_tasks')} title="Events & Tasks" />
            <PrimaryButton icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>New</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={ListTodo} color={ACCENT_HEX.violet} value={items.length} label="Total" />
          <StatTile icon={Clock} color={ACCENT_HEX.amber} value={pending.length} label="Pending" />
          <StatTile icon={Check} color={ACCENT_HEX.emerald} value={completed.length} label="Completed" />
          <StatTile icon={AlertTriangle} color="#f43f5e" value={overdueCount} label="Overdue" onClick={() => setOverdueOnly(v => !v)} />
        </div>
      </PageHero>

      <div className="grid sm:grid-cols-[1fr_auto] gap-4">
        {byType.length > 0 && (
          <GlowCard color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="p-5 space-y-4">
            <p className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Progress by type</p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              {byType.map(g => (
                <ProgressBar key={g.type} value={g.pct} color={TYPE_COLOR[g.type] || ACCENT_HEX.violet}
                  label={`${g.type} — ${g.completed}/${g.total}`} />
              ))}
            </div>
          </GlowCard>
        )}

        {pieData.length > 0 && (
          <GlowCard color={ACCENT_HEX.emerald} surface={`${t.glass} rounded-2xl`} className="p-5">
            <p className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted} mb-2`}>Completion split</p>
            <div className="w-full sm:w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlowCard>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search title or description…" className="w-full sm:w-64" />
        <SelectField value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)} size="filter"
          options={[{ value: 'all', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }]} />
        <SelectField value={typeFilter} onChange={setTypeFilter} size="filter"
          options={[{ value: 'all', label: 'All Types' }, ...TASK_TYPES.map(v => ({ value: v, label: v }))]} />
        <SelectField value={priorityFilter} onChange={setPriorityFilter} size="filter"
          options={[{ value: 'all', label: 'All Priorities' }, ...PRIORITIES.map(v => ({ value: v, label: v }))]} />
        <button type="button" onClick={() => setOverdueOnly(v => !v)}
          className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${overdueOnly ? 'bg-rose-500/25 text-rose-400 font-semibold' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
          Overdue only
        </button>
      </div>

      <div className={`${t.glass} rounded-2xl overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-16"><div className={`h-6 w-6 border-2 ${t.border} border-t-brand-500 rounded-full animate-spin`} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListTodo} title="Nothing here" message="No items match these filters." />
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map(item => (
              <div key={item.id} onClick={() => setViewing(item)} className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${t.hoverBgSoft}`}>
                <button type="button" onClick={e => { e.stopPropagation(); toggle(item); }} title={item.status === 'completed' ? 'Mark pending' : 'Mark complete'}
                  className={`h-6 w-6 flex items-center justify-center rounded-full border shrink-0 transition-colors ${
                    item.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : `${t.chipBg} ${t.border} ${t.textFaint}`
                  }`}>
                  {item.status === 'completed' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3 w-3 opacity-0" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${item.status === 'completed' ? t.textFaint + ' line-through' : t.textPrimary}`}>{item.title}</p>
                  {!!item.responsible_people?.length && <p className={`text-xs truncate ${t.textFaint}`}>{item.responsible_people.join(', ')}</p>}
                </div>
                <StatusBadge color={TYPE_COLOR[item.task_type] || ACCENT_HEX.violet} label={item.task_type} />
                {item.due_date && (
                  <span className={`text-xs flex items-center gap-1 shrink-0 ${isOverdue(item) ? accentText('rose', t.light) : t.textFaint}`}>
                    <CalendarClock className="h-3.5 w-3.5" /> {fmtDate(item.due_date)}
                  </span>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); setEditing(item); setShowForm(true); }} title="Edit"
                  className={`h-7 w-7 flex items-center justify-center rounded-lg shrink-0 ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); handleDelete(item); }} title="Delete"
                  className={`h-7 w-7 flex items-center justify-center rounded-lg shrink-0 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={refresh}
        initialData={editing}
      />
      <DetailsModal
        item={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={i => { setEditing(i); setShowForm(true); }}
        onDelete={handleDelete}
        onToggle={toggle}
      />
    </main>
  );
}

export default function TasksEventsPage() {
  return <AppShell><TasksEventsContent /></AppShell>;
}
