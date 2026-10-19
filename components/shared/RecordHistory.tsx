// components/shared/RecordHistory.tsx — who changed this record and when: created, edited, approved, rejected, cancelled, deleted.
// Read from the server's audit log (backend app/audit.py), which records every write to the payroll and people tables from the
// verified sign-in, never from the browser. Managers and above only; nothing is fetched until it is opened.
'use client';

import { useState } from 'react';
import { Button, Notice } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { useAuth } from '@/lib/auth-context';
import { useApiList } from '@/lib/useApiList';

export interface AuditEntry {
  id: number;
  at: string;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  changes?: Record<string, unknown> | null;
}

const ACTION_LABEL: Record<string, string> = {
  create: 'Created', update: 'Edited', approve: 'Approved', reject: 'Rejected', cancel: 'Cancelled', delete: 'Deleted', upsert: 'Saved',
};

/** The fields an edit changed, as plain words (never the values: a signature, a long note or a phone number does not belong in a list). */
export function changedFields(changes?: Record<string, unknown> | null): string {
  const names = Object.keys(changes ?? {}).filter(k => k !== 'updated_at' && k !== 'expected_updated_at');
  return names.map(n => n.replace(/_/g, ' ')).join(', ');
}

export function who(entry: AuditEntry): string {
  return entry.actor_name?.trim() || entry.actor_email?.trim() || 'System';
}

function HistoryList({ table, recordId }: { table: string; recordId: string | number }) {
  const { items, loading, error, refetch } = useApiList<AuditEntry>(`/api/audit?table=${encodeURIComponent(table)}&record_id=${encodeURIComponent(String(recordId))}&limit=50`);
  if (loading && items.length === 0 && !error) return <p className="font-sans text-body-sm text-ink-muted">Loading the history.</p>;
  if (error && items.length === 0) {
    return <Notice tone="warning" title="The history could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => { void refetch(); }}>Try again</Button>}>{error}</Notice>;
  }
  if (items.length === 0) {
    return <p className="font-sans text-body-sm text-ink-muted">No changes recorded yet. Changes made before the history was switched on are not listed.</p>;
  }
  return (
    <ol className="flex flex-col divide-y divide-line-subtle" aria-label="Change history">
      {items.map(entry => {
        const fields = entry.action === 'update' ? changedFields(entry.changes) : '';
        return (
          <li key={entry.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
            <span className="font-sans text-body-sm text-ink"><span className="font-medium">{ACTION_LABEL[entry.action] ?? entry.action}</span> by {who(entry)}</span>
            <span className="font-sans text-caption text-ink-muted">{fmtDateTime(entry.at)}{fields ? `, changed ${fields}` : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RecordHistory({ table, recordId }: { table: string; recordId: string | number }) {
  const { isAtLeast } = useAuth();
  const [open, setOpen] = useState(false);
  if (!isAtLeast('manager')) return null;
  return (
    <div className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-label font-medium text-ink">History</p>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show who changed it'}</Button>
      </div>
      {open && <HistoryList table={table} recordId={recordId} />}
    </div>
  );
}
