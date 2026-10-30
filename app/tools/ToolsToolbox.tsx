// app/tools/ToolsToolbox.tsx — monthly toolbox checks: every personal set verified piece by
// piece against its checklist, with missing/damaged/borrowed/stolen states, narratives and
// manager filters. One screen, list then record: pick a set, work the list, submit.
'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Input, Notice, Segmented, StatusBadge, Tabs, TabsList, TabsTrigger, Textarea } from '@/components/ui-system';
import type { ToolboxCheck, ToolboxCheckItem, ToolboxItemState } from './complianceTypes';
import type { Tool } from './prototype';

export const TOOLBOX_STATES: Array<{ value: ToolboxItemState; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'missing', label: 'Missing' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'stolen', label: 'Stolen' },
];

type ToolboxFilter = 'all' | 'due' | 'overdue' | 'stolen' | 'damaged' | 'checked';

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function setPieces(tool: Tool): number {
  return (tool.memberIds?.length ?? 0) + (tool.linePieces ?? 0);
}

type SetStatus = 'checked' | 'open' | 'due' | 'overdue';

export function toolboxSetStatus(checks: ToolboxCheck[], period: string): SetStatus {
  const forPeriod = (value: string) => checks.filter(check => check.period === value);
  const done = (list: ToolboxCheck[]) => list.some(check => check.status === 'submitted');
  if (done(forPeriod(period))) return 'checked';
  if (forPeriod(period).length > 0) return 'open';
  if (checks.length > 0 && !done(forPeriod(previousPeriod(period)))) return 'overdue';
  return 'due';
}

const STATUS_BADGE: Record<SetStatus, { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
  checked: { tone: 'success', label: 'Checked' },
  open: { tone: 'neutral', label: 'Open' },
  due: { tone: 'warning', label: 'Due' },
  overdue: { tone: 'danger', label: 'Overdue' },
};

type SubmitItem = { kind: ToolboxCheckItem['kind']; ref_id: string; state: ToolboxItemState; qty_found?: number; note?: string; how_happened?: string; prevention?: string; follow_up?: string };

/** Pure — the rows for the list, so tests can pin the filters without rendering. Exported for tests. */
export function toolboxRows(tools: Tool[], checks: ToolboxCheck[], period: string): Array<{ set: Tool; status: SetStatus; latest?: ToolboxCheck; evidence?: ToolboxCheck }> {
  const bySet = new Map<string, ToolboxCheck[]>();
  for (const check of checks) {
    const list = bySet.get(check.setHeadId) ?? [];
    list.push(check);
    bySet.set(check.setHeadId, list);
  }
  return tools
    .filter(tool => (tool.memberIds?.length ?? 0) > 0 || (tool.lineCount ?? 0) > 0)
    .map(set => {
      const setChecks = (bySet.get(set.backendId ?? '') ?? []).sort((a, b) => b.period.localeCompare(a.period));
      return { set, status: toolboxSetStatus(setChecks, period), latest: setChecks[0], evidence: setChecks.find(check => check.status === 'submitted') };
    });
}

