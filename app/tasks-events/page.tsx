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
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import {
  useTheme, accentText, PageHero, StatTile, GlowCard, ProgressBar, ACCENT_HEX,
  PrimaryButton, CenterModal, FormField, SelectField, StatusBadge, EmptyState, useConfirm,
} from '@/components/shared/theme';
import {
  ListTodo, Plus, Trash2, CalendarClock, Check, RotateCcw, Clock,
} from '@/components/shared/theme';
import { fmtDate } from '@/components/shared/utils';
import {
  useTasksEventsData, createTaskEvent, deleteTaskEvent, completeTaskEvent, reopenTaskEvent,
} from './useTasksEventsData';
import { TASK_TYPES, PRIORITIES, type TaskEvent, type TaskEventFormData } from './types';

const TYPE_COLOR: Record<string, string> = {
  Event: ACCENT_HEX.blue, Task: ACCENT_HEX.violet, Meeting: ACCENT_HEX.cyan, Deadline: ACCENT_HEX.amber,
};

const blankForm = (): TaskEventFormData => ({ title: '', description: '', task_type: 'Task', event_date: '', priority: 'Medium' });

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: TaskEvent) => void }) {
  const [form, setForm] = useState<TaskEventFormData>(blankForm());
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TaskEventFormData>(k: K, v: TaskEventFormData[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const created = await createTaskEvent(form);
      onCreated(created);
      toast.success('Added to the board');
      setForm(blankForm());
      onClose();
    } catch (err) { toast.error((err as Error).message || 'Could not create'); }
    finally { setSaving(false); }
  };

  return (
    <CenterModal open={open} onClose={onClose} title="New Event / Task" accent="violet" width="max-w-lg">
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
        <FormField label="Date">
          <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
            className="w-full h-9 rounded-lg px-3 text-sm outline-none bg-white/10" />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <PrimaryButton type="submit" submitting={saving}>Add</PrimaryButton>
        </div>
      </form>
    </CenterModal>
  );
}

function TasksEventsContent() {
  const t = useTheme();
  const { profile, loading: authLoading, isAtLeast } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const { items, loading, refresh } = useTasksEventsData();
  const [showCreate, setShowCreate] = useState(false);

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
        actions={<PrimaryButton icon={Plus} onClick={() => setShowCreate(true)}>New</PrimaryButton>}
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={ListTodo} color={ACCENT_HEX.violet} value={items.length} label="Total" />
          <StatTile icon={Clock} color={ACCENT_HEX.amber} value={pending.length} label="Pending" />
          <StatTile icon={Check} color={ACCENT_HEX.emerald} value={completed.length} label="Completed" />
        </div>
      </PageHero>

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

      <div className={`${t.glass} rounded-2xl overflow-hidden`}>
        {loading ? (
          <div className="flex justify-center py-16"><div className={`h-6 w-6 border-2 ${t.border} border-t-brand-500 rounded-full animate-spin`} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={ListTodo} title="Nothing posted yet" message="Add the first event or to-do item." />
        ) : (
          <div className="divide-y divide-white/10">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <button type="button" onClick={() => toggle(item)} title={item.status === 'completed' ? 'Mark pending' : 'Mark complete'}
                  className={`h-6 w-6 flex items-center justify-center rounded-full border shrink-0 transition-colors ${
                    item.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : `${t.chipBg} ${t.border} ${t.textFaint}`
                  }`}>
                  {item.status === 'completed' ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3 w-3 opacity-0" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${item.status === 'completed' ? t.textFaint + ' line-through' : t.textPrimary}`}>{item.title}</p>
                  {item.description && <p className={`text-xs truncate ${t.textFaint}`}>{item.description}</p>}
                </div>
                <StatusBadge color={TYPE_COLOR[item.task_type] || ACCENT_HEX.violet} label={item.task_type} />
                {item.event_date && (
                  <span className={`text-xs flex items-center gap-1 shrink-0 ${t.textFaint}`}>
                    <CalendarClock className="h-3.5 w-3.5" /> {fmtDate(item.event_date)}
                  </span>
                )}
                <button type="button" onClick={() => handleDelete(item)} title="Delete"
                  className={`h-7 w-7 flex items-center justify-center rounded-lg shrink-0 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => refresh()} />
    </main>
  );
}

export default function TasksEventsPage() {
  return <AppShell><TasksEventsContent /></AppShell>;
}
