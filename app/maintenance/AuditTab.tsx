// app/maintenance/AuditTab.tsx — the history of one work order: who changed what and when, newest first. A failed read is shown as a
// failure (never as "no history"); a work order older than the trail says so plainly.
'use client';

import { DataRegion, EmptyState, deriveDataStatus, isTransientStatus } from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { useApiList } from '@/lib/useApiList';
import { statusMeta } from './meta';
import type { MaintenanceEvent } from './types';

const ACTION_LABEL: Record<string, string> = { created: 'Raised', updated: 'Edited', deleted: 'Deleted', commented: 'Commented', transition: 'Moved' };
const FIELD_LABEL: Record<string, string> = { allocated_to: 'Allocated to', equipment_info: 'Machine', job_request_details: 'Job request', artisan_sign: 'Artisan signature', foreman_sign: 'Foreman signature', due_date: 'Due date', notes: 'Foreman comments' };

export const fieldLabel = (field: string) => FIELD_LABEL[field] ?? (field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '));

/** One side of a change, for reading: statuses use their label, empty is "empty", long text is cut. */
export function shownValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty';
  if (field === 'status' && typeof value === 'string') return statusMeta(value as never).label;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function AuditTab({ orderId, active }: { orderId: string; active: boolean }) {
  const { items, loading, loaded, error, errorStatus, refetch } = useApiList<MaintenanceEvent>(`/api/maintenance/work-orders/${orderId}/events`, undefined, { enabled: active });
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: items.length, transient: isTransientStatus(errorStatus) });
  return (
    <DataRegion
      status={status} subject="the history" error={error} onRetry={() => void refetch()}
      empty={<EmptyState icon="history" title="Created before the history began" description="Changes made from now on are recorded here with who made them and when." />}
    >
      <ol className="flex flex-col gap-3">
        {items.map(e => {
          const entries = Object.entries(e.changes ?? {});
          return (
            <li key={e.id} className="rounded-control border border-line-subtle p-3">
              <p className="font-sans text-label font-semibold text-ink">{ACTION_LABEL[e.action] ?? e.action}<span className="ml-2 font-normal text-ink-muted">{e.actor_name || 'Unknown user'}, {fmtDateTime(e.created_at)}</span></p>
              {entries.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {entries.map(([field, [from, to]]) => <li key={field} className="font-sans text-body-sm text-ink [overflow-wrap:anywhere]"><span className="text-ink-muted">{fieldLabel(field)}:</span> {shownValue(field, from)} → {shownValue(field, to)}</li>)}
                </ul>
              )}
              {e.note && <p className="mt-1.5 font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{e.note}</p>}
            </li>
          );
        })}
      </ol>
    </DataRegion>
  );
}
