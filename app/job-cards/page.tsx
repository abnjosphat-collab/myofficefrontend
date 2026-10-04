'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { ApprovalGate } from '@/components/shared/ApprovalGate';
import { useModuleData } from '@/lib/useModuleData';
import {
  Button, Checkbox, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, PageHeader, Progress, Segmented, SearchField, Select,
  StatusBadge, Textarea, Toolbar, deriveDataStatus, isTransientStatus, type Column, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { JobCard, JCStatus, Priority } from './types';

const PRIORITY: Record<Priority, { tone: Tone; label: string }> = {
  critical: { tone: 'danger', label: 'Critical' }, high: { tone: 'warning', label: 'High' }, medium: { tone: 'info', label: 'Medium' }, low: { tone: 'neutral', label: 'Low' },
};
const STATUS: Record<JCStatus, { tone: Tone; label: string; hex: string }> = {
  open: { tone: 'neutral', label: 'Open', hex: '94a3b8' }, in_progress: { tone: 'info', label: 'In progress', hex: '86bbd8' }, on_hold: { tone: 'warning', label: 'On hold', hex: 'f59e0b' },
  completed: { tone: 'success', label: 'Completed', hex: '34d399' }, cancelled: { tone: 'neutral', label: 'Cancelled', hex: '64748b' },
};
// Legacy or malformed values must still render a labelled badge, never a blank one.
const priorityMeta = (p: string) => PRIORITY[p as Priority] ?? { tone: 'neutral' as Tone, label: p || 'Unknown' };
const statusMeta = (s: string) => STATUS[s as JCStatus] ?? { tone: 'neutral' as Tone, label: s || 'Unknown', hex: '94a3b8' };
const PriorityBadge = ({ value }: { value: string }) => <StatusBadge tone={priorityMeta(value).tone}>{priorityMeta(value).label}</StatusBadge>;
const StatusTag = ({ value }: { value: string }) => <StatusBadge tone={statusMeta(value).tone}>{statusMeta(value).label}</StatusBadge>;
const taskProgress = (jc: JobCard) => { const tasks = jc.tasks ?? []; return tasks.length ? Math.round((tasks.filter(x => x.done).length / tasks.length) * 100) : 0; };

const exportColumns: DLColumn[] = [
  { key: 'job_no', label: 'Job #', width: 14 },
  { key: 'title', label: 'Title', width: 26 },
  { key: 'equipment_name', label: 'Equipment', width: 22 },
  { key: 'type', label: 'Type', width: 14 },
  { key: 'priority', label: 'Priority', width: 12 },
  { key: 'status', label: 'Status', width: 14, format: v => statusMeta(v as string).label },
  { key: 'section', label: 'Section', width: 16 },
  { key: 'assigned_to', label: 'Assigned To', width: 18 },
  { key: 'supervisor', label: 'Supervisor', width: 18 },
  { key: 'scheduled_date', label: 'Scheduled Date', width: 16, format: v => (v ? formatDate(v as string) : '') },
  { key: 'labour_hours', label: 'Labour Hrs', width: 12 },
  { key: 'notes', label: 'Notes', width: 26 },
];

const COLUMNS: Column<JobCard>[] = [
  { id: 'job_no', header: 'Job card', sortable: false, sticky: true, cell: jc => <span className="font-mono text-caption">{jc.job_no}</span> },
  { id: 'title', header: 'Title', cell: jc => <span className="font-medium">{jc.title}<span className="block text-caption font-normal text-ink-muted">{[jc.equipment_name, jc.section].filter(Boolean).join(' · ')}</span></span> },
  { id: 'priority', header: 'Priority', cell: jc => <PriorityBadge value={jc.priority} /> },
  { id: 'status', header: 'Status', cell: jc => <StatusTag value={jc.status} /> },
  { id: 'assigned_to', header: 'Assigned to', hideBelow: 'lg', cell: jc => jc.assigned_to },
  { id: 'progress', header: 'Tasks', hideBelow: 'md', width: '9rem', cell: jc => ((jc.tasks ?? []).length ? <Progress value={taskProgress(jc)} label={`${jc.job_no} tasks done`} /> : <span className="text-ink-muted">No tasks</span>) },
  { id: 'scheduled_date', header: 'Scheduled', hideBelow: 'md', cell: jc => <span className="tabular whitespace-nowrap">{jc.scheduled_date ? formatDate(jc.scheduled_date) : 'Not set'}</span> },
];

function JobCardDetail({ jc, onClose, onSave }: { jc: JobCard; onClose: () => void; onSave: (j: JobCard) => Promise<void> }) {
  // tasks / parts_used guards: legacy or malformed records may lack the arrays.
  const [data, setData] = useState<JobCard>({ ...jc, tasks: (jc.tasks ?? []).map(x => ({ ...x })), parts_used: jc.parts_used ?? [] });
  const [signOffOpen, setSignOffOpen] = useState(false);
  const progress = data.tasks.length ? Math.round((data.tasks.filter(x => x.done).length / data.tasks.length) * 100) : 0;
  const allDone = data.tasks.length > 0 && data.tasks.every(x => x.done);
  const toggleTask = (id: string) => setData(prev => ({ ...prev, tasks: prev.tasks.map(x => (x.id === id ? { ...x, done: !x.done } : x)) }));

  return (
    <>
      <FormDialog
        // The sign-off gate is a separate modal; step aside while it is open so only one trap is active.
        open={!signOffOpen}
        onOpenChange={open => { if (!open) onClose(); }}
        title={data.title}
        description={`${data.job_no} · ${[data.equipment_name, data.section].filter(Boolean).join(' · ')}`}
        size="lg"
        submitLabel="Save changes"
        onSubmit={async () => { await onSave(data); toast.success(`${data.job_no} was saved.`); }}
        secondaryAction={allDone && data.status !== 'completed' ? <Button icon="check" onClick={() => setSignOffOpen(true)}>Supervisor sign-off</Button> : undefined}
      >
        <div className="flex flex-wrap items-center gap-2"><PriorityBadge value={data.priority} /><StatusTag value={data.status} /></div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-sans text-body-sm sm:grid-cols-4">
          {[['Assigned to', data.assigned_to], ['Supervisor', data.supervisor], ['Scheduled', data.scheduled_date ? formatDate(data.scheduled_date) : 'Not set'], ['Labour hours', `${data.labour_hours ?? 0} h`]].map(([label, value]) => (
            <div key={label}><dt className="text-caption text-ink-muted">{label}</dt><dd className="mt-0.5 font-medium text-ink">{value || 'Not set'}</dd></div>
          ))}
        </dl>
        {data.description && <p className="font-sans text-body text-ink-muted">{data.description}</p>}

        <section aria-labelledby="jc-tasks">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 id="jc-tasks" className="font-display text-title font-semibold text-ink">Tasks</h3>
            {data.tasks.length > 0 && <Progress value={progress} label="Tasks done" className="w-40" />}
          </div>
          {data.tasks.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">This job card has no tasks.</p> : (
            <ul className="flex flex-col gap-1.5">
              {data.tasks.map((task, index) => (
                <li key={task.id} className="rounded-control border border-line-subtle bg-surface px-3 py-2">
                  <Checkbox checked={task.done} onChange={() => toggleTask(task.id)} label={<span className={task.done ? 'text-ink-muted line-through' : ''}>{index + 1}. {task.description}</span>} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.parts_used.length > 0 && (
          <section aria-labelledby="jc-parts">
            <h3 id="jc-parts" className="mb-2 font-display text-title font-semibold text-ink">Parts used</h3>
            <ul className="flex flex-col gap-1.5">
              {data.parts_used.map(part => (
                <li key={part.id} className="flex items-center gap-3 rounded-control border border-line-subtle bg-surface-subtle px-3 py-2 font-sans text-body-sm">
                  <span className="w-24 shrink-0 font-mono text-caption text-ink-muted">{part.part_no}</span>
                  <span className="min-w-0 flex-1 text-ink">{part.description}</span>
                  <span className="tabular text-ink-muted">×{part.qty}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select aria-label="Job card status" value={data.status} onValueChange={status => setData(prev => ({ ...prev, status: status as JCStatus }))} options={(Object.keys(STATUS) as JCStatus[]).map(s => ({ value: s, label: STATUS[s].label }))} />
          </Field>
          <Field label="Labour hours">
            <Input type="number" step="0.5" min="0" inputMode="decimal" value={data.labour_hours ?? 0} onChange={event => setData(prev => ({ ...prev, labour_hours: Number(event.target.value) }))} />
          </Field>
        </div>
        {data.notes !== undefined && (
          <Field label="Notes" optional><Textarea rows={3} value={data.notes} onChange={event => setData(prev => ({ ...prev, notes: event.target.value }))} /></Field>
        )}
      </FormDialog>
      {signOffOpen && (
        <ApprovalGate
          title="Supervisor sign-off"
          description={`${data.job_no} — ${data.title}`}
          actionLabel="Sign and close job card"
          requiredRole="manager"
          variant="sign"
          onConfirm={async sig => {
            await onSave({ ...data, status: 'completed' as const, sign_off_by: sig.signerName } as JobCard);
            toast.success(`${data.job_no} was signed off and closed.`);
            onClose();
          }}
          onCancel={() => setSignOffOpen(false)}
        />
      )}
    </>
  );
}

type Filter = JCStatus | 'all';

function JobCardsContent() {
  const { data: records, loading, error, refetch, update } = useModuleData<JobCard>('job-cards');
  const [selected, setSelected] = useState<JobCard | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  // useModuleData reports failures as "<HTTP status>: <body>"; recover the status so access problems and
  // transient failures are told apart. A failed request must never read as "no job cards".
  const errorStatus = error ? Number(error.match(/^(\d{3})\b/)?.[1]) || null : null;
  const loaded = records.length > 0 || (!loading && !error);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: records.length, open: 0, in_progress: 0, on_hold: 0, completed: 0, cancelled: 0 };
    records.forEach(r => { if (r.status in c) c[r.status] += 1; });
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(c => (filter === 'all' || c.status === filter)
      && (!q || c.title?.toLowerCase().includes(q) || c.equipment_name?.toLowerCase().includes(q) || c.job_no?.toLowerCase().includes(q)));
  }, [records, filter, search]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const options = (['all', 'open', 'in_progress', 'on_hold', 'completed'] as const).map(s => ({ value: s, label: `${s === 'all' ? 'All' : STATUS[s].label} (${counts[s]})` }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Job cards' }]}
        title="Job cards"
        description="Work order and job card management."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh job cards" variant="outline" pending={loading && loaded} onClick={() => refetch()} />
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Job_Cards')}
                title="Job Cards"
                statusColumn="status"
                statusColor={(_v, row) => statusMeta(row.status as string).hex}
              />
            )}
          </>
        )}
      />

      <Toolbar>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search job number, title or equipment" wrapperClassName="min-w-56 max-w-md flex-1" />
        <Segmented label="Status" value={filter} onValueChange={setFilter} options={options} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="job cards"
        error={error}
        onRetry={() => refetch()}
        empty={filter !== 'all' || search
          ? <EmptyState icon="search" title="No job cards match" description="Try a different search or status." action={<Button onClick={() => { setFilter('all'); setSearch(''); }}>Clear filters</Button>} />
          : <EmptyState icon="task" title="No job cards yet" description="Job cards will appear here once they are created." />}
      >
        <DataTable caption="Job cards" rows={filtered} columns={COLUMNS} getRowId={jc => String(jc.id)} onRowActivate={setSelected} rowActions={jc => <Button size="sm" variant="ghost" onClick={() => setSelected(jc)} aria-label={`View job card ${jc.job_no}: ${jc.title}`}>View</Button>} />
      </DataRegion>

      {selected && <JobCardDetail key={selected.id} jc={selected} onClose={() => setSelected(null)} onSave={async updated => { await update(updated.id, updated); refetch(); }} />}
    </div>
  );
}

export default function JobCardsPage() {
  return <AppShell migrated><JobCardsContent /></AppShell>;
}
