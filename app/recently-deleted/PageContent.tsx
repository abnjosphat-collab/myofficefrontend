// app/recently-deleted/page.tsx — every deleted record, kept forever, with who
// deleted it and when; managers put one back exactly as it was. Restore
// re-inserts through the server, so a clash with a live row comes back as the
// normal message instead of a silent overwrite.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, PageHeader, SearchField, Toolbar,
  deriveDataStatus, type Column,
} from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { ApiError, api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { formatShortDateTime } from '@/lib/format';
import { deletedSummary, tableLabel, type DeletedEntry } from './calcDeletedSummary';

export function RecentlyDeletedContent() {
  const router = useRouter();
  const { isAtLeast, loading: authLoading } = useAuth();
  const manager = isAtLeast('manager');
  const [q, setQ] = useState('');
  const path = useMemo(
    () => (q.trim() ? `/api/recently-deleted?q=${encodeURIComponent(q.trim())}` : '/api/recently-deleted'),
    [q],
  );
  const list = useApiList<DeletedEntry>(path, undefined, { paged: true, enabled: manager });
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !manager) router.replace('/');
  }, [authLoading, manager, router]);
  if (!manager) return null;

  const restore = async (row: DeletedEntry) => {
    setRestoring(row.id);
    try {
      await api.post(`/api/recently-deleted/${row.id}/restore`);
      toast.success(`${tableLabel(row.table_name)} put back.`);
      void list.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : 'Could not put it back.');
    } finally {
      setRestoring(null);
    }
  };

  const columns: Column<DeletedEntry>[] = [
    { id: 'deleted', header: 'Deleted', cell: row => formatShortDateTime(row.deleted_at) },
    { id: 'table', header: 'Type', cell: row => tableLabel(row.table_name) },
    { id: 'record', header: 'Record', cell: row => deletedSummary(row) },
    { id: 'by', header: 'Deleted by', cell: row => row.deleted_by_name || row.deleted_by_email, hideBelow: 'md' },
    {
      id: 'restore', header: 'Restore', width: '7rem',
      cell: row => (
        <Button size="sm" icon="undo" pending={restoring === row.id} onClick={() => restore(row)} aria-label={`Restore ${deletedSummary(row)}`}>
          Restore
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Manager Tools' }, { label: 'Recently deleted' }]}
        title="Recently deleted"
        description="Every deleted record is kept here forever. Put one back exactly as it was."
      />
      <Toolbar>
        <SearchField value={q} onValueChange={setQ} placeholder="Search type, record or who deleted it" wrapperClassName="min-w-56 max-w-sm flex-1" />
      </Toolbar>
      <DataRegion
        status={deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: list.items.length })}
        subject="deleted records"
        error={list.error}
        onRetry={() => list.refetch()}
        empty={<EmptyState icon="history" title="Nothing deleted" description="Deleted records show up here and can be put back at any time." />}
      >
        <DataTable caption="Recently deleted records" rows={list.items} columns={columns} getRowId={row => row.id} stillKey={q} />
      </DataRegion>
    </div>
  );
}

export default function RecentlyDeletedPage() {
  return <AppShell migrated><RecentlyDeletedContent /></AppShell>;
}
