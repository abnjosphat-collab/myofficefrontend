// app/admin/lists/page.tsx — manage the shared, growing "pick from a list, or
// type a new value" registers (backend/app/routers/lookup_lists.py). Values get
// added automatically as people type new ones into the forms that use them
// (Breakdowns' Location/Nature of Breakdown, PPE's Location, Equipment's
// Location, Compressors' Location, near-miss/SHEQ-inspection/safety-complaint
// Location…) — this page is where a typo or duplicate gets fixed without
// deleting and re-adding a record, or a value gets removed outright.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Wrench, Plus, Loader2, AlertCircle, Lock,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, EmptyState, useConfirm, Button, IconAction } from '@/components/shared/theme';
import { PillTabs } from '@/components/shared/PillTabs';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';

interface LookupValue { id: number; value: string }

// Extensible: add an entry here whenever a new shared list is introduced —
// nothing else about this page needs to change.
const KNOWN_LISTS: { key: string; label: string; icon: typeof MapPin }[] = [
  { key: 'location', label: 'Locations', icon: MapPin },
  { key: 'breakdown_nature', label: 'Nature of Breakdown', icon: Wrench },
];

function ListRow({ item, onRename, onDelete }: { item: LookupValue; onRename: (id: number, value: string) => Promise<boolean>; onDelete: (id: number) => Promise<void> }) {
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = draft.trim();
    if (!v || v === item.value) { setEditing(false); setDraft(item.value); return; }
    setSaving(true);
    try { if (await onRename(item.id, v)) setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${t.chipBg}`}>
      {editing ? (
        <>
          <input aria-label="Rename value" value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(item.value); } }}
            className={`min-w-0 flex-1 h-9 px-2 rounded-md text-sm ${t.inputBg} focus:outline-none`} />
          <IconAction meaning="check" title={`Save ${item.value}`} onClick={save} disabled={saving} spinning={saving} tone="success" />
          <IconAction meaning="close" title={`Cancel renaming ${item.value}`} onClick={() => { setEditing(false); setDraft(item.value); }} />
        </>
      ) : (
        <>
          <span className={`min-w-0 flex-1 break-words text-sm ${t.textMuted}`}>{item.value}</span>
          <IconAction meaning="edit" title={`Rename ${item.value}`} onClick={() => setEditing(true)} />
          <IconAction meaning="danger" title={`Delete ${item.value}`} onClick={() => onDelete(item.id)} tone="danger" />
        </>
      )}
    </div>
  );
}

function AdminListsContent() {
  const t = useTheme();
  const { profile, loading, isAtLeast } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const [activeList, setActiveList] = useState(KNOWN_LISTS[0].key);
  const [values, setValues] = useState<LookupValue[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);
  const requestId = useRef(0);
  const activeListRef = useRef(activeList);

  useEffect(() => { if (!loading && profile && !isAtLeast('manager')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  const fetchValues = useCallback(async (listName: string) => {
    const currentRequest = ++requestId.current;
    setFetching(true);
    setError('');
    try {
      const next = await api.get<LookupValue[]>(`/api/lookup-lists/${listName}`);
      if (currentRequest === requestId.current) setValues(next);
    } catch (e) {
      if (currentRequest === requestId.current) setError((e as Error).message);
    }
    if (currentRequest === requestId.current) setFetching(false);
  }, []);

  useEffect(() => { if (!loading && profile && isAtLeast('manager')) fetchValues(activeList); }, [loading, profile, isAtLeast, activeList, fetchValues]);

  const handleAdd = async () => {
    const v = newValue.trim();
    if (!v) return;
    const listName = activeList;
    setAdding(true);
    try {
      await api.post(`/api/lookup-lists/${listName}`, { value: v });
      if (activeListRef.current === listName) {
        setNewValue('');
        await fetchValues(listName);
      }
      toast.success('Added');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
    setAdding(false);
  };

  const handleRename = async (id: number, value: string) => {
    const listName = activeList;
    try {
      await api.patch(`/api/lookup-lists/${listName}/${id}`, { value });
      if (activeListRef.current === listName) setValues(prev => prev.map(v => v.id === id ? { ...v, value } : v));
      toast.success('Renamed');
      return true;
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
      return false;
    }
  };

  const handleDelete = async (id: number) => {
    const listName = activeList;
    const item = values.find(v => v.id === id);
    const ok = await confirm({
      title: 'Delete this entry?',
      message: `"${item?.value}" will no longer appear as a pick option. Records that already used it are unaffected.`,
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/lookup-lists/${listName}/${id}`);
      if (activeListRef.current === listName) setValues(prev => prev.filter(v => v.id !== id));
      toast.success('Deleted');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  // Same gate-pattern bug found and fixed on accounting.tsx/tasks-events.tsx/
  // admin/page.tsx: `loading` resolves to false whether or not a session was
  // found, so returning null for both left a signed-out visitor on a
  // permanently blank page with zero feedback (2026-08-29 UI audit).
  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <Loader2 className={`h-8 w-8 ${t.textFaint} animate-spin`} />
      </main>
    );
  }
  if (!profile) {
    return (
      <main className="flex-1 flex items-center justify-center py-32">
        <EmptyState icon={Lock} title="Sign in required" message="Sign in with a manager account (top right) to manage lookup lists." />
      </main>
    );
  }
  if (!isAtLeast('manager')) return null;

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={MapPin}
        accent="violet"
        crumbs={['System', 'Admin Panel']}
        title="Shared Lists"
        description="Manage the pick-or-type lists used across the app — Location, Nature of Breakdown, and any added later."
      />

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`p-3 border-b ${t.border}`}>
          <PillTabs tabs={KNOWN_LISTS.map(l => ({ key: l.key, label: l.label, icon: l.icon, meaning: l.key === 'location' ? 'departments' as const : 'breakdown' as const }))}
            value={activeList} onChange={key => { ++requestId.current; activeListRef.current = key; setActiveList(key); setNewValue(''); }} wrap="scroll" />
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={newValue} onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a new value…" aria-label="New value" className={`min-w-0 flex-1 h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
            <Button icon={Plus} submitting={adding} disabled={!newValue.trim()} onClick={handleAdd}>Add</Button>
          </div>

          {fetching ? (
            <div className={`flex items-center justify-center py-10 gap-2 ${t.textFaint}`}><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading…</span></div>
          ) : error ? (
            <div className="flex flex-wrap items-center gap-2 py-6 text-rose-500 text-sm"><AlertCircle className="h-4 w-4" />{error}<Button variant="secondary" size="xs" onClick={() => fetchValues(activeList)}>Retry</Button></div>
          ) : values.length === 0 ? (
            <EmptyState icon={MapPin} title="No entries yet" message="Values are added automatically as people type them into the forms that use this list, or add one above." />
          ) : (
            <div className="space-y-1.5">
              {values.map(v => <ListRow key={v.id} item={v} onRename={handleRename} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AdminListsPage() {
  return (
    <AppShell>
      <AdminListsContent />
    </AppShell>
  );
}
