// app/admin/lists/page.tsx — manage the shared, growing "pick from a list, or type a new value" registers
// (backend/app/routers/lookup_lists.py). Values are added automatically as people type new ones into the
// forms that use them (Breakdowns' Location and Nature of Breakdown, PPE's Location, Equipment's
// Location, Compressors' Location, near-miss / SHEQ inspection / safety complaint Location…). This page
// is where a typo or duplicate gets fixed without deleting and re-adding a record, or a value is removed.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, DataRegion, EmptyState, IconButton, Input, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, deriveDataStatus, isTransientStatus, useConfirm, type IconMeaning, LoadingPulse } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';

interface LookupValue { id: number; value: string }

// Extensible: add an entry here whenever a new shared list is introduced; nothing else on this page changes.
const KNOWN_LISTS: { key: string; label: string; icon: IconMeaning; empty: string }[] = [
  { key: 'location', label: 'Locations', icon: 'departments', empty: 'locations' },
  { key: 'breakdown_nature', label: 'Nature of breakdown', icon: 'breakdown', empty: 'breakdown types' },
];

function ListRow({ item, onRename, onDelete }: { item: LookupValue; onRename: (id: number, value: string) => Promise<boolean>; onDelete: (item: LookupValue) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const [saving, setSaving] = useState(false);
  const cancel = () => { setEditing(false); setDraft(item.value); };

  const save = async () => {
    const v = draft.trim();
    if (!v || v === item.value) { cancel(); return; }
    setSaving(true);
    try { if (await onRename(item.id, v)) setEditing(false); } finally { setSaving(false); }
  };

  return (
    <li className="flex items-center gap-2 rounded-control border border-line-subtle bg-surface px-3 py-2">
      {editing ? (
        <>
          <Input
            aria-label={`Rename ${item.value}`}
            value={draft}
            // Focus follows the user's own Rename click to the field it just revealed; nothing is focused on page load.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); }}
            className="h-9 min-w-0 flex-1"
          />
          <IconButton icon="check" label={`Save ${item.value}`} pending={saving} onClick={save} />
          <IconButton icon="close" label={`Cancel renaming ${item.value}`} onClick={cancel} />
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 break-words font-sans text-body text-ink">{item.value}</span>
          <IconButton icon="edit" label={`Rename ${item.value}`} size="sm" onClick={() => setEditing(true)} />
          <IconButton icon="delete" label={`Delete ${item.value}`} size="sm" variant="danger" onClick={() => onDelete(item)} />
        </>
      )}
    </li>
  );
}

/** One shared list. Mounted per list (keyed by the caller) so switching lists never shows the previous list's values. */
function ListPane({ list }: { list: (typeof KNOWN_LISTS)[number] }) {
  const confirm = useConfirm();
  const { items, setItems, loading, loaded, error, errorStatus, refetch } = useApiList<LookupValue>(`/api/lookup-lists/${list.key}`);
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: items.length, transient: isTransientStatus(errorStatus) });

  const add = async () => {
    const v = newValue.trim();
    if (!v) return;
    setAdding(true);
    try {
      await api.post(`/api/lookup-lists/${list.key}`, { value: v });
      setNewValue('');
      await refetch();
      toast.success(`${v} was added.`);
    } catch (e) { toast.error(`Could not add it: ${(e as Error).message}`); }
    finally { setAdding(false); }
  };

  const rename = async (id: number, value: string) => {
    try {
      await api.patch(`/api/lookup-lists/${list.key}/${id}`, { value });
      setItems(prev => prev.map(v => (v.id === id ? { ...v, value } : v)));
      toast.success('Renamed.');
      return true;
    } catch (e) { toast.error(`Could not rename it: ${(e as Error).message}`); return false; }
  };

  const remove = async (item: LookupValue) => {
    if (!await confirm({ title: `Delete ${item.value}?`, message: 'It will no longer appear as a pick option. Records that already used it are unaffected.', confirmLabel: 'Delete', destructive: true })) return;
    try {
      await api.delete(`/api/lookup-lists/${list.key}/${item.id}`);
      setItems(prev => prev.filter(v => v.id !== item.id));
      toast.success('Deleted.');
    } catch (e) { toast.error(`Could not delete it: ${(e as Error).message}`); }
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
        <Input aria-label={`New ${list.label.toLowerCase()} value`} value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Add a new value" className="min-w-0 flex-1" />
        <Button type="submit" variant="primary" icon="plus" pending={adding} disabled={!newValue.trim()}>Add</Button>
      </form>
      <DataRegion
        status={status}
        subject={list.empty}
        error={error}
        onRetry={() => refetch()}
        empty={<EmptyState icon={list.icon} title="No entries yet" description="Values are added automatically as people type them into the forms that use this list, or add one above." />}
      >
        <ul className="flex flex-col gap-1.5">{items.map(v => <ListRow key={v.id} item={v} onRename={rename} onDelete={remove} />)}</ul>
      </DataRegion>
    </div>
  );
}

function AdminListsContent() {
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();
  const [activeList, setActiveList] = useState(KNOWN_LISTS[0].key);

  useEffect(() => { if (!loading && profile && !isAtLeast('manager')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  // `loading` resolves to false whether or not a session was found, so each state must be explicit;
  // returning nothing for them would leave a signed-out visitor on a blank page.
  if (loading) return <LoadingPulse label="Checking your access" />;
  if (!profile) return <EmptyState icon="lock" title="Sign in required" description="Sign in with a manager account (top right) to manage shared lists." />;
  if (!isAtLeast('manager')) return <EmptyState icon="lock" title="Manager access needed" description="You are being taken back to the home page." />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'System' }, { label: 'Admin panel' }, { label: 'Shared lists' }]}
        title="Shared lists"
        description="The pick-or-type lists used across the app: location, nature of breakdown, and any added later."
      />
      <Tabs value={activeList} onValueChange={setActiveList}>
        <TabsList aria-label="Shared lists">
          {KNOWN_LISTS.map(l => <TabsTrigger key={l.key} value={l.key} icon={l.icon}>{l.label}</TabsTrigger>)}
        </TabsList>
        {KNOWN_LISTS.map(l => (
          <TabsContent key={l.key} value={l.key} className="mt-5">
            <ListPane key={l.key} list={l} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function AdminListsPage() {
  return (
    <AppShell migrated>
      <AdminListsContent />
    </AppShell>
  );
}
