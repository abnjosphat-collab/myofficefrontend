// app/admin/lists/page.tsx — manage the shared, growing "pick from a list, or
// type a new value" registers (backend/app/routers/lookup_lists.py). Values get
// added automatically as people type new ones into the forms that use them
// (Breakdowns' Location/Nature of Breakdown, PPE's Location, Equipment's
// Location, Compressors' Location, near-miss/SHEQ-inspection/safety-complaint
// Location…) — this page is where a typo or duplicate gets fixed without
// deleting and re-adding a record, or a value gets removed outright.
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Wrench, Plus, Trash2, Pencil, Check, X, Loader2, AlertCircle,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { useTheme, PageHero, EmptyState, useConfirm } from '@/components/shared/theme';
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

function ListRow({ item, onRename, onDelete }: { item: LookupValue; onRename: (id: number, value: string) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = draft.trim();
    if (!v || v === item.value) { setEditing(false); setDraft(item.value); return; }
    setSaving(true);
    try { await onRename(item.id, v); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${t.chipBg}`}>
      {editing ? (
        <>
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(item.value); } }}
            className={`flex-1 h-8 px-2 rounded-md text-sm ${t.inputBg} focus:outline-none`} />
          <button type="button" title="Save" onClick={save} disabled={saving} className="h-7 w-7 flex items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button type="button" title="Cancel" onClick={() => { setEditing(false); setDraft(item.value); }} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.hoverBg} ${t.textFaint}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${t.textMuted}`}>{item.value}</span>
          <button type="button" title="Rename" onClick={() => setEditing(true)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.hoverBg} ${t.textFaint} hover:text-brand-400`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Delete" onClick={() => onDelete(item.id)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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

  useEffect(() => { if (!loading && profile && !isAtLeast('manager')) router.replace('/'); }, [loading, profile, isAtLeast, router]);

  const fetchValues = useCallback(async (listName: string) => {
    setFetching(true);
    setError('');
    try {
      setValues(await api.get<LookupValue[]>(`/api/lookup-lists/${listName}`));
    } catch (e) {
      setError((e as Error).message);
    }
    setFetching(false);
  }, []);

  useEffect(() => { if (!loading && profile && isAtLeast('manager')) fetchValues(activeList); }, [loading, profile, isAtLeast, activeList, fetchValues]);

  const handleAdd = async () => {
    const v = newValue.trim();
    if (!v) return;
    setAdding(true);
    try {
      await api.post(`/api/lookup-lists/${activeList}`, { value: v });
      setNewValue('');
      await fetchValues(activeList);
      toast.success('Added');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
    setAdding(false);
  };

  const handleRename = async (id: number, value: string) => {
    try {
      await api.patch(`/api/lookup-lists/${activeList}/${id}`, { value });
      setValues(prev => prev.map(v => v.id === id ? { ...v, value } : v));
      toast.success('Renamed');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: number) => {
    const item = values.find(v => v.id === id);
    const ok = await confirm({
      title: 'Delete this entry?',
      message: `"${item?.value}" will no longer appear as a pick option. Records that already used it are unaffected.`,
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/lookup-lists/${activeList}/${id}`);
      setValues(prev => prev.filter(v => v.id !== id));
      toast.success('Deleted');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    }
  };

  if (loading || !profile) return null;
  if (!isAtLeast('manager')) return null;

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={MapPin}
        accent="violet"
        crumbs={['System', 'Admin Panel']}
        title="Shared Lists"
        description="Manage the pick-or-type lists used across the app — Location, Nature of Breakdown, and any added later."
      />

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex gap-1 p-2 border-b ${t.border}`}>
          {KNOWN_LISTS.map(l => (
            <button key={l.key} type="button" onClick={() => setActiveList(l.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${activeList === l.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
              <l.icon className="h-3.5 w-3.5" />{l.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input value={newValue} onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a new value…" className={`flex-1 h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
            <button type="button" onClick={handleAdd} disabled={adding || !newValue.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 disabled:opacity-50 transition-all">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
            </button>
          </div>

          {fetching ? (
            <div className={`flex items-center justify-center py-10 gap-2 ${t.textFaint}`}><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading…</span></div>
          ) : error ? (
            <div className="flex items-center gap-2 py-6 text-rose-500 text-sm"><AlertCircle className="h-4 w-4" />{error}</div>
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