export function ToolsToolbox({ tools, checks, canManage, onOpenCheck, onSubmitCheck, getCheck }: {
  tools: Tool[];
  checks: ToolboxCheck[];
  canManage: boolean;
  onOpenCheck: (setHeadBackendId: string, period?: string) => Promise<ToolboxCheck | undefined>;
  onSubmitCheck: (checkId: string, value: { items: SubmitItem[] }) => Promise<void>;
  getCheck: (checkId: string) => Promise<ToolboxCheck | undefined>;
}) {
  const period = currentPeriod();
  const [filter, setFilter] = useState<ToolboxFilter>('all');
  const [recording, setRecording] = useState<ToolboxCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Record<string, { state: ToolboxItemState; found: number; note: string; howHappened: string; prevention: string; followUp: string }>>({});
  const [notes, setNotes] = useState('');

  const rows = useMemo(() => toolboxRows(tools, checks, period), [tools, checks, period]);
  const visible = rows.filter(row => {
    if (filter === 'all') return true;
    if (filter === 'checked') return row.status === 'checked';
    if (filter === 'due') return row.status === 'due';
    if (filter === 'overdue') return row.status === 'overdue';
    if (filter === 'stolen') return (row.evidence?.summary?.stolen ?? 0) > 0;
    return (row.evidence?.summary?.damaged ?? 0) > 0;
  });
  const dueCount = rows.filter(row => row.status === 'due').length;
  const overdueCount = rows.filter(row => row.status === 'overdue').length;

  const blankDraft = (items: ToolboxCheckItem[]) => Object.fromEntries(items.map(item => [item.id, { state: item.state, found: item.found, note: item.note, howHappened: item.howHappened, prevention: item.prevention, followUp: item.followUp }]));

  const startRecording = async (setBackendId: string, checkPeriod: string) => {
    if (!setBackendId) return;
    setLoading(true);
    try {
      const opened = await onOpenCheck(setBackendId, checkPeriod);
      if (!opened) return;
      setRecording(opened);
      setDraft(blankDraft(opened.items));
      setNotes('');
    } finally { setLoading(false); }
  };

  const viewCheck = async (checkId: string) => {
    setLoading(true);
    try {
      const full = await getCheck(checkId);
      if (!full) return;
      setRecording(full);
      setDraft(blankDraft(full.items));
      setNotes('');
    } finally { setLoading(false); }
  };

  const problems = (item: ToolboxCheckItem): string[] => {
    const entry = draft[item.id];
    if (!entry) return [];
    const issues: string[] = [];
    if (entry.state !== 'available' && !entry.note.trim()) issues.push('Give a reason.');
    if ((entry.state === 'damaged' || entry.state === 'stolen') && !entry.howHappened.trim()) issues.push('Say how it happened.');
    if (entry.state === 'stolen' && !entry.prevention.trim()) issues.push('Say how a repeat will be prevented.');
    if (item.expected > 1 && (entry.found < 0 || entry.found > item.expected)) issues.push(`Found must be 0 to ${item.expected}.`);
    return issues;
  };

  const submit = async () => {
    if (!recording) return;
    setLoading(true);
    try {
      await onSubmitCheck(recording.id, {
        items: recording.items.map(item => {
          const entry = draft[item.id];
          const state = entry?.state ?? item.state;
          return {
            kind: item.kind, ref_id: item.refId, state,
            qty_found: item.expected > 1 ? entry?.found ?? item.found : undefined,
            note: state === 'available' ? undefined : entry?.note.trim() || undefined,
            how_happened: (state === 'damaged' || state === 'stolen') ? entry?.howHappened.trim() || undefined : undefined,
            prevention: state === 'stolen' ? entry?.prevention.trim() || undefined : entry?.prevention.trim() || undefined,
            follow_up: entry?.followUp.trim() || undefined,
          };
        }),
      });
      setRecording(null);
    } finally { setLoading(false); }
  };

  if (recording) {
    const locked = recording.status === 'submitted';
    const counts = TOOLBOX_STATES.map(({ value }) => ({ value, count: recording.items.filter(item => (draft[item.id]?.state ?? item.state) === value).length }));
    const blocked = recording.items.some(item => problems(item).length > 0);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setRecording(null)}>Back to sets</Button>
          <strong className="font-sans text-title font-semibold text-ink">{periodLabel(recording.period)} · {recording.setName}</strong>
          <span className="font-sans text-body-sm text-ink-muted">Held by {recording.holder}</span>
        </div>
        {!canManage && !locked && <Notice tone="warning" title="Read-only for your account">Only an Issuer or administrator account can record and submit a check.</Notice>}
        <div className="flex flex-wrap gap-2">
          {counts.map(({ value, count }) => (
            <span key={value} className="rounded-sm bg-surface-subtle px-2 py-1 font-sans text-caption text-ink-muted">{count} {value}</span>
          ))}
        </div>
        <ol className="flex flex-col gap-3">
          {recording.items.map(item => {
            const entry = draft[item.id] ?? { state: item.state, found: item.found, note: item.note, howHappened: item.howHappened, prevention: item.prevention, followUp: item.followUp };
            const needsNote = entry.state !== 'available';
            const needsHow = entry.state === 'damaged' || entry.state === 'stolen';
            const itemProblems = problems(item);
            return (
              <li key={item.id} className="rounded-md border border-line-subtle bg-surface p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="font-sans text-body-sm font-medium text-ink">{item.toolName}{item.size ? ` · ${item.size}` : ''}{item.expected > 1 ? ` · ${item.expected} expected` : ''}</strong>
                  {item.kind === 'member' && <small className="font-sans text-caption text-ink-muted">In the tools register</small>}
                </div>
                {locked ? (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={entry.state === 'available' ? 'success' : entry.state === 'stolen' ? 'danger' : 'warning'}>{TOOLBOX_STATES.find(option => option.value === entry.state)?.label}</StatusBadge>
                      {item.expected > 1 && <small className="font-sans text-caption text-ink-muted">Found {item.found} of {item.expected}</small>}
                    </div>
                    {item.note && <small className="font-sans text-caption text-ink">{item.note}</small>}
                    {item.howHappened && <small className="font-sans text-caption text-ink">How: {item.howHappened}</small>}
                    {item.prevention && <small className="font-sans text-caption text-ink-muted">Prevention: {item.prevention}</small>}
                    {item.followUp && <small className="font-sans text-caption text-ink-muted">Follow-up: {item.followUp}</small>}
                  </div>
                ) : (
                  <>
                    <div className="mt-2">
                      <Segmented label={`State of ${item.toolName}`} value={entry.state}
                        onValueChange={value => setDraft(current => ({ ...current, [item.id]: { ...entry, state: value as ToolboxItemState } }))}
                        options={TOOLBOX_STATES} />
                    </div>
                    {item.expected > 1 && (
                      <Field label={`How many found (of ${item.expected})`} required>
                        <Input aria-label={`How many found of ${item.toolName}`} type="number" min={0} max={item.expected} value={String(entry.found)} onChange={event => setDraft(current => ({ ...current, [item.id]: { ...entry, found: Number(event.target.value) } }))} />
                      </Field>
                    )}
                    {needsNote && (
                      <Field label={entry.state === 'damaged' ? 'Damage — what is wrong' : entry.state === 'stolen' ? 'Theft — what is missing' : 'What happened'} required>
                        <Textarea aria-label={`What happened to ${item.toolName}`} rows={2} value={entry.note} onChange={event => setDraft(current => ({ ...current, [item.id]: { ...entry, note: event.target.value } }))} placeholder={entry.state === 'borrowed' ? 'Who has it, and when is it back.' : 'Describe what is wrong or missing.'} />
                      </Field>
                    )}
                    {needsHow && (
                      <Field label={entry.state === 'damaged' ? 'How the damage happened' : 'How the theft happened'} required>
                        <Textarea aria-label={`How it happened to ${item.toolName}`} rows={2} value={entry.howHappened} onChange={event => setDraft(current => ({ ...current, [item.id]: { ...entry, howHappened: event.target.value } }))} placeholder={entry.state === 'damaged' ? 'What caused the damage.' : 'When and how it was taken.'} />
                      </Field>
                    )}
                    {(entry.state === 'stolen' || entry.state === 'damaged') && (
                      <Field label="How do we stop this happening again" required={entry.state === 'stolen'}>
                        <Textarea aria-label={`Prevention for ${item.toolName}`} rows={2} value={entry.prevention} onChange={event => setDraft(current => ({ ...current, [item.id]: { ...entry, prevention: event.target.value } }))} placeholder="What changes so this does not repeat." />
                      </Field>
                    )}
                    <Field label="Follow-up" optional>
                      <Input aria-label={`Follow-up for ${item.toolName}`} value={entry.followUp} onChange={event => setDraft(current => ({ ...current, [item.id]: { ...entry, followUp: event.target.value } }))} placeholder="e.g. replace by Friday" />
                    </Field>
                    {itemProblems.length > 0 && <small className="font-sans text-caption text-danger">{itemProblems.join(' ')}</small>}
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {!locked && (
          <>
            <Field label="Check notes" optional>
              <Textarea aria-label="Check notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Anything else the foreman should know." />
            </Field>
            <div>
              <Button disabled={loading || !canManage || blocked} onClick={submit} title={blocked ? 'Fill in every reason before submitting.' : undefined}>{loading ? 'Submitting…' : 'Submit check'}</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="font-sans text-title font-semibold text-ink">Monthly check · {periodLabel(period)}</strong>
        {overdueCount > 0 && <StatusBadge tone="danger">{overdueCount} overdue</StatusBadge>}
        {dueCount > 0 && <StatusBadge tone="warning">{dueCount} due</StatusBadge>}
        {overdueCount === 0 && dueCount === 0 && rows.length > 0 && <StatusBadge tone="success">All sets checked</StatusBadge>}
      </div>
      <Tabs value={filter} onValueChange={value => setFilter(value as ToolboxFilter)}>
        <TabsList aria-label="Filter sets">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="stolen">Stolen</TabsTrigger>
          <TabsTrigger value="damaged">Damaged</TabsTrigger>
          <TabsTrigger value="checked">Checked</TabsTrigger>
        </TabsList>
      </Tabs>
      {rows.length === 0 && <Notice title="No sets yet">Add checklist lines to a set head from the tools register, and it will appear here for its monthly check.</Notice>}
      <ul className="flex flex-col gap-2">
        {visible.map(({ set, status, latest, evidence }) => {
          const badge = STATUS_BADGE[status];
          const flagged = evidence && ((evidence.summary.stolen ?? 0) > 0 || (evidence.summary.damaged ?? 0) > 0);
          return (
            <li key={set.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line-subtle bg-surface p-3">
              <div className="min-w-0 flex-1">
                <strong className="block truncate font-sans text-body-sm font-medium text-ink">{set.name}</strong>
                <small className="block font-sans text-caption text-ink-muted">
                  {set.holder ? `With ${set.holder} · ` : ''}{setPieces(set)} {setPieces(set) === 1 ? 'piece' : 'pieces'}
                  {flagged ? ` · ${evidence.summary.stolen > 0 ? `${evidence.summary.stolen} stolen` : ''}${evidence.summary.stolen > 0 && evidence.summary.damaged > 0 ? ' · ' : ''}${evidence.summary.damaged > 0 ? `${evidence.summary.damaged} damaged` : ''} in ${periodLabel(evidence.period)}` : ''}
                </small>
              </div>
              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
              {status === 'checked' && latest && <Button variant="ghost" disabled={loading} onClick={() => viewCheck(latest.id)}>View</Button>}
              {status === 'open' && latest && <Button disabled={loading} onClick={() => startRecording(set.backendId ?? '', latest.period)}>Continue</Button>}
              {(status === 'due' || status === 'overdue') && (
                <Button disabled={loading || !canManage || !set.backendId} onClick={() => startRecording(set.backendId ?? '', status === 'overdue' ? previousPeriod(period) : period)}>
                  Start check
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type { ToolboxCheckItem };
